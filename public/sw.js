// Service worker: app usabile offline con gli ultimi dati scaricati.
// - pagine e /meta/*.json: prima la rete, poi la copia salvata
// - file dell'app (/assets, con hash nel nome) e icone: prima la copia salvata
// - immagini delle carte Scryfall: copia salvata, massimo 600 immagini
const V = 'mdm-v1'
const SHELL = `${V}-shell`, DATA = `${V}-data`, IMG = `${V}-img`

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(V)).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})

const networkFirst = async (req, cacheName, fallbackUrl) => {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(fallbackUrl || req, res.clone())
    return res
  } catch {
    return (await cache.match(fallbackUrl || req)) || Response.error()
  }
}
const cacheFirst = async (req, cacheName, max) => {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok || res.type === 'opaque') {
    await cache.put(req, res.clone())
    if (max) cache.keys().then(k => k.length > max && Promise.all(k.slice(0, k.length - max).map(x => cache.delete(x))))
  }
  return res
}

self.addEventListener('fetch', e => {
  const { request: req } = e
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') return e.respondWith(networkFirst(req, SHELL, '/'))
    if (url.pathname.startsWith('/meta/')) return e.respondWith(networkFirst(req, DATA))
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) return e.respondWith(cacheFirst(req, SHELL))
    return
  }
  if (url.hostname === 'cards.scryfall.io') e.respondWith(cacheFirst(req, IMG, 600))
})
