import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deckBans, newBans } from './bans.js'

const db = { 'Monastery Swiftspear': { name: 'Monastery Swiftspear', bn: ['pauper'] }, 'Lightning Bolt': { name: 'Lightning Bolt', bn: [] }, 'Brainstorm': { name: 'Brainstorm', bn: [] } }
const lookup = n => db[n]

test('carte bannate nel formato del mazzo', () => {
  const deck = { format: 'pauper', main: [{ name: 'Monastery Swiftspear', qty: 4 }, { name: 'Lightning Bolt', qty: 4 }], side: [] }
  assert.deepEqual(deckBans(deck, lookup), ['Monastery Swiftspear'])
  assert.deepEqual(deckBans({ ...deck, format: 'modern' }, lookup), [])
})

test('nuovi ban: prima visita silenziosa, poi solo le novità', () => {
  const coll = [{ name: 'Monastery Swiftspear', qty: 4 }, { name: 'Brainstorm', qty: 4 }]
  const first = newBans(coll, lookup, null)
  assert.deepEqual(first.fresh, [])
  assert.deepEqual(newBans(coll, lookup, first.next).fresh, [])
  db.Brainstorm = { name: 'Brainstorm', bn: ['pauper'] } // ban annunciato
  assert.deepEqual(newBans(coll, lookup, first.next).fresh, [{ name: 'Brainstorm', formats: ['pauper'] }])
})
