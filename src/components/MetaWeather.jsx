import { t, num } from '../i18n/index.js'
import { Info } from './Badges.jsx'

// Meteo del meta: chi sale, chi scende e chi resta in vetta rispetto all'aggiornamento precedente
export default function MetaWeather({ w, onOpen, children }) {
  const link = d => <button className="linklike" onClick={() => onOpen(d.id)}>{d.name}</button>
  return (
    <div className="weather">
      <span className="weather-label">{t('weather.title')} <Info text={t('info.weather')} label={t('info.label')} /></span>
      <ul>
        {w.up && <li><span aria-hidden="true">☀️</span><span className="weather-word">{t('weather.up')}</span> {link(w.up.d)} <span className="trend trend-up">+{num(w.up.delta)}</span></li>}
        {w.down && <li><span aria-hidden="true">⛈️</span><span className="weather-word">{t('weather.down')}</span> {link(w.down.d)} <span className="trend trend-down">−{num(Math.abs(w.down.delta))}</span></li>}
        <li className="weather-top"><span aria-hidden="true">🌤️</span>{t('weather.top')} {link(w.top)} <span className="weather-share">{num(w.top.share)}%</span></li>
      </ul>
      {children}
    </div>
  )
}
