// Colori dei mazzi, raggruppamento per tipo e simboli di costo (dati da cache Scryfall).
import { t } from '../i18n/index.js'
import { priceOf } from './currency.js'
export const WUBRG = ['W', 'U', 'B', 'R', 'G']
export const colorName = c => t(`color.${c}`)

// Identità di colore del mazzo: carte non-terra del main. Nei mazzi da 60 un colore conta
// solo con almeno 2 copie (ignora gli "splash" da 1 carta). Restituisce null se mancano dati.
export function deckColors(deck, lookup) {
  const count = Object.fromEntries(WUBRG.map(c => [c, 0]))
  let known = 0
  for (const r of deck.main) {
    const c = lookup(r.name)
    if (!c) continue
    known++
    if (/\bLand\b/.test(c.type) && !/\bCreature\b/.test(c.type)) continue
    for (const k of c.ci) count[k] += r.qty
  }
  if (!deck.main.length || known < deck.main.length * 0.6) return null
  const big = deck.main.reduce((t, r) => t + r.qty, 0) > 80
  const colors = WUBRG.filter(k => count[k] >= (big ? 1 : 2))
  // Commander: i colori sono quelli del comandante, niente splash
  return big ? colors : mainFirst(colors, count, nameColors(deck.name), /\bmono\b/i.test(deck.name || ''))
}

// Colori scritti nel nome del mazzo: gilde (2 colori), frammenti e clan (3), nomi a 4 colori,
// college di Strixhaven e famiglie di New Capenna, parole di colore e sigle tipo «UB» o «WURG».
const NAMES = {
  azorius: 'WU', dimir: 'UB', rakdos: 'BR', gruul: 'RG', selesnya: 'WG', orzhov: 'WB', izzet: 'UR', golgari: 'BG', boros: 'WR', simic: 'UG',
  bant: 'WUG', esper: 'WUB', grixis: 'UBR', jund: 'BRG', naya: 'WRG', abzan: 'WBG', junk: 'WBG', jeskai: 'WUR', sultai: 'UBG', mardu: 'WBR', temur: 'URG',
  glint: 'UBRG', dune: 'WBRG', ink: 'WURG', witch: 'WUBG', yore: 'WUBR',
  silverquill: 'WB', prismari: 'UR', witherbloom: 'BG', lorehold: 'WR', quandrix: 'UG',
  brokers: 'WUG', cabaretti: 'WRG', maestros: 'UBR', obscura: 'WUB', riveteers: 'BRG',
  white: 'W', blue: 'U', black: 'B', red: 'R', green: 'G',
}
const ALL = /\b(domain|five[- ]?colou?r|5[- ]?(c|colou?r))\b/i
export function nameColors(name = '') {
  if (ALL.test(name)) return WUBRG
  const out = new Set()
  for (const w of name.split(/[^A-Za-z0-9]+/)) {
    const k = NAMES[w.toLowerCase()]
    if (k) for (const c of k) out.add(c)
    else if (/^[WUBRG]{2,5}$/.test(w)) for (const c of w) out.add(c)
  }
  return WUBRG.filter(c => out.has(c))
}

// Colori principali e colori di "splash" (simboli più piccoli, dopo i principali).
// Principali: quelli nel nome del mazzo e quelli con più di un quarto delle carte del colore più giocato.
// Es. Red Madness: rosso, poi blu e nero piccoli (4 carte); Selesnya Landfall: bianco e verde anche se il bianco è poco.
export const SPLASH_MAX = 0.25
export function mainFirst(colors, count, named = [], mono = false) {
  if (colors.length < 2) return colors
  const top = colors.reduce((a, b) => (count[b] > count[a] ? b : a))
  // «Mono …»: conta solo il colore del nome
  const isMain = mono && named.length ? k => named.includes(k) : k => named.includes(k) || count[k] > count[top] * SPLASH_MAX
  let main = colors.filter(isMain)
  const extra = named.filter(k => !colors.includes(k) && count[k] > 0) // nel nome e presente anche se con una sola carta
  main = WUBRG.filter(k => main.includes(k) || extra.includes(k))
  const splash = colors.filter(k => !main.includes(k))
  if (!splash.length) return main
  const out = [...main, ...splash]
  out.main = main
  out.splash = splash
  return out
}

// Cornice "alla Magic": incolore, monocolore, ibrida (2 colori) o oro (3+).
export function frameOf(colors) {
  if (colors?.main) colors = colors.main // gli splash non cambiano la cornice
  if (!colors || !colors.length) return { kind: 'c', c1: 'var(--mana-c)', c2: 'var(--mana-c)' }
  if (colors.length === 1) { const v = `var(--mana-${colors[0].toLowerCase()})`; return { kind: 'mono', c1: v, c2: v } }
  if (colors.length === 2) return { kind: 'hybrid', c1: `var(--mana-${colors[0].toLowerCase()})`, c2: `var(--mana-${colors[1].toLowerCase()})` }
  return { kind: 'gold', c1: 'var(--mana-gold)', c2: 'var(--mana-gold)' }
}

export const GROUPS = [
  ['creature', /\bCreature\b/],
  ['planeswalker', /\bPlaneswalker\b/],
  ['spell', /\b(Instant|Sorcery)\b/],
  ['permanent', /\b(Artifact|Enchantment|Battle)\b/],
  ['land', /\bLand\b/],
]
export function groupOf(card) {
  if (!card?.type) return 'other'
  if (/\bLand\b/.test(card.type) && !/\bCreature\b/.test(card.type)) return 'land'
  return GROUPS.find(([, re]) => re.test(card.type))?.[0] || 'other'
}

// "{2}{U}{W/P}" → ['2','u','wp'] (classi mana-font)
export const costSymbols = cost => [...(cost || '').matchAll(/\{([^}]+)\}/g)].map(m => m[1].replace(/\//g, '').toLowerCase())

// Costo delle copie mancanti nella valuta locale (lib/currency.js). unknown = copie senza prezzo.
export function missingCost(rows, lookup) {
  let amount = 0, unknown = 0, known = 0
  for (const r of rows) {
    if (!r.missing) continue
    const p = priceOf(lookup(r.name))
    if (p == null) unknown += r.missing
    else { amount += p * r.missing; known += r.missing }
  }
  return { amount, unknown, known }
}

// Sezioni del "raccoglitore": colore della carta (terre a parte, multicolore, incolore)
export const BINDER = ['W', 'U', 'B', 'R', 'G', 'M', 'C', 'L', '?']
export const binderName = k => WUBRG.includes(k) ? colorName(k) : t(`binder.${k}`)
export function binderOf(card) {
  if (!card) return '?'
  if (/\bLand\b/.test(card.type) && !/\bCreature\b/.test(card.type)) return 'L'
  if (!card.ci.length) return 'C'
  return card.ci.length > 1 ? 'M' : card.ci[0]
}
export const TYPE_FILTERS = [
  ['all', () => true],
  ['creature', ty => /\bCreature\b/.test(ty)],
  ['spell', ty => /\b(Instant|Sorcery)\b/.test(ty)],
  ['perm', ty => !/\b(Creature|Land|Instant|Sorcery)\b/.test(ty)],
  ['land', ty => /\bLand\b/.test(ty) && !/\bCreature\b/.test(ty)],
]
