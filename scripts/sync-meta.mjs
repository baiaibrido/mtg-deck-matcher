// Sync notturno del meta.
// Fonte principale: MTGODecklistCache (liste di tornei MTGO, melee.gg, CardsRealm, aggiornate ogni giorno su GitHub)
// + regole archetipi di MTGOFormatData (stesso metodo di MTGOArchetypeParser).
// Commander resta su MTGTop8; un formato passa a MTGTop8 anche se troppi mazzi restano "non riconosciuti".
// Uso: node scripts/sync-meta.mjs [pauper modern ...]
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { FORMATS, assignTiers, loadRobots, syncFormat, saveFormat } from './sync-mtgtop8.mjs'

const DECKS_REPO = 'https://github.com/Jiliac/MTGODecklistCache'
const RULES_REPO = 'https://github.com/Badaro/MTGOFormatData'
const DAYS = 60            // finestra: ultimi 2 mesi
const HISTORY_WEEKS = 12   // storico: quote settimanali delle ultime 12 settimane (si scaricano 84 giorni)
const MU_MIN = 3           // matchup mostrati: almeno 3 partite
const MU_META_MIN = 5      // matchup usati per la % contro il meta: almeno 5 partite
const MU_PRIOR = 10        // correzione per i campioni piccoli nella % contro il meta
const TOP_N = 30           // archetipi per formato
const MAX_UNKNOWN = 15     // % oltre la quale il formato usa MTGTop8
const MIN_DECKS = 50       // sotto questa soglia di mazzi il campione è troppo piccolo
const ROGUE_DAYS = 7       // rogue della settimana: risultati negli ultimi 7 giorni di dati
const ROGUE_MAX = 12       // rogue salvati per formato
const GOOD_RANK = 8        // "risultato": top 8 di un torneo o 5-0 in League
const RULE_FORMATS = { standard: 'Standard', pioneer: 'Pioneer', modern: 'Modern', pauper: 'Pauper', legacy: 'Legacy', vintage: 'Vintage' }
const CACHE = process.env.META_CACHE || join(tmpdir(), 'mdm-meta-cache')

// --- download: clone parziale (solo i file che servono, senza storia) ---
const git = (args, cwd) => execFileSync('git', args, { cwd, stdio: ['ignore', 'ignore', 'inherit'], timeout: 15 * 60e3 })
function sparseClone(url, dir, patterns) {
  rmSync(dir, { recursive: true, force: true })
  git(['clone', '-q', '--depth', '1', '--filter=blob:none', '--no-checkout', url, dir])
  git(['-c', 'gc.auto=0', 'sparse-checkout', 'set', '--no-cone', ...patterns], dir)
  git(['-c', 'gc.auto=0', 'checkout', '-q'], dir)
}
export function dayPatterns(today, days = HISTORY_WEEKS * 7) {
  const out = []
  for (let i = 0; i <= days; i++) {
    const d = new Date(today.getTime() - i * 864e5).toISOString().slice(0, 10).replaceAll('-', '/')
    out.push(`/Tournaments/*/${d}/`)
  }
  return out
}

// JSON scritto a mano (regole): tollera BOM e virgole finali
const looseJson = txt => JSON.parse(txt.replace(/^﻿/, '').replace(/,(\s*[\]}])/g, '$1'))
const readJsonDir = dir => existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')).flatMap(f => {
  try { return [looseJson(readFileSync(join(dir, f), 'utf8'))] } catch (e) { console.warn(`  regola illeggibile ${f}: ${e.message}`); return [] }
}) : []
function* walkJson(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walkJson(p)
    else if (e.name.endsWith('.json')) yield p
  }
}

