import { ColorPips } from './Mana.jsx'
import { TierBadge, Trend } from './Badges.jsx'
import { IconClip, IconWarn } from './Icons.jsx'
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

// Una riga del tabulato. Da 900px ogni dato sta nella sua colonna, sotto l'intestazione stampata (StandingsHead);
// su telefono la riga è su tre righe: nome, dati, quanto manca; a destra il numero grande.
function DeckRow({ s, rank, colors, cost, onOpen, index, pinned, onPin, owned, best, cedh, metric }) {
  const missing = s.missing.reduce((t, r) => t + r.missing, 0)
  const price = costText(cost, missing)
  // senza collezione, su telefono, il numero grande a destra è quello dell'ordinamento scelto (quota, vittorie o costo)
  const big = !owned && metric ? bigFigure(metric, s.deck, cost) : null
  const sorted = k => metric === k ? ' is-sorted' : ''
  const need = t(cedh ? 'need.list' : 'need', missing)
  return (
    <li data-deck={s.deck.id} className={`deck${pinned ? ' deck-pinned' : ''}${best ? ' deck-best' : ''}${owned ? '' : ' deck-plain'}${s.deck.rogue ? ' deck-rogue' : ''}`} style={{ ...frameStyle(colors), '--i': index }}>
      <PinButton deck={s.deck} pinned={pinned} onPin={onPin} />
      <button className="deck-btn" onClick={onOpen}>
        <span className="deck-rank" aria-label={t('rank', rank)}>{rank}</span>
        <span className="deck-main">
          <span className="deck-title">
            <span className="deck-name">{s.deck.name}</span>
            <ColorPips colors={colors} />
            {deckBans(s.deck, getCached).length > 0 && <span className="ban-chip"><IconWarn size={13} />{t('ban.short')}</span>}
          </span>
          {s.deck.rogue ? <span className="deck-sub deck-sub-rogue"><RogueInfo deck={s.deck} /></span>
            : (s.deck.tier || s.deck.archetype) && <span className="deck-sub"><TierBadge tier={s.deck.tier} />{s.deck.archetype && <span className="arch">{t('variantOf', s.deck.archetype)}</span>}</span>}
        </span>
        {!s.deck.rogue && <span className="dc-stats">
          <span className={`dc dc-share${sorted('share')}`}>{s.deck.share > 0 && <>{num(s.deck.share)}%<span className="dc-lbl"> {t('big.share')}</span></>}</span>
          <span className="dc dc-trend"><Sparkline values={s.deck.history} /><Trend share={s.deck.share} prev={s.deck.prev} prevDate={s.deck.prevDate} history={s.deck.history} /></span>
          <span className={`dc dc-wr${sorted('meta')}`} title={t('info.wr')}>{s.deck.metaWr != null && <>{num(s.deck.metaWr)}%<span className="dc-lbl"> {t('big.meta')}</span></>}</span>
        </span>}
        <span className={`dc dc-cost${owned ? '' : sorted('cost')}`}>
          {owned ? (missing ? <><span className="dc-need"><span className="dc-lbl">{need[0]}</span><b>{missing}</b>{need[1]}</span>{price && <span className="price">{price}</span>}</> : <span className="done">{t('haveAll')}</span>)
            : price && <span className="price"><span className="dc-long">{t('deckCost', price)}</span><span className="dc-short">{price}</span></span>}
        </span>
        {owned ? <span className="deck-score">
          <b>{pct(s.score)}<small>%</small></b>
          <span className="deck-score-bar" aria-hidden="true"><span style={{ '--v': s.score }} /></span>
          {s.score >= 1 && <span className="stamp stamp-ok deck-stamp" aria-hidden="true">{t('stamp.complete')}</span>}
        </span> : big ? <span className={`deck-score deck-score-big deck-score-${metric}`}>
          <b>{big.value}{big.unit && <small>{big.unit}</small>}</b>
          <span>{big.label}</span>
        </span> : null}
      </button>
    </li>
  )
}

