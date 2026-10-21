// Stati meno frequenti: node extras.mjs <cartella> [viewport,...] [temi]
import { chromium } from 'playwright'
import fs from 'fs'
const out = process.argv[2] || 'extra'
const vps = (process.argv[3] || 'lap,ph').split(',')
const themes = (process.argv[4] || 'dark').split(',')
fs.mkdirSync(out, { recursive: true })
const VP = { usr: [1027, 566], lap: [1280, 600], desk: [1536, 750], tabP: [820, 1180], ph: [390, 844], phS: [360, 740] }
const meta = JSON.parse(fs.readFileSync(new URL('../../public/meta/pauper.json', import.meta.url), 'utf8'))
const lines = id => { const d = meta.decks.find(x => x.id === id); return [...d.main, ...d.side].map(l => { const m = l.match(/^(\d+) (.+)$/); return { name: m[2], qty: +m[1] } }) }
// collezione con un mazzo quasi completo (per «Ci sei quasi»), foil e qualche carta bannata
const almost = lines('pauper-burn').map((c, i) => i === 0 ? { ...c, qty: Math.max(0, c.qty - 2) } : c).filter(c => c.qty)
const coll = [...lines('pauper-red-madness'), ...almost, { name: 'Counterspell', qty: 4 }, { name: 'Gush', qty: 4 }, { name: 'Lightning Bolt', qty: 1, foil: true }, { name: 'Pendelhaven', qty: 1 }]
const hue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
const img = u => { const h = hue(u); return `<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680"><rect width="488" height="680" rx="22" fill="#15171a"/><rect x="18" y="18" width="452" height="644" rx="14" fill="hsl(${h},28%,62%)"/><rect x="34" y="80" width="420" height="300" fill="hsl(${(h + 40) % 360},45%,42%)"/><rect x="34" y="426" width="420" height="210" rx="6" fill="hsl(${h},25%,90%)"/></svg>` }
const b = await chromium.launch()
for (const vp of vps) for (const th of themes) {
  const [w, h] = VP[vp], m = w < 700
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, serviceWorkers: 'block', reducedMotion: 'reduce', locale: 'it-IT' })
  await ctx.route('https://api.scryfall.com/**', r => r.abort())
  await ctx.route('https://cards.scryfall.io/**', r => r.fulfill({ contentType: 'image/svg+xml', body: img(r.request().url()) }))
  await ctx.addInitScript(([c, t]) => { localStorage.setItem('mdm.lang', 'it'); localStorage.setItem('mdm.theme', JSON.stringify(t)); localStorage.setItem('mdm.collection', JSON.stringify(c)); localStorage.setItem('mdm.backup', JSON.stringify({ changes: 12 })) }, [coll, th])
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', vp, e.message))
  const S = async n => { await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${vp}-${th}-${n}.png` }) }
  const go = async u => { await p.goto('http://localhost:4174' + u); await p.waitForTimeout(1500); await p.addStyleTag({ content: '.note-error{display:none!important}' }) }
  // home: menu Budget aperto, «?» del tier aperto
  await go('/pauper'); await S('home-almost')
  if (m) await p.locator('.filters-toggle').click()
  await p.locator('.filters .picker-btn').first().click(); await S('picker-open'); await p.keyboard.press('Escape')
  const info = p.locator('.filters .info-btn').first(); m ? await info.tap() : await info.hover(); await S('info-open'); await p.mouse.click(2, 300)
  // collezione: elenco, conferma «Svuota», pannello aggiungi
  await go('/collection'); await p.locator('.seg-icons button').first().click(); await p.locator('.binder-sec').first().scrollIntoViewIfNeeded(); await p.evaluate(() => scrollBy(0, -80)); await S('coll-list')
  await p.evaluate(() => scrollTo(0, 0)); await p.locator('.coll-actions .btn-danger').click(); await S('coll-confirm')
  await go('/collection'); await p.locator('.page-head-row .btn-primary').click(); await S('coll-add')
  // carte chiave a immagini
  await go('/pauper/key-cards'); await p.locator('.seg-icons button').nth(1).click(); await S('kc-cards')
  // mazzo rogue e mazzo con ban
  const rogueId = meta.rogue?.[0]?.id
  if (rogueId) { await go('/pauper/deck/' + rogueId); await S('deck-rogue') }
  // quiz fino al risultato
  await go('/pauper')
  const items = p.locator('.today-item')
  await items.nth(2).click(); await p.waitForTimeout(600)
  for (let i = 0; i < 5; i++) { await p.locator('dialog[open] .quiz-opt').first().click(); await p.waitForTimeout(250) }
  await S('quiz-result'); await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  // indovina: sei tentativi sbagliati
  await items.nth(1).click(); await p.waitForTimeout(600)
  for (let i = 0; i < 6; i++) { const inp = p.locator('dialog[open] input'); if (!await inp.count()) break; await inp.fill('a'); await p.waitForTimeout(150); await p.locator('.guess-sugg li').nth(i + 1).click().catch(() => {}); await p.waitForTimeout(200) }
  await S('guess-done')
  await ctx.close()
}
await b.close()
