import { useMemo, useState } from 'react'
import { parseCollection } from '../lib/parser.js'
import { mergeEntries } from '../lib/normalize.js'
import { normalizeCollection } from '../lib/scryfall.js'

export default function CollectionManager({ collection, setCollection }) {
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const total = collection.reduce((t, c) => t + c.qty, 0)
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return [...collection].filter(c => !s || c.name.toLowerCase().includes(s)).sort((a, b) => a.name.localeCompare(b.name))
  }, [collection, q])

  const apply = replace => {
    const parsed = parseCollection(text)
    if (!parsed.length) return setMsg('Nessuna carta riconosciuta. Formato: "4 Lightning Bolt" oppure CSV con colonne Name,Qty.')
    setCollection(replace ? parsed : mergeEntries([...collection, ...parsed]))
    setMsg(`${parsed.length} carte ${replace ? 'caricate' : 'aggiunte'}.`); setText('')
  }

  const onFile = async e => { const f = e.target.files[0]; if (f) setText(await f.text()); e.target.value = '' }

  const normalize = async () => {
    setBusy(true); setMsg('Controllo nomi su Scryfall…')
    try {
      const { list, notFound } = await normalizeCollection(collection, (d, t) => setMsg(`Scryfall: ${d}/${t}`))
      setCollection(list)
      setMsg(notFound.length ? `Nomi non trovati (${notFound.length}): ${notFound.join(', ')}` : 'Tutti i nomi sono corretti ✓')
    } catch (err) { setMsg(`Errore Scryfall: ${err.message}`) }
    setBusy(false)
  }

  const setQty = (name, qty) => setCollection(collection.map(c => c.name === name ? { ...c, qty } : c).filter(c => c.qty > 0))

  return (
    <section className="panel">
      <h2>Collezione <small>{collection.length} carte diverse · {total} totali</small></h2>
      <textarea rows={6} value={text} onChange={e => setText(e.target.value)}
        placeholder={'Incolla qui la collezione:\n4 Lightning Bolt\n2 Counterspell\n…oppure carica un file CSV (Name,Qty)'} />
      <div className="row">
        <label className="btn">Carica file<input type="file" accept=".csv,.txt" hidden onChange={onFile} /></label>
        <button onClick={() => apply(false)} disabled={!text.trim()}>Aggiungi</button>
        <button onClick={() => apply(true)} disabled={!text.trim()}>Sostituisci tutto</button>
        <button onClick={normalize} disabled={busy || !collection.length}>Normalizza con Scryfall</button>
        <button className="danger" onClick={() => confirm('Svuotare la collezione?') && setCollection([])} disabled={!collection.length}>Svuota</button>
      </div>
      {msg && <p className="msg">{msg}</p>}
      {collection.length > 0 && <>
        <input className="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca carta…" />
        <ul className="coll">
          {shown.slice(0, 500).map(c => (
            <li key={c.name}>
              <input type="number" min="0" value={c.qty} onChange={e => setQty(c.name, parseInt(e.target.value, 10) || 0)} />
              <span>{c.name}</span>
            </li>
          ))}
        </ul>
        {shown.length > 500 && <small>Mostrate le prime 500: usa la ricerca.</small>}
      </>}
    </section>
  )
}
