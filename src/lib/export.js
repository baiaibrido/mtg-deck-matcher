import { mergeEntries } from './normalize.js'

const merged = missing => mergeEntries(missing.map(r => ({ name: r.name, qty: r.missing })))

// Formato "1 Nome" — accettato da Scryfall (deck import) e TCGplayer Mass Entry.
export const toText = missing => merged(missing).map(r => `${r.qty} ${r.name}`).join('\n')

export const tcgplayerUrl = missing =>
  'https://www.tcgplayer.com/massentry?productline=Magic&c=' +
  merged(missing).map(r => encodeURIComponent(`${r.qty} ${r.name}`)).join('||')

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
