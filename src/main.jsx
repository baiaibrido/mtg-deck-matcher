import { createRoot } from 'react-dom/client'
import '@fontsource/alegreya-sans/400.css'
import '@fontsource/alegreya-sans/500.css'
import '@fontsource/alegreya-sans/700.css'
import '@fontsource/alegreya-sans/800.css'
import '@fontsource-variable/doto' // carattere a punti (stampante ad aghi) della nuova grafica
import '@fontsource/caveat/latin-700.css' // solo per le note a penna
import './mana-cost.css' // simboli di mana ridotti (scripts/build-mana-subset.py)
import App from './App.jsx'
// Grafica «la classifica stampata»: un solo sistema (token → base → controlli → impaginazione → carta → pagine)
import './css/tokens.css'
import './css/base.css'
import './css/controls.css'
import './css/layout.css'
import './css/paper.css'
import './css/home.css'
import './css/deck.css'
import './css/collection.css'
import './css/keycards.css'
import './css/stats.css'
import './css/games.css'
import { getLang, loadLang } from './i18n/index.js'
// prima la lingua giusta, poi il disegno (niente lampo in italiano per chi legge in un'altra lingua)
loadLang(getLang()).catch(() => {}).finally(() => createRoot(document.getElementById('root')).render(<App />))

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
