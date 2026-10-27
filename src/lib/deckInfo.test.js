import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deckColors } from './deckInfo.js'

const cards = {
  'Lightning Bolt': { ci: ['R'], type: 'Instant' }, Fireblast: { ci: ['R'], type: 'Instant' }, Guttersnipe: { ci: ['R'], type: 'Creature' },
  'Sneaky Snacker': { ci: ['U', 'B'], type: 'Creature' }, Counterspell: { ci: ['U'], type: 'Instant' }, Mountain: { ci: [], type: 'Basic Land' },
}
const deck = main => ({ main: main.map(([qty, name]) => ({ qty, name })) })
const look = n => cards[n]

test('colori: quasi monocolore → principale per primo, gli altri come splash', () => {
  const c = deckColors(deck([[12, 'Lightning Bolt'], [12, 'Fireblast'], [8, 'Guttersnipe'], [4, 'Sneaky Snacker'], [20, 'Mountain']]), look)
  assert.deepEqual([...c], ['R', 'U', 'B'])
  assert.deepEqual(c.splash, ['U', 'B'])
})
test('colori: due colori veri restano nell\'ordine ufficiale, senza splash', () => {
  const c = deckColors(deck([[4, 'Lightning Bolt'], [4, 'Counterspell'], [4, 'Guttersnipe']]), look)
  assert.deepEqual([...c], ['U', 'R'])
  assert.equal(c.splash, undefined)
  assert.deepEqual(deckColors(deck([[4, 'Lightning Bolt']]), look), ['R'])
})
