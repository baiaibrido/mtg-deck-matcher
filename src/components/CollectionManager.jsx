import ConfirmButton from './ConfirmButton.jsx'
import { useEffect, useRef, useState } from 'react'
import { parseCollection } from '../lib/parser.js'
import { mergeEntries } from '../lib/normalize.js'
import { normalizeCollection, fetchCards, getCached, smallImg } from '../lib/scryfall.js'
import { BINDER, binderOf, binderName, TYPE_FILTERS } from '../lib/deckInfo.js'
import { t, getLang } from '../i18n/index.js'
import { money, priceOf } from '../lib/currency.js'
import { formatList } from '../lib/bans.js'
import { collectionCsv, downloadTxt } from '../lib/export.js'
import { useLocal } from '../state/useLocal.js'
import { ManaCost } from './Mana.jsx'
import { IconUpload, IconSearch, IconPlus, IconMinus, IconTrash, IconWand, IconDownload, IconGrid, IconList } from './Icons.jsx'

const STEP = 120 // carte mostrate per volta: le immagini si caricano man mano
const SORTS = ['name', 'qty', 'price']

function Stepper({ c, setQty }) {
  return (
    <span className="stepper">
      <button onClick={() => setQty(c.name, c.qty - 1)} aria-label={t('coll.minus', c.name)}><IconMinus size={16} /></button>
      <input type="number" min="0" inputMode="numeric" value={c.qty} aria-label={t('coll.copiesOf', c.name)}
        onChange={e => setQty(c.name, Math.max(0, parseInt(e.target.value, 10) || 0))} />
      <button onClick={() => setQty(c.name, c.qty + 1)} aria-label={t('coll.plus', c.name)}><IconPlus size={16} /></button>
    </span>
  )
}

function DeleteBtn({ name, onDelete, className = 'btn-del' }) {
  return <button className={className} onClick={() => onDelete(name)} aria-label={t('coll.delete', name)} title={t('coll.deleteTitle')}><IconTrash size={16} /></button>
}

// Carta bannata in almeno un formato del sito (o ristretta in Vintage)
function BanChip({ card }) {
  if (!card?.bn?.length && !card?.rs?.length) return null
  const title = [card.bn.length && t('ban.card', formatList(card.bn)), card.rs?.length && t('ban.restricted', formatList(card.rs))].filter(Boolean).join(' · ')
  return <span className="ban-chip ban-chip-card" title={title}>{card.bn.length ? 'BAN' : 'R'}<span className="sr-only">: {title}</span></span>
}

