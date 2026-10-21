import ConfirmButton from './ConfirmButton.jsx'
import Picker from './Picker.jsx'
import { personality } from '../lib/fun.js'
import Achievements from './play/Achievements.jsx'
import { useEffect, useRef, useState } from 'react'
import { parseCollection } from '../lib/parser.js'
import { mergeCollection, entryKey } from '../lib/normalize.js'
import { COLL_SORTS, applyFilters, sortRows, facets } from '../lib/collection.js'
import { normalizeCollection, fetchCards, fetchPrintings, getCached, getPrinting, printKey, smallImg } from '../lib/scryfall.js'
import { BINDER, binderOf, binderName, TYPE_FILTERS } from '../lib/deckInfo.js'
import { t, getLang } from '../i18n/index.js'
import { money, priceOf } from '../lib/currency.js'
import { formatList, FORMAT_LABEL } from '../lib/bans.js'
import { collectionCsv, downloadTxt } from '../lib/export.js'
import { loadTags } from '../lib/tagsLoader.js' // tag di Scryfall: caricati solo quando si aprono i filtri
import { useSession } from '../state/useSession.js'
import { useWinWidth } from '../state/useMedia.js'
import { ManaCost } from './Mana.jsx'
import { IconUpload, IconSearch, IconPlus, IconMinus, IconTrash, IconWand, IconDownload, IconGrid, IconList, IconFilter } from './Icons.jsx'

const STEP = 120 // carte mostrate per volta: le immagini si caricano man mano

function Stepper({ c, setQty }) {
  return (
    <span className="stepper">
      <button onClick={() => setQty(c.key, c.qty - 1)} aria-label={t('coll.minus', c.name)}><IconMinus size={16} /></button>
      <input type="number" min="0" inputMode="numeric" value={c.qty} aria-label={t('coll.copiesOf', c.name)}
        onChange={e => setQty(c.key, Math.max(0, parseInt(e.target.value, 10) || 0))} />
      <button onClick={() => setQty(c.key, c.qty + 1)} aria-label={t('coll.plus', c.name)}><IconPlus size={16} /></button>
    </span>
  )
}

function DeleteBtn({ r, onDelete, className = 'btn-del' }) {
  return <button className={className} onClick={() => onDelete(r)} aria-label={t('coll.delete', r.name)} title={t('coll.deleteTitle')}><IconTrash size={16} /></button>
}

// Set e artista della stampa (se noti): il codice del set come stampato sulla carta, poi l'artista
const printText = c => [c?.set?.toUpperCase(), c?.artist].filter(Boolean).join(', ')
const PrintLine = ({ card: c }) => <>{c?.set && <span className="set-code">{c.set.toUpperCase()}</span>}{c?.artist}</>

// Dove la carta è bannata (o ristretta in Vintage): mostrato solo col filtro «Bannate»
const banLine = c => [c?.bn?.length && t('ban.card', formatList(c.bn)), c?.rs?.length && t('ban.restricted', formatList(c.rs))].filter(Boolean).join('; ')
// …come timbri a inchiostro: «BANNATA» con i formati sotto
function BanStamps({ card: c }) {
  return <span className="ban-stamps" title={banLine(c)}>
    {c?.bn?.length > 0 && <span className="stamp stamp-ban"><b>{t('stamp.ban')}</b>{formatList(c.bn)}</span>}
    {c?.rs?.length > 0 && <span className="stamp stamp-rs"><b>{t('stamp.rs')}</b>{formatList(c.rs)}</span>}
  </span>
}

// scintille sopra le foil: si riconoscono anche senza una carta normale accanto
const Sparkles = ({ n = 5 }) => <span className="sparkles" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} />)}</span>

