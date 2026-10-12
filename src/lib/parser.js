import { mergeEntries, withoutBasics } from './normalize.js'

// Intestazioni dei CSV di ManaBox, Moxfield, Deckbox, Dragon Shield, Cardmarket, TCGplayer e di questa app
const NAME_COLS = ['name', 'card', 'card name', 'cardname', 'english name', 'product name', 'simple name', 'nome', 'nome carta']
const QTY_COLS = ['qty', 'quantity', 'count', 'amount', 'copies', 'quantityx', 'quantità', 'quantita', 'qta', 'qty.']

export function splitCsv(line) {
  const out = []; let cur = '', q = false
  for (const c of line) {
    if (c === '"') { q = !q; continue }
    if ((c === ',' || c === ';' || c === '\t') && !q) { out.push(cur.trim()); cur = ''; continue }
    cur += c
  }
  out.push(cur.trim())
  return out
}

// "4 Lightning Bolt" | "4x Lightning Bolt" | "4 Lightning Bolt (2X2) 117" | "Lightning Bolt x4" | "Lightning Bolt,4"
export function parseLine(raw) {
  const l = raw.replace(/^SB:\s*/i, '').trim()
  let m = l.match(/^(\d+)\s*x?\s+(.+?)(?:\s+\([A-Za-z0-9]{2,6}\)(?:\s+\S+)?)?(?:\s+\*F\*)?$/i)
  if (m) return { qty: +m[1], name: m[2].trim() }
  m = l.match(/^(.+?)\s*[,;\t]\s*(\d+)$/) || l.match(/^(.+?)\s+x(\d+)$/i)
  if (m) return { qty: +m[2], name: m[1].replace(/^"|"$/g, '').trim() }
  return null
}

// Collezione: le terre base vengono scartate (contano sempre come possedute)
export const parseCollection = text => withoutBasics(parseCollectionRaw(text))

function parseCollectionRaw(text) {
  let lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (/^sep=.$/i.test(lines[0] || '')) lines = lines.slice(1) // Dragon Shield / Excel
  if (!lines.length) return []
  const head = splitCsv(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, ''))
  const ni = head.findIndex(h => NAME_COLS.includes(h))
  const qi = head.findIndex(h => QTY_COLS.includes(h))
  const out = []
  if (ni >= 0 && qi >= 0) {
    for (const l of lines.slice(1)) { const c = splitCsv(l); out.push({ name: c[ni], qty: parseInt(c[qi], 10) }) }
  } else if (ni >= 0) {
    for (const l of lines.slice(1)) { const c = splitCsv(l); out.push({ name: c[ni], qty: 1 }) }
  } else {
    for (const l of lines) { const r = parseLine(l); if (r) out.push(r) }
  }
  return mergeEntries(out)
}

// Decklist → { main, side }. "Sideboard" o "SB:" separano; senza intestazione, la prima riga vuota dopo le carte.
export function parseDeck(text) {
  const main = [], side = []
  const hasHeader = /^\s*(sideboard|side)\s*:?\s*(\(\d+\))?\s*$/im.test(text)
  let cur = main, seen = false
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim()
    if (!l) { if (!hasHeader && seen && cur === main) cur = side; continue }
    if (/^(sideboard|side)\s*:?\s*(\(\d+\))?$/i.test(l)) { cur = side; continue }
    if (/^(deck|main|maindeck|mainboard|commander|companion)\s*:?\s*(\(\d+\))?$/i.test(l)) { cur = main; continue }
    const r = parseLine(l)
    if (!r) continue
    seen = true;
    (/^SB:/i.test(l) ? side : cur).push(r)
  }
  return { main: mergeEntries(main), side: mergeEntries(side) }
}
