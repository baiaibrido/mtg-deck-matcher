import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchCards, normalizeCollection } from './scryfall.js'

const card = name => ({ name, type_line: 'Enchantment — Aura', mana_cost: '{1}{G}', color_identity: ['G'], prices: {} })
const calls = []
globalThis.fetch = async (url, opt) => {
  calls.push(String(url))
  if (String(url).includes('/cards/collection')) {
    const ids = JSON.parse(opt.body).identifiers
    return { ok: true, json: async () => ({ data: ids.filter(i => ['Rancor', 'Armadillo Cloak'].includes(i.name)).map(i => card(i.name)), not_found: ids.filter(i => !['Rancor', 'Armadillo Cloak'].includes(i.name)) }) }
  }
  const q = decodeURIComponent(String(url).split('fuzzy=')[1])
  return q.toLowerCase() === 'armadillo cloack' ? { ok: true, json: async () => card('Armadillo Cloak') } : { ok: false }
}

test('Correggi i nomi funziona anche dopo che la collezione ha già cercato il nome sbagliato', async () => {
  // 1) caricamento immagini della collezione: il nome sbagliato finisce tra gli sconosciuti
  await fetchCards(['Armadillo Cloack', 'Rancor'])
  // 2) "Correggi i nomi": deve comunque provare la ricerca approssimata
  const { list, notFound } = await normalizeCollection([{ name: 'Armadillo Cloack', qty: 4 }, { name: 'Armadillo Cloak', qty: 1 }, { name: 'Rancor', qty: 2 }, { name: 'Boh Qualcosa', qty: 1 }])
  assert.deepEqual(list, [{ name: 'Armadillo Cloak', qty: 5 }, { name: 'Rancor', qty: 2 }, { name: 'Boh Qualcosa', qty: 1 }])
  assert.deepEqual(notFound, ['Boh Qualcosa'])
  assert.ok(calls.some(u => u.includes('fuzzy=Armadillo%20Cloack')))
})
