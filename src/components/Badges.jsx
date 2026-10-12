// Tier (metodo MTGdecks) e andamento della quota di meta rispetto al sync precedente
export function TierBadge({ tier }) {
  if (!tier) return null
  return <span className={`tier tier-${tier}`} title={`Tier ${tier}`}>Tier {tier}</span>
}

export function Trend({ share, prev, prevDate }) {
  if (!prevDate) return null
  if (prev == null) return <span className="trend trend-new" title="Non era tra i più giocati al sync precedente">nuovo</span>
  const d = Math.round((share - prev) * 10) / 10
  if (Math.abs(d) < 0.5) return <span className="trend trend-flat" title="Stabile">stabile</span>
  const up = d > 0
  return (
    <span className={`trend ${up ? 'trend-up' : 'trend-down'}`} title={`${up ? '+' : ''}${String(d).replace('.', ',')} punti rispetto al ${new Date(prevDate + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d={up ? 'M5 1 9 8H1z' : 'M5 9 1 2h8z'} fill="currentColor" /></svg>
      {up ? '+' : '−'}{String(Math.abs(d)).replace('.', ',')}
    </span>
  )
}
