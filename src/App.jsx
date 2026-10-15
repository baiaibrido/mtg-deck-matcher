import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocal } from './state/useLocal.js'
import { useRoute, go } from './state/useRoute.js'
import { loadFormats, loadMetaDecks } from './lib/metaDecks.js'
import { rankDecks } from './lib/matcher.js'
import { isBasic, withoutBasics } from './lib/normalize.js'
import { fetchCards, getCached } from './lib/scryfall.js'
import { deckColors, missingCost, WUBRG, colorName } from './lib/deckInfo.js'
import { t, LANGS, getLang, setLang, dayMonth, locale } from './i18n/index.js'
import { money, localBudget, setRates, CURRENCIES, currency, setCurrency, currencySymbol } from './lib/currency.js'
import { newBans, formatList } from './lib/bans.js'
import DeckList from './components/DeckList.jsx'
import DeckDetail from './components/DeckDetail.jsx'
import CollectionManager from './components/CollectionManager.jsx'
import MetaImporter from './components/MetaImporter.jsx'
import KeyCards from './components/KeyCards.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { IconDecks, IconBox, IconKey, IconSun, IconMoon, IconStar } from './components/Icons.jsx'

const FIRST_BATCH = 6 // mazzi di cui caricare subito i dati Scryfall (quelli in cima alla pagina)
const STALE_DAYS = 3
const daysAgo = d => d ? Math.floor((Date.now() - new Date(d + 'T12:00:00')) / 864e5) : 0
const SORTS = ['score', 'share', 'meta', 'cost']
const BUDGETS = [0, 10, 25, 50, 100, 200] // tetto di spesa in euro, mostrato e confrontato nella valuta locale (0 = nessuno)

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
  const view = { sort: 'score', tier: 0, colors: [], budget: 0, ...viewRaw }
  const [seenBans, setSeenBans] = useLocal('mdm.bansSeen', null)
  const [formats, setFormats] = useState([])
  const [meta, setMeta] = useState(null)
  const [cardsState, setCardsState] = useState('idle') // idle | loading | ready | error
  const [, setTick] = useState(0)
  const [toastMsg, toast] = useToast()
  const [lang, setLangState] = useState(getLang())
  const changeLang = l => { setLang(l); setLangState(l) }
  const [cur, setCur] = useState(currency())
  const changeCur = c => { setCurrency(c, true); setCur(c) }
  // schermi stretti: nei selettori solo i codici (IT, EUR…) per far stare tutto nell'header
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 519px)').matches)
  useEffect(() => { const m = matchMedia('(max-width: 519px)'); const on = () => setNarrow(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on) }, [])
  const [pins, setPins] = useLocal('mdm.pins', []) // mazzi preferiti: restano in cima qualunque filtro ci sia
  const togglePin = id => setPins(pins.includes(id) ? pins.filter(x => x !== id) : [...pins, id])
  const [theme, setTheme] = useLocal('mdm.theme', 'dark') // tema scuro di default
  // Header sempre visibile: si compatta scorrendo (soglie diverse in su e in giù per non sfarfallare)
  const headRef = useRef(null)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const on = () => setCompact(c => c ? scrollY > 8 : scrollY > 40)
    on(); addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  useEffect(() => { // altezza dell'header per gli altri elementi fissi e per lo scorrimento alle sezioni
    const el = headRef.current; if (!el) return
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--head-h', `${el.offsetHeight}px`))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  const toRogue = () => {
    const el = document.getElementById('rogue-title')
    el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    el?.focus({ preventScroll: true })
  }
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3eee2' : '#0f1a1c')
  }, [theme])

  useEffect(() => { loadFormats().then(setFormats) }, [])
  useEffect(() => { // cambi aggiornati ogni notte (altrimenti restano quelli di riserva in currency.js)
    fetch(`${import.meta.env.BASE_URL}meta/rates.json`).then(r => r.ok ? r.json() : null).then(j => { if (j?.rates) { setRates(j.rates); setTick(n => n + 1) } }).catch(() => {})
  }, [])
  useEffect(() => { setMeta(null); loadMetaDecks(format).then(setMeta) }, [format])

  const metaMain = useMemo(() => (meta || []).filter(d => !d.rogue), [meta])
  const decks = useMemo(() => [...metaMain, ...userDecks.filter(d => d.format === format)], [metaMain, userDecks, format])
  const ranked = useMemo(() => rankDecks(decks, collection, Infinity), [decks, collection])
  // Rogue della settimana: stessi calcoli, ordinati per vicinanza alla collezione
  const rogue = useMemo(() => rankDecks((meta || []).filter(d => d.rogue), collection, Infinity).map((s, i) => ({ ...s, rank: i + 1 })), [meta, collection])
  const top = ranked.slice(0, FIRST_BATCH)
  const sel = route.page === 'deck' ? ranked.find(s => s.deck.id === route.id) || rogue.find(s => s.deck.id === route.id) : null

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
        await fetchCards(namesOf([...ranked, ...rogue])); if (!alive) return
        await fetchCards(collection.map(c => c.name)); if (!alive) return // per gli avvisi sui ban
        setCardsState('ready'); setTick(t => t + 1)
      } catch { if (alive) setCardsState('error') }
    })()
    return () => { alive = false }
  }, [firstKey, decks])

  const colorsOf = deck => deckColors(deck, getCached) ?? (cardsState === 'error' ? undefined : null)
  const costOf = s => missingCost(s.missing, getCached)
  const withinBudget = s => !s.missing.length || costOf(s).amount <= localBudget(view.budget)

  // Tutti i mazzi del formato: filtri per tier e colori, ordinamento
  // Preferiti: nell'ordine in cui sono stati fissati, sempre visibili e fuori dai filtri
  const pinned = pins.map(id => ranked.find(s => s.deck.id === id) || rogue.find(s => s.deck.id === id)).filter(Boolean)
    .map(s => s.rank ? s : { ...s, rank: ranked.indexOf(s) + 1 })
  const all = useMemo(() => {
    let list = ranked.map((s, i) => ({ ...s, rank: i + 1 })).filter(s => !pins.includes(s.deck.id))
    if (view.tier) list = list.filter(s => s.deck.tier === view.tier)
    if (view.colors.length) list = list.filter(s => { const c = deckColors(s.deck, getCached); return c && c.every(x => view.colors.includes(x)) })
    if (view.budget) list = list.filter(withinBudget)
    if (view.sort === 'share') list.sort((a, b) => (b.deck.share || 0) - (a.deck.share || 0))
    if (view.sort === 'meta') list.sort((a, b) => (b.deck.metaWr ?? -1) - (a.deck.metaWr ?? -1))
    if (view.sort === 'cost') list.sort((a, b) => costOf(a).amount - costOf(b).amount || b.score - a.score)
    return list
  }, [ranked, view, cardsState, pins])
  const rogueShown = (view.budget ? rogue.filter(withinBudget) : rogue).filter(s => !pins.includes(s.deck.id))

  // Ban: avviso una sola volta per i nuovi ban sulle carte della collezione
  const bans = newBans(collection, getCached, seenBans)
  const covered = collection.filter(c => getCached(c.name)?.bn).length >= collection.length * 0.95
  useEffect(() => { if (seenBans === null && covered && collection.length) setSeenBans(bans.next) }, [covered, seenBans, collection.length])
  const banNotice = bans.fresh.length > 0 && (
    <div className="callout callout-ban" role="status">
      <div><b>⚠ {t('ban.newTitle')}</b>
        <ul>{bans.fresh.map(b => <li key={b.name}>{t('ban.newItem', b.name, formatList(b.formats))}</li>)}</ul>
      </div>
      <button className="btn" onClick={() => setSeenBans(bans.next)}>{t('ban.dismiss')}</button>
    </div>
  )
  const setV = patch => setView({ ...view, ...patch })
  const toggleColor = c => setV({ colors: view.colors.includes(c) ? view.colors.filter(x => x !== c) : [...view.colors, c] })

  const formatName = formats.find(f => f.id === format)?.name || ''
  const updated = meta?.[0]?.updated
  const sourceText = meta?.[0]?.source === 'MTGODecklistCache' ? t('decks.srcCache') : t('decks.srcTop8')
  const stale = updated && daysAgo(updated) > STALE_DAYS
  const page = route.page === 'collection' ? 'collection' : route.page === 'key-cards' ? 'key-cards' : sel ? 'deck' : 'decks'
  const count = collection.reduce((s, c) => s + c.qty, 0)
  const navCurrent = p => (p === 'decks' ? page === 'decks' || page === 'deck' : page === p) ? 'page' : undefined

    const formatTabs = (
    <div className="formats" role="tablist" aria-label={t('format')}>
      {formats.map(f => <button key={f.id} role="tab" aria-selected={f.id === format} onClick={() => setFormat(f.id)}>{f.name}</button>)}
    </div>
  )

  return (
    <div className="app">
      <a className="skip" href="#contenuto" onClick={e => { e.preventDefault(); document.getElementById('contenuto')?.focus() }}>{t('skip')}</a>
      <header className={`topbar${compact ? ' compact' : ''}`} ref={headRef}>
        <a className="brand" href="#/decks" aria-label={t('home')}>
          <span className="brand-mark" aria-hidden="true">{['w', 'u', 'b', 'r', 'g'].map(c => <i key={c} className={`ms ms-${c} ms-cost`} />)}</span>
          Netdeckable
        </a>
        <nav className="nav-top" aria-label={t('sections')}>
          <a href="#/decks" aria-current={navCurrent('decks')}>{t('nav.decks')}</a>
          <a href="#/key-cards" aria-current={navCurrent('key-cards')}>{t('nav.keycards')}</a>
          <a href="#/collection" aria-current={navCurrent('collection')}>{t('nav.collection')} <span className="count">{count.toLocaleString(lang)}</span></a>
        </nav>
        <div className="prefs">
          <label className="select lang-select">
            <span className="sr-only">{t('language')}</span>
            <select value={lang} onChange={e => changeLang(e.target.value)} aria-label={t('language')}>
              {LANGS.map(([k, name]) => <option key={k} value={k} lang={k}>{narrow ? k.toUpperCase() : name}</option>)}
            </select>
          </label>
          <label className="select lang-select cur-select">
            <span className="sr-only">{t('currency')}</span>
            <select value={cur} onChange={e => changeCur(e.target.value)} aria-label={t('currency')}>
              {CURRENCIES.map(c => { const s = currencySymbol(c, locale()); return <option key={c} value={c}>{narrow || !s || s === c ? c : `${c} ${s}`}</option> })}
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
          {page === 'decks' && <>
            {formatTabs}
            <header className="page-head">
              <h1>{t('decks.title', formatName)}</h1>
              {meta && decks.length > 0 && <p>{t('decks.intro', metaMain.filter(d => d.source !== 'utente').length, sourceText, dayMonth(updated))}</p>}
            </header>

            {banNotice}
            {rogueShown.length > 0 && (
              <button className="rogue-jump" onClick={toRogue}>
                <span aria-hidden="true">🌶</span>{t('rogue.jump', rogueShown.length)}<span aria-hidden="true" className="rogue-jump-arrow">↓</span>
              </button>
            )}

            {stale && <p className="note note-error">{t('decks.stale', daysAgo(updated))}</p>}
            {!collection.length && (
              <div className="callout">
                <p><b>{t('decks.noCollB')}</b> {t('decks.noColl')}</p>
                <a className="btn btn-primary" href="#/collection">{t('loadCollection')}</a>
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
                <label className="select">
                  <span>{t('budget')}</span>
                  <select value={view.budget} onChange={e => setV({ budget: +e.target.value })}>
                    {BUDGETS.map(b => <option key={b} value={b}>{b ? t('budget.max', money(localBudget(b))) : t('budget.any')}</option>)}
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
                : <>
                  {pinned.length > 0 && (
                    <section className="pinned" aria-labelledby="pinned-title">
                      <h2 id="pinned-title" className="pinned-title"><IconStar size={18} filled /> {t('pins.title')}</h2>
                      <DeckList ranked={pinned} colorsOf={colorsOf} costOf={costOf} animKey={format + 'pins'} highlightFirst={false} onOpen={id => go('deck', id)} pins={pins} onPin={togglePin} />
                    </section>
                  )}
                  {all.length ? <DeckList ranked={all} colorsOf={colorsOf} costOf={costOf} animKey={format + view.sort + view.tier + view.colors + view.budget} highlightFirst={false} onOpen={id => go('deck', id)} pins={pins} onPin={togglePin} />
                  : <p className="empty">{t('decks.noneFilter')} {view.colors.length > 0 && t('decks.tryColor')}</p>}
                </>}

            {rogueShown.length > 0 && (
              <section className="rogue" aria-labelledby="rogue-title">
                <header className="rogue-head">
                  <h2 id="rogue-title" tabIndex={-1}><span aria-hidden="true">🌶</span> {t('rogue.title')}</h2>
                  <p>{t('rogue.intro', metaMain.length)}</p>
                </header>
                <DeckList ranked={rogueShown} colorsOf={colorsOf} costOf={costOf} animKey={format + 'rogue'} highlightFirst={false} onOpen={id => go('deck', id)} pins={pins} onPin={togglePin} />
              </section>
            )}

            {cardsState === 'loading' && <p className="hint">{t('decks.loadingScry')}</p>}
            {cardsState === 'error' && <p className="note note-error">{t('decks.scryDown')}</p>}

            <MetaImporter format={format} formatName={formatName} onAdd={ds => setUserDecks([...userDecks, ...ds])} toast={toast} />
          </>}

          {page === 'deck' && (
            <DeckDetail key={sel.deck.id} s={sel} colors={colorsOf(sel.deck)} formatName={formatName} toast={toast}
              onOpen={id => go('deck', id)} idOf={name => ranked.find(x => x.deck.name === name)?.deck.id}
              pinned={pins.includes(sel.deck.id)} onPin={togglePin}
              onBack={() => history.length > 1 ? history.back() : go('decks')}
              onDelete={sel.deck.source === 'utente' ? () => { setUserDecks(userDecks.filter(d => d.id !== sel.deck.id)); go('decks') } : null} />
          )}

          {page === 'key-cards' && <>
            {formatTabs}
            <KeyCards ranked={ranked} formatName={formatName} hasCollection={collection.length > 0} toast={toast} />
          </>}

          {page === 'collection' && banNotice}
          {page === 'collection' && <CollectionManager collection={collection} setCollection={setCollection} toast={toast} />}
        </ErrorBoundary>
      </main>

      <footer className="site-footer">
        <p className="footer-credits">
          {t('footer.lists')}: <a href="https://github.com/Jiliac/MTGODecklistCache" target="_blank" rel="noreferrer">MTGODecklistCache</a>, <a href="https://www.mtgtop8.com" target="_blank" rel="noreferrer">MTGTop8</a>
          {' · '}{t('footer.archetypes')}: <a href="https://github.com/Badaro/MTGOFormatData" target="_blank" rel="noreferrer">MTGOFormatData</a>
          {' · '}{t('footer.cards')}: <a href="https://scryfall.com" target="_blank" rel="noreferrer">Scryfall</a>
          {' · '}{t('footer.rates')}: <a href="https://www.ecb.europa.eu" target="_blank" rel="noreferrer">BCE/ECB</a>
        </p>
        {/* testo richiesto dalla Fan Content Policy di Wizards of the Coast (in inglese, come da policy) */}
        <p className="footer-legal" lang="en">
          Netdeckable is unofficial Fan Content permitted under the <a href="https://company.wizards.com/en/legal/fancontentpolicy" target="_blank" rel="noreferrer">Fan Content Policy</a>. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.
        </p>
        <p>Netdeckable v{__APP_VERSION__}</p>
      </footer>

      <nav className="tabbar" aria-label={t('sections')}>
        <a href="#/decks" aria-current={navCurrent('decks')}><IconDecks />{t('nav.decks')}</a>
        <a href="#/key-cards" aria-current={navCurrent('key-cards')}><IconKey />{t('nav.keycards')}</a>
        <a href="#/collection" aria-current={navCurrent('collection')}><IconBox />{t('nav.collection')}</a>
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
