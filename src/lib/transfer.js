// Trasferimento della collezione su un altro dispositivo senza account: la lista va compressa
// dentro un link (#/import/<codice>). Testata in transfer.test.js.
const toB64 = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
const fromB64 = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)) }
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())

export async function encodeCollection(list) {
  const text = list.map(e => [e.qty, e.name, e.set || '', e.num || '', e.sid || ''].join('\t').replace(/\t+$/, '')).join('\n')
  return toB64(await pipe(new TextEncoder().encode(text), new CompressionStream('deflate-raw')))
}

export async function decodeCollection(code) {
  const text = new TextDecoder().decode(await pipe(fromB64(code), new DecompressionStream('deflate-raw')))
  return text.split('\n').map(l => {
    const [qty, name, set, num, sid] = l.split('\t')
    return { qty: Math.max(0, parseInt(qty, 10) || 0), name: (name || '').trim(), ...(set ? { set } : {}), ...(num ? { num } : {}), ...(sid ? { sid } : {}) }
  }).filter(e => e.name && e.qty > 0)
}
