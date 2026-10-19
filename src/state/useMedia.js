import { useEffect, useState } from 'react'

// true/false per una media query, aggiornato quando cambia (es. rotazione del telefono)
export function useMedia(query) {
  const get = () => typeof matchMedia !== 'undefined' && matchMedia(query).matches
  const [on, setOn] = useState(get)
  useEffect(() => {
    const m = matchMedia(query), up = () => setOn(m.matches)
    up(); m.addEventListener('change', up); return () => m.removeEventListener('change', up)
  }, [query])
  return on
}
