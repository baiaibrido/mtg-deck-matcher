// Rifinitura (v0.39.1): nessun elemento deve uscire dallo schermo (360–1920 px). Serve il sito in anteprima su localhost:4174.
import { chromium } from 'playwright'
const b = await chromium.launch()
for (const w of [360, 390, 820, 1280, 1920]) for (const path of ['/pauper', '/pauper/deck/pauper-burn', '/pauper/collection', '/pauper/key-cards', '/pauper/meta', '/privacy']) {
  const m = w < 700
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, isMobile: m, hasTouch: m, serviceWorkers: 'block' })
  await ctx.addInitScript(() => { localStorage.setItem('mdm.lang', 'it'); localStorage.setItem('mdm.collection', JSON.stringify([{ name: 'Lightning Bolt', qty: 4 }, { name: 'Counterspell', qty: 2 }])) })
  const p = await ctx.newPage(); await p.goto('http://localhost:4174' + path); await p.waitForTimeout(1200)
  const r = await p.evaluate(() => { const W = innerWidth; const bad = [...document.querySelectorAll('main *')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width) return false; let x = e; while (x && x !== document.body) { const s = getComputedStyle(x); if (/auto|scroll|hidden|clip/.test(s.overflowX) && x !== e) return false; x = x.parentElement } return r.right > W + 1 || r.left < -1 }).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].join('.')).slice(0, 5); return [document.documentElement.scrollWidth - W, bad] })
  if (r[0] > 0 || r[1].length) console.log(w, path, JSON.stringify(r))
  await ctx.close()
}
await b.close(); console.log('fine')
