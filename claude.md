# Netdeckable (repo mtg-deck-matcher) — claude.md

Nome pubblico: **Netdeckable** (dominio previsto netdeckable.app, non ancora collegato). Nel codice e nelle chiavi localStorage resta il prefisso `mdm.`.

App web (React + Vite, solo frontend, PWA). Confronta la collezione dell'utente con i mazzi meta di un formato: tutti i mazzi (fino a 30, due colonne da 720px) con filtri, tier, trend, costo per completare, mancolista, carte chiave. Piano: `docs/ROADMAP.md`.

## Project map
```
claude.md                  questo file (contesto per Claude)
docs/system-map.md         grafo dipendenze moduli
public/meta/index.json     elenco formati
public/meta/<format>.json  mazzi meta per formato (aggiornati ogni notte dalla GitHub Action)
public/sw.js               service worker (offline: rete-poi-cache per pagine e meta, cache per assets e immagini)
public/manifest.webmanifest + public/icons/  PWA installabile
scripts/sync-meta.mjs      sync notturno: MTGODecklistCache + regole MTGOFormatData → public/meta; Commander e fallback via MTGTop8 (+ test)
scripts/sync-mtgtop8.mjs   sync MTGTop8: tier, trend, robots.txt, saveFormat() condiviso (+ test)
.github/workflows/         sync-meta.yml (notturno), test.yml (test + build a ogni push)
src/
  i18n/index.js            traduzioni: t(chiave, ...args), LANGS, setLang, detectLang (salvata > ?lang= > dispositivo > fuso orario > en), euro/num/dayMonth nel formato della lingua
  i18n/it en es pt ja .js  dizionari (stesse chiavi: lo verifica i18n.test.js). Ogni testo nuovo va aggiunto in tutte e cinque. PT = brasiliano; JA con font giapponesi di sistema (:lang(ja) in styles.css); nomi carta sempre in inglese
  main.jsx                 entry: font (Marcellus, Alegreya Sans), mana-font, stili
  App.jsx                  layout, stato, rotte, toast, elenco di tutti i mazzi + filtri, fetch Scryfall (prima i mazzi in vista, poi tutti)
  styles.css               design system (token in :root) + tutti gli stili
  state/useLocal.js        useState persistito su localStorage
  state/useRoute.js        rotte nell'hash in inglese: #/decks, #/key-cards, #/collection, #/deck/<id> (i vecchi #/mazzi… vengono convertiti; tasto indietro ok)
  lib/normalize.js         normalizzazione nomi carta (chiave di match)
  lib/closestName.js       nome di carta più vicino (distanza di modifica) per Correggi i nomi
  lib/parser.js            parser collezione (CSV / testo) e decklist (main/side)
  lib/scryfall.js          client Scryfall + cache compatta con prezzi (localStorage 'mdm.cards.v3', scadenza 3 giorni)
  lib/deckInfo.js          colori del mazzo, cornice, gruppi per tipo, simboli di costo, missingCost(), euro()
  lib/keyCards.js          carte mancanti condivise da più mazzi (terre base escluse)
  lib/metaDecks.js         caricamento JSON meta
  lib/matcher.js           MOTORE: allocazione copie, ratio, score, ranking
  lib/export.js            export mancolista (testo, TCGplayer, .txt) + backup collezione CSV
  components/DeckList.jsx  lista mazzi (2 colonne) con cornici colorate + Meter (barre)
  components/DeckDetail.jsx dettaglio: Lista (per tipo, immagini) / Mancolista + azioni
  components/CollectionManager.jsx raccoglitore per colore con immagini (griglia/elenco), barra colori, filtri tipo, ordinamento, valore stimato, import a scomparsa
  components/MetaImporter.jsx aggiunta mazzo a mano
  components/KeyCards.jsx  pagina Carte chiave (Tier 1 / 1+2 / tutti)
  components/Badges.jsx    TierBadge, Trend
  components/ErrorBoundary.jsx schermata di errore invece della pagina bianca
  components/Mana.jsx      ManaCost, ColorPips (mana-font)
  components/Icons.jsx     icone SVG inline
```

