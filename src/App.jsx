import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocal } from './state/useLocal.js'
import { useRoute, go } from './state/useRoute.js'
import { loadFormats, loadMetaDecks } from './lib/metaDecks.js'
import { rankDecks } from './lib/matcher.js'
import { isBasic, withoutBasics } from './lib/normalize.js'
import { fetchCards, getCached } from './lib/scryfall.js'
import { deckColors, missingCost, WUBRG, colorName } from './lib/deckInfo.js'
import { t, LANGS, getLang, setLang, dayMonth } from './i18n/index.js'
import DeckList from './components/DeckList.jsx'
import DeckDetail from './components/DeckDetail.jsx'
import CollectionManager from './components/CollectionManager.jsx'
import MetaImporter from './components/MetaImporter.jsx'
import KeyCards from './components/KeyCards.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { IconDecks, IconBox, IconKey, IconSun, IconMoon } from './components/Icons.jsx'

const FIRST_BATCH = 6 // mazzi di cui caricare subito i dati Scryfall (quelli in cima alla pagina)
const STALE_DAYS = 3
const daysAgo = d => d ? Math.floor((Date.now() - new Date(d + 'T12:00:00')) / 864e5) : 0
const SORTS = ['score', 'share', 'cost']

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
  const [lang, setLangState] = useState(getLang())
  const changeLang = l => { setLang(l); setLangState(l) }
  const [theme, setTheme] = useLocal('mdm.theme', 'dark') // tema scuro di default
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3eee2' : '#0f1a1c')
  }, [theme])

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
  const sourceText = meta?.[0]?.source === 'MTGODecklistCache' ? t('decks.srcCache') : t('decks.srcTop8')
  const stale = updated && daysAgo(updated) > STALE_DAYS
  const page = route.page === 'collezione' ? 'collezione' : route.page === 'carte' ? 'carte' : sel ? 'mazzo' : 'mazzi'
  const count = collection.reduce((s, c) => s + c.qty, 0)
  const navCurrent = p => (p === 'mazzi' ? page === 'mazzi' || page === 'mazzo' : page === p) ? 'page' : undefined

    const formatTabs = (
    <div className="formats" role="tablist" aria-label={t('format')}>
      {formats.map(f => <button key={f.id} role="tab" aria-selected={f.id === format} onClick={() => setFormat(f.id)}>{f.name}</button>)}
    </div>
  )

  return (
    <div className="app">
      <a className="skip" href="#contenuto" onClick={e => { e.preventDefault(); document.getElementById('contenuto')?.focus() }}>{t('skip')}</a>
      <header className="topbar">
        <a className="brand" href="#/mazzi" aria-label={t('home')}>
          <span className="brand-mark" aria-hidden="true">{['w', 'u', 'b', 'r', 'g'].map(c => <i key={c} className={`ms ms-${c} ms-cost`} />)}</span>
          Deck Matcher
        </a>
        <nav className="nav-top" aria-label={t('sections')}>
          <a href="#/mazzi" aria-current={navCurrent('mazzi')}>{t('nav.decks')}</a>
          <a href="#/carte" aria-current={navCurrent('carte')}>{t('nav.keycards')}</a>
          <a href="#/collezione" aria-current={navCurrent('collezione')}>{t('nav.collection')} <span className="count">{count.toLocaleString(lang)}</span></a>
        </nav>
        <div className="prefs">
          <label className="select lang-select">
            <span className="sr-only">{t('language')}</span>
            <select value={lang} onChange={e => changeLang(e.target.value)} aria-label={t('language')}>
              {LANGS.map(([k, name]) => <option key={k} value={k} lang={k}>{name}</option>)}
            </select>
          </label>
          <button className="theme-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? t('theme.toDark') : t('theme.toLight')} title={theme === 'light' ? t('theme.toDark') : t('theme.toLight')}>
            {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
          </button>
        </div>
      </header>

      <main className="content" id="contenuto" tabIndex={-1}>
        <ErrorBoundary key={page}>
          {page === 'mazzi' && <>
            {formatTabs}
            <header className="page-head">
              <h1>{t('decks.title', formatName)}</h1>
              {meta && decks.length > 0 && <p>{t('decks.intro', meta.length, sourceText, dayMonth(updated))}</p>}
            </header>

            {stale && <p className="note note-error">{t('decks.stale', daysAgo(updated))}</p>}
            {!collection.length && (
              <div className="callout">
                <p><b>{t('decks.noCollB')}</b> {t('decks.noColl')}</p>
                <a className="btn btn-primary" href="#/collezione">{t('loadCollection')}</a>
              </div>
            )}

            {decks.length > 1 && (
              <div className="filters">
                <label className="select">
                  <span>{t('sort')}</span>
                  <select value={view.sort} onChange={e => setV({ sort: e.target.value })}>
                    {SORTS.map(k => <option key={k} value={k}>{t(`sort.${k}`)}</option>)}
                  </select>
                </label>
                <div className="chips" role="group" aria-label="Tier">
                  {[0, 1, 2, 3].map(n => <button key={n} aria-pressed={view.tier === n} onClick={() => setV({ tier: n })}>{n ? `Tier ${n}` : t('allTiers')}</button>)}
                </div>
                <div className="color-filter" role="group" aria-label={t('onlyColors')}>
                  <span>{t('colors')}</span>
                  {WUBRG.map(c => (
                    <button key={c} aria-pressed={view.colors.includes(c)} onClick={() => toggleColor(c)} title={colorName(c)} aria-label={colorName(c)}>
                      <i className={`ms ms-${c.toLowerCase()} ms-cost`} />
                    </button>
                  ))}
                  {view.colors.length > 0 && <button className="linklike" onClick={() => setV({ colors: [] })}>{t('clearColors')}</button>}
                </div>
              </div>
            )}

            {meta === null ? <ol className="decks skeleton" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <li key={i} className="deck" />)}</ol>
              : !decks.length ? <p className="empty">{t('decks.none', formatName)}</p>
                : all.length ? <DeckList ranked={all} colorsOf={colorsOf} costOf={costOf} animKey={format + view.sort + view.tier + view.colors} highlightFirst={false} onOpen={id => go('mazzo', id)} />
                  : <p className="empty">{t('decks.noneFilter')} {view.colors.length > 0 && t('decks.tryColor')}</p>}

            {cardsState === 'loading' && <p className="hint">{t('decks.loadingScry')}</p>}
            {cardsState === 'error' && <p className="note note-error">{t('decks.scryDown')}</p>}

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

      <nav className="tabbar" aria-label={t('sections')}>
        <a href="#/mazzi" aria-current={navCurrent('mazzi')}><IconDecks />{t('nav.decks')}</a>
        <a href="#/carte" aria-current={navCurrent('carte')}><IconKey />{t('nav.keycards')}</a>
        <a href="#/collezione" aria-current={navCurrent('collezione')}><IconBox />{t('nav.collection')}</a>
      </nav>

      <div className="toast-zone" aria-live="polite">
        {toastMsg && (
          <div className={`toast${toastMsg.action ? ' toast-action' : ''}`} key={toastMsg.id}>
            {toastMsg.text}
            {toastMsg.action && <button onClick={() => { toastMsg.action.fn(); toast(t('done')) }}>{toastMsg.action.label}</button>}
          </div>
        )}
      </div>
    </div>
  )
}
