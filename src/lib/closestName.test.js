import { test } from 'node:test'
import assert from 'node:assert/strict'
import { editDistance, closestName } from './closestName.js'

const names = ['Of One Mind', 'One with Nothing', 'Armadillo Cloak', 'Counterspell', 'Lightning Bolt', 'Fire // Ice', 'Opt', 'Ox of Agonas', 'Oust', 'Bolt Bend']

test('distanza di modifica', () => {
  assert.equal(editDistance('of ine mind', 'of one mind'), 1)
  assert.equal(editDistance('cloack', 'cloak'), 1)
  assert.equal(editDistance('ab', 'ba'), 1) // lettere scambiate
  assert.equal(editDistance('counterspell', 'lightning bolt', 2), 3) // si ferma oltre il massimo
})

test('trova il nome giusto anche quando Scryfall non ci riesce', () => {
  assert.equal(closestName('of ine mind', names).name, 'Of One Mind')
  assert.equal(closestName('Armadillo Cloack', names).name, 'Armadillo Cloak')
  assert.equal(closestName('Conterspel', names).name, 'Counterspell')
  assert.equal(closestName('lightnig bolt', names).name, 'Lightning Bolt')
  assert.equal(closestName('fire', names).name, 'Fire // Ice')
})

test('nomi troppo diversi o ambigui non vengono indovinati', () => {
  assert.equal(closestName('Boh Qualcosa', names).name, null)
  const r = closestName('Ost', names) // Opt e Oust a pari distanza
  assert.equal(r.name, null)
  assert.deepEqual(r.suggestions.sort(), ['Opt', 'Oust'])
})