## Design system (styles.css)
- Header sticky che si compatta dopo 40px di scorrimento (classe `.compact`); la sua altezza è in `--head-h` (usata da `.coll-tools` e da `scroll-padding-top`). Bottone "🌶 Scopri i rogue" sotto l'intro: scorre alla sezione rogue.
- Temi: scuro di default; chiaro con `:root[data-theme="light"]` (token ridefiniti, contrasti AA verificati). Scelta in localStorage `mdm.theme`, applicata prima del disegno da uno script in index.html. Pulsante sole/luna e selettore lingua nell'header (`.prefs`).
- Tema "tappetino da gioco": --felt fondo, --baize superfici, --rail bordi, --bone testo, --lichen secondario, --brass accento oro.
- Colori mana per le cornici: --mana-w/u/b/r/g, --mana-gold (3+ colori), --mana-c (incolore). Stato carte: --ok / --part / --no.
- Font: Marcellus (titoli, nomi mazzi, numeri grandi), Alegreya Sans (UI). Numeri lining.
- Cornice mazzo = deckColors() → frameOf(): 1 colore pieno, 2 colori gradiente ibrido, 3+ oro.
- Accessibilità (audit WCAG 2.1 AA con axe-core: 0 violazioni): --edge per i bordi dei controlli (≥3:1), placeholder ≥4.5:1, focus visibile ovunque, link "Vai al contenuto", un solo h1 per pagina e titoli in ordine, bersagli tattili ≥44px su mobile (eccezioni: link dentro il testo, stepper della griglia collezione 40px), ManaCost con role="img". Annulla nel toast dopo "Svuota".
- Mobile < 720px: tab bar in basso, azioni mancolista sticky. Animazione "distribuzione carte" sulla lista; prefers-reduced-motion rispettato.

## Data models
```js
CardEntry   = { name: string, qty: number }
Collection  = CardEntry[]                       // localStorage 'mdm.collection'
MetaDeck    = { id, name, archetype?(se variante), format, source, url?, title?, share?, tier?(1|2|3), prev?(share al sync prec.), prevDate?, updated?, main: CardEntry[], side: CardEntry[] }
// File JSON meta: main/side come stringhe "4 Lightning Bolt" (convertite da metaDecks.js)
ScoredDeck  = { deck, main: Alloc, side: Alloc, score, missing: Row[] }
Alloc       = { rows: Row[], have, total, ratio }
Row         = { name, qty, have, missing }
ScryCard    = { name, i (path immagine), ci, type, cost, eur, usd, t } // salvato; getCached() aggiunge img e uri
```
Chiavi localStorage: `mdm.lang` (lingua scelta), `mdm.theme` ('dark' | 'light'), `mdm.format`, `mdm.collection`, `mdm.userDecks`, `mdm.view` (modo/ordinamento/filtri), `mdm.collView` (vista/ordine/tipo collezione), `mdm.cards.v3` (max 8000 carte).

## Core logic (lib/matcher.js)
1. `toOwnedMap(collection)` → Map(nomeNormalizzato → copie).
2. Per ogni mazzo si clona il pool di copie possedute; si alloca PRIMA il main, poi il side
   (una copia non conta due volte se la carta è sia in main che in side).
3. `M_main = Σ min(owned, req) / totaleMain` (60 di norma), `M_side = Σ min(owned, req) / totaleSide` (15).
   Side vuoto → `M_side = 0`.
