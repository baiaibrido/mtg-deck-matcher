import { useEffect, useState } from 'react'
import { parseCollection } from '../lib/parser.js'
import { mergeEntries } from '../lib/normalize.js'
import { normalizeCollection, fetchCards, getCached, smallImg } from '../lib/scryfall.js'
import { BINDER, binderOf, TYPE_FILTERS, euro } from '../lib/deckInfo.js'
import { collectionCsv, downloadTxt } from '../lib/export.js'
import { useLocal } from '../state/useLocal.js'
import { ManaCost } from './Mana.jsx'
import { IconUpload, IconSearch, IconPlus, IconMinus, IconTrash, IconWand, IconDownload, IconGrid, IconList } from './Icons.jsx'

const STEP = 120 // carte mostrate per volta: le immagini si caricano man mano
const SORTS = { name: 'Nome', qty: 'Copie', price: 'Valore' }
const BINDER_NAME = Object.fromEntries(BINDER)

function Stepper({ c, setQty }) {
  return (
    <span className="stepper">
      <button onClick={() => setQty(c.name, c.qty - 1)} aria-label={`Togli una copia di ${c.name}`}><IconMinus size={16} /></button>
      <input type="number" min="0" inputMode="numeric" value={c.qty} aria-label={`Copie di ${c.name}`}
        onChange={e => setQty(c.name, Math.max(0, parseInt(e.target.value, 10) || 0))} />
      <button onClick={() => setQty(c.name, c.qty + 1)} aria-label={`Aggiungi una copia di ${c.name}`}><IconPlus size={16} /></button>
    </span>
  )
}

