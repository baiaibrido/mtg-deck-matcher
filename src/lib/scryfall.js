import { norm, mergeEntries } from './normalize.js'
import { closestName } from './closestName.js'

const API = 'https://api.scryfall.com'
const CK = 'mdm.cards.v3' // v3: formato compatto + prezzi
const MAX_AGE = 3 * 864e5   // i prezzi si aggiornano ogni 3 giorni
const IMG = 'https://cards.scryfall.io/normal/'
const HEAD = { Accept: 'application/json' }
const sleep = ms => new Promise(r => setTimeout(r, ms))

let cache
const getCache = () => cache ??= (() => { try { return JSON.parse(localStorage.getItem(CK)) || {} } catch { return {} } })()
const save = () => {
  try { localStorage.setItem(CK, JSON.stringify(cache)) }
  catch { // quota piena: tiene le 8000 carte più recenti
    try {
      const keep = Object.entries(cache).sort((a, b) => (b[1].t || 0) - (a[1].t || 0)).slice(0, 8000)
      cache = Object.fromEntries(keep); localStorage.setItem(CK, JSON.stringify(cache))
    } catch { /* ignora */ }
  }
}
try { localStorage.removeItem('mdm.cards.v2'); localStorage.removeItem('mdm.cards') } catch { /* vecchie cache */ }

// Formato compatto per stare comodi nei 5 MB di localStorage anche con migliaia di carte
const num = v => (v == null || v === '' ? null : +v)
const slim = c => {
  const f = c.card_faces?.[0]
  const img = (c.image_uris || f?.image_uris)?.normal || ''
  return {
    name: c.name.split(' // ')[0],
    i: img.startsWith(IMG) ? img.slice(IMG.length).split('?')[0] : img || null,
    ci: c.color_identity || [],
    type: (f?.type_line || c.type_line || '').split(' // ')[0],
    cost: f?.mana_cost ?? c.mana_cost ?? '',
    eur: num(c.prices?.eur) ?? num(c.prices?.eur_foil),
    usd: num(c.prices?.usd) ?? num(c.prices?.usd_foil),
    t: Date.now(),
  }
}
const expand = c => c && { ...c, img: c.i ? (c.i.startsWith('http') ? c.i : IMG + c.i) : null, uri: `https://scryfall.com/search?q=${encodeURIComponent(`!"${c.name}"`)}` }
const put = (c, key) => { const s = slim(c); getCache()[norm(s.name)] = s; if (key) getCache()[norm(key)] = s; return s }

const memo = new Map()
export const getCached = name => {
  const raw = getCache()[norm(name)]
  if (!raw) return undefined
  let e = memo.get(raw); if (!e) { e = expand(raw); memo.set(raw, e) }
  return e
}
const fresh = e => e && Date.now() - (e.t || 0) < MAX_AGE
const unknown = new Set() // nomi che Scryfall non riconosce: non li richiede di nuovo in questa sessione

// Scarica i dati mancanti in cache. 75 nomi per richiesta (limite Scryfall), poi fuzzy sui non trovati.
// I nomi già risultati sconosciuti vengono saltati, tranne con fuzzy: lì vanno dritti alla ricerca approssimata
// (prima venivano saltati anche lì, quindi "Correggi i nomi" diceva "tutto ok" senza correggere nulla).
const FUZZY_MAX = 150
export async function fetchCards(names, { fuzzy = false, onProgress } = {}) {
  const c = getCache()
  const missing = [...new Set(names.map(n => n.trim()))].filter(n => n && !fresh(c[norm(n)]))
  const want = missing.filter(n => !unknown.has(norm(n)))
  const notFound = fuzzy ? missing.filter(n => unknown.has(norm(n))) : []
  for (let i = 0; i < want.length; i += 75) {
    const chunk = want.slice(i, i + 75)
    const r = await fetch(`${API}/cards/collection`, {
      method: 'POST', headers: { ...HEAD, 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: chunk.map(name => ({ name })) }),
    })
    if (!r.ok) throw new Error(`Scryfall ${r.status}`)
    const j = await r.json()
    j.data.forEach(card => put(card))
    ;(j.not_found || []).forEach(nf => { notFound.push(nf.name); unknown.add(norm(nf.name)) })
    onProgress?.(Math.min(i + 75, want.length), want.length)
    save()
    await sleep(120)
  }
  if (!fuzzy) return { notFound }
  // 1) ricerca approssimata di Scryfall; 2) se non basta, confronto con l'elenco completo dei nomi
  const unresolved = [], suggestions = {}
  for (const [i, n] of notFound.entries()) {
    onProgress?.(i + 1, notFound.length)
    if (i >= FUZZY_MAX) { unresolved.push(n); continue }
    let r = await fetch(`${API}/cards/named?fuzzy=${encodeURIComponent(n)}`, { headers: HEAD })
    await sleep(110)
    if (!r.ok) {
      const { name, suggestions: s } = closestName(n, await cardNames())
      if (name) { r = await fetch(`${API}/cards/named?exact=${encodeURIComponent(name)}`, { headers: HEAD }); await sleep(110) }
      else if (s.length) suggestions[n] = s
    }
    if (r.ok) { put(await r.json(), n); unknown.delete(norm(n)) } else unresolved.push(n)
  }
  save()
  return { notFound: unresolved, suggestions }
}

// Elenco di tutti i nomi di carta (~35.000), scaricato solo se serve e tenuto in memoria per la sessione
let namesP
const cardNames = () => namesP ??= fetch(`${API}/catalog/card-names`, { headers: HEAD })
  .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status))).then(j => j.data || [])
  .catch(() => { namesP = null; return [] })

// Sostituisce i nomi con quelli ufficiali Scryfall e unisce i duplicati.
export async function normalizeCollection(list, onProgress) {
  const { notFound, suggestions } = await fetchCards(list.map(x => x.name), { fuzzy: true, onProgress })
  const fixed = list.map(x => ({ name: getCached(x.name)?.name || x.name, qty: x.qty }))
  return { list: mergeEntries(fixed), notFound, suggestions }
}

// Stessa immagine in formato piccolo (146px) per miniature e griglie
export const smallImg = url => url?.replace('/normal/', '/small/')
