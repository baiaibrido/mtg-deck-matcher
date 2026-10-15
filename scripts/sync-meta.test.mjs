import { test } from 'node:test'
import assert from 'node:assert/strict'
import { archetypeName, buildClassifier, rankOf, aggregate, dayPatterns } from './sync-meta.mjs'

const C = (CardName, Count = 4) => ({ CardName, Count })
const rules = {
  archetypes: [
    { Name: 'Faeries', IncludeColorInName: true, Conditions: [{ Type: 'InMainboard', Cards: ['Spellstutter Sprite'] }, { Type: 'DoesNotContain', Cards: ['Priest of Titania'] }] },
    { Name: 'Terror', IncludeColorInName: true, Conditions: [{ Type: 'InMainboard', Cards: ['Delver of Secrets'] }, { Type: 'DoesNotContain', Cards: ['Spellstutter Sprite'] }] },
    { Name: 'Affinity', IncludeColorInName: false, Conditions: [{ Type: 'TwoOrMoreInMainboard', Cards: ['Frogmite', 'Myr Enforcer', 'Thoughtcast'] }],
      Variants: [{ Name: 'AffinityNinja', IncludeColorInName: false, Conditions: [{ Type: 'InMainboard', Cards: ['Moon-Circuit Hacker'] }] }] },
  ],
  fallbacks: [{ Name: 'GenericControl', IncludeColorInName: true, CommonCards: ['Counterspell', 'Mulldrifter'] }],
  lands: new Map([['Island', 'U'], ['Swamp', 'B']]),
  nonLands: new Map([['Spellstutter Sprite', 'U'], ['Delver of Secrets', 'U'], ['Counterspell', 'U'], ['Cast Down', 'B'], ['Mulldrifter', 'U']]),
}
const classify = buildClassifier(rules)

test('nomi come MTGOArchetypeParser', () => {
  assert.equal(archetypeName({ Name: 'Faeries', IncludeColorInName: true }, 'U'), 'Mono Blue Faeries')
  assert.equal(archetypeName({ Name: 'Faeries', IncludeColorInName: true }, 'UB'), 'Dimir Faeries')
  assert.equal(archetypeName({ Name: 'GenericControl', IncludeColorInName: false }, 'U'), 'Control')
  assert.equal(archetypeName({ Name: 'Storm_Land_Spy', IncludeColorInName: false }, 'G'), 'Storm Land Spy')
})

test('Faeries mono blu e Dimir separati, colore da terre + magie', () => {
  assert.equal(classify([C('Spellstutter Sprite'), C('Island', 16)], []), 'Mono Blue Faeries')
  assert.equal(classify([C('Spellstutter Sprite'), C('Cast Down'), C('Island', 10), C('Swamp', 6)], []), 'Dimir Faeries')
  // Cast Down in side ma nessuna palude: resta mono blu
  assert.equal(classify([C('Spellstutter Sprite'), C('Island', 16)], [C('Cast Down')]), 'Mono Blue Faeries')
  assert.equal(classify([C('Delver of Secrets'), C('Island', 16)], []), 'Mono Blue Terror')
})

test('varianti, generici e non riconosciuti', () => {
  assert.equal(classify([C('Frogmite'), C('Thoughtcast')], []), 'Affinity')
  assert.equal(classify([C('Frogmite'), C('Thoughtcast'), C('Moon-Circuit Hacker')], []), 'Affinity Ninja')
  assert.equal(classify([C('Counterspell'), C('Mulldrifter'), C('Island', 16)], []), 'Mono Blue Control')
  assert.equal(classify([C('Lightning Bolt'), C('Mountain', 20)], []), null)
})

test('piazzamenti', () => {
  assert.equal(rankOf('1st Place'), 1)
  assert.equal(rankOf('3st Place'), 3)
  assert.equal(rankOf('5-0'), 1)
  assert.equal(rankOf('4-1'), 9)
  assert.equal(rankOf(undefined), 99)
})

