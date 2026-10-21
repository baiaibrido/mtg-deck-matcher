// Fotografa il sito su più schermi, temi e stati. Uso: node matrix.mjs <cartella> [solo-viewport,..] [temi]
import { chromium } from 'playwright'
import fs from 'fs'
const out = process.argv[2] || 'base'
const only = process.argv[3] ? process.argv[3].split(',') : null
const themes = process.argv[4] ? process.argv[4].split(',') : ['dark', 'light']
fs.mkdirSync(out, { recursive: true })
const VP = {
  usr: [1027, 566], lap: [1280, 600], lap2: [1366, 657], desk: [1536, 750], big: [1920, 960],
  tabP: [820, 1180], tabL: [1180, 820], ph: [390, 844], phS: [360, 740],
}
const meta = JSON.parse(fs.readFileSync(new URL('../../public/meta/pauper.json', import.meta.url), 'utf8'))
const lines = id => { const d = meta.decks.find(x => x.id === id); return [...d.main, ...d.side].map(l => { const m = l.match(/^(\d+) (.+)$/); return { name: m[2], qty: +m[1] } }) }
// collezione realistica (~250 carte): Red Madness completo, metà Burn, un po' di altro, qualche foil
const coll = [...lines('pauper-red-madness'), ...lines('pauper-burn').slice(0, 9),
  { name: 'Counterspell', qty: 4 }, { name: 'Ponder', qty: 4 }, { name: 'Preordain', qty: 3 }, { name: 'Gush', qty: 2 }, { name: 'Brainstorm', qty: 4 },
  { name: 'Lightning Bolt', qty: 1, foil: true }, { name: 'Snap', qty: 2, foil: true }, { name: 'Pendelhaven', qty: 1 }, { name: 'Ash Barrens', qty: 4 }]
// immagini finte ma credibili: cornice, arte colorata diversa per ogni carta, box del testo
const hue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
const img = u => { const h = hue(u); return `<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680"><rect width="488" height="680" rx="22" fill="#15171a"/><rect x="18" y="18" width="452" height="644" rx="14" fill="hsl(${h},28%,62%)"/><rect x="34" y="32" width="420" height="40" rx="6" fill="hsl(${h},20%,86%)"/><rect x="34" y="80" width="420" height="300" fill="hsl(${(h + 40) % 360},45%,42%)"/><circle cx="${150 + h % 180}" cy="230" r="70" fill="hsl(${(h + 180) % 360},55%,60%)" opacity=".8"/><rect x="34" y="388" width="420" height="30" rx="4" fill="hsl(${h},20%,86%)"/><rect x="34" y="426" width="420" height="210" rx="6" fill="hsl(${h},25%,90%)"/></svg>` }
const b = await chromium.launch()
async function ctxFor(vp, th, withColl = true) {
  const [w, h] = VP[vp], m = w < 700
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, serviceWorkers: 'block', reducedMotion: 'reduce', locale: 'it-IT' })
  await ctx.route('https://api.scryfall.com/**', r => r.abort())
  await ctx.route('https://cards.scryfall.io/**', r => r.fulfill({ contentType: 'image/svg+xml', body: img(r.request().url()) }))
  await ctx.addInitScript(([c, t]) => { localStorage.setItem('mdm.lang', 'it'); localStorage.setItem('mdm.theme', JSON.stringify(t)); if (c) localStorage.setItem('mdm.collection', JSON.stringify(c)); localStorage.setItem('mdm.pins', '["pauper-mono-blue-terror"]'); localStorage.setItem('mdm.dailySeen', '{}') }, [withColl ? coll : null, th])
  return ctx
}
const shotsFor = async (vp, th) => {
  const m = VP[vp][0] < 700
  const ctx = await ctxFor(vp, th)
  const p = await ctx.newPage()
  p.on('pageerror', e => console.log('ERR', vp, e.message))
  const S = async n => { await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${vp}-${th}-${n}.png` }) }
  const go = async u => { await p.goto('http://localhost:4174' + u); await p.waitForTimeout(1600); await p.addStyleTag({ content: '.note-error{display:none!important}' }) }
  await go('/pauper'); await S('home')
  await p.screenshot({ path: `${out}/${vp}-${th}-home-full.png`, fullPage: true })
  if (m) { const f = p.locator('.filters-toggle'); if (await f.count()) { await f.click(); await S('home-filters') } }
  await go('/pauper/deck/pauper-red-madness'); await S('deck')
  await p.evaluate(() => scrollTo(0, innerHeight * .9)); await S('deck-2')
  await p.locator('.tabs-deck [role=tab]').nth(1).click(); await p.waitForTimeout(300); await p.evaluate(() => scrollTo(0, 0)); await S('deck-need')
  await go('/pauper/deck/pauper-burn'); await p.locator('.tabs-deck [role=tab]').nth(1).click(); await p.waitForTimeout(300); await p.locator('.receipt').scrollIntoViewIfNeeded().catch(() => {}); await S('receipt')
  await go('/pauper/key-cards'); await S('keycards')
  await go('/collection'); await S('coll')
  await p.locator('.binder-sec').first().scrollIntoViewIfNeeded().catch(() => {}); await p.evaluate(() => scrollBy(0, -60)); await S('coll-grid')
  await p.locator('.more-btn').click().catch(() => {}); await S('coll-filters')
  await go('/pauper/stats'); await S('stats')
  // giochi
  await go('/pauper')
  const items = p.locator('.today-item')
  if (await items.count() > 1) {
    await items.nth(1).click(); await p.waitForTimeout(700); await S('guess')
    const inp = p.locator('dialog[open] input').first()
    if (await inp.count()) { await inp.fill('mon'); await p.waitForTimeout(400); await S('guess-typing'); await p.keyboard.press('Escape') }
    await p.keyboard.press('Escape'); await p.waitForTimeout(600)
    await items.nth(2).click(); await p.waitForTimeout(700); await S('quiz')
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  }
  await ctx.close()
  // nuovo utente senza collezione
  const c2 = await ctxFor(vp, th, false); const q = await c2.newPage()
  await q.goto('http://localhost:4174/pauper'); await q.waitForTimeout(1600); await q.screenshot({ path: `${out}/${vp}-${th}-new.png` })
  await q.goto('http://localhost:4174/collection'); await q.waitForTimeout(1200); await q.screenshot({ path: `${out}/${vp}-${th}-coll-empty.png` })
  await c2.close()
}
for (const vp of Object.keys(VP)) {
  if (only && !only.includes(vp)) continue
  for (const th of themes) { await shotsFor(vp, th); console.log('ok', vp, th) }
}
await b.close()
