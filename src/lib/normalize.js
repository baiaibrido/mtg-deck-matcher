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
