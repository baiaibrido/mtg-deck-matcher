import { parseLine } from './parser.js'
import { mergeEntries } from './normalize.js'

const toEntries = arr => mergeEntries((arr || []).map(x => typeof x === 'string' ? parseLine(x) : x).filter(Boolean))
const base = import.meta.env?.BASE_URL || '/'

export async function loadFormats() {
  const r = await fetch(`${base}meta/index.json`)
  return r.ok ? (await r.json()).formats : []
}

// Cache JSON per formato: { updated, source ('MTGODecklistCache' | 'MTGTop8'), decks: [{ id, name, url?, main: ["4 Card"], side: [...] }] }
export async function loadMetaDecks(format) {
  try {
    const r = await fetch(`${base}meta/${format}.json`)
    if (!r.ok) return []
    const j = await r.json()
    return (j.decks || []).map(d => ({
      ...d, format, source: d.source || j.source || 'cache', updated: d.updated || j.updated, prevDate: j.prevDate || null,
      main: toEntries(d.main), side: toEntries(d.side),
    }))
  } catch { return [] }
}

export { toEntries }
