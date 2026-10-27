import { useMemo, useState } from 'react'
import { t, num, dayMonth } from '../i18n/index.js'
import { bulletin, winds, arrivals, colorClimate, SKY_ICON } from '../lib/forecast.js'
import { WEATHER_WEEKS } from '../lib/fun.js'
import { colorName } from '../lib/deckInfo.js'
import { ColorPips } from './Mana.jsx'
import Spark from './Spark.jsx'

const SHOW = 12 // righe del bollettino prima di «Mostra tutti»
const SKIES = ['sun', 'partly', 'cloud', 'rain', 'storm']

// Meteo completo del meta, in cima alle Statistiche (dal riquadro «Meteo del meta» della home)
export default function WeatherReport({ decks, colorsOf, onOpen }) {
  const [all, setAll] = useState(false)
  const rows = useMemo(() => bulletin(decks), [decks])
  const wind = useMemo(() => winds(decks), [decks])
  const moves = useMemo(() => arrivals(decks), [decks])
  const colors = colorClimate(decks, colorsOf) // dipende dai colori delle carte, che arrivano dopo
  if (!rows.length) return null

  const weeks = decks.find(d => d.historyWeeks)?.historyWeeks
  const hist = weeks?.length > WEATHER_WEEKS
  const link = d => <button className="linklike" onClick={() => onOpen(d.id)}>{d.name}</button>
  const delta = v => v == null ? null : <span className={`st-delta ${v > 0 ? 'up' : v < 0 ? 'down' : ''}`}>{v > 0 ? '+' : v < 0 ? '−' : '±'}{num(Math.abs(v))}</span>
  const place = (then, now) => then == null ? t('wx.rank.new', now) : now == null ? t('wx.rank.gone', then) : t('wx.rank', then, now)

  return (
    <section className="st-weather" id="meteo" aria-labelledby="wx-title">
      <header className="wx-head">
        <h2 id="wx-title">{t('wx.title')}</h2>
        <p>{hist ? t('wx.intro', dayMonth(weeks[weeks.length - 1 - WEATHER_WEEKS]), dayMonth(weeks[weeks.length - 1])) : t('wx.introPrev')}</p>
      </header>

      {/* 1 · bollettino */}
      <section className="panel wx-bulletin">
        <h2>{t('wx.bulletin')}</h2>
        <p className="st-note">{t(hist ? 'wx.bulletin.intro' : 'wx.bulletin.introPrev')}</p>
        <p className="wx-legend">{SKIES.map(k => <span key={k}><span aria-hidden="true">{SKY_ICON[k]}</span> {t(`wx.sky.${k}`)}</span>)}</p>
        <ul className="st-rows wx-rows">
          {(all ? rows : rows.slice(0, SHOW)).map(x => (
            <li key={x.d.id}>
              <span className="wx-sky" role="img" aria-label={t(`wx.sky.${x.sky}`)}>{SKY_ICON[x.sky]}</span>
              <span className="st-name">{link(x.d)} <ColorPips colors={colorsOf(x.d)} /></span>
              {x.series ? <Spark values={x.series} className={x.delta > 0 ? 'up' : x.delta < 0 ? 'down' : ''} /> : <span />}
              <span className="st-num wx-num">{num(x.now)}% {delta(x.delta)}</span>
            </li>
          ))}
        </ul>
        {rows.length > SHOW && <button className="linklike wx-more" onClick={() => setAll(!all)}>{all ? t('wx.less') : t('mu.showAll', rows.length)}</button>}
      </section>

      {/* 2 · venti */}
      <section className="panel wx-winds-panel">
        <h2>{t('wx.winds')}</h2>
        {wind ? <>
          <p className="st-note">{t('wx.winds.intro')}</p>
          <div className="wx-winds">
            {['upWin', 'upLose', 'downWin'].map(k => (
              <div key={k} className={`wx-wind wx-${k}`}>
                <h3>{t(`wx.${k}`)}</h3>
                <p className="hint">{t(`wx.${k}.d`)}</p>
                {wind[k].length ? <ul>{wind[k].map(x => (
                  <li key={x.d.id}><span className="st-name">{link(x.d)}</span><span className="wx-wind-num">{delta(x.delta)} <small>{t('wx.wr', num(x.wr))}</small></span></li>
                ))}</ul> : <p className="wx-empty">{t('wx.none')}</p>}
              </div>
            ))}
          </div>
        </> : <p className="st-note">{t('wx.winds.na')}</p>}
      </section>

      <div className="st-grid-2">
        {/* 3 · arrivi e uscite */}
        {hist && <section className="panel">
          <h2>{t('wx.moves')}</h2>
          <p className="st-note">{t('wx.moves.intro')}</p>
          {moves ? <div className="wx-moves">
            {[['inn', 'wx.in'], ['out', 'wx.out']].map(([k, label]) => (
              <div key={k}>
                <h3>{t(label)}</h3>
                {moves[k].length ? <ul className="st-rows">{moves[k].map(x => (
                  <li key={x.d.id} className="wx-move"><span className="st-name">{link(x.d)}</span><span className="st-muted">{place(x.then, x.now)}</span></li>
                ))}</ul> : <p className="wx-empty">{t('wx.none')}</p>}
              </div>
            ))}
          </div> : <p className="wx-empty">{t('wx.moves.none')}</p>}
        </section>}

        {/* 4 · colori */}
        {colors && <section className="panel">
          <h2>{t('wx.colors')}</h2>
          <p className="st-note">{t('wx.colors.intro')}</p>
          <ul className="st-rows wx-rows wx-colors">
            {colors.map(x => (
              <li key={x.c}>
                <ColorPips colors={[x.c]} />
                <span className="st-name">{colorName(x.c)}</span>
                {x.series ? <Spark values={x.series} className={`c-${x.c.toLowerCase()}`} /> : <span />}
                <span className="st-num wx-num">{num(x.now)}% {delta(x.delta)}</span>
              </li>
            ))}
          </ul>
        </section>}
      </div>
    </section>
  )
}
