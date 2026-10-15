import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/index.js'

// Mi sento fortunato: i nomi dei mazzi scorrono nel pulsante, si fermano su uno a caso e lo aprono
export default function LuckyButton({ pool, onPick }) {
  const [name, setName] = useState(null)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  if (!pool.length) return null
  const spin = () => {
    if (name) return
    const final = pool[Math.floor(Math.random() * pool.length)]
    const land = () => { setName(final.name); timer.current = setTimeout(() => { setName(null); onPick(final) }, 600) }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return land()
    let step = 0
    const tick = () => {
      if (++step >= 14) return land()
      setName(pool[Math.floor(Math.random() * pool.length)].name)
      timer.current = setTimeout(tick, 40 + step * step * 0.9)
    }
    tick()
  }
  return (
    <button className={`lucky${name ? ' spinning' : ''}`} onClick={spin} aria-live="polite" title={t('lucky.hint')}>
      <span aria-hidden="true" className="lucky-icon">🌪️</span>
      <span className="lucky-text">{name || t('lucky.btn')}</span>
      {!name && <span className="lucky-sub">{t('lucky.sub')}</span>}
    </button>
  )
}
