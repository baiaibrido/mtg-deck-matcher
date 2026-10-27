// Meteo completo del meta (pagina Statistiche): logica pura, testata in forecast.test.js.
// Confronto sempre tra l'ultima settimana e WEATHER_WEEKS settimane prima (come il riquadro in home).
import { deltaOf, WEATHER_WEEKS } from './fun.js'
import { WUBRG } from './deckInfo.js'

const metaOnly = decks => decks.filter(d => !d.rogue && d.source !== 'utente' && d.share > 0)
const r1 = v => Math.round(v * 10) / 10
const thenOf = d => { const h = d.history || [], i = h.length - 1 - WEATHER_WEEKS; return i >= 0 && h[i] != null ? h[i] : d.prev ?? null }

// Il tempo di un mazzo: punti di quota guadagnati o persi, con un occhio ai mazzi piccoli
// (da 0,8% a 2% è un balzo anche se sono «solo» 1,2 punti)
export function sky(delta, then) {
  if (delta == null) return 'cloud'
  const rel = then > 0 ? delta / Math.max(then, 1) : 0
  if (delta >= 1.5 || (delta >= 0.8 && rel >= 0.5)) return 'sun'
  if (delta >= 0.5) return 'partly'
  if (delta <= -1.5 || (delta <= -0.8 && rel <= -0.5)) return 'storm'
  if (delta <= -0.5) return 'rain'
  return 'cloud'
}
export const SKY_ICON = { sun: '☀️', partly: '🌤️', cloud: '☁️', rain: '🌧️', storm: '⛈️' }

// 1 · Bollettino: i mazzi di Tier 1 e 2 (o i più giocati se mancano i tier), dal più giocato
export function bulletin(decks) {
  const meta = metaOnly(decks)
  const tiered = meta.some(d => d.tier) ? meta.filter(d => d.tier && d.tier <= 2) : meta
  return tiered.sort((a, b) => b.share - a.share).map(d => {
    const delta = deltaOf(d), then = thenOf(d)
    return { d, now: d.share, then, delta: delta == null ? null : r1(delta), sky: sky(delta, then), series: d.history || null }
  })
}

// 2 · Venti: chi sale e vince, chi sale ma perde, chi scende ma vince (vittorie contro il meta)
export const WIND = { move: 0.5, win: 51, lose: 49, max: 4 }
export function winds(decks) {
  const rows = metaOnly(decks).filter(d => d.metaWr != null && d.share >= 0.5)
    .map(d => ({ d, delta: deltaOf(d), wr: d.metaWr })).filter(x => x.delta != null)
    .map(x => ({ ...x, delta: r1(x.delta) }))
  const pick = (f, by) => rows.filter(f).sort(by).slice(0, WIND.max)
  const out = {
    upWin: pick(x => x.delta >= WIND.move && x.wr >= WIND.win, (a, b) => b.delta - a.delta),
    upLose: pick(x => x.delta >= WIND.move && x.wr < WIND.lose, (a, b) => b.delta - a.delta),
    downWin: pick(x => x.delta <= -WIND.move && x.wr >= WIND.win, (a, b) => b.wr - a.wr),
  }
  return out.upWin.length || out.upLose.length || out.downWin.length ? out : null
}

// 3 · Nuovi arrivi e uscite: posizione in classifica (per quota) ora e WEATHER_WEEKS settimane fa
export const TOP = 15, FAR = 20
export function arrivals(decks) {
  const meta = metaOnly(decks).filter(d => d.history?.length > WEATHER_WEEKS)
  if (meta.length < TOP) return null
  const rankBy = val => { const s = meta.filter(d => val(d) > 0).sort((a, b) => val(b) - val(a)); return d => { const i = s.indexOf(d); return i < 0 ? null : i + 1 } }
  const nowR = rankBy(d => d.share), thenR = rankBy(d => thenOf(d) || 0)
  const rows = meta.map(d => ({ d, now: nowR(d), then: thenR(d) }))
  const inn = rows.filter(x => x.now && x.now <= TOP && (x.then == null || x.then > FAR)).sort((a, b) => a.now - b.now)
  const out = rows.filter(x => x.then && x.then <= TOP && (x.now == null || x.now > FAR)).sort((a, b) => a.then - b.then)
  return inn.length || out.length ? { inn, out } : null
}

// 4 · Il clima dei colori: quota del meta dei mazzi che hanno quel colore tra i principali, settimana per settimana
// (un mazzo a due colori conta per entrambi: «il 31% del meta gioca rosso»)
export function colorClimate(decks, colorsOf) {
  const meta = metaOnly(decks)
  const weeks = Math.max(0, ...meta.map(d => d.history?.length || 0))
  const by = Object.fromEntries(WUBRG.map(c => [c, { c, now: 0, series: Array(weeks).fill(0) }]))
  let known = 0
  for (const d of meta) {
    const cols = colorsOf(d)
    if (!cols) continue
    known += d.share
    for (const c of cols.main || cols) {
      by[c].now += d.share
      ;(d.history || []).forEach((v, i) => { if (v != null) by[c].series[i] += v })
    }
  }
  const total = meta.reduce((t, d) => t + d.share, 0)
  if (!total || known / total < 0.8) return null // colori ancora in caricamento
  const rows = WUBRG.map(c => {
    const x = by[c], then = weeks > WEATHER_WEEKS ? x.series[weeks - 1 - WEATHER_WEEKS] : null
    const last = weeks ? x.series[weeks - 1] : null
    return { c, now: r1(x.now), series: weeks > 2 ? x.series.map(r1) : null, delta: then != null && last != null ? r1(last - then) : null }
  })
  return rows.sort((a, b) => b.now - a.now)
}
