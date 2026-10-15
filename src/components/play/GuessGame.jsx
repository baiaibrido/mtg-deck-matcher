import { useMemo, useState } from 'react'
import { t } from '../../i18n/index.js'
import { norm } from '../../lib/normalize.js'
import { dayKey } from '../../lib/daily.js'
import { guessDeck, revealOrder, shareGrid, GUESS_TRIES } from '../../lib/fun.js'
import { useLocal } from '../../state/useLocal.js'
import CardFace from './CardFace.jsx'
import { IconShare } from '../Icons.jsx'

// Indovina il mazzo del giorno: a ogni tentativo sbagliato si scopre una carta in più
export default function GuessGame({ decks, format, formatName, isLand, onWin, onOpen, toast }) {
  const deck = useMemo(() => guessDeck(decks, format), [decks, format])
  const order = useMemo(() => deck ? revealOrder(deck, decks, isLand) : [], [deck, decks])
  const names = useMemo(() => [...new Set(decks.filter(d => !d.rogue && d.source !== 'utente').map(d => d.name))].sort(), [decks])
  const key = `${format}|${dayKey()}`
  const [store, setStore] = useLocal('mdm.guess', {})
  const [q, setQ] = useState('')
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
    <section className="panel play-guess" aria-labelledby="guess-title">
      <div className="play-head">
        <h2 id="guess-title">{t('guess.title')}</h2>
        <span className="play-sub">{done ? (won ? t('guess.won', g.length) : t('guess.lost')) : t('guess.try', g.length + 1, tries)}</span>
      </div>
      <p className="play-intro">{t('guess.intro')}</p>
      <ol className="guess-cards" aria-label={t('guess.cards')}>
        {order.slice(0, tries).map((n, i) => (
          <li key={i} className={i < shown ? 'in' : ''}><CardFace name={n} hidden={i >= shown} /></li>
        ))}
      </ol>
      {!done ? (
        <div className="guess-input">
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('guess.placeholder')} aria-label={t('guess.placeholder')}
            onKeyDown={e => { if (e.key === 'Enter' && sugg[0]) guess(sugg[0]) }} autoComplete="off" />
          {sugg.length > 0 && <ul className="guess-sugg" role="listbox">
            {sugg.map(n => <li key={n} role="option" aria-selected="false"><button onClick={() => guess(n)}>{n}</button></li>)}
          </ul>}
        </div>
      ) : (
        <div className="guess-done">
          <p className={won ? 'guess-win' : 'guess-lose'}>{won ? '🎉 ' : ''}{t('guess.answer')} <b>{deck.name}</b></p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => onOpen(deck.id)}>{t('guess.open')}</button>
            <button className="btn" onClick={share}><IconShare size={18} />{t('guess.share')}</button>
          </div>
          <p className="hint">{t('guess.tomorrow')}</p>
        </div>
      )}
      {g.length > 0 && <ul className="guess-tried" aria-label={t('guess.tried')}>
        {g.map(n => <li key={n} className={n === deck.name ? 'ok' : 'no'}>{n === deck.name ? '✓' : '✗'} {n}</li>)}
      </ul>}
    </section>
  )
}