// --- classificatore (porta JS di MTGOArchetypeParser) ---
const COLOR_NAME = { W: 'MonoWhite', U: 'MonoBlue', B: 'MonoBlack', R: 'MonoRed', G: 'MonoGreen', WU: 'Azorius', WB: 'Orzhov', WR: 'Boros', WG: 'Selesnya', UB: 'Dimir', UR: 'Izzet', UG: 'Simic', BR: 'Rakdos', BG: 'Golgari', RG: 'Gruul', WUB: 'Esper', WUR: 'Jeskai', WUG: 'Bant', WBR: 'Mardu', WBG: 'Abzan', WRG: 'Naya', UBR: 'Grixis', UBG: 'Sultai', URG: 'Temur', BRG: 'Jund', WUBRG: '5Color' }
export function archetypeName(a, color) {
  const raw = (a.IncludeColorInName ? (COLOR_NAME[color] ?? color) : '') + a.Name.replace('Generic', '').replace(/_/g, ' ')
  return raw.replace(/(?<=[A-Z])(?=[A-Z][a-z])|(?<=[^A-Z])(?=[A-Z])|(?<=[A-Za-z])(?=[^A-Za-z])/g, ' ').replace(/\s+/g, ' ').trim()
}

const CHECKS = {
  inmainboard: (c, M) => M.has(c[0]),
  insideboard: (c, M, S) => S.has(c[0]),
  inmainorsideboard: (c, M, S) => M.has(c[0]) || S.has(c[0]),
  oneormoreinmainboard: (c, M) => c.some(x => M.has(x)),
  oneormoreinsideboard: (c, M, S) => c.some(x => S.has(x)),
  oneormoreinmainorsideboard: (c, M, S) => c.some(x => M.has(x) || S.has(x)),
  twoormoreinmainboard: (c, M) => c.filter(x => M.has(x)).length >= 2,
  twoormoreinsideboard: (c, M, S) => c.filter(x => S.has(x)).length >= 2,
  twoormoreinmainorsideboard: (c, M, S) => c.filter(x => M.has(x)).length + c.filter(x => S.has(x)).length >= 2,
  doesnotcontain: (c, M, S) => !M.has(c[0]) && !S.has(c[0]),
  doesnotcontainmainboard: (c, M) => !M.has(c[0]),
  doesnotcontainsideboard: (c, M, S) => !S.has(c[0]),
}
// Regole pronte all'uso: condizioni → funzioni (una sola volta per formato)
const compile = a => ({
  ...a,
  tests: (a.Conditions || []).filter(c => c.Cards?.length).map(c => {
    const f = CHECKS[c.Type.toLowerCase()]
    if (!f) throw new Error(`condizione sconosciuta ${c.Type} in ${a.Name}`)
    return (M, S) => f(c.Cards, M, S)
  }),
  Variants: (a.Variants || []).map(compile),
})
const passes = (a, M, S) => a.tests.every(t => t(M, S))

export function buildClassifier({ archetypes, fallbacks, lands, nonLands }) {
  const specific = archetypes.map(compile)
  const generic = fallbacks.filter(g => g.CommonCards?.length).map(g => ({ ...g, common: new Set(g.CommonCards) }))
  const colorOf = cards => {
    const L = new Set(), N = new Set()
    for (const c of cards) {
      for (const k of lands.get(c.CardName) || '') L.add(k)
      for (const k of nonLands.get(c.CardName) || '') N.add(k)
    }
    return [...'WUBRG'].filter(k => L.has(k) && N.has(k)).join('') || 'C'
  }
  const classify = (main, side) => {
    const M = new Set(main.map(c => c.CardName)), S = new Set(side.map(c => c.CardName))
    const color = colorOf([...main, ...side])
    let best = null, bestCx = Infinity
    for (const a of specific) {
      if (!passes(a, M, S)) continue
      const v = a.Variants.find(x => passes(x, M, S))
      const cx = a.tests.length + (v ? v.tests.length : 0) // conflitti: vince la regola più semplice
      if (cx < bestCx) { best = v || a; bestCx = cx }
    }
    if (best) return archetypeName(best, color)
    // nessuna regola specifica: archetipo generico con più carte in comune (soglia 10%)
    let g = null, w = 0
    for (const x of generic) {
      const n = [...main, ...side].reduce((s, c) => s + (x.common.has(c.CardName) ? c.Count : 0), 0)
      if (n > w || (n === w && g && x.common.size < g.common.size)) { g = x; w = n }
    }
    return g && w / (main.length + side.length) > 0.1 ? archetypeName(g, color) : null
  }
  classify.colorOf = (main, side) => colorOf([...main, ...side])
  classify.isLand = name => lands.has(name)
  return classify
}

