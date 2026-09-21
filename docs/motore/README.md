# Motore di simulazione "Ventidue" — Blueprint tecnico

> **Stato: IN SVILUPPO ATTIVO.** Ventidue è il motore unico del gioco; il
> blueprint resta il contratto tecnico per calibrazione ed estensioni.

"Ventidue" è il nome in codice del nuovo motore di simulazione delle partite di
President Manager. Il nome è la filosofia: il motore ragiona sempre su tutti i
ventidue giocatori in campo, non sul pallone.

Questo documento è il **blueprint definitivo**: ogni scelta implementativa futura
deve poter essere ricondotta a un capitolo di questa documentazione. Quando il
motore evolverà, evolverà prima qui.

---

## Indice dei capitoli

| Capitolo | Contenuto |
| --- | --- |
| [01 — Architettura](01-architettura.md) | Strati, moduli, flusso dati, event bus, pipeline dei modificatori, data-driven, determinismo, performance, integrazione col gioco esistente |
| [02 — Modello di partita](02-modello-partita.md) | Spazio, tempo, stato della partita, fasi di possesso, ciclo percezione→decisione→esecuzione, sistema dei duelli, portieri, palle inattive, fatica, voti, statistiche, cronaca |
| [03 — Attributi](03-attributi.md) | Audit degli attributi esistenti, nuovi attributi proposti (con motivazione), migrazione |
| [04 — Ruoli](04-ruoli.md) | Schema di configurazione dei ruoli, formula di suitability, catalogo completo dei 35 ruoli |
| [05 — Tattiche](05-tattiche.md) | Schema di configurazione delle identità tattiche, catalogo delle 13 identità, mentalità |
| [06 — Sinergia](06-sinergia.md) | Compatibilità ruolo↔tattica, ruolo↔ruolo, mappa di occupazione degli spazi, report pre-partita |
| [07 — Milestone](07-milestones.md) | Piano di implementazione incrementale, harness di calibrazione, target statistici, rischi |
| [08 — Robustezza e invarianti](08-robustezza.md) | Sette invarianti anti-patologia (budget highlight, fatica continua, jittering, compressione OVR, panchinari, effetto valanga, caos nelle categorie basse) con formule e check |

---

## La filosofia: simulare il calcio, non gli eventi

Il motore attuale (v1) simula **eventi**: calcola due forze aggregate, estrae un
numero di gol da una Poisson e poi "veste" quei gol con testi di cronaca. Il gol
è deciso prima, la partita è raccontata dopo.

Ventidue rovescia il rapporto: **il gol non è mai deciso, è sempre costruito**.
Un gol nasce perché un regista basso ha trovato una linea di passaggio che il
pressing avversario non ha chiuso, perché la punta ha attaccato la profondità
alle spalle di un centrale lento, perché il duello aereo sul cross l'ha vinto
chi salta più in alto. Se una di queste micro-battaglie fosse andata diversamente,
il gol non ci sarebbe stato — e il motore lo sa, perché le ha giocate davvero.

### Conseguenze pratiche della filosofia

1. **Ogni possesso è una micro-simulazione.** La partita è una sequenza di
   possessi; ogni possesso è una sequenza di *tick decisionali* in cui il
   portatore di palla percepisce, valuta, decide ed esegue.
2. **Tutti i ventidue contribuiscono a ogni tick.** Chi non ha palla si smarca,
   copre, scala, pressa, taglia. Le opzioni del portatore *sono* i movimenti dei
   compagni; gli ostacoli *sono* le posizioni degli avversari. Il pallone è
   l'output, non l'input.
3. **La partita emerge, non viene sorteggiata.** Possesso palla, numero di tiri,
   zone di gioco, tipo di occasioni: nessuno di questi numeri è un parametro.
   Sono tutti risultati.

## Principi non negoziabili

Questi principi vincolano ogni milestone e ogni futura estensione. Una modifica
che ne viola uno è un errore di design, non un compromesso accettabile.

