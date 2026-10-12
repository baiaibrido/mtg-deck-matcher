import { useEffect, useMemo, useState } from 'react'
import { useLocal } from './state/useLocal.js'
import { loadFormats, loadMetaDecks } from './lib/metaDecks.js'
import { rankDecks } from './lib/matcher.js'
import FormatSelector from './components/FormatSelector.jsx'
import CollectionManager from './components/CollectionManager.jsx'
import DeckCard from './components/DeckCard.jsx'
import DeckDetail from './components/DeckDetail.jsx'
import MetaImporter from './components/MetaImporter.jsx'

const TOP_N = 5

export default function App() {
  const [format, setFormat] = useLocal('mdm.format', 'pauper')
  const [collection, setCollection] = useLocal('mdm.collection', [])
  const [userDecks, setUserDecks] = useLocal('mdm.userDecks', [])
  const [formats, setFormats] = useState([])
  const [meta, setMeta] = useState([])
  const [tab, setTab] = useState('decks')
  const [selId, setSelId] = useState(null)

  useEffect(() => { loadFormats().then(setFormats) }, [])
  useEffect(() => { setMeta([]); setSelId(null); loadMetaDecks(format).then(setMeta) }, [format])

  const decks = useMemo(() => [...meta, ...userDecks.filter(d => d.format === format)], [meta, userDecks, format])
  const ranked = useMemo(() => rankDecks(decks, collection, Infinity), [decks, collection])
  const sel = ranked.find(s => s.deck.id === selId)

  return (
    <div className="app">
      <header>
        <h1>MTG Deck Matcher</h1>
        <FormatSelector formats={formats} value={format} onChange={setFormat} />
        <nav>
          <button className={tab === 'decks' ? 'on' : ''} onClick={() => setTab('decks')}>Mazzi</button>
          <button className={tab === 'coll' ? 'on' : ''} onClick={() => setTab('coll')}>Collezione ({collection.length})</button>
        </nav>
      </header>

      {tab === 'coll' && <CollectionManager collection={collection} setCollection={setCollection} />}

      {tab === 'decks' && (sel
        ? <DeckDetail s={sel} onBack={() => setSelId(null)}
            onDelete={sel.deck.source === 'utente' ? () => { setUserDecks(userDecks.filter(d => d.id !== sel.deck.id)); setSelId(null) } : null} />
        : <main>
            {!collection.length && <p className="msg">Carica prima la collezione nel tab <b>Collezione</b>.</p>}
            {!decks.length && <p className="msg">Nessun mazzo meta per questo formato: aggiungine uno qui sotto o riempi <code>public/meta/{format}.json</code>.</p>}
            <h2>Top {Math.min(TOP_N, ranked.length)} mazzi <small>su {decks.length}</small></h2>
            <div className="cards">
              {ranked.slice(0, TOP_N).map((s, i) => <DeckCard key={s.deck.id} s={s} rank={i + 1} onOpen={() => setSelId(s.deck.id)} />)}
            </div>
            <MetaImporter format={format} onAdd={ds => setUserDecks([...userDecks, ...ds])} />
          </main>)}
    </div>
  )
}
