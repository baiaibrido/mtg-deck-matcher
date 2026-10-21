# Foto del sito su più schermi (controllo grafico)

Servono Playwright e l'anteprima della build in ascolto su http://localhost:4174 (`npm run build && npx vite preview --port 4174`).

- `node scripts/ux/matrix.mjs <cartella> [schermi] [temi]` — tutte le pagine su 9 schermi (usr 1027×566, lap 1280×600, lap2, desk, big, tabP, tabL, ph 390×844, phS 360×740), tema scuro e chiaro.
- `node scripts/ux/quick.mjs <cartella> <percorso> <schermi> [temi] [nuovo]` — una pagina sola (QLANG=en per un'altra lingua).
- `node scripts/ux/extras.mjs <cartella> [schermi] [temi]` — stati rari: menu aperti, «?», conferme, risultato del quiz, partita finita.
- `node scripts/ux/audit2.mjs` — controlla le regole: altezza dei controlli, niente sbordi, titolo su una riga, primo mazzo visibile, menu e suggerimenti dentro lo schermo.
