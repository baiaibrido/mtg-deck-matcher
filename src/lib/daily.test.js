import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickDaily, dailyPool, signatureOf, untilMidnight } from './daily.js'

const mk = (name, share, main, extra = {}) => ({ id: name, name, share, main: main.map(([qty, n]) => ({ qty, name: n })), ...extra })
const decks = [
  mk('Big', 10, [[4, 'Bolt'], [4, 'Common']]), mk('Mid', 5, [[4, 'Common']]),
  mk('Small', 1, [[4, 'Common'], [2, 'Weird Thing'], [4, 'Forest']]), mk('Tiny', 0.5, [[3, 'Common']]),
  mk('Rogue', 0, [[2, 'Odd']], { rogue: true, signature: 'Odd' }),
]

test('pool: metà bassa del meta + rogue', () => {
  assert.deepEqual(dailyPool(decks).map(d => d.name), ['Small', 'Tiny', 'Rogue'])
})
test('stesso giorno e formato → stesso mazzo; giorni diversi variano', () => {
  assert.equal(pickDaily(decks, 'pauper', '2026-10-15').name, pickDaily(decks, 'pauper', '2026-10-15').name)
  const seen = new Set(Array.from({ length: 30 }, (_, i) => pickDaily(decks, 'pauper', `2026-10-${i + 1}`).name))
  assert.ok(seen.size > 1)
})
test('carta caratteristica: la meno diffusa, niente terre base', () => {
  assert.equal(signatureOf(decks[2], decks), 'Weird Thing')
  assert.equal(signatureOf(decks[4], decks), 'Odd')
})
test('conto alla rovescia fino a mezzanotte', () => {
  assert.deepEqual(untilMidnight(new Date(2026, 9, 15, 22, 30)), { h: 1, m: 30 })
})
