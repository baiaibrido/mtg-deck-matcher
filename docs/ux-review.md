# Revisione indipendente della v0.32 (21 ottobre 2026)

Revisore separato, che non ha visto il lavoro mentre veniva fatto. Si è fermato prima della fine su richiesta: non ha guardato `extra/`, carte chiave, statistiche, collezione vuota, tablet e schermi grandi.
Foto in `scratchpad/shot/ux/after2/` (si rifanno con `scripts/ux/matrix.mjs`). Da sistemare nel pomeriggio prima di pubblicare.

Le due lamentele del proprietario sono in gran parte risolte, non del tutto. Nel gioco i suggerimenti non finiscono più nello scorrimento della finestra, ma ora coprono le carte indizio (#2). Su computer i controlli della home sono allineati e gli spazi sono regolari; resta il lavoro dei punti #3–#9.

## Problemi trovati

1. **ALTO: il grafico del mazzo mostra numeri sbagliati.** `lap-dark-receipt.png` (colonna destra, circa x790 y155): «2,5%» è tagliato e si legge «1,5%». Lo stesso in `usr-dark-deck.png` (circa x660 y451), dove «7,5%» si legge «,5%».
   - **Causa:** `.detail-side .hist-axis { font-size: 19px }` (deck.css:129) con solo 40 unità di margine a sinistra (`L = 40`, Charts.jsx:24): l'inizio dell'etichetta viene tagliato.
   - **Correzione:** `L = 56`, oppure `overflow: visible` su `.hist-plot svg` più un margine a sinistra. Tacche tonde (0/5/10/15) invece delle metà. Le etichette escono a circa 9px: meglio disegnarle in HTML a 12px.

2. **ALTO: mentre si scrive, i suggerimenti coprono gli indizi.** `usr-dark-guess-typing.png`: la lista (x304–724, y153–402) si apre verso l'alto sopra «Tentativo» e copre le carte 2–5 (y257–392). Uguale in `lap-dark-guess-typing.png`. Dal terzo tentativo il giocatore non vede le carte da cui deve indovinare.
   - **Correzione:** sugli schermi bassi da computer usare la modalità compatta del telefono, ma attivarla quando i suggerimenti sono aperti e non al focus (su computer il focus arriva appena si apre la finestra). In games.css: `@media (min-width:720px) and (max-height:700px) { .game-guess.sugg-open .game-text{display:none} .game-guess.sugg-open .guess-cards{--card-h:96px} }`. Così sotto il campo restano circa 185px e la lista si apre verso il basso.

3. **MEDIO-ALTO: i preferiti spezzano la classifica.** `usr-dark-home.png`, `lap-dark-home.png`, `usr-dark-home-full.png` (y1340–1700).
   - Con «Ordina: Più completi» la prima riga mostrata è la numero 8, e il vero #1 finisce sotto la piega su tutti e due gli schermi di riferimento. Così non è rispettata la regola «primo mazzo visibile».
   - Poi la lista salta dal 7 al 9.
   - Due linee da 2px con 24px in mezzo (`.pinned{margin-bottom:var(--s5)}` più `.decks{border-block:2px}` in paper.css:10) sembrano un errore di disegno.
   - **Correzione:** preferiti come una riga compatta (graffetta, nome, %). Il mazzo fissato resta anche al suo posto in classifica, segnato con la graffetta, così la numerazione non ha buchi. Togliere la doppia linea.

4. **MEDIO: timbri e segni di penna si scontrano con i numeri.**
   - Il timbro «COMPLETO» lascia vedere pezzi del «100» (`usr-dark-home-full.png` circa x800–920 y640–700; `ph-dark-home.png` x268–345 y600–640).
   - Il cerchio a penna della riga #2 passa sopra la didascalia «main + side» (`usr-light-home-full.png` x780–930 y760–840).
   - Sotto i 1100px di larghezza la nota «il più vicino!» è nascosta, quindi il cerchio resta senza spiegazione. Con «Più completi», poi, segna solo il #2, che è ovvio.
   - **Correzione:** `.deck-score:has(.deck-stamp)>b{visibility:hidden}`. Cerchio solo attorno al numero (`.deck-best .deck-score b::before`). Nascondere il cerchio dove è nascosta la nota.

5. **MEDIO: il pannello filtri sul telefono non è allineato.** `ph-*-home-filters.png` (y268–410): il menu Budget parte a x91, i segmenti Tier a x61, le icone dei colori a x78. È proprio lo «spazi sballati» di cui si lamentava il proprietario.
   - **Causa:** la larghezza delle etichette vale solo per il primo campo (`...field:first-child>.field-label{min-width:3.4rem}`, home.css:138).
   - **Correzione (≤719px):** `.filters{display:grid;grid-template-columns:4.5rem 1fr} .filters>.field{display:contents}`.

6. **MEDIO: nel tema chiaro le carte coperte non si vedono.** `usr-light-guess.png` (x304–830 y257–392): la carta è circa rgb(229,234,223) su una finestra rgb(232,233,228). Si vede solo una macchia chiara con un «?» grigio: sembra non finito.
   - **Correzione:** `.play-card-back{box-shadow:inset 0 0 0 1px var(--line-2)}` e su `.play-back` lo stesso dorso a righe del mazzo misterioso (`repeating-linear-gradient(45deg,var(--bar) 0 5px,var(--sheet) 5px 10px)`).

7. **MEDIO: sul telefono le righe dei mazzi non sono allineate.** `ph-dark-home.png` (y410–700):
   - La colonna della percentuale prende la larghezza del suo contenuto, così le barre finiscono a x225 in una riga e a x206 nella successiva, e i conteggi si spostano con loro.
   - «stabile» va a capo staccato dal suo grafichino e si legge «stabile 51,3% contro il meta».
   - Il tasto pieno della graffetta tocca il bordo dello schermo (x346–390).
   - **Correzione:** `.deck-btn{grid-template-columns:2.25rem minmax(0,1fr) 4.75rem 36px}`. Grafichino e parola dell'andamento in un unico span `inline-flex; white-space:nowrap` (DeckList.jsx). `.deck>.pin-btn{right:var(--s1)}`.

8. **MEDIO: il filtro colori non sembra un controllo.** `usr-light-home.png` (x470–640 y340–365): simboli di mana sbiaditi, senza bordo e senza l'opzione «tutti». Nel tema chiaro il bianco non ha un cerchio visibile. Accanto ai segmenti del Tier sembra una decorazione, e non segue la regola «selezionato = inchiostro».
   - **Correzione:** farlo come `.seg.seg-icons`: cinque tasti da 40px, selezionato = fondo inchiostro con il simbolo a colori pieni.

9. **MEDIO-BASSO: su computer i dati delle righe non sono in colonna, e i grafichini ingannano.** `usr-dark-home-full.png`: «% del meta / grafichino / stabile / contro il meta» si spostano di qualche pixel da una riga all'altra. Ogni grafichino è in scala sulla sua riga (Charts.jsx:8–9), così Burn allo 0,5% sembra molto instabile mentre c'è scritto «stabile».
   - **Correzione:** `.deck-sub` su una griglia di colonne fisse da 720px in su. Ai grafichini un intervallo minimo di circa 2 punti percentuali.

10. **MEDIO-BASSO: due piccoli disallineamenti nella testata.**
    - La linea sotto le linguette dei formati sporge di 16px per lato su computer (120→1160 contro un contenuto 136→1144, `lap-dark-home.png` y92). Correzione: `.formats{margin:… calc(-1*var(--gutter))}` solo fino a 719px.
    - Scorrendo, la testata compatta rimpicciolisce il logo e tutto il menu scivola di 27px a sinistra («Mazzi» passa da x295 in `usr-dark-deck.png` a x268 in `usr-dark-deck-2.png`). Correzione: scalare il logo con `transform` e larghezza fissa invece di cambiare la dimensione del testo.

11. **BASSO-MEDIO: le celle di «Oggi nel meta» non sono coerenti tra loro.** `usr-dark-home.png` (y115–190): il titolo del meteo è grigio a 12px, gli altri tre sono in grassetto a 15px, e le tre voci usano tre segni diversi (pallino che pulsa e due emoji). Correzione: `.today-label` uguale a `.today-text b`, e un solo stile di icona.

12. **BASSO: piccole uscite dal sistema dei controlli.**
    - Il tasto graffetta non ha bordo nelle righe della home ma è un quadrato con bordo da 40px nella pagina del mazzo (`usr-dark-deck.png` x327–367), ed è fisso a 36px (home.css:194). Correzione: `var(--ctl-sm)` e un bordo leggero ovunque.
    - Il tasto «Filtri» aperto cambia solo il bordo (`usr-dark-coll-filters.png`). Correzione: fondo inchiostro quando è aperto.
    - L'etichetta `.tier-1` ha il fondo inchiostro, lo stesso aspetto di «selezionato». Correzione: un contorno da 2px.

13. **BASSO: il quiz mostra l'avanzamento due volte.** `usr-dark-quiz.png` (y186 e y410): la barra alla prima domanda è vuota e sembra un separatore, e «1 / 5» si ripete in fondo. Correzione: riempire la barra fino al passo attuale e mettere il contatore accanto. I tasti delle risposte, a 48/42px, sono anche fuori dalle altezze 40/44 dei controlli.

14. **BASSO: riga della fonte disordinata nella pagina del mazzo.** `usr-dark-deck.png` (y287): «(Ghost94 · IPT FUMA CHE PAUPERUMA (1st Place))» ha parentesi annidate, maiuscole e «1st Place» in inglese. Correzione: riusare `resultText()` di DeckList.jsx per ottenere «Ghost94 · IPT Fuma che Pauperuma · 1° posto». Anche il «(×1,1)» nella riga del Top 8 non si capisce.

15. **BASSO: sul telefono le linguette dei formati nascondono «Standard» senza avvisare.** `ph-dark-home.png` (y66–106): la fila è spostata su «Pauper» e niente fa capire che ci sono altre linguette a sinistra. Correzione: sfumare i due bordi con un gradiente di maschera su `.formats`.

## Cosa funziona e non va cambiato

1. I suggerimenti del gioco ora stanno fuori dallo scorrimento della finestra. A 1027×566 si vedono tutte e sei le opzioni, senza scorrere dentro la lista.
2. Il ritmo della home su computer: titolo su una riga, poi il blocco ordina e filtri su due righe con i controlli allineati (su usr tutte e due le righe partono da x78), con spazi regolari.
3. L'aspetto: righe a strisce verdi, fori di trascinamento e numeri a punti. È riconoscibile e si legge bene in tutti e due i temi.
4. Un solo pulsante principale per vista (Copia lista, Aggiungi carte) e «selezionato = inchiostro» nei segmenti.
5. La mancolista come scontrino, con l'evidenziatore giallo su quello che manca, e la collezione come raccoglitore ad anelli.
