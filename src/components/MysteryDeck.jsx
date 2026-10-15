import { useEffect, useState } from 'react'
import { t, num } from '../i18n/index.js'
import { ColorPips } from './Mana.jsx'
import { getCached } from '../lib/scryfall.js'
import { dayKey, untilMidnight } from '../lib/daily.js'
import { useLocal } from '../state/useLocal.js'

const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
// "Red Madness" → "R?? M??????": il nome si svela solo passandoci sopra
const mask = name => name.replace(/\p{L}+/gu, w => w[0] + '?'.repeat(w.length - 1))

// Mazzo misterioso del giorno, accanto al titolo della pagina mazzi
export default function MysteryDeck({ deck, signature, colors, format, onOpen }) {
  const [left, setLeft] = useState(untilMidnight())
  useEffect(() => { const id = setInterval(() => setLeft(untilMidnight()), 30000); return () => clearInterval(id) }, [])
  const [seen, setSeen] = useLocal('mdm.dailySeen', {})
  const key = `${format}|${dayKey()}`
  const fresh = seen[format] !== key
  const lines = t('daily.lines')
  const line = lines[hash(key) % lines.length]
  const card = signature ? getCached(signature) : null
  const open = () => { setSeen({ ...seen, [format]: key }); onOpen(deck.id) }

  return (
    <button className={`mystery${fresh ? ' fresh' : ''}`} onClick={open} aria-label={t('daily.aria', deck.name)} title={t('daily.reveal')}>
      <span className="mystery-glow" aria-hidden="true" />
      <span className="mystery-bg" aria-hidden="true" />
      <span className="mystery-art" aria-hidden="true">
        <span className="mystery-back" />
        {card?.img && <img src={card.img} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />}
        <span className="mystery-q">?</span>
      </span>
      <span className="mystery-body">
        <span className="mystery-label">
          {fresh && <span className="mystery-dot" />}{t('daily.label')}
        </span>
        <span className="mystery-line">{line}</span>
        <span className="mystery-name">
          <span className="mystery-masked">{mask(deck.name)}</span>
          <span className="mystery-real">{deck.name}</span>
          <ColorPips colors={colors} />
        </span>
        {signature && <span className="mystery-sig">{t('daily.sig', signature)}</span>}
        <span className="mystery-meta">
          {deck.rogue ? <span>{t('rogue.results', deck.results)}</span> : deck.share > 0 && <span>{t('daily.share', num(deck.share))}</span>}
          <span className="mystery-timer">⏳ {t('daily.only')} · {t('daily.changes', left.h, left.m)}</span>
        </span>
        <span className="mystery-cta">{t('daily.cta')} <span aria-hidden="true">→</span></span>
      </span>
    </button>
  )
}
