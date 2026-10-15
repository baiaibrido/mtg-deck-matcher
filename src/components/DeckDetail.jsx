import ConfirmButton from './ConfirmButton.jsx'
import DeckInsights, { ConvLine } from './DeckInsights.jsx'
import { useMemo, useState } from 'react'
import { Meter, frameStyle, shareText, costText, RogueInfo, PinButton } from './DeckList.jsx'
import { TierBadge, Trend } from './Badges.jsx'
import { ColorPips, ManaCost } from './Mana.jsx'
import { IconBack, IconCopy, IconCart, IconDownload, IconExternal, IconCheck, IconGrid, IconList } from './Icons.jsx'
import { useLocal } from '../state/useLocal.js'
import { getCached } from '../lib/scryfall.js'
import { GROUPS, groupOf, missingCost } from '../lib/deckInfo.js'
import { t } from '../i18n/index.js'
import { money, priceOf, priceSource } from '../lib/currency.js'
import { toText, tcgplayerUrl, downloadTxt } from '../lib/export.js'
import { HistoryChart, Matchups } from './Charts.jsx'
import { deckBans } from '../lib/bans.js'

const GROUP_ORDER = [...GROUPS.map(([k]) => k), 'other']
const scryUrl = name => getCached(name)?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${name}"`)}`

function CardTile({ r }) {
  const c = getCached(r.name)
  const st = r.missing === 0 ? 'ok' : r.have === 0 ? 'no' : 'part'
  const label = st === 'ok' ? t('tile.owned') : st === 'no' ? t('tile.missing') : t('tile.partial', r.have)
  return (
    <a className={`tile tile-${st}`} href={scryUrl(r.name)} target="_blank" rel="noreferrer" title={`${r.name} — ${label}`}>
      {c?.img ? <img src={c.img} alt={r.name} loading="lazy" /> : <span className="tile-ph"><span>{r.name}</span><ManaCost cost={c?.cost} /></span>}
      <span className="tile-qty">{st === 'ok' && <IconCheck size={13} />}{r.have}/{r.qty}</span>
    </a>
  )
}

// Anteprima della carta al passaggio del mouse sul nome (solo con mouse: su touch il link apre Scryfall)
let setPreview = () => {}
const canHover = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches
export const hoverProps = name => canHover ? {
  onMouseEnter: e => { const c = getCached(name); if (c?.img) setPreview({ img: c.img, name, x: e.clientX, y: e.clientY }) },
  onMouseMove: e => setPreview(p => p && { ...p, x: e.clientX, y: e.clientY }),
  onMouseLeave: () => setPreview(null),
} : {}

function HoverCard() {
  const [p, set] = useState(null)
  setPreview = set
  if (!p) return null
  const W = 244, H = 340
  const left = p.x + 24 + W > innerWidth ? p.x - 24 - W : p.x + 24
  const top = Math.max(8, Math.min(p.y - H / 2, innerHeight - H - 8))
  return <img className="hover-card" src={p.img} alt="" style={{ left, top }} />
}

// Riga della lista testuale: copie possedute/richieste, nome, costo
function CardLine({ r }) {
  const c = getCached(r.name)
  const st = r.missing === 0 ? 'ok' : r.have === 0 ? 'no' : 'part'
  return (
    <li className={`tline tile-${st}`}>
      <span className="tline-qty">{r.have}/{r.qty}</span>
      <a href={scryUrl(r.name)} target="_blank" rel="noreferrer" className="tline-name" {...hoverProps(r.name)}>{r.name}</a>
      <ManaCost cost={c?.cost} />
    </li>
  )
}

function Section({ title, rows, onlyMissing, visual }) {
  const shown = onlyMissing ? rows.filter(r => r.missing > 0) : rows
  const groups = GROUP_ORDER.map(k => [t(`group.${k}`), shown.filter(r => groupOf(getCached(r.name)) === k)]).filter(([, l]) => l.length)
  if (!shown.length) return null
  return (
    <section className="list-section">
      <h2>{title}</h2>
      {groups.map(([label, list]) => (
        <div key={label} className="group">
          <h3>{label} <span>{list.reduce((t, r) => t + r.qty, 0)}</span></h3>
          {visual
            ? <div className="tiles">{list.map(r => <CardTile key={r.name} r={r} />)}</div>
            : <ul className="tlines">{list.map(r => <CardLine key={r.name} r={r} />)}</ul>}
        </div>
      ))}
    </section>
  )
}

// Ricerca dell'archetipo su MTGdecks (apertura manuale: il sito non consente la lettura automatica)
const mtgdecksUrl = (formatName, deckName) => `https://www.google.com/search?q=${encodeURIComponent(`site:mtgdecks.net ${formatName} ${deckName}`)}`

