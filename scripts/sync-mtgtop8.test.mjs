import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMetaId, parseArchetypes, parseFirstDeck, parseCommanders } from './sync-mtgtop8.mjs'
import { parseDeck } from '../src/lib/parser.js'

const fmt = `<a href=format?f=PAU&meta=299&a=>Last 2 Weeks</a><a href="format?f=PAU&amp;meta=145&amp;a=">Last 2 Months</a>
<div class=hover_tr><div style="float:left"><a href=archetype?a=536&meta=145&f=PAU>Burn</a></div><div class=S10>11 %</div></div>
<div class=hover_tr><div><a href=archetype?a=512&meta=145&f=PAU>Affinity</a></div><div class=S10>12 %</div></div>
<div class=hover_tr><div><a href=archetype?a=999&meta=145&f=PAU>Other - Aggro</a></div><div>3 %</div></div>
<div class=hover_tr><div><a href=archetype?a=620&meta=145&f=PAU>Elves</a></div><div>5%</div></div>`

test('meta id "Last 2 Months"', () => assert.equal(parseMetaId(fmt), '145'))
test('archetipi ordinati per % e senza "Other"', () => {
  const a = parseArchetypes(fmt)
  assert.deepEqual(a.map(x => [x.name, x.share]), [['Affinity', 12], ['Burn', 11], ['Elves', 5]])
})
test('primo mazzo dell\'archetipo', () => {
  const h = `<td><a href=event?e=91941&d=898185&f=PAU>Grixis Affinity</a></td><a href=event?e=1&d=2&f=PAU>x</a>`
  assert.deepEqual(parseFirstDeck(h), { event: '91941', deck: '898185', title: 'Grixis Affinity' })
})
test('export MTGO con "Sideboard"', () => {
  const d = parseDeck('4 Baleful Strix\n4 Reckoner\'s Bargain\nSideboard\n4 Hydroblast\n')
  assert.equal(d.main.length, 2); assert.equal(d.side[0].name, 'Hydroblast')
})

test('link mazzo: varianti di formato', () => {
  for (const h of [
    `<a href="https://www.mtgtop8.com/event?e=5&amp;d=6&amp;f=PAU">Burn</a>`,
    `<td class=S12><a href=?e=5&d=6&f=PAU><b>Burn</b></a></td>`,
    `<a href='event?d=6&e=5&f=PAU' class=x>Burn</a>`,
  ]) assert.deepEqual(parseFirstDeck(h), { event: '5', deck: '6', title: 'Burn' })
})

test('meta id con tag annidati (HTML reale cEDH)', () => {
  const h = `<a href="?f=cEDH&meta=327&a="><div style="padding:3px;background:#ffdd33;" class="S14">Last 2 Weeks</div></a><a href="?f=cEDH&meta=300&a="><div style="padding:3px;" class="S14 hover_tr">Last 6 Months</div></a><a href="?f=cEDH&meta=263&a="><div style="padding:3px;" class="S14 hover_tr">Last 2 Months</div></a>`
  assert.equal(parseMetaId(h), '263')
})
test('% ignora attributi style (width:48%)', () => {
  const h = `<div style="width:48%"><a href=archetype?a=1&meta=145&f=PAU>Burn</a></div><div style="width:48%">11 %</div>
  <div style="width:48%"><a href=archetype?a=2&meta=145&f=PAU>Affinity</a></div><div style="width:48%">12 %</div>`
  assert.deepEqual(parseArchetypes(h).map(a => [a.name, a.share]), [['Affinity', 12], ['Burn', 11]])
})
test('comandanti cEDH', () => {
  const h = `<div onclick="AddCom('77','1','Kinnan, Bonder Prodigy');">Kinnan, Bonder Prodigy</div><div>4.5 %</div>
  <div onclick="AddCom('88','1','Tymna the Weaver');">Tymna</div><div>6 %</div>`
  assert.deepEqual(parseCommanders(h).map(c => [c.gid, c.share]), [['88', 6], ['77', 4.5]])
})
