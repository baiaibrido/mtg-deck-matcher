import { useEffect, useState } from 'react'

// Rotte nell'hash, così il tasto "indietro" del telefono funziona: #/mazzi, #/collezione, #/mazzo/<id>
const parse = () => {
  const [, page = 'mazzi', id] = location.hash.replace(/^#/, '').split('/')
  return { page, id: id ? decodeURIComponent(id) : null }
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