function loadRules(root, format) {
  const toMap = arr => new Map((arr || []).map(x => [x.Name, x.Color]))
  const colors = looseJson(readFileSync(join(root, 'Formats', 'card_colors.json'), 'utf8'))
  const lands = toMap(colors.Lands), nonLands = toMap(colors.NonLands)
  try { // correzioni di colore specifiche del formato
    const o = looseJson(readFileSync(join(root, 'Formats', format, 'color_overrides.json'), 'utf8'))
    for (const x of o.Lands || []) lands.set(x.Name, x.Color)
    for (const x of o.NonLands || []) nonLands.set(x.Name, x.Color)
  } catch {}
  return { archetypes: readJsonDir(join(root, 'Formats', format, 'Archetypes')), fallbacks: readJsonDir(join(root, 'Formats', format, 'Fallbacks')), lands, nonLands }
}

// --- aggregazione ---
// "1st Place" → 1, "5-0" → 1 (League senza sconfitte), "4-1" → 9 (dopo la top 8), altro → 99
export function rankOf(result = '') {
  const p = result.match(/^(\d+)\s*(?:st|nd|rd|th)/i); if (p) return +p[1]
  const r = result.match(/^(\d+)-(\d+)/); if (r) return +r[2] === 0 ? 1 : 9
  return 99
}
const sum = cards => cards.reduce((s, c) => s + c.Count, 0)

// Nome "da giocatore" per i rogue senza archetipo: colori + carta simbolo (es. "Naya Cleansing Wildfire")
const COLOR_WORDS = { W: 'Mono White', U: 'Mono Blue', B: 'Mono Black', R: 'Mono Red', G: 'Mono Green', C: 'Colorless', WU: 'Azorius', WB: 'Orzhov', WR: 'Boros', WG: 'Selesnya', UB: 'Dimir', UR: 'Izzet', UG: 'Simic', BR: 'Rakdos', BG: 'Golgari', RG: 'Gruul', WUB: 'Esper', WUR: 'Jeskai', WUG: 'Bant', WBR: 'Mardu', WBG: 'Abzan', WRG: 'Naya', UBR: 'Grixis', UBG: 'Sultai', URG: 'Temur', BRG: 'Jund', WUBRG: '5 Color' }
const slug = s => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const toDeck = (d, extra) => ({
  ...extra, title: `${[d.d.Player, d.t.Name].filter(Boolean).join(' · ')}${d.d.Result ? ` (${d.d.Result})` : ''}`,
  url: d.d.AnchorUri || d.t.Uri || undefined,
  main: d.d.Mainboard.map(c => `${c.Count} ${c.CardName}`), side: (d.d.Sideboard || []).map(c => `${c.Count} ${c.CardName}`),
})

