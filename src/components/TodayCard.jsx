import { useEffect, useState } from 'react'
import { t, num } from '../i18n/index.js'
import { ColorPips } from './Mana.jsx'
import { Info } from './Badges.jsx'
import { IconChevron } from './Icons.jsx'
import { getCached } from '../lib/scryfall.js'
import { dayKey, untilMidnight, hash } from '../lib/daily.js'
import { useLocal } from '../state/useLocal.js'

// "Red Madness" → "R?? M??????": il nome si svela solo passandoci sopra
const mask = name => name.replace(/\p{L}+/gu, w => w[0] + '?'.repeat(w.length - 1))

// "Oggi nel meta": un solo riquadro con meteo, mazzo misterioso e i due giochi,
// ognuno con la sua riga di spiegazione (anche su telefono, dove il meteo sta in una riga)
export default function TodayCard({ weather, daily, signature, dailyColors, format, onOpenDaily, onOpen, onWeather, streak = 0, guess, onGame }) {
  const [left, setLeft] = useState(untilMidnight())
  useEffect(() => { const id = setInterval(() => setLeft(untilMidnight()), 30000); return () => clearInterval(id) }, [])
  const [seen, setSeen] = useLocal('mdm.dailySeen', {})
  // alla prima apertura del sito il tagliando «esce dalla stampante» riga per riga
  const [printing] = useState(() => { try { if (sessionStorage.getItem('mdm.printed')) return false; sessionStorage.setItem('mdm.printed', '1'); return true } catch { return false } })
  const key = `${format}|${dayKey()}`
  const fresh = daily && seen[format] !== key
  const sig = signature ? getCached(signature) : null
  const lines = t('daily.lines'), line = lines[hash(key) % lines.length]
  const openDaily = () => { setSeen({ ...seen, [format]: key }); onOpenDaily(daily.id, fresh) }
  const link = d => <button className="linklike" onClick={() => onOpen(d.id)}>{d.name}</button>

  return (
    <section className={`today${printing ? ' printing' : ''}`} aria-labelledby="today-title">
      <h2 className="today-title" id="today-title">{t('today.title')}</h2>

      {weather && <div className="today-weather">
        <span className="today-label">{t('today.weather')} <Info text={t('info.weather')} label={t('info.label')} /></span>
        <ul>
          {weather.up && <li><span aria-hidden="true">☀️</span><span className="weather-word">{t('weather.up')}</span> {link(weather.up.d)} <span className="trend trend-up">+{num(weather.up.delta)}</span></li>}
          {weather.down && <li><span aria-hidden="true">⛈️</span><span className="weather-word">{t('weather.down')}</span> {link(weather.down.d)} <span className="trend trend-down">−{num(Math.abs(weather.down.delta))}</span></li>}
          <li className="weather-top"><span aria-hidden="true">🌤️</span><span className="weather-word">{t('weather.top')}</span> {link(weather.top)} <span className="weather-share">{num(weather.top.share)}%</span></li>
        </ul>
        {onWeather && <button className="weather-more" onClick={onWeather}>{t('wx.open')} <IconChevron size={14} /></button>}
      </div>}

      <ul className="today-list">
        {daily && <li className="today-cell-mystery">
          <button className={`today-item today-mystery${fresh ? ' fresh' : ''}`} onClick={openDaily} aria-label={t('daily.aria', daily.name)}>
            <span className="today-icon mystery-mini" aria-hidden="true">
              {sig?.img && <img src={sig.img} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />}
              <span>?</span>
            </span>
            <span className="today-text">
              <b>{fresh && <span className="today-dot" />}{t('daily.label')}</b>
              <i className="mystery-line">{line}</i>
              <span className="mystery-name"><span className="mystery-masked">{mask(daily.name)}</span><span className="mystery-real">{daily.name}</span><ColorPips colors={dailyColors} /></span>
              {signature && <small className="today-sub mystery-sig">{t('daily.sig', signature)}</small>}
              <small className="today-sub">
                {daily.rogue ? <span>{t('rogue.results', daily.results)}</span> : daily.share > 0 && <span>{t('daily.share', num(daily.share))}</span>}
                {streak >= 2 && <span className="today-streak" title={t('streak.title')}>🔥 {streak}</span>}
                <span className="today-timer">{t('daily.changes', left.h, left.m)}</span>
              </small>
            </span>
            <IconChevron className="today-go" />
          </button>
        </li>}
        <li className="today-cell-guess">
          <button className="today-item" onClick={() => onGame('guess')}>
            <span className="today-icon" aria-hidden="true">🔎</span>
            <span className="today-text">
              <b>{t('guess.btn')}{' '}{guess ? <span className="pill-badge">{guess}</span> : <span className="pill-new">{t('guess.new')}</span>}</b>
              <small className="today-sub">{t('guess.sub')}</small>
            </span>
            <IconChevron className="today-go" />
          </button>
        </li>
        <li className="today-cell-quiz">
          <button className="today-item" onClick={() => onGame('quiz')}>
            <span className="today-icon" aria-hidden="true">🪞</span>
            <span className="today-text">
              <b>{t('quiz.btn')}</b>
              <small className="today-sub">{t('quiz.sub')}</small>
            </span>
            <IconChevron className="today-go" />
          </button>
        </li>
      </ul>
    </section>
  )
}
