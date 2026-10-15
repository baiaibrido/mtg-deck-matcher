import { test } from 'node:test'
import assert from 'node:assert/strict'
import { health, valuePoints, bestBuys, converters, priceWatch, sideAgainst, coreWithOwned } from './stats.js'

const mk = (name, share, extra = {}) => ({ id: name, name, share, main: [], side: [], ...extra })
test('salute: quanti mazzi fanno metà meta', () => {
  const h = health([mk('A', 30, { history: [40, 30] }), mk('B', 25, { history: [20, 25] }), mk('C', 20, { history: [20, 20] }), mk('D', 15, { history: [10, 15] }), mk('E', 10, { history: [10, 10] })])
  assert.equal(h.now, 2); assert.equal(h.kind, 'tight'); assert.deepEqual(h.series, [2, 2])
})
test('valore per euro: frontiera e miglior acquisto', () => {
  const card = n => ({ X: { eur: 1 }, Y: { eur: 10 } })[n]
  const s = (n, wr, cards, need) => ({ deck: { id: n, name: n, metaWr: wr, main: cards.map(c => ({ name: c, qty: 4 })), side: [] }, need })
  const pts = valuePoints([s('Cheap', 50, ['X']), s('Pricey', 55, ['Y']), s('Bad', 45, ['Y'])], card, x => x.need ?? 0)
  assert.deepEqual(pts.filter(p => p.frontier).map(p => p.s.deck.name).sort(), ['Cheap', 'Pricey'])
  const pts2 = valuePoints([s('Cheap', 50, ['X'], 4), s('Pricey', 55, ['Y'], 40)], card, x => x.need)
  assert.deepEqual(bestBuys(pts2).map(b => [b.budget, b.p.s.deck.name]), [[25, 'Cheap'], [50, 'Pricey']])
})
test('conversione, prezzi fermi, side contro di te, cuore', () => {
  assert.equal(converters([mk('A', 5, { conv: [5, 10, 20] }), mk('B', 5, { conv: [5, 4, 8] })])[0].d.name, 'A')
  const w = priceWatch([['X', 10, 5, []]], { dates: ['a', 'b'], p: { X: [1, 1.05] } })
  assert.equal(w[0].still, true); assert.equal(Math.round(w[0].change), 5)
  const me = mk('Me', 5, { mu: [['Opp1', 2, 10, 0], ['Opp2', 3, 9, 0], ['Easy', 10, 2, 0]] })
  const o1 = mk('Opp1', 5, { side: [{ name: 'Hydroblast', qty: 3 }, { name: 'Relic', qty: 2 }] }), o2 = mk('Opp2', 5, { side: [{ name: 'Hydroblast', qty: 4 }] })
  const sa = sideAgainst(me, [me, o1, o2, mk('Easy', 5, { side: [{ name: 'Nope', qty: 2 }] })])
  assert.deepEqual(sa.opponents, ['Opp1', 'Opp2']); assert.equal(sa.cards[0].name, 'Hydroblast'); assert.ok(!sa.cards.some(c => c.name === 'Nope'))
  const cw = coreWithOwned({ core: [['Island', 18], ['Ponder', 4]], flex: [['Snap', 60, 2]], lists: 100 }, new Map([['ponder', 2]]))
  assert.equal(cw.missing, 2); assert.equal(cw.basics.length, 1)
})
