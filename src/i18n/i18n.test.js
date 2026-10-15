import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectLang } from './index.js'
import it from './it.js'
import en from './en.js'
import es from './es.js'

test('stesse chiavi in tutte le lingue', () => {
  const k = Object.keys(it).sort()
  assert.deepEqual(Object.keys(en).sort(), k)
  assert.deepEqual(Object.keys(es).sort(), k)
  for (const d of [it, en, es]) for (const key of k) assert.equal(typeof d[key], typeof it[key], key)
})

test('lingua di default: scelta salvata, indirizzo, dispositivo, fuso orario, inglese', () => {
  assert.equal(detectLang({ saved: 'es', languages: ['it-IT'] }), 'es')
  assert.equal(detectLang({ search: '?lang=it', languages: ['en-US'] }), 'it')
  assert.equal(detectLang({ languages: ['de-DE', 'es-MX', 'en'] }), 'es')
  assert.equal(detectLang({ languages: ['it-IT'] }), 'it')
  assert.equal(detectLang({ languages: ['de-DE'], timeZone: 'Europe/Rome' }), 'it')
  assert.equal(detectLang({ languages: ['pt-BR'], timeZone: 'America/Argentina/Buenos_Aires' }), 'es')
  assert.equal(detectLang({ languages: ['fr-FR'], timeZone: 'Europe/Paris' }), 'en')
  assert.equal(detectLang({ saved: 'xx', languages: [] }), 'en')
})
