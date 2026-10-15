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
| **Backup e ripristino** (esporta CSV) | La collezione vive nel browser: serve una copia di sicurezza e un modo per spostarla su un altro dispositivo |

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