// entries: [{ tournament, deck, rounds? }] già filtrati per formato → mazzi del meta, rogue, storico, matchup
// from: inizio della finestra principale (2 mesi); le liste più vecchie servono solo allo storico settimanale
export function aggregate(entries, classify, id, { from = '' } = {}) {
  const seen = new Set(), byArch = new Map(), unknownList = [], freq = new Map(), allE = []
  let total = 0, unknown = 0
  for (const { tournament: t, deck: d, rounds } of entries) {
    const main = d.Mainboard || [], side = d.Sideboard || []
    if (sum(main) < 60) continue // lista incompleta o non di un formato costruito
    // la stessa lista può comparire in due cartelle (es. melee.gg e mtgo.com): conta una volta
    const key = [d.Player, t.Name, t.Date?.slice(0, 10), ...[...main, ...side].map(c => c.Count + c.CardName).sort()].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    const e = { t, d, rounds, date: (d.Date || t.Date || '').slice(0, 10), rank: rankOf(d.Result), name: classify(main, side) }
    allE.push(e)
    if (e.date < from) continue
    total++
    for (const c of main) freq.set(c.CardName, (freq.get(c.CardName) || 0) + 1)
    const name = e.name
    if (!name) { unknown++; unknownList.push(e); continue }
    const list = byArch.get(name) || []
    list.push(e)
    byArch.set(name, list)
  }
  const all = [...byArch].map(([name, list]) => ({ id: name, name, share: Math.round(list.length / total * 1000) / 10, list }))
    .sort((a, b) => b.share - a.share || b.list.length - a.list.length)
  const tiers = assignTiers(all)
  const decks = all.slice(0, TOP_N).map(a => {
    // lista rappresentativa: la più recente tra le top 8 / 5-0, altrimenti la più recente
    const best = [...a.list].sort((x, y) => (x.rank > GOOD_RANK) - (y.rank > GOOD_RANK) || y.date.localeCompare(x.date) || x.rank - y.rank)[0]
    return toDeck(best, { id: `${id}-${slug(a.name)}`, name: a.name, share: a.share, tier: tiers.get(a.id), count: a.list.length })
  })
  const history = weeklyHistory(allE, decks.map(d => d.name))
  decks.forEach(d => { d.history = history.byName.get(d.name) })
  addMatchups(allE.filter(e => e.date >= from), decks)
  return { decks, rogue: findRogue(all.slice(TOP_N), unknownList, { classify, freq, total, id }), historyWeeks: history.weeks, total, unknownPct: total ? Math.round(unknown / total * 1000) / 10 : 100 }
}

// Storico: quota settimanale (%) di ogni archetipo nelle ultime HISTORY_WEEKS settimane, dalla più vecchia.
// Settimane con meno di 20 liste → null (campione troppo piccolo per una percentuale).
export function weeklyHistory(allE, names, weeks = HISTORY_WEEKS) {
  const last = allE.reduce((m, e) => e.date > m ? e.date : m, '')
  if (!last) return { weeks: [], byName: new Map() }
  const end = Date.parse(last), tot = Array(weeks).fill(0), per = new Map(names.map(n => [n, Array(weeks).fill(0)]))
  for (const e of allE) {
    const back = Math.floor((end - Date.parse(e.date)) / (7 * 864e5))
    if (back < 0 || back >= weeks) continue
    const i = weeks - 1 - back
    tot[i]++
    const c = per.get(e.name); if (c) c[i]++
  }
  const starts = Array.from({ length: weeks }, (_, i) => new Date(end - ((weeks - 1 - i) * 7 + 6) * 864e5).toISOString().slice(0, 10))
  return { weeks: starts, byName: new Map([...per].map(([n, c]) => [n, c.map((v, i) => tot[i] >= 20 ? Math.round(v / tot[i] * 1000) / 10 : null)])) }
}

