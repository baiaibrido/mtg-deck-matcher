import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { indexCards, cardsByFormat, downloadOracle } from './cards-data.mjs'

const oracle = [
  { name: 'Lightning Bolt', layout: 'normal', type_line: 'Instant', mana_cost: '{R}', color_identity: ['R'], image_uris: { normal: 'https://cards.scryfall.io/normal/front/a/b/abc.jpg?1' }, prices: { eur: '0.30', usd: '0.45' }, legalities: { pauper: 'legal', modern: 'legal', standard: 'not_legal' } },
  { name: 'Delver of Secrets // Insectile Aberration', layout: 'transform', color_identity: ['U'], card_faces: [{ type_line: 'Creature — Human Wizard', mana_cost: '{U}', image_uris: { normal: 'https://cards.scryfall.io/normal/front/d/e/delver.jpg' } }, { type_line: 'Creature' }], prices: { eur: null, eur_foil: '1.5', usd: '0.2' }, legalities: {} },
  { name: 'Monastery Swiftspear', layout: 'normal', type_line: 'Creature', mana_cost: '{R}', color_identity: ['R'], prices: {}, legalities: { pauper: 'banned' } },
  { name: 'Goblin', layout: 'token', type_line: 'Token Creature', prices: {} },
]

test('carte dei mazzi dal file Oracle Cards, nel formato della cache dell\'app', () => {
  const idx = indexCards(oracle)
  assert.equal(idx.has('goblin'), false) // pedine escluse
  const out = cardsByFormat(idx, { pauper: { decks: [{ main: ['4 Lightning Bolt', '4 Delver of Secrets', '4 Monastery Swiftspear'], side: ['2 Carta Inesistente'] }], rogue: [] } }, Date.parse('2026-10-15'))
  const p = out.pauper
  assert.equal(p.missing, 1)
  assert.deepEqual(Object.keys(p.cards).sort(), ['delver of secrets', 'lightning bolt', 'monastery swiftspear'])
  assert.deepEqual(p.cards['lightning bolt'], { name: 'Lightning Bolt', i: 'front/a/b/abc.jpg', ci: ['R'], type: 'Instant', cost: '{R}', eur: 0.3, usd: 0.45, bn: [], rs: [] })
  assert.equal(p.updated, '2026-10-15')
  assert.equal(p.cards['delver of secrets'].name, 'Delver of Secrets')
  assert.equal(p.cards['delver of secrets'].eur, 1.5) // niente prezzo normale: si usa il foil
  assert.deepEqual(p.cards['monastery swiftspear'].bn, ['pauper'])
})

test('scaricamento: indirizzo dal catalogo bulk, intestazioni richieste da Scryfall', async () => {
  const seen = []
  const fake = async (url, opt) => { seen.push([url, opt.headers]); return url.includes('bulk-data') ? { ok: true, status: 200, text: async () => JSON.stringify({ data: [{ type: 'default_cards', download_uri: 'x' }, { type: 'oracle_cards', download_uri: 'https://data.scryfall.io/oracle.json' }] }) } : { ok: true, arrayBuffer: async () => gzipSync(JSON.stringify(oracle)) } }
  assert.equal((await downloadOracle(fake)).length, 4)
  assert.equal(seen[1][0], 'https://data.scryfall.io/oracle.json')
  assert.ok(seen.every(([, h]) => h['User-Agent'] && h.Accept))
})

test('file Scryfall: array JSON o una carta per riga', async () => {
  const { parseCards } = await import('./cards-data.mjs')
  assert.equal(parseCards(JSON.stringify(oracle)).length, 4)
  assert.equal(parseCards(oracle.map(c => JSON.stringify(c)).join('\n') + '\n').length, 4)
  assert.equal(parseCards('[\n' + oracle.map(c => JSON.stringify(c)).join(',\n') + '\n]').length, 4)
})
