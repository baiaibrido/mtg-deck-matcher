import { useEffect, useState } from 'react'

// Rotte nell'hash, così il tasto "indietro" del telefono funziona: #/decks, #/deck/<id>, #/key-cards, #/collection
// I vecchi indirizzi in italiano (#/mazzi, #/mazzo/…, #/carte, #/collezione) vengono convertiti.
const LEGACY = { mazzi: 'decks', mazzo: 'deck', carte: 'key-cards', collezione: 'collection' }
export const parseHash = hash => {
  const [, raw = 'decks', id] = hash.replace(/^#/, '').split('/')
  return { page: LEGACY[raw] || raw || 'decks', id: id ? decodeURIComponent(id) : null, legacy: !!LEGACY[raw] }
}
const parse = () => {
  const r = parseHash(location.hash)
  if (r.legacy) history.replaceState(null, '', `#/${r.page}${r.id ? `/${encodeURIComponent(r.id)}` : ''}`)
  return r
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo({ top: 0 }) }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return route
}

export const go = (page, id) => { location.hash = id ? `/${page}/${encodeURIComponent(id)}` : `/${page}` }
