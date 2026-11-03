import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sitemapXml, SITE } from './sitemap.mjs'

test('sitemap: formati, pagine e mazzi con indirizzi codificati', () => {
  const xml = sitemapXml([{ id: 'pauper' }], () => [{ id: 'pauper-red madness' }], '2026-10-19')
  assert.match(xml, new RegExp(`<loc>${SITE}/pauper</loc>`))
  assert.match(xml, /\/pauper\/deck\/pauper-red%20madness</)
  assert.match(xml, /\/pauper\/stats</)
  assert.match(xml, /<lastmod>2026-10-19<\/lastmod>/)
})
