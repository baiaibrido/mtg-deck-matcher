# Brief per la revisione indipendente (Netdeckable)

## Il prodotto
Netdeckable è un sito (React/Vite) per giocatori di Magic: The Gathering su carta. Carichi la tua collezione e vedi quali mazzi del meta competitivo puoi già costruire, cosa ti manca e quanto costa. Lingua principale italiano. Pagine: Mazzi (home con classifica), pagina del singolo mazzo, Collezione, Carte chiave, Statistiche; due giochi in finestra (Indovina il mazzo, quiz «Che mazzo sei?»).

## Cosa ha detto il proprietario (da risolvere)
- «La home con i suoi spazi tutti sballati, gerarchie strane e incoerenze.»
- «Il quiz del mazzo da indovinare dove le risposte vengono nascoste da una scroll» (su uno schermo 1027×566 i suggerimenti finivano dentro lo scorrimento della finestra).
- Vuole un sito «moderno e al passo coi giganti», un gioiello di UI e UX.

Vincoli già decisi dal proprietario (non proporre di cambiarli):
- «Oggi nel meta» (il riquadro perforato) resta SOPRA il titolo su computer; su telefono sta dopo i primi tre mazzi.
- Il titolo della home è sempre su una riga e cambia con l'ordinamento.
- Ordina e filtri (budget, tier, colori) stanno insieme; il collegamento ai Rogue sta sotto.
- Tema scuro grafite con righe verdi (non blu); timbri, evidenziatori, scontrino, raccoglitore ad anelli, graffetta e note a penna restano (è la grafica «ufficio di carta»).

## Il sistema di design applicato
Metafora: la classifica di un torneo stampata su carta a modulo continuo (fori laterali, righe verdi alternate), numeri a punti (Doto) come elemento memorabile.
- Testi: 12 · 13 · 14 · 15 (controlli) · 17 (testo) · 20 · 24 · 32 (titolo pagina) · 44 (numeri grandi).
- Spazi: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64.
- Controlli: tutti alti 40 px (44 al tocco), raggio 3 px, bordo 1 px.
- «Selezionato» = fondo inchiostro e testo carta, ovunque. Un solo pulsante principale per vista (inchiostro con ombra sfalsata blu, l'unico elemento con quell'ombra).
- Segmenti (.seg) per le scelte singole, linguette (.tabs) per formati e viste del mazzo, menu su misura (Picker).
- Su portatile 1280×600 (e anche 1027×566) la prima schermata della home deve mostrare almeno il primo mazzo della lista.

## Dove guardare
- Foto: `/tmp/claude-0/-home-claude/05cf7fe2-7204-5bd2-9904-84bc78d3dced/scratchpad/shot/ux/after2/` — nomi `<schermo>-<tema>-<vista>.png`.
  Schermi: usr 1027×566 (quello del proprietario), lap 1280×600, lap2 1366×657, desk 1536×750, big 1920×960, tabP 820×1180, tabL 1180×820, ph 390×844, phS 360×740. Temi: dark, light.
  Viste: home, home-full (pagina intera), home-filters (telefono, filtri aperti), deck, deck-2 (scorrendo), deck-need (mancolista), receipt, keycards, coll, coll-grid, coll-filters, stats, guess, guess-typing, quiz, new (utente senza collezione), coll-empty.
- Stati extra: `/tmp/claude-0/-home-claude/05cf7fe2-7204-5bd2-9904-84bc78d3dced/scratchpad/shot/ux/extra/` (menu aperti, «?», conferme, collezione in elenco, carte chiave a immagini, mazzo rogue, risultato del quiz, partita finita).
- Le foto «prima» (vecchia versione) sono in `.../shot/ux/base/` per confronto.
- Il sito gira in locale su http://localhost:4174 (anteprima della build). Puoi fotografare altri stati con Playwright (Chromium già installato: vedi `.../shot/ux/quick.mjs` per un esempio, si lancia dalla cartella `.../shot/ux` con `node quick.mjs <cartella> <percorso> <schermi> <temi>`). Nota: nelle foto le immagini delle carte sono finte (rettangoli colorati) e Scryfall è bloccato: è normale.
- Il codice CSS è in `/tmp/claude-0/-home-claude/05cf7fe2-7204-5bd2-9904-84bc78d3dced/scratchpad/zip/mtg-deck-matcher/src/css/` (tokens, base, controls, layout, paper, home, deck, collection, keycards, stats, games).
