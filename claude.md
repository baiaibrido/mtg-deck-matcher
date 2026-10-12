# MTG Deck Matcher — claude.md

App web (React + Vite, solo frontend). Confronta la collezione dell'utente con i mazzi meta di un formato e mostra i 5 mazzi più completabili + la mancolista.

## Project map
```
claude.md                  questo file (contesto per Claude)
docs/system-map.md         grafo dipendenze moduli
public/meta/index.json     elenco formati
public/meta/<format>.json  mazzi meta per formato (aggiornati ogni notte dalla GitHub Action)
scripts/sync-mtgtop8.mjs   sync MTGTop8 → public/meta (+ test .test.mjs)
src/
  main.jsx                 entry: font (Marcellus, Alegreya Sans), mana-font, stili
  App.jsx                  layout, stato globale, rotte, toast, fetch Scryfall per i mazzi mostrati
  styles.css               design system (token in :root) + tutti gli stili
  state/useLocal.js        useState persistito su localStorage
  state/useRoute.js        rotte nell'hash: #/mazzi, #/collezione, #/mazzo/<id> (tasto indietro ok)
  lib/normalize.js         normalizzazione nomi carta (chiave di match)
  lib/parser.js            parser collezione (CSV / testo) e decklist (main/side)
  lib/scryfall.js          client Scryfall + cache carte (localStorage 'mdm.cards.v2')
  lib/deckInfo.js          colori del mazzo, cornice, gruppi per tipo, simboli di costo
  lib/metaDecks.js         caricamento JSON meta
  lib/matcher.js           MOTORE: allocazione copie, ratio, score, ranking
  lib/export.js            export mancolista (testo, TCGplayer, .txt)
  components/DeckList.jsx  lista Top 5 con cornici colorate + Meter (barre)
  components/DeckDetail.jsx dettaglio: Lista (per tipo, immagini) / Mancolista + azioni
  components/CollectionManager.jsx import file/testo, ricerca, stepper quantità
  components/MetaImporter.jsx aggiunta mazzo a mano
  components/Mana.jsx      ManaCost, ColorPips (mana-font)
  components/Icons.jsx     icone SVG inline
```

## Design system (styles.css)
- Tema "tappetino da gioco": --felt fondo, --baize superfici, --rail bordi, --bone testo, --lichen secondario, --brass accento oro.
- Colori mana per le cornici: --mana-w/u/b/r/g, --mana-gold (3+ colori), --mana-c (incolore). Stato carte: --ok / --part / --no.
- Font: Marcellus (titoli, nomi mazzi, numeri grandi), Alegreya Sans (UI). Numeri lining.
- Cornice mazzo = deckColors() → frameOf(): 1 colore pieno, 2 colori gradiente ibrido, 3+ oro.
- Mobile < 720px: tab bar in basso, azioni mancolista sticky. Animazione "distribuzione carte" sulla lista; prefers-reduced-motion rispettato.

## Data models
```js
CardEntry   = { name: string, qty: number }
Collection  = CardEntry[]                       // localStorage 'mdm.collection'
MetaDeck    = { id, name, format, source, url?, updated?, main: CardEntry[], side: CardEntry[] }
// File JSON meta: main/side come stringhe "4 Lightning Bolt" (convertite da metaDecks.js)
ScoredDeck  = { deck, main: Alloc, side: Alloc, score, missing: Row[] }
Alloc       = { rows: Row[], have, total, ratio }
Row         = { name, qty, have, missing }
ScryCard    = { name, img, uri, ci, type, cost } // cache localStorage 'mdm.cards.v2'
```
Chiavi localStorage: `mdm.format`, `mdm.collection`, `mdm.userDecks`, `mdm.cards.v2`.

## Core logic (lib/matcher.js)
1. `toOwnedMap(collection)` → Map(nomeNormalizzato → copie).
2. Per ogni mazzo si clona il pool di copie possedute; si alloca PRIMA il main, poi il side
   (una copia non conta due volte se la carta è sia in main che in side).
3. `M_main = Σ min(owned, req) / totaleMain` (60 di norma), `M_side = Σ min(owned, req) / totaleSide` (15).
   Side vuoto → `M_side = 0`.
4. `score = M_main·0.85 + M_side·0.15`. Garantisce: 100% main + 0% side (0.85) > 75% main + 100% side (0.7875).
5. Ordinamento: score desc, poi M_main desc. Top 5.

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
| Terre base mancanti | la collezione non le elenca | aggiungere `20 Mountain` ecc. alla collezione |

## Comandi
`npm install` · `npm run dev` · `npm run build` · `npm test`

## Sync meta automatico (MTGTop8)
- `scripts/sync-mtgtop8.mjs`: per ogni formato legge `format?f=CODE` → periodo "Last 2 Months" → i 20 archetipi con % più alta (esclusi "Other…") → primo mazzo (più recente) di ogni archetipo → export `mtgo?d=ID` → `public/meta/<formato>.json`.
- Codici: standard ST, pioneer PI, modern MO, pauper PAU, legacy LE, vintage VI, commander cEDH. cEDH: la lista comandanti arriva via POST `cEDH_decks?f=cEDH&show=pop&meta=ID…` (stessi link `archetype?a=…`, valori in per mille ‰ convertiti in %); poi stesso flusso degli altri formati (comandante spostato nel main).
- % meta: letta solo come testo visibile (`>12 %<`), mai da attributi `style`.
- Se un formato non restituisce mazzi, il suo JSON resta invariato.
- `.github/workflows/sync-meta.yml`: ogni notte 03:17 UTC + avvio manuale; commit solo se cambia qualcosa.
- Campi extra MetaDeck: `share` (% meta), `title` (nome lista originale), `url`.
- Debug: se il sito cambia HTML, si rompono le regex in `parseArchetypes` / `parseFirstDeck` / `parseMetaId` (test in `scripts/sync-mtgtop8.test.mjs`). Quando fallisce, lo script salva le pagine in `debug/` e la Action le committa: leggerle con `git pull`.
- Locale: `npm run sync-meta` oppure `node scripts/sync-mtgtop8.mjs pauper`.
