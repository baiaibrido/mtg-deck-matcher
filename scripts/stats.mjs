// Statistiche calcolate ogni notte su tutte le liste dei tornei (non solo sulla lista rappresentativa):
// cuore della lista e posti liberi, carte in ascesa/in calo, side del meta, conversione in top 8, storico prezzi.

const WEEK = 7 * 864e5
const r1 = x => Math.round(x * 10) / 10

// Cuore della lista (carte in ≥ 90% delle liste) e posti liberi (25–90%) del main, con copie medie
export function coreFlex(list, { core = 0.9, flex = 0.25, maxFlex = 14 } = {}) {
  if (list.length < 5) return null
  const by = new Map()
  for (const e of list) for (const c of e.d.Mainboard || []) {
    const x = by.get(c.CardName) || { n: 0, q: 0 }; x.n++; x.q += c.Count; by.set(c.CardName, x)
  }
  const rows = [...by].map(([name, x]) => ({ name, rate: x.n / list.length, avg: x.q / x.n }))
  return {
    n: list.length,
    core: rows.filter(r => r.rate >= core).sort((a, b) => b.avg - a.avg || a.name.localeCompare(b.name)).map(r => [r.name, Math.round(r.avg)]),
    flex: rows.filter(r => r.rate >= flex && r.rate < core).sort((a, b) => b.rate - a.rate).slice(0, maxFlex).map(r => [r.name, Math.round(r.rate * 100), r1(r.avg)]),
  }
}

// Presenza settimanale delle carte (% di liste che le giocano), main o side
export function weeklyPresence(allE, part = 'Mainboard', weeks = 12) {
  const last = allE.reduce((m, e) => e.date > m ? e.date : m, '')
  if (!last) return { weeks: [], tot: [], by: new Map() }
  const end = Date.parse(last), tot = Array(weeks).fill(0), by = new Map()
  for (const e of allE) {
    const back = Math.floor((end - Date.parse(e.date)) / WEEK)
    if (back < 0 || back >= weeks) continue
    const i = weeks - 1 - back; tot[i]++
    for (const name of new Set((e.d[part] || []).map(c => c.CardName))) {
      let a = by.get(name); if (!a) { a = Array(weeks).fill(0); by.set(name, a) }
      a[i]++
    }
  }
  return { tot, by }
}
const pct = (counts, tot, from, to) => {
  let n = 0, t = 0
  for (let i = from; i < to; i++) { n += counts[i]; t += tot[i] }
  return t ? n / t * 100 : null
}

// Carte in ascesa / in calo: ultime 2 settimane contro le 4 precedenti (solo carte con presenza ≥ 3%)
export function cardTrends({ tot, by }, { isLand = () => false, top = 10, minPct = 3 } = {}) {
  const w = tot.length; if (w < 6 || tot.slice(-2).reduce((a, b) => a + b, 0) < 40) return { up: [], down: [] }
  const rows = []
  for (const [name, c] of by) {
    if (isLand(name)) continue
    const now = pct(c, tot, w - 2, w), before = pct(c, tot, w - 6, w - 2)
    if (now == null || before == null || Math.max(now, before) < minPct) continue
    rows.push([name, r1(now), r1(before), c.map((v, i) => tot[i] >= 20 ? r1(v / tot[i] * 100) : null)])
  }
  const d = r => r[1] - r[2]
  return {
    up: rows.filter(r => d(r) >= 2).sort((a, b) => d(b) - d(a)).slice(0, top),
    down: rows.filter(r => d(r) <= -2).sort((a, b) => d(a) - d(b)).slice(0, top),
  }
}

// Il side del meta: carte più presenti in sideboard nelle ultime 4 settimane, con la variazione sulle 4 prima
export function sideMeta({ tot, by }, { top = 20 } = {}) {
  const w = tot.length; if (w < 8) return []
  return [...by].map(([name, c]) => { const now = pct(c, tot, w - 4, w), before = pct(c, tot, w - 8, w - 4); return [name, r1(now ?? 0), r1((now ?? 0) - (before ?? 0))] })
    .filter(r => r[1] >= 2).sort((a, b) => b[1] - a[1]).slice(0, top)
}

// Conversione: quota tra tutte le liste dei tornei con classifica (no League) e quota tra i top 8
export function conversion(mainE, names) {
  const ranked = mainE.filter(e => e.rank < 99 && !/league/i.test(e.t?.Name || ''))
  const top = ranked.filter(e => e.rank <= 8)
  if (ranked.length < 100 || top.length < 40) return new Map()
  const count = (list, n) => list.reduce((s, e) => s + (e.name === n), 0)
  return new Map(names.map(n => { const f = count(ranked, n), t8 = count(top, n); return [n, f >= 5 ? [r1(f / ranked.length * 100), r1(t8 / top.length * 100), t8] : null] }))
}

// Storico prezzi (EUR, poi USD se manca) delle carte dei mazzi: un valore al giorno, ultimi `days` giorni
export function mergePrices(old, today, cards, days = 60) {
  const dates = [...(old?.dates || []).filter(d => d !== today), today].slice(-days)
  const keepFrom = (old?.dates || []).filter(d => d !== today).length - (dates.length - 1)
  const p = {}
  for (const [name, price] of Object.entries(cards)) {
    const prev = (old?.p?.[name] || []).slice(Math.max(0, keepFrom), (old?.dates || []).filter(d => d !== today).length)
    const pad = Array(dates.length - 1 - prev.length).fill(null)
    p[name] = [...pad, ...prev, price == null ? null : Math.round(price * 100) / 100]
  }
  return { dates, p }
}
