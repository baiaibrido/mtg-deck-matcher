import { t, num, dayMonth } from '../i18n/index.js'

// Tier (metodo MTGdecks) e andamento della quota di meta rispetto al sync precedente
export function TierBadge({ tier }) {
  if (!tier) return null
  return <span className={`tier tier-${tier}`} title={`Tier ${tier}`}>Tier {tier}</span>
}

export function Trend({ share, prev, prevDate, history }) {
  if (!prevDate) return null
  // "nuovo" solo se il mazzo non compariva nemmeno nelle settimane precedenti (non solo fuori dalla classifica dell'ultimo sync)
  if (prev == null && (history || []).slice(0, -1).filter(v => v != null).length >= 2) return null
  if (prev == null) return <span className="trend trend-new" title={t('trend.newTitle')}>{t('trend.new')}</span>
  const d = Math.round((share - prev) * 10) / 10
  if (Math.abs(d) < 0.5) return <span className="trend trend-flat" title={t('trend.flatTitle')}>{t('trend.flat')}</span>
  const up = d > 0
  return (
    <span className={`trend ${up ? 'trend-up' : 'trend-down'}`} title={t('trend.title', `${up ? '+' : ''}${num(d)}`, dayMonth(prevDate))}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d={up ? 'M5 1 9 8H1z' : 'M5 9 1 2h8z'} fill="currentColor" /></svg>
      {up ? '+' : '−'}{num(Math.abs(d))}
    </span>
  )
}
