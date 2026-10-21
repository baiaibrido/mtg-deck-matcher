import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pack, unpack } from './move.js'

test('trasloco: i dati tornano uguali e il link resta corto', async () => {
  const collection = JSON.stringify(Array.from({ length: 3000 }, (_, i) => ({ name: `Carta ${i % 400} è`, set: 'mh3', qty: 1 + (i % 4) })))
  const data = { 'mdm.collection': collection, 'mdm.lang': '"it"' }
  const s = await pack(data)
  assert.match(s, /^z[A-Za-z0-9_-]+$/)
  assert.ok(s.length < collection.length / 4)
  assert.deepEqual(await unpack(s), data)
  await assert.rejects(unpack('xabc'))
})
