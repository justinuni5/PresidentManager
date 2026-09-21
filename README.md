# President Manager

Gioco manageriale di calcio in stile "Football Manager light", ambientato nella piramide calcistica italiana. Il giocatore è **presidente-allenatore**: gestisce club e squadra. Blueprint completo in [docs/blueprint.md](docs/blueprint.md), visione d'insieme consolidata nel [Game Design Document](docs/GDD.md).

**Nota importante:** questa codebase HTML/JS+React è **solo il prototipo**, usato per validare meccaniche e design. La versione finale del gioco sarà sviluppata in Godot (probabile) o Unity — vedi [blueprint §2.1](docs/blueprint.md#21-nota-strategica-questo-stack-è-solo-il-prototipo).

## Avvio

```bash
npm install
npm run dev      # dev server su http://localhost:5173
npm run build    # build di produzione in dist/
```

## Stato attuale — v0.8 + fondazione multi-stagione/database

Fondazione appena aggiunta:

- **Continuità tra stagioni:** a campionati conclusi si può iniziare l'anno successivo; vengono archiviati classifiche e numeri stagionali dei giocatori, poi azzerati i contatori e rigenerati i calendari.
- **Promozioni e retrocessioni configurabili:** Eccellenza e Promozione scambiano una squadra; i collegamenti fra categorie sono descritti dal database e supportano più gironi allo stesso livello.
- **Catalogo mondiale e scelta dei paesi:** la nuova carriera seleziona quali paesi simulare. Il database iniziale contiene l'Italia del prototipo e un paese di esempio vuoto da compilare.
- **Database JSON esterno e modulare:** paesi, competizioni, collegamenti, club e giocatori manuali vivono in file separati dentro [`src/game/database/`](src/game/database/). Ogni club può avere una `forzaMedia` 1–99 distinta dalla reputazione; il valore del campionato resta la riserva per i club non ancora calibrati. Guida ed esempi in [`docs/database-editor-guide.md`](docs/database-editor-guide.md); controllo con `npm run database:validate`.
- **Calibrazione multidivisione di Ventidue:** `npm run harness:multidivisione -- 3` simula separatamente Serie A, B, C, una Serie D di laboratorio ed Eccellenza, senza attivarle nella carriera. Il motore scala errori tecnici, organizzazione difensiva e qualità delle occasioni dalla `forzaMedia` della competizione; il campione corrente da 5.256 partite produce 2,07–2,46 gol e 10,7–13,0 tiri per squadra, con precisione passaggi dall'83,4% della A al 73,8% dell'Eccellenza. Circa il 22–26% dei gol arriva dal 76' in poi; i portieri naturali non vengono più impiegati nei ruoli di movimento. Report in [`tools/harness/baseline/multidivisione.json`](tools/harness/baseline/multidivisione.json).
- **Lavagna a due punte:** la linea offensiva offre tre veri slot ST (sinistro, centrale e destro). I moduli a due punte occupano i due laterali; i moduli con un solo centravanti usano lo slot centrale.
- **Economia Serie A:** valori dei giocatori calibrati su overall, età, potenziale, reputazione e posizione (portieri meno costosi, attaccanti più costosi), stipendi distinti dal cartellino, capienze specifiche dei 20 stadi, biglietti e sponsor proporzionati al club. Dei 900 milioni di diritti TV simulati, 765 milioni arrivano all'inizio e 135 milioni vengono ripartiti a fine stagione in base a classifica e punti; la ripartizione avanzata multi-paese resta da sviluppare. La pagina Sponsor mostra ricavi annui, spazi occupati e valore totale delle proposte. Metodo e fonti in [`docs/economia-serie-a.md`](docs/economia-serie-a.md); verifica con `npm run economy:smoke`.
- **Passaggio di consegne:** attività che puoi continuare manualmente, con righe di esempio e controlli, in [`docs/prossimi-passi-manuali.md`](docs/prossimi-passi-manuali.md).
- **Compatibilità:** i salvataggi precedenti vengono migrati fino al formato v22; gli stipendi già firmati e i valori manuali restano intatti. Le vecchie carriere con la Serie A ricevono la Serie B già popolata, con le giornate trascorse ricostruite senza retrocedere la data della carriera. Ogni nuova carriera memorizza id e versione del database scelto.
- **Paesi e nazionalità:** catalogo ISO completo più Kosovo, con id stabili; ogni giocatore è collegato alla nazionalità primaria e può avere nazionalità secondarie. Paesi e nazionalità sono ricercabili e cliccabili; la pagina nazionale mostra giocatori, club, competizioni e la base per albo d'oro e record delle future selezioni. Le bandiere cercano automaticamente SVG locali tramite codice ISO e ripiegano sull'emoji se l'asset manca.
- **Loghi club:** `logoPng` nei dati del club carica uno stemma da `public/assets/club/`, ridimensionato automaticamente con fallback al badge generato.
- **Storia giocatore per stagione:** la tabella carriera mostra una riga per ogni annata, compresa quella in corso, con club, presenze, gol, assist e media voto.
- **Agenda e competizioni:** Calendario è ora una vista mensile di partite, allenamenti, scadenze e promemoria; Partite conserva la lista verticale delle gare. Competizioni mostra soltanto i tornei ai quali partecipa il club e ogni torneo ha pagine interne distinte per panoramica, classifica, partite, statistiche, informazioni e albo d'oro. Le graduatorie individuali aprono classifiche dettagliate fino ai primi 30; l'Albo d'oro separa vincitori, record storici e premi.
- **Numeri di maglia:** numeri unici 1–99 per club, con deposito obbligatorio il giorno prima della prima giornata e possibilità di delegare l'assegnazione al viceallenatore. Dopo il deposito la schermata si chiude e si torna alla pagina precedente.
- **Resoconto post-partita:** i messaggi aprono con un racconto sintetico dell'andamento della gara, seguito dal riepilogo di marcatori, cartellini e migliore in campo.
- **Coppe nazionali attive:** il database configura partecipanti e turno d'ingresso per campionato, bye, gare secche o andata/ritorno, date, storia, logo, trofeo e colori. Il motore gestisce sorteggi, rigori, avanzamento, albo d'oro e rollover. Le competizioni continentali restano preparabili ma non ancora simulabili.
- **Ricerca e navigazione permanente:** la barra superiore trova giocatori, club, staff, competizioni, premi e tutte le sezioni del gioco; `Ctrl+K` la mette subito a fuoco. Le competizioni trovate dalla ricerca si aprono come pagine autonome, comprese quelle alle quali il club non partecipa.

Prima base gestionale (salvataggio v15):

- **Sponsor:** offerte per petto, maniche e kit, contratti pluriennali, slot esclusivi, obiettivi sportivi e offerta del Comune con effetto sul rapporto col Sindaco.
- **Stadio:** capienza e affluenza, proprietà comunale/club, affitto implicito sugli incassi, sponsor bordocampo, bar/store, bus e minibus con costi e benefici reali.
- **Allenamento:** focus e intensità, crescita progressiva limitata dal potenziale, influenza di età/professionalità/vivaio, condizione atletica e familiarità tattica applicata dal motore Ventidue.
- **Finanze:** registro unico per sponsor, botteghino, bar, trasferte, mezzi, stipendi e mercato, con riepilogo per categoria.
- **Armonia Settore:** gerarchia della rosa, rilevamento del malcontento, promesse con scadenza e conseguenze sul morale; il morale individuale incide ora sul rendimento in partita.
- Controllo dedicato: `npm run management:smoke`.

Novità della v0.8:

- **Profilo giocatore a 3 tab** — *Overview* (attributi, come prima), *Trasferimento* (offerta diretta per i giocatori altrui con giudizio scout; per i tuoi: **metti sul mercato** con prezzo richiesto indicativo e ritiro; elenco delle **squadre interessate** calcolato dai bisogni di rosa reali; avviso se c'è un'offerta pendente), *Storia* (tappe di carriera con periodo, presenze/gol/assist per squadra e **cifra del trasferimento nell'anno del passaggio**)
- **Vendite** — un giocatore messo sul mercato attira molte più offerte CPU (le squadre interessate si fanno avanti; la richiesta, se ragionevole, viene spesso assecondata ma mai vincolata); badge "Sul mercato" nel profilo e riepilogo dei giocatori in vendita nella sezione Mercato

Novità della Fase 4:

- **Mercato trasferimenti** ([mercato.js](src/game/mercato.js), [Mercato.jsx](src/ui/Mercato.jsx)) — finestre estiva/invernale; ricerca giocatori con filtri (ruolo, vivai inclusi, budget) e giudizio scout; **offerte dell'utente dal profilo giocatore** con accettazione/controfferta/rifiuto (valutazione del venditore: pezzi pregiati e reparti corti costano di più, contratti in scadenza meno); **CPU attive**: valutano i bisogni di rosa, comprano e vendono tra loro (trasferimenti ufficiali e rumor nel feed) e fanno **offerte formali all'utente** — eventi urgenti con scadenza che fermano l'avanzamento finché non rispondi. Rifiutare un'offerta importante per la carriera del giocatore ne abbassa il morale (blueprint 4.5). Guardie sulla rosa: non si scende sotto una squadra schierabile
- **Staff** ([staff.js](src/game/staff.js), [Staff.jsx](src/ui/Staff.jsx)) — scout, staff medico, preparatore atletico, vice-allenatore (livelli 1-5, stipendio nel monte): lo scout dà giudizi in stelle sul potenziale (accuratezza per livello), il medico accorcia le prognosi (-7%/livello), il preparatore alza la forma media, il vice dà un bonus in partita
- **Fix**: formazione automatica sugli slot correnti con priorità idoneità ruolo → OVR → importanza in rosa; slot della griglia visibili solo durante il drag (o con selezione attiva); lista Titolari drag-abile accanto alla panchina; **obiettivi a 7 categorie** ("Vittoria assicurata" → "Stringere i denti"), tutte sempre selezionabili con badge "Rischioso"/"Poco credibile" fuori dal range della previsione

Novità della v0.6:

- **Inizio stagione in ufficio** ([Ufficio.jsx](src/ui/Ufficio.jsx), [stagione.js](src/game/stagione.js)) — evento urgente che blocca l'avanzamento a ogni inizio stagione: il presidente fissa **liberamente** l'obiettivo con la previsione dello staff come riferimento (forza rosa + reputazione + budget), poi si presenta a squadra e tifosi con un **discorso a scelta** (5 toni, ognuno con bersagli morale specifici via [morale.js](src/game/morale.js) — stesso principio delle future conferenze stampa). Obiettivo molto sopra la previsione = piazza che sogna ma pressione sul gruppo; obiettivo timido = tifosi delusi. A fine stagione arriva il **verdetto**: raggiunto (o mancato) muove morale e notizie, e un obiettivo prudente centrato con margine enorme delude comunque la piazza
- **Griglia tattica stile FM** — niente più menu a tendina: 24 slot semi-fissi sul campo (POR, linea difensiva, mediana, centrocampo, trequarti, attacco); trascini i giocatori sugli slot e **il modulo risulta da dove li posizioni** (etichetta derivata, es. 4-1-2-2-1). Giocatori mostrati con **sagoma a maglia** nei colori sociali ([Maglia.jsx](src/ui/Maglia.jsx)), anello di affinità ruolo, panchina come zona di drop per togliere dal campo
- **Cronaca completa** — l'intervallo è uno stop esplicito ("Intervallo — finestra cambi") e compare in cronaca; **tutte le sostituzioni** (utente e CPU) sono eventi della partita, visibili in cronaca, nel dettaglio partita e salvate anche per le gare CPU (simulate in due tempi con cambi all'intervallo)

Novità della Fase 3:

- **15 ruoli specifici** ([ruoli.js](src/game/ruoli.js)) — POR, TS, DC, TD, LWB, RWB, CDC, CM, CAM, LM, RM, CF, ATT, RW, LW, con macro-ruolo di reparto per motore e UI
- **Correlazione ruoli per giocatore** — `giocatore.ruoli` è un'istanza personale (naturale primario, naturali extra rari, forti non naturali pescati dal grafo con probabilità, non giocabili). Il DC non è mai correlato all'attacco; gli Under 13 sono senza vincoli. L'affinità col ruolo dello slot moltiplica il rendimento in partita (1 / 0.92 / 0.82 / 0.6 / 0.3). L'allenamento per cambiare ruolo arriverà in Fase 5
- **Tattica** ([Tattica.jsx](src/ui/Tattica.jsx)) — lavagna con campo SVG, drag & drop (o doppio click) tra titolari e panchina, anelli di affinità, cambio modulo con rimappatura automatica, istruzioni di squadra (pressing/baricentro, con effetto reale sul motore), formazione automatica. La tattica salvata guida l'XI in partita
- **Match view 2D** ([PartitaLive.jsx](src/ui/PartitaLive.jsx), [Campo2D.jsx](src/ui/Campo2D.jsx)) — scelta a ogni partita tra "Guarda in 2D" e "Salta al risultato". La partita si gioca a segmenti (30', 45', 70', 90') con **finestre cambi** (max 5 sostituzioni, anche la CPU cambia); campo con pallina animata per evento + cronaca testuale
- **Ricerca globale** ([RicercaGlobale.jsx](src/ui/RicercaGlobale.jsx)) — nella barra superiore: giocatori, squadre, staff (allenatori/presidente) e campionati, ogni risultato click-through al dettaglio

Novità della v0.4:

- **Sezione Club** ([Club.jsx](src/ui/Club.jsx)) — presidente-allenatore (figura unica, nessun proprietario separato), obiettivo di stagione fissato dal consiglio in base alla forza della rosa, finanze essenziali, morale squadra e tifosi (mosso dai risultati), bacheca trofei e storico piazzamenti (si popolano a fine stagione)
- **Navigazione contestuale** — il nome del presidente è cliccabile ovunque e porta al Club; i riferimenti a un campionato (es. "Eccellenza" in Dashboard) aprono la sezione Campionato sulla lega giusta; la Dashboard include la classifica con lo stesso selettore lega del Campionato
- **Centro Sviluppo per fascia** — tab U13/U17/U19, ognuna con tattica propria (modulo, indipendente dalla prima squadra), rosa da 8 giocatori e **campionato specchio**: stesse squadre CPU della prima squadra in versione giovanile, calendario sincronizzato e risultati semplificati giocati in automatico (motore dedicato rimandato)

Novità della Fase 2:

- **Motore di simulazione** ([engine.js](src/game/engine.js)) — a statistiche: forze attacco/centrocampo/difesa dal miglior undici per modulo, forma, fattore campo, gol via Poisson. Genera eventi testuali con minuto e protagonista: gol con assist, occasioni fallite, parate, pali, gol annullati dal VAR, cartellini, infortuni — non solo i gol, così la tensione resta fino alla fine
- **Conseguenze partita** — voti (influenzati dalla costanza nascosta), statistiche individuali (presenze/gol/assist/media voto), forma, morale, infortuni con prognosi in giorni e recupero automatico
- **Avanzamento "al prossimo evento importante"** ([avanzamento.js](src/game/avanzamento.js)) — il bottone Avanza salta al matchday simulando internamente la routine dei giorni intermedi (recuperi, deriva forma); la barra diventa verde al matchday e propone "vai alla partita"
- **Partita live** ([PartitaLive.jsx](src/ui/PartitaLive.jsx)) — pre-gara con formazioni, cronaca a eventi rivelati progressivamente (con "salta al risultato"), risultato finale e gli altri campi della giornata
- **Giornata completa** — tutte le partite CPU di entrambe le leghe si giocano insieme alla tua; classifica, capocannonieri, assist, media voto e notizie si aggiornano di conseguenza; a fine campionato viene proclamato il campione

Dalle fasi precedenti:

- **Main menu** — nuova carriera, continua partita, cancella salvataggio
- **Attributi dettagliati** — 10 tecnici, 7 fisici, 13 mentali, 6 da portiere (solo POR), più gli attributi nascosti; overall pesato per ruolo. Il database manuale può usare la sola `abilitaAttuale`, sei macro per i giocatori di movimento o sei macro specifiche del portiere, con override atomici per i tratti eccezionali. Metadati in `src/game/attributi.js` e guida in `docs/database-editor-guide.md`.
- **Generatore procedurale guidato dal database** — Eccellenza a 18 squadre e Promozione a 10, città italiane reali con profilo numerico, 22 giocatori senior e 8 giovani per fascia U13/U17/U19, allenatori CPU, calendario round-robin bilanciato
- **Nuova carriera** — selezione squadra esistente con rinomina libera, abbreviazione, colori sociali, **nome del presidente-allenatore (obbligatorio)**, toggle editor attributi
- **Barra superiore** — sempre visibile, con data e bottone "Avanza" a destra; diventa rossa e blocca l'avanzamento quando ci sono decisioni in sospeso (`stato.eventiUrgenti`)
- **Click-through globale** — squadre, giocatori e partite cliccabili ovunque, con pagine di dettaglio (squadra CPU con rosa e allenatore, partita, profilo giocatore) e navigazione a pila con "Indietro"
- **Dashboard** — prossima partita, dati club (incluso presidente), feed notizie
- **Rosa** — tabella ordinabile con medie di reparto; **Centro Sviluppo** su tre squadrette (Under 13 / Under 17 / Under 19)
- **Competizioni** — classifica completa, risultati, previsione iniziale, XI ideale, classifiche individuali, albo d'oro e reputazione 1–300
- **Calendario e Partite** — agenda mensile del club e lista verticale delle gare della propria squadra
- **Editor attributi** — se attivato a inizio carriera, l'icona a pennello compare nel profilo di ogni giocatore del mondo, compresi quelli delle altre squadre; modifica attributi visibili e nascosti con ricalcolo del valore
- **Valutazioni in stelle** — l'overall resta un dato interno del motore e dell'editor; nell'interfaccia normale giocatori e rose sono valutati in stelle relative al livello del club. In Tattica la maglia mostra il numero assegnato.
- **Icone sostituibili** — SVG inline in `src/ui/icons.jsx`; un file in `src/assets/icons/<nome>.svg` sovrascrive l'icona predefinita (istruzioni in `src/assets/icons/LEGGIMI.md`)
- **Badge SVG** procedurali e **salvataggio** automatico in localStorage (versionato: i salvataggi v0.1 non sono compatibili)


## Richieste del 10 settembre 2026 — da implementare

Questi punti aggiornano la roadmap; non indicano funzionalità già completate. Specifiche in [blueprint §12](docs/blueprint.md#12-requisiti-aggiuntivi--10-settembre-2026).

- [ ] **Partita 2D da migliorare — posticipata a funzionalità quasi complete:** dopo la revisione del replay, il campo non è ancora perfettamente sincronizzato con la cronaca a lato (segnalazione utente del 10/09). Verificare e correggere la corrispondenza tra azione visibile, testo e punteggio; migliorare leggibilità e continuità delle animazioni.
- [ ] **Reputazione club 1–300:** importanza/prestigio di ogni club; una reputazione maggiore aumenta le possibilità di convincere i giocatori a trasferirsi. Riferimenti di design: **Real Madrid 300, Parma 200**.
- [ ] **Mercato con paginazione:** pulsanti **Pagina precedente / Pagina successiva**, numero pagina e totale risultati, per poter scorrere tutti i giocatori corrispondenti ai filtri.
- [ ] **Staff già assunto all'avvio per tutte le squadre:** scout, staff medico, preparatore atletico e vice-allenatore con contratto e stipendio; licenziarli richiede il pagamento della clausola contrattuale.
- [ ] **Reputazione giocatori 1–300:** valore distinto dagli attributi tecnici e dal potenziale, riferito al prestigio del giocatore. Riferimenti di design: **Messi e Cristiano Ronaldo 300, Domenico Berardi 200**.

## Prossimi passi (roadmap nel blueprint)

### Revisione interfaccia e vivaio — 13 settembre 2026

- [x] Notizie e Messaggi subito sotto Dashboard; Club spostato in fondo alla navigazione.
- [x] Calendario personale disposto come lista verticale.
- [x] U13/U17 valutati con stelle relative alla prima squadra del club, senza overall visibile.
- [x] U13 senza valore di mercato e non cedibili: gli altri club possono comunicare interesse alla famiglia, che decide soltanto a fine stagione.
- [x] Contratti rimossi dalla navigazione e inseriti nel profilo di ogni giocatore; le scadenze vengono segnalate tramite messaggi.
- [x] Rosa semplificata senza colonne Tec/Fis/Men, con scadenza contrattuale; Spogliatoio disponibile come scheda autonoma dentro Rosa.
- [x] Acquisto dello stadio da almeno 4 milioni e disponibile con rapporto col Sindaco pari almeno a 80.
- [x] Notizie e Messaggi divisi in due schede: messaggi del club e notizie filtrabili per campionato, premi e mercato.
- [x] Finanze ridisegnate con indicatori principali, andamento mensile della disponibilità, confronto entrate/uscite, distribuzione dei costi e registro movimenti.
- [x] Prima revisione estetica ispirata a Football Manager 2015: contenuto a larghezza fluida, Dashboard e Inbox più dense, Tattiche con XI, sette riserve in panchina e non convocati in un unico elenco scrollabile a sinistra, campo a destra e stelle di abilità sempre visibili. I ruoli selezionabili dipendono dalla posizione dello slot; il giocatore determina soltanto quanto è adatto a ciascun ruolo. Le maglie mantengono i colori sociali, mentre l'anello esprime affinità alla posizione e idoneità al ruolo. I nomi nella lista e sul campo aprono l'overview del giocatore.
- [x] Overview del giocatore ridisegnata come pagina gestionale ad alta densità: testata ampia con avatar e informazioni contrattuali, sfondo generato dai colori del club corrente, mappa delle posizioni, ruoli consigliati, punti forti/deboli derivati dagli attributi reali e attributi tecnici, fisici e mentali affiancati.
- [ ] Rifinitura lista tattica: XI, panchina e riserve devono essere righe dello stesso elenco scrollabile, senza sottoliste o separatori strutturali. Ogni riga conserva lo stato di convocazione e permette di distinguere titolare, panchinaro e riserva.
- [x] Navigazione e calendario gestionale: l'attuale Calendario è diventato Partite; la nuova sezione Calendario mostra una vista mensile di partite, allenamenti, scadenze contrattuali e promemoria. La struttura dati per le amichevoli è pronta; la loro organizzazione interattiva resta nella fase avanzata.
- [x] Sezione Competizioni al posto di Campionato: elenca soltanto le competizioni del club, mentre ricerca e collegamenti aprono qualunque torneo in una pagina autonoma. La Panoramica riassume classifica, giornata corrente, capocannoniere, assist e reti inviolate; le altre schede sono Classifica, Partite, Statistiche, Info e Albo d'oro. Info contiene previsione iniziale e XI ideale disposto su un campo 2D orizzontale. Ogni classifica individuale offre un dettaglio dei primi 30 con statistiche pertinenti. L'Albo d'oro contiene vincitori, record storici e premi. I primati non si azzerano: distingue totali di carriera e massimi della singola stagione, recupera le statistiche già archiviate nei vecchi salvataggi e registra record di giocatori, club, campioni, esordienti e marcatori per età. Ogni torneo mantiene reputazione 1–300.
- [x] Revisione dei voti e della Squadra dell'Anno: gol, assist, occasioni create e tiri in porta incidono sul voto; la selezione annuale combina media voto e produzione specifica per ruolo, evitando che un capocannoniere nettamente dominante venga escluso per una media leggermente inferiore.
- [x] Risorse grafiche dei trofei: una competizione può indicare `trofeoPng`; la risorsa viene riutilizzata nelle pagine della competizione, del club e del giocatore, con fallback grafico se il file manca.
- [x] Overall nascosto nell'interfaccia normale e sostituito da valutazioni in stelle; numero di maglia mostrato nelle maglie tattiche e nelle formazioni partita.
- [x] Numeri 1–99 unici per club con scadenza obbligatoria prima dell'inizio del campionato, modifica manuale e delega al viceallenatore.
- [ ] Allenamento avanzato: calendario realmente programmabile, preparazione della partita, carichi, riposo e lavoro individuale. La schermata attuale anticipa la disposizione settimanale ma continua a usare focus e intensità esistenti.
- [ ] Evoluzione grafica dell'ufficio: portatile per Notizie e Messaggi e documenti sul tavolo per decisioni urgenti.
- [ ] Sponsor con logo e anteprima della maglia 3D aggiornata secondo i contratti accettati.
- [ ] Notizie estere dedicate quando saranno attivi più paesi e la simulazione dei campionati lontani.

**Priorità concordata il 10/09/2026:** completare quasi tutte le funzionalità del gioco prima di riprendere il lavoro sul 2D. Sincronizzazione campo/cronaca, animazioni e qualità visiva restano problemi aperti ma posticipati. Anticipare soltanto correzioni indispensabili se un errore impedisce di proseguire la carriera. Non è prevista una v0.9.1 dedicata al replay.

### Ordine operativo aggiornato al 13 settembre 2026

La fondazione multi-stagione e multi-paese è completata. Il lavoro prosegue in questo ordine:

**Aggiornamento 16/09/2026:** la prima calibrazione economica della Serie A comprende valori per posizione, stipendi separati, stadi, sponsor e diritti TV. La casella Messaggi mostra obiettivo stagionale e offerte ricevute come decisioni obbligatorie, con letti/non letti: Avanza apre la casella se ci sono messaggi non letti fuori da essa. La lista tattica permette scambi diretti tra titolari e panchina e tra panchina e riserve. Il profilo permette passaggi prima squadra/U19/U17 senza limiti di età provvisori; l'U19 viene aggregata temporaneamente alla prima squadra. Gli obiettivi coprono anche le fasce 3º–8º posto, il mercato mostra nazionalità, filtri specifici e pagine, la skin squadra si sceglie nelle impostazioni del menu, e prima della gara compare un'anteprima narrativa facoltativa. Verifica gestionale: `npm run management:flow`. Restano da rifinire il modello economico degli altri campionati, la profondità delle anteprime e la futura sezione Trasferimenti con storico delle offerte quando le trattative avranno una durata reale.

**Aggiornamento 17/09/2026:** la Serie B è attiva, con 20 club, calendario autonomo e promozioni/retrocessioni con la Serie A. L'avanzamento gioca anche le sue giornate quando precedono la prossima partita dell'utente. Ogni competizione può dichiarare in `competizioni.json` un `premiClassifica.monteStagionale`: Serie A 135 milioni inclusi nel monte TV, Serie B 10 milioni come parametro provvisorio di bilanciamento. I premi definitivi compaiono nella scheda Info e nelle finanze. Il menu Notizie e Messaggi apre ogni volta il successivo messaggio non letto; a nuova stagione conserva i messaggi del mese finale e di quello precedente. Il mercato ha il filtro “Solo svincolati”. Verifica: `npm run serie-b:smoke`.

1. **Continuità completa dei giocatori — prima fase completata:** invecchiamento, evoluzione legata a rendimento e allenamento, contratti e rinnovi, scadenze e svincolati, ritiri, nuovi giovani, promemoria e provini. Ogni operazione avviene una sola volta al cambio stagione e le CPU mantengono rose utilizzabili. Il rientro dai prestiti sarà collegato alla fase Mercato quando esisteranno prestiti attivi.
2. **Anagrafiche mondiali e reputazione:** catalogo mondiale, collegamenti dei giocatori a nazionalità primaria/secondarie e pagine paese completati; restano eleggibilità per le rappresentative, reputazione nazionale/internazionale di club e giocatori e calibrazione della scala.
3. **Mercato completo:** paginazione, svincolati, prestiti base, rinnovi e gestione dei contratti.
4. **Staff completo:** personale iniziale sotto contratto per ogni club, stipendi, durata e clausole di licenziamento.
5. **Bilanciamento della gestione:** sponsor, stadio, allenamento, finanze, tifosi e spogliatoio su più stagioni.
6. **Spogliatoio avanzato:** rivalità, gruppi sociali, richieste e confronti con i giocatori.
7. **Simulazione leggera dei campionati lontani:** permettere un database mondiale senza simulare ogni lega con il massimo dettaglio.
8. **Coppe:** coppe nazionali a eliminazione diretta completate; restano competizioni continentali, fasi a gironi e regole avanzate di qualificazione.
9. **Editor esterno visuale:** modifica di paesi, competizioni, club e giocatori sul formato database esistente.
10. **Rifinitura del 2D a funzionalità quasi complete:** sincronizzazione campo/cronaca, movimenti, varietà e qualità visiva.

Il database mondiale è separato in file di contenuto: metadati, paesi, competizioni, collegamenti, club e giocatori. Il caricatore li presenta al gioco come un solo catalogo e il validatore controlla tutti i riferimenti. I dati restano in JSON per essere modificabili ed esportabili dal futuro editor.

**Vincolo contrattuale implementato:** dopo un acquisto, l'ingaggio da svincolato o un rinnovo, il giocatore resta bloccato per 180 giorni. Durante il blocco non può essere ceduto, inserito sul mercato o ricevere un altro rinnovo; la CPU rispetta la stessa regola. Un rinnovo può soltanto estendere la scadenza esistente. Gli svincolati possono firmare in qualsiasi giorno dell'anno, anche a mercato chiuso.

La prima fase usa rendimento e allenamento per la crescita: anche un veterano può mantenersi o migliorare dopo una grande stagione. Le scadenze della prima squadra sono gestite dall'utente con promemoria a inizio stagione e gennaio; vivai e CPU sono delegati. U17 e U13 non hanno contratti professionistici e producono quote di iscrizione. Due raduni di provini annuali usano giocatori condivisi tra più club; sono attivi anche il proseguimento della carriera nei campionati minori e la conversione degli ex calciatori in staff. La CPU rivede allenamenti, rinnovi e sostenibilità della rosa nel corso del tempo. Il Centro Sviluppo usa U13, U17 e U19. La seconda squadra U23 è visibile soltanto ai club della massima serie e richiede strutture giovanili almeno 85/100, 20 milioni disponibili e una competizione nazionale di livello 3 o 4.

### Stato delle fasi già definite

0. **Motore di simulazione "Ventidue"** — riscrittura completa del match engine (possessi, decisioni, duelli, 35 ruoli, 13 identità tattiche, sinergia). Blueprint tecnico in [docs/motore/](docs/motore/README.md); implementato e calibrato attraverso le milestone M0-M6 + Fase 5 (generatore realistico, individualità del tiratore)
1. ~~Fase 5~~ **completata** — Notizie/Storia/Premi, generatore realistico 18 squadre Eccellenza, ambientazione Brescia/Franciacorta, individualità del tiratore nel motore
2. **Fase 6** — prima base implementata per Sponsor, Stadio, Allenamento, Finanze e Armonia Settore; restano il motore narrativo avanzato, rivalità/confronti, dinamica fan e bilanciamento di lungo periodo
3. **Fase 7** — continuità implementata: rollover, calendari, archivio statistiche, promozioni/retrocessioni, invecchiamento, rendimento e sviluppo, contratti, scadenze, svincolati, ritiri, nuovi giovani, provini, U19 e seconda squadra U23 condizionata; resta il bilanciamento di lungo periodo
4. **Fase 8** — base implementata: JSON versionato, validatore e selezione paesi; restano importazione di file esterni ed editor visuale — vedi blueprint §10
5. ~~Fase dedicata — ruoli tattici specifici~~ assorbita dal blueprint del motore ([capitolo 04](docs/motore/04-ruoli.md))

## Struttura

```
src/
  game/        # logica di gioco pura (nessuna dipendenza da React)
    rng.js       # RNG deterministico con seed
    data.js      # città, pool nomi, palette colori
    generator.js # generazione mondo, giocatori, calendario; stato iniziale
    storage.js   # salvataggio/caricamento localStorage
  ui/          # componenti React (una schermata per file)
```


## Aggiornamento replay 2D — settembre 2026

**Stato aggiornato al 10/09: intervento parziale, problema ancora aperto e posticipato a funzionalità quasi complete.** L’utente segnala che campo e cronaca laterale non coincidono ancora perfettamente. I controlli automatici superati non certificano la sincronizzazione visiva completa; resta necessaria una verifica durante il gioco.

- Orologio unico per campo, cronaca e punteggio; pausa, velocità 0.5×–4× e salto alla finestra cambi.
- Dischi numerati, colori sociali, portatore e protagonista riconoscibili.
- Registrazione dei trasferimenti di palla e rappresentazione stilizzata dei tiri coerente con l'esito; traiettorie visive, non fisica balistica simulata.
- Eliminati riavvii a ogni aggiornamento della cronaca e interruzioni premature.
- Le decisioni calcistiche restano in Ventidue. Restano da sviluppare la profondità dei movimenti senza palla, i momenti salienti e il resto della roadmap gestionale.

Verifica replay: `npm run replay:smoke` (sincronizzazione gol, interpolazione, recupero, quattro segmenti e sostituzione).
