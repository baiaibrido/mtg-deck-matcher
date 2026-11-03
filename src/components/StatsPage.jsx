import { useEffect, useMemo, useState } from 'react'
import { t, num } from '../i18n/index.js'
import { money } from '../lib/currency.js'
import { loadPrices } from '../lib/metaDecks.js'
import { health, valuePoints, bestBuys, converters, priceWatch } from '../lib/stats.js'
import { getCached } from '../lib/scryfall.js'
import { ColorPips } from './Mana.jsx'
import Spark from './Spark.jsx'
import { useWeather, Bulletin, Winds, Moves, Colors, Delta } from './WeatherReport.jsx'
import { More, PanelTitle } from './More.jsx'
import { useMedia } from '../state/useMedia.js'

// Grafico prezzo (x) / % contro il meta (y): un punto per mazzo, etichette solo sulla "frontiera"
function ValueChart({ points, onOpen }) {
  const [hover, setHover] = useState(null)
  const W = 680, H = 300, L = 46, R = 16, T = 14, B = 34
  const maxP = Math.max(...points.map(p => p.price)) * 1.05, wrs = points.map(p => p.wr)
  const lo = Math.floor(Math.min(...wrs) - 1), hi = Math.ceil(Math.max(...wrs) + 1)
  const x = p => L + p / maxP * (W - L - R), y = v => T + (hi - v) / (hi - lo) * (H - T - B)
  const step = maxP > 400 ? 100 : maxP > 150 ? 50 : 25
  const xt = Array.from({ length: Math.floor(maxP / step) + 1 }, (_, i) => i * step)
  const yt = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter(v => v % 2 === 0)
  const front = points.filter(p => p.frontier).sort((a, b) => a.price - b.price)
  // etichette della frontiera: se due si toccano, la seconda va sotto il punto
  const below = new Set(); let prev = null
  for (const p of front) { if (prev && Math.abs(x(p.price) - x(prev.price)) < 120 && Math.abs(y(p.wr) - y(prev.wr)) < 18 && !below.has(prev.s.deck.id)) below.add(p.s.deck.id); prev = p }
  const right = p => x(p.price) > W - R - 110
  const h = hover != null ? points[hover] : null
  return (
    <figure className="st-chart">
      <div className="st-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('st.value.aria')}>
          {yt.map(v => <g key={v}><line className="st-grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text className="st-axis" x={L - 8} y={y(v) + 4} textAnchor="end">{v}%</text></g>)}
          {xt.map(v => <text key={v} className="st-axis" x={x(v)} y={H - 10} textAnchor="middle">{money(v)}</text>)}
          <line className="st-mid" x1={L} x2={W - R} y1={y(50)} y2={y(50)} />
          <path className="st-front" d={front.map((p, i) => `${i ? 'L' : 'M'}${x(p.price).toFixed(1)} ${y(p.wr).toFixed(1)}`).join(' ')} />
          {points.map((p, i) => (
            <g key={p.s.deck.id} className={`st-dot${p.frontier ? ' front' : ''}${hover === i ? ' on' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onOpen(p.s.deck.id)}>
              <circle cx={x(p.price)} cy={y(p.wr)} r="14" className="st-hit" />
              <circle cx={x(p.price)} cy={y(p.wr)} r={p.frontier ? 6 : 4.5} />
              {p.frontier && <text className="st-label" x={x(p.price) + (right(p) ? -9 : 9)} y={y(p.wr) + (below.has(p.s.deck.id) ? 20 : -8)} textAnchor={right(p) ? 'end' : 'start'}>{p.s.deck.name}</text>}
            </g>
          ))}
        </svg>
        {h && <div className="st-tip" style={{ left: `${x(h.price) / W * 100}%`, top: `${y(h.wr) / H * 100}%` }}><b>{h.s.deck.name}</b><span>{num(h.wr)}%, {money(h.price)}</span></div>}
      </div>
      <figcaption className="st-cap">{t('st.value.cap')}</figcaption>
      <table className="sr-only"><tbody>{points.map(p => <tr key={p.s.deck.id}><th scope="row">{p.s.deck.name}</th><td>{num(p.wr)}%</td><td>{money(p.price)}</td></tr>)}</tbody></table>
    </figure>
  )
}

export default function StatsPage({ meta, ranked, format, formatName, colorsOf, costOf, hasCollection, onOpen }) {
  const [prices, setPrices] = useState(undefined)
  useEffect(() => { let alive = true; setPrices(undefined); loadPrices(format).then(p => alive && setPrices(p)); return () => { alive = false } }, [format])
  const decks = meta || [], st = meta?.stats
  const hl = useMemo(() => health(decks), [meta])
  const pts = useMemo(() => valuePoints(ranked, getCached, hasCollection ? costOf : null), [ranked, meta, hasCollection])
  const buys = hasCollection ? bestBuys(pts) : []
  const conv = converters(decks)
  const watch = priceWatch(st?.cardsUp, prices)
  const link = d => <button className="linklike" onClick={() => onOpen(d.id)}>{d.name}</button>
  const delta = v => <Delta v={v} />
  const w = useWeather(decks, colorsOf)
  const phone = useMedia('(max-width: 719px)') // sul telefono il grafico prezzo/vittorie diventa un elenco
  if (!meta) return <div className="decks skeleton" aria-busy="true" />

  // in sintesi: il mazzo che sale di più, quello che scende di più, la salute del formato, la carta in maggiore ascesa
  const moving = w.rows.filter(x => x.delta != null).sort((a, b) => b.delta - a.delta)
  const up = moving[0]?.delta > 0 ? moving[0] : null, down = moving.at(-1)?.delta < 0 ? moving.at(-1) : null
  const card = st?.cardsUp?.[0]
  const value = [...pts].filter(p => p.frontier).sort((a, b) => a.price - b.price)

  return (
    <div className="stats">
      <header className="page-head">
        <h1>{t('st.title', formatName)}</h1>
        <p>{t('st.intro')}</p>
      </header>

      <section className="st-summary" aria-label={t('st.sum')}>
        {up && <div className="st-tile"><span className="st-tile-k">{t('st.sum.up')}</span>{link(up.d)}<Delta v={up.delta} /></div>}
        {down && <div className="st-tile"><span className="st-tile-k">{t('st.sum.down')}</span>{link(down.d)}<Delta v={down.delta} /></div>}
        {hl?.now && <div className="st-tile st-tile-health"><span className="st-tile-k">{t('st.health')}</span><p className="st-hero"><b>{hl.now}</b> <span>{t('st.health.decks', hl.now)}</span></p><span className={`st-kind st-kind-${hl.kind}`}>{t(`st.health.${hl.kind}`)}</span></div>}
        {card && <div className="st-tile"><span className="st-tile-k">{t('st.sum.card')}</span><b className="st-tile-name">{card[0]}</b><span>{num(card[1])}% {delta(card[1] - card[2])}</span></div>}
      </section>

      {/* le sezioni in ordine di utilità per chi gioca; ognuna mostra le prime righe e «Mostra tutti» */}
      <Bulletin w={w} colorsOf={colorsOf} onOpen={onOpen} />
      <Winds w={w} onOpen={onOpen} />

      {pts.length >= 5 && <section className="panel st-value">
        <PanelTitle info={t('st.value.intro')}>{t('st.value')}</PanelTitle>
        {phone ? <More items={value}>{list => <ol className="st-rows st-value-list">{list.map(p => (
          <li key={p.s.deck.id}><span className="st-name">{link(p.s.deck)} <ColorPips colors={colorsOf(p.s.deck)} /></span><span className="st-muted">{t('wx.wr', num(p.wr))}</span><span className="st-num">{money(p.price)}</span></li>
        ))}</ol>}</More> : <ValueChart points={pts} onOpen={onOpen} />}
        {buys.length > 0 && <div className="st-buys">
          <h3>{t('st.buys')}</h3>
          <ul>{buys.map(b => <li key={b.budget}><span className="st-budget">{t('budget.max', money(b.budget))}</span> {link(b.p.s.deck)} <ColorPips colors={colorsOf(b.p.s.deck)} /> <span className="st-muted">{t('st.buys.row', num(b.p.wr), money(b.p.need, true))}</span></li>)}</ul>
        </div>}
      </section>}

      {!st && <p className="note">{t('st.limited')}</p>}
      {st && <div className="st-grid-2">
        <section className="panel">
          <PanelTitle info={t('st.trend.intro')}>{t('st.up')}</PanelTitle>
          <More items={st.cardsUp}>{list => <ul className="st-rows st-cards st-trendcards">{list.map(([n, now, before, wk]) => <li key={n}><span className="st-name">{n}</span><Spark values={wk} className="up" /><span className="st-num">{num(now)}% {delta(now - before)}</span></li>)}</ul>}</More>
        </section>
        <section className="panel">
          <PanelTitle info={prices?.dates?.length >= 2 ? t('st.watch.intro', prices.dates.length) : t('st.watch.wait')}>{t('st.watch')}</PanelTitle>
          <More items={watch}>{list => <ul className="st-rows st-cards st-watch">{list.map(x => (
            <li key={x.name} className={x.still ? 'still' : ''}>
              <span className="st-name">{x.name}</span>
              <span className="st-muted">{t('st.watch.pres', num(x.before), num(x.now))}</span>
              <span className="st-num">{x.price != null ? money(x.price, true) : getCached(x.name)?.eur != null ? money(getCached(x.name).eur, true) : '—'}
                {x.change != null && <small className={x.still ? 'st-still' : ''}>{x.still ? t('st.watch.still') : `${x.change >= 0 ? '+' : '−'}${num(Math.round(Math.abs(x.change)))}%`}</small>}</span>
            </li>
          ))}</ul>}</More>
          <p className="hint">{t('st.watch.hint')}</p>
        </section>
      </div>}

      {conv.length > 0 && <section className="panel st-conv">
        <PanelTitle info={t('st.conv.intro')}>{t('st.conv')}</PanelTitle>
        <More items={conv}>{list => <ul className="st-rows">
          {list.map(c => (
            <li key={c.d.id}>
              <span className="st-name">{link(c.d)}</span>
              <span className="st-bars" aria-hidden="true"><span className="b-field" style={{ width: `${c.field / Math.max(...conv.map(x => x.top8)) * 100}%` }} /><span className="b-top" style={{ width: `${c.top8 / Math.max(...conv.map(x => x.top8)) * 100}%` }} /></span>
              <span className="st-num">{t('st.times', num(Math.round(c.ratio * 10) / 10))}<small>{t('st.conv.row', num(c.field), num(c.top8))}</small></span>
            </li>
          ))}
        </ul>}</More>
        <p className="st-legend"><span className="k-field" />{t('st.conv.field')} <span className="k-top" />{t('st.conv.top')}</p>
      </section>}

      <div className="st-grid-2">
        <Colors w={w} />
        <Moves w={w} onOpen={onOpen} />
      </div>

      {hl?.now && <section className="panel st-health">
        <PanelTitle>{t('st.health')}</PanelTitle>
        <p className={`st-kind st-kind-${hl.kind}`}>{t(`st.health.${hl.kind}`)}</p>
        <p className="st-note">{t('st.health.top')} {hl.top.map((d, i, a) => <span key={d.id}>{i > 0 && ' '}<span className="nb">{link(d)}{i < a.length - 1 && ','}</span></span>)}.</p>
        {hl.series.filter(v => v != null).length > 2 && <p className="st-note st-trendline"><Spark values={hl.series} w={120} h={26} /> {t('st.health.weeks')}</p>}
      </section>}

      {st && <div className="st-grid-2">
        <section className="panel">
          <PanelTitle info={t('st.side.intro')}>{t('st.side')}</PanelTitle>
          <More items={st.side.slice(0, 15)}>{list => <ul className="st-rows st-cards">{list.map(([n, p, d]) => (
            <li key={n}><span className="st-name">{n}</span><span className="st-bar1" aria-hidden="true"><span style={{ width: `${p / st.side[0][1] * 100}%` }} /></span><span className="st-num">{num(p)}% {Math.abs(d) >= 1 && delta(d)}</span></li>
          ))}</ul>}</More>
        </section>
        <section className="panel">
          <PanelTitle info={t('st.trend.intro')}>{t('st.down')}</PanelTitle>
          <More items={st.cardsDown}>{list => <ul className="st-rows st-cards st-trendcards">{list.map(([n, now, before, wk]) => <li key={n}><span className="st-name">{n}</span><Spark values={wk} className="down" /><span className="st-num">{num(now)}% {delta(now - before)}</span></li>)}</ul>}</More>
        </section>
      </div>}
    </div>
  )
}
