import { useEffect, useState } from 'react'

export function useLocal(key, initial) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* quota */ } }, [key, v])
  // valore cambiato in un'altra scheda del sito: lo si prende, così questa scheda non lo riscrive con quello vecchio
  useEffect(() => {
    const on = e => { if (e.key === key) try { setV(e.newValue ? JSON.parse(e.newValue) : initial) } catch { /* valore illeggibile */ } }
    addEventListener('storage', on); return () => removeEventListener('storage', on)
  }, [key])
  return [v, setV]
}
