// Ricerca, filtri e ordinamenti della collezione (puri, testati in collection.test.js)
import { norm } from './normalize.js'

export const COLL_SORTS = ['name', 'qty', 'price', 'cmc', 'rarity', 'new', 'artist', 'set']
export const RARITIES = ['common', 'uncommon', 'rare', 'mythic', 'special']
const RANK = { common: 1, uncommon: 2, rare: 3, mythic: 4, special: 5, bonus: 5 }
const fold = s => norm(s || '')

// Tutte le parole cercate devono comparire in nome, artista, set (codice o nome) o tipo
export function matches(row, q) {
  const words = fold(q).split(' ').filter(Boolean)
  if (!words.length) return true
  const c = row.card || {}
  const hay = [row.name, c.artist, c.setName, c.set, c.type].map(fold).join(' | ')
  return words.every(w => hay.includes(w))
}

// f = { q, typeTest, artist, set, rarity, otag, atag }; tags = { oracle: Map(nome→Set), art: Map } (facoltativo)
export function applyFilters(rows, f, tags) {
  return rows.filter(r => {
    const c = r.card
    if (f.typeTest && !(c && f.typeTest(c.type))) return false
    if (f.artist && c?.artist !== f.artist) return false
    if (f.set && c?.set !== f.set) return false
    if (f.rarity && c?.rarity !== f.rarity) return false
    if (f.otag && !tags?.oracle.get(norm(r.name))?.has(f.otag)) return false
    if (f.atag && !tags?.art.get(norm(r.name))?.has(f.atag)) return false
    if (f.ban && !(f.ban === 'any' ? banFormats(c).length : banFormats(c).includes(f.ban))) return false
    return matches(r, f.q)
  })
}

export function sortRows(rows, sort, priceOf) {
  const byName = (a, b) => a.name.localeCompare(b.name)
  const cmp = {
    name: byName,
    qty: (a, b) => b.qty - a.qty || byName(a, b),
    price: (a, b) => (priceOf(b.card) ?? -1) * b.qty - (priceOf(a.card) ?? -1) * a.qty || byName(a, b),
    cmc: (a, b) => (a.card?.cmc ?? 99) - (b.card?.cmc ?? 99) || byName(a, b),
    rarity: (a, b) => (RANK[b.card?.rarity] || 0) - (RANK[a.card?.rarity] || 0) || byName(a, b),
    new: (a, b) => (b.card?.released || '').localeCompare(a.card?.released || '') || byName(a, b),
    artist: (a, b) => (a.card?.artist ? 0 : 1) - (b.card?.artist ? 0 : 1) || (a.card?.artist || '').localeCompare(b.card?.artist || '') || byName(a, b),
    set: (a, b) => (a.card?.setName ? 0 : 1) - (b.card?.setName ? 0 : 1) || (a.card?.setName || '').localeCompare(b.card?.setName || '') || byName(a, b),
  }[sort] || byName
  return [...rows].sort(cmp)
}

// Valori presenti nella collezione per i menu dei filtri (con quante copie)
// formati in cui la carta è bannata o ristretta
const BAN_ORDER = ['standard', 'pioneer', 'modern', 'pauper', 'legacy', 'vintage', 'commander']
export const banFormats = c => [...(c?.bn || []), ...(c?.rs || [])]

export function facets(rows) {
  const artists = new Map(), sets = new Map(), rarities = new Map(), bans = new Map()
  for (const r of rows) {
    const c = r.card; if (!c) continue
    const bf = banFormats(c)
    if (bf.length) { bans.set('any', (bans.get('any') || 0) + r.qty); for (const f of new Set(bf)) bans.set(f, (bans.get(f) || 0) + r.qty) }
    if (c.artist) artists.set(c.artist, (artists.get(c.artist) || 0) + r.qty)
    if (c.set) { const s = sets.get(c.set) || { code: c.set, name: c.setName || c.set.toUpperCase(), released: c.released || '', n: 0 }; s.n += r.qty; sets.set(c.set, s) }
    if (c.rarity) rarities.set(c.rarity, (rarities.get(c.rarity) || 0) + r.qty)
  }
  return {
    artists: [...artists].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    sets: [...sets.values()].sort((a, b) => b.released.localeCompare(a.released) || a.name.localeCompare(b.name)),
    rarities: RARITIES.filter(x => rarities.has(x)).map(x => [x, rarities.get(x)]),
    bans: ['any', ...BAN_ORDER].filter(f => bans.has(f)).map(f => [f, bans.get(f)]),
  }
}

// tags.json → { oracle: Map(nome→Set(tag)), art: Map(nome→Set(tag)), ids: { oracle: [...], art: [...] } }
export function tagIndex(json) {
  const out = { oracle: new Map(), art: new Map(), ids: { oracle: [], art: [] } }
  if (!json?.names) return out
  for (const kind of ['oracle', 'art']) {
    for (const [id, list] of Object.entries(json[kind] || {})) {
      out.ids[kind].push(id)
      for (const i of list) { const k = norm(json.names[i]); let s = out[kind].get(k); if (!s) out[kind].set(k, s = new Set()); s.add(id) }
    }
  }
  return out
}
