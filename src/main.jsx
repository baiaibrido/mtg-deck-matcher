import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/marcellus/400.css'
import '@fontsource/alegreya-sans/400.css'
import '@fontsource/alegreya-sans/500.css'
import '@fontsource/alegreya-sans/700.css'
import 'mana-font/css/mana.min.css'
import App from './App.jsx'
import './styles.css'
createRoot(document.getElementById('root')).render(<App />)

// App installabile e offline (solo nella versione pubblicata)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
