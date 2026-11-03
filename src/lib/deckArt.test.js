import { test } from 'node:test'
import assert from 'node:assert/strict'
import { namesakeOf, artCardOf } from './deckArt.js'

const mk = (name, main, core) => ({ name, main: main.map(([qty, n]) => ({ qty, name: n })), core })

test('la carta che dà il nome al mazzo', () => {
  assert.equal(namesakeOf(mk('Mono Red Kiln Fiend', [[4, 'Lightning Bolt'], [4, 'Kiln Fiend']])), 'Kiln Fiend')
  assert.equal(namesakeOf(mk('Dimir Terror', [[4, 'Counterspell'], [4, 'Tolarian Terror']])), 'Tolarian Terror')
  assert.equal(namesakeOf(mk('Aura Bogles', [[4, 'Rancor'], [4, 'Slippery Bogle']])), 'Slippery Bogle')
  assert.equal(namesakeOf(mk('Elves', [[4, 'Llanowar Elves'], [4, 'Quirion Ranger']])), 'Llanowar Elves')
  assert.equal(namesakeOf(mk('Red Madness', [[4, 'Fiery Temper']])), null) // colori e «madness» non sono carte qui
  assert.equal(namesakeOf(mk('Grixis Affinity', [[4, 'Thoughtcast']])), null)
})

test('senza carta nel nome: dal cuore della lista, prima le creature, poi la più rara nel formato', () => {
  const d = mk('Red Madness', [[4, 'Lightning Bolt'], [4, 'Kessig Flamebreather']], [['Mountain', 19], ['Lightning Bolt', 4], ['Kessig Flamebreather', 4], ['Fiery Temper', 4]])
  const freq = { 'Lightning Bolt': 12, 'Kessig Flamebreather': 2, 'Fiery Temper': 3 }
  assert.equal(artCardOf(d, n => freq[n] || 0, { isCreature: n => n === 'Kessig Flamebreather' }), 'Kessig Flamebreather')
  assert.equal(artCardOf(d, n => freq[n] || 0), 'Kessig Flamebreather') // senza tipi: la meno diffusa
  assert.equal(artCardOf(mk('Mono Red Kiln Fiend', [[4, 'Kiln Fiend']], []), () => 0), 'Kiln Fiend')
})
