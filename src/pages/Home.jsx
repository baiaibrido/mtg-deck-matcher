import { useMemo, useState } from 'react'
import { t, dayMonth } from '../i18n/index.js'
import { money, localBudget } from '../lib/currency.js'
import { deckColors, WUBRG, colorName } from '../lib/deckInfo.js'
import { getCached } from '../lib/scryfall.js'
import { go, linkProps } from '../state/useRoute.js'
import { useSession } from '../state/useSession.js'
import { HeroDeck, DeckLines, PinChips } from '../components/DeckCards.jsx'
import { norm } from '../lib/normalize.js'
import { pickSignature } from '../lib/daily.js'
import MetaImporter from '../components/MetaImporter.jsx'
import Picker from '../components/Picker.jsx'
import { Info } from '../components/Badges.jsx'
import { ManaSymbol } from '../components/Mana.jsx'
import { IconFilter, IconTarget, IconChili } from '../components/Icons.jsx'

const STALE_DAYS = 3
const daysAgo = d => d ? Math.floor((Date.now() - new Date(d + 'T12:00:00')) / 864e5) : 0
const SORTS = ['score', 'share', 'meta', 'cost']
const BUDGETS = [0, 10, 25, 50, 100, 200] // tetto di spesa in euro, mostrato e confrontato nella valuta locale (0 = nessuno)

