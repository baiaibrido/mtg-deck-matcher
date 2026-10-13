# MTG Deck Matcher — claude.md

App web (React + Vite, solo frontend, PWA). Confronta la collezione dell'utente con i mazzi meta di un formato: Top 5 / tutti (fino a 30) con filtri, tier, trend, costo per completare, mancolista, carte chiave. Piano: `docs/ROADMAP.md`.

## Project map
```
claude.md                  questo file (contesto per Claude)
docs/system-map.md         grafo dipendenze moduli
public/meta/index.json     elenco formati
public/meta/<format>.json  mazzi meta per formato (aggiornati ogni notte dalla GitHub Action)
public/sw.js               service worker (offline: rete-poi-cache per pagine e meta, cache per assets e immagini)
public/manifest.webmanifest + public/icons/  PWA installabile
scripts/sync-mtgtop8.mjs   sync MTGTop8 → public/meta: tier, trend, robots.txt (+ test .test.mjs)
.github/workflows/         sync-meta.yml (notturno), test.yml (test + build a ogni push)
src/
  main.jsx                 entry: font (Marcellus, Alegreya Sans), mana-font, stili
  App.jsx                  layout, stato, rotte, toast, vista Top 5/Tutti + filtri, fetch Scryfall (prima i mazzi in vista, poi tutti)
  styles.css               design system (token in :root) + tutti gli stili
  state/useLocal.js        useState persistito su localStorage
  state/useRoute.js        rotte nell'hash: #/mazzi, #/carte, #/collezione, #/mazzo/<id> (tasto indietro ok)
  lib/normalize.js         normalizzazione nomi carta (chiave di match)
  lib/parser.js            parser collezione (CSV / testo) e decklist (main/side)
  lib/scryfall.js          client Scryfall + cache compatta con prezzi (localStorage 'mdm.cards.v3', scadenza 3 giorni)
  lib/deckInfo.js          colori del mazzo, cornice, gruppi per tipo, simboli di costo, missingCost(), euro()
  lib/keyCards.js          carte mancanti condivise da più mazzi (terre base escluse)
  lib/metaDecks.js         caricamento JSON meta
  lib/matcher.js           MOTORE: allocazione copie, ratio, score, ranking
  lib/export.js            export mancolista (testo, TCGplayer, .txt) + backup collezione CSV
  components/DeckList.jsx  lista Top 5 con cornici colorate + Meter (barre)
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
Chiavi localStorage: `mdm.format`, `mdm.collection`, `mdm.userDecks`, `mdm.view` (modo/ordinamento/filtri), `mdm.collView` (vista/ordine/tipo collezione), `mdm.cards.v3` (max 8000 carte).

## Core logic (lib/matcher.js)
1. `toOwnedMap(collection)` → Map(nomeNormalizzato → copie).
2. Per ogni mazzo si clona il pool di copie possedute; si alloca PRIMA il main, poi il side
   (una copia non conta due volte se la carta è sia in main che in side).
3. `M_main = Σ min(owned, req) / totaleMain` (60 di norma), `M_side = Σ min(owned, req) / totaleSide` (15).
   Side vuoto → `M_side = 0`.
4. `score = M_main·0.85 + M_side·0.15`. Garantisce: 100% main + 0% side (0.85) > 75% main + 100% side (0.7875).
5. Ordinamento: score desc, poi M_main desc, poi popolarità. Top 5.
6. Terre base lisce (Plains, Island, Swamp, Mountain, Forest): sempre possedute, non consumano copie, escluse dalla collezione (parser + setCollection in App). Le Snow-Covered e Wastes contano normalmente.

## Normalizzazione nomi (lib/normalize.js)
minuscolo, senza accenti, apostrofi uniformati, spazi compressi, solo faccia frontale (`A // B` → `a`).
Scryfall (pulsante "Normalizza") corregge refusi: `/cards/collection` (75 per richiesta) + `/cards/named?fuzzy` per i non trovati.

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

## Sync meta automatico (MTGTop8)
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
- Locale: `npm run sync-meta` oppure `node scripts/sync-mtgtop8.mjs pauper`.