4. `score = M_main·0.85 + M_side·0.15`. Garantisce: 100% main + 0% side (0.85) > 75% main + 100% side (0.7875).
5. Ordinamento: score desc, poi M_main desc, poi popolarità. Si mostrano tutti i mazzi del formato.
6. Terre base lisce (Plains, Island, Swamp, Mountain, Forest): sempre possedute, non consumano copie, escluse dalla collezione (parser + setCollection in App) e fuori da have/total/ratio (dalla v0.9.1: la % di completamento conta solo le altre carte). Le Snow-Covered e Wastes contano normalmente.

## Normalizzazione nomi (lib/normalize.js)
minuscolo, senza accenti, apostrofi uniformati, spazi compressi, solo faccia frontale (`A // B` → `a`).
Scryfall (pulsante "Correggi i nomi") corregge refusi: `/cards/collection` (75 per richiesta) + `/cards/named?fuzzy` per i non trovati (max 150); se anche il fuzzy fallisce, `closestName.js` confronta il nome con l'elenco completo `/catalog/card-names` (scaricato solo se serve, ~1 errore ogni 4 lettere, se ambiguo propone suggerimenti). I nomi già segnati come sconosciuti in sessione vanno dritti al fuzzy (bug fino alla v0.9.0: venivano saltati). Ogni carta in collezione ha il cestino (elimina con Annulla nel toast).

## Formati input accettati
- CSV con intestazione (`Name`/`Nome`/`Card` + `Qty`/`Quantity`/`Count`/`Quantità`).
- Testo: `4 Lightning Bolt`, `4x Lightning Bolt`, `4 Lightning Bolt (2X2) 117`, `Lightning Bolt x4`, `Lightning Bolt,4`.
- Decklist: riga `Sideboard` (o `SB:` per riga); senza intestazione, la prima riga vuota dopo le carte separa il side.

## Common debug patterns
| Sintomo | Causa probabile | Dove guardare |
|---|---|---|
| Carta posseduta segnata rossa | nome diverso (refuso, lingua, set nel nome) | `normalize.js`, usa "Normalizza con Scryfall" |
| Mazzo con side tutto rosso ma main ok | side assente nel JSON o copie consumate dal main | `matcher.js` `alloc()` |
| Nessun mazzo mostrato | `public/meta/<format>.json` vuoto o JSON non valido | console browser, `metaDecks.js` |
| Scryfall 429 | troppe richieste | `scryfall.js` `sleep()` tra chunk |
| Dati "spariti" | localStorage pulito / altro browser | chiavi `mdm.*` |
| Colori mazzo assenti / pallini grigi | Scryfall non raggiungibile o dati carte <60% | `App.jsx` fetchCards, `deckColors()` |
| Terre base | Plains/Island/Swamp/Mountain/Forest sempre possedute, escluse dalla collezione (le Snow-Covered no) | `normalize.js` isBasic(), `matcher.js` alloc() |
| Prezzi assenti ("—") | Scryfall senza prezzo EUR per quella stampa | `scryfall.js` slim(): eur → eur_foil |
| Pagina vecchia dopo un deploy | service worker | `public/sw.js` (rete prima per le pagine); cambiare `V` per svuotare le cache |
| Badge tier/trend assenti | JSON meta generato prima della v0.4 | rilanciare il sync |
| CSV non riconosciuto | intestazione colonne nuova | `parser.js` NAME_COLS / QTY_COLS |

## Comandi
`npm install` · `npm run dev` · `npm run build` · `npm test`

