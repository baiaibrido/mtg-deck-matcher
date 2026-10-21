import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bumpStreak, liveStreak, guessDeck, revealOrder, shareGrid, weather, almostThere, personality, quizMatch, unlockedNow } from './fun.js'

const mk = (name, share, main, extra = {}) => ({ id: name, name, share, main: main.map(([qty, n]) => ({ qty, name: n })), ...extra })
const decks = [
  mk('Burn', 10, [[4, 'Lightning Bolt'], [4, 'Fireblast'], [4, 'Common'], [20, 'Mountain']], { prev: 7 }),
  mk('Faeries', 6, [[4, 'Spellstutter Sprite'], [4, 'Counterspell'], [4, 'Common']], { prev: 8 }),
  mk('Elves', 3, [[4, 'Llanowar Elves'], [4, 'Common']], { prev: 3 }),
]

test('serie: +1 se ieri, riparte se salti un giorno', () => {
  assert.deepEqual(bumpStreak({ day: '2026-10-14', n: 3 }, '2026-10-15'), { day: '2026-10-15', n: 4 })
  assert.deepEqual(bumpStreak({ day: '2026-10-12', n: 3 }, '2026-10-15'), { day: '2026-10-15', n: 1 })
  assert.deepEqual(bumpStreak({ day: '2026-10-15', n: 4 }, '2026-10-15'), { day: '2026-10-15', n: 4 })
  assert.deepEqual(bumpStreak({ day: '2026-9-30', n: 2 }, '2026-10-1'), { day: '2026-10-1', n: 3 })
  assert.equal(liveStreak({ day: '2026-10-12', n: 9 }, '2026-10-15'), 0)
})
test('indovina: stesso mazzo tutto il giorno, carte dalla più comune alla più caratteristica', () => {
  assert.equal(guessDeck(decks, 'pauper', '2026-10-15').name, guessDeck(decks, 'pauper', '2026-10-15').name)
  const order = revealOrder(decks[0], decks)
  assert.equal(order[0], 'Common'); assert.ok(!order.includes('Mountain')); assert.equal(order.length, 3)
  assert.equal(shareGrid(['A', 'B', 'X'], 'X'), '🟥🟥🟩⬛⬛⬛')
})
test('meteo: chi sale e chi scende (storico settimanale se c\'è)', () => {
  assert.equal(weather([mk('A', 5, [], { history: [1, 1, 2, 3, 4, 6] }), mk('B', 3, [], { history: [5, 5, 4, 4, 3, 3] })]).up.delta, 5)
  const w = weather(decks)
  assert.equal(w.up.d.name, 'Burn'); assert.equal(w.up.delta, 3); assert.equal(w.down.d.name, 'Faeries'); assert.equal(w.top.name, 'Burn')
})
test('ci sei quasi: meno carte mancanti, escluse quelle chiuse', () => {
  const r = [{ deck: { id: 'a', share: 1 }, missing: [{ missing: 3 }] }, { deck: { id: 'b', share: 5 }, missing: [{ missing: 2 }] }, { deck: { id: 'c' }, missing: [] }]
  assert.equal(almostThere(r).s.deck.id, 'b'); assert.equal(almostThere(r, 5, ['b']).s.deck.id, 'a')
})
test('personalità della collezione: mono o gilda', () => {
  const cards = { R: { ci: ['R'] }, U: { ci: ['U'] }, G: { ci: ['G'] } }
  assert.deepEqual(personality([{ name: 'R', qty: 30 }, { name: 'U', qty: 5 }], n => cards[n]), { kind: 'mono', color: 'R', pct: 86 })
  assert.equal(personality([{ name: 'R', qty: 15 }, { name: 'U', qty: 14 }], n => cards[n]).guild, 'Izzet')
  assert.equal(personality([{ name: 'R', qty: 3 }], n => cards[n]), null)
})
test('quiz: risposte veloci+creature+verde → Elves', () => {
  const data = { 'Lightning Bolt': { type: 'Instant', cost: '{R}' }, Fireblast: { type: 'Instant', cost: '{4}{R}{R}' }, Common: { type: 'Artifact', cost: '{2}' },
    'Spellstutter Sprite': { type: 'Creature', cost: '{1}{U}' }, Counterspell: { type: 'Instant', cost: '{U}{U}' }, 'Llanowar Elves': { type: 'Creature', cost: '{G}' }, Mountain: { type: 'Basic Land' } }
  const cols = { Burn: ['R'], Faeries: ['U'], Elves: ['G'] }
  const m = quizMatch(decks, { speed: 'fast', style: 'crea', color: 'G', budget: 0, pop: 'any' }, n => data[n], d => cols[d.name])
  assert.equal(m.d.name, 'Elves')
})
test('traguardi', () => {
  assert.deepEqual(unlockedNow({ cards: 120, value: 0, maxColor: 10, minColor: 0, pins: 0, fun: { completeMax: 3 } }), ['first', 'c100', 'complete', 'three'])
})
