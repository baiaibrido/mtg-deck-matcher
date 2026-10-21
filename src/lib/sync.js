// Sincronizzazione della collezione con il profilo: logica pura (testata in sync.test.js).
import { entryKey } from './normalize.js'

// impronta breve di una collezione: serve a capire chi è cambiato dall'ultima sincronizzazione
export function fingerprint(list = []) {
  const s = JSON.stringify(list)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return `${list.length}:${(h >>> 0).toString(36)}`
}

// Unione di due collezioni: per ogni carta (stessa stampa, foil a parte) si tiene il numero di copie più alto,
// così due copie della stessa collezione non raddoppiano
export function mergeMax(a = [], b = []) {
  const map = new Map()
  for (const e of [...a, ...b]) {
    const k = entryKey(e), cur = map.get(k)
    if (!cur) map.set(k, { ...e })
    else if (e.qty > cur.qty) cur.qty = e.qty
  }
  return [...map.values()]
}

// Primo contatto con il profilo dopo l'accesso. last = { uid, fp } dell'ultima sincronizzazione su questo dispositivo.
// Risposte: 'upload' (il profilo prende quella del dispositivo), 'download' (il dispositivo prende quella del profilo),
// 'same' (già uguali), 'ask' (sono diverse e cambiate entrambe: decide l'utente)
export function firstSync(local = [], remote, uid, last) {
  if (!remote) return local.length ? 'upload' : 'same'
  const lf = fingerprint(local), rf = fingerprint(remote)
  if (lf === rf) return 'same'
  if (!local.length) return 'download'
  if (!remote.length) return 'upload'
  if (last?.uid === uid) {
    if (lf === last.fp) return 'download' // qui non è cambiato niente: vale il profilo (aggiornato altrove)
    if (rf === last.fp) return 'upload' // il profilo non è cambiato: valgono le modifiche fatte qui
  }
  return 'ask'
}

export const cardCount = list => list.reduce((s, c) => s + (c.qty || 0), 0)
