import ConfirmButton from './ConfirmButton.jsx'
import DeckInsights, { ConvLine } from './DeckInsights.jsx'
import { useEffect, useMemo, useState } from 'react'
import { describeDeck } from '../lib/deckDesc.js'
import { loadTags } from '../lib/tagsLoader.js'
import { Meter, frameStyle, costText, RogueInfo, PinButton, resultText } from './DeckList.jsx'
import { Trend, Info } from './Badges.jsx'
import { ColorPips, ManaCost } from './Mana.jsx'
import { IconBack, IconCopy, IconCart, IconDownload, IconExternal, IconCheck, IconGrid, IconList, IconBox, IconWarn } from './Icons.jsx'
import { useSession } from '../state/useSession.js'
import { getCached } from '../lib/scryfall.js'
import { GROUPS, groupOf, missingCost } from '../lib/deckInfo.js'
import { t, num, dayMonth, getLang } from '../i18n/index.js'
import { money, priceOf, priceSource, currency } from '../lib/currency.js'
import { toText, storeFor, downloadTxt } from '../lib/export.js'
import { HistoryChart, Matchups } from './Charts.jsx'
import { deckBans } from '../lib/bans.js'

const GROUP_ORDER = [...GROUPS.map(([k]) => k), 'other']
const scryUrl = name => getCached(name)?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${name}"`)}`

// senza collezione niente confronto (tutto "0/4" in rosso): solo le quantità della lista
const stOf = (r, hasColl) => !hasColl ? 'plain' : r.missing === 0 ? 'ok' : r.have === 0 ? 'no' : 'part'

function CardTile({ r, hasColl }) {
  const c = getCached(r.name)
  const st = stOf(r, hasColl)
  const label = st === 'plain' ? `×${r.qty}` : st === 'ok' ? t('tile.owned') : st === 'no' ? t('tile.missing') : t('tile.partial', r.have)
  return (
    <a className={`tile tile-${st}`} href={scryUrl(r.name)} target="_blank" rel="noreferrer" title={`${r.name} — ${label}`}>
      {c?.img ? <img src={c.img} alt={r.name} loading="lazy" /> : <span className="tile-ph"><span>{r.name}</span><ManaCost cost={c?.cost} slot /></span>}
      <span className="tile-qty">{st === 'ok' && <IconCheck size={13} />}{st === 'plain' ? `×${r.qty}` : `${r.have}/${r.qty}`}</span>
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
  // scorrendo con la rotella la carta sotto il mouse cambia: l'anteprima vecchia sparisce
  useEffect(() => { if (!p) return; const off = () => set(null); addEventListener('scroll', off, { passive: true }); return () => removeEventListener('scroll', off) }, [!!p])
  if (!p) return null
  const W = 244, H = 340
  const left = p.x + 24 + W > innerWidth ? p.x - 24 - W : p.x + 24
  const top = Math.max(8, Math.min(p.y - H / 2, innerHeight - H - 8))
  return <img className="hover-card" src={p.img} alt="" style={{ left, top }} />
}

// Riga della lista testuale: copie possedute/richieste, nome, costo
function CardLine({ r, hasColl }) {
  const c = getCached(r.name)
  const st = stOf(r, hasColl)
  return (
    <li className={`tline tile-${st}`}>
      <span className="tline-qty">{st === 'plain' ? r.qty : `${r.have}/${r.qty}`}</span>
      <a href={scryUrl(r.name)} target="_blank" rel="noreferrer" className="tline-name" {...hoverProps(r.name)}>{r.name}</a>
      <ManaCost cost={c?.cost} slot />
    </li>
  )
}

function Section({ title, rows, onlyMissing, visual, hasColl }) {
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
            ? <div className="tiles">{list.map(r => <CardTile key={r.name} r={r} hasColl={hasColl} />)}</div>
            : <ul className="tlines">{list.map(r => <CardLine key={r.name} r={r} hasColl={hasColl} />)}</ul>}
        </div>
      ))}
    </section>
  )
}

// "Ghost94 · IPT FUMA CHE PAUPERUMA (1st Place)" → "Ghost94, IPT FUMA CHE PAUPERUMA, 1° posto"
const sourceText = title => { const m = /^(.*?) · (.*) \(([^()]+)\)$/.exec(title); return m ? `${m[1]}, ${m[2]}, ${resultText(m[3])}` : title }

