import { ColorPips } from './Mana.jsx'
import { TierBadge, Trend } from './Badges.jsx'
import { IconChevron, IconClip } from './Icons.jsx'
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
export const resultText = r => { const m = /^(\d+)\s*\w*\s*place$/i.exec(r.trim()); return m ? t('rogue.place', +m[1]) : r }

export function RogueInfo({ deck }) {
  return <>
    <span className="tier tier-rogue">Rogue</span>
    <span>{t('rogue.results', deck.results)}</span>
    {deck.best && <span>{t('rogue.best', resultText(deck.best))}</span>}
    {deck.signature && <span className="sig">{t('rogue.signature', deck.signature)}</span>}
  </>
}

// Stella per fissare il mazzo tra i preferiti (fuori dal pulsante della scheda: non si annidano pulsanti)
export function PinButton({ deck, pinned, onPin, className = 'pin-btn' }) {
  if (!onPin) return null
  const label = pinned ? t('pin.remove', deck.name) : t('pin.add', deck.name)
  return <button className={className} aria-pressed={pinned} aria-label={label} title={label} onClick={() => onPin(deck.id)}><IconClip size={18} filled={pinned} /></button>
}

// Preferiti in cima: una riga compatta per mazzo (posizione, nome, colori, percentuale). Il mazzo resta
// anche al suo posto in classifica, segnato con la graffetta, così la numerazione non ha buchi.
export function PinnedList({ ranked, colorsOf, onOpen, onPin, owned, cedh }) {
  return (
    <ol className="pins">
      {ranked.map(s => {
        const colors = colorsOf(s.deck)
        return (
          <li key={s.deck.id} data-deck={s.deck.id} className="pin-row" style={frameStyle(colors)}>
            <button className="pin-row-btn" onClick={() => onOpen(s.deck.id)}>
              {s.deck.rogue ? <span className="tier tier-rogue">Rogue</span> : <span className="pin-row-rank" aria-label={t('rank', s.rank)}>{s.rank}</span>}
              <span className="pin-row-name">{s.deck.name}</span>
              <ColorPips colors={colors} />
              <span className="pin-row-num">{owned ? <><b>{pct(s.score)}<small>%</small></b> {t(cedh ? 'complete.list' : 'complete')}</> : s.deck.share > 0 ? shareText(s.deck.share) : null}</span>
            </button>
            <PinButton deck={s.deck} pinned onPin={onPin} />
          </li>
        )
      })}
    </ol>
  )
}

function DeckRow({ s, rank, colors, cost, onOpen, index, top, pinned, onPin, owned, best, cedh }) {
  const missing = s.missing.reduce((t, r) => t + r.missing, 0)
  const price = costText(cost, missing)
  return (
    <li data-deck={s.deck.id} className={`deck${top ? ' deck-top' : ''}${pinned ? ' deck-pinned' : ''}${best ? ' deck-best' : ''}${owned ? '' : ' deck-plain'}`} style={{ ...frameStyle(colors), '--i': index }}>
      <PinButton deck={s.deck} pinned={pinned} onPin={onPin} />
      <button className="deck-btn" onClick={onOpen}>
        <span className="deck-rank" aria-label={t('rank', rank)}>{rank}</span>
        <span className="deck-main">
          <span className="deck-title">
            <span className="deck-name">{s.deck.name}</span>
            <ColorPips colors={colors} />
          </span>
          {/* sempre le stesse caselle (anche vuote): su schermi larghi i dati stanno in colonna da una riga all'altra */}
          <span className={`deck-sub${s.deck.rogue ? ' deck-sub-rogue' : ''}`}>
            {s.deck.rogue ? <RogueInfo deck={s.deck} /> : <>
              <span className="ds-tier"><TierBadge tier={s.deck.tier} /></span>
              <span className="ds-share">{s.deck.share > 0 && shareText(s.deck.share)}</span>
              <span className="ds-trend"><Sparkline values={s.deck.history} /><Trend share={s.deck.share} prev={s.deck.prev} prevDate={s.deck.prevDate} history={s.deck.history} /></span>
              <span className="ds-wr">{s.deck.metaWr != null && <span className="wr" title={t('info.wr')}>{t('wrShort', num(s.deck.metaWr))}</span>}</span>
              {s.deck.archetype && <span className="arch">{t('variantOf', s.deck.archetype)}</span>}
            </>}
            {deckBans(s.deck, getCached).length > 0 && <span className="ban-chip">⚠ {t('ban.short')}</span>}
          </span>
          {owned ? <>
            <span className="deck-meters">
              <Meter label="Main" {...s.main} />
              {s.side.total > 0 && <Meter label="Side" {...s.side} />}
            </span>
            <span className="deck-need">
              {missing ? <><span>{t(cedh ? 'need.list' : 'need', missing)[0]}<b>{missing}</b>{t(cedh ? 'need.list' : 'need', missing)[1]}</span>{price && <span className="price">{price}</span>}</> : <span className="done">{t('haveAll')}</span>}
            </span>
          </> : price && <span className="deck-need"><span className="price">{t('deckCost', price)}</span></span>}
        </span>
        {owned ? <span className="deck-score">
          <b>{pct(s.score)}<small>%</small></b>
          <span>{t(cedh ? 'complete.list' : 'complete')}</span>
          {!cedh && <span className="deck-score-sub">{t('completeSub')}</span>}
          {s.score >= 1 && <span className="stamp stamp-ok deck-stamp" aria-hidden="true">{t('stamp.complete')}</span>}
          {best && s.score < 1 && <span className="hand-note" aria-hidden="true">{t('note.closest')}</span>}
        </span> : null}
        <IconChevron className="deck-go" />
      </button>
    </li>
  )
}

export default function DeckList({ ranked, colorsOf, costOf, onOpen, animKey, highlightFirst = true, pins = [], onPin, owned = true, start = 0, bestId, cedh }) {
  return (
    <ol className="decks" key={animKey}>
      {ranked.map((s, i) => (
        <DeckRow key={s.deck.id} s={s} rank={s.rank ?? start + i + 1} index={Math.min(i, 8)} top={highlightFirst && i === 0}
          colors={colorsOf(s.deck)} cost={costOf(s)} onOpen={() => onOpen(s.deck.id)} pinned={pins.includes(s.deck.id)} onPin={onPin} owned={owned} best={bestId === s.deck.id} cedh={cedh} />
      ))}
    </ol>
  )
}
