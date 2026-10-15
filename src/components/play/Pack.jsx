import { useState } from 'react'
import { t } from '../../i18n/index.js'
import { openPack } from '../../lib/fun.js'
import CardFace from './CardFace.jsx'

// Apri una bustina: 5 carte del meta del formato, una "rara" (carta caratteristica di un mazzo)
export default function Pack({ decks, isLand, onOpen, onPack }) {
  const [cards, setCards] = useState(null)
  const [n, setN] = useState(0)
  const open = () => { setCards(openPack(decks, Math.random, isLand)); setN(x => x + 1); onPack() }
  return (
    <section className="panel play-pack" aria-labelledby="pack-title">
      <div className="play-head"><h2 id="pack-title">{t('pack.title')}</h2></div>
      <p className="play-intro">{t('pack.intro')}</p>
      {cards && <ul className="pack-cards" key={n}>
        {cards.map((c, i) => (
          <li key={c.name} style={{ '--i': i }}>
            <button className="pack-card" onClick={() => onOpen(c.deck.id)} title={t('pack.from', c.deck.name)}>
              <CardFace name={c.name} className={c.rare ? 'foil' : ''}>{c.rare && <span className="pack-rare">{t('pack.rare')}</span>}</CardFace>
              <span className="pack-from">{c.deck.name}</span>
            </button>
          </li>
        ))}
      </ul>}
      <div className="row"><button className="btn btn-primary" onClick={open}>🎁 {cards ? t('pack.again') : t('pack.open')}</button></div>
    </section>
  )
}
