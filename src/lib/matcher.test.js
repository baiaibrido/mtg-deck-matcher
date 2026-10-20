import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoreDeck, rankDecks, toOwnedMap } from './matcher.js'
import { parseCollection, parseDeck } from './parser.js'
import { norm } from './normalize.js'
import { collectionCsv } from './export.js'

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
  assert.deepEqual(parseCollection('4 Lightning Bolt (2X2) 117\n2x Counterspell\nBrainstorm x3\n1 lightning bolt\n1 Lightning Bolt (2x2) 117'),
    [{ name: 'Lightning Bolt', qty: 5, set: '2x2', num: '117' }, { name: 'Counterspell', qty: 2 }, { name: 'Brainstorm', qty: 3 }, { name: 'lightning bolt', qty: 1 }])
  // copie prima o dopo il nome, a scelta
  assert.deepEqual(parseCollection('Of One Mind 4\nRancor x2\nArmadillo Cloak 3x\nBrainstorm (4)\nPonder - 2\nx3 Counterspell\nFire // Ice 2\n4 Ninja of the Deep Hours').map(c => [c.name, c.qty]),
    [['Of One Mind', 4], ['Rancor', 2], ['Armadillo Cloak', 3], ['Brainstorm', 4], ['Ponder', 2], ['Counterspell', 3], ['Fire // Ice', 2], ['Ninja of the Deep Hours', 4]])
  assert.deepEqual(parseCollection('Name,Qty,Set\n"Fire // Ice",2,MH2\nOpt,4,XLN\nOpt,1,Ixalan'),
    [{ name: 'Fire // Ice', qty: 2, set: 'mh2' }, { name: 'Opt', qty: 4, set: 'xln' }, { name: 'Opt', qty: 1 }])
})

test('parser decklist: header Sideboard e riga vuota', () => {
  const a = parseDeck('Deck\n4 Opt\n\n2 Island\nSideboard\n3 Duress')
  assert.equal(a.main.length, 2); assert.equal(a.side[0].name, 'Duress')
  const b = parseDeck('4 Opt\n\n3 Duress')
  assert.equal(b.side[0].qty, 3)
})

test('parser: CSV delle app più diffuse', () => {
  const pc = t => parseCollection(t).map(c => [c.name, c.qty])
  assert.deepEqual(pc('Name,Set code,Set name,Collector number,Foil,Rarity,Quantity\nLightning Bolt,2X2,Double Masters 2022,117,normal,uncommon,3'), [['Lightning Bolt', 3]]) // ManaBox
  assert.deepEqual(pc('"Count","Tradelist Count","Name","Edition"\n"2","0","Counterspell","mh2"'), [['Counterspell', 2]]) // Moxfield
  assert.deepEqual(pc('sep=,\nFolder Name,Quantity,Trade Quantity,Card Name,Set Code\nMain,4,0,Opt,XLN'), [['Opt', 4]]) // Dragon Shield
  assert.deepEqual(pc('idArticle;idProduct;English Name;Local Name;Exp.;Amount\n1;2;Brainstorm;Brainstorm;ICE;4'), [['Brainstorm', 4]]) // Cardmarket
  assert.deepEqual(pc('\uFEFFName,Qty\n"Fire // Ice",2'), [['Fire // Ice', 2]]) // backup di questa app (con BOM)
  // stampa: set + numero (ManaBox, Dragon Shield), Scryfall ID (ManaBox)
  assert.deepEqual(parseCollection('Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID\nLightning Bolt,2X2,Double Masters 2022,117,normal,uncommon,3,1,e3285e6b-3e79-4d7c-bf96-d920f973b80d'),
    [{ name: 'Lightning Bolt', qty: 3, set: '2x2', num: '117', sid: 'e3285e6b-3e79-4d7c-bf96-d920f973b80d' }])
  assert.deepEqual(parseCollection('"Count","Tradelist Count","Name","Edition","Condition","Language","Foil","Tags","Last Modified","Collector Number"\n"2","0","Counterspell","mh2","NM","English","","","","267"'),
    [{ name: 'Counterspell', qty: 2, set: 'mh2', num: '267' }])
})

