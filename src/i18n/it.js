const p = (n, one, many) => n === 1 ? one : many
const carte = n => p(n, 'carta', 'carte')

export default {
  // generali
  skip: 'Vai al contenuto', home: 'Netdeckable, home', sections: 'Sezioni', format: 'Formato',
  'nav.decks': 'Mazzi', 'nav.keycards': 'Carte chiave', 'nav.collection': 'Collezione',
  done: 'Fatto', undo: 'Annulla', cancel: 'Annulla', close: 'Chiudi', download: 'Scarica', copyList: 'Copia lista', sort: 'Ordina', all: 'Tutti',
  language: 'Lingua', 'theme.toLight': 'Passa al tema chiaro', 'theme.toDark': 'Passa al tema scuro',
  'color.W': 'Bianco', 'color.U': 'Blu', 'color.B': 'Nero', 'color.R': 'Rosso', 'color.G': 'Verde', colorless: 'Incolore',
  colorsLoading: 'Colori in caricamento', manaCost: c => `Costo di mana ${c}`,
  noPrice: n => `${n} ${carte(n)} senza prezzo`,

  // elenco mazzi
  'sort.score': 'Più completi', 'sort.share': 'Più giocati', 'sort.cost': 'Meno costosi da finire',
  'decks.title': f => `I mazzi ${f} più vicini alla tua collezione`,
  'decks.srcCache': 'nei tornei MTGO, melee.gg e CardsRealm (dati MTGODecklistCache)', 'decks.srcTop8': 'su MTGTop8',
  'decks.intro': (n, src, date) => `I ${n} archetipi più giocati negli ultimi due mesi${date ? `, aggiornati il ${date}` : ''}.`,
  'decks.stale': d => `I dati del meta potrebbero non essere aggiornati: l'ultimo aggiornamento è di ${d} giorni fa.`,
  'decks.noCollB': 'Non hai ancora caricato la collezione.', 'decks.noColl': 'Per ora i mazzi sono in ordine di popolarità.',
  loadCollection: 'Carica la collezione',
  allTiers: 'Tutti i tier', onlyColors: 'Solo questi colori', colors: 'Colori', clearColors: 'Azzera',
  'decks.none': f => `Nessun mazzo disponibile per ${f}. Puoi aggiungerne uno a mano.`,
  'decks.noneFilter': 'Nessun mazzo con questi filtri.', 'decks.tryColor': 'Prova ad aggiungere un colore.',
  'decks.loadingScry': 'Carico colori e prezzi delle carte da Scryfall…',
  'decks.scryDown': 'Scryfall non risponde: colori, immagini e prezzi non sono disponibili. Il calcolo funziona lo stesso.',
  share: s => `${s}% del meta`, meterAria: (l, h, tot) => `${l}: ${h} su ${tot}`, rank: n => `Posizione ${n}`,
  costMore: n => `, più ${n} ${carte(n)} senza prezzo`, variantOf: a => `variante di ${a}`,
  need: n => n === 1 ? ['Ti manca ', ' carta'] : ['Ti mancano ', ' carte'], haveAll: 'Hai tutte le carte', complete: 'completo',

  // andamento
  'trend.newTitle': 'Non era tra i più giocati al sync precedente', 'trend.new': 'nuovo', 'trend.flat': 'stabile', 'trend.flatTitle': 'Stabile',
  'trend.title': (d, date) => `${d} punti rispetto al ${date}`,

  // dettaglio mazzo
  'group.creature': 'Creature', 'group.planeswalker': 'Planeswalker', 'group.spell': 'Istantanei e stregonerie',
  'group.permanent': 'Artefatti e incantesimi', 'group.land': 'Terre', 'group.other': 'Altre carte',
  'tile.owned': 'posseduta', 'tile.missing': 'mancante', 'tile.partial': n => `ne hai ${n}`,
  'detail.copied': 'Mancolista copiata', copyFail: 'Copia non riuscita: usa "Scarica"', 'detail.back': 'Tutti i mazzi',
  'detail.variant': a => `Variante di «${a}»`, 'detail.toComplete': p => `Per completarlo ${p}`,
  'detail.original': 'Lista originale', 'detail.mtgdecks': 'Cerca il mazzo su Google', view: 'Vista',
  'tab.list': 'Lista', 'tab.need': 'Mancolista', 'detail.onlyMissing': 'Mostra solo le carte che ti mancano',
  'detail.haveAll': 'Hai tutte le carte di questo mazzo.', 'detail.total': 'Totale stimato',
  'detail.hint': src => `La lista copiata si incolla su Scryfall o Moxfield. Prezzi indicativi ${src} (via Scryfall) della stampa più recente, convertiti nella tua valuta: le ristampe economiche possono costare meno.`,
  'detail.confirmDelete': 'Eliminare questo mazzo aggiunto da te?', 'detail.delete': 'Elimina mazzo', 'detail.file': 'mancolista',

  // carte chiave
  'kc.copied': 'Lista copiata', 'kc.title': f => `Carte chiave ${f}`,
  'kc.intro': 'Le carte che ti mancano e che compaiono in più mazzi del meta. Comprando queste ti avvicini a più mazzi con meno spesa. Le terre base sono escluse.',
  'kc.loadB': 'Carica la collezione', 'kc.load': ' per vedere solo le carte che ti mancano davvero.',
  'kc.scope': 'Mazzi considerati', 'kc.t12': 'Tier 1 e 2', 'kc.inDecks': n => `In ${n} mazzi:`, 'kc.more': n => ` e altri ${n}`, 'kc.total': 'Totale',
  'kc.none': 'Nessuna carta mancante è condivisa da almeno due mazzi: ottimo lavoro.', 'kc.noData': 'Nessun dato disponibile.',
  'kc.hint': 'Copie da comprare = quelle che ti mancano per un playset (4 copie, 1 in Commander).',
  'view.cards': 'Immagini delle carte', 'kc.own': (h, p, n) => `Ne hai ${h}/${p}, ne mancano ${n} per il playset completo`, 'kc.ownFull': h => `Ne hai ${h}: playset completo`, 'kc.need': n => `ne mancano ${n}`, 'kc.inN': n => `In ${n} mazzi`, 'kc.file': 'carte-chiave',

  // mazzo a mano
  'mi.err': 'Lista non riconosciuta: una carta per riga, con la riga "Sideboard" prima del side.', 'mi.defaultName': 'Mazzo aggiunto',
  'mi.added': 'Mazzo aggiunto', 'mi.imported': n => `${n} mazzi importati`, 'mi.badJson': 'File JSON non valido.',
  'mi.open': 'Aggiungi un mazzo a mano', 'mi.title': f => `Aggiungi un mazzo ${f}`, 'mi.name': 'Nome del mazzo', 'mi.list': 'Lista del mazzo',
  'mi.add': 'Aggiungi mazzo', 'mi.json': 'Importa JSON',

  // errore
  'err.title': 'Qualcosa non ha funzionato',
  'err.text': "La tua collezione è al sicuro, è salvata in questo browser. Ricarica la pagina; se l'errore si ripete, torna alla lista dei mazzi.",
  'err.reload': 'Ricarica', 'err.back': 'Torna ai mazzi',

  // collezione
  'coll.sort.name': 'Nome', 'coll.sort.qty': 'Copie', 'coll.sort.price': 'Valore',
  'coll.minus': n => `Togli una copia di ${n}`, 'coll.copiesOf': n => `Copie di ${n}`, 'coll.plus': n => `Aggiungi una copia di ${n}`,
  'coll.delete': n => `Elimina ${n} dalla collezione`, 'coll.deleteTitle': 'Elimina',
  'coll.spine': 'Sezioni della collezione', 'coll.spineSr': pc => ` carte, ${pc}%`,
  'binder.M': 'Multicolore', 'binder.C': 'Incolore', 'binder.L': 'Terre', 'binder.?': 'Senza dati',
  'type.all': 'Tutte', 'type.creature': 'Creature', 'type.spell': 'Istantanei e stregonerie', 'type.perm': 'Altri permanenti', 'type.land': 'Terre',
  'coll.noneRecognized': 'Nessuna carta riconosciuta. Scrivi una carta per riga, ad esempio "4 Lightning Bolt", oppure incolla un CSV con le colonne Name e Qty.',
  'coll.replaced': n => `Collezione sostituita: ${n} ${carte(n)}`, 'coll.added': n => `${n} ${p(n, 'carta aggiunta', 'carte aggiunte')}`,
  'coll.fileReady': f => `File "${f}" pronto: scegli se aggiungerlo o sostituire la collezione.`,
  'coll.checking': 'Controllo i nomi su Scryfall…', 'coll.maybe': (n, list) => `${n} (forse ${list.join(' o ')}?)`,
  'coll.unrecognized': (c, names, sec) => `Nomi non riconosciuti (${c}): ${names}. Sono troppo diversi da qualsiasi carta: correggili a mano o eliminali dalla sezione "${sec}".`,
  'coll.fixed': n => `Nomi corretti: ${n}`, 'coll.allGood': 'Tutti i nomi erano già giusti',
  'coll.scryErr': m => `Scryfall non risponde (${m}). Riprova tra qualche minuto.`, 'coll.removed': n => `${n} eliminata`,
  'coll.addCards': 'Aggiungi carte', 'coll.uploadB': 'Carica un file', 'coll.uploadExt': ' .csv o .txt ',
  'coll.uploadMore': 'oppure trascinalo qui. Vanno bene gli export di ManaBox, Moxfield, Deckbox, Dragon Shield e Cardmarket.',
  'coll.listAria': 'Elenco carte',
  'coll.placeholder': "Oppure scrivi o incolla l'elenco, una carta per riga, con le copie prima o dopo il nome:\n4 Lightning Bolt\nCounterspell 2\nSnow-Covered Island x1",
  'coll.addTo': 'Aggiungi alla collezione', 'coll.replace': 'Sostituisci collezione',
  'coll.importHint': 'Le terre base non servono: le consideriamo sempre possedute. Per spostare la collezione su un altro dispositivo scarica il backup e caricalo lì con "Sostituisci collezione".',
  'coll.title': 'La tua collezione',
  'coll.emptyIntro': 'Aggiungi le carte che possiedi per scoprire quali mazzi puoi completare. La collezione resta salvata solo su questo dispositivo.',
  'coll.summary': (tot, dist) => `${tot} carte, ${dist} diverse`, 'coll.value': ', valore stimato ', 'coll.savedHere': 'Salvata solo su questo dispositivo.',
  'coll.fixNames': 'Correggi i nomi', 'coll.backup': 'Backup', 'coll.backupDone': 'Backup scaricato', 'coll.file': 'collezione',
  'coll.clear': 'Svuota', 'coll.confirmClear': 'Svuotare tutta la collezione?', 'coll.cleared': 'Collezione svuotata',
  'coll.loadingImg': (d, tot) => `Carico immagini e prezzi da Scryfall… ${d}/${tot}`,
  'coll.scryDown': 'Scryfall non risponde: immagini e prezzi non sono disponibili, la collezione funziona lo stesso.',
  'coll.search': 'Cerca una carta', 'coll.typeAria': 'Tipo di carta', 'coll.grid': 'Griglia', 'coll.list': 'Elenco',
  'coll.noMatchQ': q => `Nessuna carta corrisponde a "${q}".`, 'coll.noMatch': 'Nessuna carta corrisponde a questo filtro.',
  'coll.cards': n => `${n} ${carte(n)}`, 'coll.more': n => `Mostra altre carte (${n} rimanenti)`,

  // rogue della settimana
  'rogue.title': 'Rogue piccanti della settimana',
  'rogue.intro': n => `Mazzi fuori dai ${n} più giocati che negli ultimi 7 giorni hanno fatto top 8 in un torneo o 5-0 in una League. In ordine di vicinanza alla tua collezione.`,
  'rogue.results': n => `${n} ${p(n, 'risultato', 'risultati')} in settimana`, 'rogue.best': r => `migliore: ${r}`, 'rogue.signature': c => `carta simbolo: ${c}`,
  'rogue.jump': n => `Scopri ${p(n, 'il rogue piccante', `i ${n} rogue piccanti`)} della settimana`,

  // filtro budget, storico, matchup, ban
  budget: 'Budget', 'budget.any': 'Qualsiasi', 'budget.max': e => `fino a ${e}`, 'sort.meta': 'Migliori contro il meta',
  wrShort: p => `${p}% vittorie`, 'tab.meta': 'Andamento e matchup',
  'hist.title': 'Quota del meta, ultime 12 settimane', 'hist.point': (d, v) => `Settimana dal ${d}: ${v}`, 'hist.na': 'dati insufficienti',
  'hist.aria': (a, b) => `Quota del meta passata da ${a}% a ${b}% nelle ultime 12 settimane`,
  'mu.title': 'Contro cosa vince', 'mu.meta': 'vittorie contro il meta', 'mu.metaHint': 'media pesata su quanto è giocato ogni avversario, corretta per i matchup con poche partite',
  'mu.field': (p, n) => `${p}% su ${n} partite contro tutti`, 'mu.row': (p, n) => `${p}% · ${n} partite`, 'mu.few': 'pochi dati',
  'mu.note': 'Partite di tornei con turni pubblicati (MTGO Challenge, melee.gg, CardsRealm) negli ultimi due mesi. Mirror esclusi; una patta vale mezza vittoria.',
  'mu.none': 'Ancora pochi dati sulle partite di questo mazzo.', 'mu.showAll': n => `Mostra tutti (${n})`,
  'ban.short': 'Carta bannata', 'ban.deck': c => `Contiene carte bannate in questo formato: ${c}`, 'ban.card': f => `Bannata in ${f}`, 'ban.restricted': f => `Ristretta in ${f}`,
  'ban.newTitle': 'Nuovi ban sulle tue carte', 'ban.newItem': (c, f) => `${c}: bannata in ${f}`, 'ban.dismiss': 'Ok, ho capito',
  currency: 'Valuta', 'pins.title': 'I tuoi preferiti', 'pin.add': n => `Aggiungi ${n} ai preferiti`, 'pin.remove': n => `Togli ${n} dai preferiti`,
  'footer.lists': 'Liste', 'footer.archetypes': 'Archetipi', 'footer.cards': 'Carte, immagini e prezzi', 'footer.rates': 'Cambi',
  'rogue.place': n => `${n}° posto`,
  'footer.tiers': 'Tier: metodo MTGdecks',
}
