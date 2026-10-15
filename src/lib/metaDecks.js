import { parseLine } from './parser.js'
import { mergeEntries } from './normalize.js'
import { seedCards } from './scryfall.js'

const toEntries = arr => mergeEntries((arr || []).map(x => typeof x === 'string' ? parseLine(x) : x).filter(Boolean))
const base = import.meta.env?.BASE_URL || '/'

export async function loadFormats() {
  const r = await fetch(`${base}meta/index.json`)
  return r.ok ? (await r.json()).formats : []
}

// Cache JSON per formato: { updated, source ('MTGODecklistCache' | 'MTGTop8'), decks: [{ id, name, url?, main: ["4 Card"], side: [...] }] }
export async function loadMetaDecks(format) {
  try {
    // dati delle carte preparati di notte: caricati insieme ai mazzi, così l'app non chiede a Scryfall le carte dei mazzi
    const [r, cards] = await Promise.all([
      fetch(`${base}meta/${format}.json`),
      fetch(`${base}meta/cards-${format}.json`).then(x => x.ok ? x.json() : null).catch(() => null),
    ])
    if (cards?.cards) seedCards(cards.cards, cards.updated)
    if (!r.ok) return []
    const j = await r.json()
    // i rogue della settimana arrivano con rogue: true (fuori dall'elenco principale e dalle carte chiave)
    const list = [...(j.decks || []), ...(j.rogue || []).map(d => ({ ...d, rogue: true }))].map(d => ({
      ...d, format, historyWeeks: j.historyWeeks || null, source: d.source || j.source || 'cache', updated: d.updated || j.updated, prevDate: d.rogue ? null : j.prevDate || null,
      main: toEntries(d.main), side: toEntries(d.side),
    }))
    list.stats = j.stats || null // statistiche del formato (carte in ascesa, side del meta…), vedi scripts/stats.mjs
    return list
  } catch { return [] }
}

export { toEntries }

// Storico prezzi del formato (scritto ogni notte): { dates, p: { carta: [EUR…] } }; null se non ancora disponibile
export async function loadPrices(format) {
  try { const r = await fetch(`${base}meta/prices-${format}.json`); return r.ok ? await r.json() : null } catch { return null }
}
