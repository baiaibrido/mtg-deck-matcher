// Colori dei mazzi, raggruppamento per tipo e simboli di costo (dati da cache Scryfall).
export const WUBRG = ['W', 'U', 'B', 'R', 'G']
export const COLOR_NAME = { W: 'Bianco', U: 'Blu', B: 'Nero', R: 'Rosso', G: 'Verde' }

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
  return WUBRG.filter(k => count[k] >= (big ? 1 : 2))
}

// Cornice "alla Magic": incolore, monocolore, ibrida (2 colori) o oro (3+).
export function frameOf(colors) {
  if (!colors || !colors.length) return { kind: 'c', c1: 'var(--mana-c)', c2: 'var(--mana-c)' }
  if (colors.length === 1) { const v = `var(--mana-${colors[0].toLowerCase()})`; return { kind: 'mono', c1: v, c2: v } }
  if (colors.length === 2) return { kind: 'hybrid', c1: `var(--mana-${colors[0].toLowerCase()})`, c2: `var(--mana-${colors[1].toLowerCase()})` }
  return { kind: 'gold', c1: 'var(--mana-gold)', c2: 'var(--mana-gold)' }
}

export const GROUPS = [
  ['creature', 'Creature', /\bCreature\b/],
  ['planeswalker', 'Planeswalker', /\bPlaneswalker\b/],
  ['spell', 'Istantanei e stregonerie', /\b(Instant|Sorcery)\b/],
  ['permanent', 'Artefatti e incantesimi', /\b(Artifact|Enchantment|Battle)\b/],
  ['land', 'Terre', /\bLand\b/],
]
export function groupOf(card) {
  if (!card?.type) return 'other'
  if (/\bLand\b/.test(card.type) && !/\bCreature\b/.test(card.type)) return 'land'
  return GROUPS.find(([, , re]) => re.test(card.type))?.[0] || 'other'
}

// "{2}{U}{W/P}" → ['2','u','wp'] (classi mana-font)
export const costSymbols = cost => [...(cost || '').matchAll(/\{([^}]+)\}/g)].map(m => m[1].replace(/\//g, '').toLowerCase())

// Costo delle copie mancanti in euro (prezzo Cardmarket via Scryfall). unknown = copie senza prezzo.
export function missingCost(rows, lookup) {
  let eur = 0, unknown = 0, known = 0
  for (const r of rows) {
    if (!r.missing) continue
    const p = lookup(r.name)?.eur
    if (p == null) unknown += r.missing
    else { eur += p * r.missing; known += r.missing }
  }
  return { eur, unknown, known }
}
const EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const EUR2 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
export const euro = (v, cents = false) => (cents ? EUR2 : EUR).format(v)

// Sezioni del "raccoglitore": colore della carta (terre a parte, multicolore, incolore)
export const BINDER = [
  ['W', 'Bianco'], ['U', 'Blu'], ['B', 'Nero'], ['R', 'Rosso'], ['G', 'Verde'],
  ['M', 'Multicolore'], ['C', 'Incolore'], ['L', 'Terre'], ['?', 'Dati in arrivo'],
]
export function binderOf(card) {
  if (!card) return '?'
  if (/\bLand\b/.test(card.type) && !/\bCreature\b/.test(card.type)) return 'L'
  if (!card.ci.length) return 'C'
  return card.ci.length > 1 ? 'M' : card.ci[0]
}
export const TYPE_FILTERS = [
  ['all', 'Tutte', () => true],
  ['creature', 'Creature', t => /\bCreature\b/.test(t)],
  ['spell', 'Istantanei e stregonerie', t => /\b(Instant|Sorcery)\b/.test(t)],
  ['perm', 'Altri permanenti', t => !/\b(Creature|Land|Instant|Sorcery)\b/.test(t)],
  ['land', 'Terre', t => /\bLand\b/.test(t) && !/\bCreature\b/.test(t)],
]
