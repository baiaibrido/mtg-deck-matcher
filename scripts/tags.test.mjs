import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildIndex } from './tags.mjs'

test('indice dei tag: nomi una volta, tag come indici', () => {
  const r = buildIndex({ oracle: { removal: ['Bolt', 'Snuff Out'], burn: ['Bolt', 'Bolt'] }, art: { dragon: ['Shivan Dragon'] } })
  assert.deepEqual(r.names, ['Bolt', 'Snuff Out', 'Shivan Dragon'])
  assert.deepEqual(r.oracle, { removal: [0, 1], burn: [0] }); assert.deepEqual(r.art, { dragon: [2] })
})
