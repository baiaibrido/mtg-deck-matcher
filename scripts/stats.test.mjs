import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coreFlex, weeklyPresence, cardTrends, sideMeta, conversion, mergePrices } from './stats.mjs'

const L = (main, extra = {}) => ({ d: { Mainboard: main.map(([Count, CardName]) => ({ Count, CardName })), Sideboard: (extra.side || []).map(([Count, CardName]) => ({ Count, CardName })) }, date: extra.date || '2026-10-10', rank: extra.rank ?? 99, name: extra.name, t: { Name: extra.t || 'Pauper Challenge' } })

test('cuore e posti liberi', () => {
  const list = [1, 2, 3, 4, 5].map(i => L([[4, 'Core'], ...(i <= 3 ? [[i === 1 ? 2 : 1, 'Flex']] : []), ...(i === 1 ? [[1, 'Rare']] : [])]))
  const r = coreFlex(list)
  assert.deepEqual(r.core, [['Core', 4]])
  assert.deepEqual(r.flex, [['Flex', 60, 1.3]])
  assert.equal(coreFlex(list.slice(0, 3)), null)
})
test('carte in ascesa e side del meta', () => {
  const E = []
  for (let w = 0; w < 8; w++) for (let i = 0; i < 30; i++) {
    const date = new Date(Date.parse('2026-10-14') - (7 - w) * 7 * 864e5).toISOString().slice(0, 10)
    E.push(L([[4, 'Base'], ...(w >= 6 && i < 15 ? [[4, 'Nuova']] : []), ...(w < 6 && i < 15 ? [[4, 'Vecchia']] : [])], { date, side: [[2, 'Hydroblast']] }))
  }
  const t = cardTrends(weeklyPresence(E, 'Mainboard', 8))
  assert.equal(t.up[0][0], 'Nuova'); assert.equal(t.down[0][0], 'Vecchia')
  assert.equal(sideMeta(weeklyPresence(E, 'Sideboard', 8))[0][0], 'Hydroblast')
})
test('conversione in top 8', () => {
  const E = []
  for (let i = 0; i < 120; i++) E.push(L([], { name: i % 4 ? 'B' : 'A', rank: i % 4 ? 20 : (i < 160 ? 3 : 20) }))
  for (let i = 0; i < 40; i++) E.push(L([], { name: 'B', rank: 5 }))
  const c = conversion(E, ['A', 'B'])
  assert.ok(c.get('A')[1] > 0 && c.get('B')[0] > c.get('A')[0])
})
test('storico prezzi: un valore al giorno, finestra mobile', () => {
  let h = mergePrices(null, '2026-10-14', { X: 1 })
  h = mergePrices(h, '2026-10-15', { X: 1.5, Y: 2 })
  assert.deepEqual(h, { dates: ['2026-10-14', '2026-10-15'], p: { X: [1, 1.5], Y: [null, 2] } })
  h = mergePrices(h, '2026-10-15', { X: 1.6, Y: 2 }) // stesso giorno: sostituisce
  assert.deepEqual(h.p.X, [1, 1.6])
  h = mergePrices(h, '2026-10-16', { X: 2 }, 2)
  assert.deepEqual(h, { dates: ['2026-10-15', '2026-10-16'], p: { X: [1.6, 2] } })
})
