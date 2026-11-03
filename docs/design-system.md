# Netdeckable — piano di design v4 «L'ufficio del torneo» (v0.40.0, composizione rifatta in v0.41.0)

## Idea
Ogni sezione è un oggetto di carta dell'ufficio di un torneo di Magic, appoggiato su una scrivania grigio-verde:
- Mazzi: il tabulato del torneo (modulo continuo a righe verdi, fori di trascinamento, linee di strappo).
- Mazzo: il modulo d'iscrizione della lista (caselle con l'etichetta in alto, riquadro del risultato, righe del modulo).
- Collezione: il raccoglitore (anelli sul dorso, divisori colorati per sezione, carte nelle tasche di plastica).
- Mancolista e Carte chiave: lo scontrino (carta termica, bordi a zig-zag, totale in fondo).
- Meta: il bollettino stampato (capitoli aperti da un filetto doppio, grafici a penna blu).
- «Oggi nel meta»: il blocco note (margine rosso, fori in alto, titolo a penna).
Segni con un significato: evidenziatore giallo = ti manca, verde = ce l'hai; cerchio a penna = scelta attiva e mazzo migliore; timbri = bannata / ristretta / completo; post-it = avvisi e suggerimenti; graffetta = preferiti; nastro Dymo = logo.

## Colore (tokens.css)
Chiaro: scrivania #dfe2dc · foglio #fbfbf8 · riga verde #eaf1e6 · foglio grigio #f1f2ed · inchiostro #1c2127 · sbiadito #555d66 · righe #cdd2c9 / #7a8279 · penna #2443b3 · evidenziatori #ffe14d / #a8ea8e · post-it #fbe78a · nastro Dymo #23324f.
Scuro (`[data-theme="dark"]`): scrivania #15181a · foglio #20252a e così via; scontrino e post-it restano chiari (sono carta vera).
Il tema segue il dispositivo (prefers-color-scheme) finché non si sceglie a mano (localStorage `mdm.themeChoice`).

## Tipografia
Archivo variabile (pesi e larghezze): testo normale, titoli 800 stretti (`--w-head` 72%), etichette strette (`--w-label` 86%).
Doto: numeri a puntini (posizione, percentuali, totali). Caveat: solo le note a penna. Niente corsivo (Archivo corsivo non è caricato, font-synthesis: none).
Scala in tokens.css (--fs-xs … --fs-num); titoli di pagina --fs-3xl. Cifre tabellari ovunque.

## Controlli
Altezza 40px (44px con le dita), raggio 3px, riquadro a modulo. Un solo pulsante principale (inchiostro pieno) per vista.
Segmentato (.seg): l'opzione scelta è cerchiata a penna. Linguette (.tabs): cartelline, quella aperta col bordo d'inchiostro in alto.
Interruttore = casella con la spunta a penna. Barre (.meter) a puntini come una stampante ad aghi.

## Impaginazione
Contenitore 1008px di contenuto, margini 16. Telefono prima: tutto controllato a 360/390, poi 820 e 1920 (lo schermo di Baia).
Ogni regola :hover dentro `@media (hover: hover) and (pointer: fine)`. Niente emoji come icone, niente etichette sopra i titoli, niente «·» o «→» nei testi.
Le sfumature rimaste sono tutte oggetti fisici (fori, strappo, evidenziatore, margine, foil, tasca) e hanno il commento taste-skill-ignore.

## Composizione (v0.41.0)
- Guscio: telefono = etichetta Dymo rossa e preferenze in alto, linguette colorate dei divisori in basso (quella aperta più alta). 720–999px = testata con le sezioni come linguette. Da 1000px = copertina blu del raccoglitore a sinistra (208px, sticky) con le linguette che sporgono; quella aperta sporge di più. Colori: --tab-decks verde, --tab-meta giallo, --tab-coll rosa, --tab-keys azzurro.
- Mazzi: podio (i primi tre dell'ordine scelto, schede grandi) e poi il tabulato con l'intestazione stampata delle colonne (Pos., Mazzo, Quota, Andamento, Contro il meta, Per finirlo/Costo, Completo); la colonna dell'ordine scelto è sottolineata a penna. Da 1600px blocco note, «ci sei quasi» e preferiti in una colonna a destra.
- Mazzo: foglio della decklist (campi in caselle, riquadro del risultato, Main e Sideboard affiancati con la fascia nera), scontrino della mancolista pinzato accanto (da 1100px di pagina, sticky), fogli del meta sotto. Niente linguette: su telefono una fila di salti (Mazzo, Mancolista, Meta).
- Collezione: copertina di vinile nero a sinistra (portaetichette col titolo, azioni, indice dei divisori colorati, profilo), pagine a destra.
- Meta: un solo foglio di giornale: testata con filetto doppio e data dell'edizione, articoli in colonne divise da filetti (niente fogli separati).
- Carte chiave: la cassa a sinistra (titolo, tier, totale, azioni), lo scontrino lungo a destra con testa e totale.
