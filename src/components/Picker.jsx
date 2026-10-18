import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCaret, IconCheck } from './Icons.jsx'

// Menu a tendina su misura (al posto del <select> del sistema, che non si può arrotondare):
// pulsante con icona/valore e lista a comparsa nello stile del sito. Tastiera: frecce, Invio, Esc, Home/Fine.
export default function Picker({ value, options, onChange, label, icon, short, align = 'left', className = '' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState(null) // la lista sta in <body> (position: fixed) per non essere tagliata dall'header
  const root = useRef(null), btn = useRef(null), list = useRef(null)
  const id = useId()
  const idx = Math.max(0, options.findIndex(o => o.value === value))
  const cur = options[idx]

  useEffect(() => {
    if (!open) return
    const out = e => { if (!root.current?.contains(e.target) && !list.current?.contains(e.target)) setOpen(false) }
    const close = e => { if (!list.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', out)
    addEventListener('scroll', close, true); addEventListener('resize', close)
    list.current?.focus({ preventScroll: true })
    return () => { document.removeEventListener('pointerdown', out); removeEventListener('scroll', close, true); removeEventListener('resize', close) }
  }, [open])
  useEffect(() => { if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' }) }, [open, active])

  const show = () => {
    const r = btn.current.getBoundingClientRect()
    // sotto c'è poco spazio (fondo schermo, barra in basso del telefono)? la lista si apre verso l'alto
    const bar = document.querySelector('.tabbar')?.getBoundingClientRect().height || 0
    const vh = window.visualViewport?.height || innerHeight
    const below = vh - bar - r.bottom - 12, above = r.top - 12
    const up = below < Math.min(240, options.length * 42 + 14) && above > below
    const room = Math.max(120, Math.min(340, (up ? above : below) - 6))
    setPos({ ...(up ? { bottom: innerHeight - r.top + 6 } : { top: r.bottom + 6 }), maxHeight: room, minWidth: r.width,
      ...(align === 'right' ? { right: document.documentElement.clientWidth - r.right } : { left: r.left }) })
    setActive(idx); setOpen(true)
  }
  const pick = i => { setOpen(false); btn.current?.focus(); if (options[i].value !== value) onChange(options[i].value) }
  const onListKey = e => {
    const n = options.length
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % n) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + n) % n) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(n - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.current?.focus() }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <span className={`picker ${className}`} ref={root}>
      <button ref={btn} type="button" className="picker-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label ? `${label}: ${cur?.label}` : undefined}
        title={label} onClick={() => open ? setOpen(false) : show()}
        onKeyDown={e => { if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); show() } }}>
        {icon}
        <span className="picker-val">{short ? (cur?.short ?? cur?.label) : cur?.label}</span>
        <IconCaret size={16} className="picker-caret" />
      </button>
      {open && createPortal(
        <ul ref={list} className="picker-list" style={pos} role="listbox" tabIndex={-1} aria-label={label}
          aria-activedescendant={`${id}-${active}`} onKeyDown={onListKey}>
          {options.map((o, i) => (
            <li key={o.value} id={`${id}-${i}`} role="option" aria-selected={o.value === value} lang={o.lang}
              className={i === active ? 'active' : ''} onPointerEnter={() => setActive(i)} onClick={() => pick(i)}>
              <span>{o.label}</span>{o.value === value && <IconCheck size={16} />}
            </li>
          ))}
        </ul>, document.body
      )}
    </span>
  )
}
