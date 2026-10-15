import { norm } from './normalize.js'
import { BASICS } from './keyCards.js'

// Mazzo misterioso del giorno: uno tra i meno blasonati del formato (metà bassa del meta per quota + rogue),
// uguale per tutti nello stesso giorno, cambia a mezzanotte (ora locale).
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }

export function dailyPool(decks) {
  const meta = decks.filter(d => !d.rogue && d.source !== 'utente').sort((a, b) => (b.share || 0) - (a.share || 0))
  return [...meta.slice(Math.ceil(meta.length / 2)), ...decks.filter(d => d.rogue)]
}

export function pickDaily(decks, format, day = dayKey()) {
  const pool = dailyPool(decks)
  return pool.length ? pool[hash(`${format}|${day}`) % pool.length] : null
}

// Carta caratteristica: la non-terra (almeno 2 copie) meno presente negli altri mazzi del formato
export function signatureOf(deck, decks, isLand = () => false) {
  if (deck.signature) return deck.signature
  const freq = new Map()
  for (const d of decks) for (const k of new Set((d.main || []).map(c => norm(c.name)))) freq.set(k, (freq.get(k) || 0) + 1)
  const cand = (deck.main || []).filter(c => c.qty >= 2 && !BASICS.test(c.name) && !isLand(c.name))
  return cand.sort((a, b) => (freq.get(norm(a.name)) || 0) - (freq.get(norm(b.name)) || 0) || b.qty - a.qty)[0]?.name || null
}

// Tempo fino a mezzanotte, per il "cambia tra…"
export function untilMidnight(now = new Date()) {
  const m = new Date(now); m.setHours(24, 0, 0, 0)
  const min = Math.max(0, Math.ceil((m - now) / 60000))
  return { h: Math.floor(min / 60), m: min % 60 }
}
