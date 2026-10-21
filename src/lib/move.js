// Trasloco su netdeckable.net. I dati stanno nel browser e ogni indirizzo ha i suoi:
// il vecchio indirizzo li impacchetta nel link (dopo il #, che non arriva a nessun server) e manda al nuovo,
// che li prende solo se lì non c'è già niente.
export const OLD_HOST = 'mtg-deck-matcher-mu.vercel.app'
export const NEW_SITE = 'https://netdeckable.net'
const KEYS = [
  'mdm.collection', 'mdm.userDecks', 'mdm.pins', 'mdm.backup', 'mdm.fun', 'mdm.guess',
  'mdm.lang', 'mdm.currency', 'mdm.theme', 'mdm.format', 'mdm.view', 'mdm.deckView', 'mdm.collView', 'mdm.kcView',
  'mdm.dailySeen', 'mdm.bansSeen', 'mdm.almostOff',
]
const TAG = '#mdm='

const b64 = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())

// { chiave: testo } → testo per il link ('z' compresso, 'j' se il browser non sa comprimere)
export async function pack(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  if (typeof CompressionStream === 'function') return 'z' + b64(await pipe(bytes, new CompressionStream('gzip')))
  return 'j' + b64(bytes)
}
export async function unpack(s) {
  let bytes = unb64(s.slice(1))
  if (s[0] === 'z') bytes = await pipe(bytes, new DecompressionStream('gzip'))
  else if (s[0] !== 'j') throw new Error('formato')
  return JSON.parse(new TextDecoder().decode(bytes))
}

// sul vecchio indirizzo: impacchetta e manda al nuovo (true = sta andando via, non disegnare niente)
export async function leaveOld() {
  if (location.hostname !== OLD_HOST) return false
  const data = {}
  try { for (const k of KEYS) { const v = localStorage.getItem(k); if (v != null) data[k] = v } } catch { /* archiviazione bloccata */ }
  let hash = ''
  try { if (Object.keys(data).length) hash = TAG + await pack(data) } catch { /* si va comunque */ }
  location.replace(NEW_SITE + location.pathname + location.search + hash)
  return true
}

// sul nuovo indirizzo: prende i dati arrivati nel link (solo le chiavi note e solo se qui mancano)
export async function arriveNew() {
  if (!location.hash.startsWith(TAG)) return
  try {
    const data = await unpack(location.hash.slice(TAG.length))
    for (const k of KEYS) if (typeof data[k] === 'string' && localStorage.getItem(k) == null) localStorage.setItem(k, data[k])
  } catch { /* link rovinato: si parte da vuoto */ }
  history.replaceState(history.state, '', location.pathname + location.search)
}
