// Verifica delle regole del sistema: controlli della stessa altezza, niente sbordi, titolo su una riga,
// primo mazzo visibile su 1280×600, finestre e menu dentro lo schermo, suggerimenti del gioco visibili.
import { chromium } from 'playwright'
import fs from 'fs'
const meta = JSON.parse(fs.readFileSync(new URL('../../public/meta/pauper.json', import.meta.url), 'utf8'))
const lines = id => { const d = meta.decks.find(x => x.id === id); return [...d.main, ...d.side].map(l => { const m = l.match(/^(\d+) (.+)$/); return { name: m[2], qty: +m[1] } }) }
const coll = [...lines('pauper-red-madness'), ...lines('pauper-burn').slice(0, 9), { name: 'Counterspell', qty: 4 }, { name: 'Snap', qty: 2, foil: true }]
const img = '<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680"><rect width="488" height="680" fill="#8a7a5a"/></svg>'
const VP = { usr: [1027, 566], lap: [1280, 600], desk: [1536, 750], tabP: [820, 1180], ph: [390, 844], phS: [360, 740] }
const issues = []
const b = await chromium.launch()
for (const [vp, [w, h]] of Object.entries(VP)) for (const withColl of [true, false]) {
  const m = w < 700
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, serviceWorkers: 'block', reducedMotion: 'reduce', locale: 'it-IT' })
  await ctx.route('https://api.scryfall.com/**', r => r.abort())
  await ctx.route('https://cards.scryfall.io/**', r => r.fulfill({ contentType: 'image/svg+xml', body: img }))
  await ctx.addInitScript(c => { localStorage.setItem('mdm.lang', 'it'); if (c) localStorage.setItem('mdm.collection', JSON.stringify(c)) }, withColl ? coll : null)
  const p = await ctx.newPage()
  p.on('pageerror', e => issues.push(`${vp} JS: ${e.message}`))
  const tagOf = u => `${vp}${withColl ? '' : ' (nuovo)'} ${u}`
  const go = async u => { await p.goto('http://localhost:4174' + u); await p.waitForTimeout(1500); await p.addStyleTag({ content: '.note-error{display:none!important}' }) }
  const pages = withColl ? ['/pauper', '/pauper/deck/pauper-burn', '/pauper/key-cards', '/collection', '/pauper/stats'] : ['/pauper', '/collection']
  for (const u of pages) {
    await go(u); const tag = tagOf(u)
    // 1. sbordi orizzontali
    const ov = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    if (ov) issues.push(`${tag}: la pagina scorre in orizzontale`)
    // 2. altezza dei controlli (40 con il mouse, 44 con le dita)
    const min = m ? 44 : 40
    const small = await p.evaluate(min => [...document.querySelectorAll('.btn, .picker-btn, .seg, .tabs > button, .theme-btn, .own-btn, .pin-btn-detail, .stepper, .switch, input[type=search], input:not([type]), .back')]
      .filter(e => e.offsetParent && !e.closest('.modal') && getComputedStyle(e).visibility !== 'hidden')
      .map(e => [e.className.toString().split(' ')[0] || e.tagName, Math.round(e.getBoundingClientRect().height), (e.textContent || '').trim().slice(0, 16)])
      .filter(([c, hh]) => hh && hh < min - (c === 'stepper' ? 10 : 0) - 0.5), min)
    if (small.length) issues.push(`${tag}: controlli bassi ${[...new Set(small.map(s => `${s[0]} ${s[1]}px «${s[2]}»`))].slice(0, 6).join(', ')}`)
    // 3. testo tagliato senza puntini
    const cut = await p.evaluate(() => [...document.querySelectorAll('button, a, h1, h2, h3, b, span, p, li, label')].filter(e => { const s = getComputedStyle(e); return !e.closest('.sr-only, .weather-word') && e.offsetParent && e.scrollWidth > e.clientWidth + 2 && s.overflowX === 'hidden' && s.textOverflow !== 'ellipsis' && e.clientWidth > 0 && !/-webkit-box/.test(s.display) }).map(e => e.className.toString().slice(0, 30) + ':' + e.textContent.slice(0, 20)).slice(0, 5))
    if (cut.length) issues.push(`${tag}: testo tagliato ${cut.join(' | ')}`)
    // 4. menu a tendina dentro lo schermo
    const nPk = await p.locator('.picker-btn:visible').count()
    for (let i = 0; i < nPk; i++) {
      const bt = p.locator('.picker-btn:visible').nth(i)
      await bt.scrollIntoViewIfNeeded(); await bt.click(); await p.waitForTimeout(200)
      const r = await p.evaluate(() => { const e = document.querySelector('.picker-list'); if (!e) return 'non si apre'; const r = e.getBoundingClientRect(); const bar = document.querySelector('.tabbar'); const bb = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().top : innerHeight; return r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > bb + 1 ? `fuori (${Math.round(r.top)}–${Math.round(r.bottom)})` : 'ok' })
      if (r !== 'ok') issues.push(`${tag}: menu #${i} ${r}`)
      await p.keyboard.press('Escape'); await p.waitForTimeout(80)
    }
    // 5. nuvolette dei "?"
    const nInfo = await p.locator('.info-btn:visible').count()
    for (let i = 0; i < nInfo; i++) {
      const bt = p.locator('.info-btn:visible').nth(i)
      await bt.scrollIntoViewIfNeeded(); m ? await bt.tap() : await bt.hover(); await p.waitForTimeout(220)
      const r = await p.evaluate(() => { const e = document.querySelector('.info-pop.on'); if (!e) return 'non compare'; const r = e.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight ? 'fuori schermo' : 'ok' })
      if (r !== 'ok') issues.push(`${tag}: «?» #${i} ${r}`)
      await p.mouse.click(2, Math.min(300, h - 100)); await p.waitForTimeout(80)
    }
  }
  // 6. home: titolo su una riga, l'ordine non sposta niente, primo mazzo visibile
  await go('/pauper')
  const geo = () => p.evaluate(() => { const t = document.querySelector('.home-title'), tools = document.querySelector('.home-tools'), first = document.querySelector('.decks > li'); return { th: t.getBoundingClientRect().height, fs: parseFloat(getComputedStyle(t).fontSize), toolsTop: Math.round(tools.getBoundingClientRect().top), toolsH: Math.round(tools.getBoundingClientRect().height), first: first && Math.round(first.getBoundingClientRect().bottom) } })
  const g0 = await geo()
  if (g0.th > g0.fs * 1.4) issues.push(`${tagOf('/pauper')}: titolo su più righe (${Math.round(g0.th)}px)`)
  if (vp === 'lap' || vp === 'usr') issues.push(`${tagOf('/pauper')}: info — fine del primo mazzo a ${g0.first}px su ${h}`)
  for (const k of await p.locator('.home-tools .seg-fill > button').all()) {
    await k.click(); await p.waitForTimeout(150); const g = await geo()
    if (Math.abs(g.th - g0.th) > 1 || g.toolsTop !== g0.toolsTop || g.toolsH !== g0.toolsH) issues.push(`${tagOf('/pauper')}: cambiando ordine la pagina si sposta (${JSON.stringify(g)})`)
  }
  // 7. gioco: i suggerimenti stanno dentro lo schermo
  await p.evaluate(() => scrollTo(0, 0))
  const items = p.locator('.today-item')
  if (await items.count() > 1) {
    await items.nth(1).scrollIntoViewIfNeeded(); await items.nth(1).click(); await p.waitForTimeout(700)
    const inp = p.locator('dialog[open] input').first()
    await inp.fill('o'); await p.waitForTimeout(300)
    const r = await p.evaluate(() => { const d = document.querySelector('dialog[open]'), l = document.querySelector('.guess-sugg'); if (!l) return 'nessun suggerimento'; const r = l.getBoundingClientRect(), dr = d.getBoundingClientRect(); const s = d.scrollHeight > d.clientHeight + 1 ? ' (la finestra scorre)' : ''; return (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth ? `fuori schermo ${Math.round(r.top)}–${Math.round(r.bottom)}` : 'ok') + s })
    if (r !== 'ok') issues.push(`${tagOf('gioco')}: suggerimenti ${r}`)
    await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(500)
    await items.nth(2).click(); await p.waitForTimeout(600)
    const q = await p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? (d.scrollHeight > d.clientHeight + 1 ? 'il quiz scorre dentro la finestra' : 'ok') : 'non si apre' })
    if (q !== 'ok') issues.push(`${tagOf('quiz')}: ${q}`)
    await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  }
  await ctx.close()
}
await b.close()
console.log(issues.join('\n') || 'nessun problema')
