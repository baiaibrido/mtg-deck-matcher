import { useMemo, useState } from 'react'
import { Meter, frameStyle, shareText, costText } from './DeckList.jsx'
import { TierBadge, Trend } from './Badges.jsx'
import { ColorPips, ManaCost } from './Mana.jsx'
import { IconBack, IconCopy, IconCart, IconDownload, IconExternal, IconCheck } from './Icons.jsx'
import { getCached } from '../lib/scryfall.js'
import { GROUPS, groupOf, missingCost, euro } from '../lib/deckInfo.js'
import { toText, tcgplayerUrl, downloadTxt } from '../lib/export.js'

const GROUP_ORDER = [...GROUPS.map(([k, label]) => [k, label]), ['other', 'Altre carte']]
const scryUrl = name => getCached(name)?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${name}"`)}`

function CardTile({ r }) {
  const c = getCached(r.name)
  const st = r.missing === 0 ? 'ok' : r.have === 0 ? 'no' : 'part'
  const label = st === 'ok' ? 'posseduta' : st === 'no' ? 'mancante' : `ne hai ${r.have}`
  return (
    <a className={`tile tile-${st}`} href={scryUrl(r.name)} target="_blank" rel="noreferrer" title={`${r.name} — ${label}`}>
      {c?.img ? <img src={c.img} alt={r.name} loading="lazy" /> : <span className="tile-ph"><span>{r.name}</span><ManaCost cost={c?.cost} /></span>}
      <span className="tile-qty">{st === 'ok' && <IconCheck size={13} />}{r.have}/{r.qty}</span>
    </a>
  )
}

function Section({ title, rows, onlyMissing }) {
  const shown = onlyMissing ? rows.filter(r => r.missing > 0) : rows
  const groups = GROUP_ORDER.map(([k, label]) => [label, shown.filter(r => groupOf(getCached(r.name)) === k)]).filter(([, l]) => l.length)
  if (!shown.length) return null
  return (
    <section className="list-section">
      <h3>{title}</h3>
      {groups.map(([label, list]) => (
        <div key={label} className="group">
          <h4>{label} <span>{list.reduce((t, r) => t + r.qty, 0)}</span></h4>
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
    try { await navigator.clipboard.writeText(list); toast('Mancolista copiata') }
    catch { toast('Copia non riuscita: usa "Scarica .txt"') }
  }

  return (
    <article className="detail" style={frameStyle(colors)}>
      <button className="back" onClick={onBack}><IconBack size={18} />Tutti i mazzi</button>

      <header className="detail-head">
        <div className="detail-title">
          <h2>{s.deck.name}</h2>
          <ColorPips colors={colors} size="1.15rem" />
        </div>
        <p className="detail-meta">
          <TierBadge tier={s.deck.tier} />
          {s.deck.share > 0 && <span>{shareText(s.deck.share)}</span>}
          <Trend share={s.deck.share} prev={s.deck.prev} prevDate={s.deck.prevDate} />
          {price && <span className="price">Per completarlo {price}</span>}
        </p>
        <p className="detail-links">
          {s.deck.url && <a href={s.deck.url} target="_blank" rel="noreferrer">Lista su MTGTop8{s.deck.title && s.deck.title !== s.deck.name ? ` (${s.deck.title})` : ''} <IconExternal size={14} /></a>}
          {s.deck.source !== 'utente' && <a href={mtgdecksUrl(formatName, s.deck.name)} target="_blank" rel="noreferrer">Cerca su MTGdecks <IconExternal size={14} /></a>}
        </p>
        <div className="detail-meters">
          <Meter label="Main" {...s.main} />
          {s.side.total > 0 && <Meter label="Side" {...s.side} />}
        </div>
      </header>

      <div className="seg" role="tablist" aria-label="Vista">
        <button role="tab" aria-selected={tab === 'list'} onClick={() => setTab('list')}>Lista</button>
        <button role="tab" aria-selected={tab === 'need'} onClick={() => setTab('need')}>Mancolista <span className="count">{missingCount}</span></button>
      </div>

      {tab === 'list' && <>
        <label className="switch">
          <input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} />
          <span className="switch-ui" aria-hidden="true" />Mostra solo le carte che ti mancano
        </label>
        <Section title="Main" rows={s.main.rows} onlyMissing={onlyMissing} />
        <Section title="Sideboard" rows={s.side.rows} onlyMissing={onlyMissing} />
        {onlyMissing && !missingCount && <p className="empty">Hai tutte le carte di questo mazzo.</p>}
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
              <span>Totale stimato{cost.unknown ? ` (${cost.unknown} ${cost.unknown === 1 ? 'carta' : 'carte'} senza prezzo)` : ''}</span>
              <span />
              <span className="need-price">{euro(cost.eur, true)}</span>
            </li>
          )}
        </ul>
        <div className="actions">
          <button className="btn btn-primary" onClick={copy}><IconCopy size={18} />Copia lista</button>
          <a className="btn" href={tcgplayerUrl(s.missing)} target="_blank" rel="noreferrer"><IconCart size={18} />TCGplayer</a>
          <button className="btn" onClick={() => downloadTxt(`mancolista-${s.deck.name.replace(/\W+/g, '-').toLowerCase()}.txt`, list)}><IconDownload size={18} />Scarica</button>
        </div>
        <p className="hint">La lista copiata si incolla su Scryfall o Moxfield. Prezzi indicativi Cardmarket (via Scryfall) della stampa più recente: le ristampe economiche possono costare meno.</p>
      </> : <p className="empty">Hai tutte le carte di questo mazzo.</p>)}

      {onDelete && <button className="btn btn-danger del" onClick={() => confirm('Eliminare questo mazzo aggiunto da te?') && onDelete()}>Elimina mazzo</button>}
    </article>
  )
}
