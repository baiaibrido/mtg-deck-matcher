import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocal } from './state/useLocal.js'
import { useRoute, go } from './state/useRoute.js'
import { loadFormats, loadMetaDecks } from './lib/metaDecks.js'
import { rankDecks } from './lib/matcher.js'
import { fetchCards, getCached } from './lib/scryfall.js'
import { deckColors } from './lib/deckInfo.js'
import DeckList from './components/DeckList.jsx'
import DeckDetail from './components/DeckDetail.jsx'
import CollectionManager from './components/CollectionManager.jsx'
import MetaImporter from './components/MetaImporter.jsx'
import { IconDecks, IconBox } from './components/Icons.jsx'

const TOP_N = 5
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : null

function useToast() {
  const [t, setT] = useState(null)
  const timer = useRef()
  const toast = useCallback(text => {
    clearTimeout(timer.current)
    setT({ text, id: Date.now() })
    timer.current = setTimeout(() => setT(null), 2600)
  }, [])
  return [t, toast]
}

export default function App() {
  const route = useRoute()
  const [format, setFormat] = useLocal('mdm.format', 'pauper')
  const [collection, setCollection] = useLocal('mdm.collection', [])
  const [userDecks, setUserDecks] = useLocal('mdm.userDecks', [])
  const [formats, setFormats] = useState([])
  const [meta, setMeta] = useState(null)
  const [cardsState, setCardsState] = useState('idle') // idle | loading | ready | error
  const [, setTick] = useState(0)
  const [toastMsg, toast] = useToast()

  useEffect(() => { loadFormats().then(setFormats) }, [])
  useEffect(() => { setMeta(null); loadMetaDecks(format).then(setMeta) }, [format])

  const decks = useMemo(() => [...(meta || []), ...userDecks.filter(d => d.format === format)], [meta, userDecks, format])
  const ranked = useMemo(() => rankDecks(decks, collection, Infinity), [decks, collection])
  const top = ranked.slice(0, TOP_N)
  const sel = route.page === 'mazzo' ? ranked.find(s => s.deck.id === route.id) : null

  // Dati Scryfall (colori, tipi, costi, immagini) solo per i mazzi mostrati
  const need = useMemo(() => {
    const list = sel ? [sel] : top
    return [...new Set(list.flatMap(s => [...s.deck.main, ...s.deck.side].map(c => c.name)))]
  }, [top.map(s => s.deck.id).join(), sel?.deck.id])
  useEffect(() => {
    if (!need.length) return
    let alive = true
    setCardsState('loading')
    fetchCards(need)
      .then(() => alive && (setCardsState('ready'), setTick(t => t + 1)))
      .catch(() => alive && setCardsState('error'))
    return () => { alive = false }
  }, [need.join('|')])

  const colorsOf = deck => {
    const c = deckColors(deck, getCached)
    return c ?? (cardsState === 'error' ? undefined : null)
  }
  const formatName = formats.find(f => f.id === format)?.name || ''
  const updated = fmtDate(meta?.[0]?.updated)
  const page = route.page === 'collezione' ? 'collezione' : sel ? 'mazzo' : 'mazzi'
  const count = collection.reduce((t, c) => t + c.qty, 0)

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/mazzi" aria-label="Deck Matcher, home">
          <span className="brand-mark" aria-hidden="true">{['w', 'u', 'b', 'r', 'g'].map(c => <i key={c} className={`ms ms-${c} ms-cost`} />)}</span>
          Deck Matcher
        </a>
        <nav className="nav-top" aria-label="Sezioni">
          <a href="#/mazzi" aria-current={page !== 'collezione' ? 'page' : undefined}>Mazzi</a>
          <a href="#/collezione" aria-current={page === 'collezione' ? 'page' : undefined}>Collezione <span className="count">{count.toLocaleString('it-IT')}</span></a>
        </nav>
      </header>

      <main className="content">
        {page === 'mazzi' && <>
          <div className="formats" role="tablist" aria-label="Formato">
            {formats.map(f => (
              <button key={f.id} role="tab" aria-selected={f.id === format} onClick={() => setFormat(f.id)}>{f.name}</button>
            ))}
          </div>

          <header className="page-head">
            <h1>I mazzi {formatName} più vicini alla tua collezione</h1>
            {meta && <p>{decks.length ? `Confronto con i ${meta.length} archetipi più giocati negli ultimi due mesi su MTGTop8${updated ? `, aggiornati il ${updated}` : ''}.` : ''}</p>}
          </header>

          {!collection.length && (
            <div className="callout">
              <p><b>Non hai ancora caricato la collezione.</b> Per ora i mazzi sono in ordine di popolarità.</p>
              <a className="btn btn-primary" href="#/collezione">Carica la collezione</a>
            </div>
          )}

          {meta === null ? <ol className="decks skeleton" aria-busy="true">{Array.from({ length: 5 }, (_, i) => <li key={i} className="deck" />)}</ol>
            : decks.length ? <DeckList ranked={top} colorsOf={colorsOf} format={format} onOpen={id => go('mazzo', id)} />
              : <p className="empty">Nessun mazzo disponibile per {formatName}. Puoi aggiungerne uno a mano.</p>}

          {cardsState === 'error' && <p className="note note-error">Scryfall non risponde: colori e immagini delle carte non sono disponibili. Il calcolo funziona lo stesso.</p>}

          <MetaImporter format={format} formatName={formatName} onAdd={ds => setUserDecks([...userDecks, ...ds])} toast={toast} />
        </>}

        {page === 'mazzo' && (
          <DeckDetail key={sel.deck.id} s={sel} colors={colorsOf(sel.deck)} toast={toast}
            onBack={() => history.length > 1 ? history.back() : go('mazzi')}
            onDelete={sel.deck.source === 'utente' ? () => { setUserDecks(userDecks.filter(d => d.id !== sel.deck.id)); go('mazzi') } : null} />
        )}

        {page === 'collezione' && <CollectionManager collection={collection} setCollection={setCollection} toast={toast} />}
      </main>

      <nav className="tabbar" aria-label="Sezioni">
        <a href="#/mazzi" aria-current={page !== 'collezione' ? 'page' : undefined}><IconDecks />Mazzi</a>
        <a href="#/collezione" aria-current={page === 'collezione' ? 'page' : undefined}><IconBox />Collezione</a>
      </nav>

      <div className="toast-zone" aria-live="polite">
        {toastMsg && <div className="toast" key={toastMsg.id}>{toastMsg.text}</div>}
      </div>
    </div>
  )
}