## Sync meta automatico (dalla v0.9.0)
- `scripts/sync-meta.mjs`: clone parziale (depth 1, blob:none, sparse) di github.com/Jiliac/MTGODecklistCache, solo le cartelle `Tournaments/*/AAAA/MM/GG/` degli ultimi 60 giorni (~1000 file, ~10 s) + github.com/Badaro/MTGOFormatData (regole archetipi). Formati: standard, pioneer, modern, pauper, legacy, vintage (filtro su `Tournament.Formats`).
- Classificatore = porta JS di MTGOArchetypeParser: condizioni InMainboard/DoesNotContain/OneOrMore…/TwoOrMore…, varianti, conflitto → regola più semplice, fallback generici (CommonCards, soglia 10%). Colore = colori presenti sia nelle terre sia nelle magie (card_colors.json + color_overrides.json); nome = colore + archetipo se IncludeColorInName (es. Mono Blue Faeries, Dimir Faeries).
- Doppioni (stessa lista in melee.gg e mtgo.com) eliminati con chiave giocatore+torneo+data+75. Liste < 60 carte scartate. Quota = mazzi archetipo / mazzi analizzati (non riconosciuti inclusi). Lista mostrata = la più recente tra top 8 / 5-0, altrimenti la più recente.
- Fallback MTGTop8 per formato se: non riconosciuti > 15%, meno di 50 mazzi, errore di download/regole. Commander sempre MTGTop8. Cambio fonte → trend azzerato per un giorno (nomi non confrontabili).
- JSON: `source` 'MTGODecklistCache' | 'MTGTop8', `decksAnalyzed`, `unknownPct`; ogni mazzo ha `count` (liste trovate). Id stabile `<formato>-<slug nome>`.
- Storico (dalla v0.12): si scaricano 84 giorni; `historyWeeks` (12 inizi settimana) nel JSON e `history` per mazzo (quota % per settimana, null se < 20 liste). Finestra principale resta 60 giorni.
- Matchup (dalla v0.12): dai `Rounds` dei tornei (MTGO Challenge top 8, melee.gg, CardsRealm), giocatore → archetipo nello stesso torneo. Per mazzo: `field` [V,S,P] contro tutti (mirror esclusi), `mu` [[avversario,V,S,P]] con ≥3 partite tra i 30, `metaWr` = % pesata sulla quota degli avversari (matchup ≥5 partite, +5V/+5S virtuali per i campioni piccoli, copertura ≥30% del meta). UI: sparkline + "% vittorie" nelle schede, ordinamento "Migliori contro il meta", scheda "Andamento e matchup" nel dettaglio (components/Charts.jsx).
- Budget (v0.12): filtro "fino a X €" sul costo della mancolista (mazzi e rogue), `view.budget`.
- Dati carte (v0.12.3): a fine sync, `scripts/cards-data.mjs` scarica una volta il file Oracle Cards di Scryfall (bulk data, come chiede Scryfall) e scrive `public/meta/cards-<formato>.json` con le carte di mazzi e rogue (stesso formato compatto della cache, senza `t`). L'app li carica con i mazzi (metaDecks.js → seedCards, solo in memoria): niente chiamate API per le carte dei mazzi; l'API resta per le carte solo in collezione e per Correggi i nomi. Se Scryfall non risponde di notte, i file restano quelli del giorno prima e l'app ricade sull'API.
- Simboli di mana (v0.12.3): `src/mana-cost.css` + `src/fonts/mana-cost.woff2` (41 glifi, 7,5 KB invece di 408 KB), generati da `scripts/build-mana-subset.py` dal pacchetto mana-font. Rigenerarli se si usano nuovi simboli. v0.12.4: lo script parte da mana.woff2 e ricalcola il margine sinistro dei glifi (i bordi salvati nel font sono errati: senza correzione i simboli escono spostati a sinistra nei cerchi).
- Footer: crediti delle fonti + testo obbligatorio della Fan Content Policy di Wizards (in inglese).
- Workflow notturno: a ogni giro riattiva se stesso via API (`actions: write`) per evitare lo spegnimento dopo 60 giorni di inattività.
- Archetipi salvati: fino a 50 per formato (TOP_N in sync-meta e sync-mtgtop8; prima 30: con 30 il Tier 3, quota ≤ 0,2%, non compariva mai).
- Preferiti (v0.12.2): `mdm.pins` (id mazzo, in ordine di aggiunta). Sezione "I tuoi preferiti" sopra l'elenco, ignora filtri e ordinamento; i fissati escono da elenco e rogue. Stella in ogni scheda (PinButton, fuori dal pulsante della scheda) e nel dettaglio.
- Valuta (v0.12.1, selettore dalla v0.12.2 salvato in `mdm.currency`): lib/currency.js. Valuta da scelta salvata → ?currency= → fuso orario → paese della lingua → EUR in Europa, USD altrove. Prezzo di partenza: Cardmarket (eur) per EUR, GBP, CHF, valute nordiche/est Europa, TRY; TCGplayer (usd) per tutte le altre; conversione con cambi BCE (`public/meta/rates.json`, scritto ogni notte da sync-meta.mjs via frankfurter.dev; valori di riserva nel codice). Budget salvato in euro, mostrato come cifra tonda locale (localBudget). Usare sempre priceOf()/money(), mai card.eur direttamente.
- Ban (v0.12): Scryfall `legalities` → `bn`/`rs` nella cache carte (`mdm.cards.v4`). lib/bans.js: avviso mazzo con carte bannate nel suo formato, chip BAN in collezione, avviso "nuovi ban" una volta sola (`mdm.bansSeen`, la prima visita memorizza senza avvisare).
- Rogue della settimana (`rogue` nel JSON, max 12): archetipi fuori dai 30 più giocati + mazzi senza archetipo (nome = colori + carta simbolo, es. "5 Color Cleansing Wildfire") con almeno un top 8 o 5-0 negli ultimi 7 giorni di dati. Ordine: n. risultati, miglior piazzamento. Campi `results`, `best`, `signature` (non-terra ≥2 copie meno diffusa nel formato). Nell'app: sezione sotto l'elenco, ordinata per vicinanza alla collezione, esclusa da carte chiave e filtri.

