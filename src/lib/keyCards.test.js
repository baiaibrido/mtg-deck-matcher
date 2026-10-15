import { test } from 'node:test'
import { setCurrency } from './currency.js'
setCurrency('EUR')
import assert from 'node:assert/strict'
import { keyCards } from './keyCards.js'
import { rankDecks } from './matcher.js'
import { missingCost } from './deckInfo.js'

const d = (id, share, main) => ({ id, name: id, share, main: main.map(([qty, name]) => ({ qty, name })), side: [] })

test('carte chiave: condivise da più mazzi, terre base escluse, ordine per numero di mazzi', () => {
  const decks = [
    d('A', 10, [[4, 'Bolt'], [4, 'Opt'], [20, 'Mountain']]),
    d('B', 5, [[4, 'Bolt'], [2, 'Opt']]),
    d('C', 1, [[3, 'Bolt'], [4, 'Snap']]),
  ]
  const r = keyCards(rankDecks(decks, [{ name: 'Opt', qty: 1 }], Infinity))
  assert.deepEqual(r.map(e => [e.name, e.decks.length, e.maxMissing]), [['Bolt', 3, 4], ['Opt', 2, 3]])
})

test('costo mancolista: somma prezzi × copie, conta quelle senza prezzo', () => {
  const prices = { bolt: 1.5, opt: null }
  const c = missingCost([{ name: 'Bolt', missing: 4 }, { name: 'Opt', missing: 2 }, { name: 'X', missing: 0 }], n => ({ eur: prices[n.toLowerCase()] }))
  assert.deepEqual(c, { amount: 6, unknown: 2, known: 4 }) // valuta di test: euro
})
