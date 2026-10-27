# Roadmap — MTG Deck Matcher

Obiettivo: rispondere bene a una sola domanda, "quale mazzo competitivo posso costruire con le carte che ho, e quanto mi costa finirlo?", con dati aggiornati ogni giorno e un'esperienza comoda anche al tavolo, dal telefono.

Principi:
- **Dati affidabili prima delle funzioni nuove.** Una classifica sbagliata vale meno di nessuna classifica.
- **Rispetto delle fonti.** Leggiamo solo ciò che i siti consentono (robots.txt) e con poche richieste lente, una volta al giorno.
- **Zero costi fissi.** GitHub Actions + Vercel gratuiti; nessun server da mantenere.
- **Ogni versione è usabile da sola.** Si rilascia per piccoli passi, ognuno testato.

## Stato
- **v0.3** — Sync notturno MTGTop8 (7 formati, 20 archetipi, poi 30 dalla v0.7.1), punteggio main/side, Top 5, mancolista con export, colori dei mazzi, interfaccia mobile.
- **v0.4 → v0.7 — fatte il 12 ottobre 2026** (vedi sotto). Unica differenza dal piano: il confronto con MTGdecks è un link di ricerca, perché il robots.txt di MTGdecks blocca esplicitamente i programmi che leggono il meta.

## v0.4 — Dati più ricchi (ottobre) ✓
| Cosa | Perché |
|---|---|
| **Tier 1 / 2 / 3** per archetipo, con il metodo pubblicato da MTGdecks applicato all'intero meta di MTGTop8 | Capire subito quanto è competitivo un mazzo, non solo quanto è completo |
| **Trend** rispetto al sync precedente (sale / scende / nuovo) | Vedere cosa sta crescendo prima di comprare |
| **Rispetto del robots.txt** nel sync: se una pagina viene vietata il sync si ferma e tiene i dati vecchi | Continuare a usare la fonte in modo corretto |
| **Collegamento a MTGdecks** per ogni archetipo (ricerca, apertura manuale) | Confronto incrociato con le liste e i tier di MTGdecks senza leggere i loro dati in automatico, che il sito non consente |
| **Prezzi** Cardmarket in € (via Scryfall) e **costo stimato** della mancolista | Il dato che decide davvero l'acquisto |

## v0.5 — Esplorare il meta (novembre) ✓
| Cosa | Perché |
|---|---|
| **Tutti i mazzi (fino a 30)** oltre alla Top 5, con ordinamento (più completi, più giocati, meno costosi da finire) | La Top 5 nasconde mazzi quasi completi ma meno giocati |
| **Filtri** per tier e per colore | Chi gioca solo un colore o solo Tier 1 trova subito i suoi mazzi |
| **Carte chiave**: le carte che ti mancano e che compaiono in più mazzi del formato, con il costo | Comprare poche carte che avvicinano molti mazzi |

## v0.6 — Collezione (novembre) ✓
| Cosa | Perché |
|---|---|
| Import diretto dei CSV di **ManaBox, Moxfield, Deckbox, Dragon Shield, Cardmarket** | Nessuno vuole riscrivere la collezione a mano |
| **Backup e ripristino** (esporta CSV) | La collezione vive nel browser: serve una copia di sicurezza |

## v0.7 — Qualità (dicembre) ✓
| Cosa | Perché |
|---|---|
| **App installabile** (PWA) e funzionante offline con gli ultimi dati | Uso in negozio o al torneo anche senza rete |
| **Test automatici su GitHub** a ogni push | Un errore nel codice non arriva mai online |
| **Avviso dati vecchi** se il sync non gira da più di 3 giorni | Sapere quando fidarsi della classifica |
| Gestione errori dell'interfaccia, rifiniture di accessibilità | Nessuna schermata bianca |

