import { useEffect, useState } from 'react'
import { t, num } from '../i18n/index.js'
import { ColorPips } from './Mana.jsx'
import { Info } from './Badges.jsx'
import { IconChevron } from './Icons.jsx'
import { getCached } from '../lib/scryfall.js'
import { dayKey, untilMidnight } from '../lib/daily.js'
import { useLocal } from '../state/useLocal.js'
import LuckyButton from './LuckyButton.jsx'

// "Red Madness" → "R?? M??????": il nome si svela solo passandoci sopra
const mask = name => name.replace(/\p{L}+/gu, w => w[0] + '?'.repeat(w.length - 1))

// "Oggi nel meta": un solo riquadro con meteo, mazzo misterioso, i due giochi e Mi sento fortunato.
// Su telefono diventa una striscia: meteo in una riga e quattro tessere affiancate.
export default function TodayCard({ weather, daily, signature, dailyColors, format, onOpenDaily, onOpen, streak = 0, guess, onGame, luckyPool, onLucky }) {
  const [left, setLeft] = useState(untilMidnight())
  useEffect(() => { const id = setInterval(() => setLeft(untilMidnight()), 30000); return () => clearInterval(id) }, [])
  const [seen, setSeen] = useLocal('mdm.dailySeen', {})
  const key = `${format}|${dayKey()}`
  const fresh = daily && seen[format] !== key
  const sig = signature ? getCached(signature) : null
  const openDaily = () => { setSeen({ ...seen, [format]: key }); onOpenDaily(daily.id, fresh) }
  const link = d => <button className="linklike" onClick={() => onOpen(d.id)}>{d.name}</button>

  return (
    <section className="today" aria-labelledby="today-title">
      <h2 className="today-title" id="today-title">{t('today.title')}</h2>

      {weather && <div className="today-weather">
        <span className="today-label">{t('today.weather')} <Info text={t('info.weather')} label={t('info.label')} /></span>
        <ul>
          {weather.up && <li><span aria-hidden="true">☀️</span><span className="weather-word">{t('weather.up')}</span> {link(weather.up.d)} <span className="trend trend-up">+{num(weather.up.delta)}</span></li>}
          {weather.down && <li><span aria-hidden="true">⛈️</span><span className="weather-word">{t('weather.down')}</span> {link(weather.down.d)} <span className="trend trend-down">−{num(Math.abs(weather.down.delta))}</span></li>}
          <li className="weather-top"><span aria-hidden="true">🌤️</span><span className="weather-word">{t('weather.top')}</span> {link(weather.top)} <span className="weather-share">{num(weather.top.share)}%</span></li>
        </ul>
      </div>}

      <ul className="today-list">
        {daily && <li>
          <button className={`today-item today-mystery${fresh ? ' fresh' : ''}`} onClick={openDaily} aria-label={t('daily.aria', daily.name)}
            title={signature ? t('daily.sig', signature) : undefined}>
            <span className="today-icon mystery-mini" aria-hidden="true">
              {sig?.img && <img src={sig.img} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />}
              <span>?</span>
            </span>
            <span className="today-text">
              <b>{fresh && <span className="today-dot" />}<span className="t-long">{t('daily.label')}</span><span className="t-short">{t('today.mystery')}</span></b>
              <small className="today-sub">
                <span className="mystery-name"><span className="mystery-masked">{mask(daily.name)}</span><span className="mystery-real">{daily.name}</span><ColorPips colors={dailyColors} /></span>
                <span className="today-timer">{streak >= 2 && <span title={t('streak.title')}>🔥 {streak} · </span>}{t('daily.changes', left.h, left.m)}</span>
              </small>
            </span>
            <IconChevron className="today-go" />
          </button>
        </li>}
        <li>
          <button className="today-item" onClick={() => onGame('guess')} title={t('guess.sub')}>
            <span className="today-icon" aria-hidden="true">🔎</span>
            <span className="today-text">
              <b><span className="t-long">{t('guess.btn')}</span><span className="t-short">{t('guess.title')}</span>{' '}{guess ? <span className="pill-badge">{guess}</span> : <span className="pill-new">{t('guess.new')}</span>}</b>
              <small className="today-sub sub-hint">{t('guess.sub')}</small>
            </span>
            <IconChevron className="today-go" />
          </button>
        </li>
        <li>
          <button className="today-item" onClick={() => onGame('quiz')} title={t('quiz.sub')}>
            <span className="today-icon" aria-hidden="true">🪞</span>
            <span className="today-text">
              <b><span className="t-long">{t('quiz.btn')}</span><span className="t-short">{t('quiz.title')}</span></b>
              <small className="today-sub sub-hint">{t('quiz.sub')}</small>
            </span>
            <IconChevron className="today-go" />
          </button>
        </li>
        {luckyPool.length > 0 && <li><LuckyButton pool={luckyPool} onPick={onLucky} /></li>}
      </ul>
    </section>
  )
}
