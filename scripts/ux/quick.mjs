// Foto veloci: node quick.mjs <cartella> <percorso> <viewport,...> [temi] [nuovo]
import { chromium } from 'playwright'
import fs from 'fs'
const [out = 'q', path = '/pauper', vps = 'lap', ths = 'dark', fresh] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const VP = { usr: [1027, 566], lap: [1280, 600], lap2: [1366, 657], desk: [1536, 750], big: [1920, 960], tabP: [820, 1180], tabL: [1180, 820], ph: [390, 844], phS: [360, 740] }
const meta = JSON.parse(fs.readFileSync(new URL('../../public/meta/pauper.json', import.meta.url), 'utf8'))
const lines = id => { const d = meta.decks.find(x => x.id === id); return [...d.main, ...d.side].map(l => { const m = l.match(/^(\d+) (.+)$/); return { name: m[2], qty: +m[1] } }) }
const coll = [...lines('pauper-red-madness'), ...lines('pauper-burn').slice(0, 9), { name: 'Counterspell', qty: 4 }, { name: 'Ponder', qty: 4 }, { name: 'Lightning Bolt', qty: 1, foil: true }, { name: 'Snap', qty: 2, foil: true }, { name: 'Pendelhaven', qty: 1 }]
const hue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
const img = u => { const h = hue(u); return `<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680"><rect width="488" height="680" rx="22" fill="#15171a"/><rect x="18" y="18" width="452" height="644" rx="14" fill="hsl(${h},28%,62%)"/><rect x="34" y="80" width="420" height="300" fill="hsl(${(h + 40) % 360},45%,42%)"/><rect x="34" y="426" width="420" height="210" rx="6" fill="hsl(${h},25%,90%)"/></svg>` }
const b = await chromium.launch()
for (const vp of vps.split(',')) for (const th of ths.split(',')) {
  const [w, h] = VP[vp], m = w < 700
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, serviceWorkers: 'block', reducedMotion: 'reduce', locale: 'it-IT' })
  await ctx.route('https://api.scryfall.com/**', r => r.abort())
  await ctx.route('https://cards.scryfall.io/**', r => r.fulfill({ contentType: 'image/svg+xml', body: img(r.request().url()) }))
  await ctx.addInitScript(([c, t, l]) => { localStorage.setItem('mdm.lang', l); localStorage.setItem('mdm.theme', JSON.stringify(t)); if (c) { localStorage.setItem('mdm.collection', JSON.stringify(c)); localStorage.setItem('mdm.pins', '["pauper-mono-blue-terror"]') } }, [fresh ? null : coll, th, process.env.QLANG || 'it'])
  const p = await ctx.newPage(); p.on('pageerror', e => console.log('ERR', e.message))
  await p.goto('http://localhost:4174' + path); await p.waitForTimeout(1500)
  await p.addStyleTag({ content: '.note-error{display:none!important} .toast-zone{display:none!important}' })
  await p.waitForTimeout(200)
  await p.screenshot({ path: `${out}/${vp}-${th}${process.env.QLANG ? '-' + process.env.QLANG : ''}${path.replace(/\//g, '_')}${fresh ? '-new' : ''}.png` })
  await ctx.close()
}
await b.close()