function DeleteBtn({ name, onDelete, className = 'btn-del' }) {
  return <button className={className} onClick={() => onDelete(name)} aria-label={`Elimina ${name} dalla collezione`} title="Elimina"><IconTrash size={16} /></button>
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
    <nav className="spine" aria-label="Sezioni della collezione">
      <div className="spine-bar" aria-hidden="true">
        {sections.map(([k, list]) => <span key={k} className={`bc-${k}`} style={{ flexGrow: list.reduce((t, c) => t + c.qty, 0) }} />)}
      </div>
      <ul>
        {sections.map(([k, list]) => {
          const n = list.reduce((t, c) => t + c.qty, 0)
          return (
            <li key={k}>
              <a href={`#sez-${k}`} onClick={e => { e.preventDefault(); document.getElementById(`sez-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
                <span className={`dot bc-${k}`} aria-hidden="true" />{BINDER_NAME[k]} <b>{n}</b>
                <span className="sr-only"> carte, {Math.round(n / total * 100)}%</span>
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

  const total = collection.reduce((t, c) => t + c.qty, 0)
  const rows = collection.map(c => ({ ...c, card: getCached(c.name) }))
  const value = rows.reduce((t, r) => t + (r.card?.eur ?? 0) * r.qty, 0)
  const priced = rows.some(r => r.card?.eur != null)

  const filtered = (() => {
    const s = q.trim().toLowerCase()
    const tf = TYPE_FILTERS.find(([k]) => k === type)?.[2] || (() => true)
    const list = rows.filter(r => (!s || r.name.toLowerCase().includes(s)) && (type === 'all' || (r.card && tf(r.card.type))))
    const by = { name: (a, b) => a.name.localeCompare(b.name), qty: (a, b) => b.qty - a.qty || a.name.localeCompare(b.name), price: (a, b) => (b.card?.eur ?? -1) * b.qty - (a.card?.eur ?? -1) * a.qty }
    return list.sort(by[sort])
  })()
  const sections = BINDER.map(([k]) => [k, filtered.filter(r => binderOf(r.card) === k)]).filter(([, l]) => l.length)
  const allSections = BINDER.map(([k]) => [k, rows.filter(r => binderOf(r.card) === k)]).filter(([, l]) => l.length)

  const apply = replace => {
    const parsed = parseCollection(text)
    if (!parsed.length) return setMsg({ kind: 'error', text: 'Nessuna carta riconosciuta. Scrivi una carta per riga, ad esempio "4 Lightning Bolt", oppure incolla un CSV con le colonne Name e Qty.' })
    const n = parsed.reduce((t, c) => t + c.qty, 0)
    setCollection(replace ? parsed : mergeEntries([...collection, ...parsed]))
    setText(''); setMsg(null); setImportOpen(false)
    toast(replace ? `Collezione sostituita: ${n} carte` : `${n} carte aggiunte`)
  }
  const readFile = async f => { if (f) { setText(await f.text()); setMsg({ kind: 'info', text: `File "${f.name}" pronto: scegli se aggiungerlo o sostituire la collezione.` }) } }
  const normalize = async () => {
    setBusy(true); setMsg({ kind: 'info', text: 'Controllo i nomi su Scryfall…' })
    try {
      const { list, notFound, suggestions } = await normalizeCollection(collection, (d, t) => setMsg({ kind: 'info', text: `Controllo i nomi su Scryfall… ${d}/${t}` }))
      const fixedCount = collection.filter(c => !list.some(x => x.name === c.name)).length
      setCollection(list)
      const names = notFound.map(n => suggestions?.[n] ? `${n} (forse ${suggestions[n].join(' o ')}?)` : n)
      setMsg(notFound.length ? { kind: 'error', text: `Nomi non riconosciuti (${notFound.length}): ${names.join(', ')}. Sono troppo diversi da qualsiasi carta: correggili a mano o eliminali dalla sezione "Dati in arrivo".` } : null)
      if (!notFound.length) toast(fixedCount ? `Nomi corretti: ${fixedCount}` : 'Tutti i nomi erano già giusti')
    } catch (err) { setMsg({ kind: 'error', text: `Scryfall non risponde (${err.message}). Riprova tra qualche minuto.` }) }
    setBusy(false)
  }
  const setQty = (name, qty) => setCollection(collection.map(c => c.name === name ? { ...c, qty } : c).filter(c => c.qty > 0))
  const remove = name => {
    const prev = collection
    setCollection(collection.filter(c => c.name !== name))
    toast(`${name} eliminata`, { label: 'Annulla', fn: () => setCollection(prev) })
  }
  const setP = patch => { setPrefs({ ...prefs, ...patch }); setLimit(STEP) }

  // Paginazione: le prime `limit` carte nell'ordine delle sezioni
  let budget = limit
  const visible = sections.map(([k, list]) => { const part = list.slice(0, Math.max(0, budget)); budget -= part.length; return [k, list, part] })
  const shownCount = Math.min(limit, filtered.length)

  const importPanel = (
    <section className="panel import" aria-labelledby="imp-title">
      <h2 id="imp-title">Aggiungi carte</h2>
      <label className={`drop${drag ? ' drag' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files[0]) }}>
        <IconUpload size={22} />
        <span><b>Carica un file</b> .csv o .txt <span className="muted">oppure trascinalo qui. Vanno bene gli export di ManaBox, Moxfield, Deckbox, Dragon Shield e Cardmarket.</span></span>
        <input type="file" accept=".csv,.txt" onChange={e => { readFile(e.target.files[0]); e.target.value = '' }} />
      </label>
      <textarea rows={5} value={text} onChange={e => setText(e.target.value)} aria-label="Elenco carte"
        placeholder={'Oppure incolla l\'elenco, una carta per riga:\n4 Lightning Bolt\n2 Counterspell\n1 Snow-Covered Island'} />
      <div className="row">
        <button className="btn btn-primary" onClick={() => apply(false)} disabled={!text.trim()}>Aggiungi alla collezione</button>
        <button className="btn" onClick={() => apply(true)} disabled={!text.trim()}>Sostituisci collezione</button>
        {collection.length > 0 && <button className="btn btn-quiet" onClick={() => setImportOpen(false)}>Chiudi</button>}
      </div>
      <p className="hint">Le terre base (Plains, Island, Swamp, Mountain, Forest) non servono: le consideriamo sempre possedute e vengono ignorate se sono nel file. Per spostare la collezione su un altro dispositivo scarica il backup e caricalo lì con "Sostituisci collezione".</p>
    </section>
  )

  if (!collection.length) return (
    <div className="coll">
      <header className="page-head">
        <h1>La tua collezione</h1>
        <p>Aggiungi le carte che possiedi per scoprire quali mazzi puoi completare. La collezione resta salvata solo su questo dispositivo.</p>
      </header>
      {importPanel}
      {msg && <p className={`note note-${msg.kind}`} role="status">{msg.text}</p>}
    </div>
  )

  return (
    <div className="coll">
      <header className="page-head coll-head">
        <h1>La tua collezione</h1>
        <p>
          {total.toLocaleString('it-IT')} carte, {collection.length.toLocaleString('it-IT')} diverse
          {priced && <>, valore stimato <b>≈ {euro(value)}</b></>}.
          {' '}Salvata solo su questo dispositivo.
        </p>
      </header>

      <Spine sections={allSections} total={total} />

      <div className="coll-actions">
        <button className="btn btn-primary" onClick={() => setImportOpen(o => !o)} aria-expanded={importOpen}><IconPlus size={18} />Aggiungi carte</button>
        <button className="btn btn-quiet" onClick={normalize} disabled={busy}><IconWand size={18} />Correggi i nomi</button>
        <button className="btn btn-quiet" onClick={() => { downloadTxt(`collezione-${new Date().toISOString().slice(0, 10)}.csv`, collectionCsv(collection), 'text/csv'); toast('Backup scaricato') }}><IconDownload size={18} />Backup</button>
        <button className="btn btn-quiet btn-danger" onClick={() => { if (!confirm('Svuotare tutta la collezione?')) return; const prev = collection; setCollection([]); toast('Collezione svuotata', { label: 'Annulla', fn: () => setCollection(prev) }) }}>Svuota</button>
      </div>
      {importOpen && importPanel}
      {msg && <p className={`note note-${msg.kind}`} role="status">{msg.text}</p>}
      {load.total > 0 && load.done < load.total && !load.error && <p className="hint" role="status">Carico immagini e prezzi da Scryfall… {load.done}/{load.total}</p>}
      {load.error && <p className="note note-error">Scryfall non risponde: immagini e prezzi non sono disponibili, la collezione funziona lo stesso.</p>}

      <div className="coll-tools">
        <label className="search">
          <IconSearch size={18} />
          <input type="search" value={q} onChange={e => { setQ(e.target.value); setLimit(STEP) }} placeholder="Cerca una carta" aria-label="Cerca una carta" />
        </label>
        <div className="chips" role="group" aria-label="Tipo di carta">
          {TYPE_FILTERS.map(([k, label]) => <button key={k} aria-pressed={type === k} onClick={() => setP({ type: k })}>{label}</button>)}
        </div>
        <label className="select">
          <span>Ordina</span>
          <select value={sort} onChange={e => setP({ sort: e.target.value })}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <div className="seg seg-icons" role="group" aria-label="Vista">
          <button aria-pressed={view === 'grid'} onClick={() => setP({ view: 'grid' })} title="Griglia"><IconGrid size={18} /><span className="sr-only">Griglia</span></button>
          <button aria-pressed={view === 'list'} onClick={() => setP({ view: 'list' })} title="Elenco"><IconList size={18} /><span className="sr-only">Elenco</span></button>
        </div>
      </div>

      {!filtered.length && <p className="empty">Nessuna carta corrisponde {q ? `a "${q}"` : 'a questo filtro'}.</p>}

      {visible.map(([k, list, part]) => part.length > 0 && (
        <section key={k} id={`sez-${k}`} className="binder-sec" aria-labelledby={`h-${k}`}>
          <h2 id={`h-${k}`}><span className={`dot bc-${k}`} aria-hidden="true" />{BINDER_NAME[k]} <span>{list.reduce((t, c) => t + c.qty, 0)} carte</span></h2>
          {view === 'grid' ? (
            <ul className="ctiles">
              {part.map(r => (
                <li key={r.name} className="ctile">
                  <div className="ctile-art">
                    <a href={r.card?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${r.name}"`)}`} target="_blank" rel="noreferrer" className="ctile-img" title={r.name}>
                      <Thumb card={r.card} name={r.name} big />
                      <span className="ctile-qty" aria-hidden="true">×{r.qty}</span>
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
                    <span className="crow-type">{r.card?.type || '—'}</span>
                  </span>
                  <ManaCost cost={r.card?.cost} />
                  <span className="crow-price">{r.card?.eur != null ? euro(r.card.eur * r.qty, true) : '—'}</span>
                  <span className="crow-ctl"><Stepper c={r} setQty={setQty} /><DeleteBtn name={r.name} onDelete={remove} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {filtered.length > shownCount && (
        <button className="btn more" onClick={() => setLimit(l => l + STEP)}>Mostra altre carte ({filtered.length - shownCount} rimanenti)</button>
      )}
    </div>
  )
}
