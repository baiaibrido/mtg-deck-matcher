import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { t } from '../../i18n/index.js'
import { norm } from '../../lib/normalize.js'
import { dayKey } from '../../lib/daily.js'
import { guessDeck, revealOrder, shareGrid, GUESS_TRIES } from '../../lib/fun.js'
import CardFace from './CardFace.jsx'
import { IconShare } from '../Icons.jsx'

const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
const MAX_SUGG = 8

// Indovina il mazzo del giorno: a ogni tentativo sbagliato si scopre una carta in più
export default function GuessGame({ decks, format, formatName, isLand, onWin, onGo, toast, store, setStore }) {
  const deck = useMemo(() => guessDeck(decks, format), [decks, format])
  const order = useMemo(() => deck ? revealOrder(deck, decks, isLand) : [], [deck, decks])
  const names = useMemo(() => [...new Set(decks.filter(d => !d.rogue && d.source !== 'utente').map(d => d.name))].sort(), [decks])
  const key = `${format}|${dayKey()}`
  const [q, setQ] = useState('')
  const [typing, setTyping] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState(null) // posizione dei suggerimenti (fissa, sempre dentro lo schermo)
  const input = useRef(null), listRef = useRef(null), blurT = useRef(null)
  const listId = useId()
  const g = store[key] || []
  const sugg = q.trim() ? names.filter(n => norm(n).includes(norm(q)) && !g.includes(n)).slice(0, MAX_SUGG) : []
  const open = typing && sugg.length > 0
  // risposta pronta da inviare con «Prova»: nome scritto per intero o unico suggerimento rimasto
  const pick = names.find(n => norm(n) === norm(q) && !g.includes(n)) || (sugg.length === 1 ? sugg[0] : null)

  // I suggerimenti stanno sopra la finestra (position: fixed), sotto il campo se c'è spazio, altrimenti sopra:
  // non finiscono mai dentro lo scorrimento della finestra né sotto la tastiera del telefono.
  useLayoutEffect(() => {
    if (!open || touch) { setPos(null); return } // su telefono i suggerimenti stanno sotto il campo, nel flusso della pagina
    const place = () => {
      const el = input.current; if (!el) return
      const r = el.getBoundingClientRect(), vv = window.visualViewport
      const vTop = vv?.offsetTop ?? 0, vBottom = vTop + (vv?.height ?? innerHeight)
      const want = Math.min(sugg.length * 44 + 12, 320)
      const below = vBottom - r.bottom - 10, above = r.top - vTop - 10
      const up = below < Math.min(want, 180) && above > below
      setPos({ left: r.left, width: r.width, maxHeight: Math.max(96, Math.min(want, up ? above : below)),
        ...(up ? { bottom: innerHeight - r.top + 6 } : { top: r.bottom + 6 }) })
    }
    place()
    const dlg = input.current?.closest('dialog'), vv = window.visualViewport
    addEventListener('resize', place); vv?.addEventListener('resize', place); vv?.addEventListener('scroll', place); dlg?.addEventListener('scroll', place)
    return () => { removeEventListener('resize', place); vv?.removeEventListener('resize', place); vv?.removeEventListener('scroll', place); dlg?.removeEventListener('scroll', place) }
  }, [open, sugg.length, q])
  useEffect(() => { setActive(0) }, [q])
  useEffect(() => { if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' }) }, [active, open])
  useEffect(() => () => clearTimeout(blurT.current), [])
  // su telefono la tastiera copre metà schermo: il campo resta in vista
  useEffect(() => {
    if (!typing) return
    const keep = () => requestAnimationFrame(() => input.current?.scrollIntoView({ block: 'nearest' }))
    keep(); const vv = window.visualViewport
    vv?.addEventListener('resize', keep); return () => vv?.removeEventListener('resize', keep)
  }, [typing, store])

  if (!deck || order.length < 2) return null
  const tries = Math.min(GUESS_TRIES, order.length)
  const won = g.includes(deck.name), lost = !won && g.length >= tries, done = won || lost
  const shown = done ? order.length : Math.min(order.length, g.length + 1)

  const guess = name => {
    if (done || g.includes(name)) return
    const next = [...g, name]
    const keep = Object.fromEntries(Object.entries(store).slice(-30))
    setStore({ ...keep, [key]: next }); setQ('')
    if (name === deck.name) onWin(next.length)
  }
  const onKey = e => {
    if (e.key === 'ArrowDown' && open) { e.preventDefault(); setActive(a => (a + 1) % sugg.length) }
    else if (e.key === 'ArrowUp' && open) { e.preventDefault(); setActive(a => (a - 1 + sugg.length) % sugg.length) }
    else if (e.key === 'Enter' && open) { e.preventDefault(); guess(sugg[active] || sugg[0]) }
    else if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); setQ('') } // prima si chiude la lista, poi la finestra
  }
  const share = async () => {
    const text = `Netdeckable · ${t('guess.title')} · ${formatName}\n${shareGrid(g, deck.name, tries)} ${won ? `${g.length}/${tries}` : `X/${tries}`}`
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast(t('guess.copied')) } } catch { /* annullato */ }
  }

  return (
    <div className={`game game-guess${typing && !done ? ' typing' : ''}`}>
      <p className="game-kicker">{t('guess.title')} <span className="game-format">{formatName}</span></p>
      <h2 className="guess-status">{done ? (won ? t('guess.won', g.length) : t('guess.lost')) : t('guess.try', g.length + 1, tries)}</h2>
      <p className="game-text">{t('guess.intro')}</p>
      <ol className="guess-cards" aria-label={t('guess.cards')}>
        {order.slice(0, tries).map((n, i) => (
          <li key={i} className={i < shown ? 'in' : ''}><CardFace name={n} hidden={i >= shown} /></li>
        ))}
      </ol>
      {!done ? (
        <div className="guess-input">
          <input ref={input} type="search" role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
            aria-activedescendant={open ? `${listId}-${active}` : undefined}
            autoFocus={!touch} enterKeyHint="go" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={q} autoComplete="off"
            onFocus={() => { clearTimeout(blurT.current); setTyping(true) }}
            // la lista resta un attimo dopo che il campo perde il fuoco: su iPhone il tocco su un suggerimento arriva dopo
            onBlur={() => { blurT.current = setTimeout(() => setTyping(false), 300) }} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
            placeholder={t('guess.placeholder')} aria-label={t('guess.placeholder')} />
          <button type="button" className="btn btn-primary guess-go" disabled={!pick}
            onPointerDown={e => e.preventDefault()} onClick={() => pick && guess(pick)}>{t('guess.go')}</button>
          {open && <ul ref={listRef} id={listId} className={`guess-sugg${touch ? ' guess-sugg-inline' : ''}`} role="listbox" aria-label={t('guess.placeholder')}
            style={touch ? undefined : pos || { visibility: 'hidden' }}>
            {/* pulsanti veri: su iPhone il tocco su un elemento qualsiasi a volte non arriva */}
            {sugg.map((n, i) => <li key={n} role="presentation">
              <button type="button" id={`${listId}-${i}`} role="option" aria-selected={i === active} className={i === active ? 'active' : ''} tabIndex={-1}
                onPointerDown={e => e.preventDefault()} onPointerEnter={() => setActive(i)} onClick={() => guess(n)}>{n}</button>
            </li>)}
          </ul>}
        </div>
      ) : (
        <div className="guess-done">
          <p className={won ? 'guess-win' : 'guess-lose'}>{won ? '🎉 ' : ''}{t('guess.answer')} <b>{deck.name}</b></p>
          <div className="game-actions">
            <button className="btn btn-primary" onClick={() => onGo(deck.id)}>{t('guess.open')}</button>
            <button className="btn" onClick={share}><IconShare size={18} />{t('guess.share')}</button>
          </div>
          <p className="hint">{t('guess.tomorrow')}</p>
        </div>
      )}
      {g.length > 0 && <ul className="guess-tried" aria-label={t('guess.tried')}>
        {g.map(n => <li key={n} className={n === deck.name ? 'ok' : 'no'}>{n === deck.name ? '✓' : '✗'} {n}</li>)}
      </ul>}
    </div>
  )
}
