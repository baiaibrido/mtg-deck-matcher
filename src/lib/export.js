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

// Backup della collezione: CSV "Name,Qty" che l'app stessa (e la maggior parte dei siti) sa rileggere
export const collectionCsv = list =>
  'Name,Qty\n' + [...list].sort((a, b) => a.name.localeCompare(b.name)).map(c => `"${c.name.replace(/"/g, '""')}",${c.qty}`).join('\n') + '\n'
