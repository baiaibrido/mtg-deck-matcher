import { ColorPips } from './Mana.jsx'
import { TierBadge, Trend } from './Badges.jsx'
import { IconChevron, IconStar } from './Icons.jsx'
import { frameOf } from '../lib/deckInfo.js'
import { t, num } from '../i18n/index.js'
import { money } from '../lib/currency.js'
import { Sparkline } from './Charts.jsx'
import { deckBans } from '../lib/bans.js'
import { getCached } from '../lib/scryfall.js'

const pct = r => Math.round(r * 100)
export const shareText = s => t('share', num(s))

export function Meter({ label, have, total, ratio }) {
  return (
    <div className="meter">
      <span className="meter-label">{label}</span>
      <span className="meter-track" role="progressbar" aria-valuenow={pct(ratio)} aria-valuemin={0} aria-valuemax={100} aria-label={t('meterAria', label, have, total)}>
        <span className="meter-fill" style={{ '--v': ratio }} />
      </span>
      <span className="meter-num">{have}/{total}</span>
    </div>
  )
}

export const frameStyle = colors => { const f = frameOf(colors); return { '--c1': f.c1, '--c2': f.c2 } }

// Testo del costo per completare: "≈ 48 €", "≈ 48 € + 3 carte senza prezzo", null se non ancora noto
export function costText(cost, missing) {
  if (!missing) return null
  if (!cost || cost.known === 0) return null
  return `≈ ${money(cost.amount)}${cost.unknown ? t('costMore', cost.unknown) : ''}`
}

// Rogue: risultati della settimana e carta simbolo al posto di tier e quota
// "1st Place", "2st Place"… (come arrivano dai tornei) → "1° posto" nella lingua del sito
const resultText = r => { const m = /^(\d+)\s*\w*\s*place$/i.exec(r.trim()); return m ? t('rogue.place', +m[1]) : r }

export function RogueInfo({ deck }) {
  return <>
    <span className="tier tier-rogue">Rogue</span>
    <span>{t('rogue.results', deck.results)}{deck.best ? ` · ${t('rogue.best', resultText(deck.best))}` : ''}</span>
    {deck.signature && <span className="sig">{t('rogue.signature', deck.signature)}</span>}
  </>
}

// Stella per fissare il mazzo tra i preferiti (fuori dal pulsante della scheda: non si annidano pulsanti)
export function PinButton({ deck, pinned, onPin, className = 'pin-btn' }) {
  if (!onPin) return null
  const label = pinned ? t('pin.remove', deck.name) : t('pin.add', deck.name)
  return <button className={className} aria-pressed={pinned} aria-label={label} title={label} onClick={() => onPin(deck.id)}><IconStar size={18} filled={pinned} /></button>
}

function DeckRow({ s, rank, colors, cost, onOpen, index, top, pinned, onPin }) {
  const missing = s.missing.reduce((t, r) => t + r.missing, 0)
  const price = costText(cost, missing)
  return (
    <li className={`deck${top ? ' deck-top' : ''}${pinned ? ' deck-pinned' : ''}`} style={{ ...frameStyle(colors), '--i': index }}>
      <PinButton deck={s.deck} pinned={pinned} onPin={onPin} />
      <button className="deck-btn" onClick={onOpen}>
        <span className="deck-rank" aria-label={t('rank', rank)}>{rank}</span>
        <span className="deck-main">
          <span className="deck-title">
            <span className="deck-name">{s.deck.name}</span>
            <ColorPips colors={colors} />
          </span>
          <span className="deck-sub">
            {s.deck.rogue ? <RogueInfo deck={s.deck} /> : <>
              <TierBadge tier={s.deck.tier} />
              {s.deck.share > 0 && <span>{shareText(s.deck.share)}</span>}
              <Sparkline values={s.deck.history} />
              <Trend share={s.deck.share} prev={s.deck.prev} prevDate={s.deck.prevDate} />
              {s.deck.metaWr != null && <span className="wr">{t('wrShort', num(s.deck.metaWr))}</span>}
              {s.deck.archetype && <span className="arch">{t('variantOf', s.deck.archetype)}</span>}
            </>}
            {deckBans(s.deck, getCached).length > 0 && <span className="ban-chip">⚠ {t('ban.short')}</span>}
          </span>
          <span className="deck-meters">
            <Meter label="Main" {...s.main} />
            {s.side.total > 0 && <Meter label="Side" {...s.side} />}
          </span>
          <span className="deck-need">
            {missing ? <><span>{t('need', missing)[0]}<b>{missing}</b>{t('need', missing)[1]}</span>{price && <span className="price">{price}</span>}</> : <span className="done">{t('haveAll')}</span>}
          </span>
        </span>
        <span className="deck-score">
          <b>{pct(s.score)}<small>%</small></b>
          <span>{t('complete')}</span>
        </span>
        <IconChevron className="deck-go" />
      </button>
    </li>
  )
}

export default function DeckList({ ranked, colorsOf, costOf, onOpen, animKey, highlightFirst = true, pins = [], onPin }) {
  return (
    <ol className="decks" key={animKey}>
      {ranked.map((s, i) => (
        <DeckRow key={s.deck.id} s={s} rank={s.rank ?? i + 1} index={Math.min(i, 8)} top={highlightFirst && i === 0}
          colors={colorsOf(s.deck)} cost={costOf(s)} onOpen={() => onOpen(s.deck.id)} pinned={pins.includes(s.deck.id)} onPin={onPin} />
      ))}
    </ol>
  )
}
