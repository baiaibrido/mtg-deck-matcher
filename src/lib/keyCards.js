import { norm } from './normalize.js'

export const BASICS = /^(snow-covered )?(plains|island|swamp|mountain|forest)$|^wastes$/i

// Carte mancanti che compaiono in più mazzi del formato. Ordine: numero di mazzi, poi
// "valore" = quanto avvicinano i mazzi (copie mancanti / carte del mazzo) pesato sulla popolarità.
export function keyCards(scored, { limit = 25 } = {}) {
  const map = new Map()
  for (const s of scored) {
    const size = s.main.total + s.side.total || 1
    const weight = Math.max(s.deck.share || 0, 0.5)
    const seen = new Set()
    for (const r of s.missing) {
      if (BASICS.test(r.name)) continue
      const k = norm(r.name)
      const e = map.get(k) || { name: r.name, decks: [], maxMissing: 0, value: 0 }
      if (!seen.has(k)) e.decks.push({ id: s.deck.id, name: s.deck.name, tier: s.deck.tier })
      seen.add(k)
      e.maxMissing = Math.max(e.maxMissing, r.missing)
      e.value += weight * r.missing / size
      map.set(k, e)
    }
  }
  return [...map.values()]
    .filter(e => e.decks.length >= 2)
    .sort((a, b) => b.decks.length - a.decks.length || b.value - a.value)
    .slice(0, limit)
}
