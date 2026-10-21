import { mergeEntries } from './normalize.js'
import { isEuroMarket } from './currency.js'

const merged = missing => mergeEntries(missing.map(r => ({ name: r.name, qty: r.missing })))

// Formato "1 Nome" — accettato da Scryfall (deck import) e TCGplayer Mass Entry.
export const toText = missing => merged(missing).map(r => `${r.qty} ${r.name}`).join('\n')

export const tcgplayerUrl = missing =>
  'https://www.tcgplayer.com/massentry?productline=Magic&c=' +
  merged(missing).map(r => encodeURIComponent(`${r.qty} ${r.name}`)).join('||')

// Dove comprare le carte che mancano, secondo la valuta scelta (un indizio della zona, senza chiedere la posizione).
// Solo negozi che portano a una pagina utile: TCGplayer apre il carrello già pieno; Cardmarket non accetta una lista
// nell'indirizzo, quindi si copia la lista e si apre la lista desideri dove incollarla. Altrove (Brasile, Giappone…)
// i negozi locali non hanno un link così: resta «Copia lista».
const NO_STORE = new Set(['BRL', 'JPY'])
export function storeFor(cur, lang, missing) {
  if (isEuroMarket(cur)) return { name: 'Cardmarket', copy: true, url: `https://www.cardmarket.com/${['it', 'es', 'de', 'fr'].includes(lang) ? lang : 'en'}/Magic/Wants` }
  if (NO_STORE.has(cur)) return null
  return { name: 'TCGplayer', copy: false, url: tcgplayerUrl(missing) }
}

export function downloadTxt(filename, text, type = 'text/plain') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// Backup della collezione: CSV "Name,Qty,Set code,Collector number,Scryfall ID" che l'app stessa (e la maggior parte dei siti) sa rileggere
const q = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`
export const collectionCsv = list =>
  'Name,Qty,Set code,Collector number,Scryfall ID,Foil\n' + [...list].sort((a, b) => a.name.localeCompare(b.name) || (a.set || '').localeCompare(b.set || '') || !!a.foil - !!b.foil)
    .map(c => [q(c.name), c.qty, c.set || '', q(c.num), c.sid || '', c.foil ? 'foil' : ''].join(',')).join('\n') + '\n'