// Matchup dai turni dei tornei: per ogni partita tra due liste note, vittorie/sconfitte/patte tra archetipi (mirror esclusi).
// deck.field = [V, S, P] contro tutti; deck.mu = [[avversario, V, S, P], …] (≥ MU_MIN partite, solo avversari tra i 30);
// deck.metaWr = % di vittoria pesata sulla quota degli avversari (matchup con ≥ MU_META_MIN partite), null se troppo pochi dati.
export function addMatchups(mainE, decks) {
  const tours = new Map()
  for (const e of mainE) {
    if (!e.rounds?.length) continue
    const k = `${e.t.Name}|${e.t.Date?.slice(0, 10)}`
    const tr = tours.get(k) || { rounds: e.rounds, players: new Map() }
    tr.players.set(e.d.Player, e.name || '?')
    tours.set(k, tr)
  }
  const rec = new Map() // "A|B" → [V, S, P] dal punto di vista di A
  const add = (a, b, w, l, dr) => { const k = `${a}|${b}`; const r = rec.get(k) || [0, 0, 0]; r[0] += w; r[1] += l; r[2] += dr; rec.set(k, r) }
  for (const { rounds, players } of tours.values()) {
    for (const round of rounds) for (const m of round.Matches || []) {
      const a = players.get(m.Player1), b = players.get(m.Player2)
      if (!a || !b || a === b) continue
      const [g1, g2] = String(m.Result || '').split('-').map(Number)
      if (!Number.isFinite(g1) || !Number.isFinite(g2)) continue
      const w = g1 > g2 ? 1 : 0, l = g1 < g2 ? 1 : 0, dr = g1 === g2 ? 1 : 0
      add(a, b, w, l, dr); add(b, a, l, w, dr)
    }
  }
  const share = new Map(decks.map(d => [d.name, d.share]))
  for (const d of decks) {
    const field = [0, 0, 0], mu = []
    let wsum = 0, ssum = 0
    for (const [k, r] of rec) {
      const [a, b] = k.split('|')
      if (a !== d.name) continue
      field[0] += r[0]; field[1] += r[1]; field[2] += r[2]
      const n = r[0] + r[1] + r[2]
      if (!share.has(b)) continue
      if (n >= MU_MIN) mu.push([b, ...r])
      // campioni piccoli: ogni matchup parte da 5 vittorie e 5 sconfitte "virtuali" (tende al 50% finché i dati sono pochi)
      if (n >= MU_META_MIN) { wsum += share.get(b) * (r[0] + r[2] / 2 + MU_PRIOR / 2) / (n + MU_PRIOR); ssum += share.get(b) }
    }
    const metaTot = decks.reduce((s, x) => s + (x.name === d.name ? 0 : x.share), 0)
    d.field = field
    d.mu = mu.sort((x, y) => (share.get(y[0]) || 0) - (share.get(x[0]) || 0))
    d.metaWr = ssum >= metaTot * 0.3 ? Math.round(wsum / ssum * 1000) / 10 : null // copertura ≥ 30% del meta
  }
}

// Carta simbolo: la non-terra (almeno 2 copie) più rara nel formato, cioè quella che distingue la lista
export function signatureCard(main, freq, isLand) {
  const cand = main.filter(c => c.Count >= 2 && !isLand(c.CardName))
  return cand.sort((a, b) => (freq.get(a.CardName) || 0) - (freq.get(b.CardName) || 0) || b.Count - a.Count)[0]?.CardName || null
}

// Rogue della settimana: archetipi fuori dai 30 più giocati (o senza archetipo) con top 8 / 5-0 negli ultimi 7 giorni di dati
export function findRogue(outside, unknownList, { classify, freq, total, id }) {
  const lastDate = [...outside.flatMap(a => a.list), ...unknownList].reduce((m, e) => e.date > m ? e.date : m, '')
  if (!lastDate) return []
  const from = new Date(Date.parse(lastDate) - (ROGUE_DAYS - 1) * 864e5).toISOString().slice(0, 10)
  const sig = e => signatureCard(e.d.Mainboard, freq, classify.isLand)
  // senza archetipo: gruppi per colori + carta simbolo
  const groups = new Map()
  for (const e of unknownList) {
    const s = sig(e); if (!s) continue
    const col = classify.colorOf(e.d.Mainboard, e.d.Sideboard || [])
    const name = `${COLOR_WORDS[col] || col} ${s}`
    const g = groups.get(name) || { name, list: [], signature: s }
    g.list.push(e); groups.set(name, g)
  }
  const pool = [...outside.map(a => ({ name: a.name, list: a.list })), ...groups.values()]
  return pool.map(g => {
    const good = g.list.filter(e => e.rank <= GOOD_RANK && e.date >= from)
      .sort((x, y) => x.rank - y.rank || y.date.localeCompare(x.date))
    return good.length ? { g, good } : null
  }).filter(Boolean)
    .sort((a, b) => b.good.length - a.good.length || a.good[0].rank - b.good[0].rank || b.g.list.length - a.g.list.length)
    .slice(0, ROGUE_MAX)
    .map(({ g, good }) => toDeck(good[0], {
      id: `${id}-rogue-${slug(g.name)}`, name: g.name, rogue: true, results: good.length, best: good[0].d.Result || null,
      signature: g.signature || sig(good[0]), share: Math.round(g.list.length / total * 1000) / 10,
    }))
}

