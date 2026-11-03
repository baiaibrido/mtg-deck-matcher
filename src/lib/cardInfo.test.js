import { test } from 'node:test'
import assert from 'node:assert/strict'
import { usageIn } from './cardInfo.js'

const deck = (name, share, cards, core = [], flex = []) => ({ name, share, cards: new Set(cards), core: new Set(core), flex: new Map(flex) })

test('quota del meta che gioca una carta: cuore, posti liberi e lista mostrata', () => {
  const data = { decks: [deck('A', 10, ['brainstorm'], ['brainstorm']), deck('B', 6, [], [], [['brainstorm', 50]]), deck('C', 4, ['brainstorm']), deck('D', 20, ['ponder'])],
    stats: { cardsUp: [['Brainstorm', 12.5, 10]] } }
  assert.deepEqual(usageIn(data, 'Brainstorm'), { share: 17, n: 3, total: 4, trend: 2.5 })
  assert.deepEqual(usageIn(data, 'Counterspell'), { share: 0, n: 0, total: 4, trend: null })
  assert.equal(usageIn(null, 'x'), null)
})
