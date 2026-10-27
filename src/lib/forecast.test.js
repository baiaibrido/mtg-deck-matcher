import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sky, bulletin, winds, arrivals, colorClimate } from './forecast.js'

// storico di 12 settimane: «then» è la 8ª (4 settimane prima dell'ultima)
const hist = (then, now) => [...Array(7).fill(then), then, then, then, then, now]
const mk = (name, then, now, extra = {}) => ({ id: name, name, share: now, tier: 1, history: hist(then, now), ...extra })

test('meteo: il tempo di un mazzo', () => {
  assert.equal(sky(2, 10), 'sun')
  assert.equal(sky(0.6, 10), 'partly')
  assert.equal(sky(1.2, 0.8), 'sun') // balzo di un mazzo piccolo
  assert.equal(sky(-0.6, 1), 'rain') // calo piccolo di un mazzo piccolo: pioggia, non temporale
  assert.equal(sky(0.2, 5), 'cloud')
  assert.equal(sky(-0.7, 10), 'rain')
  assert.equal(sky(-2, 10), 'storm')
  assert.equal(sky(null, 5), 'cloud')
})

test('meteo: bollettino dei Tier 1 e 2, dal più giocato', () => {
  const b = bulletin([mk('A', 5, 8), mk('B', 9, 9), mk('C', 3, 2, { tier: 3 }), mk('R', 1, 5, { rogue: true })])
  assert.deepEqual(b.map(x => x.d.name), ['B', 'A'])
  assert.equal(b[1].delta, 3); assert.equal(b[1].sky, 'sun'); assert.equal(b[1].then, 5)
})

test('meteo: venti (sale e vince, sale ma perde, scende ma vince)', () => {
  const w = winds([mk('Su', 4, 7, { metaWr: 54 }), mk('Moda', 2, 4, { metaWr: 46 }), mk('Occasione', 8, 6, { metaWr: 53 }), mk('Fermo', 5, 5, { metaWr: 60 })])
  assert.deepEqual(w.upWin.map(x => x.d.name), ['Su'])
  assert.deepEqual(w.upLose.map(x => x.d.name), ['Moda'])
  assert.deepEqual(w.downWin.map(x => x.d.name), ['Occasione'])
  assert.equal(winds([mk('Fermo', 5, 5, { metaWr: 60 })]), null)
})

test('meteo: nuovi arrivi e uscite dalla classifica', () => {
  const decks = Array.from({ length: 30 }, (_, i) => mk(`D${i}`, 30 - i, 30 - i))
  decks.push(mk('Nuovo', 0, 25.5), mk('Sparito', 29.5, 0.5))
  const a = arrivals(decks)
  assert.deepEqual(a.inn.map(x => x.d.name), ['Nuovo'])
  assert.deepEqual(a.out.map(x => x.d.name), ['Sparito'])
})

test('meteo: clima dei colori sui colori principali', () => {
  const decks = [mk('Rosso', 10, 20), mk('Izzet', 10, 10), mk('Verde', 20, 5)]
  const cols = { Rosso: Object.assign(['R', 'U', 'B'], { main: ['R'], splash: ['U', 'B'] }), Izzet: ['U', 'R'], Verde: ['G'] }
  const c = colorClimate(decks, d => cols[d.name])
  const R = c.find(x => x.c === 'R'), U = c.find(x => x.c === 'U'), G = c.find(x => x.c === 'G')
  assert.equal(R.now, 30); assert.equal(R.delta, 10) // lo splash blu di Rosso non conta
  assert.equal(U.now, 10); assert.equal(G.delta, -15)
  assert.equal(c[0].c, 'R')
  assert.equal(colorClimate(decks, () => null), null) // colori non ancora caricati
})
