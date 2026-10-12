// Scarica da MTGTop8 i 20 archetipi più giocati per formato (ultimi 2 mesi) e
// salva l'ultima lista di ognuno in public/meta/<formato>.json.
// Uso: node scripts/sync-mtgtop8.mjs [pauper modern ...]
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parseDeck } from '../src/lib/parser.js'

const BASE = 'https://www.mtgtop8.com/'
const TOP_N = 20
const DELAY_MS = 1200 // pausa tra richieste: carico minimo sul sito
const FORMATS = { standard: 'ST', pioneer: 'PI', modern: 'MO', pauper: 'PAU', legacy: 'LE', vintage: 'VI', commander: 'cEDH' }
const OUT = new URL('../public/meta/', import.meta.url)
const DEBUG = new URL('../debug/', import.meta.url)
const dump = async (file, html) => { await mkdir(DEBUG, { recursive: true }); await writeFile(new URL(file, DEBUG), html) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const decode = s => s.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()

async function get(path, method = 'GET') {
  await sleep(DELAY_MS)
  const r = await fetch(BASE + path, { method, signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'mtg-deck-matcher/0.2 (sync giornaliero, uso personale)' } })
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

// Accetta href relativi/assoluti, virgolette o no, &amp;, ordine e=…&d=… oppure d=…&e=…
export function parseFirstDeck(html) {
  const re = /<a[^>]+href=["']?([^"' >]*[?&](?:amp;)?(?:e=\d+&(?:amp;)?d=\d+|d=\d+&(?:amp;)?e=\d+)[^"' >]*)["']?[^>]*>([\s\S]*?)<\/a>/gi
  for (const m of html.matchAll(re)) {
    const e = m[1].match(/[?&;]e=(\d+)/)?.[1], d = m[1].match(/[?&;]d=(\d+)/)?.[1]
    const title = decode(m[2].replace(/<[^>]+>/g, ''))
    if (e && d && title) return { event: e, deck: d, title }
  }
  return null
}

// --- sync ---
async function syncFormat(id, code) {
  const home = await get(`format?f=${code}`)
  const metaId = parseMetaId(home)
  // cEDH: la lista archetipi (comandanti) arriva via POST cEDH_decks?show=pop
  const page = id === 'commander'
    ? await get(`cEDH_decks?f=${code}&show=pop&cid=&meta=${metaId ?? ''}&gamerid1=&gamerid2=&cEDH_cp=1`, 'POST')
    : metaId ? await get(`format?f=${code}&meta=${metaId}&a=`) : home
  const archetypes = parseArchetypes(page).slice(0, TOP_N)
  console.log(`  periodo meta=${metaId ?? '?'} · archetipi trovati: ${archetypes.length}`)
  // anomalia: nessun archetipo o tutte le % uguali → salva la pagina per il debug
  if (!archetypes.length || new Set(archetypes.map(a => a.share)).size < 2) await dump(`${id}-format.html`, page)
  const refs = []
  for (const a of archetypes) {
    try {
      const arch = await get(`archetype?a=${a.id}&meta=${a.meta}&f=${code}`)
      const ref = parseFirstDeck(arch)
      if (ref) refs.push({ ...ref, name: a.name, share: a.share })
      else { console.warn(`  ✗ ${a.name}: link mazzo non trovato`); if (!refs.length) await dump(`${id}-archetype.html`, arch) }
    } catch (e) { console.warn(`  ✗ ${a.name}: ${e.message}`) }
  }
  return buildDecks(id, code, refs)
}

async function buildDecks(id, code, refs) {
  const decks = []
  for (const ref of refs) {
    const a = ref
    try {
      const txt = await get(`mtgo?d=${ref.deck}`)
      let { main, side } = parseDeck(txt)
      if (id === 'commander') { main = [...main, ...side]; side = [] } // in cEDH il comandante è nel "side"
      if (!main.length) { console.warn(`  ✗ ${a.name}: export vuoto`); await dump(`${id}-export-${ref.deck}.txt`, txt); continue }
      decks.push({
        id: `mtgtop8-${ref.deck}`, name: a.name, share: a.share, title: ref.title,
        url: `${BASE}event?e=${ref.event}&d=${ref.deck}&f=${code}`,
        main: main.map(c => `${c.qty} ${c.name}`), side: side.map(c => `${c.qty} ${c.name}`),
      })
      console.log(`  ✓ ${a.name} (${a.share}%)`)
    } catch (e) { console.warn(`  ✗ ${a.name}: ${e.message}`) }
  }
  return decks
}

async function main() {
  const only = process.argv.slice(2)
  const today = new Date().toISOString().slice(0, 10)
  let ok = 0
  for (const [id, code] of Object.entries(FORMATS)) {
    if (only.length && !only.includes(id)) continue
    console.log(`${id} (${code})`)
    try {
      const decks = await syncFormat(id, code)
      if (!decks.length) { console.warn(`  nessun mazzo: file ${id}.json lasciato invariato`); continue }
      const json = { updated: today, source: 'MTGTop8 — ultimi 2 mesi', decks }
      await writeFile(new URL(`${id}.json`, OUT), JSON.stringify(json, null, 1) + '\n')
      ok++
    } catch (e) { console.warn(`  errore formato: ${e.message}`) }
  }
  console.log(`Formati aggiornati: ${ok}`)
  if (!ok) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
