import { useState } from 'react'
import { parseDeck } from '../lib/parser.js'
import { toEntries } from '../lib/metaDecks.js'
import { IconPlus } from './Icons.jsx'
import { t } from '../i18n/index.js'

// Mazzo aggiunto a mano: incolla la decklist (export MTGO/Arena/MTGTop8) oppure importa un JSON.
export default function MetaImporter({ format, formatName, onAdd, toast }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [err, setErr] = useState('')

  const add = () => {
    const { main, side } = parseDeck(text)
    if (!main.length) return setErr(t('mi.err'))
    onAdd([{ id: `user-${Date.now()}`, name: name.trim() || t('mi.defaultName'), format, source: 'utente', main, side }])
    toast(t('mi.added')); setName(''); setText(''); setErr(''); setOpen(false)
  }

  const onJson = async e => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    try {
      const j = JSON.parse(await f.text())
      const decks = (j.decks || j).map((d, i) => ({ ...d, id: d.id || `user-${Date.now()}-${i}`, format: d.format || format, source: 'utente', main: toEntries(d.main), side: toEntries(d.side) }))
      onAdd(decks); toast(t('mi.imported', decks.length)); setOpen(false)
    } catch { setErr(t('mi.badJson')) }
  }

  if (!open) return <button className="btn btn-quiet add-deck" onClick={() => setOpen(true)}><IconPlus size={18} />{t('mi.open')}</button>
  return (
    <section className="panel importer">
      <h2>{t('mi.title', formatName)}</h2>
      <input value={name} onChange={e => setName(e.target.value)} placeholder={t('mi.name')} aria-label={t('mi.name')} />
      <textarea rows={8} value={text} onChange={e => setText(e.target.value)} aria-label={t('mi.list')} placeholder={'4 Lightning Bolt\n…\n\nSideboard\n3 Pyroblast'} />
      {err && <p className="note note-error">{err}</p>}
      <div className="row">
        <button className="btn btn-primary" onClick={add} disabled={!text.trim()}>{t('mi.add')}</button>
        <label className="btn">{t('mi.json')}<input type="file" accept=".json" hidden onChange={onJson} /></label>
        <button className="btn btn-quiet" onClick={() => setOpen(false)}>{t('cancel')}</button>
      </div>
    </section>
  )
}
