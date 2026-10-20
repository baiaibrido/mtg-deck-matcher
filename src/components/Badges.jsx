import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

// "?" con una riga di spiegazione: compare passandoci sopra o toccandolo (solo per le metriche del sito)
export function Info({ text, label }) {
  const [open, setOpen] = useState(false) // toccato o cliccato
  const [hover, setHover] = useState(false) // mouse sopra
  const [pos, setPos] = useState(null)
  const btn = useRef(null), pop = useRef(null), id = useId()
  const vis = open || hover
  // la nuvoletta sta in <body> con posizione fissa: non viene tagliata dai riquadri e resta dentro lo schermo
  useLayoutEffect(() => {
    if (!vis) { setPos(null); return }
    const r = btn.current.getBoundingClientRect(), w = pop.current.offsetWidth, h = pop.current.offsetHeight
    const W = document.documentElement.clientWidth, H = window.visualViewport?.height || innerHeight
    const bar = document.querySelector('.tabbar')?.getBoundingClientRect().height || 0
    const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, W - w - 8))
    const below = r.bottom + 8, above = r.top - 8 - h
    setPos({ left, top: below + h > H - bar - 8 && above > 8 ? above : below })
    const close = () => { setOpen(false); setHover(false) }
    addEventListener('scroll', close, true); addEventListener('resize', close)
    return () => { removeEventListener('scroll', close, true); removeEventListener('resize', close) }
  }, [vis])
  return (
    <span className={`info${vis ? ' open' : ''}`}>
      <button ref={btn} type="button" className="info-btn" aria-label={label || text} aria-expanded={open} aria-describedby={id}
        onPointerEnter={e => e.pointerType === 'mouse' && setHover(true)} onPointerLeave={e => e.pointerType === 'mouse' && setHover(false)}
        onFocus={e => e.target.matches(':focus-visible') && setHover(true)}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }} onBlur={() => { setOpen(false); setHover(false) }}
        onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setHover(false) } }}>?</button>
      {createPortal(<span ref={pop} id={id} className={`info-pop${vis && pos ? ' on' : ''}`} role="tooltip" style={pos || undefined}>{text}</span>, document.body)}
    </span>
  )
}
