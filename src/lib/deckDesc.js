// Profilo in una riga di un mazzo, solo dati di fatto: curva media, creature e interazione (tag di Scryfall).
// Niente etichette tipo "aggro/control": le euristiche sbagliano e chi gioca le riconosce dal nome. Testata in deckDesc.test.js.
import { norm } from './normalize.js'
import { cmcOf } from './fun.js'

export const INTERACTION = ['removal', 'burn', 'counter', 'draw', 'discard', 'wipe', 'ramp', 'tokens', 'reanimate']

// tags: indice di tagIndex() (Map nome normalizzato → Set di tag) oppure null se non ancora caricati
export function describeDeck(deck, getCard, tags = null) {
  let n = 0, cmc = 0, crea = 0
  const count = Object.fromEntries(INTERACTION.map(k => [k, 0]))
  for (const c of deck.main || []) {
    const card = getCard(c.name); if (!card || /\bLand\b/.test(card.type || '')) continue
    n += c.qty; cmc += (card.cmc ?? cmcOf(card.cost)) * c.qty
    if (/Creature/.test(card.type || '')) crea += c.qty
    const ids = tags?.oracle?.get(norm(c.name))
    if (ids) for (const k of INTERACTION) if (ids.has(k)) count[k] += c.qty
  }
  if (n < 10) return null
  const avg = cmc / n
  const inter = INTERACTION
    .map(k => [k, count[k]]).filter(([, v]) => v >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3)
  return { curve: Math.round(avg * 10) / 10, creatures: crea, inter }
}
