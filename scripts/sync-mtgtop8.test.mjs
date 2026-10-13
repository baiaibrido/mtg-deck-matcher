import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMetaId, parseArchetypes, parseFirstDeck, parseDeckLinks, parseRobots, robotsAllows, assignTiers, previousShares, titleKey, groupVariants } from './sync-mtgtop8.mjs'
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
test('cEDH: archetipi con per mille (HTML reale)', () => {
  const h = `<div class=hover_tr><div align=center style="width:60%;" class=S14><a href=archetype?a=1158&meta=263&f=cEDH&color_id=&show=pop>Partner WUBR</a></div>
  <div style="width:20%;" class=S14 align=center>98.8 <span class=O14>&permil;</span></div></div>
  <div class=hover_tr><div align=center style="width:60%;" class=S14><a href=archetype?a=1246&meta=263&f=cEDH&color_id=&show=pop>Kinnan, Bonder Prodigy</a></div>
  <div style="width:20%;" class=S14 align=center>70.2 <span class=O14>&permil;</span></div></div>`
  assert.deepEqual(parseArchetypes(h).map(a => [a.id, a.meta, a.name, a.share]),
    [['1158', '263', 'Partner WUBR', 9.9], ['1246', '263', 'Kinnan, Bonder Prodigy', 7]])
})

test('più link mazzo, senza duplicati', () => {
  const h = `<a href=event?e=1&d=10&f=PAU>A</a><a href=event?e=1&d=10&f=PAU>A bis</a><a href=event?e=2&d=20&f=PAU>B</a><a href=event?e=3&d=30&f=PAU>C</a><a href=event?e=4&d=40&f=PAU>D</a>`
  assert.deepEqual(parseDeckLinks(h).map(x => x.deck), ['10', '20', '30'])
})

test('robots.txt: gruppo specifico, *, wildcard e Allow più lungo', () => {
  const txt = `User-agent: *\nDisallow: /search\nDisallow: /*.php$\nAllow: /search/ok\n\nUser-agent: BadBot\nDisallow: /`
  const r = parseRobots(txt)
  assert.equal(robotsAllows(r, '/format?f=PAU'), true)
  assert.equal(robotsAllows(r, '/search?q=x'), false)
  assert.equal(robotsAllows(r, '/search/ok'), true)
  assert.equal(robotsAllows(r, '/x/test.php'), false)
  assert.equal(robotsAllows(r, '/x/test.php?a=1'), true)
  assert.equal(robotsAllows(parseRobots(txt, 'BadBot/1.0'), '/format'), false)
  assert.equal(robotsAllows(parseRobots(''), '/qualsiasi'), true)
})
test('tier: 50% cumulato = Tier 1, >0,2% Tier 2, resto Tier 3', () => {
  const a = [['a', 20], ['b', 15], ['c', 10], ['d', 6], ['e', 5], ['f', 0.2], ['g', 0]].map(([id, share]) => ({ id, share }))
  const t = assignTiers(a)
  assert.deepEqual(a.map(x => t.get(x.id)), [1, 1, 1, 1, 2, 3, 3])
})
test('trend: confronta col giorno precedente, non con lo stesso giorno', () => {
  const old = { updated: '2026-10-11', decks: [{ name: 'Burn', share: 10 }] }
  assert.equal(previousShares(old, '2026-10-12').map.get('Burn'), 10)
  const same = { updated: '2026-10-12', prevDate: '2026-10-11', decks: [{ name: 'Burn', share: 12, prev: 10 }] }
  const p = previousShares(same, '2026-10-12')
  assert.equal(p.map.get('Burn'), 10); assert.equal(p.date, '2026-10-11')
})

test('varianti: nomi equivalenti raggruppati, colori e plurali ignorati', () => {
  assert.equal(titleKey('Mono Blue Faeries'), titleKey('faerie (mono-U)'))
  assert.notEqual(titleKey('Mono Blue Delver'), titleKey('Mono Blue Faeries'))
  const L = (t, d) => ({ title: t, deck: String(d), event: '1' })
  const links = [L('Mono Blu Delver', 1), L('Mono Blue Faeries', 2), L('Mono Blue Delver', 3), L('Faeries', 4), L('Mono U Faeries', 5), L('Tron', 6), L('Mono Blue Delver', 7)]
  const v = groupVariants(links)
  assert.deepEqual(v.map(x => [x.title, x.count]), [['Mono Blue Delver', 3], ['Mono Blue Faeries', 3]])
  assert.equal(v[0].links[0].deck, '1') // la lista più recente della variante
  assert.equal(groupVariants([L('Burn', 1), L('Burn', 2), L('Madness', 3)]).length, 1) // una sola variante: resta l'archetipo
})
