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
import { IconDecks, IconBox, IconKey, IconSun, IconMoon, IconStar, IconFilter, IconGlobe, IconCoins, IconChart } from './components/Icons.jsx'
import Picker from './components/Picker.jsx'
import MysteryDeck from './components/MysteryDeck.jsx'
import { pickDaily, signatureOf } from './lib/daily.js'
import { Info } from './components/Badges.jsx'
import { mergeCollection } from './lib/normalize.js'
import { bumpStreak, liveStreak, weather, almostThere, unlockedNow, ACHIEVEMENTS, guessDeck, GUESS_TRIES } from './lib/fun.js'
import MetaWeather from './components/MetaWeather.jsx'
import StatsPage from './components/StatsPage.jsx'
import { toOwnedMap } from './lib/matcher.js'
import Modal from './components/Modal.jsx'
import LuckyButton from './components/LuckyButton.jsx'
import Quiz from './components/play/Quiz.jsx'
import GuessGame from './components/play/GuessGame.jsx'
import { dayKey } from './lib/daily.js'

const FIRST_BATCH = 6 // mazzi di cui caricare subito i dati Scryfall (quelli in cima alla pagina)
const STALE_DAYS = 3
const daysAgo = d => d ? Math.floor((Date.now() - new Date(d + 'T12:00:00')) / 864e5) : 0
const SORTS = ['score', 'share', 'meta', 'cost']
const BUDGETS = [0, 10, 25, 50, 100, 200] // tetto di spesa in euro, mostrato e confrontato nella valuta locale (0 = nessuno)

function useToast() {
  const [t, setT] = useState(null)
  const timer = useRef()
  // action facoltativa: { label, fn } (es. "Annulla" dopo un'azione distruttiva)
  const cur = useRef(null) // un avviso con "Annulla" non viene coperto da uno semplice: quello aspetta il suo turno
  const toast = useCallback(function show(text, action, now = false) {
    const busy = cur.current?.action && cur.current.until > Date.now()
    if (busy && !action && !now) { setTimeout(() => show(text), cur.current.until - Date.now() + 50); return }
    clearTimeout(timer.current)
    const ms = action ? 6000 : 2600
    cur.current = { action, until: Date.now() + ms }
    setT({ text, action, id: Date.now() })
    timer.current = setTimeout(() => { cur.current = null; setT(null) }, ms)
  }, [])
  return [t, toast]
}