// I primi tre dell'ordine scelto: schede grandi, con le barre di main e side e il numero grande
function PodiumCard({ s, rank, colors, cost, onOpen, pinned, onPin, owned, best, cedh, metric }) {
  const missing = s.missing.reduce((t, r) => t + r.missing, 0)
  const price = costText(cost, missing)
  const big = owned ? { value: pct(s.score), unit: '%', label: t(cedh ? 'complete.list' : 'complete') } : bigFigure(metric || 'share', s.deck, cost)
  const need = t(cedh ? 'need.list' : 'need', missing)
  return (
    <li data-deck={s.deck.id} className={`pod${pinned ? ' deck-pinned' : ''}${best ? ' deck-best' : ''}`} style={frameStyle(colors)}>
      <PinButton deck={s.deck} pinned={pinned} onPin={onPin} />
      <button className="pod-btn" onClick={onOpen}>
        <span className="pod-top">
          <span className="pod-rank" aria-label={t('rank', rank)}>{rank}</span>
          {big && <span className="deck-score pod-score">
            <b>{big.value}{big.unit && <small>{big.unit}</small>}</b>
            <span>{big.label}</span>
            {owned && s.score >= 1 && <span className="stamp stamp-ok deck-stamp" aria-hidden="true">{t('stamp.complete')}</span>}
            {best && s.score < 1 && <span className="hand-note" aria-hidden="true">{t('note.closest')}</span>}
          </span>}
        </span>
        <span className="pod-title">
          <span className="deck-name">{s.deck.name}</span>
          <ColorPips colors={colors} />
        </span>
        <span className="deck-sub">
          {s.deck.rogue ? <RogueInfo deck={s.deck} /> : <>
            <TierBadge tier={s.deck.tier} />
            {s.deck.share > 0 && <span>{shareText(s.deck.share)}</span>}
            <span className="ds-trend"><Sparkline values={s.deck.history} /><Trend share={s.deck.share} prev={s.deck.prev} prevDate={s.deck.prevDate} history={s.deck.history} /></span>
            {s.deck.metaWr != null && <span className="wr" title={t('info.wr')}>{t('wrShort', num(s.deck.metaWr))}</span>}
          </>}
          {deckBans(s.deck, getCached).length > 0 && <span className="ban-chip"><IconWarn size={13} />{t('ban.short')}</span>}
        </span>
        {owned ? <>
          <span className="deck-meters">
            <Meter label="Main" {...s.main} />
            {s.side.total > 0 && <Meter label="Side" {...s.side} />}
          </span>
          <span className="deck-need">
            {missing ? <><span>{need[0]}<b>{missing}</b>{need[1]}</span>{price && <span className="price">{price}</span>}</> : <span className="done">{t('haveAll')}</span>}
          </span>
        </> : price && metric !== 'cost' && <span className="deck-need"><span className="price">{t('deckCost', price)}</span></span>}
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

// Intestazione stampata del tabulato (da 900px): il nome di ogni colonna, quella dell'ordine scelto sottolineata a penna
export function StandingsHead({ owned, metric }) {
  const on = k => metric === k ? ' is-sorted' : ''
  return (
    <div className={`standings-head${owned ? '' : ' deck-plain'}`} aria-hidden="true">
      <span>{t('col.rank')}</span><span>{t('col.deck')}</span>
      <span className={`dc${on('share')}`}>{t('col.share')}</span><span className="dc">{t('col.trend')}</span>
      <span className={`dc${on('meta')}`}>{t('col.wr')}</span><span className={`dc${on(owned ? '' : 'cost')}`}>{t(owned ? 'col.need' : 'col.cost')}</span>
      {owned && <span className={`dc${on('score')}`}>{t('col.done')}</span>}
    </div>
  )
}

export function Podium({ ranked, colorsOf, costOf, onOpen, pins = [], onPin, owned = true, bestId, cedh, metric }) {
  return (
    <ol className="podium">
      {ranked.map((s, i) => (
        <PodiumCard key={s.deck.id} s={s} rank={s.rank ?? i + 1} colors={colorsOf(s.deck)} cost={costOf(s)} onOpen={() => onOpen(s.deck.id)}
          pinned={pins.includes(s.deck.id)} onPin={onPin} owned={owned} best={bestId === s.deck.id} cedh={cedh} metric={metric} />
      ))}
    </ol>
  )
}

export default function DeckList({ ranked, colorsOf, costOf, onOpen, animKey, pins = [], onPin, owned = true, start = 0, bestId, cedh, metric }) {
  return (
    <ol className="decks" key={animKey}>
      {ranked.map((s, i) => (
        <DeckRow key={s.deck.id} s={s} rank={s.rank ?? start + i + 1} index={Math.min(i, 8)}
          colors={colorsOf(s.deck)} cost={costOf(s)} onOpen={() => onOpen(s.deck.id)} pinned={pins.includes(s.deck.id)} onPin={onPin} owned={owned} best={bestId === s.deck.id} cedh={cedh} metric={metric} />
      ))}
    </ol>
  )
}
