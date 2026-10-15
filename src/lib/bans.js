// Ban: carte bannate in un formato (dati Scryfall) e nuovi ban sulle carte della collezione
export const bannedIn = (card, format) => !!card?.bn?.includes(format)
export const deckBans = (deck, lookup) => [...new Set([...deck.main, ...deck.side].map(c => c.name))].filter(n => bannedIn(lookup(n), deck.format))

// seen: { carta: ['pauper', …] } ultimo stato visto (null = mai visto: si memorizza senza avvisare).
// Carte aggiunte dopo: il loro stato attuale si memorizza senza avviso (non è un ban nuovo).
// Restituisce i ban nuovi [{ name, formats }] e lo stato aggiornato da salvare quando l'utente chiude l'avviso.
export function newBans(collection, lookup, seen) {
  const next = { ...(seen || {}) }, fresh = []
  for (const { name } of collection) {
    const c = lookup(name)
    if (!c?.bn) continue // dati non ancora scaricati
    const before = seen?.[c.name]
    const added = before ? c.bn.filter(f => !before.includes(f)) : []
    if (added.length) fresh.push({ name: c.name, formats: added })
    next[c.name] = c.bn
  }
  return { fresh: seen ? fresh : [], next }
}

export const FORMAT_LABEL = { standard: 'Standard', pioneer: 'Pioneer', modern: 'Modern', pauper: 'Pauper', legacy: 'Legacy', vintage: 'Vintage', commander: 'Commander' }
export const formatList = fs => fs.map(f => FORMAT_LABEL[f] || f).join(', ')
