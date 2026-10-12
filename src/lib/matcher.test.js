import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreDeck, rankDecks, toOwnedMap } from './matcher.js'
import { parseCollection, parseDeck } from './parser.js'
import { norm } from './normalize.js'

const fill = (prefix, n) => Array.from({ length: n / 4 }, (_, i) => ({ name: `${prefix}${i}`, qty: 4 }))
const deck = (id) => ({ id, name: id, main: fill('M', 60), side: [...fill('S', 12), { name: 'S9', qty: 3 }] })

test('100% main + 0% side batte 75% main + 100% side', () => {
  const d = deck('a')
  const a = scoreDeck(d, toOwnedMap(d.main))
  const b = scoreDeck(d, toOwnedMap([...d.main.slice(0, 11), { name: 'M11', qty: 1 }, ...d.side]))
  assert.equal(a.main.ratio, 1); assert.equal(a.side.ratio, 0)
  assert.equal(b.main.ratio, 0.75); assert.equal(b.side.ratio, 1)
  assert.ok(a.score > b.score)
})

test('copie condivise main/side non contate due volte', () => {
  const d = { main: [{ name: 'Bolt', qty: 4 }], side: [{ name: 'Bolt', qty: 2 }] }
  const r = scoreDeck(d, toOwnedMap([{ name: 'Lightning', qty: 0 }, { name: 'bolt', qty: 5 }]))
  assert.equal(r.main.have, 4); assert.equal(r.side.have, 1)
})

test('rank restituisce top 5 ordinati', () => {
  const decks = ['a', 'b', 'c', 'd', 'e', 'f'].map(deck)
  const r = rankDecks(decks, [], 5)
  assert.equal(r.length, 5)
})

test('norm: accenti, DFC, maiuscole', () => {
  assert.equal(norm('Lim-Dûl the Necromancer'), 'lim-dul the necromancer')
  assert.equal(norm('Delver of Secrets // Insectile Aberration'), 'delver of secrets')
})

test('parser collezione: testo e CSV', () => {
  assert.deepEqual(parseCollection('4 Lightning Bolt (2X2) 117\n2x Counterspell\nBrainstorm x3\n1 lightning bolt'),
    [{ name: 'Lightning Bolt', qty: 5 }, { name: 'Counterspell', qty: 2 }, { name: 'Brainstorm', qty: 3 }])
  assert.deepEqual(parseCollection('Name,Qty,Set\n"Fire // Ice",2,MH2\nOpt,4,XLN'),
    [{ name: 'Fire // Ice', qty: 2 }, { name: 'Opt', qty: 4 }])
})

test('parser decklist: header Sideboard e riga vuota', () => {
  const a = parseDeck('Deck\n4 Opt\n\n2 Island\nSideboard\n3 Duress')
  assert.equal(a.main.length, 2); assert.equal(a.side[0].name, 'Duress')
  const b = parseDeck('4 Opt\n\n3 Duress')
  assert.equal(b.side[0].qty, 3)
})