## v0.8 — Varianti e collezione visiva ✓ (13 ottobre)
| Cosa | Perché |
|---|---|
| **Varianti dentro gli archetipi** (es. Mono Blue Aggro → Delver e Faeries) | MTGTop8 usa categorie larghe che nascondevano mazzi giocati |
| **Collezione come raccoglitore**: immagini, sezioni per colore, barra dei colori, griglia/elenco, filtri per tipo, valore stimato | Un elenco di soli nomi diventava illeggibile oltre poche decine di carte |
| **Audit di accessibilità** WCAG 2.1 AA e correzioni (contrasti, titoli, bersagli tattili, salto al contenuto, annulla) | Usabile da tutti, anche da tastiera e con lettori di schermo |

## v0.9 — Nuova fonte del meta ✓ (14 ottobre)
| Cosa | Perché |
|---|---|
| Meta da **MTGODecklistCache** (tornei MTGO, melee.gg, CardsRealm) classificati con le regole aperte di **MTGOFormatData** | MTGTop8 usa archetipi larghi: Mono Blue Faeries e Dimir Faeries finivano dentro Delver e Dimir Control |
| **MTGTop8 come rete di sicurezza**: Commander sempre, gli altri formati se più del 15% dei mazzi non viene riconosciuto | Le regole vengono aggiornate ogni pochi mesi; meglio dati larghi che dati sbagliati |
| Footer con numero di versione (v0.8.1) | Sapere quale versione si sta usando |
| v0.9.1: cestino per eliminare una carta dalla collezione (con Annulla), correzione nomi affidabile, terre base fuori dalla % di completamento | Segnalazioni dall'uso in negozio |
| v0.9.2: Correggi i nomi con l'elenco completo delle carte quando la ricerca di Scryfall non basta; copie in basso a sinistra e cestino in basso al centro sulle miniature | Refusi come "of ine mind" non venivano corretti; badge e cestino coprivano nome e forza/costituzione |
| v0.9.3: cursore già nella casella dopo "Aggiungi carte"; copie prima o dopo il nome ("4 Bolt", "Bolt 4", "Bolt x4", "Bolt (4)") | Inserimento più veloce al banco |
| v0.9.4: elenco mazzi su due colonne con tutti i 30 mazzi (via la scheda "I 5 migliori"); copie in basso a sinistra anche nelle carte del mazzo | Meno scorrimento, tutto il meta a colpo d'occhio |
| v0.10.0: sito in italiano, inglese e spagnolo (lingua scelta in automatico, selettore nell'header) e tema chiaro/scuro (scuro di default) | Apertura a giocatori di altri paesi; leggibilità in negozio con molta luce |
| v0.11.0: nome **Netdeckable**; portoghese (BR) e giapponese; sezione "Rogue piccanti della settimana" (fuori dai 30 mazzi, con top 8 o 5-0 negli ultimi 7 giorni, ordinati per la tua collezione) | Far scoprire mazzi fuori meta che vincono, come Slivers o Wildfire in Pauper |
| v0.11.1: header sempre visibile (si compatta scorrendo), bottone che porta ai rogue, indirizzi in inglese (#/decks, #/deck/…, #/key-cards, #/collection) | Navigazione e link condivisibili |
| v0.12.0: filtro budget, "contro cosa vince" (matchup dai turni dei tornei, % contro il meta), storico 12 settimane, avvisi ban | Scegliere cosa costruire con dati di risultato, non solo di popolarità |
| v0.12.1: prezzi nella valuta locale (dalla posizione presunta), dal mercato più vicino (Cardmarket o TCGplayer) con cambi BCE aggiornati ogni notte | Prezzi sensati per chi non è in zona euro |
| v0.12.2: selettore valuta nell'header, mazzi preferiti fissati in cima, 50 archetipi per formato (compare il Tier 3) | Controllo dell'utente e meta più completo |
| v0.12.3: font dei simboli di mana ridotto (−400 KB alla prima visita), dati carte preparati di notte dal file Oracle di Scryfall (quasi zero chiamate API dai visitatori), crediti e testo Fan Content Policy nel footer, aggiornamento notturno tenuto attivo | Sostenibilità a costo zero: più visitatori nel tetto gratuito di Vercel e nessun carico eccessivo su Scryfall |
| v0.12.4: simboli di mana di nuovo centrati nei cerchi (correzione del font ridotto) | Correzione grafica della v0.12.3 |
| v0.13.0: carte chiave con copie possedute/mancanti sul playset (4, 1 in Commander) e vista a immagini; dettaglio mazzo con lista testuale a sinistra e andamento + matchup a destra, vista a immagini con un tasto | Meno clic: tutto il mazzo in una schermata |
| v0.13.1: pulsanti (copia, scarica, TCGplayer) sopra le liste; anteprima della carta passando il mouse sul nome; intestazione del mazzo più bassa (barre a destra); carte chiave su due colonne con "ne hai X/4, ne mancano Y per il playset completo" | Rifiniture d'uso |
| v0.13.2: totale e nota sui prezzi in cima alla mancolista; collezione in vista elenco su due colonne | Rifiniture d'uso |
| v0.13.3 (revisione UX, parte A): "2st Place" → "2° posto" tradotto; avviso dati vecchi senza istruzioni tecniche; avviso Scryfall in cima ai mazzi; "Cerca il mazzo su Google"; "Variante di «x»"; "Senza dati"; testi introduttivi più corti, metodo dei tier spostato nel footer | Chiarezza dei testi |
| v0.13.4 (revisione UX, parte B): stesso ordine del tasto vista ovunque (elenco, immagini); scheda "Mazzo | Mancolista"; "Aggiungi carte" e "Totale stimato" ovunque; filtro tier delle carte chiave con lo stesso stile dei mazzi; conferme nello stile del sito (ConfirmButton) al posto di confirm(); "(3 senza prezzo)", "carta caratteristica", "Colori del mazzo" con spiegazione, "Matchup", sottotitolo di Correggi i nomi | Coerenza tra sezioni |
| v0.13.5 (revisione UX, parte C): "completo · main + side" sotto la percentuale; senza collezione le schede mostrano solo il costo del mazzo; "X% contro il meta"; "nuovo" solo per mazzi senza storico; Esporta / Importa backup nella collezione; filtri dietro un pulsante su telefono; testi delle schede più grandi | Chiarezza e telefono |
| v0.13.6: collezione con un solo "Importa da file" (export di altre app o backup): con collezione vuota carica subito, altrimenti chiede Aggiungi/Sostituisci (annullabile); file trascinabile su tutta la pagina; "Aggiungi carte" solo per scrivere/incollare | Meno pulsanti doppi |
| v0.13.7: pulsante "Torna su" in basso a destra dopo circa due schermate di scorrimento | Navigazione nelle pagine lunghe |
| v0.13.8: menu a tendina su misura (Picker) al posto dei <select> del sistema: lingua (icona globo), valuta (icona monete), Ordina e Budget; arrotondati, con spunta sulla voce scelta, usabili da tastiera | Grafica coerente |
| v0.14.0: "Mazzo misterioso del giorno" accanto al titolo dei mazzi: uno tra i meno giocati (metà bassa del meta) e i rogue, uguale per tutti e diverso ogni giorno per formato; nome nascosto finché non ci passi sopra, carta caratteristica sfocata, frase a effetto, conto alla rovescia a mezzanotte, pallino "non l'hai ancora aperto" | Far scoprire mazzi nuovi |
| v0.14.1: "una delle carte caratteristiche" scelta tra le carte in più copie, la meno diffusa, escludendo quelle che svelano il nome del mazzo (anche nei rogue); il mazzo misterioso al passaggio del mouse non ruota più, ruota solo la carta | Mistero vero |
| v0.15.0: sezione Gioca (#/play): Indovina il mazzo del giorno (risultato condivisibile), Mi sento fortunato, Apri una bustina, Che mazzo sei?, Traguardi (14, solo locali, avviso discreto). Nelle pagine: Meteo del meta (ultime 4 settimane), "Ci sei quasi" (≤ 5 carte, chiudibile), serie 🔥 nel mazzo misterioso, "La tua collezione urla…", immagine del mazzo da condividere | Far tornare gli utenti senza invadere |
| v0.16.0: niente più pagina Gioca né bustina né Condividi. Nella pagina mazzi una fila di pulsanti: rogue, Mi sento fortunato (i nomi scorrono nel pulsante e apre il mazzo), "Non sai cosa giocare? Fai il quiz" e "Indovina il mazzo del giorno" che si aprono in una finestra centrata e animata. Traguardi (22) nella collezione, in un riquadro richiudibile | Giochi dove servono, senza una sezione in più |
| v0.16.1: gruppo "Ogni giorno" sotto cui stanno mazzo misterioso, quiz e Indovina il mazzo; "Mi sento fortunato" a tema meteo (tromba d'aria) sotto il meteo del meta; pulsante dei rogue separato dai giochi | Gerarchia più chiara |
| v0.17.0: sezione Statistiche (salute del formato, chi converte di più, quanto rende ogni euro con miglior acquisto per la tua collezione, carte in ascesa/in calo, in salita con prezzo fermo, side del meta); nel mazzo: conversione in top 8, cuore della lista e posti liberi, side contro di te. Calcoli notturni su tutte le liste (scripts/stats.mjs) e storico prezzi giornaliero (prices-<formato>.json) | Dati che altrove non ci sono |
| v0.17.2: Indovina il mazzo prima del quiz, entrambi con sottotitolo; traguardi dopo le azioni della collezione; conversione in top 8 sopra i matchup; righe delle statistiche leggibili su telefono. Pulizia: tolte chiavi di traduzione, regole CSS, icone e import non più usati; un solo hash condiviso | Rifiniture e codice più snello |
| v0.18.0: la collezione salva la stampa (set, numero, Scryfall ID) quando l'import la contiene; ricerca per nome, artista o set; ordina per costo di mana, rarità, uscita, artista, set; filtri per artista, set, rarità e tag di Scryfall (funzione e illustrazione, scaricati ogni settimana); set e artista visibili sulle carte; backup con la stampa | Richiesta degli utenti |
| v0.18.2: usabilità su telefono — Indovina il mazzo con suggerimenti sopra il campo e carte compatte mentre si scrive; finestre che restano sopra la tastiera (iOS) e non si chiudono per sbaglio; tasto indietro chiude le finestre; menu a tendina che si aprono verso l'alto se in basso manca spazio; formato scelto sempre visibile nella fila; topbar su telefoni stretti | Segnalazione da telefono |
| v0.19.0: prima visita — invito a caricare la collezione in cima; mazzo misterioso e giochi in una fila che scorre su telefono; senza collezione liste neutre (niente "0/4" rossi, niente barre); "?" sulle metriche del sito (tier, meteo, % vs meta); profilo del mazzo (curva, creature, interazione dai tag Scryfall); "Ho già questo mazzo" con Annulla; promemoria backup dopo molte modifiche | Analisi da utente nuovo |
| v0.19.1: tolto il trasferimento della collezione via link e ogni riferimento allo spostarla su altri dispositivi (arriverà il login) | Decisione di Baia |
| v0.19.2: "Ho già questo mazzo" accanto alla stella del preferito; profilo del mazzo come piccole statistiche (valore sopra, etichetta sotto) invece di una riga di testo | Richiesta di Baia |
| v0.19.3: tema chiaro, carta segreta del mazzo misterioso più chiara (sfocata e velata invece che scurita) | Segnalazione di Baia |
| v0.19.4: tema chiaro, la carta segreta torna nitida passandoci sopra | Segnalazione di Baia |
| v0.19.5: il "?" accanto ai filtri tier è tondo come nel resto del sito | Segnalazione di Baia |
| v0.20.0: home su telefono compatta — titolo più piccolo, meteo in una riga, Mi sento fortunato senza sottotitolo, mazzo misterioso in una striscia, Indovina e quiz affiancati con titoli brevi; tolta la fila che scorreva di lato (tornava indietro da sola su iPhone). Filtri e primo mazzo visibili molto prima | Segnalazione di Baia da iPhone |
| v0.21.0: home ridisegnata «una cosa alla volta» — prima visita con frase e un solo pulsante dorato (+ «oppure sfoglia i mazzi»); meteo, mazzo misterioso, Indovina, quiz e Mi sento fortunato in un unico riquadro «Oggi nel meta» (su telefono: striscia con quattro tessere); Rogue tra i filtri; riga «50 mazzi · aggiornato il…» sopra la lista | Richiesta di Baia |
| v0.21.1: «Oggi nel meta» più chiaro — tornano frase divertente, carta caratteristica e quota del mazzo misterioso; ogni gioco con la sua riga di spiegazione, anche su telefono (righe al posto delle tessere) | Richiesta di Baia |
| v0.22.0: nuova grafica «la classifica stampata» su tutto il sito — carta a modulo continuo con righe verdi e fori, numeri a punti (Doto), evidenziatore sul primo mazzo, formati e schede come linguette, «Oggi nel meta» come striscia di biglietti perforati, finestre e avvisi con ombra stampata; niente pillole, bagliori e gradienti; titoli in Alegreya Sans 800, via Marcellus | Richiesta di Baia |
| v0.22.1: verde più scuro nel tema chiaro (contrasto AA sulle righe verdi) | Check generale |
| v0.23.0: indirizzi veri (/pauper, /pauper/deck/…, /collection; i vecchi #/… si convertono), titolo e descrizione per pagina, anteprima con immagine quando si condivide un link, sitemap ogni notte; telefono: scheda «Meta» nella pagina del mazzo e «Oggi nel meta» dopo i primi tre mazzi; pagine, giochi e lingue caricati solo quando servono (−31% al primo caricamento); riquadri come moduli stampati; numeri pieni con «più contrasto»; codice riordinato (App divisa, stili senza proprietà ripetute) | Check generale, voti 1–5 |
| v0.24.0: collezione a immagini con cursore «Colonne» (da 2 a 7 su computer, 2–3 su telefono); mazzi ordinati per «Più giocati» all'apertura e numero = posizione nell'ordine scelto; ordinamenti, filtri e viste ripartono dai predefiniti a ogni apertura del sito (collezione, formato, tema, lingua, valuta e preferiti restano salvati) | Richiesta utente |
| v0.24.1: cestino della collezione a immagini spostato sotto la carta, accanto al «−» (non copre più forza/costituzione né costo di mana); fino a 6 colonne sui tablet | Richiesta utente |
| v0.25.0: tolte le etichette BAN/R sulle carte della collezione; nuovo filtro «Bannate» (in almeno un formato o in uno preciso, con conteggi) che mostra sotto ogni carta dove è bannata o ristretta; carte della griglia allineate anche con testi di altezza diversa | Richiesta utente |
| v0.25.1: pannello «Filtri» della collezione dentro la barra fissa (resta visibile scorrendo; saltando a un colore il titolo non finisce sotto la barra); spiegazioni «?» mai tagliate né fuori schermo (si posizionano da sole); avvisi in basso visibili anche sopra i giochi e con «riduci movimento» attivo; anteprima carta che sparisce scorrendo; virgole che non vanno a capo da sole; fondo pagina non coperto dal tasto «torna su» | Check incongruenze |
| v0.26.0: grafica «ufficio di carta»: grana della carta, tema scuro come carta carbone, modulo continuo anche in lista mazzo/collezione/carte chiave, timbri (Bannata/Ristretta, Completo, data), evidenziatore verde/giallo per carte possedute/mancanti e passata sulle carte appena aggiunte, mancolista come scontrino, collezione come raccoglitore ad anelli, graffetta per i preferiti, note a penna (meteo, mazzo più vicino cerchiato), finestre come fogli impilati che si strappano, «Oggi nel meta» stampato riga per riga alla prima apertura | Richiesta utente |
| v0.26.1: graffetta dei preferiti: una volta fissato il tasto diventa pieno (inchiostro) così si vede subito | Richiesta utente |
| v0.27.0: carte foil in collezione: «foil», «F», «*F*» o «(foil)» in fondo alla riga (e colonna Foil/Printing/isFoil nei CSV); voce separata con riflesso olografico ed etichetta FOIL; prezzo foil di Scryfall nel valore; filtro «Foil»; il backup conserva le foil; per i mazzi contano insieme alle normali. Immagini nitide anche con poche colonne; su telefono il nome in elenco non si taglia più | Richiesta utente |
| v0.28.0: foil con scintille e lampo di luce (riconoscibili anche da sole); righe della collezione in elenco che non sbordano più con le carte senza costo (terre); gerarchia: Collezione prima di Carte chiave nel menu, «Oggi nel meta» dopo i primi tre mazzi anche su computer, nella pagina del mazzo la percentuale di completamento con barre e carte mancanti subito sotto il nome, Traguardi in fondo alla collezione, evidenziatore solo con il suo significato (non più sul primo mazzo) | Richiesta utente |
| v0.28.1: «Oggi nel meta» torna in cima alla home su computer (su telefono resta dopo i primi tre mazzi) | Richiesta utente |
| v0.29.0: ordinamento della classifica in evidenza sotto il titolo, e il titolo cambia con lui; predefinito «Più completi» con una collezione, «Più giocati» senza (e senza collezione «Più completi» non compare); tolto «Mi sento fortunato» (e il suo traguardo); tema scuro di nuovo grafite con le righe verdi | Richiesta utente |
| v0.30.0: tasto per comprare le carte mancanti in base alla valuta: Cardmarket (valute europee: copia la lista e apre la lista desideri), TCGplayer (USD, CAD e resto), LigaMagic (BRL), Hareruya (JPY); Commander diventa «cEDH» con spiegazione «?» e parole adatte («% della lista», «carte della lista che non hai») | Richiesta utente |
| v0.31.0: home: «Oggi nel meta» sopra il titolo (computer); titolo sempre su una riga («Pauper: i più giocati», più corto su telefono); ordinamento e filtri in un unico blocco, tasto Rogue sotto; fissando un mazzo la riga vola tra i preferiti in cima e si illumina; tolti i tasti LigaMagic e Hareruya (portavano solo alla home del sito), restano Cardmarket (lista desideri) e TCGplayer (carrello pieno) | Richiesta utente |
| v0.32.0: grafica rifatta come un sistema unico: stessa altezza per tutti i controlli (40 px, 44 al tocco), un solo stile per «selezionato» (inchiostro pieno), un solo pulsante principale per pagina, scala dei testi e spazi fissi; home più compatta (il primo mazzo si vede anche sui portatili bassi): «Oggi nel meta» con il titolo sulla matrice del biglietto, titolo, ordina e filtri allineati su due righe, riga con numero di mazzi, data e Rogue; righe dei mazzi più strette con la graffetta a destra, dati in colonna e timbro «Completo» al posto del 100%; preferiti come righe compatte in cima e il mazzo resta anche al suo posto in classifica (numerazione senza buchi); filtro colori come gli altri segmenti; grafico della quota con numeri leggibili; «Indovina il mazzo»: suggerimenti sempre visibili sopra la finestra (mai tagliati dallo scorrimento) e sotto il campo anche sui portatili bassi (la finestra dei giochi sta in alto), carte che si adattano all'altezza dello schermo, dorsi visibili anche nel tema chiaro, frecce, Invio ed Esc; quiz con l'avanzamento in un posto solo; via punti di separazione e frecce dai testi; controllata da un revisore indipendente (docs/ux-review.md) | Richiesta utente |
| v0.33.0: profilo facoltativo per portarsi dietro la collezione: accesso con Google o con un link via email (Firebase), collezione salvata nel profilo (Firestore in Europa) e tenuta uguale su tutti i dispositivi, scelta «unisci / profilo / dispositivo» se le due collezioni sono diverse, uscita ed eliminazione del profilo; pagina Informativa privacy; il sito resta usabile senza account | Richiesta utente |
| v0.33.1: in cEDH niente «Oggi nel meta» (pochi mazzi, liste tutte diverse); linguette dei formati: la linea di base passa davanti ai bordi delle linguette non scelte | Richiesta utente |
| v0.34.0: il sito passa a netdeckable.net: il vecchio indirizzo manda al nuovo portandosi dietro collezione, preferiti e impostazioni salvati nel browser (nel link, compressi; presi solo se sul nuovo non c'è già niente); sitemap, robots e immagine di anteprima sul nuovo dominio | Richiesta utente |
| v0.34.1: «Indovina il mazzo» sceglie tra i 50 mazzi più giocati (prima 20) e lo stesso mazzo non può tornare prima di 5 giorni; la nuova regola vale da domani (27 ottobre), così chi ha già giocato oggi ritrova il suo mazzo | Richiesta utente |
| v0.34.2: simboli di mana dei mazzi quasi monocolore: prima il colore principale a grandezza normale, poi i colori di splash più piccoli (es. Red Madness: rosso, poi blu e nero piccoli) | Richiesta utente |
| v0.34.3: i colori nel nome del mazzo contano come principali (gilde, frammenti e clan, nomi a 4 colori, college di Strixhaven, famiglie di New Capenna, parole di colore, sigle tipo UB o WURG, Domain/5 colori); «Mono …» tiene principale solo quel colore; la striscia colorata e la cornice usano solo i colori principali (Red Madness rossa); nei mazzi Commander niente splash | Richiesta utente |
| v0.34.4: il filtro Colori della home guarda solo i colori principali (es. filtrando rosso compare Red Madness, che ha uno splash blu-nero) | Richiesta utente |
| v0.35.0: nella pagina del mazzo una riga spiega come viene scelta la lista mostrata (la più recente con un buon risultato tra quelle degli ultimi due mesi, aggiornata ogni notte); testi del sito riscritti in italiano e in inglese per essere più naturali e chiari (spiegazioni, errori, suggerimenti, statistiche) | Richiesta utente |
| v0.35.1: nella pagina del mazzo il link «Tutte le liste recenti su MTGDecks» porta alla pagina del mazzo su MTGDecks (indirizzo costruito dal nome); sotto resta «Non lo trovi? Cercalo su Google» per i mazzi che lì hanno un nome diverso. In cEDH solo la ricerca | Richiesta utente |
| v0.35.2: simboli di mana centrati nel cerchio (anche su iPhone) e numeri del costo generico più piccoli; statistiche su telefono: nelle carte in ascesa e in calo le percentuali stanno a destra come nelle altre tabelle e restano in colonna | Richiesta utente |

## Prossimo: aggiunta carte con la fotocamera
Vedi la spiegazione nella conversazione del 15 ottobre: riconoscimento del nome dal titolo della carta (OCR nel browser) + confronto con l'elenco completo dei nomi (closestName), conferma prima di aggiungere.

## Dopo (gennaio e oltre, da valutare)
- **Collezione sincronizzata tra dispositivi** (Firebase, già usato negli altri progetti).
- **Storico del meta** con grafico dell'andamento di ogni archetipo.
- **Più liste per archetipo** (varianti) e scelta della lista più vicina alla collezione.
- **Avvisi**: "con le carte che hai aggiunto ora completi X".
- **Accordo con MTGdecks** per usare i loro dati (o una loro API) in modo autorizzato.
- **Modalità negozio**: collezione condivisa del negozio, mancolista unica per i clienti.

## Manutenzione continua
- Controllare ogni settimana l'esito del sync (tab Actions); i fallimenti salvano le pagine in `debug/`.
- Aggiornare i parser se MTGTop8 cambia HTML (i test in `scripts/*.test.mjs` coprono i casi noti).
- Aggiornare le dipendenze una volta al mese.
