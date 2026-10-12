import { useState } from 'react'
import { parseDeck } from '../lib/parser.js'
import { toEntries } from '../lib/metaDecks.js'

// Aggiunge mazzi meta: incolla la decklist (es. "Export" da MTGdecks / MTGA) oppure un file JSON.
export default function MetaImporter({ format, onAdd }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  const add = () => {
    const { main, side } = parseDeck(text)
    if (!main.length) return setMsg('Decklist non riconosciuta.')
    onAdd([{ id: `user-${Date.now()}`, name: name.trim() || 'Mazzo importato', url: url.trim() || undefined, format, source: 'utente', main, side }])
    setMsg(`Aggiunto: main ${main.reduce((t, c) => t + c.qty, 0)}, side ${side.reduce((t, c) => t + c.qty, 0)}.`)
    setName(''); setUrl(''); setText('')
  }

  const onJson = async e => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    try {
      const j = JSON.parse(await f.text())
      const decks = (j.decks || j).map((d, i) => ({ ...d, id: d.id || `user-${Date.now()}-${i}`, format: d.format || format, source: 'utente', main: toEntries(d.main), side: toEntries(d.side) }))
      onAdd(decks); setMsg(`${decks.length} mazzi importati.`)
    } catch { setMsg('JSON non valido.') }
  }

  if (!open) return <button className="link" onClick={() => setOpen(true)}>+ Aggiungi mazzo meta</button>
  return (
    <section className="panel">
      <h2>Aggiungi mazzo meta</h2>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome mazzo (es. Mono Red Kuldotha)" />
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link fonte (facoltativo)" />
      <textarea rows={8} value={text} onChange={e => setText(e.target.value)} placeholder={'4 Lightning Bolt\n…\n\nSideboard\n3 Pyroblast'} />
      <div className="row">
        <button onClick={add} disabled={!text.trim()}>Aggiungi</button>
        <label className="btn">Importa JSON<input type="file" accept=".json" hidden onChange={onJson} /></label>
        <button className="link" onClick={() => setOpen(false)}>Chiudi</button>
      </div>
      {msg && <p className="msg">{msg}</p>}
    </section>
  )
}