// Ricerca dell'archetipo su MTGdecks (apertura manuale: il sito non consente la lettura automatica)
const mtgdecksUrl = (formatName, deckName) => `https://www.google.com/search?q=${encodeURIComponent(`site:mtgdecks.net ${formatName} ${deckName}`)}`
// pagina di MTGDecks con tutte le liste recenti del mazzo (es. mtgdecks.net/Pauper/red-madness).
// Il nome lì può essere diverso dal nostro: per questo resta anche la ricerca su Google.
export const mtgdecksSlug = name => name.toLowerCase().replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const mtgdecksPage = (formatName, deckName) => `https://mtgdecks.net/${encodeURIComponent(formatName)}/${mtgdecksSlug(deckName)}`

const smoothTo = id => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })

// La pagina del mazzo è il foglio della decklist di un torneo: in alto i campi compilati (nome, formato, tier, quota)
// e il riquadro del risultato (quanto è completo), sotto main e side affiancati. Accanto, pinzato, lo scontrino
// della mancolista; sotto, i fogli con i dati del meta (andamento, matchup, cuore della lista).
export default function DeckDetail({ s, colors, formatName, onBack, onDelete, toast, onOpen, idOf, pinned, onPin, decks = [], owned = new Map(), hasColl = true, onOwnDeck, cedh = false, listSource }) {
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [look, setLook] = useSession('mdm.deckView', 'text') // lista testuale (predefinita) o immagini delle carte
  const list = toText(s.missing)
  const missingCount = s.missing.reduce((t, r) => t + r.missing, 0)
  const missRows = useMemo(() => [...s.missing].sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name)), [s])
  const cost = missingCost(s.missing, getCached)
  const price = costText(cost, missingCount)
  const bans = deckBans(s.deck, getCached)
  const hasMeta = !!(s.deck.history || s.deck.field || s.deck.core)
  const [tags, setTags] = useState(null)
  useEffect(() => { loadTags().then(setTags) }, [])
  const desc = useMemo(() => describeDeck(s.deck, getCached, tags), [s.deck, tags])
  const need = t(cedh ? 'need.list' : 'need', missingCount)

  const copy = async () => {
    try { await navigator.clipboard.writeText(list); toast(t('detail.copied')) }
    catch { toast(t('copyFail')) }
  }
  // negozio della propria zona: dove non si può caricare la lista con un link, la si copia mentre il negozio si apre
  const store = storeFor(currency(), getLang(), s.missing)
  const copyFor = () => { if (!store) return; navigator.clipboard?.writeText(list).then(() => toast(t('store.copied', store.name)), () => toast(t('copyFail'))) }

  // la mancolista: le azioni e lo scontrino da portare in negozio
  const shopping = <>
    <div className="toolbar need-tools">
      <button className={`btn${hasColl ? ' btn-primary' : ''}`} onClick={copy}><IconCopy size={18} />{t('copyList')}</button>
      {store && (store.copy
        ? <a className="btn" href={store.url} target="_blank" rel="noreferrer" onClick={copyFor} title={t('store.copyTitle', store.name)}><IconCart size={18} />{store.name}</a>
        : <a className="btn" href={store.url} target="_blank" rel="noreferrer"><IconCart size={18} />{store.name}</a>)}
      <button className="btn" onClick={() => downloadTxt(`${t('detail.file')}-${s.deck.name.replace(/\W+/g, '-').toLowerCase()}.txt`, list)}><IconDownload size={18} />{t('download')}</button>
    </div>
    <div className="receipt">
      <p className="receipt-head"><b>{t('tab.need')}</b><span>{s.deck.name}</span><span>{dayMonth(new Date().toISOString().slice(0, 10))}</span></p>
      <ul className="need-list">
        {missRows.map(r => {
          const c = getCached(r.name)
          return (
            <li key={r.name + r.qty}>
              <span className="need-qty">{r.missing}</span>
              <a href={scryUrl(r.name)} target="_blank" rel="noreferrer" className="need-name" {...hoverProps(r.name)}>{r.name}</a>
              <ManaCost cost={c?.cost} slot />
              <span className="need-price">{priceOf(c) != null ? money(priceOf(c) * r.missing, true) : '—'}</span>
            </li>
          )
        })}
      </ul>
      {cost.known > 0 && <p className="receipt-total"><span>{t('detail.total')}</span><b>≈ {money(cost.amount)}</b>{cost.unknown > 0 && <small>{t('noPrice', cost.unknown)}</small>}</p>}
    </div>
    <p className="hint">{t('detail.hint', priceSource())}</p>
  </>

  return (
    <article className="detail" style={frameStyle(colors)}>
      <HoverCard />
      <button className="back" onClick={onBack}><IconBack size={18} />{t('detail.back')}</button>

      {/* telefono e tablet: i tre pezzi della pagina sono uno sotto l'altro, qui si salta al pezzo che serve */}
      <nav className="dl-jump" aria-label={t('view')}>
        <button onClick={() => smoothTo('deck-list')}>{t('tab.list')}</button>
        {missingCount > 0 && <button onClick={() => smoothTo('deck-need')}>{t('tab.need')} <span className="count">{missingCount}</span></button>}
        {hasMeta && <button onClick={() => smoothTo('deck-meta')}>{t('tab.metaShort')}</button>}
      </nav>

      <div className={`detail-desk${missingCount > 0 ? ' has-need' : ''}`}>
        <section className="decklist" aria-labelledby="deck-title">
          <header className={`dl-head${hasColl ? ' has-result' : ''}`}>
            <div className="dl-fields">
              <div className="dl-field dl-name">
                <span className="dl-label">{t('col.deck')}</span>
                <span className="dl-name-row"><h1 id="deck-title">{s.deck.name}</h1><ColorPips colors={colors} size="1.15rem" /></span>
                {s.deck.archetype && <span className="dl-variant">{t('detail.variant', s.deck.archetype)}</span>}
              </div>
              <div className="dl-field"><span className="dl-label">{t('format')}</span><span className="dl-value">{formatName}</span></div>
              {s.deck.rogue ? <div className="dl-field dl-wide"><span className="dl-label">Rogue</span><span className="dl-value dl-sub"><RogueInfo deck={s.deck} /></span></div> : <>
                {s.deck.tier && <div className="dl-field"><span className="dl-label">Tier <Info text={t('info.tier')} label={t('info.label')} /></span><span className="dl-value">{s.deck.tier}</span></div>}
                {s.deck.share > 0 && <div className="dl-field"><span className="dl-label">{t('col.share')}</span><span className="dl-value">{num(s.deck.share)}%</span></div>}
                {s.deck.prevDate && <div className="dl-field"><span className="dl-label">{t('col.trend')}</span><span className="dl-value dl-sub"><Trend share={s.deck.share} prev={s.deck.prev} prevDate={s.deck.prevDate} history={s.deck.history} /></span></div>}
              </>}
              {price && !hasColl && <div className="dl-field"><span className="dl-label">{t('col.cost')}</span><span className="dl-value">{price}</span></div>}
            </div>
            <span className="detail-actions">
              <PinButton deck={s.deck} pinned={pinned} onPin={onPin} className="pin-btn pin-btn-detail" />
              {missingCount > 0 && onOwnDeck && <button className="own-btn" onClick={onOwnDeck} title={t('own.title')}><IconBox size={18} />{t('own.deck')}</button>}
            </span>
            {/* il riquadro del risultato: quanto del mazzo hai già */}
            {hasColl && <div className="detail-meters">
              <p className="detail-score"><b>{Math.round(s.score * 100)}<small>%</small></b><span>{t(cedh ? 'complete.list' : 'complete')}</span></p>
              <Meter label="Main" {...s.main} />
              {s.side.total > 0 && <Meter label="Side" {...s.side} />}
              {missingCount > 0
                ? <p className="detail-need">
                    <button className="linklike" onClick={() => smoothTo('deck-need')}>{need[0]}<b>{missingCount}</b>{need[1]}</button>
                    {price && <span>{t(cedh ? 'detail.toList' : 'detail.toComplete', price)}</span>}
                  </p>
                : <span className="done">{t('haveAll')}</span>}
            </div>}
          </header>

          {desc && <dl className="profile" aria-label={t('desc.label')}>
            <div><dt>{t('desc.curveL')}</dt><dd>{num(desc.curve)}</dd></div>
            <div><dt>{t('desc.creaL')}</dt><dd>{desc.creatures}</dd></div>
            {desc.inter.map(([k, n]) => <div key={k}><dt>{t(`otag.${k}`)}</dt><dd>{n}</dd></div>)}
          </dl>}
          {bans.length > 0 && <p className="note note-error note-icon"><IconWarn size={18} />{t('ban.deck', bans.join(', '))}</p>}

          <div className="list-tools" id="deck-list">
            {hasColl ? <label className="switch">
              <input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} />
              <span className="switch-ui" aria-hidden="true" />{t('detail.onlyMissing')}
            </label> : <span />}
            <div className="seg seg-icons" role="group" aria-label={t('view')}>
              <button aria-pressed={look !== 'visual'} onClick={() => setLook('text')} title={t('coll.list')}><IconList size={18} /><span className="sr-only">{t('coll.list')}</span></button>
              <button aria-pressed={look === 'visual'} onClick={() => setLook('visual')} title={t('view.cards')}><IconGrid size={18} /><span className="sr-only">{t('view.cards')}</span></button>
            </div>
          </div>
          <div className={`dl-cols${look === 'visual' ? ' dl-visual' : ''}`}>
            <Section title="Main" rows={s.main.rows} onlyMissing={hasColl && onlyMissing} visual={look === 'visual'} hasColl={hasColl} />
            <Section title="Sideboard" rows={s.side.rows} onlyMissing={hasColl && onlyMissing} visual={look === 'visual'} hasColl={hasColl} />
          </div>
          {onlyMissing && !missingCount && <p className="empty">{t('detail.haveAll')}</p>}

          <footer className="detail-source">
            {s.deck.url && <p className="detail-orig"><a href={s.deck.url} target="_blank" rel="noreferrer">{t('detail.original')}{s.deck.title && s.deck.title !== s.deck.name ? `: ${sourceText(s.deck.title)}` : ''}<IconExternal size={14} /></a></p>}
            {/* la lista mostrata cambia ogni notte: diciamo come viene scelta, subito sotto il suo link */}
            {s.deck.url && s.deck.source !== 'utente' && !s.deck.rogue && <p className="detail-listhow">{t(listSource === 'MTGTop8' ? 'detail.listHowTop8' : 'detail.listHow', s.deck.count || 0)}</p>}
            {s.deck.source !== 'utente' && <p className="detail-links">
              {!cedh && <a href={mtgdecksPage(formatName, s.deck.name)} target="_blank" rel="noreferrer">{t('detail.mtgdecksAll')}<IconExternal size={14} /></a>}
              <a href={mtgdecksUrl(formatName, s.deck.name)} target="_blank" rel="noreferrer">{t(cedh ? 'detail.mtgdecksSearch' : 'detail.mtgdecks')}<IconExternal size={14} /></a>
            </p>}
          </footer>
        </section>

        {/* la mancolista pinzata accanto al foglio; senza collezione è la lista della spesa del mazzo intero, chiusa */}
        {missingCount > 0 && <aside className="dl-need" id="deck-need" aria-label={t('tab.need')}>
          {hasColl ? shopping : <details className="need-closed">
            <summary>{t('tab.need')} <span className="count">{missingCount}</span></summary>
            {shopping}
          </details>}
        </aside>}
      </div>

      {hasMeta && <section className="detail-meta" id="deck-meta" aria-label={t('tab.meta')}>
        {(s.deck.history || s.deck.conv) && <div className="meta-sheet">
          {s.deck.history && s.deck.historyWeeks && <HistoryChart weeks={s.deck.historyWeeks} values={s.deck.history} />}
          <ConvLine deck={s.deck} />
        </div>}
        {s.deck.field && <div className="meta-sheet"><Matchups deck={s.deck} onOpen={onOpen} idOf={idOf} /></div>}
        <DeckInsights deck={s.deck} decks={decks} owned={owned} onOpen={onOpen} idOf={idOf} />
      </section>}

      {onDelete && <div className="del"><ConfirmButton className="btn btn-danger" label={t('detail.delete')} question={t('detail.confirmDelete')} yes={t('detail.deleteYes')} onConfirm={onDelete} /></div>}
    </article>
  )
}
