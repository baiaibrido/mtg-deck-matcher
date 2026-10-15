// Statistiche lato app (pure, testate in stats.test.js), sui dati preparati di notte
import { norm } from './normalize.js'
import { BASICS } from './keyCards.js'

const metaOnly = decks => decks.filter(d => !d.rogue && d.source !== 'utente' && d.share > 0)

// Salute del formato: quanti archetipi servono per fare metà del meta (adesso e settimana per settimana)
const toHalf = shares => { let s = 0, n = 0; for (const x of [...shares].filter(v => v > 0).sort((a, b) => b - a)) { s += x; n++; if (s >= 50) return n } return null }
export function health(decks) {
  const meta = metaOnly(decks)
  if (meta.length < 5) return null
  const weeks = meta[0].history?.length || 0
  const series = Array.from({ length: weeks }, (_, i) => meta.some(d => d.history?.[i] == null) && meta.filter(d => d.history?.[i] != null).length < meta.length / 2 ? null : toHalf(meta.map(d => d.history?.[i] || 0)))
  const now = toHalf(meta.map(d => d.share))
  return { now, kind: now == null ? null : now <= 3 ? 'tight' : now <= 6 ? 'balanced' : 'open', series, top: meta.slice().sort((a, b) => b.share - a.share).slice(0, now || 0) }
}

// Prezzo pieno del mazzo (main + side, terre base escluse) e cosa ti costa completarlo
export function fullPrice(deck, getCard) {
  let p = 0, known = 0, tot = 0
  for (const c of [...deck.main || [], ...deck.side || []]) {
    if (BASICS.test(c.name)) continue
    tot++; const e = getCard(c.name)?.eur; if (e != null) { p += e * c.qty; known++ }
  }
  return tot && known / tot >= 0.8 ? p : null
}

// Quanto rende ogni euro: % contro il meta e prezzo; "frontiera" = nessun mazzo è insieme più economico e più forte
export function valuePoints(ranked, getCard, costOf) {
  const pts = ranked.filter(s => s.deck.metaWr != null && !s.deck.rogue).map(s => ({ s, wr: s.deck.metaWr, price: fullPrice(s.deck, getCard), need: costOf ? costOf(s) : null }))
    .filter(p => p.price != null)
  const sorted = [...pts].sort((a, b) => a.price - b.price || b.wr - a.wr)
  let best = -Infinity
  for (const p of sorted) { p.frontier = p.wr > best; if (p.wr > best) best = p.wr }
  return pts
}
// Il miglior investimento con la tua collezione: per ogni budget, il mazzo più forte che completi spendendo al massimo quello
export function bestBuys(points, budgets = [25, 50, 100]) {
  return budgets.map(b => {
    const ok = points.filter(p => p.need != null && p.need <= b).sort((x, y) => y.wr - x.wr || x.need - y.need)[0]
    return ok ? { budget: b, p: ok } : null
  }).filter(Boolean).filter((x, i, a) => i === 0 || x.p.s.deck.id !== a[i - 1].p.s.deck.id)
}

// Chi converte di più: quota tra i top 8 rispetto alla quota tra i giocatori
export function converters(decks, top = 8) {
  return metaOnly(decks).filter(d => d.conv && d.conv[2] >= 5 && d.conv[0] > 0)
    .map(d => ({ d, field: d.conv[0], top8: d.conv[1], ratio: d.conv[1] / d.conv[0] }))
    .sort((a, b) => b.ratio - a.ratio).slice(0, top)
}

// Carte in salita con prezzo ancora fermo: presenza in crescita, prezzo cambiato meno del 10% (se c'è lo storico)
export function priceWatch(cardsUp, prices) {
  return (cardsUp || []).map(([name, now, before, weekly]) => {
    const h = prices?.p?.[name] || []
    const vals = h.filter(v => v != null)
    const last = vals.at(-1) ?? null, first = vals.length >= 2 ? vals[0] : null
    const change = first ? (last - first) / first * 100 : null
    return { name, now, before, weekly, price: last, change, days: prices?.dates?.length || 0, still: change == null ? null : change < 10 }
  })
}

// Side contro di te: carte più giocate in sideboard dai mazzi che battono spesso questo mazzo
export function sideAgainst(deck, decks, { maxWr = 45, minGames = 10, top = 8 } = {}) {
  const byName = new Map(decks.filter(d => !d.rogue).map(d => [d.name, d]))
  const bad = (deck.mu || []).map(([vs, w, l, d]) => ({ vs, games: w + l + d, wr: (w + d / 2) / Math.max(1, w + l + d) * 100 }))
    .filter(x => x.games >= minGames && x.wr <= maxWr && byName.has(x.vs))
  const count = new Map()
  for (const b of bad) for (const c of byName.get(b.vs).side || []) {
    const k = norm(c.name), x = count.get(k) || { name: c.name, n: 0, from: [] }
    x.n += 1; if (x.from.length < 3) x.from.push(b.vs); count.set(k, x)
  }
  return { opponents: bad.map(b => b.vs), cards: [...count.values()].filter(x => x.n >= 2 || bad.length === 1).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, top) }
}

// Cuore della lista con le copie che possiedi
export function coreWithOwned(deck, owned) {
  if (!deck.core) return null
  const own = n => owned.get(norm(n)) || 0
  const core = deck.core.filter(([n]) => !BASICS.test(n)).map(([name, qty]) => ({ name, qty, have: Math.min(own(name), qty) }))
  const basics = deck.core.filter(([n]) => BASICS.test(n))
  const flex = (deck.flex || []).map(([name, pct, avg]) => ({ name, pct, avg, have: own(name) }))
  return { core, basics, flex, missing: core.reduce((s, c) => s + c.qty - c.have, 0), lists: deck.lists }
}
