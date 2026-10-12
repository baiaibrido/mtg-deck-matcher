import { useMemo, useState } from 'react'
import { keyCards } from '../lib/keyCards.js'
import { getCached } from '../lib/scryfall.js'
import { euro } from '../lib/deckInfo.js'
import { toText, downloadTxt } from '../lib/export.js'
import { ManaCost } from './Mana.jsx'
import { IconCopy, IconDownload } from './Icons.jsx'
import { go } from '../state/useRoute.js'

// Carte che ti mancano e che servono a più mazzi del formato: i primi acquisti che rendono di più.
export default function KeyCards({ ranked, formatName, hasCollection, toast }) {
  const [scope, setScope] = useState('t12')
  const pool = useMemo(() => scope === 'all' ? ranked : ranked.filter(s => !s.deck.tier || s.deck.tier <= 2 && (scope === 't12' || s.deck.tier === 1)), [ranked, scope])
  const list = useMemo(() => keyCards(pool), [pool])
  const rows = list.map(e => ({ ...e, card: getCached(e.name) }))
  const total = rows.reduce((t, e) => t + (e.card?.eur ?? 0) * e.maxMissing, 0)
  const text = toText(rows.map(e => ({ name: e.name, missing: e.maxMissing })))

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast('Lista copiata') } catch { toast('Copia non riuscita: usa "Scarica"') }
  }

  return (
    <div className="keycards">
      <header className="page-head">
        <h1>Carte chiave {formatName}</h1>
        <p>Le carte che ti mancano e che compaiono in più mazzi del meta. Comprando queste ti avvicini a più mazzi con meno spesa. Le terre base sono escluse.</p>
      </header>

      {!hasCollection && <div className="callout"><p><b>Carica la collezione</b> per vedere solo le carte che ti mancano davvero.</p><a className="btn btn-primary" href="#/collezione">Carica la collezione</a></div>}

      <div className="seg" role="tablist" aria-label="Mazzi considerati">
        <button role="tab" aria-selected={scope === 't1'} onClick={() => setScope('t1')}>Tier 1</button>
        <button role="tab" aria-selected={scope === 't12'} onClick={() => setScope('t12')}>Tier 1 e 2</button>
        <button role="tab" aria-selected={scope === 'all'} onClick={() => setScope('all')}>Tutti</button>
      </div>

      {rows.length ? <>
        <ol className="key-list">
          {rows.map((e, i) => (
            <li key={e.name} style={{ '--i': Math.min(i, 10) }}>
              <span className="key-rank">{i + 1}</span>
              <span className="key-main">
                <span className="key-name">
                  <a href={e.card?.uri || `https://scryfall.com/search?q=${encodeURIComponent(`!"${e.name}"`)}`} target="_blank" rel="noreferrer">{e.name}</a>
                  <ManaCost cost={e.card?.cost} />
                </span>
                <span className="key-decks">
                  In {e.decks.length} mazzi:{' '}
                  {e.decks.slice(0, 4).map((d, j) => (
                    <span key={d.id}>{j > 0 && ', '}<button className="linklike" onClick={() => go('mazzo', d.id)}>{d.name}</button></span>
                  ))}
                  {e.decks.length > 4 && ` e altri ${e.decks.length - 4}`}
                </span>
              </span>
              <span className="key-buy">
                <b>{e.maxMissing}×</b>
                <span>{e.card?.eur != null ? euro(e.card.eur * e.maxMissing, true) : '—'}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="actions">
          <button className="btn btn-primary" onClick={copy}><IconCopy size={18} />Copia lista</button>
          <button className="btn" onClick={() => downloadTxt(`carte-chiave-${formatName.toLowerCase()}.txt`, text)}><IconDownload size={18} />Scarica</button>
          {total > 0 && <span className="key-total">Totale ≈ {euro(total)}</span>}
        </div>
      </> : <p className="empty">{hasCollection ? 'Nessuna carta mancante è condivisa da almeno due mazzi: ottimo lavoro.' : 'Nessun dato disponibile.'}</p>}

      <p className="hint">Copie da comprare = il massimo richiesto da uno dei mazzi. Tier calcolati con il metodo di MTGdecks sui dati MTGTop8.</p>
    </div>
  )
}
