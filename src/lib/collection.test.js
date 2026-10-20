import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matches, applyFilters, sortRows, facets, tagIndex } from './collection.js'

const r = (name, qty, card) => ({ name, qty, card })
const rows = [
  r('Lightning Bolt', 4, { artist: 'Christopher Rush', set: 'lea', setName: 'Limited Edition Alpha', type: 'Instant', rarity: 'common', released: '1993-08-05', cmc: 1, eur: 500 }),
  r('Brainstorm', 2, { artist: 'Willian Murai', set: 'mh2', setName: 'Modern Horizons 2', type: 'Instant', rarity: 'common', released: '2021-06-18', cmc: 1, eur: 1 }),
  r('Ancestral Recall', 1, { artist: 'Mark Poole', set: 'lea', setName: 'Limited Edition Alpha', type: 'Instant', rarity: 'rare', released: '1993-08-05', cmc: 1, eur: 9000 }),
  r('Snuff Out', 3, { artist: 'Mike Sass', set: 'mh2', setName: 'Modern Horizons 2', type: 'Instant', rarity: 'common', released: '2021-06-18', cmc: 4, eur: 2 }),
]
test('ricerca per nome, artista e set', () => {
  assert.ok(matches(rows[0], 'rush')); assert.ok(matches(rows[0], 'christopher alpha')); assert.ok(!matches(rows[0], 'poole'))
  assert.deepEqual(applyFilters(rows, { q: 'modern horizons' }).map(x => x.name), ['Brainstorm', 'Snuff Out'])
  assert.deepEqual(applyFilters(rows, { artist: 'Mark Poole' }).map(x => x.name), ['Ancestral Recall'])
  assert.deepEqual(applyFilters(rows, { set: 'lea', rarity: 'common' }).map(x => x.name), ['Lightning Bolt'])
})
test('ordinamenti', () => {
  const p = c => c?.eur ?? null
  assert.equal(sortRows(rows, 'rarity', p)[0].name, 'Ancestral Recall')
  assert.equal(sortRows(rows, 'cmc', p).at(-1).name, 'Snuff Out')
  assert.equal(sortRows(rows, 'new', p)[0].name, 'Brainstorm')
  assert.deepEqual(sortRows(rows, 'artist', p).map(x => x.card.artist), ['Christopher Rush', 'Mark Poole', 'Mike Sass', 'Willian Murai'])
  assert.equal(sortRows(rows, 'price', p)[0].name, 'Ancestral Recall')
})
test('menu dei filtri e tag', () => {
  const f = facets(rows)
  assert.deepEqual(f.artists[0], ['Christopher Rush', 4]); assert.equal(f.sets[0].code, 'mh2'); assert.deepEqual(f.rarities.map(x => x[0]), ['common', 'rare'])
  const tags = tagIndex({ names: ['Snuff Out', 'Lightning Bolt'], oracle: { removal: [0, 1], burn: [1] }, art: { fire: [1] } })
  assert.deepEqual(applyFilters(rows, { otag: 'removal' }, tags).map(x => x.name), ['Lightning Bolt', 'Snuff Out'])
  assert.deepEqual(applyFilters(rows, { atag: 'fire' }, tags).map(x => x.name), ['Lightning Bolt'])
  assert.deepEqual(tags.ids.oracle, ['removal', 'burn'])
})

test('filtro bannate: in almeno un formato o in uno preciso', () => {
  const rows = [
    { name: 'Gush', qty: 4, card: { bn: ['modern', 'pauper'], rs: ['vintage'] } },
    { name: 'Ponder', qty: 2, card: { bn: [], rs: ['vintage'] } },
    { name: 'Bolt', qty: 4, card: { bn: [], rs: [] } },
  ]
  assert.deepEqual(applyFilters(rows, { ban: 'any' }).map(r => r.name), ['Gush', 'Ponder'])
  assert.deepEqual(applyFilters(rows, { ban: 'pauper' }).map(r => r.name), ['Gush'])
  assert.deepEqual(facets(rows).bans, [['any', 6], ['modern', 4], ['pauper', 4], ['vintage', 6]])
})
