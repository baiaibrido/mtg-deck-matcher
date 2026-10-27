// Funzioni "giocose" (pure, testate in fun.test.js): giochi, meteo del meta, traguardi.
import { norm } from './normalize.js'
import { BASICS } from './keyCards.js'
import { dayKey, pickSignature, hash } from './daily.js'

const prevDay = key => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d - 1)) }
const metaOnly = decks => decks.filter(d => !d.rogue && d.source !== 'utente')

// Serie di giorni consecutivi (mazzo misterioso aperto almeno una volta al giorno)
export function bumpStreak(streak, today = dayKey()) {
  if (streak?.day === today) return streak
  return { day: today, n: streak?.day === prevDay(today) ? streak.n + 1 : 1 }
}
export const liveStreak = (streak, today = dayKey()) => streak && (streak.day === today || streak.day === prevDay(today)) ? streak.n : 0

// Frequenza delle carte nei mazzi del formato (quanti mazzi le giocano)
export function cardFreq(decks) {
  const f = new Map()
  for (const d of decks) for (const k of new Set((d.main || []).map(c => norm(c.name)))) f.set(k, (f.get(k) || 0) + 1)
  return n => f.get(norm(n)) || 0
}

// ── Indovina il mazzo: uno dei 50 più giocati, carte svelate dalla più comune alla più caratteristica.
// Estrazione a caso ma uguale per tutti; un mazzo non torna prima di 5 giorni.
export const GUESS_TRIES = 6
export const GUESS_POOL = 50, GUESS_GAP = 5
const DAY = 864e5
const GUESS_FROM = Date.UTC(2026, 9, 27) // regola nuova da questo giorno (prima: i 20 più giocati, senza memoria)
const utcOf = key => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d) }
const keyOf = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}` }
const byShare = decks => metaOnly(decks).sort((a, b) => (b.share || 0) - (a.share || 0))
let memo = { k: '', v: null }

export function guessDeck(decks, format, day = dayKey()) {
  const at = utcOf(day)
  if (at < GUESS_FROM) { // giorni passati: come prima, così chi aveva già giocato ritrova il suo mazzo
    const old = byShare(decks).slice(0, 20)
    return old.length ? old[hash(`guess|${format}|${day}`) % old.length] : null
  }
  const pool = byShare(decks).slice(0, GUESS_POOL)
  if (!pool.length) return null
  const k = `${format}|${day}|${pool.map(d => d.id).join(',')}`
  if (memo.k === k) return memo.v
  // si ripercorrono i giorni dall'inizio della regola: ognuno esclude i mazzi usciti nei giorni prima
  const gap = Math.min(GUESS_GAP, pool.length - 1), recent = []
  let pick = null
  for (let t = GUESS_FROM; t <= at; t += DAY) {
    const free = pool.filter(d => !recent.includes(d.id))
    pick = free[hash(`guess|${format}|${keyOf(t)}`) % free.length]
    recent.push(pick.id); if (recent.length > gap) recent.shift()
  }
  memo = { k, v: pick }
  return pick
}
export function revealOrder(deck, decks, isLand = () => false) {
  const freq = cardFreq(decks)
  const cand = (deck.main || []).filter(c => !BASICS.test(c.name) && !isLand(c.name))
  const sig = pickSignature(cand, freq, isLand, deck.name)
  const rest = cand.filter(c => c.name !== sig).sort((a, b) => freq(b.name) - freq(a.name) || b.qty - a.qty || a.name.localeCompare(b.name))
  // le prime 5 sono le più comuni (difficili), l'ultima è la più caratteristica (aiuto finale)
  return [...rest.slice(0, GUESS_TRIES - 1).map(c => c.name), ...(sig ? [sig] : rest.slice(GUESS_TRIES - 1, GUESS_TRIES).map(c => c.name))]
}
export const shareGrid = (guesses, answer, tries = GUESS_TRIES) =>
  Array.from({ length: tries }, (_, i) => i < guesses.length ? (guesses[i] === answer ? '🟩' : '🟥') : '⬛').join('')

// ── Meteo del meta: chi sale, chi scende, chi resta in vetta (quota settimanale: ultima vs 4 settimane prima)
export const WEATHER_WEEKS = 4
export const deltaOf = d => {
  const h = d.history || []
  const last = h.length - 1, then = last - WEATHER_WEEKS
  if (then >= 0 && h[last] != null && h[then] != null) return h[last] - h[then]
  return d.prev != null ? d.share - d.prev : null
}
export function weather(decks) {
  const meta = metaOnly(decks).filter(d => d.share > 0)
  if (!meta.length) return null
  const moved = meta.map(d => ({ d, delta: deltaOf(d) })).filter(x => x.delta != null).map(x => ({ ...x, delta: Math.round(x.delta * 10) / 10 }))
  const up = moved.filter(x => x.delta >= 0.5).sort((a, b) => b.delta - a.delta)[0] || null
  const down = moved.filter(x => x.delta <= -0.5).sort((a, b) => a.delta - b.delta)[0] || null
  const top = [...meta].sort((a, b) => b.share - a.share)[0]
  return up || down ? { up, down, top } : null
}

// ── Ci sei quasi: il mazzo con meno carte mancanti (1..max), a parità il più giocato
export function almostThere(ranked, max = 5, dismissed = []) {
  return ranked.map(s => ({ s, n: s.missing.reduce((t, r) => t + r.missing, 0) }))
    .filter(x => x.n > 0 && x.n <= max && !dismissed.includes(x.s.deck.id))
    .sort((a, b) => a.n - b.n || (b.s.deck.share || 0) - (a.s.deck.share || 0))[0] || null
}

// ── La tua collezione urla…: colore dominante (per copie) o coppia di colori (gilda)
const GUILDS = { WU: 'Azorius', UB: 'Dimir', BR: 'Rakdos', RG: 'Gruul', GW: 'Selesnya', WB: 'Orzhov', UR: 'Izzet', BG: 'Golgari', RW: 'Boros', GU: 'Simic' }
const ORDER = 'WUBRG'
export function personality(collection, getCard) {
  const by = { W: 0, U: 0, B: 0, R: 0, G: 0 }; let tot = 0
  for (const c of collection) {
    const ci = getCard(c.name)?.ci; if (!ci) continue
    tot += c.qty
    for (const x of ci) if (x in by) by[x] += c.qty / ci.length
  }
  if (tot < 20) return null
  const [a, b] = Object.entries(by).sort((x, y) => y[1] - x[1])
  const pa = a[1] / tot, pb = b[1] / tot
  if (pa >= 0.35 && pa - pb >= 0.12) return { kind: 'mono', color: a[0], pct: Math.round(pa * 100) }
  const pair = [a[0], b[0]].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y)).join('')
  const key = GUILDS[pair] ? pair : pair.split('').reverse().join('')
  return { kind: 'pair', colors: [a[0], b[0]], guild: GUILDS[key] || GUILDS[pair], pct: Math.round((pa + pb) * 100) }
}

// ── Che mazzo sei?: profilo del mazzo (velocità, creature, colori, prezzo, popolarità) e vicinanza alle risposte
export const cmcOf = cost => (cost || '').match(/\{([^}]+)\}/g)?.reduce((s, x) => { const v = x.slice(1, -1); return s + (/^\d+$/.test(v) ? +v : v === 'X' ? 0 : 1) }, 0) ?? 0
export function deckProfile(deck, getCard) {
  let n = 0, cmc = 0, crea = 0, price = 0
  for (const c of deck.main || []) {
    const card = getCard(c.name); if (!card || /\bLand\b/.test(card.type || '')) continue
    n += c.qty; cmc += cmcOf(card.cost) * c.qty; if (/Creature/.test(card.type || '')) crea += c.qty
  }
  for (const c of [...deck.main || [], ...deck.side || []]) price += (getCard(c.name)?.eur ?? 0) * c.qty
  return n ? { cmc: cmc / n, crea: crea / n, price, share: deck.share || 0 } : null
}
// risposte: { speed: 'fast'|'mid'|'slow', style: 'crea'|'spells'|'mix', color: 'W'..'G'|'any', budget: 50|150|0, pop: 'meta'|'off'|'any' }
export function quizMatch(decks, answers, getCard, colorsOf) {
  const target = { fast: 1.9, mid: 2.5, slow: 3.2 }[answers.speed], creaT = { crea: 0.6, spells: 0.15, mix: 0.38 }[answers.style]
  let best = null
  for (const d of [...metaOnly(decks), ...decks.filter(x => x.rogue)]) {
    const p = deckProfile(d, getCard); if (!p) continue
    const cols = colorsOf(d) || []
    let s = Math.abs(p.cmc - target) * 1.4 + Math.abs(p.crea - creaT) * 2
    if (answers.color !== 'any') s += cols.includes(answers.color) ? (cols.length === 1 ? -0.4 : 0) : 1.5
    if (answers.budget && p.price > answers.budget) s += 1 + (p.price - answers.budget) / answers.budget
    if (answers.pop === 'meta') s -= Math.min(p.share, 10) / 10
    if (answers.pop === 'off') s += Math.min(p.share, 10) / 10 - (d.rogue ? 0.3 : 0)
    if (!best || s < best.s) best = { d, s, p }
  }
  return best
}

// ── Traguardi: condizioni sui dati locali (collezione, preferiti, mazzi aperti, giochi)
export const ACHIEVEMENTS = [
  // collezione
  { id: 'first', icon: '🌱', test: c => c.cards >= 1 },
  { id: 'c100', icon: '📦', test: c => c.cards >= 100 },
  { id: 'c500', icon: '🗃️', test: c => c.cards >= 500 },
  { id: 'c1000', icon: '🏛️', test: c => c.cards >= 1000 },
  { id: 'value', icon: '💰', test: c => c.value >= 100 },
  { id: 'color', icon: '🎨', test: c => c.maxColor >= 100 },
  { id: 'rainbow', icon: '🌈', test: c => c.minColor >= 20 },
  // mazzi
  { id: 'almost', icon: '🎯', test: c => !!c.fun.almost },
  { id: 'complete', icon: '🏆', test: c => (c.fun.completeMax || 0) >= 1 },
  { id: 'three', icon: '👑', test: c => (c.fun.completeMax || 0) >= 3 },
  { id: 'fan', icon: '⭐', test: c => c.pins >= 3 },
  { id: 'curious', icon: '🔭', test: c => (c.fun.seen || []).length >= 25 },
  { id: 'rogue', icon: '🌶️', test: c => !!c.fun.rogueSeen },
  { id: 'globe', icon: '🌍', test: c => (c.fun.formats || []).length >= 7 },
  // scoperta e giochi
  { id: 'explorer', icon: '🧭', test: c => (c.fun.opens || 0) >= 7 },
  { id: 'streak', icon: '🔥', test: c => (c.fun.bestStreak || 0) >= 5 },
  { id: 'detective', icon: '🔎', test: c => (c.fun.guessWins || 0) >= 1 },
  { id: 'sleuth', icon: '🕵️', test: c => (c.fun.guessWins || 0) >= 5 },
  { id: 'sharp', icon: '🦅', test: c => !!c.fun.guessFirst },
  { id: 'quiz', icon: '🪞', test: c => !!c.fun.quiz },
  { id: 'night', icon: '🌙', test: c => !!c.fun.night },
]
export const unlockedNow = ctx => ACHIEVEMENTS.filter(a => a.test(ctx)).map(a => a.id)
