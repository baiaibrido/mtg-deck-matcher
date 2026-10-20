import { useEffect, useState } from 'react'

// Come useLocal ma vale solo finché la scheda è aperta: a ogni nuova apertura del sito
// ordinamenti, filtri e viste ripartono dai valori predefiniti
export function useSession(key, initial) {
  const [v, setV] = useState(() => {
    try { const s = sessionStorage.getItem(key); return s ? JSON.parse(s) : initial } catch { return initial }
  })
  useEffect(() => { try { sessionStorage.setItem(key, JSON.stringify(v)) } catch { /* privata */ } }, [key, v])
  return [v, setV]
}

// prima queste preferenze restavano salvate per sempre: le togliamo
try { ['mdm.view', 'mdm.collView', 'mdm.kcView', 'mdm.deckView'].forEach(k => localStorage.removeItem(k)) } catch { /* niente */ }
