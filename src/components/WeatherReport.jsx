import { useMemo } from 'react'
import { t, num, dayMonth } from '../i18n/index.js'
import { bulletin, winds, arrivals, colorClimate } from '../lib/forecast.js'
import { WEATHER_WEEKS } from '../lib/fun.js'
import { colorName } from '../lib/deckInfo.js'
import { ColorPips } from './Mana.jsx'
import Spark from './Spark.jsx'
import SkyIcon from './SkyIcon.jsx'
import { Info } from './Badges.jsx'
import { More, PanelTitle } from './More.jsx'

const SKIES = ['sun', 'partly', 'cloud', 'rain', 'storm']

// Meteo del meta: i dati, calcolati una volta per la pagina Statistiche
export function useWeather(decks, colorsOf) {
  const rows = useMemo(() => bulletin(decks), [decks])
  const wind = useMemo(() => winds(decks), [decks])
  const moves = useMemo(() => arrivals(decks), [decks])
  const colors = colorClimate(decks, colorsOf) // dipende dai colori delle carte, che arrivano dopo
  const weeks = decks.find(d => d.historyWeeks)?.historyWeeks
  const hist = weeks?.length > WEATHER_WEEKS
  return { rows, wind, moves, colors, weeks, hist }
}

const linkTo = onOpen => d => <button className="linklike" onClick={() => onOpen(d.id)}>{d.name}</button>
export const Delta = ({ v }) => v == null ? null : <span className={`st-delta ${v > 0 ? 'up' : v < 0 ? 'down' : ''}`}>{v > 0 ? '+' : v < 0 ? '−' : '±'}{t('st.pts', num(Math.abs(v)))}</span>

// 1 · il bollettino: quota di oggi e come è cambiata, mazzo per mazzo
export function Bulletin({ w, colorsOf, onOpen }) {
  if (!w.rows.length) return null
  const link = linkTo(onOpen)
  const info = `${w.hist ? t('wx.intro', dayMonth(w.weeks[w.weeks.length - 1 - WEATHER_WEEKS]), dayMonth(w.weeks[w.weeks.length - 1])) : t('wx.introPrev')} ${t(w.hist ? 'wx.bulletin.intro' : 'wx.bulletin.introPrev')}`
  return (
    <section className="panel wx-bulletin" id="meteo">
      <PanelTitle info={info}>{t('wx.bulletin')}</PanelTitle>
      <p className="wx-legend">{SKIES.map(k => <span key={k}><SkyIcon sky={k} size={18} /> {t(`wx.sky.${k}`)}</span>)}</p>
      <More items={w.rows}>{rows => <ul className="st-rows wx-rows">
        {rows.map(x => (
          <li key={x.d.id}>
            <span className="wx-sky" role="img" aria-label={t(`wx.sky.${x.sky}`)}><SkyIcon sky={x.sky} /></span>
            <span className="st-name">{link(x.d)} <ColorPips colors={colorsOf(x.d)} /></span>
            {x.series ? <Spark values={x.series} className={x.delta > 0 ? 'up' : x.delta < 0 ? 'down' : ''} /> : <span />}
            <span className="st-num wx-num">{num(x.now)}% <Delta v={x.delta} /></span>
          </li>
        ))}
      </ul>}</More>
    </section>
  )
}

// 2 · i venti: chi sale e vince, chi sale ma perde, chi scende ma vince
export function Winds({ w, onOpen }) {
  const link = linkTo(onOpen)
  return (
    <section className="panel wx-winds-panel">
      <PanelTitle info={w.wind ? t('wx.winds.intro') : null}>{t('wx.winds')}</PanelTitle>
      {w.wind ? <div className="wx-winds">
        {['upWin', 'upLose', 'downWin'].map(k => (
          <div key={k} className={`wx-wind wx-${k}`}>
            <h3>{t(`wx.${k}`)} <Info text={t(`wx.${k}.d`)} label={t('info.label')} /></h3>
            {w.wind[k].length ? <More items={w.wind[k]}>{list => <ul>{list.map(x => (
              <li key={x.d.id}><span className="st-name">{link(x.d)}</span><span className="wx-wind-num"><Delta v={x.delta} /> <small>{t('wx.wr', num(x.wr))}</small></span></li>
            ))}</ul>}</More> : <p className="wx-empty">{t('wx.none')}</p>}
          </div>
        ))}
      </div> : <p className="st-note">{t('wx.winds.na')}</p>}
    </section>
  )
}

// arrivi e uscite tra i 15 più giocati
export function Moves({ w, onOpen }) {
  if (!w.hist) return null
  const link = linkTo(onOpen)
  const place = (then, now) => then == null ? t('wx.rank.new', now) : now == null ? t('wx.rank.gone', then) : t('wx.rank', then, now)
  return (
    <section className="panel">
      <PanelTitle info={t('wx.moves.intro')}>{t('wx.moves')}</PanelTitle>
      {w.moves ? <div className="wx-moves">
        {[['inn', 'wx.in'], ['out', 'wx.out']].map(([k, label]) => (
          <div key={k}>
            <h3>{t(label)}</h3>
            {w.moves[k].length ? <ul className="st-rows">{w.moves[k].map(x => (
              <li key={x.d.id} className="wx-move"><span className="st-name">{link(x.d)}</span><span className="st-muted">{place(x.then, x.now)}</span></li>
            ))}</ul> : <p className="wx-empty">{t('wx.none')}</p>}
          </div>
        ))}
      </div> : <p className="wx-empty">{t('wx.moves.none')}</p>}
    </section>
  )
}

// il clima dei colori
export function Colors({ w }) {
  if (!w.colors) return null
  return (
    <section className="panel">
      <PanelTitle info={t('wx.colors.intro')}>{t('wx.colors')}</PanelTitle>
      <ul className="st-rows wx-rows wx-colors">
        {w.colors.map(x => (
          <li key={x.c}>
            <ColorPips colors={[x.c]} />
            <span className="st-name">{colorName(x.c)}</span>
            {x.series ? <Spark values={x.series} className={`c-${x.c.toLowerCase()}`} /> : <span />}
            <span className="st-num wx-num">{num(x.now)}% <Delta v={x.delta} /></span>
          </li>
        ))}
      </ul>
    </section>
  )
}