// Cambi valuta BCE (1 EUR = x) per mostrare i prezzi nella valuta locale; se il servizio non risponde si tiene il file precedente
const RATES_URL = 'https://api.frankfurter.dev/v1/latest'
async function syncRates() {
  try {
    const r = await fetch(RATES_URL, { signal: AbortSignal.timeout(20000) })
    const j = await r.json()
    if (!j?.rates?.USD) throw new Error('risposta senza cambi')
    writeFileSync(new URL('../public/meta/rates.json', import.meta.url), JSON.stringify({ date: j.date, base: 'EUR', source: 'BCE via frankfurter.dev', rates: j.rates }, null, 1) + '\n')
    console.log(`Cambi valuta del ${j.date} salvati`)
  } catch (e) { console.warn(`Cambi valuta non aggiornati (${e.message})`) }
}

// --- main ---
async function main() {
  await syncRates()
  const only = process.argv.slice(2)
  const want = Object.keys(FORMATS).filter(id => !only.length || only.includes(id))
  const fromCache = want.filter(id => RULE_FORMATS[id])
  const results = new Map()

  if (fromCache.length) {
    const t0 = Date.now()
    const decksDir = join(CACHE, 'decks'), rulesDir = join(CACHE, 'rules')
    try {
      const today = new Date()
      sparseClone(DECKS_REPO, decksDir, dayPatterns(today))
      sparseClone(RULES_REPO, rulesDir, ['/Formats/'])
      console.log(`Dati scaricati in ${Math.round((Date.now() - t0) / 1000)}s`)
      // un solo passaggio sui file: tornei divisi per formato
      const from = new Date(today.getTime() - DAYS * 864e5).toISOString().slice(0, 10)
      const fromHistory = new Date(today.getTime() - HISTORY_WEEKS * 7 * 864e5).toISOString().slice(0, 10)
      const byFormat = new Map(fromCache.map(id => [RULE_FORMATS[id].toLowerCase(), []]))
      let files = 0
      for (const f of walkJson(join(decksDir, 'Tournaments'))) {
        let j; try { j = JSON.parse(readFileSync(f, 'utf8')) } catch { continue }
        const t = j.Tournament || {}, bucket = byFormat.get(String(t.Formats || '').toLowerCase())
        if (!bucket || (t.Date || '').slice(0, 10) < fromHistory) continue
        files++
        for (const deck of j.Decks || []) bucket.push({ tournament: t, deck, rounds: j.Rounds })
      }
      console.log(`Tornei letti: ${files}`)
      for (const id of fromCache) {
        const name = RULE_FORMATS[id]
        try {
          const r = aggregate(byFormat.get(name.toLowerCase()), buildClassifier(loadRules(rulesDir, name)), id, { from })
          console.log(`${id}: ${r.total} mazzi, non riconosciuti ${r.unknownPct}%, archetipi salvati ${r.decks.length}, rogue della settimana ${r.rogue.length}`)
          if (r.total >= MIN_DECKS && r.unknownPct <= MAX_UNKNOWN && r.decks.length) results.set(id, r)
          else console.warn(`  ${id}: dati insufficienti, uso MTGTop8`)
        } catch (e) { console.warn(`  ${id}: errore classificazione (${e.message}), uso MTGTop8`) }
      }
    } catch (e) { console.warn(`MTGODecklistCache non disponibile (${e.message}): uso MTGTop8`) }
  }

  let ok = 0, robots = false
  for (const id of want) {
    try {
      const r = results.get(id)
      if (r) {
        await saveFormat(id, r.decks, { source: 'MTGODecklistCache', sourceNote: 'tornei MTGO, melee.gg e CardsRealm', decksAnalyzed: r.total, unknownPct: r.unknownPct, rogue: r.rogue, historyWeeks: r.historyWeeks })
        ok++; continue
      }
      console.log(`${id} (MTGTop8)`)
      if (!robots) { await loadRobots(); robots = true }
      const decks = await syncFormat(id, FORMATS[id])
      if (!decks.length) { console.warn(`  nessun mazzo: file ${id}.json lasciato invariato`); continue }
      await saveFormat(id, decks)
      ok++
    } catch (e) { console.warn(`  ${id}: errore (${e.message})`) }
  }
  console.log(`Formati aggiornati: ${ok}/${want.length}`)
  if (!ok) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