// Home: i mazzi del formato più vicini alla collezione (titolo, «Oggi nel meta», filtri, classifica, rogue)
export default function Home({ format, formatName, meta, metaMain, decks, ranked, rogue, collection, almost, onHideAlmost,
  colorsOf, costOf, pins, togglePin, cardsState, banNotice, todayCard, userDecks, setUserDecks, toast }) {
  const owned = collection.length > 0
  const [viewRaw, setView] = useSession('mdm.view', {})
  // ordine predefinito: chi ha carte vede i mazzi più vicini alla collezione, chi non ne ha i mazzi del momento
  const view = { sort: owned ? 'score' : 'share', tier: 0, colors: [], budget: 0, ...viewRaw }
  if (!owned && view.sort === 'score') view.sort = 'share'
  const sorts = owned ? SORTS : SORTS.filter(k => k !== 'score')
  const sortLabel = k => t(k === 'cost' && !owned ? 'sort.cheap' : `sort.${k}`)
  // titolo sempre su una riga: «Pauper: i più giocati»; su telefono una versione più corta
  const tKey = view.sort === 'cost' && !owned ? 'cheap' : view.sort
  const tShort = ['score', 'meta', 'cost'].includes(tKey) ? `dt.${tKey}.s` : `dt.${tKey}`
  const setV = patch => setView({ ...view, ...patch })
  const toggleColor = c => setV({ colors: view.colors.includes(c) ? view.colors.filter(x => x !== c) : [...view.colors, c] })
  const activeFilters = (view.budget > 0) + (view.tier > 0) + (view.colors.length > 0)
  const [filtersOpen, setFiltersOpen] = useState(false) // su telefono i filtri stanno chiusi dietro un pulsante
  const updated = meta?.[0]?.updated
  const stale = updated && daysAgo(updated) > STALE_DAYS

  const withinBudget = s => !s.missing.length || costOf(s).amount <= localBudget(view.budget)
  // Tutti i mazzi del formato nell'ordine scelto: il numero a sinistra è la posizione in quest'ordine
  const ordered = (() => { // ricalcolato a ogni disegno: dipende anche da valuta e cambi
    const list = [...ranked]
    if (view.sort === 'share') list.sort((a, b) => (b.deck.share || 0) - (a.deck.share || 0))
    if (view.sort === 'meta') list.sort((a, b) => (b.deck.metaWr ?? -1) - (a.deck.metaWr ?? -1))
    if (view.sort === 'cost') list.sort((a, b) => costOf(a).amount - costOf(b).amount || b.score - a.score)
    return list.map((s, i) => ({ ...s, rank: i + 1 }))
  })()
  // Preferiti: nell'ordine in cui sono stati fissati, sempre visibili e fuori dai filtri (restano anche al loro posto in classifica)
  const pinned = pins.map(id => ordered.find(s => s.deck.id === id) || rogue.find(s => s.deck.id === id)).filter(Boolean)
  // filtri per tier, colori e budget
  let all = ordered
  if (view.tier) all = all.filter(s => s.deck.tier === view.tier)
  if (view.colors.length) all = all.filter(s => { const c = deckColors(s.deck, getCached); return c && (c.main || c).every(x => view.colors.includes(x)) }) // solo i colori principali: gli splash non contano
  if (view.budget) all = all.filter(withinBudget)
  const rogueShown = view.budget ? rogue.filter(withinBudget) : rogue
  const cedh = format === 'commander' // cEDH: le percentuali si riferiscono alla lista di un torneo
  // l'illustrazione di ogni mazzo: la sua carta più tipica (quella che negli altri mazzi c'è meno), ritagliata
  const freq = useMemo(() => { const f = new Map(); for (const d of meta || []) for (const k of new Set((d.main || []).map(c => norm(c.name)))) f.set(k, (f.get(k) || 0) + 1); return f }, [meta])
  const isLand = n => /\bLand\b/.test(getCached(n)?.type || '')
  const artOf = d => { const n = pickSignature(d.main || [], x => freq.get(norm(x)) || 0, isLand, d.name) || d.signature; return getCached(n)?.img?.replace('/normal/', '/art_crop/') || null }
  const lineProps = { colorsOf, artOf, costOf, owned, cedh, metric: owned ? null : view.sort, onOpen: id => go('deck', id) }

  const listMeta = (() => { // «50 mazzi, aggiornati il [18 OTT]»: la data è un timbro datario
    const n = metaMain.filter(d => d.source !== 'utente').length
    if (!updated) return t('decks.listMeta', n, '')
    const [a, b = ''] = t('decks.listMeta', n, '\u0000').split('\u0000')
    return <>{a}<span className="date-stamp">{dayMonth(updated)}</span>{b}</>
  })()

  const head = all[0]
  return <>
    <div className={`home${owned ? '' : ' home-new'}`}>
      <header className="page-head home-head">
        <h1 className="home-title"><span className="t-long">{formatName}: {t(`dt.${tKey}`)}</span><span className="t-short">{formatName}: {t(tShort)}</span>{cedh && <> <Info text={t('info.cedh')} label={t('info.label')} /></>}</h1>
        {meta && decks.length > 0 && <p className="home-sub">{listMeta}</p>}
        {!owned && <>
          <p className="hero-text">{t('hero.text')}</p>
          <p className="hero-actions">
            <a className="btn btn-primary" {...linkProps('collection')}>{t('hero.cta')}</a>
          </p>
        </>}
        {almost && (
          <p className="almost">
            <IconTarget size={18} className="almost-icon" />
            <span>{t('almost.line', almost.n)} <button className="linklike" onClick={() => go('deck', almost.s.deck.id)}>{almost.s.deck.name}</button>{costOf(almost.s).amount > 0 ? ` (≈ ${money(costOf(almost.s).amount, true)})` : ''}</span>
            <button className="almost-x" onClick={() => onHideAlmost(almost.s.deck.id)} aria-label={t('almost.hide')} title={t('almost.hide')}>×</button>
          </p>
        )}
      </header>

      {/* una sola riga: l'ordine come etichette che si scorrono e il pulsante dei filtri */}
      {decks.length > 1 && <div className="home-tools">
        <div className="sort-chips" role="group" aria-label={t('sort')}>
          {sorts.map(k => <button key={k} aria-pressed={view.sort === k} onClick={() => setV({ sort: k })}>{sortLabel(k)}</button>)}
        </div>
        <button className={`btn filters-toggle${filtersOpen ? ' open' : ''}`} aria-expanded={filtersOpen} aria-controls="home-filters" onClick={() => setFiltersOpen(o => !o)} aria-label={t('filters')} title={t('filters')}>
          <IconFilter size={18} /><span className="lbl-long">{t('filters')}</span>{activeFilters > 0 && <span className="count">{activeFilters}</span>}
        </button>
        {filtersOpen && <div className="toolbar-row filters open" id="home-filters">
          <span className="field">
            <span className="field-label" aria-hidden="true">{t('budget')}</span>
            <Picker label={t('budget')} value={view.budget} onChange={v => setV({ budget: v })} options={BUDGETS.map(b => ({ value: b, label: b ? t('budget.max', money(localBudget(b))) : t('budget.any') }))} />
          </span>
          <span className="field">
            <span className="field-label" id="tier-label">Tier</span>
            <span className="seg" role="group" aria-labelledby="tier-label">
              {[0, 1, 2, 3].map(n => <button key={n} aria-pressed={view.tier === n} aria-label={n ? `Tier ${n}` : t('allTiers')} onClick={() => setV({ tier: n })}>{n || t('tier.all')}</button>)}
            </span>
            <Info text={t('info.tier')} label={t('info.label')} />
          </span>
          <span className="field color-filter">
            <span className="field-label" aria-hidden="true">{t('colors.s')}</span>
            <span className="seg seg-icons seg-colors" role="group" aria-label={t('colors.hint')} title={t('colors.hint')}>
              {WUBRG.map(c => (
                <button key={c} aria-pressed={view.colors.includes(c)} onClick={() => toggleColor(c)} title={colorName(c)} aria-label={colorName(c)}>
                  <ManaSymbol s={c.toLowerCase()} />
                </button>
              ))}
            </span>
            {view.colors.length > 0 && <button className="linklike" onClick={() => setV({ colors: [] })}>{t('clearColors')}</button>}
          </span>
        </div>}
      </div>}
    </div>

    {banNotice}
    {stale && <p className="note note-error">{t('decks.stale', daysAgo(updated))}</p>}
    {cardsState === 'error' && <p className="note note-error">{t('decks.scryDown')}</p>}
    {pinned.length > 0 && decks.length > 0 && <PinChips list={pinned} owned={owned} onOpen={id => go('deck', id)} />}

    {meta === null ? <div className="dlines skeleton" aria-busy="true" />
      : !decks.length ? <p className="empty">{t('decks.none', formatName)}</p>
        : !all.length ? <><p className="empty">{t('decks.noneFilter')} {view.colors.length > 0 && t('decks.tryColor')}</p>{todayCard}</>
          : <div id="deck-list" tabIndex={-1} className="home-list">
            <HeroDeck s={head} colors={colorsOf(head.deck)} art={artOf(head.deck)} cost={costOf(head)} owned={owned} metric={owned ? null : view.sort} cedh={cedh} onOpen={() => go('deck', head.deck.id)} />
            {all.length > 1 && <DeckLines list={all.slice(1)} {...lineProps} after={4}>{meta && todayCard}</DeckLines>}
            {all.length <= 5 && meta && todayCard}
          </div>}

    {rogueShown.length > 0 && (
      <section className="rogue" aria-labelledby="rogue-title">
        <h2 id="rogue-title" tabIndex={-1}><IconChili size={22} className="chili" /> {t('rogue.title')}</h2>
        <p className="rogue-intro">{t('rogue.intro', metaMain.length)}</p>
        <DeckLines list={rogueShown} {...lineProps} />
      </section>
    )}

    {cardsState === 'loading' && <p className="hint">{t('decks.loadingScry')}</p>}

    <MetaImporter format={format} formatName={formatName} onAdd={ds => setUserDecks([...userDecks, ...ds])} toast={toast} />
  </>
}
