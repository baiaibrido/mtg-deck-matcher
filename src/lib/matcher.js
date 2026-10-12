import { norm, isBasic } from './normalize.js'

export const W_MAIN = 0.85
export const W_SIDE = 0.15

export function toOwnedMap(collection) {
  const m = new Map()
  for (const { name, qty } of collection) { const k = norm(name); m.set(k, (m.get(k) || 0) + qty) }
  return m
}

// Consuma copie dal pool: una copia usata nel main non conta per il side.
function alloc(list, pool) {
  let have = 0, total = 0
  const rows = list.map(c => {
    const k = norm(c.name)
    const avail = isBasic(c.name) ? Infinity : pool.get(k) || 0 // terre base: sempre possedute
    const h = Math.min(avail, c.qty)
    if (!isBasic(c.name)) pool.set(k, avail - h)
    have += h; total += c.qty
    return { name: c.name, qty: c.qty, have: h, missing: c.qty - h }
  })
  return { rows, have, total, ratio: total ? have / total : 0 }
}

export function scoreDeck(deck, owned) {
  const pool = new Map(owned)
  const main = alloc(deck.main || [], pool)
  const side = alloc(deck.side || [], pool)
  const score = main.ratio * W_MAIN + side.ratio * W_SIDE
  const missing = [...main.rows, ...side.rows].filter(r => r.missing > 0)
  return { deck, main, side, score, missing }
}

export function rankDecks(decks, collection, limit = 5) {
  const owned = toOwnedMap(collection)
  return decks
    .map(d => scoreDeck(d, owned))
    .sort((a, b) => b.score - a.score || b.main.ratio - a.main.ratio || (b.deck.share || 0) - (a.deck.share || 0))
    .slice(0, limit)
}
