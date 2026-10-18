import { useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../../i18n/index.js'
import { norm } from '../../lib/normalize.js'
import { dayKey } from '../../lib/daily.js'
import { guessDeck, revealOrder, shareGrid, GUESS_TRIES } from '../../lib/fun.js'
import CardFace from './CardFace.jsx'
import { IconShare } from '../Icons.jsx'

const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

// Indovina il mazzo del giorno: a ogni tentativo sbagliato si scopre una carta in più
export default function GuessGame({ decks, format, formatName, isLand, onWin, onGo, toast, store, setStore }) {
  const deck = useMemo(() => guessDeck(decks, format), [decks, format])
  const order = useMemo(() => deck ? revealOrder(deck, decks, isLand) : [], [deck, decks])
  const names = useMemo(() => [...new Set(decks.filter(d => !d.rogue && d.source !== 'utente').map(d => d.name))].sort(), [decks])
  const key = `${format}|${dayKey()}`
  const [q, setQ] = useState('')
  const [typing, setTyping] = useState(false)
  const input = useRef(null)
  // su telefono la tastiera copre metà schermo: il campo resta in vista e i suggerimenti compaiono sopra
  useEffect(() => {
    if (!typing) return
    const keep = () => requestAnimationFrame(() => input.current?.scrollIntoView({ block: 'nearest' }))
    keep(); const vv = window.visualViewport
    vv?.addEventListener('resize', keep); return () => vv?.removeEventListener('resize', keep)
  }, [typing, q, store])
  if (!deck || order.length < 2) return null
  const g = store[key] || []
  const tries = Math.min(GUESS_TRIES, order.length)
  const won = g.includes(deck.name), lost = !won && g.length >= tries, done = won || lost
  const shown = done ? order.length : Math.min(order.length, g.length + 1)
  const sugg = q.trim() ? names.filter(n => norm(n).includes(norm(q)) && !g.includes(n)).slice(0, 6) : []

  const guess = name => {
    if (done || g.includes(name)) return
    const next = [...g, name]
    const keep = Object.fromEntries(Object.entries(store).slice(-30))
    setStore({ ...keep, [key]: next }); setQ('')
    if (name === deck.name) onWin(next.length)
  }
  const share = async () => {
    const text = `Netdeckable · ${t('guess.title')} · ${formatName}\n${shareGrid(g, deck.name, tries)} ${won ? `${g.length}/${tries}` : `X/${tries}`}`
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast(t('guess.copied')) } } catch { /* annullato */ }
  }

  return (
    <div className={`game game-guess${typing && !done ? ' typing' : ''}`}>
      <p className="game-kicker">{t('guess.title')} · {formatName}</p>
      <h2 className="guess-status">{done ? (won ? t('guess.won', g.length) : t('guess.lost')) : t('guess.try', g.length + 1, tries)}</h2>
      <p className="game-text">{t('guess.intro')}</p>
      <ol className="guess-cards" aria-label={t('guess.cards')}>
        {order.slice(0, tries).map((n, i) => (
          <li key={i} className={i < shown ? 'in' : ''}><CardFace name={n} hidden={i >= shown} /></li>
        ))}
      </ol>
      {!done ? (
        <div className="guess-input">
          <input ref={input} type="search" autoFocus={!touch} enterKeyHint="go" autoCorrect="off" autoCapitalize="off" spellCheck={false} value={q}
            onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} onChange={e => setQ(e.target.value)} placeholder={t('guess.placeholder')} aria-label={t('guess.placeholder')}
            onKeyDown={e => { if (e.key === 'Enter' && sugg[0]) guess(sugg[0]) }} autoComplete="off" />
          {sugg.length > 0 && <ul className="guess-sugg" role="listbox">
            {sugg.map(n => <li key={n} role="option" aria-selected="false"><button onPointerDown={e => e.preventDefault()} onClick={() => guess(n)}>{n}</button></li>)}
          </ul>}
        </div>
      ) : (
        <div className="guess-done">
          <p className={won ? 'guess-win' : 'guess-lose'}>{won ? '🎉 ' : ''}{t('guess.answer')} <b>{deck.name}</b></p>
          <div className="game-actions">
            <button className="btn btn-primary" onClick={() => onGo(deck.id)}>{t('guess.open')} →</button>
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
