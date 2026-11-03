// Dati della scheda della carta: testo completo, stampe e legalità da Scryfall (chiesti quando si apre la scheda),
// e quanto è giocata nel meta di ogni formato, calcolato dalle liste dei tornei che il sito scarica già.
import { toEntries } from './metaDecks.js'
import { norm } from './normalize.js'

const API = 'https://api.scryfall.com'
const memo = new Map()
const getJson = url => {
  if (!memo.has(url)) memo.set(url, fetch(url, { headers: { Accept: 'application/json' } }).then(r => { if (!r.ok) throw new Error(r.status); return r.json() }).catch(e => { memo.delete(url); throw e }))
  return memo.get(url)
}

// la carta intera; con l'id Scryfall o set e numero quella stampa precisa
export const fetchCardFull = ({ name, sid, set, num }) =>
  getJson(sid ? `${API}/cards/${encodeURIComponent(sid)}` : set && num ? `${API}/cards/${encodeURIComponent(set)}/${encodeURIComponent(num)}` : `${API}/cards/named?exact=${encodeURIComponent(name)}`)

const num = v => (v == null || v === '' ? null : +v)
const img = c => (c.image_uris || c.card_faces?.[0]?.image_uris)?.normal || null
export const printOf = c => ({
  id: c.id, set: c.set, setName: c.set_name, num: c.collector_number, year: c.released_at?.slice(0, 4) || '',
  artist: c.artist || c.card_faces?.[0]?.artist || null, rarity: c.rarity, img: img(c), back: c.card_faces?.[1]?.image_uris?.normal || null,
  eur: num(c.prices?.eur) ?? num(c.prices?.eur_foil), usd: num(c.prices?.usd) ?? num(c.prices?.usd_foil), uri: c.scryfall_uri,
})
// tutte le stampe della carta (la prima pagina di Scryfall: fino a 175, dalla più recente)
export async function fetchPrints(card) {
  if (!card?.prints_search_uri) return []
  const j = await getJson(card.prints_search_uri)
  return (j.data || []).filter(c => !c.digital).map(printOf)
}

// ── Quanto è giocata nel meta ──
// Per ogni mazzo del formato: 1 se la carta è nel cuore della lista, la percentuale delle liste se è tra i posti liberi,
// 1 se è nella lista mostrata (main o side); la quota del mazzo pesata così, sommata su tutti i mazzi.
const base = import.meta.env?.BASE_URL || '/'
const light = new Map()
const loadLight = format => {
  if (!light.has(format)) light.set(format, fetch(`${base}meta/${format}.json`).then(r => r.ok ? r.json() : null).then(j => j && {
    decks: (j.decks || []).map(d => ({ name: d.name, share: d.share || 0, cards: new Set([...toEntries(d.main), ...toEntries(d.side)].map(c => norm(c.name))), core: new Set((d.core || []).map(([n]) => norm(n))), flex: new Map((d.flex || []).map(([n, p]) => [norm(n), p])) })),
    stats: j.stats || null,
  }).catch(() => null))
  return light.get(format)
}
export function usageIn(data, name) {
  if (!data) return null
  const k = norm(name)
  let share = 0, n = 0
  for (const d of data.decks) {
    const f = d.core.has(k) ? 1 : d.flex.has(k) ? d.flex.get(k) / 100 : d.cards.has(k) ? 1 : 0
    if (f > 0) { share += d.share * f; n++ }
  }
  const tr = [...(data.stats?.cardsUp || []), ...(data.stats?.cardsDown || [])].find(([c]) => norm(c) === k)
  return { share: Math.round(share * 10) / 10, n, total: data.decks.length, trend: tr ? Math.round((tr[1] - tr[2]) * 10) / 10 : null }
}
export const metaUsage = async (formats, name) => Object.fromEntries(await Promise.all(formats.map(async f => [f, usageIn(await loadLight(f), name)])))