function Thumb({ card, name, big }) {
  if (!card?.img) return <span className={big ? 'ctile-ph' : 'thumb thumb-ph'} aria-hidden="true">{big && <><span>{name}</span><ManaCost cost={card?.cost} /></>}</span>
  return big
    ? <img src={smallImg(card.img)} srcSet={`${smallImg(card.img)} 146w, ${card.img} 488w`} sizes="(max-width: 560px) 31vw, 140px" alt={name} loading="lazy" />
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

export default function CollectionManager({ collection, setCollection, toast }) {
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
  const [prefs, setPrefs] = useLocal('mdm.collView', {})
  const view = prefs.view || 'grid', sort = prefs.sort || 'name', type = prefs.type || 'all'
  const [limit, setLimit] = useState(STEP)
  const [load, setLoad] = useState({ done: 0, total: 0, error: false })
  const [, setTick] = useState(0)

  // Dati Scryfall (immagini, colori, tipi, prezzi) per tutta la collezione, a blocchi
  const namesKey = collection.map(c => c.name).join('|')
  useEffect(() => {
    if (!collection.length) return
    let alive = true
    fetchCards(collection.map(c => c.name), { onProgress: (done, total) => { if (alive) { setLoad({ done, total, error: false }); setTick(t => t + 1) } } })
      .then(() => alive && (setLoad(l => ({ ...l, done: l.total })), setTick(t => t + 1)))
      .catch(() => alive && setLoad(l => ({ ...l, error: true })))
    return () => { alive = false }
  }, [namesKey])

  const total = collection.reduce((s, c) => s + c.qty, 0)
  const rows = collection.map(c => ({ ...c, card: getCached(c.name) }))
  const value = rows.reduce((s, r) => s + (priceOf(r.card) ?? 0) * r.qty, 0)
  const priced = rows.some(r => priceOf(r.card) != null)

  const filtered = (() => {
    const s = q.trim().toLowerCase()
    const tf = TYPE_FILTERS.find(([k]) => k === type)?.[1] || (() => true)
    const list = rows.filter(r => (!s || r.name.toLowerCase().includes(s)) && (type === 'all' || (r.card && tf(r.card.type))))
    const by = { name: (a, b) => a.name.localeCompare(b.name), qty: (a, b) => b.qty - a.qty || a.name.localeCompare(b.name), price: (a, b) => (priceOf(b.card) ?? -1) * b.qty - (priceOf(a.card) ?? -1) * a.qty }
    return list.sort(by[sort])
  })()
  const sections = BINDER.map(k => [k, filtered.filter(r => binderOf(r.card) === k)]).filter(([, l]) => l.length)
  const allSections = BINDER.map(k => [k, rows.filter(r => binderOf(r.card) === k)]).filter(([, l]) => l.length)

  const apply = () => {
    const parsed = parseCollection(text)
    if (!parsed.length) return setMsg({ kind: 'error', text: t('coll.noneRecognized') })
    setCollection(mergeEntries([...collection, ...parsed]))
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
    setCollection(replace ? list : mergeEntries([...collection, ...list])); setPending(null); setImportOpen(false)
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
      const fixedCount = collection.filter(c => !list.some(x => x.name === c.name)).length
      setCollection(list)
      const names = notFound.map(n => suggestions?.[n] ? t('coll.maybe', n, suggestions[n]) : n)
      setMsg(notFound.length ? { kind: 'error', text: t('coll.unrecognized', notFound.length, names.join(', '), binderName('?')) } : null)
      if (!notFound.length) toast(fixedCount ? t('coll.fixed', fixedCount) : t('coll.allGood'))
    } catch (err) { setMsg({ kind: 'error', text: t('coll.scryErr', err.message) }) }
    setBusy(false)
  }
  const setQty = (name, qty) => setCollection(collection.map(c => c.name === name ? { ...c, qty } : c).filter(c => c.qty > 0))
  const remove = name => {
    const prev = collection
    setCollection(collection.filter(c => c.name !== name))
    toast(t('coll.removed', name), { label: t('undo'), fn: () => setCollection(prev) })
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
      <textarea ref={textRef} rows={5} value={text} onChange={e => setText(e.target.value)} aria-label={t('coll.listAria')}
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
        <h1>{t('coll.title')}</h1>
        <p>
          {t('coll.summary', total.toLocaleString(getLang()), collection.length.toLocaleString(getLang()))}
          {priced && <>{t('coll.value')}<b>≈ {money(value)}</b></>}.
          {' '}{t('coll.savedHere')}
        </p>
      </header>

      <Spine sections={allSections} total={total} />

      <div className="coll-actions">
        <button className="btn btn-primary" onClick={() => setImportOpen(o => !o)} aria-expanded={importOpen}><IconPlus size={18} />{t('coll.addCards')}</button>
        <label className="btn btn-quiet"><IconUpload size={18} /><span className="btn-2l">{t('coll.importFile')}<small>{t('coll.importFileHint')}</small></span>{fileInput}</label>
        <button className="btn btn-quiet" onClick={normalize} disabled={busy}><IconWand size={18} /><span className="btn-2l">{t('coll.fixNames')}<small>{t('coll.fixHint')}</small></span></button>
        <button className="btn btn-quiet" onClick={() => { downloadTxt(`${t('coll.file')}-${new Date().toISOString().slice(0, 10)}.csv`, collectionCsv(collection), 'text/csv'); toast(t('coll.backupDone')) }}><IconDownload size={18} />{t('coll.backup')}</button>
        <ConfirmButton className="btn btn-quiet btn-danger" label={t('coll.clear')} question={t('coll.confirmClear')} yes={t('coll.clearYes')}
          onConfirm={() => { const prev = collection; setCollection([]); toast(t('coll.cleared'), { label: t('undo'), fn: () => setCollection(prev) }) }} />
      </div>
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

      <div className="coll-tools">
        <label className="search">
          <IconSearch size={18} />
          <input type="search" value={q} onChange={e => { setQ(e.target.value); setLimit(STEP) }} placeholder={t('coll.search')} aria-label={t('coll.search')} />
        </label>
        <div className="chips" role="group" aria-label={t('coll.typeAria')}>
          {TYPE_FILTERS.map(([k]) => <button key={k} aria-pressed={type === k} onClick={() => setP({ type: k })}>{t(`type.${k}`)}</button>)}
        </div>
        <label className="select">
          <span>{t('sort')}</span>
          <select value={sort} onChange={e => setP({ sort: e.target.value })}>
            {SORTS.map(k => <option key={k} value={k}>{t(`coll.sort.${k}`)}</option>)}
          </select>
        </label>
        <div className="seg seg-icons" role="group" aria-label={t('view')}>
          <button aria-pressed={view === 'list'} onClick={() => setP({ view: 'list' })} title={t('coll.list')}><IconList size={18} /><span className="sr-only">{t('coll.list')}</span></button>
          <button aria-pressed={view === 'grid'} onClick={() => setP({ view: 'grid' })} title={t('view.cards')}><IconGrid size={18} /><span className="sr-only">{t('view.cards')}</span></button>
        </div>
      </div>

      {!filtered.length && <p className="empty">{q ? t('coll.noMatchQ', q) : t('coll.noMatch')}</p>}

      {visible.map(([k, list, part]) => part.length > 0 && (
        <section key={k} id={`sez-${k}`} className="binder-sec" aria-labelledby={`h-${k}`}>
          <h2 id={`h-${k}`}><span className={`dot bc-${k}`} aria-hidden="true" />{binderName(k)} <span>{t('coll.cards', list.reduce((s, c) => s + c.qty, 0))}</span></h2>
          {view === 'grid' ? (
            <ul className="ctiles">
              {part.map(r => (
                <li key={r.name} className="ctile">
                  <div className="ctile-art">
                    <a href={r.card?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${r.name}"`)}`} target="_blank" rel="noreferrer" className="ctile-img" title={r.name}>
                      <Thumb card={r.card} name={r.name} big />
                      <span className="ctile-qty" aria-hidden="true">×{r.qty}</span>
                      <BanChip card={r.card} />
                    </a>
                    <DeleteBtn name={r.name} onDelete={remove} className="btn-del ctile-del" />
                  </div>
                  <span className="ctile-name">{r.name}</span>
                  <Stepper c={r} setQty={setQty} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="crows">
              {part.map(r => (
                <li key={r.name}>
                  <Thumb card={r.card} name={r.name} />
                  <span className="crow-main">
                    <a href={r.card?.uri || '#'} target="_blank" rel="noreferrer" className="crow-name">{r.name}</a>
                    <span className="crow-type">{r.card?.type || '—'} <BanChip card={r.card} /></span>
                  </span>
                  <ManaCost cost={r.card?.cost} />
                  <span className="crow-price">{priceOf(r.card) != null ? money(priceOf(r.card) * r.qty, true) : '—'}</span>
                  <span className="crow-ctl"><Stepper c={r} setQty={setQty} /><DeleteBtn name={r.name} onDelete={remove} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {filtered.length > shownCount && (
        <button className="btn more" onClick={() => setLimit(l => l + STEP)}>{t('coll.more', filtered.length - shownCount)}</button>
      )}
    </div>
  )
}
