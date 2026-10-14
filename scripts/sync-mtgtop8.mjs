// Scarica da MTGTop8 fino a 30 archetipi più giocati per formato (ultimi 2 mesi) e
// salva l'ultima lista di ognuno in public/meta/<formato>.json, con tier (metodo MTGdecks) e trend.
// Rispetta il robots.txt di MTGTop8: un percorso vietato ferma il formato e lascia i dati precedenti.
// Uso: node scripts/sync-mtgtop8.mjs [pauper modern ...]
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parseDeck } from '../src/lib/parser.js'

const BASE = 'https://www.mtgtop8.com/'
const TOP_N = 30 // archetipi per formato (meno se il meta ne ha meno)
const DELAY_MS = 1200 // pausa tra richieste: carico minimo sul sito
export const FORMATS = { standard: 'ST', pioneer: 'PI', modern: 'MO', pauper: 'PAU', legacy: 'LE', vintage: 'VI', commander: 'cEDH' }
const OUT = new URL('../public/meta/', import.meta.url)
const DEBUG = new URL('../debug/', import.meta.url)
const dump = async (file, html) => { await mkdir(DEBUG, { recursive: true }); await writeFile(new URL(file, DEBUG), html) }

const UA = 'mtg-deck-matcher/0.4 (sync giornaliero, uso personale; github.com/baiaibrido/mtg-deck-matcher)'
const sleep = ms => new Promise(r => setTimeout(r, ms))

