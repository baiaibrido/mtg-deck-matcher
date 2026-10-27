import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useLocal } from './state/useLocal.js'
import { useRoute, go, setNavFormat } from './state/useRoute.js'
import { useToast } from './state/useToast.js'
import { usePageMeta } from './state/usePageMeta.js'
import { useFunTracking } from './state/useFunTracking.js'
import { loadFormats, loadMetaDecks } from './lib/metaDecks.js'
import { rankDecks, toOwnedMap } from './lib/matcher.js'
import { isBasic, withoutBasics, mergeCollection } from './lib/normalize.js'
import { fetchCards, getCached } from './lib/scryfall.js'
import { deckColors, missingCost } from './lib/deckInfo.js'
import { t, getLang, setLang, loadLang } from './i18n/index.js'
import { setRates, currency, setCurrency } from './lib/currency.js'
import { newBans, formatList } from './lib/bans.js'
import { pickDaily, signatureOf, dayKey } from './lib/daily.js'
import { bumpStreak, liveStreak, weather, almostThere, guessDeck, GUESS_TRIES } from './lib/fun.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import TodayCard from './components/TodayCard.jsx'
import Modal from './components/Modal.jsx'
import { TopBar, TabBar, FormatTabs, ToTop, SiteFooter, ToastZone } from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import { useAccount } from './state/useAccount.js'
import { AccountPanel } from './components/Account.jsx'

// pagine e giochi caricati solo quando servono: la home parte più leggera
const loadDeck = () => import('./components/DeckDetail.jsx')
const DeckDetail = lazy(loadDeck)
const CollectionManager = lazy(() => import('./components/CollectionManager.jsx'))
const KeyCards = lazy(() => import('./components/KeyCards.jsx'))
const StatsPage = lazy(() => import('./components/StatsPage.jsx'))
const Quiz = lazy(() => import('./components/play/Quiz.jsx'))
const GuessGame = lazy(() => import('./components/play/GuessGame.jsx'))
const Privacy = lazy(() => import('./components/Privacy.jsx'))
const Loading = () => <p className="hint page-loading" role="status">…</p>

const FIRST_BATCH = 6 // mazzi di cui caricare subito i dati Scryfall (quelli in cima alla pagina)
const isLand = n => /\bLand\b/.test(getCached(n)?.type || '')

