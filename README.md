# Netdeckable

App web che confronta la tua collezione di Magic: The Gathering con i mazzi del meta di ogni formato: mostra quali mazzi sei più vicino a completare, cosa ti manca e quanto costa.

React + Vite, solo frontend, installabile come PWA. I mazzi meta in `public/meta/` vengono aggiornati ogni notte da una GitHub Action.

## Comandi

```bash
npm install     # installa i pacchetti
npm run dev     # avvia in locale
npm test        # esegue i test
npm run build   # crea la versione da pubblicare in dist/
```

## Documentazione

- `claude.md`: mappa del progetto e cronologia delle versioni
- `docs/ROADMAP.md`: piano di sviluppo
- `docs/firestore.rules`: regole del database (da incollare nella console Firebase)
