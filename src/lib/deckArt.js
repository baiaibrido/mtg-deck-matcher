// Quale carta mostrare come illustrazione di un mazzo (anteprime della home e della pagina del mazzo).
// Diverso dal mazzo misterioso (pickSignature), dove la carta NON deve svelare il nome.
// 1. la carta che dà il nome al mazzo (Kiln Fiend, Tolarian Terror, Experimental Synthesizer…);
// 2. altrimenti dal cuore della lista (carte in quasi tutte le liste): prima le creature,
//    poi quella che compare in meno mazzi del formato, poi quella con più copie.
const BASICS = /^(Snow-Covered )?(Plains|Island|Swamp|Mountain|Forest|Wastes)$/i
// parole del nome di un mazzo che non indicano una carta: colori, gilde, frammenti, tipi di mazzo
const GENERIC = new Set(('mono white blue black red green colorless colourless azorius dimir rakdos gruul selesnya orzhov izzet golgari boros simic ' +
  'esper grixis jund naya bant abzan jeskai sultai mardu temur glint dune ink witch yore domain wubr wubrg ubrg wbrg wurg wubg ' +
  'aggro control midrange combo tempo ramp tron storm deck burn the of and').split(' '))
const words = s => s.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean)
const stem = w => w.replace(/'s$/, '').replace(/s$/, '')
const sameWord = (a, b) => { const x = stem(a), y = stem(b); return x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x)) }

export function namesakeOf(deck, isLand = () => false) {
  const cards = (deck.main || []).filter(c => !BASICS.test(c.name))
  const name = ` ${words(deck.name).join(' ')} `
  // il nome intero della carta dentro il nome del mazzo: «Mono Red Kiln Fiend» → Kiln Fiend
  const whole = cards.filter(c => name.includes(` ${words(c.name).join(' ')} `)).sort((a, b) => b.name.length - a.name.length)[0]
  if (whole) return whole.name
  // una parola che conta del nome del mazzo dentro il nome della carta: «Dimir Terror» → Tolarian Terror
  const keys = words(deck.name).filter(w => !GENERIC.has(w))
  if (!keys.length) return null
  const hits = cards.filter(c => words(c.name).some(w => keys.some(k => sameWord(w, k))))
  return hits.sort((a, b) => isLand(a.name) - isLand(b.name) || b.qty - a.qty)[0]?.name || null
}

export function artCardOf(deck, freqOf, { isLand = () => false, isCreature = () => false } = {}) {
  const named = namesakeOf(deck, isLand)
  if (named) return named
  const core = (deck.core || []).map(([name, qty]) => ({ name, qty })).filter(c => !BASICS.test(c.name) && !isLand(c.name))
  const pool = core.length ? core : (deck.main || []).filter(c => !BASICS.test(c.name) && !isLand(c.name))
  return [...pool].sort((a, b) => isCreature(b.name) - isCreature(a.name) || freqOf(a.name) - freqOf(b.name) || Math.min(b.qty, 4) - Math.min(a.qty, 4) || a.name.localeCompare(b.name))[0]?.name || null
}
