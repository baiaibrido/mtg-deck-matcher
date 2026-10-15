import { norm } from './normalize.js'

// Distanza di modifica (lettere sbagliate, mancanti, in più o scambiate). Si ferma oltre `max`.
export function editDistance(a, b, max = Infinity) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let pp = null, p = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const c = [i]; let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (pp && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, pp[j - 2] + 1)
      c.push(v); if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    pp = p; p = c
  }
  return p[b.length]
}

const key = s => norm(s).replace(/[^a-z0-9 ]/g, '')
const keyed = new WeakMap() // elenco → chiavi già calcolate (l'elenco completo ha ~35.000 nomi)
const keysOf = names => { let k = keyed.get(names); if (!k) keyed.set(names, k = names.map(key)); return k }

// Nome ufficiale più vicino a quello scritto, cercato nell'elenco completo delle carte.
// Tollera circa un errore ogni 4 lettere. Se due nomi sono ugualmente vicini non sceglie: li restituisce come suggerimenti.
export function closestName(input, names) {
  const k = key(input)
  if (!k) return { name: null, suggestions: [] }
  const max = Math.max(1, Math.floor(k.length / 4))
  let best = max + 1, hits = []
  const keys = keysOf(names)
  for (let i = 0; i < names.length; i++) {
    const d = editDistance(k, keys[i], best)
    if (d < best) { best = d; hits = [names[i]] } else if (d === best && d <= max) hits.push(names[i])
  }
  if (best > max) return { name: null, suggestions: [] }
  return hits.length === 1 ? { name: hits[0], suggestions: [] } : { name: null, suggestions: hits.slice(0, 3) }
}
