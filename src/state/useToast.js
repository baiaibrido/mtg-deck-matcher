import { useCallback, useRef, useState } from 'react'

// Avviso in basso. action facoltativa: { label, fn } (es. "Annulla" dopo un'azione distruttiva).
// Un avviso con "Annulla" non viene coperto da uno semplice: quello aspetta il suo turno.
export function useToast() {
  const [msg, setMsg] = useState(null)
  const timer = useRef()
  const cur = useRef(null)
  const toast = useCallback(function show(text, action, now = false) {
    const busy = cur.current?.action && cur.current.until > Date.now()
    if (busy && !action && !now) { setTimeout(() => show(text), cur.current.until - Date.now() + 50); return }
    clearTimeout(timer.current)
    const ms = action ? 6000 : 2600
    cur.current = { action, until: Date.now() + ms }
    setMsg({ text, action, id: Date.now() })
    timer.current = setTimeout(() => { cur.current = null; setMsg(null) }, ms)
  }, [])
  return [msg, toast]
}
