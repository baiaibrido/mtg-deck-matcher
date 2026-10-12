import { ColorPips } from './Mana.jsx'
import { IconChevron } from './Icons.jsx'
import { frameOf } from '../lib/deckInfo.js'

const pct = r => Math.round(r * 100)

export function Meter({ label, have, total, ratio }) {
  return (
    <div className="meter">
      <span className="meter-label">{label}</span>
      <span className="meter-track" role="progressbar" aria-valuenow={pct(ratio)} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${have} su ${total}`}>
        <span className="meter-fill" style={{ '--v': ratio }} />
      </span>
      <span className="meter-num">{have}/{total}</span>
    </div>
  )
}

export const frameStyle = colors => { const f = frameOf(colors); return { '--c1': f.c1, '--c2': f.c2 } }

function DeckRow({ s, rank, colors, onOpen, index }) {
  const missing = s.missing.reduce((t, r) => t + r.missing, 0)
  return (
    <li className={`deck${rank === 1 ? ' deck-top' : ''}`} style={{ ...frameStyle(colors), '--i': index }}>
      <button className="deck-btn" onClick={onOpen}>
        <span className="deck-rank" aria-label={`Posizione ${rank}`}>{rank}</span>
        <span className="deck-main">
          <span className="deck-title">
            <span className="deck-name">{s.deck.name}</span>
            <ColorPips colors={colors} />
          </span>
          <span className="deck-sub">
            {s.deck.share > 0 && <span>{String(s.deck.share).replace('.', ',')}% del meta</span>}
            <span className={missing ? 'need' : 'done'}>{missing ? `Ti mancano ${missing} carte` : 'Hai tutte le carte'}</span>
          </span>
          <span className="deck-meters">
            <Meter label="Main" {...s.main} />
            {s.side.total > 0 && <Meter label="Side" {...s.side} />}
          </span>
        </span>
        <span className="deck-score">
          <b>{pct(s.score)}<small>%</small></b>
          <span>completo</span>
        </span>
        <IconChevron className="deck-go" />
      </button>
    </li>
  )
}

export default function DeckList({ ranked, colorsOf, onOpen, format }) {
  return (
    <ol className="decks" key={format}>
      {ranked.map((s, i) => (
        <DeckRow key={s.deck.id} s={s} rank={i + 1} index={i} colors={colorsOf(s.deck)} onOpen={() => onOpen(s.deck.id)} />
      ))}
    </ol>
  )
}