export default function App() {
  const route = useRoute()

  // ── Formato: quello nell'indirizzo (/modern/…) vince su quello salvato, che vale per / e /deck/…
  const [savedFormat, setFormat] = useLocal('mdm.format', 'pauper')
  const [formats, setFormats] = useState([])
  const urlFormat = route.format && (!formats.length || formats.some(f => f.id === route.format)) ? route.format : null
  const format = urlFormat || savedFormat
  setNavFormat(format)
  useEffect(() => { loadFormats().then(setFormats) }, [])
  useEffect(() => { if (formats.length && urlFormat && urlFormat !== savedFormat) setFormat(urlFormat) }, [urlFormat, formats]) // si salva solo un formato esistente
  useEffect(() => {
    if (!formats.length) return
    if (route.format && !urlFormat) return go(route.page, route.id, { replace: true, format: savedFormat }) // formato inesistente
    if (route.page === 'deck' && !route.format) { // vecchi link /deck/pauper-… senza formato: lo si ricava dal nome del mazzo
      const f = formats.find(x => route.id?.startsWith(`${x.id}-`))
      if (f) go('deck', route.id, { replace: true, format: f.id })
    }
  }, [formats, route.format, route.page, route.id])
  const formatName = formats.find(f => f.id === format)?.name || ''

  // ── Collezione (solo su questo dispositivo); il backup conta le modifiche dall'ultimo export
  const [collection, setCollectionRaw] = useLocal('mdm.collection', [])
  const [backup, setBackup] = useLocal('mdm.backup', { changes: 0 })
  const setCollection = (list, { count = true } = {}) => {
    setCollectionRaw(withoutBasics(list)) // le terre base non stanno in collezione
    if (count) setBackup(b => ({ ...b, changes: (b.changes || 0) + 1 }))
  }
  useEffect(() => { if (collection.some(c => isBasic(c.name))) setCollection(collection, { count: false }) }, []) // pulizia collezioni salvate prima
  const [userDecks, setUserDecks] = useLocal('mdm.userDecks', [])

  // ── Preferenze: lingua, valuta, tema
  const [lang, setLangState] = useState(getLang())
  const changeLang = async l => { await loadLang(l); setLang(l); setLangState(l) }
  const [cur, setCur] = useState(currency())
  const changeCur = c => { setCurrency(c, true); setCur(c) }
  const [theme, setTheme] = useLocal('mdm.theme', 'dark') // tema scuro di default
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#e8ebe3' : '#181b1d')
  }, [theme])

  const [msg, toast] = useToast()
  // profilo facoltativo: la collezione si porta su tutti i dispositivi
  const acc = useAccount({ collection, setCollection, toast, t })
  const [accountOpen, setAccountOpen] = useState(false)
  useEffect(() => { if (acc.needEmail || acc.conflict) setAccountOpen(true) }, [acc.needEmail, !!acc.conflict])
  const [, setTick] = useState(0)
  const [seenBans, setSeenBans] = useLocal('mdm.bansSeen', null)
  const [pins, setPins] = useLocal('mdm.pins', []) // mazzi preferiti: restano in cima qualunque filtro ci sia
  const togglePin = id => setPins(pins.includes(id) ? pins.filter(x => x !== id) : [...pins, id])
  // Giochi e traguardi: tutto solo su questo dispositivo
  const [fun, setFun] = useLocal('mdm.fun', {})
  const bumpFun = patch => setFun(f => ({ ...f, ...(typeof patch === 'function' ? patch(f) : patch) }))
  const [almostOff, setAlmostOff] = useLocal('mdm.almostOff', [])
  const [guessStore, setGuessStore] = useLocal('mdm.guess', {})
  const [game, setGame] = useState(null) // 'quiz' | 'guess': finestra aperta sopra la pagina

  // ── Dati: cambi, mazzi del formato, classifica
  useEffect(() => { // cambi aggiornati ogni notte (altrimenti restano quelli di riserva in currency.js)
    fetch(`${import.meta.env.BASE_URL}meta/rates.json`).then(r => r.ok ? r.json() : null).then(j => { if (j?.rates) { setRates(j.rates); setTick(n => n + 1) } }).catch(() => {})
  }, [])
  const [meta, setMeta] = useState(null)
  useEffect(() => { setMeta(null); loadMetaDecks(format).then(setMeta) }, [format])
  const metaMain = useMemo(() => (meta || []).filter(d => !d.rogue), [meta])
  const decks = useMemo(() => [...metaMain, ...userDecks.filter(d => d.format === format)], [metaMain, userDecks, format])
  const ranked = useMemo(() => rankDecks(decks, collection, Infinity), [decks, collection])
  // Rogue della settimana: stessi calcoli, ordinati per vicinanza alla collezione
  const rogue = useMemo(() => rankDecks((meta || []).filter(d => d.rogue), collection, Infinity).map((s, i) => ({ ...s, rank: i + 1 })), [meta, collection])
  const sel = route.page === 'deck' ? ranked.find(s => s.deck.id === route.id) || rogue.find(s => s.deck.id === route.id) : null
  const page = ['collection', 'key-cards', 'stats', 'privacy'].includes(route.page) ? route.page : sel ? 'deck' : 'decks'
  const changeFormat = id => { setFormat(id); go(page === 'deck' ? 'decks' : page, null, { replace: true, format: id }) }
  usePageMeta({ page, deck: sel?.deck, formatName, lang })

  // Dati Scryfall: prima i mazzi in vista (colori subito), poi tutti gli altri del formato (prezzi, filtri, carte chiave)
  const [cardsState, setCardsState] = useState('idle') // idle | loading | ready | error
  const top = ranked.slice(0, FIRST_BATCH)
  const namesOf = list => [...new Set(list.flatMap(s => [...s.deck.main, ...s.deck.side].map(c => c.name)))]
  const firstKey = (sel ? [sel] : top).map(s => s.deck.id).join()
  useEffect(() => {
    if (!ranked.length) return
    let alive = true
    setCardsState('loading')
    ;(async () => {
      try {
        await fetchCards(namesOf(sel ? [sel] : top)); if (!alive) return
        setTick(n => n + 1)
        await fetchCards(namesOf([...ranked, ...rogue])); if (!alive) return
        await fetchCards(collection.map(c => c.name)); if (!alive) return // per gli avvisi sui ban
        setCardsState('ready'); setTick(n => n + 1)
      } catch { if (alive) setCardsState('error') }
    })()
    return () => { alive = false }
  }, [firstKey, decks])
  const colorsOf = deck => deckColors(deck, getCached) ?? (cardsState === 'error' ? undefined : null)
  const costOf = s => missingCost(s.missing, getCached)
  const ownedMap = useMemo(() => toOwnedMap(collection), [collection])

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

  // "Ho già questo mazzo": aggiunge le copie che mancano (main + side), con Annulla
  const ownDeck = s => {
    const add = s.missing.filter(r => r.missing > 0 && !isBasic(r.name)).map(r => ({ name: r.name, qty: r.missing }))
    if (!add.length) return
    const before = collection
    setCollection(mergeCollection([...collection, ...add]))
    toast(t('own.done', add.reduce((n, r) => n + r.qty, 0)), { label: t('undo'), fn: () => setCollection(before) })
  }

  // ── «Oggi nel meta»: meteo, mazzo misterioso del giorno, giochi
  const daily = useMemo(() => meta ? pickDaily(meta, format) : null, [meta, format])
  const dailySig = daily ? signatureOf(daily, meta, isLand) : null
  const meteo = useMemo(() => meta ? weather(meta) : null, [meta])
  const almost = collection.length ? almostThere(ranked, 5, almostOff) : null
  const guessBadge = (() => {
    const g = guessStore[`${format}|${dayKey()}`] || [], ans = meta ? guessDeck(meta, format)?.name : null
    return g.includes(ans) ? `✓ ${g.length}/${GUESS_TRIES}` : g.length >= GUESS_TRIES ? `✗ ${GUESS_TRIES}/${GUESS_TRIES}` : g.length ? `${g.length}/${GUESS_TRIES}` : null
  })()
  const openDaily = (id, fresh) => { bumpFun(f => { const st = bumpStreak(f.streak); return { streak: st, bestStreak: Math.max(f.bestStreak || 0, st.n), opens: (f.opens || 0) + (fresh ? 1 : 0) } }); go('deck', id) }
  // in cEDH «Oggi nel meta» non serve (pochi mazzi, liste tutte diverse)
  const todayCard = format === 'commander' ? null : <TodayCard weather={meteo} daily={daily} signature={dailySig} dailyColors={daily ? colorsOf(daily) : []} format={format}
    onOpenDaily={openDaily} onOpen={id => go('deck', id)} streak={liveStreak(fun.streak)} guess={guessBadge} onGame={setGame} />
  useFunTracking({ fun, bumpFun, format, collection, ranked, almost, sel, pins, cardsState, toast })

  // la pagina del mazzo è la più aperta: la si scarica in anticipo quando il browser è libero
  useEffect(() => { const idle = window.requestIdleCallback || (f => setTimeout(f, 1500)); idle(() => loadDeck()) }, [])
  const current = p => (p === 'decks' ? page === 'decks' || page === 'deck' : page === p) ? 'page' : undefined
  const formatTabs = <FormatTabs formats={formats} format={format} onChange={changeFormat} />

  return (
    <div className="app">
      <a className="skip" href="#contenuto" onClick={e => { e.preventDefault(); document.getElementById('contenuto')?.focus() }}>{t('skip')}</a>
      <TopBar current={current} count={collection.reduce((s, c) => s + c.qty, 0)} lang={lang} onLang={changeLang} cur={cur} onCur={changeCur} theme={theme} onTheme={setTheme} account={acc.state} onAccount={() => setAccountOpen(true)} />

      <main className="content" id="contenuto" tabIndex={-1}>
        <ErrorBoundary key={page}>
        <Suspense fallback={<Loading />}>
          {page === 'decks' && <>
            {formatTabs}
            <Home format={format} formatName={formatName} meta={meta} metaMain={metaMain} decks={decks} ranked={ranked} rogue={rogue}
              collection={collection} almost={almost} onHideAlmost={id => setAlmostOff([...almostOff, id])} colorsOf={colorsOf} costOf={costOf}
              pins={pins} togglePin={togglePin} cardsState={cardsState} banNotice={banNotice} todayCard={todayCard}
              userDecks={userDecks} setUserDecks={setUserDecks} toast={toast} />
          </>}

          {page === 'deck' && (
            <DeckDetail key={sel.deck.id} s={sel} colors={colorsOf(sel.deck)} formatName={formatName} listSource={meta?.source} cedh={format === 'commander'} toast={toast}
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
          {page === 'privacy' && <Privacy />}
          {page === 'collection' && <CollectionManager acc={acc} onAccount={() => setAccountOpen(true)} collection={collection} setCollection={setCollection} backup={backup} setBackup={setBackup} toast={toast} best={ranked.find(s => s.deck.source !== 'utente')} onOpen={id => go('deck', id)} unlocked={fun.unlocked || {}} />}
        </Suspense>
        </ErrorBoundary>
      </main>

      <SiteFooter />
      <TabBar current={current} />
      <ToTop />
      <Modal open={game === 'quiz'} onClose={() => setGame(null)} label={t('quiz.title')} className="modal-game">
        {close => <Suspense fallback={<Loading />}><Quiz decks={meta || []} getCard={getCached} colorsOf={colorsOf} isLand={isLand}
          onGo={id => { close(); go('deck', id) }} onDone={() => bumpFun({ quiz: true })} /></Suspense>}
      </Modal>
      <Modal open={game === 'guess'} onClose={() => setGame(null)} label={t('guess.title')} className="modal-game modal-wide">
        {close => <Suspense fallback={<Loading />}><GuessGame decks={meta || []} format={format} formatName={formatName} isLand={isLand} toast={toast} store={guessStore} setStore={setGuessStore}
          onGo={id => { close(); go('deck', id) }} onWin={n => bumpFun(f => ({ guessWins: (f.guessWins || 0) + 1, guessFirst: f.guessFirst || n === 1 }))} /></Suspense>}
      </Modal>
      <Modal open={accountOpen} onClose={() => setAccountOpen(false)} label={t('acc.title')}>
        {close => <AccountPanel acc={acc} local={collection} onClose={close} />}
      </Modal>
      <ToastZone msg={msg} toast={toast} />
    </div>
  )
}
