import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectLang } from './index.js'
import it from './it.js'
import en from './en.js'
import es from './es.js'
import pt from './pt.js'
import ja from './ja.js'

test('stesse chiavi in tutte le lingue', () => {
  const k = Object.keys(it).sort()
  for (const d of [en, es, pt, ja]) assert.deepEqual(Object.keys(d).sort(), k)
  for (const d of [it, en, es, pt, ja]) for (const key of k) assert.equal(typeof d[key], typeof it[key], key)
})

test('lingua di default: scelta salvata, indirizzo, dispositivo, fuso orario, inglese', () => {
  assert.equal(detectLang({ saved: 'es', languages: ['it-IT'] }), 'es')
  assert.equal(detectLang({ search: '?lang=it', languages: ['en-US'] }), 'it')
  assert.equal(detectLang({ languages: ['de-DE', 'es-MX', 'en'] }), 'es')
  assert.equal(detectLang({ languages: ['it-IT'] }), 'it')
  assert.equal(detectLang({ languages: ['de-DE'], timeZone: 'Europe/Rome' }), 'it')
  assert.equal(detectLang({ languages: ['fr-FR'], timeZone: 'America/Argentina/Buenos_Aires' }), 'es')
  assert.equal(detectLang({ languages: ['fr-FR'], timeZone: 'Europe/Paris' }), 'en')
  assert.equal(detectLang({ languages: ['pt-BR'] }), 'pt')
  assert.equal(detectLang({ languages: ['ja'] }), 'ja')
  assert.equal(detectLang({ languages: ['zh-CN'], timeZone: 'Asia/Tokyo' }), 'ja')
  assert.equal(detectLang({ languages: ['de'], timeZone: 'America/Sao_Paulo' }), 'pt')
  assert.equal(detectLang({ saved: 'xx', languages: [] }), 'en')
})
