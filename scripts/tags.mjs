// Tag di Scryfall (Tagger) per i filtri della collezione: "funzione" (oracle tag) e "illustrazione" (art tag).
// Una selezione curata, scaricata una volta a settimana con la ricerca di Scryfall (otag:/atag:).
// Uscita: public/meta/tags.json = { updated, names: [...], oracle: { id: [indici] }, art: { id: [indici] }, src: { id: tag usato } }
import { readFileSync, writeFileSync } from 'node:fs'

const API = 'https://api.scryfall.com/cards/search'
const HEADERS = { 'User-Agent': 'Netdeckable/1.0 (github.com/baiaibrido/mtg-deck-matcher)', Accept: 'application/json' }
const OUT = new URL('../public/meta/tags.json', import.meta.url)
const MAX_PAGES = 60 // 175 carte a pagina
const sleep = ms => new Promise(r => setTimeout(r, ms))

// [id nel sito, nomi del tag su Scryfall da provare in ordine]
export const ORACLE_TAGS = [
  ['removal', ['removal']], ['counter', ['counterspell']], ['draw', ['draw', 'card-advantage']], ['ramp', ['ramp']],
  ['tutor', ['tutor']], ['wipe', ['board-wipe', 'sweeper']], ['burn', ['burn']], ['lifegain', ['lifegain', 'gain-life']],
  ['tokens', ['token-generator', 'token-maker', 'creates-tokens', 'token-creation', 'create-token', 'tokens']], ['mill', ['mill']], ['discard', ['discard', 'hand-disruption']],
  ['reanimate', ['reanimate', 'reanimation']], ['recursion', ['recursion']], ['protection', ['protects-creature', 'protection']],
  ['cantrip', ['cantrip']], ['sacrifice', ['sacrifice-outlet']],
]
export const ART_TAGS = [
  ['dragon', ['dragon']], ['cat', ['cat']], ['dog', ['dog']], ['bird', ['bird']], ['angel', ['angel']], ['demon', ['demon']],
  ['skull', ['skull']], ['sword', ['sword']], ['moon', ['moon']], ['forest', ['forest']], ['ocean', ['ocean', 'sea']],
  ['fire', ['fire']], ['castle', ['castle']], ['flower', ['flower']], ['owl', ['owl']], ['snow', ['snow']],
]

async function searchAll(q, fetchImpl) {
  const names = []
  let url = `${API}?q=${encodeURIComponent(q)}&unique=cards&order=name`
  for (let p = 0; url && p < MAX_PAGES; p++) {
    const r = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) })
    if (r.status === 404) return names // nessun risultato (o tag inesistente)
    if (r.status === 429) { await sleep(2000); p--; continue }
    if (!r.ok) throw new Error(`Scryfall ${r.status} (${q})`)
    const j = await r.json()
    for (const c of j.data || []) names.push(c.name.split(' // ')[0])
    url = j.has_more ? j.next_page : null
    await sleep(120) // Scryfall chiede al massimo ~10 richieste al secondo
  }
  return names
}

// Indice compatto: ogni nome una volta sola, i tag puntano agli indici
export function buildIndex(groups) {
  const names = [], pos = new Map()
  const idx = n => { let i = pos.get(n); if (i == null) { i = names.length; names.push(n); pos.set(n, i) } return i }
  const out = {}
  for (const [kind, map] of Object.entries(groups)) out[kind] = Object.fromEntries(Object.entries(map).map(([id, list]) => [id, [...new Set(list)].map(idx)]))
  return { names, ...out }
}

export async function syncTags({ fetchImpl = fetch, force = false, log = console.log } = {}) {
  let old = null; try { old = JSON.parse(readFileSync(OUT, 'utf8')) } catch { /* primo giro */ }
  if (!force && old?.updated && Date.now() - Date.parse(old.updated) < 6 * 864e5) { log(`Tag Scryfall: aggiornati il ${old.updated}, salto`); return }
  const groups = { oracle: {}, art: {} }, src = {}
  for (const [kind, prefix, list] of [['oracle', 'otag', ORACLE_TAGS], ['art', 'atag', ART_TAGS]]) {
    for (const [id, tags] of list) {
      for (const tag of tags) {
        const names = await searchAll(`${prefix}:${tag}`, fetchImpl)
        if (names.length) { groups[kind][id] = names; src[id] = `${prefix}:${tag}`; log(`  ${prefix}:${tag} → ${names.length} carte`); break }
        log(`  ${prefix}:${tag} → nessuna carta`)
      }
    }
  }
  if (!Object.keys(groups.oracle).length && !Object.keys(groups.art).length) throw new Error('nessun tag scaricato')
  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), ...buildIndex(groups), src }) + '\n')
}

if (process.argv[1] === new URL(import.meta.url).pathname) syncTags({ force: process.argv.includes('--force') })
