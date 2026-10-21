import { useState } from 'react'
import { t, num, dayMonth } from '../i18n/index.js'

// Mini-grafico della quota settimanale nelle schede mazzo (solo decorativo: il dato è nel dettaglio)
export function Sparkline({ values }) {
  const pts = (values || []).map((v, i) => [i, v]).filter(([, v]) => v != null)
  if (pts.length < 3) return null
  // scala di almeno 2 punti di quota: un mazzo allo 0,5% stabile non deve sembrare un'altalena
  const n = values.length - 1, max = Math.max(...pts.map(p => p[1])), min = Math.min(...pts.map(p => p[1]))
  const range = Math.max(max - min, 2), lo = (max + min) / 2 - range / 2
  const y = v => 14 - (v - lo) / range * 12
  const d = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${(i / n * 46 + 1).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const up = pts.at(-1)[1] >= pts[0][1]
  return (
    <svg className={`spark ${up ? 'spark-up' : 'spark-down'}`} width="48" height="16" viewBox="0 0 48 16" aria-hidden="true">
      <path d={d} fill="none" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// Quota del meta nelle ultime settimane: una sola serie, crosshair + etichetta al passaggio del mouse/dito
export function HistoryChart({ weeks, values }) {
  const [hover, setHover] = useState(null)
  const pts = values.map((v, i) => [i, v]).filter(([, v]) => v != null)
  if (pts.length < 2) return <p className="hint">{t('hist.na')}</p>
  // il grafico sta in una colonna stretta (scala ~0,5): margini larghi e tacche tonde, così i numeri non si tagliano
  const W = 640, H = 220, L = 72, R = 14, T = 18, B = 42
  const max = Math.max(...pts.map(p => p[1]))
  const step = max <= 4 ? 1 : max <= 8 ? 2 : max <= 20 ? 5 : 10
  const top = Math.max(step * 2, Math.ceil(max / step) * step)
  const x = i => L + i / (values.length - 1) * (W - L - R)
  const y = v => T + (1 - v / top) * (H - T - B)
  const line = pts.map(([i, v], k) => `${k ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(pts.at(-1)[0]).toFixed(1)} ${y(0)} L${x(pts[0][0]).toFixed(1)} ${y(0)} Z`
  const pick = e => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left) / r.width * W - L) / (W - L - R) * (values.length - 1))
    setHover(Math.max(0, Math.min(values.length - 1, i)))
  }
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)
  const labelIdx = [0, Math.floor((values.length - 1) / 2), values.length - 1]
  const first = pts[0][1], last = pts.at(-1)[1]
  return (
    <figure className="hist">
      <figcaption>{t('hist.title')}</figcaption>
      <div className="hist-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('hist.aria', num(first), num(last))}
          onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
          {ticks.map(v => <g key={v}><line className="hist-grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text className="hist-axis" x={L - 12} y={y(v)} dominantBaseline="middle" textAnchor="end">{num(v)}%</text></g>)}
          {labelIdx.map(i => <text key={i} className="hist-axis" x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle'}>{dayMonth(weeks[i])}</text>)}
          <path className="hist-area" d={area} />
          <path className="hist-line" d={line} />
          <circle className="hist-dot" cx={x(pts.at(-1)[0])} cy={y(last)} r="4" />
          {hover != null && <>
            <line className="hist-cross" x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} />
            {values[hover] != null && <circle className="hist-dot" cx={x(hover)} cy={y(values[hover])} r="5" />}
          </>}
        </svg>
        {hover != null && (
          <div className="hist-tip" style={{ left: `${x(hover) / W * 100}%` }}>
            {t('hist.point', dayMonth(weeks[hover]), values[hover] == null ? t('hist.na') : `${num(values[hover])}%`)}
          </div>
        )}
      </div>
      {/* stessi dati in tabella per i lettori di schermo */}
      <table className="sr-only">
        <tbody>{weeks.map((w, i) => <tr key={w}><th scope="row">{dayMonth(w)}</th><td>{values[i] == null ? t('hist.na') : `${num(values[i])}%`}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

const wr = r => { const n = r[0] + r[1] + r[2]; return n ? (r[0] + r[2] / 2) / n * 100 : null }
const FEW = 10, SHOW = 12

// Contro cosa vince: % contro il meta (pesata), % contro tutti, e i singoli matchup
// (barra divergente attorno al 50%: piena a 25 punti di scarto, cioè 75% o 25%)
export function Matchups({ deck, onOpen, idOf }) {
  const [all, setAll] = useState(false)
  const n = deck.field ? deck.field[0] + deck.field[1] + deck.field[2] : 0
  if (!n) return <p className="empty">{t('mu.none')}</p>
  const rows = deck.mu || []
  const shown = all ? rows : rows.slice(0, SHOW)
  return (
    <section className="mu" aria-labelledby="mu-title">
      <h2 id="mu-title">{t('mu.title')}</h2>
      <div className="mu-head">
        {deck.metaWr != null && <p className="mu-big"><b>{num(deck.metaWr)}%</b> <span>{t('mu.meta')}</span><small>{t('mu.metaHint')}</small></p>}
        <p className="mu-field">{t('mu.field', num(wr(deck.field)), n.toLocaleString())}</p>
      </div>
      {rows.length > 0 && <ul className="mu-list">
        {shown.map(([vs, w, l, d]) => {
          const p = wr([w, l, d]), games = w + l + d, few = games < FEW
          const id = idOf(vs)
          return (
            <li key={vs} className={few ? 'few' : ''}>
              {id ? <button className="linklike mu-name" onClick={() => onOpen(id)}>{vs}</button> : <span className="mu-name">{vs}</span>}
              <span className="mu-bar" aria-hidden="true"><span className={p >= 50 ? 'pos' : 'neg'} style={{ '--w': `${Math.min(25, Math.abs(p - 50)) * 4}%` }} /></span>
              <span className="mu-num">{t('mu.row', num(p, 0), games)}{few && <em>, {t('mu.few')}</em>}</span>
            </li>
          )
        })}
      </ul>}
      {rows.length > SHOW && !all && <button className="btn btn-quiet" onClick={() => setAll(true)}>{t('mu.showAll', rows.length)}</button>}
      <p className="hint">{t('mu.note')}</p>
    </section>
  )
}
