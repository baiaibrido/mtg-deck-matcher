import { useEffect, useMemo } from 'react'
import { t } from '../i18n/index.js'
import { getCached } from '../lib/scryfall.js'
import { unlockedNow, ACHIEVEMENTS } from '../lib/fun.js'

// Traguardi: registra formati visitati, mazzi completati e aperti, e avvisa (una volta) dei nuovi traguardi.
// Tutto resta su questo dispositivo (mdm.fun).
export function useFunTracking({ fun, bumpFun, format, collection, ranked, almost, sel, pins, cardsState, toast }) {
  useEffect(() => { if (format && !(fun.formats || []).includes(format)) bumpFun(f => ({ formats: [...new Set([...(f.formats || []), format])] })) }, [format])
  const completeCount = collection.length ? ranked.filter(s => s.deck.source !== 'utente' && s.missing.length === 0 && s.main.total > 0).length : 0
  useEffect(() => { if (completeCount > (fun.completeMax || 0)) bumpFun({ completeMax: completeCount }) }, [completeCount])
  useEffect(() => { if (almost && !fun.almost) bumpFun({ almost: true }) }, [!!almost])
  useEffect(() => { const h = new Date().getHours(); if (h < 5 && !fun.night) bumpFun({ night: true }) }, [])
  useEffect(() => { // mazzi aperti (per "Curioso" e "Fuori dal coro")
    if (!sel) return
    bumpFun(f => ({ seen: (f.seen || []).includes(sel.deck.id) ? f.seen : [...(f.seen || []), sel.deck.id].slice(-200), rogueSeen: f.rogueSeen || !!sel.deck.rogue }))
  }, [sel?.deck.id])
  const count = collection.reduce((s, c) => s + c.qty, 0)
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
}
