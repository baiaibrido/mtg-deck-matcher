import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHash } from './useRoute.js'

test('rotte in inglese, vecchi indirizzi italiani convertiti', () => {
  assert.deepEqual(parseHash(''), { page: 'decks', id: null, legacy: false })
  assert.deepEqual(parseHash('#/deck/pauper-red-madness'), { page: 'deck', id: 'pauper-red-madness', legacy: false })
  assert.deepEqual(parseHash('#/mazzo/pauper-red-madness'), { page: 'deck', id: 'pauper-red-madness', legacy: true })
  assert.equal(parseHash('#/collezione').page, 'collection')
  assert.equal(parseHash('#/carte').page, 'key-cards')
  assert.equal(parseHash('#/mazzi').page, 'decks')
})
