import { useEffect, useState } from 'react'

// Indirizzi veri (leggibili da Google e condivisibili): /pauper, /pauper/deck/<id>, /pauper/key-cards,
// /pauper/stats, /collection. Il formato nell'indirizzo è facoltativo (/deck/<id> usa quello scelto).
// I vecchi indirizzi con l'hash (#/deck/…, anche quelli italiani #/mazzo/…) vengono convertiti.
const PAGES = ['decks', 'deck', 'key-cards', 'collection', 'stats']
const LEGACY = { mazzi: 'decks', mazzo: 'deck', carte: 'key-cards', collezione: 'collection' }

export const parseHash = hash => {
  const [, raw = 'decks', id] = hash.replace(/^#/, '').split('/')
  return { page: LEGACY[raw] || raw || 'decks', id: id ? decodeURIComponent(id) : null, legacy: !!LEGACY[raw] }
}

export function parsePath(pathname = '/', hash = '') {
  if (hash.startsWith('#/')) return { ...parseHash(hash), format: null, fromHash: true }
  const parts = pathname.split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p) } catch { return p } })
  const format = parts[0] && !PAGES.includes(parts[0]) && !LEGACY[parts[0]] ? parts.shift() : null
  const [raw = 'decks', id = null] = parts
  return { page: LEGACY[raw] || raw, id, format, fromHash: false }
}

export function pathOf(page, { id = null, format = null } = {}) {
  if (page === 'collection') return '/collection'
  const f = format ? `/${encodeURIComponent(format)}` : ''
  if (page === 'decks') return f || '/'
  return `${f}/${page}${id ? `/${encodeURIComponent(id)}` : ''}`
}

// formato corrente per costruire i link (lo aggiorna App a ogni render)
let navFormat = null
export const setNavFormat = f => { navFormat = f }
export const hrefOf = (page, id) => pathOf(page, { id, format: page === 'collection' ? null : navFormat })

const read = () => parsePath(location.pathname, location.hash)
export function go(page, id, { replace = false, format } = {}) {
  const url = pathOf(page, { id, format: page === 'collection' ? null : (format ?? navFormat) })
  if (url === location.pathname && !location.hash) return
  history[replace ? 'replaceState' : 'pushState'](history.state?.modal ? null : history.state, '', url)
  dispatchEvent(new Event('routechange'))
}

export function useRoute() {
  const [route, setRoute] = useState(() => {
    const r = read()
    if (r.fromHash) history.replaceState(null, '', pathOf(r.page, { id: r.id })) // #/deck/x → /deck/x
    return r
  })
  useEffect(() => {
    let last = location.pathname
    const on = () => {
      setRoute(read())
      if (location.pathname !== last) { last = location.pathname; window.scrollTo({ top: 0 }) } // non per l'apertura/chiusura delle finestre
    }
    addEventListener('popstate', on); addEventListener('routechange', on)
    return () => { removeEventListener('popstate', on); removeEventListener('routechange', on) }
  }, [])
  return route
}

// Link interno: href vero (apri in nuova scheda, copia link) ma navigazione senza ricaricare la pagina
export function linkProps(page, id) {
  return {
    href: hrefOf(page, id),
    onClick: e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault(); go(page, id)
    },
  }
}
