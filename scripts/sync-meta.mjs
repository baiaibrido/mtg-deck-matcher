// Sync notturno del meta.
// Fonte principale: MTGODecklistCache (liste di tornei MTGO, melee.gg, CardsRealm, aggiornate ogni giorno su GitHub)
// + regole archetipi di MTGOFormatData (stesso metodo di MTGOArchetypeParser).
// Commander resta su MTGTop8; un formato passa a MTGTop8 anche se troppi mazzi restano "non riconosciuti".
// Uso: node scripts/sync-meta.mjs [pauper modern ...]
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { FORMATS, assignTiers, loadRobots, syncFormat, saveFormat } from './sync-mtgtop8.mjs'

const DECKS_REPO = 'https://github.com/Jiliac/MTGODecklistCache'
const RULES_REPO = 'https://github.com/Badaro/MTGOFormatData'
const DAYS = 60            // finestra: ultimi 2 mesi
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
export function dayPatterns(today, days = DAYS) {
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

// entries: [{ tournament, deck }] già filtrati per formato → mazzi del meta + rogue della settimana
export function aggregate(entries, classify, id) {
  const seen = new Set(), byArch = new Map(), unknownList = [], freq = new Map()
  let total = 0, unknown = 0
  for (const { tournament: t, deck: d } of entries) {
    const main = d.Mainboard || [], side = d.Sideboard || []
    if (sum(main) < 60) continue // lista incompleta o non di un formato costruito
    // la stessa lista può comparire in due cartelle (es. melee.gg e mtgo.com): conta una volta
    const key = [d.Player, t.Name, t.Date?.slice(0, 10), ...[...main, ...side].map(c => c.Count + c.CardName).sort()].join('|')
    if (seen.has(key)) continue
    seen.add(key); total++
    for (const c of main) freq.set(c.CardName, (freq.get(c.CardName) || 0) + 1)
    const e = { t, d, date: (d.Date || t.Date || '').slice(0, 10), rank: rankOf(d.Result) }
    const name = classify(main, side)
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
  return { decks, rogue: findRogue(all.slice(TOP_N), unknownList, { classify, freq, total, id }), total, unknownPct: total ? Math.round(unknown / total * 1000) / 10 : 100 }
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

// --- main ---
async function main() {
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
      const byFormat = new Map(fromCache.map(id => [RULE_FORMATS[id].toLowerCase(), []]))
      let files = 0
      for (const f of walkJson(join(decksDir, 'Tournaments'))) {
        let j; try { j = JSON.parse(readFileSync(f, 'utf8')) } catch { continue }
        const t = j.Tournament || {}, bucket = byFormat.get(String(t.Formats || '').toLowerCase())
        if (!bucket || (t.Date || '').slice(0, 10) < from) continue
        files++
        for (const deck of j.Decks || []) bucket.push({ tournament: t, deck })
      }
      console.log(`Tornei letti: ${files}`)
      for (const id of fromCache) {
        const name = RULE_FORMATS[id]
        try {
          const r = aggregate(byFormat.get(name.toLowerCase()), buildClassifier(loadRules(rulesDir, name)), id)
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
        await saveFormat(id, r.decks, { source: 'MTGODecklistCache', sourceNote: 'tornei MTGO, melee.gg e CardsRealm', decksAnalyzed: r.total, unknownPct: r.unknownPct, rogue: r.rogue })
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
