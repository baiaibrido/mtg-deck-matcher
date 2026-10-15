import { getCached } from '../../lib/scryfall.js'
import { ManaCost } from '../Mana.jsx'

// Carta (immagine Scryfall o segnaposto col nome), stessa forma delle tessere del sito
export default function CardFace({ name, hidden = false, className = '', children }) {
  const c = name ? getCached(name) : null
  return (
    <span className={`tile play-card${hidden ? ' play-card-back' : ''} ${className}`}>
      {hidden ? <span className="play-back" aria-hidden="true">?</span>
        : c?.img ? <img src={c.img} alt={name} loading="lazy" onError={e => { e.currentTarget.replaceWith(Object.assign(document.createElement('span'), { className: 'tile-ph', textContent: name })) }} />
        : <span className="tile-ph"><span>{name}</span><ManaCost cost={c?.cost} /></span>}
      {children}
    </span>
  )
}
