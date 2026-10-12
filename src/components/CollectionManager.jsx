import { useMemo, useState } from 'react'
import { parseCollection } from '../lib/parser.js'
import { mergeEntries } from '../lib/normalize.js'
import { normalizeCollection } from '../lib/scryfall.js'
import { IconUpload, IconSearch, IconPlus, IconMinus, IconWand } from './Icons.jsx'

const PAGE = 300

export default function CollectionManager({ collection, setCollection, toast }) {
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState(null) // { kind: 'info'|'error', text }
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)

  const total = collection.reduce((t, c) => t + c.qty, 0)
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return collection.filter(c => !s || c.name.toLowerCase().includes(s)).sort((a, b) => a.name.localeCompare(b.name))
  }, [collection, q])

  const apply = replace => {
    const parsed = parseCollection(text)
    if (!parsed.length) return setMsg({ kind: 'error', text: 'Nessuna carta riconosciuta. Scrivi una carta per riga, ad esempio "4 Lightning Bolt", oppure incolla un CSV con le colonne Name e Qty.' })
    const n = parsed.reduce((t, c) => t + c.qty, 0)
    setCollection(replace ? parsed : mergeEntries([...collection, ...parsed]))
    setText(''); setMsg(null)
    toast(replace ? `Collezione sostituita: ${n} carte` : `${n} carte aggiunte`)
  }

  const readFile = async f => { if (f) { setText(await f.text()); setMsg({ kind: 'info', text: `File "${f.name}" pronto: scegli se aggiungerlo o sostituire la collezione.` }) } }

  const normalize = async () => {
    setBusy(true); setMsg({ kind: 'info', text: 'Controllo i nomi su Scryfall…' })
    try {
      const { list, notFound } = await normalizeCollection(collection, (d, t) => setMsg({ kind: 'info', text: `Controllo i nomi su Scryfall… ${d}/${t}` }))
      setCollection(list)
      setMsg(notFound.length ? { kind: 'error', text: `Nomi non riconosciuti (${notFound.length}): ${notFound.join(', ')}. Correggili a mano qui sotto.` } : null)
      if (!notFound.length) toast('Nomi corretti')
    } catch (err) { setMsg({ kind: 'error', text: `Scryfall non risponde (${err.message}). Riprova tra qualche minuto.` }) }
    setBusy(false)
  }

  const setQty = (name, qty) => setCollection(collection.map(c => c.name === name ? { ...c, qty } : c).filter(c => c.qty > 0))

  return (
    <div className="coll">
      <header className="page-head">
        <h1>La tua collezione</h1>
        <p>{collection.length ? `${total.toLocaleString('it-IT')} carte, ${collection.length.toLocaleString('it-IT')} diverse. Salvata solo su questo dispositivo.` : 'Aggiungi le carte che possiedi per scoprire quali mazzi puoi completare.'}</p>
      </header>

      <section className="panel import">
        <h2>Aggiungi carte</h2>
        <label className={`drop${drag ? ' drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files[0]) }}>
          <IconUpload size={22} />
          <span><b>Carica un file</b> .csv o .txt <span className="muted">oppure trascinalo qui</span></span>
          <input type="file" accept=".csv,.txt" onChange={e => { readFile(e.target.files[0]); e.target.value = '' }} />
        </label>
        <textarea rows={6} value={text} onChange={e => setText(e.target.value)} aria-label="Elenco carte"
          placeholder={'Oppure incolla l\'elenco, una carta per riga:\n4 Lightning Bolt\n2 Counterspell\n20 Mountain'} />
        <div className="row">
          <button className="btn btn-primary" onClick={() => apply(false)} disabled={!text.trim()}>Aggiungi alla collezione</button>
          <button className="btn" onClick={() => apply(true)} disabled={!text.trim()}>Sostituisci collezione</button>
        </div>
        {msg && <p className={`note note-${msg.kind}`} role="status">{msg.text}</p>}
        <p className="hint">Ricordati delle terre base (es. "20 Mountain"): contano anche loro nel calcolo.</p>
      </section>

      {collection.length > 0 && (
        <section className="panel owned">
          <div className="owned-head">
            <h2>Carte possedute</h2>
            <div className="row">
              <button className="btn btn-quiet" onClick={normalize} disabled={busy}><IconWand size={18} />Correggi i nomi</button>
              <button className="btn btn-quiet btn-danger" onClick={() => confirm('Svuotare tutta la collezione?') && setCollection([])}>Svuota</button>
            </div>
          </div>
          <label className="search">
            <IconSearch size={18} />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca una carta" aria-label="Cerca una carta" />
          </label>
          <ul className="owned-list">
            {shown.slice(0, PAGE).map(c => (
              <li key={c.name}>
                <span className="owned-name">{c.name}</span>
                <span className="stepper">
                  <button onClick={() => setQty(c.name, c.qty - 1)} aria-label={`Togli una copia di ${c.name}`}><IconMinus size={16} /></button>
                  <input type="number" min="0" inputMode="numeric" value={c.qty} aria-label={`Copie di ${c.name}`}
                    onChange={e => setQty(c.name, Math.max(0, parseInt(e.target.value, 10) || 0))} />
                  <button onClick={() => setQty(c.name, c.qty + 1)} aria-label={`Aggiungi una copia di ${c.name}`}><IconPlus size={16} /></button>
                </span>
              </li>
            ))}
          </ul>
          {shown.length > PAGE && <p className="hint">Mostro le prime {PAGE} di {shown.length}: usa la ricerca per trovare le altre.</p>}
          {!shown.length && <p className="empty">Nessuna carta corrisponde a "{q}".</p>}
        </section>
      )}
    </div>
  )
}
