import { Fragment } from 'react'
import { ColorPips } from './Mana.jsx'
import { TierBadge } from './Badges.jsx'
import { Meter, frameStyle, costText, shareText, bigFigure } from './DeckList.jsx'
import { IconChevron, IconClip, IconWarn } from './Icons.jsx'
import { t, num } from '../i18n/index.js'
import { deckBans } from '../lib/bans.js'
import { getCached } from '../lib/scryfall.js'

// Bozza della home: ogni mazzo si riconosce dall'illustrazione della sua carta tipica (come su MTGGoldfish),
// una riga dice la cosa che conta, a destra un solo numero grande.
const pct = r => Math.round(r * 100)
const missingOf = s => s.missing.reduce((n, r) => n + r.missing, 0)

function Art({ src, className }) {
  return <span className={className} aria-hidden="true">{src && <img src={src} alt="" loading="lazy" onError={e => { e.currentTarget.remove() }} />}</span>
}

// la riga sotto il nome: con la collezione quanto manca, senza i dati del mazzo
function Sub({ s, owned, cost, cedh }) {
  if (s.deck.rogue) return <span className="dl-sub">{t('rogue.results', s.deck.results)}</span>
  if (!owned) return <span className="dl-sub"><TierBadge tier={s.deck.tier} />{s.deck.metaWr != null && <span>{t('wrShort', num(s.deck.metaWr))}</span>}</span>
  const m = missingOf(s), price = costText(cost, m), need = t(cedh ? 'need.list' : 'need', m)
  return <span className="dl-sub">{m ? <><span>{need[0]}<mark>{m}</mark>{need[1]}</span>{price && <span>{price}</span>}</> : <span className="done">{t('haveAll')}</span>}</span>
}

function Figure({ s, owned, metric, cost }) {
  if (owned) return <span className="dl-num"><b>{pct(s.score)}<small>%</small></b><span className="dl-bar"><span style={{ '--v': s.score }} /></span></span>
  const big = bigFigure(metric || 'share', s.deck, cost)
  return big ? <span className="dl-num"><b>{big.value}{big.unit && <small>{big.unit}</small>}</b><span className="dl-num-lbl">{big.label}</span></span> : null
}

const Name = ({ s, colors }) => <span className="dl-name"><span>{s.deck.name}</span><ColorPips colors={colors} />{deckBans(s.deck, getCached).length > 0 && <IconWarn size={15} className="dl-ban" />}</span>

// il primo dell'ordine scelto: grande, con l'illustrazione in testa e un solo pulsante
export function HeroDeck({ s, colors, art, cost, owned, metric, cedh, onOpen }) {
  const big = owned ? null : bigFigure(metric || 'share', s.deck, cost)
  return (
    <article className="hero-deck" style={frameStyle(colors)}>
      <button className="hero-art" onClick={onOpen} aria-label={t('deck.open')}>
        <Art src={art} className="hero-img" />
        <span className="hero-rank" aria-label={t('rank', s.rank)}>{s.rank}</span>
        <span className="hero-title"><Name s={s} colors={colors} /></span>
      </button>
      <div className="hero-body">
        <p className="hero-num">
          {owned ? <><b>{pct(s.score)}<small>%</small></b><span>{t(cedh ? 'complete.list' : 'complete')}</span></>
            : big && <><b>{big.value}<small>{big.unit}</small></b><span>{big.label}</span></>}
          {owned && s.score >= 1 && <span className="stamp stamp-ok hero-stamp" aria-hidden="true">{t('stamp.complete')}</span>}
        </p>
        {owned && <div className="hero-meters"><Meter label="Main" {...s.main} />{s.side.total > 0 && <Meter label="Side" {...s.side} />}</div>}
        <Sub s={s} owned={owned} cost={cost} cedh={cedh} />
        {!owned && s.deck.share > 0 && metric !== 'share' && <span className="dl-sub">{shareText(s.deck.share)}</span>}
        <button className="btn btn-primary hero-go" onClick={onOpen}>{t('deck.open')}<IconChevron size={16} /></button>
      </div>
    </article>
  )
}

export function DeckLines({ list, colorsOf, artOf, costOf, owned, metric, cedh, onOpen, children, after = 5 }) {
  return (
    <ol className="dlines">
      {list.map((s, i) => <Fragment key={s.deck.id}>
        {i === after && children && <li className="dlines-extra">{children}</li>}
        <li style={frameStyle(colorsOf(s.deck))}>
          <button className="dline" onClick={() => onOpen(s.deck.id)}>
            <Art src={artOf(s.deck)} className="dline-art" />
            <span className="dline-rank" aria-label={t('rank', s.rank ?? i + 1)}>{s.rank ?? i + 1}</span>
            <span className="dline-main"><Name s={s} colors={colorsOf(s.deck)} /><Sub s={s} owned={owned} cost={costOf(s)} cedh={cedh} /></span>
            <Figure s={s} owned={owned} metric={metric} cost={costOf(s)} />
          </button>
        </li>
      </Fragment>)}
    </ol>
  )
}

// preferiti: una fila di etichette che si scorre
export function PinChips({ list, onOpen, owned }) {
  return (
    <section className="pin-chips" aria-label={t('pins.title')}>
      <IconClip size={18} filled />
      <ul>
        {list.map(s => <li key={s.deck.id}><button onClick={() => onOpen(s.deck.id)}>{s.deck.name}{owned && <b>{pct(s.score)}%</b>}</button></li>)}
      </ul>
    </section>
  )
}