export default function App() {
  const route = useRoute()
  const [format, setFormat] = useLocal('mdm.format', 'pauper')
  const [collection, setCollectionRaw] = useLocal('mdm.collection', [])
  // backup: conta le modifiche dall'ultimo export, per ricordare con garbo di salvarne una copia
  const [backup, setBackup] = useLocal('mdm.backup', { changes: 0 })
  const setCollection = (list, { count = true } = {}) => {
    setCollectionRaw(withoutBasics(list)) // le terre base non stanno in collezione
    if (count) setBackup(b => ({ ...b, changes: (b.changes || 0) + 1 }))
  }
  useEffect(() => { if (collection.some(c => isBasic(c.name))) setCollection(collection, { count: false }) }, []) // pulizia collezioni salvate prima
  const [userDecks, setUserDecks] = useLocal('mdm.userDecks', [])
  const [viewRaw, setView] = useLocal('mdm.view', {})
  const view = { sort: 'score', tier: 0, colors: [], budget: 0, ...viewRaw }
  const activeFilters = (view.sort !== 'score') + (view.budget > 0) + (view.tier > 0) + (view.colors.length > 0)
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
  const [narrow, setNarrow] = useState(() => matchMedia('(max-width: 999px)').matches)
  useEffect(() => { const m = matchMedia('(max-width: 999px)'); const on = () => setNarrow(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on) }, [])
  const [filtersOpen, setFiltersOpen] = useState(false) // su telefono i filtri stanno chiusi dietro un pulsante
  const [pins, setPins] = useLocal('mdm.pins', [])
  // Giochi e traguardi: tutto solo su questo dispositivo
  const [fun, setFun] = useLocal('mdm.fun', {})
  const bumpFun = patch => setFun(f => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }))
  const [almostOff, setAlmostOff] = useLocal('mdm.almostOff', [])
  const [guessStore, setGuessStore] = useLocal('mdm.guess', {})
  const [game, setGame] = useState(null) // 'quiz' | 'guess': finestra aperta sopra la pagina mazzi // mazzi preferiti: restano in cima qualunque filtro ci sia
  const togglePin = id => setPins(pins.includes(id) ? pins.filter(x => x !== id) : [...pins, id])
  const [theme, setTheme] = useLocal('mdm.theme', 'dark') // tema scuro di default
  // Header sempre visibile: si compatta scorrendo (soglie diverse in su e in giù per non sfarfallare)
  const headRef = useRef(null)
  const [compact, setCompact] = useState(false)
  const [showTop, setShowTop] = useState(false) // pulsante "Torna su" dopo circa due schermate
  useEffect(() => {
    const on = () => { setCompact(c => c ? scrollY > 8 : scrollY > 40); setShowTop(scrollY > innerHeight * 1.5) }
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
  // Mazzo misterioso del giorno (tra i meno giocati e i rogue) e la sua carta caratteristica
  const daily = useMemo(() => meta ? pickDaily(meta, format) : null, [meta, format])
  const dailySig = daily ? signatureOf(daily, meta, n => /\bLand\b/.test(getCached(n)?.type || '')) : null
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
  const page = ['collection', 'key-cards', 'stats'].includes(route.page) ? route.page : sel ? 'deck' : 'decks'
  const ownedMap = useMemo(() => toOwnedMap(collection), [collection])

  // "Ho già questo mazzo": aggiunge le copie che mancano (main + side), con Annulla
  const ownDeck = s => {
    const add = s.missing.filter(r => r.missing > 0 && !isBasic(r.name)).map(r => ({ name: r.name, qty: r.missing }))
    if (!add.length) return
    const before = collection
    setCollection(mergeCollection([...collection, ...add]))
    toast(t('own.done', add.reduce((n, r) => n + r.qty, 0)), { label: t('undo'), fn: () => setCollection(before) })
  }
  const count = collection.reduce((s, c) => s + c.qty, 0)
  const isLand = n => /\bLand\b/.test(getCached(n)?.type || '')
  const meteo = useMemo(() => meta ? weather(meta) : null, [meta])
  const almost = collection.length ? almostThere(ranked, 5, almostOff) : null
  const openDaily = (id, fresh) => { bumpFun(f => { const st = bumpStreak(f.streak); return { streak: st, bestStreak: Math.max(f.bestStreak || 0, st.n), opens: (f.opens || 0) + (fresh ? 1 : 0) } }); go('deck', id) }
  // formati visitati e mazzi completati (per i traguardi)
  useEffect(() => { if (format && !(fun.formats || []).includes(format)) bumpFun(f => ({ formats: [...new Set([...(f.formats || []), format])] })) }, [format])
  const completeCount = collection.length ? ranked.filter(s => s.deck.source !== 'utente' && s.missing.length === 0 && s.main.total > 0).length : 0
  useEffect(() => { if (completeCount > (fun.completeMax || 0)) bumpFun({ completeMax: completeCount }) }, [completeCount])
  useEffect(() => { if (almost && !fun.almost) bumpFun({ almost: true }) }, [!!almost])
  useEffect(() => { const h = new Date().getHours(); if (h < 5 && !fun.night) bumpFun({ night: true }) }, [])
  useEffect(() => { // mazzi aperti (per "Curioso" e "Fuori dal coro")
    if (!sel) return
    bumpFun(f => ({ seen: (f.seen || []).includes(sel.deck.id) ? f.seen : [...(f.seen || []), sel.deck.id].slice(-200), rogueSeen: f.rogueSeen || !!sel.deck.rogue }))
  }, [sel?.deck.id])
  const achCtx = useMemo(() => {
    const by = {}
    for (const c of collection) { const ci = getCached(c.name)?.ci; if (ci?.length === 1) by[ci[0]] = (by[ci[0]] || 0) + c.qty }
    const value = collection.reduce((v, c) => v + (getCached(c.name)?.eur ?? 0) * c.qty, 0)
    return { cards: count, value, maxColor: Math.max(0, ...Object.values(by)), minColor: Math.min(...'WUBRG'.split('').map(x => by[x] || 0)), pins: pins.length, fun }
  }, [collection, pins, fun, cardsState])
  const unlockedIds = unlockedNow(achCtx).join()
  useEffect(() => { // nuovo traguardo: un solo avviso discreto; al primo avvio si segnano senza avvisi quelli già raggiunti
    const ids = unlockedIds ? unlockedIds.split(',') : [], had = fun.unlocked
    const fresh = ids.filter(id => !had?.[id])
    if (!fresh.length) return
    const today = new Date().toISOString().slice(0, 10)
    bumpFun(f => ({ unlocked: { ...(f.unlocked || {}), ...Object.fromEntries(fresh.map(id => [id, today])) } }))
    if (had) toast(t('ach.toast', t(`ach.${fresh[0]}`), ACHIEVEMENTS.find(a => a.id === fresh[0]).icon))
  }, [unlockedIds])
  const navCurrent = p => (p === 'decks' ? page === 'decks' || page === 'deck' : page === p) ? 'page' : undefined

  // su telefono la fila dei formati scorre: il formato scelto resta sempre visibile
  const fmtRow = useRef(null)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const row = fmtRow.current, b = row?.querySelector('[aria-selected="true"]')
      if (row && b && row.scrollWidth > row.clientWidth) row.scrollTo({ left: b.offsetLeft - row.offsetLeft - (row.clientWidth - b.offsetWidth) / 2 })
    })
    return () => cancelAnimationFrame(id)
  }, [format, formats, page])
  const formatTabs = (
    <div className="formats" role="tablist" aria-label={t('format')} ref={fmtRow}>
      {formats.map(f => <button key={f.id} role="tab" aria-selected={f.id === format} onClick={() => setFormat(f.id)}>{f.name}</button>)}
    </div>
  )

  return (
    <div className="app">
      <a className="skip" href="#contenuto" onClick={e => { e.preventDefault(); document.getElementById('contenuto')?.focus() }}>{t('skip')}</a>
      <header className={`topbar${compact ? ' compact' : ''}`} ref={headRef}>
        <a className="brand" href="#/decks" aria-label={t('home')}>
          <span className="brand-mark" aria-hidden="true">{['w', 'u', 'b', 'r', 'g'].map(c => <i key={c} className={`ms ms-${c} ms-cost`} />)}</span>
          <span className="brand-name">Netdeckable</span>
        </a>
        <nav className="nav-top" aria-label={t('sections')}>
          <a href="#/decks" aria-current={navCurrent('decks')}>{t('nav.decks')}</a>
          <a href="#/key-cards" aria-current={navCurrent('key-cards')}>{t('nav.keycards')}</a>
          <a href="#/collection" aria-current={navCurrent('collection')}>{t('nav.collection')} <span className="count">{count.toLocaleString(lang)}</span></a>
          <a href="#/stats" aria-current={navCurrent('stats')}>{t('nav.stats')}</a>
        </nav>
        <div className="prefs">
          <Picker className="pref-picker" label={t('language')} icon={<IconGlobe size={17} />} align="right" short={narrow}
            value={lang} onChange={changeLang} options={LANGS.map(([k, name]) => ({ value: k, label: name, short: k.toUpperCase(), lang: k }))} />
          <Picker className="pref-picker" label={t('currency')} icon={<IconCoins size={17} />} align="right" short={narrow}
            value={cur} onChange={changeCur} options={CURRENCIES.map(c => { const sym = currencySymbol(c, locale()); return { value: c, label: !sym || sym === c ? c : `${c} ${sym}`, short: c } })} />
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
            <div className={`decks-head${daily ? ' has-daily' : ''}`}>
              <header className="page-head">
                <h1>{t('decks.title', formatName)}</h1>
                {meta && decks.length > 0 && <p>{t('decks.intro', metaMain.filter(d => d.source !== 'utente').length, sourceText, dayMonth(updated))}</p>}
                {!collection.length && (
                  <div className="callout callout-onb">
                    <p><b>{t('decks.noCollB')}</b> {t('decks.noColl')}</p>
                    <a className="btn btn-primary" href="#/collection">{t('loadCollection')}</a>
                  </div>
                )}
                {meteo && <MetaWeather w={meteo} onOpen={id => go('deck', id)}>
                  <LuckyButton pool={[...metaMain, ...(meta || []).filter(d => d.rogue)]} onPick={d => { bumpFun(f => ({ lucky: (f.lucky || 0) + 1 })); go('deck', d.id) }} />
                </MetaWeather>}
              </header>
              {daily && <section className="daily" aria-labelledby="daily-title">
                <h2 className="daily-title" id="daily-title">{t('daily.group')}</h2>
                <div className="daily-row">
                <MysteryDeck deck={daily} signature={dailySig} colors={colorsOf(daily)} format={format} onOpen={openDaily} streak={liveStreak(fun.streak)} />
                <div className="daily-games">
                  {(() => {
                    const g = guessStore[`${format}|${dayKey()}`] || [], ans = guessDeck(meta, format)?.name
                    const badge = g.includes(ans) ? `✓ ${g.length}/${GUESS_TRIES}` : g.length >= GUESS_TRIES ? `✗ ${GUESS_TRIES}/${GUESS_TRIES}` : g.length ? `${g.length}/${GUESS_TRIES}` : null
                    return <button className="game-btn game-guess-btn" onClick={() => setGame('guess')}>
                      <span aria-hidden="true">🔎</span>
                      <span className="game-btn-text"><b>{t('guess.btn')} {badge ? <span className="pill-badge">{badge}</span> : <span className="pill-new">{t('guess.new')}</span>}</b><small>{t('guess.sub')}</small></span>
                    </button>
                  })()}
                  <button className="game-btn game-quiz" onClick={() => setGame('quiz')}>
                    <span aria-hidden="true">🪞</span>
                    <span className="game-btn-text"><b>{t('quiz.btn')}</b><small>{t('quiz.sub')}</small></span>
                  </button>
                </div>
                </div>
              </section>}
            </div>

            {banNotice}
            {rogueShown.length > 0 && (
              <button className="rogue-jump" onClick={toRogue}>
                <span aria-hidden="true">🌶</span>{t('rogue.jump', rogueShown.length)}<span aria-hidden="true" className="rogue-jump-arrow">↓</span>
              </button>
            )}

            {stale && <p className="note note-error">{t('decks.stale', daysAgo(updated))}</p>}
            {cardsState === 'error' && <p className="note note-error">{t('decks.scryDown')}</p>}

            {almost && (
              <p className="almost">
                <span aria-hidden="true">🎯</span>
                <span>{t('almost.line', almost.n)} <button className="linklike" onClick={() => go('deck', almost.s.deck.id)}>{almost.s.deck.name}</button>{costOf(almost.s).amount > 0 ? ` (≈ ${money(costOf(almost.s).amount, true)})` : ''}</span>
                <button className="almost-x" onClick={() => setAlmostOff([...almostOff, almost.s.deck.id])} aria-label={t('almost.hide')} title={t('almost.hide')}>×</button>
              </p>
            )}
            {decks.length > 1 && <button className={`btn filters-toggle${filtersOpen ? ' open' : ''}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(o => !o)}>
              <IconFilter size={18} />{t('filters')}{activeFilters > 0 && <span className="count">{activeFilters}</span>}
            </button>}
            {decks.length > 1 && (
              <div className={`filters${filtersOpen ? ' open' : ''}`}>
                <span className="select">
                  <span aria-hidden="true">{t('sort')}</span>
                  <Picker label={t('sort')} value={view.sort} onChange={v => setV({ sort: v })} options={SORTS.map(k => ({ value: k, label: t(`sort.${k}`) }))} />
                </span>
                <span className="select">
                  <span aria-hidden="true">{t('budget')}</span>
                  <Picker label={t('budget')} value={view.budget} onChange={v => setV({ budget: v })} options={BUDGETS.map(b => ({ value: b, label: b ? t('budget.max', money(localBudget(b))) : t('budget.any') }))} />
                </span>
                <div className="chips" role="group" aria-label="Tier">
                  {[0, 1, 2, 3].map(n => <button key={n} aria-pressed={view.tier === n} onClick={() => setV({ tier: n })}>{n ? `Tier ${n}` : t('allTiers')}</button>)}
                  <Info text={t('info.tier')} label={t('info.label')} />
                </div>
                <div className="color-filter" role="group" aria-label={t('colors.hint')} title={t('colors.hint')}>
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
                      <DeckList ranked={pinned} colorsOf={colorsOf} costOf={costOf} animKey={format + 'pins'} highlightFirst={false} onOpen={id => go('deck', id)} pins={pins} onPin={togglePin} owned={collection.length > 0} />
                    </section>
                  )}
                  {all.length ? <DeckList ranked={all} colorsOf={colorsOf} costOf={costOf} animKey={format + view.sort + view.tier + view.colors + view.budget} highlightFirst={false} onOpen={id => go('deck', id)} pins={pins} onPin={togglePin} owned={collection.length > 0} />
                  : <p className="empty">{t('decks.noneFilter')} {view.colors.length > 0 && t('decks.tryColor')}</p>}
                </>}

            {rogueShown.length > 0 && (
              <section className="rogue" aria-labelledby="rogue-title">
                <header className="rogue-head">
                  <h2 id="rogue-title" tabIndex={-1}><span aria-hidden="true">🌶</span> {t('rogue.title')}</h2>
                  <p>{t('rogue.intro', metaMain.length)}</p>
                </header>
                <DeckList ranked={rogueShown} colorsOf={colorsOf} costOf={costOf} animKey={format + 'rogue'} highlightFirst={false} onOpen={id => go('deck', id)} pins={pins} onPin={togglePin} owned={collection.length > 0} />
              </section>
            )}

            {cardsState === 'loading' && <p className="hint">{t('decks.loadingScry')}</p>}

            <MetaImporter format={format} formatName={formatName} onAdd={ds => setUserDecks([...userDecks, ...ds])} toast={toast} />
          </>}

          {page === 'deck' && (
            <DeckDetail key={sel.deck.id} s={sel} colors={colorsOf(sel.deck)} formatName={formatName} toast={toast}
              onOpen={id => go('deck', id)} idOf={name => ranked.find(x => x.deck.name === name)?.deck.id}
              pinned={pins.includes(sel.deck.id)} onPin={togglePin} decks={meta || []} owned={ownedMap} hasColl={collection.length > 0}
              onOwnDeck={() => ownDeck(sel)}
              onBack={() => history.length > 1 ? history.back() : go('decks')}
              onDelete={sel.deck.source === 'utente' ? () => { setUserDecks(userDecks.filter(d => d.id !== sel.deck.id)); go('decks') } : null} />
          )}

          {page === 'key-cards' && <>
            {formatTabs}
            <KeyCards ranked={ranked} formatName={formatName} collection={collection} playset={format === 'commander' ? 1 : 4} toast={toast} />
          </>}

          {page === 'stats' && <>
            {formatTabs}
            <StatsPage meta={meta} ranked={ranked} format={format} formatName={formatName} colorsOf={colorsOf} costOf={costOf} hasCollection={collection.length > 0} onOpen={id => go('deck', id)} />
          </>}
          {page === 'collection' && banNotice}
          {page === 'collection' && <CollectionManager collection={collection} setCollection={setCollection} backup={backup} setBackup={setBackup} toast={toast} best={ranked.find(s => s.deck.source !== 'utente')} onOpen={id => go('deck', id)} unlocked={fun.unlocked || {}} />}
        </ErrorBoundary>
      </main>

      <footer className="site-footer">
        <p className="footer-credits">
          {t('footer.lists')}: <a href="https://github.com/Jiliac/MTGODecklistCache" target="_blank" rel="noreferrer">MTGODecklistCache</a>, <a href="https://www.mtgtop8.com" target="_blank" rel="noreferrer">MTGTop8</a>
          {' · '}{t('footer.archetypes')}: <a href="https://github.com/Badaro/MTGOFormatData" target="_blank" rel="noreferrer">MTGOFormatData</a>
          {' · '}{t('footer.cards')}: <a href="https://scryfall.com" target="_blank" rel="noreferrer">Scryfall</a>
          {' · '}{t('footer.rates')}: <a href="https://www.ecb.europa.eu" target="_blank" rel="noreferrer">BCE/ECB</a>
          {' · '}{t('footer.tiers')}
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
        <a href="#/stats" aria-current={navCurrent('stats')}><IconChart />{t('nav.stats')}</a>
      </nav>

      <button className={`to-top${showTop ? ' show' : ''}`} onClick={() => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
        aria-label={t('toTop')} title={t('toTop')} tabIndex={showTop ? 0 : -1} aria-hidden={!showTop}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <Modal open={game === 'quiz'} onClose={() => setGame(null)} label={t('quiz.title')} className="modal-game">
        {close => <Quiz decks={meta || []} getCard={getCached} colorsOf={colorsOf} isLand={isLand}
          onGo={id => { close(); go('deck', id) }} onDone={() => bumpFun({ quiz: true })} />}
      </Modal>
      <Modal open={game === 'guess'} onClose={() => setGame(null)} label={t('guess.title')} className="modal-game modal-wide">
        {close => <GuessGame decks={meta || []} format={format} formatName={formatName} isLand={isLand} toast={toast} store={guessStore} setStore={setGuessStore}
          onGo={id => { close(); go('deck', id) }} onWin={n => bumpFun(f => ({ guessWins: (f.guessWins || 0) + 1, guessFirst: f.guessFirst || n === 1 }))} />}
      </Modal>
      <div className="toast-zone" aria-live="polite">
        {toastMsg && (
          <div className={`toast${toastMsg.action ? ' toast-action' : ''}`} key={toastMsg.id}>
            {toastMsg.text}
            {toastMsg.action && <button onClick={() => { toastMsg.action.fn(); toast(t("done"), null, true) }}>{toastMsg.action.label}</button>}
          </div>
        )}
      </div>
    </div>
  )
}