test('terre base: sempre possedute, fuori dalla percentuale, mai in collezione', () => {
  const deck = { main: [{ name: 'Mountain', qty: 18 }, { name: 'Snow-Covered Mountain', qty: 2 }, { name: 'Bolt', qty: 4 }], side: [] }
  const r = scoreDeck(deck, toOwnedMap([{ name: 'Bolt', qty: 4 }]))
  assert.equal(r.main.have, 4); assert.equal(r.main.total, 6) // 18 Mountain fuori dal conteggio
  assert.deepEqual(r.missing.map(m => m.name), ['Snow-Covered Mountain'])
  // solo 4 Armadillo Cloak: Bogles deve superare Madness anche se Madness gioca più terre base
  const owned = toOwnedMap([{ name: 'Armadillo Cloak', qty: 4 }])
  const bogles = scoreDeck({ main: [{ name: 'Armadillo Cloak', qty: 4 }, { name: 'Forest', qty: 12 }, { name: 'Slippery Bogle', qty: 44 }], side: [] }, owned)
  const madness = scoreDeck({ main: [{ name: 'Lightning Bolt', qty: 4 }, { name: 'Mountain', qty: 18 }, { name: 'Fiery Temper', qty: 38 }], side: [] }, owned)
  assert.ok(bogles.main.ratio > madness.main.ratio)
  assert.deepEqual(parseCollection('20 Mountain\n4 Island\n2 Snow-Covered Island\n4 Opt').map(c => c.name), ['Snow-Covered Island', 'Opt'])
})

test('backup con la stampa: si rilegge uguale', async () => {
  const { collectionCsv } = await import('./export.js')
  const list = [{ name: 'Opt', qty: 4, set: 'xln', num: '65' }, { name: 'Opt', qty: 1 }, { name: 'Bolt "x"', qty: 2, sid: 'e3285e6b-3e79-4d7c-bf96-d920f973b80d' }]
  const back = parseCollection(collectionCsv(list))
  assert.deepEqual(back.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), list.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))
})

test('foil: segnata in fondo alla riga, voce separata dalla stessa carta non foil', () => {
  const c = parseCollection('3 Lightning Bolt\n1 Lightning Bolt foil\nCounterspell 2 F\n1 Brainstorm *F*\n4 Foil\nPonder, 1, (foil)')
  const by = n => c.filter(e => e.name === n)
  assert.deepEqual(by('Lightning Bolt').map(e => [e.qty, !!e.foil]), [[3, false], [1, true]])
  assert.equal(by('Counterspell')[0].foil, true)
  assert.equal(by('Brainstorm')[0].foil, true)
  assert.deepEqual(by('Foil').map(e => [e.qty, !!e.foil]), [[4, false]]) // la carta «Foil» esiste
  assert.equal(by('Ponder')[0].foil, true)
  // per i mazzi conta il totale: 4 Lightning Bolt
  assert.equal(toOwnedMap(c).get('lightning bolt'), 4)
})

test('foil da CSV (ManaBox, Dragon Shield, Cardmarket) e backup che la conserva', () => {
  assert.equal(parseCollection('Name,Quantity,Foil\nLightning Bolt,2,foil\nCounterspell,1,normal')[0].foil, true)
  assert.equal(parseCollection('Name,Quantity,Foil\nCounterspell,1,normal')[0].foil, undefined)
  assert.equal(parseCollection('Card Name,Quantity,Printing\nPonder,1,Foil')[0].foil, true)
  assert.equal(parseCollection('Name,Amount,isFoil\nGush,1,1')[0].foil, true)
  const list = [{ name: 'Lightning Bolt', qty: 3 }, { name: 'Lightning Bolt', qty: 1, foil: true }]
  const back = parseCollection(collectionCsv(list))
  assert.deepEqual(back.map(e => [e.qty, !!e.foil]), [[3, false], [1, true]])
})
