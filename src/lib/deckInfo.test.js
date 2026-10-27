import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deckColors, nameColors, frameOf } from './deckInfo.js'

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

test('colori: il nome del mazzo comanda (gilde, frammenti, sigle, «Mono»)', () => {
  const look2 = n => ({ Bolt: { ci: ['R'], type: 'Instant' }, Path: { ci: ['W'], type: 'Instant' }, Elf: { ci: ['G'], type: 'Creature' }, Snack: { ci: ['U', 'B'], type: 'Creature' } })[n]
  const d = (name, main) => ({ name, main: main.map(([qty, n]) => ({ qty, name: n })) })
  // Selesnya: bianco e verde principali anche se il bianco è poco
  const s = deckColors(d('Selesnya Landfall', [[30, 'Elf'], [4, 'Path']]), look2)
  assert.deepEqual([...s], ['W', 'G']); assert.equal(s.splash, undefined)
  // senza nome di gilda lo stesso mazzo è verde con splash bianco
  assert.deepEqual(deckColors(d('Landfall', [[30, 'Elf'], [4, 'Path']]), look2).splash, ['W'])
  // Mono: solo il colore del nome è principale
  assert.deepEqual(deckColors(d('Mono Red Burn', [[20, 'Bolt'], [8, 'Path']]), look2).splash, ['W'])
  // tre colori con uno splash fuori dal nome
  const j = deckColors(d('Boros Midrange', [[20, 'Bolt'], [12, 'Path'], [4, 'Snack']]), look2)
  assert.deepEqual(j.main, ['W', 'R']); assert.deepEqual(j.splash, ['U', 'B'])
})
test('colori: nomi riconosciuti', () => {
  assert.deepEqual(nameColors('Dimir Control'), ['U', 'B'])
  assert.deepEqual(nameColors('Jeskai Ephemerate'), ['W', 'U', 'R'])
  assert.deepEqual(nameColors('UB Lurrus Control'), ['U', 'B'])
  assert.deepEqual(nameColors('WURG Scam'), ['W', 'U', 'R', 'G'])
  assert.deepEqual(nameColors('Domain Zoo'), ['W', 'U', 'B', 'R', 'G'])
  assert.deepEqual(nameColors('Red Madness'), ['R'])
  assert.deepEqual(nameColors('Tron'), [])
  assert.deepEqual(nameColors('TES'), [])
})
test('cornice: conta solo i colori principali', () => {
  const c = Object.assign(['R', 'U', 'B'], { main: ['R'], splash: ['U', 'B'] })
  assert.equal(frameOf(c).kind, 'mono')
})
