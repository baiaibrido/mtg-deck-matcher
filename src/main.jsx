import { createRoot } from 'react-dom/client'
import '@fontsource/marcellus/400.css'
import '@fontsource/alegreya-sans/400.css'
import '@fontsource/alegreya-sans/500.css'
import '@fontsource/alegreya-sans/700.css'
import './mana-cost.css' // simboli di mana ridotti (scripts/build-mana-subset.py)
import App from './App.jsx'
import './styles.css'
createRoot(document.getElementById('root')).render(<App />)

// Tastiera su telefono: iOS non ridimensiona la pagina quando compare, quindi teniamo traccia
// della parte visibile (--vvh/--vvtop) e le finestre si spostano lì sopra (html.kb-open)
const vv = window.visualViewport
if (vv) {
  const root = document.documentElement
  const sync = () => {
    root.style.setProperty('--vvh', `${vv.height}px`); root.style.setProperty('--vvtop', `${vv.offsetTop}px`)
    root.classList.toggle('kb-open', root.clientHeight - vv.height > 120)
  }
  vv.addEventListener('resize', sync); vv.addEventListener('scroll', sync); sync()
}

// App installabile e offline (solo nella versione pubblicata)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
