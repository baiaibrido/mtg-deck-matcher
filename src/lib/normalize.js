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

// Collezione: una voce per stampa (set + numero, o Scryfall ID se c'è); senza stampa una voce per nome.
// Le stampe diverse della stessa carta restano separate (artista, set e rarità cambiano).
const SET_RE = /^[a-z0-9]{2,6}$/i
export const printingOf = e => ({
  set: e.set && SET_RE.test(e.set) ? e.set.toLowerCase() : undefined,
  num: e.set && e.num ? String(e.num).trim() : undefined,
  sid: e.sid || undefined,
})
export const entryKey = e => { const p = printingOf(e); return `${norm(e.name)}|${p.sid || ''}|${p.set || ''}|${p.num || ''}` }
export function mergeCollection(list) {
  const map = new Map()
  for (const e of list) {
    if (!e?.name || !(e.qty > 0)) continue
    const k = entryKey(e), cur = map.get(k)
    if (cur) cur.qty += e.qty
    else { const p = printingOf(e); map.set(k, Object.fromEntries(Object.entries({ name: e.name.trim(), qty: e.qty, ...p }).filter(([, v]) => v !== undefined))) }
  }
  return [...map.values()]
}

// Terre base "lisce": tutti ne hanno in abbondanza, quindi non si tengono in collezione e contano sempre come possedute
export const BASIC_LANDS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']
const BASIC_KEYS = new Set(BASIC_LANDS.map(n => n.toLowerCase()))
export const isBasic = name => BASIC_KEYS.has(norm(name))
export const withoutBasics = list => list.filter(c => !isBasic(c.name))
