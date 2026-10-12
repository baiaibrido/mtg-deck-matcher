// Chiave di confronto per i nomi carta: minuscolo, senza accenti, solo faccia frontale.
export const norm = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/\s*\/\/?\s*/)[0]
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim().toLowerCase()

// Unisce voci con lo stesso nome normalizzato sommando le quantità.
export function mergeEntries(list) {
  const map = new Map()
  for (const { name, qty } of list) {
    if (!name || !(qty > 0)) continue
    const k = norm(name)
    const e = map.get(k)
    if (e) e.qty += qty
    else map.set(k, { name: name.trim(), qty })
  }
  return [...map.values()]
}

// Terre base "lisce": tutti ne hanno in abbondanza, quindi non si tengono in collezione e contano sempre come possedute
export const BASIC_LANDS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']
const BASIC_KEYS = new Set(BASIC_LANDS.map(n => n.toLowerCase()))
export const isBasic = name => BASIC_KEYS.has(norm(name))
export const withoutBasics = list => list.filter(c => !isBasic(c.name))
