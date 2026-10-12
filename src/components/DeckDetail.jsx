import { useEffect, useState } from 'react'
import { Bar } from './DeckCard.jsx'
import { fetchCards, getCached } from '../lib/scryfall.js'
import { toText, tcgplayerUrl, downloadTxt } from '../lib/export.js'

function Grid({ title, rows }) {
  if (!rows.length) return null
  return (
    <>
      <h3>{title}</h3>
      <div className="grid">
        {rows.map(r => {
          const c = getCached(r.name)
          const st = r.missing === 0 ? 'ok' : r.have === 0 ? 'no' : 'part'
          return (
            <a key={r.name} className={`card ${st}`} href={c?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${r.name}"`)}`} target="_blank" rel="noreferrer" title={r.name}>
              {c?.img ? <img src={c.img} alt={r.name} loading="lazy" /> : <div className="noimg">{r.name}</div>}
              <span className="qty">{r.have}/{r.qty}</span>
            </a>
          )
        })}
      </div>
    </>
  )
}

export default function DeckDetail({ s, onBack, onDelete }) {
  const [, setTick] = useState(0)
  const [copied, setCopied] = useState(false)
  const list = toText(s.missing)

  useEffect(() => {
    const names = [...s.main.rows, ...s.side.rows].map(r => r.name)
    fetchCards(names).then(() => setTick(t => t + 1)).catch(() => {})
  }, [s.deck.id])

  const copy = async () => { await navigator.clipboard.writeText(list); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  return (
    <section className="panel">
      <button className="link" onClick={onBack}>← Torna ai mazzi</button>
      <h2>{s.deck.name}</h2>
      {s.deck.url && <p><a href={s.deck.url} target="_blank" rel="noreferrer">Lista originale{s.deck.title ? `: ${s.deck.title}` : ''} ↗</a></p>}
      <Bar ratio={s.main.ratio} label={`Main ${s.main.have}/${s.main.total}`} />
      {s.side.total > 0 && <Bar ratio={s.side.ratio} label={`Side ${s.side.have}/${s.side.total}`} />}
      <p className="legend"><i className="ok" /> posseduta <i className="part" /> parziale <i className="no" /> mancante</p>

      <div className="mancolista">
        <h3>Mancolista <small>{s.missing.reduce((t, r) => t + r.missing, 0)} carte</small></h3>
        {s.missing.length ? <>
          <pre>{list}</pre>
          <div className="row">
            <button onClick={copy}>{copied ? 'Copiata ✓' : 'Copia (formato Scryfall)'}</button>
            <a className="btn" href={tcgplayerUrl(s.missing)} target="_blank" rel="noreferrer">Apri su TCGplayer</a>
            <button onClick={() => downloadTxt(`mancolista-${s.deck.id}.txt`, list)}>Scarica .txt</button>
          </div>
        </> : <p>Hai già tutto ✓</p>}
      </div>

      <Grid title="Main" rows={s.main.rows} />
      <Grid title="Sideboard" rows={s.side.rows} />
      {onDelete && <button className="danger" onClick={() => confirm('Eliminare questo mazzo importato?') && onDelete()}>Elimina mazzo importato</button>}
    </section>
  )
}
