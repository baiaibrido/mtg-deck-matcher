import { useMemo } from 'react'
import { ColorPips } from './Mana.jsx'
import { TierBadge, Trend } from './Badges.jsx'
import { IconChevron, IconClip, IconWarn } from './Icons.jsx'
import { frameOf } from '../lib/deckInfo.js'
import { t, num } from '../i18n/index.js'
import { money } from '../lib/currency.js'
import { Sparkline } from './Charts.jsx'
import { deckBans } from '../lib/bans.js'
import { getCached } from '../lib/scryfall.js'
import { norm } from '../lib/normalize.js'
import { pickSignature } from '../lib/daily.js'

// L'illustrazione di un mazzo (come su MTGGoldfish): la sua carta più tipica, cioè quella che negli altri mazzi
// del formato c'è meno, ritagliata da Scryfall (art_crop). Senza immagine resta il riquadro nei colori del mazzo.
const isLand = n => /\bLand\b/.test(getCached(n)?.type || '')
export function useArtOf(decks) {
  const freq = useMemo(() => {
    const f = new Map()
    for (const d of decks || []) for (const k of new Set((d.main || []).map(c => norm(c.name)))) f.set(k, (f.get(k) || 0) + 1)
    return f
  }, [decks])
  return d => {
    const n = pickSignature(d.main || [], x => freq.get(norm(x)) || 0, isLand, d.name) || d.signature
    return getCached(n)?.img?.replace('/normal/', '/art_crop/') || null
  }
}
export const DeckArt = ({ src, className = 'deck-art' }) => (
  <span className={className} aria-hidden="true">{src && <img src={src} alt="" loading="lazy" onError={e => e.currentTarget.remove()} />}</span>
)

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

function DeckRow({ s, rank, colors, cost, onOpen, index, top, pinned, owned, best, cedh, metric, art, compact }) {
  const missing = s.missing.reduce((t, r) => t + r.missing, 0)
  const price = costText(cost, missing)
  // senza collezione il numero grande a destra è quello dell'ordinamento scelto (quota, vittorie o costo)
  const big = !owned && metric ? bigFigure(metric, s.deck, cost) : null
  const score = owned ? <span className="deck-score">
    <b>{pct(s.score)}<small>%</small></b>
    <span className="deck-score-bar" aria-hidden="true"><span style={{ '--v': s.score }} /></span>
    {!compact && <span>{t(cedh ? 'complete.list' : 'complete')}</span>}
    {!compact && !cedh && <span className="deck-score-sub">{t('completeSub')}</span>}
    {s.score >= 1 && <span className="stamp stamp-ok deck-stamp" aria-hidden="true">{t('stamp.complete')}</span>}
    {!compact && best && s.score < 1 && <span className="hand-note" aria-hidden="true">{t('note.closest')}</span>}
  </span> : big ? <span className={`deck-score deck-score-${metric}`}>
    <b>{big.value}{big.unit && <small>{big.unit}</small>}</b>
    {!compact && <span>{big.label}</span>}
  </span> : null
  // righe compatte (dopo le prime 25): posizione, illustrazione, nome e il numero
  if (compact) return (
    <li data-deck={s.deck.id} className={`deck deck-compact${pinned ? ' deck-pinned' : ''}`} style={frameStyle(colors)}>
      <button className="deck-btn" onClick={onOpen}>
        <span className="deck-rank" aria-label={t('rank', rank)}>{rank}</span>
        <DeckArt src={art} />
        <span className="deck-main"><span className="deck-title"><span className="deck-name">{s.deck.name}</span><ColorPips colors={colors} /></span></span>
        {score}
      </button>
    </li>
  )
  return (
    <li data-deck={s.deck.id} className={`deck${top ? ' deck-top' : ''}${pinned ? ' deck-pinned' : ''}${best ? ' deck-best' : ''}${owned || big ? '' : ' deck-plain'}`} style={{ ...frameStyle(colors), '--i': index }}>
      <button className="deck-btn" onClick={onOpen}>
        <span className="deck-rank" aria-label={t('rank', rank)}>{rank}</span>
        <DeckArt src={art} />
        <span className="deck-main">
          <span className="deck-title">
            <span className="deck-name">{s.deck.name}</span>
            <ColorPips colors={colors} />
          </span>
          {/* sempre le stesse caselle (anche vuote): su schermi larghi i dati stanno in colonna da una riga all'altra */}
          <span className={`deck-sub${s.deck.rogue ? ' deck-sub-rogue' : ''}`}>
            {s.deck.rogue ? <RogueInfo deck={s.deck} /> : <>
              <span className="ds-tier"><TierBadge tier={s.deck.tier} /></span>
              <span className="ds-share">{s.deck.share > 0 && metric !== 'share' && shareText(s.deck.share)}</span>
              <span className="ds-trend"><Sparkline values={s.deck.history} /><Trend share={s.deck.share} prev={s.deck.prev} prevDate={s.deck.prevDate} history={s.deck.history} /></span>
              <span className="ds-wr">{s.deck.metaWr != null && metric !== 'meta' && <span className="wr" title={t('info.wr')}>{t('wrShort', num(s.deck.metaWr))}</span>}</span>
              {s.deck.archetype && <span className="arch">{t('variantOf', s.deck.archetype)}</span>}
            </>}
            {deckBans(s.deck, getCached).length > 0 && <span className="ban-chip"><IconWarn size={13} />{t('ban.short')}</span>}
          </span>
          {owned ? <span className="deck-need">
            {missing ? <><span>{t(cedh ? 'need.list' : 'need', missing)[0]}<b>{missing}</b>{t(cedh ? 'need.list' : 'need', missing)[1]}</span>{price && <span className="price">{price}</span>}</> : <span className="done">{t('haveAll')}</span>}
          </span> : price && metric !== 'cost' && <span className="deck-need"><span className="price">{t('deckCost', price)}</span></span>}
        </span>
        {score}
        <IconChevron className="deck-go" />
      </button>
    </li>
  )
}

// Numero grande senza collezione: il valore dell'ordinamento scelto
function bigFigure(metric, deck, cost) {
  if (metric === 'share') return deck.share > 0 ? { value: num(deck.share), unit: '%', label: t('big.share') } : null
  if (metric === 'meta') return { value: deck.metaWr != null ? num(deck.metaWr) : '—', unit: deck.metaWr != null ? '%' : '', label: t('big.meta') }
  if (metric === 'cost') return cost?.known > 0 ? { value: money(cost.amount), unit: '', label: t('big.cost') } : null
  return null
}

export default function DeckList({ ranked, colorsOf, costOf, onOpen, animKey, highlightFirst = true, pins = [], owned = true, start = 0, bestId, cedh, metric, artOf = () => null, compactFrom = Infinity }) {
  return (
    <ol className="decks" key={animKey}>
      {ranked.map((s, i) => (
        <DeckRow key={s.deck.id} s={s} rank={s.rank ?? start + i + 1} index={Math.min(i, 8)} top={highlightFirst && i === 0} art={artOf(s.deck)} compact={start + i >= compactFrom}
          colors={colorsOf(s.deck)} cost={costOf(s)} onOpen={() => onOpen(s.deck.id)} pinned={pins.includes(s.deck.id)} owned={owned} best={bestId === s.deck.id} cedh={cedh} metric={metric} />
      ))}
    </ol>
  )
}
