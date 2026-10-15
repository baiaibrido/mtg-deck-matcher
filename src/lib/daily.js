import { norm } from './normalize.js'
import { BASICS } from './keyCards.js'

// Mazzo misterioso del giorno: uno tra i meno blasonati del formato (metà bassa del meta per quota + rogue),
// uguale per tutti nello stesso giorno, cambia a mezzanotte (ora locale).
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
export const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 } // FNV-1a: stesso risultato per tutti nello stesso giorno

export function dailyPool(decks) {
  const meta = decks.filter(d => !d.rogue && d.source !== 'utente').sort((a, b) => (b.share || 0) - (a.share || 0))
  return [...meta.slice(Math.ceil(meta.length / 2)), ...decks.filter(d => d.rogue)]
}

export function pickDaily(decks, format, day = dayKey()) {
  const pool = dailyPool(decks)
  return pool.length ? pool[hash(`${format}|${day}`) % pool.length] : null
}

// Una delle carte caratteristiche: tra le non-terre del main si preferiscono quelle in più copie (4, poi 3, poi 2),
// e tra queste la meno diffusa negli altri mazzi del formato. Si scartano le carte con una parola in comune col nome
// del mazzo (es. "Experimental Synthesizer" in "Boros Synthesizer"), che lo svelerebbero.
const words = s => new Set(norm(s).split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 4).map(w => w.replace(/s$/, ''))) // "Goblins" = "Goblin"
export function pickSignature(entries, freqOf, isLand = () => false, deckName = '') {
  const banned = words(deckName)
  const cand = entries.filter(c => c.qty >= 2 && !BASICS.test(c.name) && !isLand(c.name) && ![...words(c.name)].some(w => banned.has(w)))
  return cand.sort((a, b) => Math.min(b.qty, 4) - Math.min(a.qty, 4) || freqOf(a.name) - freqOf(b.name) || a.name.localeCompare(b.name))[0]?.name || null
}

export function signatureOf(deck, decks, isLand = () => false) {
  const freq = new Map()
  for (const d of decks) for (const k of new Set((d.main || []).map(c => norm(c.name)))) freq.set(k, (freq.get(k) || 0) + 1)
  return pickSignature(deck.main || [], n => freq.get(norm(n)) || 0, isLand, deck.name) || deck.signature || null
}

// Tempo fino a mezzanotte, per il "cambia tra…"
export function untilMidnight(now = new Date()) {
  const m = new Date(now); m.setHours(24, 0, 0, 0)
  const min = Math.max(0, Math.ceil((m - now) / 60000))
  return { h: Math.floor(min / 60), m: min % 60 }
}
