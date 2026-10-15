import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/index.js'
import { ColorPips } from '../Mana.jsx'
import { TierBadge } from '../Badges.jsx'

// Mi sento fortunato: i nomi scorrono come una slot e si fermano su un mazzo a caso del formato
export default function Lucky({ pool, colorsOf, onOpen, onSpin }) {
  const [name, setName] = useState(null)
  const [deck, setDeck] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  if (!pool.length) return null

  const spin = () => {
    const final = pool[Math.floor(Math.random() * pool.length)]
    onSpin(); setDeck(null)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setName(final.name); setDeck(final); return }
    setSpinning(true)
    let step = 0
    const tick = () => {
      step++
      if (step >= 22) { setName(final.name); setDeck(final); setSpinning(false); return }
      setName(pool[Math.floor(Math.random() * pool.length)].name)
      timer.current = setTimeout(tick, 40 + step * step * 0.9)
    }
    tick()
  }

  return (
    <section className="panel play-lucky" aria-labelledby="lucky-title">
      <div className="play-head"><h2 id="lucky-title">{t('lucky.title')}</h2></div>
      <p className="play-intro">{t('lucky.intro')}</p>
      <div className={`slot${spinning ? ' spinning' : ''}${deck ? ' landed' : ''}`} aria-live="polite">
        <span className="slot-name">{name || '· · ·'}</span>
        {deck && <span className="slot-meta">{deck.rogue ? <span className="tier tier-rogue">Rogue</span> : <TierBadge tier={deck.tier} />}<ColorPips colors={colorsOf(deck)} /></span>}
      </div>
      <div className="row">
        <button className="btn btn-primary" onClick={spin} disabled={spinning}>🎰 {name ? t('lucky.again') : t('lucky.spin')}</button>
        {deck && <button className="btn" onClick={() => onOpen(deck.id)}>{t('lucky.open')} →</button>}
      </div>
    </section>
  )
}
