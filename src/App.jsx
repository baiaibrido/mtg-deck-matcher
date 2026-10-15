import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocal } from './state/useLocal.js'
import { useRoute, go } from './state/useRoute.js'
import { loadFormats, loadMetaDecks } from './lib/metaDecks.js'
import { rankDecks } from './lib/matcher.js'
import { isBasic, withoutBasics } from './lib/normalize.js'
import { fetchCards, getCached } from './lib/scryfall.js'
import { deckColors, missingCost, WUBRG, COLOR_NAME } from './lib/deckInfo.js'
import DeckList from './components/DeckList.jsx'
import DeckDetail from './components/DeckDetail.jsx'
import CollectionManager from './components/CollectionManager.jsx'
import MetaImporter from './components/MetaImporter.jsx'
import KeyCards from './components/KeyCards.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { IconDecks, IconBox, IconKey } from './components/Icons.jsx'

const FIRST_BATCH = 6 // mazzi di cui caricare subito i dati Scryfall (quelli in cima alla pagina)
const STALE_DAYS = 3
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : null
const daysAgo = d => d ? Math.floor((Date.now() - new Date(d + 'T12:00:00')) / 864e5) : 0
const SORTS = { score: 'Più completi', share: 'Più giocati', cost: 'Meno costosi da finire' }

function useToast() {
  const [t, setT] = useState(null)
  const timer = useRef()
  // action facoltativa: { label, fn } (es. "Annulla" dopo un'azione distruttiva)
  const toast = useCallback((text, action) => {
    clearTimeout(timer.current)
    setT({ text, action, id: Date.now() })
    timer.current = setTimeout(() => setT(null), action ? 6000 : 2600)
  }, [])
  return [t, toast]
}

