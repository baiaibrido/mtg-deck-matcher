// Sitemap per Google: home dei formati, carte chiave, statistiche e la pagina di ogni mazzo.
// Si rigenera ogni notte dopo l'aggiornamento dei mazzi (sync-meta.mjs) → public/sitemap.xml
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

export const SITE = 'https://mtg-deck-matcher-mu.vercel.app'
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export function sitemapXml(formats, decksOf, today = new Date().toISOString().slice(0, 10)) {
  const urls = ['/collection']
  for (const { id } of formats) {
    urls.push(`/${id}`, `/${id}/key-cards`, `/${id}/stats`)
    for (const d of decksOf(id)) urls.push(`/${id}/deck/${encodeURIComponent(d.id)}`)
  }
  const body = urls.map(u => `  <url><loc>${esc(SITE + u)}</loc><lastmod>${today}</lastmod></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><lastmod>${today}</lastmod></url>\n${body}\n</urlset>\n`
}

export function writeSitemap(dir = 'public') {
  const { formats } = JSON.parse(readFileSync(`${dir}/meta/index.json`, 'utf8'))
  const decksOf = id => existsSync(`${dir}/meta/${id}.json`) ? JSON.parse(readFileSync(`${dir}/meta/${id}.json`, 'utf8')).decks || [] : []
  writeFileSync(`${dir}/sitemap.xml`, sitemapXml(formats, decksOf))
}

if (import.meta.url === `file://${process.argv[1]}`) writeSitemap()
