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
  return mainFirst(WUBRG.filter(k => count[k] >= (big ? 1 : 2)), count)
}

// Mazzo quasi monocolore (es. Red Madness: rosso con 4 carte blu-nere): il colore principale va per primo
// e gli altri sono "splash" (simboli più piccoli). Splash = al massimo un quarto delle carte del colore principale.
export const SPLASH_MAX = 0.25
export function mainFirst(colors, count) {
  if (colors.length < 2) return colors
  const top = colors.reduce((a, b) => (count[b] > count[a] ? b : a))
  const rest = colors.filter(k => k !== top)
  if (rest.some(k => count[k] > count[top] * SPLASH_MAX)) return colors
  const out = [top, ...rest]
  out.splash = rest
  return out
}

// Cornice "alla Magic": incolore, monocolore, ibrida (2 colori) o oro (3+).
export function frameOf(colors) {
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