- **P1 — Gli attributi dominano.** La casualità interviene *solo* nella qualità
  di esecuzione di un'azione già decisa, mai nella decisione e mai come
  probabilità fissa slegata dai protagonisti. Su un campione di partite, il
  giocatore migliore deve vincere il confronto diretto in modo statisticamente
  evidente; sulla singola giocata deve poter perdere.
- **P2 — Nessuna probabilità hardcoded.** Ogni esito è il risultato di un
  confronto tra attributi modificato dal contesto (sistema dei duelli, cap. 02).
- **P3 — Comportamento = configurazione.** Ruoli, tattiche, priorità, movimenti
  e compiti vivono in file di configurazione dichiarativi. Aggiungere un ruolo o
  una tattica non richiede di toccare il motore (cap. 01, sezione data-driven).
- **P4 — Ogni attributo è usato.** Non esistono attributi decorativi: il
  capitolo 03 mappa ogni attributo del database sui sottosistemi che lo
  consumano. Un attributo che nessun sistema legge va rimosso o motivato.
- **P5 — Determinismo riproducibile.** Stesso seed + stesso stato = stessa
  partita, sempre. Indispensabile per test, regressioni, bilanciamento e replay.
- **P6 — Un solo motore, più livelli di dettaglio.** Le partite CPU e quelle
  dell'utente girano sulla *stessa* simulazione; cambiano solo la telecronaca e
  la proiezione video. Mai due motori con due bilanciamenti.
- **P7 — Estensibilità per composizione.** Meteo, arbitri, derby, intesa,
  personalità: tutto il futuro entra come *modificatore di contesto* in punti di
  innesto già previsti (cap. 01), mai come `if` sparsi nel core.
- **P8 — Compatibilità incrementale.** Ogni milestone lascia il gioco completo e
  giocabile, con salvataggi migrabili e UI funzionante (cap. 07).

## Glossario

| Termine | Significato |
| --- | --- |
| **Possesso** | Sequenza ininterrotta di controllo palla di una squadra, dalla conquista alla perdita (o a un esito: tiro, fallo, palla fuori) |
| **Tick decisionale** | Unità atomica della simulazione (~2-4 secondi simulati): il portatore percepisce → valuta → decide → esegue |
| **Duello** | Confronto diretto tra gli attributi di due (o più) giocatori che risolve un'azione contesa |
| **Fase di possesso** | Stato della squadra col pallone: costruzione, sviluppo, rifinitura, finalizzazione (+ transizioni e palle inattive) |
| **Zona** | Cella della griglia campo 5 corsie × 6 fasce usata dal ragionamento posizionale |
| **Identità tattica** | Configurazione completa di uno stile di gioco (es. Gegenpressing), sostituisce le vecchie "istruzioni" |
| **Ruolo** | Interpretazione di una posizione (es. CDM → Regista Basso): modifica il comportamento dell'AI del giocatore, non solo i suoi numeri |
| **Suitability** | Punteggio calcolato (mai assegnato a mano) di quanto un giocatore è adatto a un ruolo |
| **Sinergia** | Valutazione della compatibilità tra ruoli, tattica e compagni: undici giusti > undici forti |
| **Modificatore di contesto** | Plugin che altera parametri di duelli/decisioni senza toccare il core (meteo, arbitro, derby…) |
| **LOD** | Level of detail: profondità della *presentazione* della simulazione (piena / digest), mai del suo bilanciamento |

## Rapporto col motore v1

Il motore v1 (`src/game/engine.js`) resta in funzione, intatto, fino alla
milestone che lo sostituisce integralmente (cap. 07). Ventidue nasce in una
directory separata (`src/game/motore/`) con un adapter verso le strutture dati
esistenti (partite, eventi, voti, statistiche, infortuni, morale), in modo che
UI e salvataggi non vedano mai uno stato ibrido incoerente.