test('aggregazione: quote, doppioni, lista rappresentativa', () => {
  const deck = (player, extra, Result, Date) => ({ Player: player, Result, Date, AnchorUri: `u/${player}`, Mainboard: [C('Island', 16), C('Spellstutter Sprite', 4), C('Brainstorm', 40), ...extra], Sideboard: [C('Hydroblast', 15)] })
  const T = (Name, Date) => ({ Name, Date, Formats: 'Pauper' })
  const e = [
    { tournament: T('A', '2026-10-01'), deck: deck('p1', [], '9th Place', '2026-10-01') },
    { tournament: T('A', '2026-10-01'), deck: deck('p1', [], '9th Place', '2026-10-01') }, // doppione (altra cartella)
    { tournament: T('B', '2026-10-05'), deck: deck('p2', [], '2nd Place', '2026-10-05') },
    { tournament: T('C', '2026-10-09'), deck: deck('p3', [], '20th Place', '2026-10-09') },
    { tournament: T('C', '2026-10-09'), deck: { Player: 'x', Mainboard: [C('Lightning Bolt', 60)], Sideboard: [] } }, // non riconosciuto
    { tournament: T('C', '2026-10-09'), deck: { Player: 'y', Mainboard: [C('Island', 20)], Sideboard: [] } }, // < 60 carte: scartato
  ]
  const r = aggregate(e, classify, 'pauper')
  assert.equal(r.total, 4)
  assert.equal(r.unknownPct, 25)
  assert.equal(r.decks.length, 1)
  const d = r.decks[0]
  assert.equal(d.name, 'Mono Blue Faeries')
  assert.equal(d.share, 75)
  assert.equal(d.id, 'pauper-mono-blue-faeries')
  assert.equal(d.url, 'u/p2') // top 8 più recente, non il 20° posto più recente
  assert.ok(d.main.includes('4 Spellstutter Sprite') && d.side[0] === '15 Hydroblast')
})

test('finestra di 2 mesi: un pattern per giorno', () => {
  const p = dayPatterns(new Date('2026-10-14T03:00:00Z'), 60)
  assert.equal(p.length, 61)
  assert.equal(p[0], '/Tournaments/*/2026/10/14/')
  assert.equal(p.at(-1), '/Tournaments/*/2026/08/15/')
})

test('rogue della settimana: fuori dai 30, solo con risultati recenti, nome da colori + carta simbolo', async () => {
  const { findRogue, signatureCard } = await import('./sync-meta.mjs')
  const freq = new Map([['Lightning Bolt', 900], ['Cleansing Wildfire', 3], ['Kor Skyfisher', 400], ['Mountain', 800]])
  const isLand = n => n === 'Mountain'
  assert.equal(signatureCard([{ CardName: 'Lightning Bolt', Count: 4 }, { CardName: 'Cleansing Wildfire', Count: 4 }, { CardName: 'Mountain', Count: 8 }], freq, isLand), 'Cleansing Wildfire')
  const E = (date, Result, main, player = 'p') => ({ date, rank: Result === '5-0' ? 1 : parseInt(Result), t: { Name: 'T' }, d: { Player: player, Result, Mainboard: main, Sideboard: [] } })
  const wild = [{ CardName: 'Cleansing Wildfire', Count: 4 }, { CardName: 'Kor Skyfisher', Count: 4 }, { CardName: 'Mountain', Count: 52 }]
  const classify = { colorOf: () => 'WRG', isLand }
  const outside = [
    { name: 'Slivers', list: [E('2026-10-12', '5-0', wild), E('2026-10-13', '3rd Place', wild)] },
    { name: 'Old Brew', list: [E('2026-09-01', '1st Place', wild)] },     // risultato vecchio: escluso
    { name: 'Losing Brew', list: [E('2026-10-13', '20th Place', wild)] }, // nessun risultato: escluso
  ]
  const r = findRogue(outside, [E('2026-10-14', '1st Place', wild, 'x')], { classify, freq, total: 100, id: 'pauper' })
  assert.deepEqual(r.map(d => [d.name, d.results, d.best]), [['Slivers', 2, '5-0'], ['Naya Cleansing Wildfire', 1, '1st Place']])
  assert.ok(r.every(d => d.rogue && d.main.length && d.id.startsWith('pauper-rogue-')))
})