// sizes segue le colonne scelte: con 2 colonne serve l'immagine grande, non la miniatura
function Thumb({ card, name, big, cols = 7 }) {
  if (!card?.img) return <span className={big ? 'ctile-ph' : 'thumb thumb-ph'} aria-hidden="true">{big && <><span>{name}</span><ManaCost cost={card?.cost} /></>}</span>
  return big
    ? <img src={smallImg(card.img)} srcSet={`${smallImg(card.img)} 146w, ${card.img} 488w`} sizes={`(max-width: 560px) ${Math.ceil(96 / cols)}vw, ${Math.ceil(1010 / cols)}px`} alt={name} loading="lazy" />
    : <img className="thumb" src={smallImg(card.img)} alt="" loading="lazy" />
}

// Barra del raccoglitore: quante carte per colore, cliccabile per saltare alla sezione
function Spine({ sections, total }) {
  return (
    <nav className="spine" aria-label={t('coll.spine')}>
      <div className="spine-bar" aria-hidden="true">
        {sections.map(([k, list]) => <span key={k} className={`bc-${k}`} style={{ flexGrow: list.reduce((s, c) => s + c.qty, 0) }} />)}
      </div>
      <ul>
        {sections.map(([k, list]) => {
          const n = list.reduce((s, c) => s + c.qty, 0)
          return (
            <li key={k}>
              <a href={`#sez-${k}`} onClick={e => { e.preventDefault(); document.getElementById(`sez-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
                <span className={`dot bc-${k}`} aria-hidden="true" />{binderName(k)} <b>{n}</b>
                <span className="sr-only">{t('coll.spineSr', Math.round(n / total * 100))}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Filtro a tendina con "Tutti" in cima; vuoto finché i dati non ci sono
function FilterPick({ label, value, onChange, options, all, loading }) {
  if (!options.length && !loading) return null
  return (
    <span className={`field fpick${value ? ' on' : ''}`}>
      <span className="field-label" aria-hidden="true">{label}</span>
      <Picker label={label} value={value || ''} onChange={v => onChange(v || null)} options={[{ value: '', label: loading ? '…' : all }, ...options]} />
    </span>
  )
}

export default function CollectionManager({ collection, setCollection, toast, best, onOpen, unlocked = {}, backup = { changes: 0 }, setBackup = () => {} }) {
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState(null) // { kind: 'info'|'error', text }
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [importOpen, setImportOpen] = useState(collection.length === 0)
  const textRef = useRef(null), opened = useRef(false)
  // "Aggiungi carte": cursore già nella casella, si può scrivere subito
  useEffect(() => {
    if (!opened.current) { opened.current = true; return }
    if (importOpen) textRef.current?.focus()
  }, [importOpen])
  // backup: la collezione vive solo in questo browser
  const exportBackup = () => {
    downloadTxt(`${t('coll.file')}-${new Date().toISOString().slice(0, 10)}.csv`, collectionCsv(collection), 'text/csv')
    setBackup({ changes: 0, at: Date.now() }); toast(t('coll.backupDone'))
  }
  const nudge = collection.length >= 20 && (backup.changes || 0) >= 10
  const [prefs, setPrefs] = useSession('mdm.collView', {})
  // colonne della griglia: da 2 fino a quante ne stanno (7 su computer, 3 su telefono)
  const winW = useWinWidth()
  const colsMax = winW <= 560 ? 3 : Math.max(3, Math.min(7, Math.floor((Math.min(winW, 1040) - 32 + 12) / (116 + 12))))
  const colsAuto = winW <= 560 ? 3 : Math.max(2, Math.min(colsMax, Math.floor((Math.min(winW, 1040) - 32 + 12) / (132 + 12))))
  const cols = Math.min(colsMax, Math.max(2, prefs.cols || colsAuto))
  const view = prefs.view || 'grid', sort = COLL_SORTS.includes(prefs.sort) ? prefs.sort : 'name', type = prefs.type || 'all'
  // altezza della barra fissa (cambia aprendo i filtri): serve per non nascondere i titoli quando si salta a una sezione
  const toolsRef = useRef(null)
  useEffect(() => {
    const el = toolsRef.current, root = document.documentElement
    if (!el) return
    const ro = new ResizeObserver(() => root.style.setProperty('--tools-h', getComputedStyle(el).position === 'sticky' ? `${el.offsetHeight}px` : '0px'))
    ro.observe(el); return () => { ro.disconnect(); root.style.removeProperty('--tools-h') }
  }, [collection.length > 0])
  const [more, setMore] = useState(false) // altri filtri (artista, set, rarità, tag)
  const [flt, setFlt] = useState({}) // { artist, set, rarity, otag, atag }
  const [tags, setTags] = useState(null)
  useEffect(() => { if ((more || flt.otag || flt.atag) && !tags) loadTags().then(setTags) }, [more, flt.otag, flt.atag])
  const [limit, setLimit] = useState(STEP)
  const [load, setLoad] = useState({ done: 0, total: 0, error: false })
  const [, setTick] = useState(0)

  // Dati Scryfall (immagini, colori, tipi, prezzi, artista, set) per tutta la collezione, a blocchi:
  // prima le carte per nome, poi le stampe precise (set + numero o Scryfall ID) quando l'import le conteneva
  const namesKey = collection.map(entryKey).join('|')
  useEffect(() => {
    if (!collection.length) return
    let alive = true
    const prog = (done, total) => { if (alive) { setLoad({ done, total, error: false }); setTick(t => t + 1) } }
    fetchCards(collection.map(c => c.name), { onProgress: prog })
      .then(() => fetchPrintings(collection.filter(printKey), { onProgress: prog }))
      .then(() => alive && (setLoad(l => ({ ...l, done: l.total })), setTick(t => t + 1)))
      .catch(() => alive && setLoad(l => ({ ...l, error: true })))
    return () => { alive = false }
  }, [namesKey])

  const total = collection.reduce((s, c) => s + c.qty, 0)
// le foil usano il prezzo foil di Scryfall (se c'è)
  const foilCard = c => c && (c.ef != null || c.uf != null) ? { ...c, eur: c.ef ?? c.eur, usd: c.uf ?? c.usd } : c
  const rows = collection.map(c => ({ ...c, key: entryKey(c), card: c.foil ? foilCard(getPrinting(c)) : getPrinting(c) }))
  const value = rows.reduce((s, r) => s + (priceOf(r.card) ?? 0) * r.qty, 0)
  const priced = rows.some(r => priceOf(r.card) != null)

  const typeTest = type === 'all' ? null : TYPE_FILTERS.find(([k]) => k === type)?.[1]
  const filtered = sortRows(applyFilters(rows, { q, typeTest, ...flt }, tags), sort, priceOf)
  const fx = facets(rows)
  const nFlt = Object.values(flt).filter(Boolean).length
  const setF = patch => { setFlt(f => ({ ...f, ...patch })); setLimit(STEP) }
  const sections = BINDER.map(k => [k, filtered.filter(r => binderOf(r.card) === k)]).filter(([, l]) => l.length)
  const allSections = BINDER.map(k => [k, rows.filter(r => binderOf(r.card) === k)]).filter(([, l]) => l.length)

  // carte appena aggiunte: per un attimo una passata di evidenziatore sul nome
  const [fresh, setFresh] = useState(() => new Set())
  const freshTimer = useRef()
  const markFresh = keys => { setFresh(new Set(keys)); clearTimeout(freshTimer.current); freshTimer.current = setTimeout(() => setFresh(new Set()), 2600) }
  const apply = () => {
    const parsed = parseCollection(text)
    if (!parsed.length) return setMsg({ kind: 'error', text: t('coll.noneRecognized') })
    setCollection(mergeCollection([...collection, ...parsed])); markFresh(parsed.map(entryKey))
    setText(''); setMsg(null); setImportOpen(false)
    toast(t('coll.added', parsed.reduce((s, c) => s + c.qty, 0)))
  }
  // Importa da file (export di altre app o backup di Netdeckable): con collezione vuota si carica subito,
  // altrimenti si sceglie se aggiungere o sostituire (annullabile)
  const [pending, setPending] = useState(null) // { name, list }
  const readFile = async f => {
    if (!f) return
    const list = parseCollection(await f.text())
    if (!list.length) return setMsg({ kind: 'error', text: t('coll.noneRecognized') })
    setMsg(null)
    if (!collection.length) { setCollection(list); toast(t('coll.added', list.reduce((s, c) => s + c.qty, 0))); return }
    setPending({ name: f.name, list })
  }
  const usePending = replace => {
    const { list } = pending, prev = collection, n = list.reduce((s, c) => s + c.qty, 0)
    setCollection(replace ? list : mergeCollection([...collection, ...list])); setPending(null); setImportOpen(false); markFresh(list.map(entryKey))
    toast(replace ? t('coll.replaced', n) : t('coll.added', n), { label: t('undo'), fn: () => setCollection(prev) })
  }
  const dropProps = {
    onDragOver: e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); setDrag(true) } },
    onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false) },
    onDrop: e => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files[0]) },
  }
  const normalize = async () => {
    setBusy(true); setMsg({ kind: 'info', text: t('coll.checking') })
    try {
      const { list, notFound, suggestions } = await normalizeCollection(collection, (d, tot) => setMsg({ kind: 'info', text: `${t('coll.checking')} ${d}/${tot}` }))
      const fixedCount = collection.filter(c => !list.some(x => entryKey(x) === entryKey(c))).length
      setCollection(list)
      const names = notFound.map(n => suggestions?.[n] ? t('coll.maybe', n, suggestions[n]) : n)
      setMsg(notFound.length ? { kind: 'error', text: t('coll.unrecognized', notFound.length, names.join(', '), binderName('?')) } : null)
      if (!notFound.length) toast(fixedCount ? t('coll.fixed', fixedCount) : t('coll.allGood'))
    } catch (err) { setMsg({ kind: 'error', text: t('coll.scryErr', err.message) }) }
    setBusy(false)
  }
  const setQty = (key, qty) => (qty > (collection.find(c => entryKey(c) === key)?.qty || 0) && markFresh([key]), setCollection(collection.map(c => entryKey(c) === key ? { ...c, qty } : c).filter(c => c.qty > 0)))
  const remove = r => {
    const prev = collection
    setCollection(collection.filter(c => entryKey(c) !== r.key))
    toast(t('coll.removed', r.name), { label: t('undo'), fn: () => setCollection(prev) })
  }
  const setP = patch => { setPrefs({ ...prefs, ...patch }); setLimit(STEP) }

  // Paginazione: le prime `limit` carte nell'ordine delle sezioni
  let budget = limit
  const visible = sections.map(([k, list]) => { const part = list.slice(0, Math.max(0, budget)); budget -= part.length; return [k, list, part] })
  const shownCount = Math.min(limit, filtered.length)

  const fileInput = <input type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={e => { readFile(e.target.files?.[0]); e.target.value = '' }} />
  const importPanel = (
    <section className="panel import" aria-labelledby="imp-title">
      <h2 id="imp-title">{t('coll.addCards')}</h2>
      {!collection.length && (
        <label className={`drop${drag ? ' drag' : ''}`}>
          <IconUpload size={22} />
          <span><b>{t('coll.uploadB')}</b>{t('coll.uploadExt')}<span className="muted">{t('coll.uploadMore')}</span></span>
          {fileInput}
        </label>
      )}
      <textarea ref={textRef} rows={8} value={text} onChange={e => setText(e.target.value)} aria-label={t('coll.listAria')}
        placeholder={t('coll.placeholder')} />
      <div className="row">
        <button className="btn btn-primary" onClick={apply} disabled={!text.trim()}>{t('coll.addTo')}</button>
        {collection.length > 0 && <button className="btn btn-quiet" onClick={() => setImportOpen(false)}>{t('close')}</button>}
      </div>
      <p className="hint">{t('coll.importHint')}</p>
    </section>
  )

  if (!collection.length) return (
    <div className="coll" {...dropProps}>
      <header className="page-head">
        <h1>{t('coll.title')}</h1>
        <p>{t('coll.emptyIntro')}</p>
      </header>
      {importPanel}
      {msg && <p className={`note note-${msg.kind}`} role="status">{msg.text}</p>}
    </div>
  )

  return (
    <div className={`coll${drag ? ' coll-drag' : ''}`} {...dropProps}>
      <header className="page-head coll-head">
        <div className="page-head-row">
          <h1>{t('coll.title')}</h1>
          {/* un solo pulsante principale per vista: con il pannello aperto (o una scelta in sospeso) il principale è lì */}
          <button className={`btn${importOpen || pending ? '' : ' btn-primary'}`} onClick={() => setImportOpen(o => !o)} aria-expanded={importOpen}><IconPlus size={18} />{t('coll.addCards')}</button>
        </div>
        <p>
          {t('coll.summary', total.toLocaleString(getLang()), collection.length.toLocaleString(getLang()))}
          {priced && <>{t('coll.value')}<b>≈ {money(value)}</b></>}.
          {' '}{t('coll.savedHere')}
        </p>
        <div className="coll-actions">
          <label className="btn btn-quiet" title={t('coll.importFileHint')}><IconUpload size={18} />{t('coll.importFile')}{fileInput}</label>
          <button className="btn btn-quiet" onClick={normalize} disabled={busy} title={t('coll.fixHint')}><IconWand size={18} />{t('coll.fixNames')}</button>
          <button className="btn btn-quiet" onClick={exportBackup}><IconDownload size={18} />{t('coll.backup')}</button>
          <ConfirmButton className="btn btn-quiet btn-danger" label={t('coll.clear')} question={t('coll.confirmClear')} yes={t('coll.clearYes')}
            onConfirm={() => { const prev = collection; setCollection([]); toast(t('coll.cleared'), { label: t('undo'), fn: () => setCollection(prev) }) }} />
        </div>
      </header>

      <Spine sections={allSections} total={total} />
      {(() => {
        const p = personality(collection, getCached); if (!p) return null
        const who = p.kind === 'mono' ? t('pers.mono', t(`color.${p.color}`)) : p.guild
        return <p className="pers"><span aria-hidden="true">📣</span>{t('pers.line', who, p.pct)}
          {best && best.score > 0 && <> {t('pers.best')} <button className="linklike" onClick={() => onOpen(best.deck.id)}>{best.deck.name}</button> ({Math.round(best.score * 100)}%).</>}</p>
      })()}
      {nudge && (
        <div className="confirm backup-nudge" role="status">
          <span className="confirm-q">💾 {t('backup.nudge')}</span>
          <button className="btn" onClick={exportBackup}><IconDownload size={18} />{t('backup.now')}</button>
          <button className="btn btn-quiet" onClick={() => setBackup(b => ({ ...b, changes: 0 }))}>{t('backup.later')}</button>
        </div>
      )}
      {pending && (
        <div className="confirm confirm-file" role="alertdialog" aria-label={t('coll.fileChoice', pending.name, pending.list.length)}>
          <span className="confirm-q">{t('coll.fileChoice', pending.name, pending.list.reduce((s, c) => s + c.qty, 0))}</span>
          <button className="btn btn-primary" autoFocus onClick={() => usePending(false)}>{t('coll.addTo')}</button>
          <button className="btn" onClick={() => usePending(true)}>{t('coll.replace')}</button>
          <button className="btn btn-quiet" onClick={() => setPending(null)}>{t('cancel')}</button>
        </div>
      )}
      {importOpen && importPanel}
      {msg && <p className={`note note-${msg.kind}`} role="status">{msg.text}</p>}
      {load.total > 0 && load.done < load.total && !load.error && <p className="hint" role="status">{t('coll.loadingImg', load.done, load.total)}</p>}
      {load.error && <p className="note note-error">{t('coll.scryDown')}</p>}
      <div className="coll-tools" ref={toolsRef}>
        <label className="search">
          <IconSearch size={18} />
          <input type="search" value={q} onChange={e => { setQ(e.target.value); setLimit(STEP) }} placeholder={t('coll.search')} aria-label={t('coll.search')} />
        </label>

        <div className="seg seg-scroll" role="group" aria-label={t('coll.typeAria')}>
          {TYPE_FILTERS.map(([k]) => <button key={k} aria-pressed={type === k} onClick={() => setP({ type: k })}>{t(`type.${k}`)}</button>)}
        </div>
        <span className="coll-tools-right">
        <button className={`btn btn-quiet more-btn${more ? ' open' : ''}`} aria-expanded={more} onClick={() => setMore(m => !m)}>
          <IconFilter size={18} />{t('coll.moreFilters')}{nFlt > 0 && <span className="count">{nFlt}</span>}
        </button>
        <span className="field">
          <span className="field-label" aria-hidden="true">{t('sort')}</span>
          <Picker label={t('sort')} value={sort} onChange={v => setP({ sort: v })} options={COLL_SORTS.map(k => ({ value: k, label: t(`coll.sort.${k}`) }))} align="right" />
        </span>
        <div className="seg seg-icons" role="group" aria-label={t('view')}>
          <button aria-pressed={view === 'list'} onClick={() => setP({ view: 'list' })} title={t('coll.list')}><IconList size={18} /><span className="sr-only">{t('coll.list')}</span></button>
          <button aria-pressed={view === 'grid'} onClick={() => setP({ view: 'grid' })} title={t('view.cards')}><IconGrid size={18} /><span className="sr-only">{t('view.cards')}</span></button>
        </div>
        {view === 'grid' && <label className="cols-ctl">
          <span>{t('coll.cols')}</span>
          <input type="range" min="2" max={colsMax} step="1" value={cols} onChange={e => setPrefs({ ...prefs, cols: +e.target.value })} style={{ '--fill': `${(cols - 2) / (colsMax - 2) * 100}%` }} />
          <output aria-hidden="true">{cols}</output>
        </label>}
        </span>
        {more && (
          <div className="more-filters">
            <FilterPick label={t('coll.f.artist')} value={flt.artist} onChange={v => setF({ artist: v })} all={t('coll.f.all')}
              options={fx.artists.map(([a, n]) => ({ value: a, label: `${a} (${n})` }))} />
            <FilterPick label={t('coll.f.set')} value={flt.set} onChange={v => setF({ set: v })} all={t('coll.f.all')}
              options={fx.sets.map(x => ({ value: x.code, label: `${x.name} (${x.n})` }))} />
            <FilterPick label={t('coll.f.rarity')} value={flt.rarity} onChange={v => setF({ rarity: v })} all={t('coll.f.all')}
              options={fx.rarities.map(([r, n]) => ({ value: r, label: `${t(`rarity.${r}`)} (${n})` }))} />
            <FilterPick label={t('coll.f.otag')} value={flt.otag} onChange={v => setF({ otag: v })} all={t('coll.f.all')} loading={!tags}
              options={(tags?.ids.oracle || []).map(id => ({ value: id, label: t(`otag.${id}`) }))} />
            <FilterPick label={t('coll.f.atag')} value={flt.atag} onChange={v => setF({ atag: v })} all={t('coll.f.all')} loading={!tags}
              options={(tags?.ids.art || []).map(id => ({ value: id, label: t(`atag.${id}`) }))} />
            <FilterPick label={t('coll.f.foil')} value={flt.foil} onChange={v => setF({ foil: v })} all={t('coll.f.all')}
              options={fx.foil[0] ? [{ value: 'foil', label: t('coll.f.foilOnly', fx.foil[0]) }, { value: 'normal', label: t('coll.f.nonFoil', fx.foil[1]) }] : []} />
            <FilterPick label={t('coll.f.ban')} value={flt.ban} onChange={v => setF({ ban: v })} all={t('coll.f.all')}
              options={fx.bans.map(([f, n]) => ({ value: f, label: `${f === 'any' ? t('coll.f.banAny') : FORMAT_LABEL[f]} (${n})` }))} />
            {nFlt > 0 && <button className="linklike" onClick={() => setF({ artist: null, set: null, rarity: null, otag: null, atag: null, ban: null, foil: null })}>{t('coll.f.clear')}</button>}
            <p className="hint more-hint">{t('coll.f.hint')}</p>
          </div>
        )}
      </div>

      {!filtered.length && <p className="empty">{q ? t('coll.noMatchQ', q) : t('coll.noMatch')}</p>}

      {visible.map(([k, list, part]) => part.length > 0 && (
        <section key={k} id={`sez-${k}`} className={`binder-sec bc-${k}`} aria-labelledby={`h-${k}`}>
          <h2 id={`h-${k}`}><span className={`dot bc-${k}`} aria-hidden="true" />{binderName(k)} <span>{t('coll.cards', list.reduce((s, c) => s + c.qty, 0))}</span></h2>
          {view === 'grid' ? (
            <ul className="ctiles" style={{ '--cols': cols }}>
              {part.map(r => (
                <li key={r.key} className={`ctile${fresh.has(r.key) ? ' just-added' : ''}${r.foil ? ' foil' : ''}`}>
                  <div className="ctile-art">
                    <a href={r.card?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${r.name}"`)}`} target="_blank" rel="noreferrer" className="ctile-img" title={r.name}>
                      <Thumb card={r.card} name={r.name} big cols={cols} />
                      {r.foil && <Sparkles />}
                      <span className="ctile-qty" aria-hidden="true">×{r.qty}{r.foil && <span className="foil-tag">Foil</span>}</span>
                    </a>
                  </div>
                  <span className="ctile-name">{r.name}{r.foil && <span className="sr-only"> (foil)</span>}</span>
                  {printText(r.card) && <span className="ctile-print" title={printText(r.card)}><PrintLine card={r.card} /></span>}
                  {flt.ban && <BanStamps card={r.card} />}
                  <div className="ctile-ctl">
                    <DeleteBtn r={r} onDelete={remove} className="btn-del ctile-del" />
                    <Stepper c={r} setQty={setQty} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="crows">
              {part.map(r => (
                <li key={r.key} className={fresh.has(r.key) ? 'just-added' : undefined}>
                  <span className={`thumb-box${r.foil ? ' foil' : ''}`}><Thumb card={r.card} name={r.name} />{r.foil && <Sparkles n={2} />}</span>
                  <span className="crow-main">
                    <a href={r.card?.uri || '#'} target="_blank" rel="noreferrer" className="crow-name">{r.name}</a>
                    <span className="crow-type">{r.foil && <span className="foil-tag">Foil</span>}{r.card?.type || '—'}{printText(r.card) && <span className="crow-print"><PrintLine card={r.card} /></span>}</span>
                    {flt.ban && <BanStamps card={r.card} />}
                  </span>
                  <ManaCost cost={r.card?.cost} slot />
                  <span className="crow-price">{priceOf(r.card) != null ? money(priceOf(r.card) * r.qty, true) : '—'}</span>
                  <span className="crow-ctl"><Stepper c={r} setQty={setQty} /><DeleteBtn r={r} onDelete={remove} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {filtered.length > shownCount && (
        <button className="btn more" onClick={() => setLimit(l => l + STEP)}>{t('coll.more', filtered.length - shownCount)}</button>
      )}
      {/* i traguardi sono un extra: vengono dopo le carte */}
      <div className="coll-ach"><Achievements unlocked={unlocked} /></div>
    </div>
  )
}
