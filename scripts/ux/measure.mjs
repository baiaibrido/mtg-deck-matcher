// Rifinitura (v0.39.1): misura distanze, margini interni, celle con vuoto e bordi quasi allineati. Serve il sito in anteprima su localhost:4174.
// node measure.mjs <path> <width> [fresh] → elenco di distanze fuori scala, bordi interni asimmetrici, allineamenti mancati, celle vuote
import { chromium } from 'playwright'
import fs from 'fs'
const [path, w = '1280', fresh] = process.argv.slice(2)
const meta = JSON.parse(fs.readFileSync(new URL('../../public/meta/pauper.json', import.meta.url), 'utf8'))
const lines = id => { const d = meta.decks.find(x => x.id === id); return [...d.main, ...d.side].map(l => { const m = l.match(/^(\d+) (.+)$/); return { name: m[2], qty: +m[1] } }) }
const coll = [...lines('pauper-red-madness'), ...lines('pauper-burn').slice(0, 9), { name: 'Counterspell', qty: 4 }, { name: 'Ponder', qty: 4 }, { name: 'Lightning Bolt', qty: 1, foil: true }]
const b = await chromium.launch()
const m = +w < 700
const ctx = await b.newContext({ viewport: { width: +w, height: m ? 844 : 950 }, isMobile: m, hasTouch: m, serviceWorkers: 'block', reducedMotion: 'reduce' })
await ctx.route('https://api.scryfall.com/**', r => r.abort())
await ctx.addInitScript(c => { localStorage.setItem('mdm.lang', 'it'); if (c) { localStorage.setItem('mdm.collection', JSON.stringify(c)); localStorage.setItem('mdm.pins', '["pauper-mono-blue-terror"]') } }, fresh ? null : coll)
const p = await ctx.newPage()
await p.goto('http://localhost:4174' + path); await p.waitForTimeout(1800)
const out = await p.evaluate(() => {
  const SCALE = [0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64]
  const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed' || s.position === 'absolute') return false; const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 }
  const name = e => { let n = e.tagName.toLowerCase(); if (e.classList.length) n += '.' + [...e.classList].slice(0, 2).join('.'); return n }
  const path = e => { const a = []; let x = e; for (let i = 0; i < 3 && x && x !== document.body; i++) { a.unshift(name(x)); x = x.parentElement } return a.join(' > ') }
  const root = document.querySelector('main') || document.body
  const kidsOf = e => [...e.children].flatMap(k => getComputedStyle(k).display === 'contents' ? kidsOf(k) : [k])
  const res = { gaps: [], insets: [], voids: [], edges: [] }
  // 1) distanze verticali tra fratelli impilati
  for (const parent of root.querySelectorAll('*')) {
    const kids = [...parent.children].filter(vis)
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1].getBoundingClientRect(), c = kids[i].getBoundingClientRect()
      if (c.top < a.bottom - 1) continue // non impilati
      if (Math.abs(c.left - a.left) > 40 && Math.abs(c.right - a.right) > 40) continue
      const g = Math.round(c.top - a.bottom)
      if (g > 80) continue
      res.gaps.push([path(parent), name(kids[i - 1]) + ' → ' + name(kids[i]), g])
    }
  }
  // 2) margini interni dei contenitori con bordo o fondo
  for (const e of root.querySelectorAll('*')) {
    if (!vis(e)) continue
    const s = getComputedStyle(e)
    const boxed = (parseFloat(s.borderTopWidth) + parseFloat(s.borderBottomWidth) + parseFloat(s.borderLeftWidth) > 0 && s.borderStyle !== 'none') || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || s.maskImage !== 'none' || s.webkitMaskImage !== 'none'
    if (!boxed) continue
    const r = e.getBoundingClientRect(); if (r.height < 30 || r.width < 60) continue
    if (['BUTTON', 'INPUT', 'IMG', 'A', 'SELECT', 'TEXTAREA', 'I', 'svg', 'LABEL'].includes(e.tagName)) continue
    const kids = [...e.querySelectorAll('*')].filter(k => vis(k) && k.children.length === 0 || (vis(k) && k.matches('svg,img,button,input')))
    if (!kids.length) continue
    let t = 1e9, bt = -1e9, l = 1e9, rr = -1e9
    for (const k of kids) { const q = k.getBoundingClientRect(); if (q.width < 1 || q.height < 1) continue; t = Math.min(t, q.top); bt = Math.max(bt, q.bottom); l = Math.min(l, q.left); rr = Math.max(rr, q.right) }
    res.insets.push([path(e), Math.round(t - r.top), Math.round(r.bottom - bt), Math.round(l - r.left), Math.round(r.right - rr), Math.round(r.height)])
  }
  // 3) celle affiancate (righe di griglia/flex) con contenuto molto più basso della cella
  for (const parent of root.querySelectorAll('*')) {
    const s = getComputedStyle(parent); if (!/grid|flex/.test(s.display)) continue
    const kids = kidsOf(parent).filter(vis); if (kids.length < 2) continue
    const rs = kids.map(k => k.getBoundingClientRect())
    const row = rs.map((r, i) => i).filter(i => rs.filter(q => Math.abs(q.top - rs[i].top) < 4 && Math.abs(q.bottom - rs[i].bottom) < 4).length >= 2); if (!row.length) continue
    kids.forEach((k, i) => {
      if (!row.includes(i)) return
      const inner = [...k.querySelectorAll('*')].filter(x => vis(x) && x.children.length === 0)
      if (!inner.length || rs[i].height < 60) return
      const bt = Math.max(...inner.map(x => x.getBoundingClientRect().bottom)), tp = Math.min(...inner.map(x => x.getBoundingClientRect().top))
      const voidB = rs[i].bottom - bt, voidT = tp - rs[i].top
      if (voidB - voidT > 24) res.voids.push([path(k), Math.round(voidT), Math.round(voidB), Math.round(rs[i].height)])
    })
  }
  // 4) bordi sinistri quasi allineati (1–5 px) tra blocchi di testo vicini
  const texts = [...root.querySelectorAll('h1,h2,h3,p,li,label,.field,.toolbar,.list-meta,header,section,ul,ol,figure,table,.panel,.seg,.tabs,.search')].filter(vis).map(e => [e, e.getBoundingClientRect()])
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const [ea, a] = texts[i], [eb, c] = texts[j]
    if (ea.contains(eb) || eb.contains(ea)) continue
    if (Math.abs(c.top - a.bottom) > 60 && Math.abs(a.top - c.bottom) > 60) continue
    const d = Math.abs(a.left - c.left)
    if (d >= 1.5 && d <= 6) res.edges.push([path(ea), path(eb), Math.round(a.left), Math.round(c.left)])
  }
  return res
})
await b.close()
const SC = new Set([0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64])
const agg = new Map()
for (const [par, pair, g] of out.gaps) { const k = pair; if (!agg.has(k)) agg.set(k, new Map()); const mm = agg.get(k); mm.set(g, (mm.get(g) || 0) + 1) }
console.log(`### ${path} @${w}${fresh ? ' (nuovo)' : ''}`)
console.log('— distanze fuori scala o incoerenti (coppia: valori×volte)')
for (const [k, mm] of agg) { const vals = [...mm.keys()]; const off = vals.filter(v => !SC.has(Math.abs(v))); if (off.length || vals.length > 1) console.log('  ', k, ':', [...mm].map(([v, n]) => `${v}${n > 1 ? '×' + n : ''}`).join(' '), off.length ? '  ⚠ fuori scala' : '') }
console.log('— margini interni (alto basso sx dx | altezza): asimmetrici o fuori scala')
const seen = new Set()
for (const [pth, t, bt, l, r, h] of out.insets) { const k = pth + t + bt + l + r; if (seen.has(k)) continue; seen.add(k); if (Math.abs(t - bt) > 6 || Math.abs(l - r) > 8) console.log('  ', pth, `| ${t} ${bt} ${l} ${r} | ${h}`) }
console.log('— celle con vuoto in basso (alto/basso/altezza)')
const sv = new Set(); for (const v of out.voids) { const k = v.join(); if (!sv.has(k)) { sv.add(k); console.log('  ', ...v) } }
console.log('— bordi sinistri quasi allineati')
const se = new Set(); for (const e of out.edges.slice(0, 40)) { const k = e.join(); if (!se.has(k)) { se.add(k); console.log('  ', e[0], '|', e[1], e[2], e[3]) } }
