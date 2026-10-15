import { useMemo, useState } from 'react'
import { Meter, frameStyle, shareText, costText } from './DeckList.jsx'
import { TierBadge, Trend } from './Badges.jsx'
import { ColorPips, ManaCost } from './Mana.jsx'
import { IconBack, IconCopy, IconCart, IconDownload, IconExternal, IconCheck } from './Icons.jsx'
import { getCached } from '../lib/scryfall.js'
import { GROUPS, groupOf, missingCost } from '../lib/deckInfo.js'
import { t, euro } from '../i18n/index.js'
import { toText, tcgplayerUrl, downloadTxt } from '../lib/export.js'

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

function Section({ title, rows, onlyMissing }) {
  const shown = onlyMissing ? rows.filter(r => r.missing > 0) : rows
  const groups = GROUP_ORDER.map(k => [t(`group.${k}`), shown.filter(r => groupOf(getCached(r.name)) === k)]).filter(([, l]) => l.length)
  if (!shown.length) return null
  return (
    <section className="list-section">
      <h2>{title}</h2>
      {groups.map(([label, list]) => (
        <div key={label} className="group">
          <h3>{label} <span>{list.reduce((t, r) => t + r.qty, 0)}</span></h3>
          <div className="tiles">{list.map(r => <CardTile key={r.name} r={r} />)}</div>
        </div>
      ))}
    </section>
  )
}

// Ricerca dell'archetipo su MTGdecks (apertura manuale: il sito non consente la lettura automatica)
const mtgdecksUrl = (formatName, deckName) => `https://www.google.com/search?q=${encodeURIComponent(`site:mtgdecks.net ${formatName} ${deckName}`)}`

export default function DeckDetail({ s, colors, formatName, onBack, onDelete, toast }) {
  const [tab, setTab] = useState('list')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const list = toText(s.missing)
  const missingCount = s.missing.reduce((t, r) => t + r.missing, 0)
  const missRows = useMemo(() => [...s.missing].sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name)), [s])
  const cost = missingCost(s.missing, getCached)
  const price = costText(cost, missingCount)

  const copy = async () => {
    try { await navigator.clipboard.writeText(list); toast(t('detail.copied')) }
    catch { toast(t('copyFail')) }
  }

  return (
    <article className="detail" style={frameStyle(colors)}>
      <button className="back" onClick={onBack}><IconBack size={18} />{t('detail.back')}</button>

      <header className="detail-head">
        <div className="detail-title">
          <h1>{s.deck.name}</h1>
          <ColorPips colors={colors} size="1.15rem" />
        </div>
        <p className="detail-meta">
          <TierBadge tier={s.deck.tier} />
          {s.deck.share > 0 && <span>{shareText(s.deck.share)}</span>}
          <Trend share={s.deck.share} prev={s.deck.prev} prevDate={s.deck.prevDate} />
          {s.deck.archetype && <span>{t('detail.variant', s.deck.archetype)}</span>}
          {price && <span className="price">{t('detail.toComplete', price)}</span>}
        </p>
        <p className="detail-links">
          {s.deck.url && <a href={s.deck.url} target="_blank" rel="noreferrer">{t('detail.original')}{s.deck.title && s.deck.title !== s.deck.name ? ` (${s.deck.title})` : ''} <IconExternal size={14} /></a>}
          {s.deck.source !== 'utente' && <a href={mtgdecksUrl(formatName, s.deck.name)} target="_blank" rel="noreferrer">{t('detail.mtgdecks')} <IconExternal size={14} /></a>}
        </p>
        <div className="detail-meters">
          <Meter label="Main" {...s.main} />
          {s.side.total > 0 && <Meter label="Side" {...s.side} />}
        </div>
      </header>

      <div className="seg" role="tablist" aria-label={t('view')}>
        <button role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>{t('tab.list')}</button>
        <button role="tab" aria-selected={tab === 'need'} onClick={() => setTab('need')}>{t('tab.need')} <span className="count">{missingCount}</span></button>
      </div>

      {tab === 'list' && <>
        <label className="switch">
          <input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} />
          <span className="switch-ui" aria-hidden="true" />{t('detail.onlyMissing')}
        </label>
        <Section title="Main" rows={s.main.rows} onlyMissing={onlyMissing} />
        <Section title="Sideboard" rows={s.side.rows} onlyMissing={onlyMissing} />
        {onlyMissing && !missingCount && <p className="empty">{t('detail.haveAll')}</p>}
      </>}

      {tab === 'need' && (missingCount ? <>
        <ul className="need-list">
          {missRows.map(r => {
            const c = getCached(r.name)
            return (
              <li key={r.name + r.qty}>
                <span className="need-qty">{r.missing}</span>
                <a href={scryUrl(r.name)} target="_blank" rel="noreferrer" className="need-name">{r.name}</a>
                <ManaCost cost={c?.cost} />
                <span className="need-price">{c?.eur != null ? euro(c.eur * r.missing, true) : '—'}</span>
              </li>
            )
          })}
          {cost.known > 0 && (
            <li className="need-total">
              <span />
              <span>{t('detail.total')}{cost.unknown ? ` (${t('noPrice', cost.unknown)})` : ''}</span>
              <span />
              <span className="need-price">{euro(cost.eur, true)}</span>
            </li>
          )}
        </ul>
        <div className="actions">
          <button className="btn btn-primary" onClick={copy}><IconCopy size={18} />{t('copyList')}</button>
          <a className="btn" href={tcgplayerUrl(s.missing)} target="_blank" rel="noreferrer"><IconCart size={18} />TCGplayer</a>
          <button className="btn" onClick={() => downloadTxt(`${t('detail.file')}-${s.deck.name.replace(/\W+/g, '-').toLowerCase()}.txt`, list)}><IconDownload size={18} />{t('download')}</button>
        </div>
        <p className="hint">{t('detail.hint')}</p>
      </> : <p className="empty">{t('detail.haveAll')}</p>)}

      {onDelete && <button className="btn btn-danger del" onClick={() => confirm(t('detail.confirmDelete')) && onDelete()}>{t('detail.delete')}</button>}
    </article>
  )
}
