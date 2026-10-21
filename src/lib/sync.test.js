import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fingerprint, mergeMax, firstSync, cardCount } from './sync.js'

const A = [{ name: 'Lightning Bolt', qty: 4 }, { name: 'Counterspell', qty: 2 }]
const B = [{ name: 'Lightning Bolt', qty: 2 }, { name: 'Counterspell', qty: 3 }, { name: 'Snap', qty: 1, foil: true }]

test('impronta stabile e diversa se cambia qualcosa', () => {
  assert.equal(fingerprint(A), fingerprint(A.map(x => ({ ...x }))))
  assert.notEqual(fingerprint(A), fingerprint(B))
  assert.notEqual(fingerprint(A), fingerprint([{ ...A[0], qty: 3 }, A[1]]))
})

test('unione: il numero di copie più alto, senza raddoppiare', () => {
  const m = mergeMax(A, B)
  assert.equal(m.find(c => c.name === 'Lightning Bolt').qty, 4)
  assert.equal(m.find(c => c.name === 'Counterspell').qty, 3)
  assert.equal(m.length, 3)
  assert.deepEqual(mergeMax(A, A), A)
  // la foil è una voce a parte
  assert.equal(mergeMax([{ name: 'Snap', qty: 2 }], [{ name: 'Snap', qty: 1, foil: true }]).length, 2)
})

test('primo contatto con il profilo', () => {
  assert.equal(firstSync(A, null, 'u'), 'upload')
  assert.equal(firstSync([], null, 'u'), 'same')
  assert.equal(firstSync([], B, 'u'), 'download')
  assert.equal(firstSync(A, [], 'u'), 'upload')
  assert.equal(firstSync(A, A.map(x => ({ ...x })), 'u'), 'same')
  assert.equal(firstSync(A, B, 'u'), 'ask') // mai sincronizzato qui
  assert.equal(firstSync(A, B, 'u', { uid: 'u', fp: fingerprint(A) }), 'download') // cambiato solo il profilo
  assert.equal(firstSync(B, A, 'u', { uid: 'u', fp: fingerprint(A) }), 'upload') // cambiato solo il dispositivo
  assert.equal(firstSync(A, B, 'u', { uid: 'altro', fp: fingerprint(A) }), 'ask')
  assert.equal(cardCount(B), 6)
})
