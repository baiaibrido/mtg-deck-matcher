import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeDeck } from './deckDesc.js'

const cards = {
  'Goblin Guide': { type: 'Creature — Goblin', cmc: 1 }, 'Lightning Bolt': { type: 'Instant', cmc: 1 }, 'Rift Bolt': { type: 'Sorcery', cmc: 3 },
  'Lava Spike': { type: 'Sorcery', cmc: 1 }, 'Counterspell': { type: 'Instant', cmc: 2 }, 'Mountain': { type: 'Basic Land — Mountain', cmc: 0 }, 'Snap': { type: 'Instant', cmc: 2 },
}
const get = n => cards[n]
const tags = { oracle: new Map([['lightning bolt', new Set(['burn', 'removal'])], ['lava spike', new Set(['burn'])], ['rift bolt', new Set(['burn', 'removal'])], ['counterspell', new Set(['counter'])]]) }

test('curva senza terre, creature e interazione più presente (al massimo 3, almeno 3 copie)', () => {
  const d = { main: [{ name: 'Goblin Guide', qty: 4 }, { name: 'Lightning Bolt', qty: 4 }, { name: 'Lava Spike', qty: 4 }, { name: 'Rift Bolt', qty: 4 }, { name: 'Counterspell', qty: 2 }, { name: 'Mountain', qty: 20 }] }
  const r = describeDeck(d, get, tags)
  assert.equal(r.curve, 1.6); assert.equal(r.creatures, 4)
  assert.deepEqual(r.inter, [['burn', 12], ['removal', 8]])
})
test('senza tag niente interazione; pochi dati → null', () => {
  const d = { main: [{ name: 'Goblin Guide', qty: 4 }, { name: 'Lightning Bolt', qty: 4 }, { name: 'Snap', qty: 4 }] }
  assert.deepEqual(describeDeck(d, get).inter, [])
  assert.equal(describeDeck({ main: [{ name: 'Snap', qty: 2 }] }, get), null)
})
