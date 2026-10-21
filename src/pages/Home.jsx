import { useLayoutEffect, useRef, useState } from 'react'
import { t, dayMonth } from '../i18n/index.js'
import { money, localBudget } from '../lib/currency.js'
import { deckColors, WUBRG, colorName } from '../lib/deckInfo.js'
import { getCached } from '../lib/scryfall.js'
import { go, linkProps } from '../state/useRoute.js'
import { useSession } from '../state/useSession.js'
import DeckList from '../components/DeckList.jsx'
import MetaImporter from '../components/MetaImporter.jsx'
import Picker from '../components/Picker.jsx'
import { Info } from '../components/Badges.jsx'
import { IconClip, IconFilter } from '../components/Icons.jsx'
import { useMedia } from '../state/useMedia.js'

const STALE_DAYS = 3
const daysAgo = d => d ? Math.floor((Date.now() - new Date(d + 'T12:00:00')) / 864e5) : 0
const SORTS = ['score', 'share', 'meta', 'cost']
const BUDGETS = [0, 10, 25, 50, 100, 200] // tetto di spesa in euro, mostrato e confrontato nella valuta locale (0 = nessuno)
const scrollToId = id => {
  const el = document.getElementById(id)
  el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  el?.focus({ preventScroll: true })
}

// Home: i mazzi del formato più vicini alla collezione (titolo, «Oggi nel meta», filtri, classifica, rogue)
export default function Home({ format, formatName, meta, metaMain, decks, ranked, rogue, collection, almost, onHideAlmost,
  colorsOf, costOf, pins, togglePin, cardsState, banNotice, todayCard, userDecks, setUserDecks, toast }) {
  const phone = useMedia('(max-width: 719px)') // su telefono «Oggi nel meta» va dopo i primi mazzi
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
  // Preferiti: nell'ordine in cui sono stati fissati, sempre visibili e fuori dai filtri
  const pinned = pins.map(id => ordered.find(s => s.deck.id === id) || rogue.find(s => s.deck.id === id)).filter(Boolean)
  // filtri per tier, colori e budget
  let all = ordered.filter(s => !pins.includes(s.deck.id))
  if (view.tier) all = all.filter(s => s.deck.tier === view.tier)
  if (view.colors.length) all = all.filter(s => { const c = deckColors(s.deck, getCached); return c && c.every(x => view.colors.includes(x)) })
  if (view.budget) all = all.filter(withinBudget)
  const rogueShown = (view.budget ? rogue.filter(withinBudget) : rogue).filter(s => !pins.includes(s.deck.id))
  // il mazzo più vicino alla collezione: cerchiato a penna nella classifica
  const best = owned ? ordered.filter(s => s.score < 1).reduce((a, b) => (b.score > (a?.score ?? 0) ? b : a), null) : null
  const cedh = format === 'commander' // cEDH: le percentuali si riferiscono alla lista di un torneo
  // fissando un mazzo, la riga vola nella sezione dei preferiti in cima (la pagina la segue)
  const flip = useRef(null)
  const pinWithMotion = id => {
    const el = !pins.includes(id) && document.querySelector(`.decks [data-deck="${CSS.escape(id)}"]`)
    if (el) flip.current = { id, top: el.getBoundingClientRect().top }
    togglePin(id)
  }
  useLayoutEffect(() => {
    const f = flip.current; flip.current = null
    const el = f && document.querySelector(`.pinned [data-deck="${CSS.escape(f.id)}"]`)
    if (!el) return
    const head = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head-h')) || 0
    const title = el.closest('.pinned')
    if (title.getBoundingClientRect().top < head) scrollTo({ top: title.getBoundingClientRect().top + scrollY - head - 12, behavior: 'instant' })
    el.classList.add('just-pinned'); setTimeout(() => el.classList.remove('just-pinned'), 1600)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dy = f.top - el.getBoundingClientRect().top
    el.animate([{ transform: `translateY(${dy}px)`, zIndex: 5 }, { transform: 'none', zIndex: 5 }], { duration: Math.min(900, 380 + Math.abs(dy) / 3), easing: 'cubic-bezier(.2,.7,.2,1)' })
  }, [pins])
  const listProps = { colorsOf, costOf, highlightFirst: false, onOpen: id => go('deck', id), pins, onPin: pinWithMotion, owned, bestId: best?.deck.id, cedh }

  return <>
    <div className={`home${owned ? '' : ' home-new'}`}>
      {meta && !phone && todayCard}
      <header className="page-head home-head">
        <h1 className="home-title"><span className="t-long">{formatName}: {t(`dt.${tKey}`)}</span><span className="t-short">{formatName}: {t(tShort)}</span>{cedh && <> <Info text={t('info.cedh')} label={t('info.label')} /></>}</h1>
        {!owned && <>
          <p className="hero-text">{t('hero.text')}</p>
          <p className="hero-actions">
            <a className="btn btn-primary" {...linkProps('collection')}>{t('hero.cta')}</a>
            <button className="linklike hero-browse" onClick={() => scrollToId('deck-list')}>{t('hero.browse')}</button>
          </p>
        </>}
        {almost && (
          <p className="almost">
            <span aria-hidden="true">🎯</span>
            <span>{t('almost.line', almost.n)} <button className="linklike" onClick={() => go('deck', almost.s.deck.id)}>{almost.s.deck.name}</button>{costOf(almost.s).amount > 0 ? ` (≈ ${money(costOf(almost.s).amount, true)})` : ''}</span>
            <button className="almost-x" onClick={() => onHideAlmost(almost.s.deck.id)} aria-label={t('almost.hide')} title={t('almost.hide')}>×</button>
          </p>
        )}
      </header>
      <div className="home-tools">
        {/* ordinamento e filtri insieme: l'ordine cambia anche il titolo */}
        {decks.length > 1 && <div className="sort-tabs" role="group" aria-label={t('sort')}>
          <span className="sort-tabs-label" aria-hidden="true">{t('sort')}</span>
          {sorts.map(k => <button key={k} aria-pressed={view.sort === k} onClick={() => setV({ sort: k })}>{sortLabel(k)}</button>)}
        </div>}
        {decks.length > 1 && <button className={`btn filters-toggle${filtersOpen ? ' open' : ''}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(o => !o)}>
          <IconFilter size={18} />{t('filters')}{activeFilters > 0 && <span className="count">{activeFilters}</span>}
        </button>}
        {decks.length > 1 && (
          <div className={`filters${filtersOpen ? ' open' : ''}`}>
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
        {rogueShown.length > 0 && <button className="btn chip-rogue rogue-jump" onClick={() => scrollToId('rogue-title')} title={t('rogue.title')}><span aria-hidden="true">🌶</span> {t('rogue.title')} <span className="count">{rogueShown.length}</span> <span aria-hidden="true">↓</span></button>}
      </div>
    </div>

    {banNotice}
    {stale && <p className="note note-error">{t('decks.stale', daysAgo(updated))}</p>}
    {cardsState === 'error' && <p className="note note-error">{t('decks.scryDown')}</p>}
    {meta && decks.length > 0 && <p className="list-meta" id="deck-list" tabIndex={-1}>{(() => { const [a, b = ''] = t('decks.listMeta', metaMain.filter(d => d.source !== 'utente').length, '\u0000').split('\u0000'); return updated ? <>{a}<span className="date-stamp">{dayMonth(updated)}</span>{b}</> : t('decks.listMeta', metaMain.filter(d => d.source !== 'utente').length, '') })()}</p>}

    {meta === null ? <ol className="decks skeleton" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <li key={i} className="deck" />)}</ol>
      : !decks.length ? <p className="empty">{t('decks.none', formatName)}</p>
        : <>
          {pinned.length > 0 && (
            <section className="pinned" aria-labelledby="pinned-title">
              <h2 id="pinned-title" className="pinned-title"><IconClip size={18} filled /> {t('pins.title')}</h2>
              <DeckList ranked={pinned} animKey={format + 'pins'} {...listProps} />
            </section>
          )}
          {!all.length ? <><p className="empty">{t('decks.noneFilter')} {view.colors.length > 0 && t('decks.tryColor')}</p>{meta && phone && <div className="today-inline">{todayCard}</div>}</>
            : !phone || !meta ? <DeckList ranked={all} animKey={format + view.sort + view.tier + view.colors + view.budget} {...listProps} />
              : <>
                <DeckList ranked={all.slice(0, 3)} animKey={format + view.sort + view.tier + view.colors + view.budget} {...listProps} />
                <div className="today-inline">{todayCard}</div>
                {all.length > 3 && <DeckList ranked={all.slice(3)} start={3} animKey={format + view.sort + view.tier + view.colors + view.budget + 'b'} {...listProps} />}
              </>}
        </>}

    {rogueShown.length > 0 && (
      <section className="rogue" aria-labelledby="rogue-title">
        <header className="rogue-head">
          <h2 id="rogue-title" tabIndex={-1}><span aria-hidden="true">🌶</span> {t('rogue.title')}</h2>
          <p>{t('rogue.intro', metaMain.length)}</p>
        </header>
        <DeckList ranked={rogueShown} animKey={format + 'rogue'} {...listProps} />
      </section>
    )}

    {cardsState === 'loading' && <p className="hint">{t('decks.loadingScry')}</p>}

    <MetaImporter format={format} formatName={formatName} onAdd={ds => setUserDecks([...userDecks, ...ds])} toast={toast} />
  </>
}
