import { useEffect, useRef } from 'react'
import { t } from '../i18n/index.js'

// Finestra centrata (elemento <dialog>: tastiera, Esc e focus gestiti dal browser), con chiusura animata
export default function Modal({ open, onClose, label, children, className = '' }) {
  // downOnBackdrop: si chiude toccando fuori solo se il tocco è iniziato fuori (se la finestra
  // cambia altezza a metà tocco, es. compare la tastiera, non si chiude per sbaglio)
  const ref = useRef(null), downOnBackdrop = useRef(false)
  useEffect(() => {
    const d = ref.current; if (!d) return
    if (open && !d.open) { d.showModal(); document.documentElement.classList.add('modal-open') }
    if (!open && d.open) d.close()
    return () => document.documentElement.classList.remove('modal-open')
  }, [open])
  // tasto "indietro" del telefono: chiude la finestra invece di cambiare pagina
  const byBack = useRef(false)
  useEffect(() => {
    if (!open) return
    history.pushState({ ...(history.state || {}), modal: true }, '')
    const onPop = () => { byBack.current = true; close() }
    addEventListener('popstate', onPop)
    return () => {
      removeEventListener('popstate', onPop)
      if (!byBack.current && history.state?.modal) history.back()
      byBack.current = false
    }
  }, [open])
  const close = () => {
    const d = ref.current
    if (!d || matchMedia('(prefers-reduced-motion: reduce)').matches) return onClose()
    d.classList.add('closing'); setTimeout(() => { d.classList.remove('closing'); onClose() }, 260)
  }
  return (
    <dialog ref={ref} className={`modal ${className}`} aria-label={label}
      onCancel={e => { e.preventDefault(); close() }}
      onPointerDown={e => { downOnBackdrop.current = e.target === ref.current }}
      onClick={e => { if (e.target === ref.current && downOnBackdrop.current) close(); downOnBackdrop.current = false }}>
      {open && <div className="modal-body">
        <button className="modal-x" onClick={close} aria-label={t('close')} title={t('close')}>×</button>
        {children(close)}
      </div>}
    </dialog>
  )
}