## Sync MTGTop8 (Commander e fallback)
- `scripts/sync-mtgtop8.mjs`: per ogni formato legge `format?f=CODE` → periodo "Last 2 Months" → fino a 30 archetipi con % più alta (esclusi "Other…") → primo mazzo (più recente) di ogni archetipo → export `mtgo?d=ID` → `public/meta/<formato>.json`.
- Codici: standard ST, pioneer PI, modern MO, pauper PAU, legacy LE, vintage VI, commander cEDH. cEDH: la lista comandanti arriva via POST `cEDH_decks?f=cEDH&show=pop&meta=ID…` (stessi link `archetype?a=…`, valori in per mille ‰ convertiti in %); poi stesso flusso degli altri formati (comandante spostato nel main).
- % meta: letta solo come testo visibile (`>12 %<`), mai da attributi `style`.
- Tier (metodo pubblicato da MTGdecks, calcolato su TUTTI gli archetipi della pagina): Tier 1 = primi archetipi fino al 50% cumulato; Tier 2 = altri > 0,2%; Tier 3 = resto. Con le % intere di MTGTop8 il Tier 3 è raro nella top 30.
- Varianti: per ogni archetipo si leggono le ultime 15 liste; i nomi vengono normalizzati (`titleKey`: senza colori, "mono", punteggiatura, plurali). Se almeno 2 nomi compaiono ≥2 volte, ognuno (max 3) diventa un mazzo con `name` = nome più usato, `archetype` = archetipo MTGTop8, share = share archetipo × liste variante / liste lette. Es. Mono Blue Aggro → Mono Blue Delver + Mono Blue Faeries.
- Trend: `prev` = share dello stesso archetipo al giorno di sync precedente (`prevDate`); più sync nello stesso giorno non azzerano il confronto.
- robots.txt di MTGTop8 letto a inizio sync; un percorso vietato fa fallire il formato (dati precedenti mantenuti).
- MTGdecks NON viene letto in automatico (il loro robots.txt lo vieta): nell'app c'è solo un link di ricerca.
- Se un formato non restituisce mazzi, il suo JSON resta invariato.
- `.github/workflows/sync-meta.yml`: ogni notte 03:17 UTC + avvio manuale; commit solo se cambia qualcosa.
- Campi extra MetaDeck: `share` (% meta), `title` (nome lista originale), `url`.
- Debug: se il sito cambia HTML, si rompono le regex in `parseArchetypes` / `parseFirstDeck` / `parseMetaId` (test in `scripts/sync-mtgtop8.test.mjs`). Quando fallisce, lo script salva le pagine in `debug/` e la Action le committa: leggerle con `git pull`.
- Locale: `npm run sync-meta` (tutti) oppure `node scripts/sync-meta.mjs pauper`; solo MTGTop8: `node scripts/sync-mtgtop8.mjs pauper`. Cartella cache: env `META_CACHE` (default tmp).
- Dettaglio mazzo (v0.13.0): tab Lista/Mancolista; la Lista è testuale per default (`mdm.deckView`: text|visual), andamento e matchup sempre visibili nella colonna destra (`.detail-split`, sotto la lista su schermi <900px). Carte chiave: copie possedute/mancanti rispetto al playset (4, 1 in Commander; prezzi e lista copiata su quelle mancanti), vista elenco/immagini (`mdm.kcView`).
- v0.13.1: `.actions-top` (pulsanti sopra le liste, non più fissati in basso su mobile); anteprima carta al passaggio del mouse (`hoverProps` + `HoverCard` in DeckDetail, solo dispositivi con mouse); carte chiave: `have` = copie reali (anche oltre il playset), `need` = max(0, playset − have).
- Revisione UX v0.13.3–0.13.5: `ConfirmButton` sostituisce confirm(); `DeckList owned` (senza collezione: niente percentuale/barre, solo "Costo del mazzo"); `Trend history` ("nuovo" solo se il mazzo non ha almeno 2 settimane di storico prima dell'ultima); collezione: Esporta (CSV) + Importa da file (v0.13.6: unico ingresso per export e backup; scelta Aggiungi/Sostituisci se la collezione non è vuota, annullabile; drop su tutta la pagina); `.filters-toggle` su schermi <720px; risultati rogue tradotti (`rogue.place`).
- Menu a tendina (v0.13.8): `src/components/Picker.jsx` sostituisce tutti i <select> (lingua, valuta, Ordina, Budget, ordinamento collezione). La lista è in un portal su <body> con position: fixed (l'header ha clip-path e la taglierebbe); si chiude con clic fuori, scroll, resize, Esc.
- Mazzo misterioso del giorno (v0.14.0): `src/lib/daily.js` (pickDaily: hash formato+giorno locale sulla metà bassa del meta per quota + rogue; signatureOf/pickSignature (v0.14.1): non-terra ≥2 copie, prima per numero di copie (max 4) poi la meno diffusa, escluse le carte con una parola (≥4 lettere, singolare/plurale) in comune col nome del mazzo; usata anche da sync-meta per `signature` dei rogue (signatureCard resta per raggruppare i mazzi senza archetipo); untilMidnight) e `src/components/MysteryDeck.jsx`; `mdm.dailySeen` ricorda se l'hai aperto oggi (pallino rosso). Frasi in `daily.lines` (array, una al giorno).
- Giochi (v0.16.0): logica in `src/lib/fun.js` (test in fun.test.js): bumpStreak/liveStreak, guessDeck/revealOrder/shareGrid, weather (storico settimanale: ultima vs 4 settimane prima), almostThere, personality, deckProfile/quizMatch, ACHIEVEMENTS (22)/unlockedNow. Pagina mazzi (v0.16.1): colonna destra `.daily` ("Ogni giorno": MysteryDeck + `.game-btn` quiz/indovina che aprono `Modal`), `LuckyButton` dentro `MetaWeather` (children), `.rogue-jump` da solo sotto l'intestazione; (<dialog>) con `play/Quiz.jsx` o `play/GuessGame.jsx` (store `mdm.guess` tenuto in App per il badge sul pulsante). Traguardi: `play/Achievements.jsx` (<details>) nella collezione. Stato locale `mdm.fun`: streak, bestStreak, opens, lucky, quiz, guessWins, guessFirst, formats, completeMax, almost, seen (id mazzi aperti), rogueSeen, night, unlocked. Niente pagina Gioca, bustina o immagine da condividere (tolte su richiesta). Header: sotto 1000px selettori brevi, sotto 900px solo il simbolo del marchio.
- Statistiche (v0.17.0): di notte `scripts/stats.mjs` (test in stats.test.mjs) aggiunge ai mazzi `core` [[carta, copie]] (≥90% delle liste), `flex` [[carta, %, copie medie]] (25–90%), `lists`, `conv` [% giocatori, % top 8, n top 8] (tornei con classifica, no League) e al file del formato `stats` { cardsUp, cardsDown: [[carta, % ultime 2 sett., % 4 prima, settimanale…]], side: [[carta, %, Δ]] }; in syncCards scrive `public/meta/prices-<formato>.json` { dates, p: { carta: [EUR…] } } (60 giorni). App: `src/lib/stats.js` (health, valuePoints/bestBuys, converters, priceWatch, sideAgainst, coreWithOwned; test in stats.test.js), `StatsPage.jsx` (#/stats, voce "Statistiche"), `DeckInsights.jsx` nella colonna destra del mazzo. `loadMetaDecks` mette le statistiche del formato in `meta.stats`; `loadPrices(format)`.
- Collezione per stampa (v0.18.0): voci { name, qty, set?, num?, sid? } (`mergeCollection`, `entryKey` in normalize.js; il parser legge Set code/Edition/Collector number/Scryfall ID e "(SET) 123" nelle righe di testo). Dati: `fetchPrintings` + `getPrinting` (cache `mdm.cards.v5`, chiavi id:/p:/ps:), campi a/s/sn/n/r/d/v esposti come artist/set/setName/rarity/released/cmc. Ricerca e filtri in `src/lib/collection.js` (test in collection.test.js). Tag Scryfall: `scripts/tags.mjs` (una volta a settimana, elenco curato ORACLE_TAGS/ART_TAGS con nomi alternativi) → `public/meta/tags.json` { names, oracle, art, src }, caricato solo all'apertura dei Filtri. Backup CSV: Name,Qty,Set code,Collector number,Scryfall ID.
- Telefono (v0.18.2): main.jsx scrive --vvh/--vvtop e html.kb-open dalla visualViewport (iOS non ridimensiona con la tastiera); viewport meta con interactive-widget=resizes-content (Android). Modal: pushState all'apertura e chiusura con il tasto indietro (popstate); chiusura sul fondo solo se pointerdown e click partono dal fondo. Picker: si apre verso l'alto se sotto (meno la tabbar) manca spazio, maxHeight calcolata. GuessGame: niente autofocus su touch, classe .typing (carte in fila da 6), suggerimenti sopra il campo su ≤719px, pointerdown preventDefault sui suggerimenti per non perdere il focus.
- v0.19.0: `src/lib/deckDesc.js` (profilo mazzo: curva, creature, interazione; niente etichette di stile, provate e scartate perché sbagliavano), `src/lib/transfer.js` (collezione compressa deflate-raw + base64url in #/import/<codice>; App chiede Aggiungi/Sostituisci se la collezione non è vuota), `src/lib/tagsLoader.js` (tags.json condiviso da Collezione e pagina mazzo). `mdm.backup` { changes } contato in App.setCollection; promemoria in Collezione da 10 modifiche e 20+ carte. `Info` in Badges.jsx. Toast: un avviso con Annulla non viene coperto da uno semplice (che aspetta). DeckDetail/KeyCards: prop hasColl/hasCollection → classe tile-plain senza confronto.
