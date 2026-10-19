import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHash, parsePath, pathOf } from './useRoute.js'

test('vecchi indirizzi con hash, anche italiani', () => {
  assert.deepEqual(parseHash(''), { page: 'decks', id: null, legacy: false })
  assert.deepEqual(parseHash('#/mazzo/pauper-red-madness'), { page: 'deck', id: 'pauper-red-madness', legacy: true })
  assert.equal(parseHash('#/collezione').page, 'collection')
  assert.deepEqual(parsePath('/', '#/deck/pauper-x'), { page: 'deck', id: 'pauper-x', legacy: false, format: null, fromHash: true })
})
test('indirizzi veri con il formato facoltativo', () => {
  assert.deepEqual(parsePath('/'), { page: 'decks', id: null, format: null, fromHash: false })
  assert.deepEqual(parsePath('/pauper'), { page: 'decks', id: null, format: 'pauper', fromHash: false })
  assert.deepEqual(parsePath('/pauper/deck/pauper-red-madness'), { page: 'deck', id: 'pauper-red-madness', format: 'pauper', fromHash: false })
  assert.deepEqual(parsePath('/deck/mtgtop8-123'), { page: 'deck', id: 'mtgtop8-123', format: null, fromHash: false })
  assert.equal(parsePath('/modern/stats').page, 'stats')
  assert.equal(parsePath('/collection').format, null)
})
test('costruzione degli indirizzi', () => {
  assert.equal(pathOf('decks'), '/')
  assert.equal(pathOf('decks', { format: 'modern' }), '/modern')
  assert.equal(pathOf('deck', { id: 'a b', format: 'pauper' }), '/pauper/deck/a%20b')
  assert.equal(pathOf('collection', { format: 'pauper' }), '/collection')
  for (const p of ['/pauper/deck/x%20y', '/modern/key-cards', '/collection', '/legacy']) {
    const r = parsePath(p); assert.equal(pathOf(r.page, r), p)
  }
})
