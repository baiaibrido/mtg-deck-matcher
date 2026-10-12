import { norm, mergeEntries } from './normalize.js'

const API = 'https://api.scryfall.com'
const CK = 'mdm.cards.v2' // v2: aggiunti identità di colore, tipo e costo
const HEAD = { Accept: 'application/json' }
const sleep = ms => new Promise(r => setTimeout(r, ms))

let cache
const getCache = () => cache ??= (() => { try { return JSON.parse(localStorage.getItem(CK)) || {} } catch { return {} } })()
const save = () => { try { localStorage.setItem(CK, JSON.stringify(cache)) } catch { /* quota piena: ignora */ } }

const slim = c => {
  const f = c.card_faces?.[0]
  return {
    name: c.name.split(' // ')[0],
    img: (c.image_uris || f?.image_uris)?.normal,
    uri: c.scryfall_uri,
    ci: c.color_identity || [],
    type: (f?.type_line || c.type_line || '').split(' // ')[0],
    cost: f?.mana_cost ?? c.mana_cost ?? '',
  }
}
const put = (c, key) => { const s = slim(c); getCache()[norm(s.name)] = s; if (key) getCache()[norm(key)] = s; return s }

export const getCached = name => getCache()[norm(name)]

// Scarica i dati mancanti in cache. 75 nomi per richiesta (limite Scryfall), poi fuzzy sui non trovati.
export async function fetchCards(names, { fuzzy = false, onProgress } = {}) {
  const c = getCache()
  const want = [...new Set(names.map(n => n.trim()))].filter(n => n && !c[norm(n)])
  const notFound = []
  for (let i = 0; i < want.length; i += 75) {
    const chunk = want.slice(i, i + 75)
    const r = await fetch(`${API}/cards/collection`, {
      method: 'POST', headers: { ...HEAD, 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: chunk.map(name => ({ name })) }),
    })
    if (!r.ok) throw new Error(`Scryfall ${r.status}`)
    const j = await r.json()
    j.data.forEach(card => put(card))
    ;(j.not_found || []).forEach(nf => notFound.push(nf.name))
    onProgress?.(Math.min(i + 75, want.length), want.length)
    save()
    await sleep(120)
  }
  const unresolved = []
  if (fuzzy) {
    for (const n of notFound.slice(0, 40)) {
      const r = await fetch(`${API}/cards/named?fuzzy=${encodeURIComponent(n)}`, { headers: HEAD })
      if (r.ok) put(await r.json(), n); else unresolved.push(n)
      await sleep(110)
    }
    unresolved.push(...notFound.slice(40))
  }
  save()
  return { notFound: fuzzy ? unresolved : notFound }
}

// Sostituisce i nomi con quelli ufficiali Scryfall e unisce i duplicati.
export async function normalizeCollection(list, onProgress) {
  const { notFound } = await fetchCards(list.map(x => x.name), { fuzzy: true, onProgress })
  const fixed = list.map(x => ({ name: getCached(x.name)?.name || x.name, qty: x.qty }))
  return { list: mergeEntries(fixed), notFound }
}
