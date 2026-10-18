// Dati delle carte dei mazzi preparati ogni notte dal file "Oracle Cards" di Scryfall (uno scaricamento al giorno,
// come chiede Scryfall), così i visitatori non devono interrogare l'API per ogni carta.
// Uscita: public/meta/cards-<formato>.json = { updated, cards: { chiave: carta compatta } } nello stesso formato
// della cache dell'app (src/lib/scryfall.js: slim).
import { gunzipSync } from 'node:zlib'
import { norm } from '../src/lib/normalize.js'

const BULK = 'https://api.scryfall.com/bulk-data'
const HEADERS = { 'User-Agent': 'Netdeckable/1.0 (github.com/baiaibrido/mtg-deck-matcher)', Accept: 'application/json' }
const IMG = 'https://cards.scryfall.io/normal/'
const FORMAT_IDS = ['standard', 'pioneer', 'modern', 'pauper', 'legacy', 'vintage', 'commander']
const SKIP_LAYOUTS = new Set(['token', 'double_faced_token', 'art_series', 'emblem', 'vanguard', 'scheme', 'planar', 'reversible_card'])

const num = v => (v == null || v === '' ? null : +v)
const legal = (c, status) => FORMAT_IDS.filter(f => c.legalities?.[f] === status)
export function slim(c) {
  const f = c.card_faces?.[0]
  const img = (c.image_uris || f?.image_uris)?.normal || ''
  return {
    name: c.name.split(' // ')[0],
    i: img.startsWith(IMG) ? img.slice(IMG.length).split('?')[0] : img || null,
    ci: c.color_identity || [],
    type: (f?.type_line || c.type_line || '').split(' // ')[0],
    cost: f?.mana_cost ?? c.mana_cost ?? '',
    eur: num(c.prices?.eur) ?? num(c.prices?.eur_foil),
    usd: num(c.prices?.usd) ?? num(c.prices?.usd_foil),
    bn: legal(c, 'banned'), rs: legal(c, 'restricted'),
    // dati della stampa (solo se presenti, per non appesantire il file)
    ...Object.fromEntries(Object.entries({ a: c.artist || f?.artist, s: c.set, sn: c.set_name, n: c.collector_number, r: c.rarity, d: c.released_at, v: c.cmc }).filter(([, v]) => v != null && v !== '')),
  }
}

// Indice nome → carta (chiave = norm della faccia frontale, come nell'app)
export function indexCards(all) {
  const idx = new Map()
  for (const c of all) {
    if (SKIP_LAYOUTS.has(c.layout) || !c.name) continue
    const k = norm(c.name)
    if (!idx.has(k)) idx.set(k, c)
  }
  return idx
}

const namesOf = json => [...json.decks || [], ...json.rogue || []].flatMap(d => [...d.main || [], ...d.side || []])
  .map(line => String(line).replace(/^\d+\s+/, '').trim())

// formats: { id: jsonDelFormato } → { id: { updated, cards } } (+ quante carte non trovate)
export function cardsByFormat(idx, formats, today = Date.now()) {
  const out = {}
  for (const [id, json] of Object.entries(formats)) {
    const cards = {}; let missing = 0
    for (const n of new Set(namesOf(json))) {
      const c = idx.get(norm(n))
      if (c) cards[norm(n)] = slim(c); else missing++
    }
    out[id] = { updated: new Date(today).toISOString().slice(0, 10), cards, missing }
  }
  return out
}

export async function downloadOracle(fetchImpl = fetch) {
  const res = await fetchImpl(BULK, { headers: HEADERS, signal: AbortSignal.timeout(30000) })
  const body = await res.text()
  let list; try { list = JSON.parse(body) } catch { list = null }
  let meta = (list?.data || []).find(x => x.type === 'oracle_cards') || (list?.type === 'oracle_cards' ? list : null)
  // l'indirizzo del file può stare nell'elenco o solo nella scheda del singolo file (meta.uri)
  const linkOf = m => m && (m.download_uri || Object.entries(m).find(([k, v]) => /download/i.test(k) && typeof v === 'string' && v.startsWith('http'))?.[1])
  if (!linkOf(meta) && meta?.uri) meta = await (await fetchImpl(meta.uri, { headers: HEADERS, signal: AbortSignal.timeout(30000) })).json()
  const link = linkOf(meta)
  if (!link) throw new Error(`indirizzo del file Scryfall mancante (HTTP ${res.status}; campi: ${Object.keys(meta || {}).join(', ')}; ${JSON.stringify(meta).slice(0, 600)})`)
  const r = await fetchImpl(link, { headers: HEADERS, signal: AbortSignal.timeout(10 * 60e3) })
  if (!r.ok) throw new Error(`Scryfall ${r.status}`)
  // il file può arrivare compresso (gzip) senza che il server lo dichiari: si decomprime a mano
  let buf = Buffer.from(await r.arrayBuffer())
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf)
  return parseCards(buf.toString('utf8'))
}

// Array JSON classico oppure una carta per riga (JSON Lines): accetta entrambi
export function parseCards(text) {
  try { const j = JSON.parse(text); return Array.isArray(j) ? j : j.data || [] } catch { /* non è un unico JSON */ }
  const out = []
  for (let line of text.split('\n')) {
    line = line.trim().replace(/,$/, '')
    if (!line || line === '[' || line === ']') continue
    out.push(JSON.parse(line))
  }
  return out
}