export default function DeckDetail({ s, colors, formatName, onBack, onDelete, toast, onOpen, idOf, pinned, onPin, decks = [], owned = new Map() }) {
  const [tab, setTab] = useState('list')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [look, setLook] = useLocal('mdm.deckView', 'text') // lista testuale (predefinita) o immagini delle carte
  const list = toText(s.missing)
  const missingCount = s.missing.reduce((t, r) => t + r.missing, 0)
  const missRows = useMemo(() => [...s.missing].sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name)), [s])
  const cost = missingCost(s.missing, getCached)
  const price = costText(cost, missingCount)
  const bans = deckBans(s.deck, getCached)
  const hasMeta = !!(s.deck.history || s.deck.field || s.deck.core)

  const copy = async () => {
    try { await navigator.clipboard.writeText(list); toast(t('detail.copied')) }
    catch { toast(t('copyFail')) }
  }

  return (
    <article className="detail" style={frameStyle(colors)}>
      <HoverCard />
      <button className="back" onClick={onBack}><IconBack size={18} />{t('detail.back')}</button>

      <header className="detail-head">
        <div className="detail-info">
        <div className="detail-title">
          <h1>{s.deck.name}</h1>
          <ColorPips colors={colors} size="1.15rem" />
          <PinButton deck={s.deck} pinned={pinned} onPin={onPin} className="pin-btn pin-btn-detail" />
        </div>
        <p className="detail-meta">
          {s.deck.rogue ? <RogueInfo deck={s.deck} /> : <>
            <TierBadge tier={s.deck.tier} />
            {s.deck.share > 0 && <span>{shareText(s.deck.share)}</span>}
            <Trend share={s.deck.share} prev={s.deck.prev} prevDate={s.deck.prevDate} history={s.deck.history} />
          </>}
          {s.deck.archetype && <span>{t('detail.variant', s.deck.archetype)}</span>}
          {price && <span className="price">{t('detail.toComplete', price)}</span>}
        </p>
        <p className="detail-links">
          {s.deck.url && <a href={s.deck.url} target="_blank" rel="noreferrer">{t('detail.original')}{s.deck.title && s.deck.title !== s.deck.name ? ` (${s.deck.title})` : ''} <IconExternal size={14} /></a>}
          {s.deck.source !== 'utente' && <a href={mtgdecksUrl(formatName, s.deck.name)} target="_blank" rel="noreferrer">{t('detail.mtgdecks')} <IconExternal size={14} /></a>}
        </p>
        {bans.length > 0 && <p className="note note-error">⚠ {t('ban.deck', bans.join(', '))}</p>}
        </div>
        <div className="detail-meters">
          <Meter label="Main" {...s.main} />
          {s.side.total > 0 && <Meter label="Side" {...s.side} />}
        </div>
      </header>

      <div className={`detail-split${hasMeta ? ' has-meta' : ''}`}>
      <div className="detail-main">
      <div className="seg" role="tablist" aria-label={t('view')}>
        <button role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>{t('tab.list')}</button>
        <button role="tab" aria-selected={tab === 'need'} onClick={() => setTab('need')}>{t('tab.need')} <span className="count">{missingCount}</span></button>
      </div>

      {tab === 'list' && <>
        <div className="list-tools">
          <label className="switch">
            <input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} />
            <span className="switch-ui" aria-hidden="true" />{t('detail.onlyMissing')}
          </label>
          <div className="seg seg-icons" role="group" aria-label={t('view')}>
            <button aria-pressed={look !== 'visual'} onClick={() => setLook('text')} title={t('coll.list')}><IconList size={18} /><span className="sr-only">{t('coll.list')}</span></button>
            <button aria-pressed={look === 'visual'} onClick={() => setLook('visual')} title={t('view.cards')}><IconGrid size={18} /><span className="sr-only">{t('view.cards')}</span></button>
          </div>
        </div>
        <Section title="Main" rows={s.main.rows} onlyMissing={onlyMissing} visual={look === 'visual'} />
        <Section title="Sideboard" rows={s.side.rows} onlyMissing={onlyMissing} visual={look === 'visual'} />
        {onlyMissing && !missingCount && <p className="empty">{t('detail.haveAll')}</p>}
      </>}

      {tab === 'need' && (missingCount ? <>
        <div className="actions actions-top">
          <button className="btn btn-primary" onClick={copy}><IconCopy size={18} />{t('copyList')}</button>
          <a className="btn" href={tcgplayerUrl(s.missing)} target="_blank" rel="noreferrer"><IconCart size={18} />TCGplayer</a>
          <button className="btn" onClick={() => downloadTxt(`${t('detail.file')}-${s.deck.name.replace(/\W+/g, '-').toLowerCase()}.txt`, list)}><IconDownload size={18} />{t('download')}</button>
          {cost.known > 0 && <span className="key-total">{t('detail.total')} ≈ {money(cost.amount)}{cost.unknown ? ` (${t('noPrice', cost.unknown)})` : ''}</span>}
        </div>
        <p className="hint hint-top">{t('detail.hint', priceSource())}</p>
        <ul className="need-list">
          {missRows.map(r => {
            const c = getCached(r.name)
            return (
              <li key={r.name + r.qty}>
                <span className="need-qty">{r.missing}</span>
                <a href={scryUrl(r.name)} target="_blank" rel="noreferrer" className="need-name" {...hoverProps(r.name)}>{r.name}</a>
                <ManaCost cost={c?.cost} />
                <span className="need-price">{priceOf(c) != null ? money(priceOf(c) * r.missing, true) : '—'}</span>
              </li>
            )
          })}
        </ul>

      </> : <p className="empty">{t('detail.haveAll')}</p>)}
      </div>

      {hasMeta && <aside className="detail-side meta-tab" aria-label={t('tab.meta')}>
        {s.deck.history && s.deck.historyWeeks && <HistoryChart weeks={s.deck.historyWeeks} values={s.deck.history} />}
        <ConvLine deck={s.deck} />
        {s.deck.field && <Matchups deck={s.deck} onOpen={onOpen} idOf={idOf} />}
        <DeckInsights deck={s.deck} decks={decks} owned={owned} onOpen={onOpen} idOf={idOf} />
      </aside>}
      </div>

      {onDelete && <div className="del"><ConfirmButton className="btn btn-danger" label={t('detail.delete')} question={t('detail.confirmDelete')} yes={t('detail.deleteYes')} onConfirm={onDelete} /></div>}
    </article>
  )
}