// --- robots.txt ---
// Regole Disallow/Allow per il nostro user-agent (o '*'). Supporta * e $ come da specifica Google/RFC 9309.
export function parseRobots(txt, agent = 'mtg-deck-matcher') {
  const groups = []; let cur = null, lastWasAgent = false
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const [, k, v] = [m[0], m[1].toLowerCase(), m[2].trim()]
    if (k === 'user-agent') {
      if (!lastWasAgent) groups.push(cur = { agents: [], rules: [] })
      cur.agents.push(v.toLowerCase()); lastWasAgent = true
    } else {
      lastWasAgent = false
      if (cur && (k === 'disallow' || k === 'allow') && v) cur.rules.push({ allow: k === 'allow', path: v })
    }
  }
  const mine = groups.filter(g => g.agents.some(a => a !== '*' && agent.toLowerCase().includes(a)))
  return (mine.length ? mine : groups.filter(g => g.agents.includes('*'))).flatMap(g => g.rules)
}
export function robotsAllows(rules, path) {
  const toRe = p => new RegExp('^' + p.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'))
  let best = null
  for (const r of rules) if (toRe(r.path).test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r
  return !best || best.allow
}
let ROBOTS = []
export async function loadRobots() {
  try {
    const r = await fetch(BASE + 'robots.txt', { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': UA } })
    ROBOTS = r.ok ? parseRobots(await r.text()) : []
    console.log(`robots.txt: ${r.ok ? `${ROBOTS.length} regole` : `assente (${r.status})`}`)
  } catch (e) { console.warn(`robots.txt non leggibile (${e.message}): procedo con cautela`) }
}

// --- tier (metodo pubblicato da MTGdecks) ---
// Tier 1: i primi archetipi che insieme fanno il 50% del meta. Tier 2: gli altri sopra lo 0,2%. Tier 3: il resto.
export function assignTiers(archetypes) {
  const sorted = [...archetypes].sort((a, b) => b.share - a.share)
  const tier = new Map(); let cum = 0, t1done = false
  for (const a of sorted) {
    if (!t1done) { tier.set(a.id, 1); cum += a.share; if (cum >= 50) t1done = true; continue }
    tier.set(a.id, a.share > 0.2 ? 2 : 3)
  }
  return tier
}

// --- trend rispetto al giorno di sync precedente ---
export function previousShares(old, today) {
  if (!old?.decks) return { date: null, map: new Map() }
  if (old.updated && old.updated !== today) return { date: old.updated, map: new Map(old.decks.map(d => [d.name, d.share])) }
  return { date: old.prevDate || null, map: new Map(old.decks.filter(d => d.prev != null).map(d => [d.name, d.prev])) }
}
const decode = s => s.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()

async function get(path, method = 'GET') {
  if (!robotsAllows(ROBOTS, '/' + path)) throw new Error(`vietato da robots.txt: /${path}`)
  await sleep(DELAY_MS)
  const r = await fetch(BASE + path, { method, signal: AbortSignal.timeout(30000), headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  const buf = Buffer.from(await r.arrayBuffer())
  const utf = buf.toString('utf8')
  return utf.includes('�') ? buf.toString('latin1') : utf
}

// --- parser HTML (esportati per i test) ---
// Il link del periodo può contenere tag annidati: <a href="?f=X&meta=263&a="><div …>Last 2 Months</div></a>
export function parseMetaId(html, label = 'Last 2 Months') {
  const re = new RegExp(`(?:meta=|value=["']?)(\\d+)[^>]*>(?:\\s*<[^>]+>)*\\s*${label}`, 'i')
  return html.match(re)?.[1] || null
}

// Prima percentuale come testo visibile (>12 %<), ignorando attributi tipo style="width:48%".
// cEDH usa il per mille (>98.8 <span>&permil;</span>) → convertito in %.
const textPct = html => {
  const m = html.match(/>\s*(\d+(?:[.,]\d+)?)\s*(%|(?:<[^>]+>\s*)?(?:&permil;|‰))/)
  if (!m) return 0
  const v = parseFloat(m[1].replace(',', '.'))
  return m[2] === '%' ? v : Math.round(v) / 10
}

export function parseArchetypes(html) {
  const re = /<a[^>]+href=["']?archetype\?a=(\d+)&(?:amp;)?meta=(\d+)&(?:amp;)?f=[\w]+["']?[^>]*>([^<]+)<\/a>/gi
  const hits = [...html.matchAll(re)]
  const list = hits.map((m, i) => {
    const after = html.slice(m.index + m[0].length - 1, hits[i + 1]?.index ?? m.index + m[0].length + 600)
    return { id: m[1], meta: m[2], name: decode(m[3]), share: textPct(after) }
  })
  const seen = new Set()
  return list
    .filter(a => a.name && !/^other/i.test(a.name) && !seen.has(a.id) && seen.add(a.id))
    .sort((a, b) => b.share - a.share)
}

// Link ai mazzi di un archetipo, dal più recente. Accetta href relativi/assoluti, virgolette o no, &amp;, ordine e=…&d=… o d=…&e=…
export function parseDeckLinks(html, max = 3) {
  const re = /<a[^>]+href=["']?([^"' >]*[?&](?:amp;)?(?:e=\d+&(?:amp;)?d=\d+|d=\d+&(?:amp;)?e=\d+)[^"' >]*)["']?[^>]*>([\s\S]*?)<\/a>/gi
  const out = [], seen = new Set()
  for (const m of html.matchAll(re)) {
    const e = m[1].match(/[?&;]e=(\d+)/)?.[1], d = m[1].match(/[?&;]d=(\d+)/)?.[1]
    const title = decode(m[2].replace(/<[^>]+>/g, ''))
    if (!e || !d || !title || seen.has(d)) continue
    seen.add(d); out.push({ event: e, deck: d, title })
    if (out.length >= max) break
  }
  return out
}
export const parseFirstDeck = html => parseDeckLinks(html, 1)[0] || null

// --- varianti dentro un archetipo ---
// MTGTop8 usa archetipi larghi (es. "Mono Blue Aggro" = Delver + Faeries). Le ultime liste vengono
// raggruppate per nome (ignorando colori, "mono", punteggiatura, plurali): un nome giocato almeno
// VARIANT_MIN volte diventa un mazzo a sé, con quota di meta proporzionale alle sue liste.
const VARIANT_SCAN = 15, VARIANT_MIN = 2, VARIANT_MAX = 3
const NOISE = new Set(['mono', 'blue', 'blu', 'black', 'red', 'white', 'green', 'u', 'b', 'r', 'w', 'g', 'deck', 'the', 'pauper', 'modern', 'legacy', 'vintage', 'pioneer', 'standard', 'list', 'new', 'tech', 'v2', 'v3', 'mtgo', 'league'])
export function titleKey(title) {
  const toks = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
    .filter(t => t && !NOISE.has(t)).map(t => t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t)
  return [...new Set(toks)].sort().join(' ')
}
// I titoli generici uguali al nome dell'archetipo (es. "Mono Blue Aggro" dentro Mono Blue Aggro) non sono una variante.
export function groupVariants(links, min = VARIANT_MIN, max = VARIANT_MAX, archetype = '') {
  const generic = titleKey(archetype), groups = new Map()
  for (const l of links) {
    const k = titleKey(l.title) || '_'
    if (generic && k === generic) continue
    const g = groups.get(k) || { key: k, links: [], titles: new Map() }
    g.links.push(l); g.titles.set(l.title, (g.titles.get(l.title) || 0) + 1)
    groups.set(k, g)
  }
  const big = [...groups.values()].filter(g => g.key !== '_' && g.links.length >= min)
    .sort((a, b) => b.links.length - a.links.length).slice(0, max)
  return big.map(g => ({
    title: [...g.titles.entries()].sort((a, b) => b[1] - a[1])[0][0], // nome più usato
    count: g.links.length, links: g.links,
  }))
}

// --- sync ---
export async function syncFormat(id, code) {
  const home = await get(`format?f=${code}`)
  const metaId = parseMetaId(home)
  // cEDH: la lista archetipi (comandanti) arriva via POST cEDH_decks?show=pop
  const page = id === 'commander'
    ? await get(`cEDH_decks?f=${code}&show=pop&cid=&meta=${metaId ?? ''}&gamerid1=&gamerid2=&cEDH_cp=1`, 'POST')
    : metaId ? await get(`format?f=${code}&meta=${metaId}&a=`) : home
  const all = parseArchetypes(page)
  const tiers = assignTiers(all)
  const archetypes = all.slice(0, TOP_N).map(a => ({ ...a, tier: tiers.get(a.id) }))
  console.log(`  periodo meta=${metaId ?? '?'} · archetipi: ${all.length}, tier 1: ${[...tiers.values()].filter(t => t === 1).length}`)
  // anomalia: nessun archetipo o tutte le % uguali → salva la pagina per il debug
  if (!archetypes.length || new Set(archetypes.map(a => a.share)).size < 2) await dump(`${id}-format.html`, page)
  const refs = []
  for (const a of archetypes) {
    try {
      const arch = await get(`archetype?a=${a.id}&meta=${a.meta}&f=${code}`)
      const links = parseDeckLinks(arch, VARIANT_SCAN)
      const variants = groupVariants(links, VARIANT_MIN, VARIANT_MAX, a.name)
      if (variants.length >= 2) {
        // più varianti giocate: un mazzo per variante, quota divisa in proporzione
        for (const v of variants) {
          refs.push({ name: v.title, archetype: a.name, share: Math.round(a.share * v.count / links.length * 10) / 10, tier: a.tier, links: v.links.slice(0, 3) })
        }
        console.log(`  ↳ ${a.name}: ${variants.map(v => `${v.title} (${v.count}/${links.length})`).join(', ')}`)
      } else if (links.length) refs.push({ name: a.name, share: a.share, tier: a.tier, links: links.slice(0, 3) })
      else { console.warn(`  ✗ ${a.name}: link mazzo non trovato`); if (!refs.length) await dump(`${id}-archetype.html`, arch) }
    } catch (e) { console.warn(`  ✗ ${a.name}: ${e.message}`) }
  }
  return buildDecks(id, code, refs)
}

async function buildDecks(id, code, refs) {
  const decks = []
  for (const a of refs) {
    try {
      // prova la lista più recente; se l'export è vuoto passa alla successiva
      let ref, main = [], side = []
      for (ref of a.links) {
        ;({ main, side } = parseDeck(await get(`mtgo?d=${ref.deck}`)))
        if (main.length) break
        console.warn(`  · ${a.name}: export vuoto (d=${ref.deck}), provo la lista successiva`)
      }
      if (id === 'commander') { main = [...main, ...side]; side = [] } // in cEDH il comandante è nel "side"
      if (!main.length) { console.warn(`  ✗ ${a.name}: nessuna lista valida`); continue }
      decks.push({
        id: `mtgtop8-${ref.deck}`, name: a.name, archetype: a.archetype, share: a.share, tier: a.tier, title: ref.title,
        url: `${BASE}event?e=${ref.event}&d=${ref.deck}&f=${code}`,
        main: main.map(c => `${c.qty} ${c.name}`), side: side.map(c => `${c.qty} ${c.name}`),
      })
      console.log(`  ✓ ${a.name} (${a.share}%)`)
    } catch (e) { console.warn(`  ✗ ${a.name}: ${e.message}`) }
  }
  return decks
}

// Salva public/meta/<formato>.json con trend rispetto al sync precedente (usato anche da sync-meta.mjs)
export async function saveFormat(id, decks, extra = {}) {
  const today = new Date().toISOString().slice(0, 10)
  const file = new URL(`${id}.json`, OUT)
  const source = extra.source || 'MTGTop8'
  const old = await readFile(file, 'utf8').then(JSON.parse).catch(() => null)
  // fonte cambiata: nomi degli archetipi non confrontabili → niente trend per questo giro
  const prev = old && !String(old.source || '').startsWith(source) ? { date: null, map: new Map() } : previousShares(old, today)
  for (const d of decks) d.prev = prev.map.has(d.name) ? prev.map.get(d.name) : null
  const json = { updated: today, prevDate: prev.date, source: 'MTGTop8', period: 'ultimi 2 mesi', ...extra, tierMethod: 'MTGdecks: Tier 1 = archetipi che sommano il 50% del meta; Tier 2 > 0,2%; Tier 3 il resto', decks }
  await writeFile(file, JSON.stringify(json, null, 1) + '\n')
}

async function main() {
  const only = process.argv.slice(2)
  let ok = 0
  await loadRobots()
  for (const [id, code] of Object.entries(FORMATS)) {
    if (only.length && !only.includes(id)) continue
    console.log(`${id} (${code})`)
    try {
      const decks = await syncFormat(id, code)
      if (!decks.length) { console.warn(`  nessun mazzo: file ${id}.json lasciato invariato`); continue }
      await saveFormat(id, decks)
      ok++
    } catch (e) { console.warn(`  errore formato: ${e.message}`) }
  }
  console.log(`Formati aggiornati: ${ok}`)
  if (!ok) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
