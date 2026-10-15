// Immagine 1080×1350 da condividere (Instagram, WhatsApp…): nome del mazzo, completamento e carta caratteristica.
const W = 1080, H = 1350
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim()
const loadImg = src => new Promise((ok, ko) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = ko; i.src = src; setTimeout(ko, 5000) }) // al massimo 5 s, poi senza immagine
const lines = (ctx, text, max) => {
  const out = []; let cur = ''
  for (const w of text.split(' ')) { const tryL = cur ? `${cur} ${w}` : w; if (ctx.measureText(tryL).width > max && cur) { out.push(cur); cur = w } else cur = tryL }
  return [...out, cur]
}
function draw(ctx, d, img) {
  const title = css('--font-title') || 'serif', ui = css('--font-ui') || 'sans-serif'
  const c1 = (/^var\((--[\w-]+)\)$/.exec(d.c1 || '')?.[1] ? css(/^var\((--[\w-]+)\)$/.exec(d.c1)[1]) : d.c1) || '#1d3238' // colore del mazzo (variabile CSS → valore)
  const g = ctx.createLinearGradient(0, 0, W, H); try { g.addColorStop(0, c1) } catch { g.addColorStop(0, '#1d3238') } g.addColorStop(.35, '#13252a'); g.addColorStop(1, '#0b1416')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = .55; ctx.fillStyle = '#0f1a1c'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1
  ctx.fillStyle = '#d4ad5a'; ctx.font = `700 30px ${ui}`; ctx.letterSpacing = '6px'; ctx.textAlign = 'center'
  ctx.fillText('NETDECKABLE', W / 2, 92); ctx.letterSpacing = '0px'
  let y = 150
  if (img) {
    const cw = 430, ch = cw * 680 / 488
    ctx.save(); ctx.translate(W / 2, y + ch / 2); ctx.rotate(-0.05)
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20
    ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 22); ctx.clip(); ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch); ctx.restore()
    y += ch + 90
  } else y = 560 // senza immagine il testo sta al centro
  ctx.fillStyle = '#f2ead8'; ctx.font = `86px ${title}`
  for (const l of lines(ctx, d.name, W - 140).slice(0, 2)) { ctx.fillText(l, W / 2, y); y += 96 }
  ctx.fillStyle = '#9fb0ab'; ctx.font = `36px ${ui}`; ctx.fillText(d.sub, W / 2, y); y += 78
  ctx.fillStyle = d.accent; ctx.font = `700 46px ${ui}`; ctx.fillText(d.line, W / 2, y)
  ctx.fillStyle = '#6f817c'; ctx.font = `30px ${ui}`; ctx.fillText('netdeckable.app', W / 2, H - 60)
}
export async function deckImage(d) {
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const ctx = canvas.getContext('2d')
  await document.fonts?.ready
  let img = null
  if (d.img) try { img = await loadImg(d.img) } catch { img = null }
  draw(ctx, d, img)
  const blob = await new Promise(ok => { try { canvas.toBlob(ok, 'image/png') } catch { ok(null) } })
  if (blob) return blob
  draw(ctx, d, null) // immagine della carta non utilizzabile (CORS): si rifà senza
  return new Promise(ok => canvas.toBlob(ok, 'image/png'))
}
export async function shareBlob(blob, filename, text) {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text }); return 'shared' } catch (e) { if (e?.name === 'AbortError') return 'cancel' } }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename })
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  return 'downloaded'
}