export default function App() {
  const route = useRoute()
  const [format, setFormat] = useLocal('mdm.format', 'pauper')
  const [collection, setCollectionRaw] = useLocal('mdm.collection', [])
  const setCollection = list => setCollectionRaw(withoutBasics(list)) // le terre base non stanno in collezione
  useEffect(() => { if (collection.some(c => isBasic(c.name))) setCollection(collection) }, []) // pulizia collezioni salvate prima
  const [userDecks, setUserDecks] = useLocal('mdm.userDecks', [])
  const [viewRaw, setView] = useLocal('mdm.view', {})
  const view = { sort: 'score', tier: 0, colors: [], ...viewRaw }
  const [formats, setFormats] = useState([])
  const [meta, setMeta] = useState(null)
  const [cardsState, setCardsState] = useState('idle') // idle | loading | ready | error
  const [, setTick] = useState(0)
  const [toastMsg, toast] = useToast()

  useEffect(() => { loadFormats().then(setFormats) }, [])
  useEffect(() => { setMeta(null); loadMetaDecks(format).then(setMeta) }, [format])

  const decks = useMemo(() => [...(meta || []), ...userDecks.filter(d => d.format === format)], [meta, userDecks, format])
  const ranked = useMemo(() => rankDecks(decks, collection, Infinity), [decks, collection])
  const top = ranked.slice(0, FIRST_BATCH)
  const sel = route.page === 'mazzo' ? ranked.find(s => s.deck.id === route.id) : null

  // Dati Scryfall: prima i mazzi in vista (colori subito), poi tutti gli altri del formato (prezzi, filtri, carte chiave)
  const namesOf = list => [...new Set(list.flatMap(s => [...s.deck.main, ...s.deck.side].map(c => c.name)))]
  const firstKey = (sel ? [sel] : top).map(s => s.deck.id).join()
  useEffect(() => {
    if (!ranked.length) return
    let alive = true
    setCardsState('loading')
    ;(async () => {
      try {
        await fetchCards(namesOf(sel ? [sel] : top)); if (!alive) return
        setTick(t => t + 1)
        await fetchCards(namesOf(ranked)); if (!alive) return
        setCardsState('ready'); setTick(t => t + 1)
      } catch { if (alive) setCardsState('error') }
    })()
    return () => { alive = false }
  }, [firstKey, decks])

  const colorsOf = deck => deckColors(deck, getCached) ?? (cardsState === 'error' ? undefined : null)
  const costOf = s => missingCost(s.missing, getCached)

  // Tutti i mazzi del formato: filtri per tier e colori, ordinamento
  const all = useMemo(() => {
    let list = ranked.map((s, i) => ({ ...s, rank: i + 1 }))
    if (view.tier) list = list.filter(s => s.deck.tier === view.tier)
    if (view.colors.length) list = list.filter(s => { const c = deckColors(s.deck, getCached); return c && c.every(x => view.colors.includes(x)) })
    if (view.sort === 'share') list.sort((a, b) => (b.deck.share || 0) - (a.deck.share || 0))
    if (view.sort === 'cost') list.sort((a, b) => costOf(a).eur - costOf(b).eur || b.score - a.score)
    return list
  }, [ranked, view, cardsState])
  const setV = patch => setView({ ...view, ...patch })
  const toggleColor = c => setV({ colors: view.colors.includes(c) ? view.colors.filter(x => x !== c) : [...view.colors, c] })

  const formatName = formats.find(f => f.id === format)?.name || ''
  const updated = meta?.[0]?.updated
  const sourceText = meta?.[0]?.source === 'MTGODecklistCache' ? 'nei tornei MTGO, melee.gg e CardsRealm (dati MTGODecklistCache)' : 'su MTGTop8'
  const stale = updated && daysAgo(updated) > STALE_DAYS
  const page = route.page === 'collezione' ? 'collezione' : route.page === 'carte' ? 'carte' : sel ? 'mazzo' : 'mazzi'
  const count = collection.reduce((t, c) => t + c.qty, 0)
  const navCurrent = p => (p === 'mazzi' ? page === 'mazzi' || page === 'mazzo' : page === p) ? 'page' : undefined

  const formatTabs = (
    <div className="formats" role="tablist" aria-label="Formato">
      {formats.map(f => <button key={f.id} role="tab" aria-selected={f.id === format} onClick={() => setFormat(f.id)}>{f.name}</button>)}
    </div>
  )

  return (
    <div className="app">
      <a className="skip" href="#contenuto" onClick={e => { e.preventDefault(); document.getElementById('contenuto')?.focus() }}>Vai al contenuto</a>
      <header className="topbar">
        <a className="brand" href="#/mazzi" aria-label="Deck Matcher, home">
          <span className="brand-mark" aria-hidden="true">{['w', 'u', 'b', 'r', 'g'].map(c => <i key={c} className={`ms ms-${c} ms-cost`} />)}</span>
          Deck Matcher
        </a>
        <nav className="nav-top" aria-label="Sezioni">
          <a href="#/mazzi" aria-current={navCurrent('mazzi')}>Mazzi</a>
          <a href="#/carte" aria-current={navCurrent('carte')}>Carte chiave</a>
          <a href="#/collezione" aria-current={navCurrent('collezione')}>Collezione <span className="count">{count.toLocaleString('it-IT')}</span></a>
        </nav>
      </header>

      <main className="content" id="contenuto" tabIndex={-1}>
        <ErrorBoundary key={page}>
          {page === 'mazzi' && <>
            {formatTabs}
            <header className="page-head">
              <h1>I mazzi {formatName} più vicini alla tua collezione</h1>
              {meta && decks.length > 0 && <p>Confronto con i {meta.length} archetipi più giocati negli ultimi due mesi {sourceText}{updated ? `, aggiornati il ${fmtDate(updated)}` : ''}. Tier calcolati con il metodo di MTGdecks.</p>}
            </header>

            {stale && <p className="note note-error">I dati del meta hanno {daysAgo(updated)} giorni: l'aggiornamento automatico potrebbe essersi fermato. Controlla il tab Actions su GitHub.</p>}
            {!collection.length && (
              <div className="callout">
                <p><b>Non hai ancora caricato la collezione.</b> Per ora i mazzi sono in ordine di popolarità.</p>
                <a className="btn btn-primary" href="#/collezione">Carica la collezione</a>
              </div>
            )}

            {decks.length > 1 && (
              <div className="filters">
                <label className="select">
                  <span>Ordina</span>
                  <select value={view.sort} onChange={e => setV({ sort: e.target.value })}>
                    {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <div className="chips" role="group" aria-label="Tier">
                  {[0, 1, 2, 3].map(t => <button key={t} aria-pressed={view.tier === t} onClick={() => setV({ tier: t })}>{t ? `Tier ${t}` : 'Tutti i tier'}</button>)}
                </div>
                <div className="color-filter" role="group" aria-label="Solo questi colori">
                  <span>Colori</span>
                  {WUBRG.map(c => (
                    <button key={c} aria-pressed={view.colors.includes(c)} onClick={() => toggleColor(c)} title={COLOR_NAME[c]} aria-label={COLOR_NAME[c]}>
                      <i className={`ms ms-${c.toLowerCase()} ms-cost`} />
                    </button>
                  ))}
                  {view.colors.length > 0 && <button className="linklike" onClick={() => setV({ colors: [] })}>Azzera</button>}
                </div>
              </div>
            )}

            {meta === null ? <ol className="decks skeleton" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <li key={i} className="deck" />)}</ol>
              : !decks.length ? <p className="empty">Nessun mazzo disponibile per {formatName}. Puoi aggiungerne uno a mano.</p>
                : all.length ? <DeckList ranked={all} colorsOf={colorsOf} costOf={costOf} animKey={format + view.sort + view.tier + view.colors} highlightFirst={false} onOpen={id => go('mazzo', id)} />
                  : <p className="empty">Nessun mazzo con questi filtri. {view.colors.length > 0 && 'Prova ad aggiungere un colore.'}</p>}

            {cardsState === 'loading' && <p className="hint">Carico colori e prezzi delle carte da Scryfall…</p>}
            {cardsState === 'error' && <p className="note note-error">Scryfall non risponde: colori, immagini e prezzi non sono disponibili. Il calcolo funziona lo stesso.</p>}

            <MetaImporter format={format} formatName={formatName} onAdd={ds => setUserDecks([...userDecks, ...ds])} toast={toast} />
          </>}

          {page === 'mazzo' && (
            <DeckDetail key={sel.deck.id} s={sel} colors={colorsOf(sel.deck)} formatName={formatName} toast={toast}
              onBack={() => history.length > 1 ? history.back() : go('mazzi')}
              onDelete={sel.deck.source === 'utente' ? () => { setUserDecks(userDecks.filter(d => d.id !== sel.deck.id)); go('mazzi') } : null} />
          )}

          {page === 'carte' && <>
            {formatTabs}
            <KeyCards ranked={ranked} formatName={formatName} hasCollection={collection.length > 0} toast={toast} />
          </>}

          {page === 'collezione' && <CollectionManager collection={collection} setCollection={setCollection} toast={toast} />}
        </ErrorBoundary>
      </main>

      <footer className="site-footer">Deck Matcher v{__APP_VERSION__}</footer>

      <nav className="tabbar" aria-label="Sezioni">
        <a href="#/mazzi" aria-current={navCurrent('mazzi')}><IconDecks />Mazzi</a>
        <a href="#/carte" aria-current={navCurrent('carte')}><IconKey />Carte chiave</a>
        <a href="#/collezione" aria-current={navCurrent('collezione')}><IconBox />Collezione</a>
      </nav>

      <div className="toast-zone" aria-live="polite">
        {toastMsg && (
          <div className={`toast${toastMsg.action ? ' toast-action' : ''}`} key={toastMsg.id}>
            {toastMsg.text}
            {toastMsg.action && <button onClick={() => { toastMsg.action.fn(); toast('Fatto') }}>{toastMsg.action.label}</button>}
          </div>
        )}
      </div>
    </div>
  )
}
