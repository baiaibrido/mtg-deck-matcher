import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeCollection, decodeCollection } from './transfer.js'

test('andata e ritorno, stampe comprese, codice adatto a un link', async () => {
  const list = [{ name: 'Lightning Bolt', qty: 4, set: 'lea', num: '161' }, { name: 'Counterspell', qty: 3 }, { name: 'Jötun Grunt', qty: 1, sid: 'abc-123' }]
  const code = await encodeCollection(list)
  assert.match(code, /^[A-Za-z0-9_-]+$/)
  assert.deepEqual(await decodeCollection(code), list)
})
test('una collezione grande resta compatta', async () => {
  const list = Array.from({ length: 1500 }, (_, i) => ({ name: `Card Name Number ${i}`, qty: (i % 4) + 1 }))
  const code = await encodeCollection(list)
  assert.ok(code.length < 20000, `lunghezza ${code.length}`)
  assert.equal((await decodeCollection(code)).length, 1500)
})
