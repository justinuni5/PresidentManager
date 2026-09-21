# 01 — Architettura

## 1. Visione d'insieme: quattro strati

```
┌─────────────────────────────────────────────────────────────────┐
│  STRATO 4 · PRESENTAZIONE (fuori dal motore)                    │
│  PartitaLive / Campo2D / cronaca testuale / statistiche UI      │
└──────────────────────────▲──────────────────────────────────────┘
                           │ eventi semantici + snapshot posizioni
┌──────────────────────────┴──────────────────────────────────────┐
│  STRATO 3 · PROIEZIONE                                          │
│  CommentaryEngine · ReplayProjector · StatsEngine · RatingEngine│
│  (osservano il flusso eventi, non influenzano la simulazione)   │
└──────────────────────────▲──────────────────────────────────────┘
                           │ flusso di eventi semantici (event bus)
┌──────────────────────────┴──────────────────────────────────────┐
│  STRATO 2 · SIMULAZIONE (il core)                               │
│  MatchDirector ─ orchestratore                                  │
│  PossessionEngine · PositioningEngine · MovementEngine          │
│  PerceptionEngine · DecisionEngine · DuelEngine                 │
│  motori d'azione: Passing/Dribbling/Crossing/Shooting/SetPiece  │
│  PressingEngine · DefendingEngine · GoalkeeperEngine            │
│  FatigueEngine · MentalEngine · DisciplineEngine · InjuryEngine │
│  ModifierPipeline ─ punto di innesto delle estensioni future    │
└──────────────────────────▲──────────────────────────────────────┘
                           │ configurazioni validate + stato partita
┌──────────────────────────┴──────────────────────────────────────┐
│  STRATO 1 · DATI                                                │
│  config/ruoli · config/tattiche · config/duelli · config/azioni │
│  registry + validatore di schema · attributi giocatori          │
└─────────────────────────────────────────────────────────────────┘
```

Regole tra gli strati:

- Lo strato 2 legge **solo** dallo strato 1 e dallo stato di partita. Non
  conosce React, non conosce `stato` globale del gioco, non produce testo.
- Lo strato 3 **osserva** e non retro-agisce mai: voti, statistiche e cronaca
  non possono cambiare l'esito di una simulazione (garanzia di determinismo).
- Lo strato 4 non è parte del motore: consuma il prodotto dello strato 3.

## 2. Catalogo dei moduli

Ogni modulo ha UNA responsabilità, un'interfaccia esplicita e nessuno stato
proprio: tutto lo stato vive in `MatchState` (cap. 02, §3), i moduli sono
funzioni pure `(state, config, rng) → effetti`.

### Orchestrazione

| Modulo | Responsabilità | Input | Output |
| --- | --- | --- | --- |
| **MatchDirector** | Ciclo di partita: inizializza, itera i possessi, gestisce intervallo/finestre cambi/recupero, chiude | stato di gioco esterno, tattiche, XI | `MatchState` finale + flusso eventi |
| **SetupEngine** | Costruisce lo stato iniziale: XI, ruoli assegnati, suitability effettive, report di sinergia, energia iniziale | rosa, tattica, condizioni | `MatchState` al minuto 0 |
| **TimeKeeper** | Contabilità del tempo: converte tick in minuti, calcola il recupero da eventi reali (infortuni, cambi, proteste) | eventi | orologio di partita |

### Struttura collettiva

| Modulo | Responsabilità |
| --- | --- |
| **PossessionEngine** | Macchina a stati del possesso: costruzione → sviluppo → rifinitura → finalizzazione, transizioni offensive/difensive, esiti del possesso |
| **PositioningEngine** | Posizione "di dovere" di ciascuno dei 22 a ogni tick: funzione di (ruolo, tattica, fase, zona palla, punteggio, minuto). È la spina dorsale collettiva |
| **MovementEngine** | Scostamenti individuali dalla posizione di dovere: smarcamenti, tagli, sovrapposizioni, rientri, scalate. Legge i movimenti preferiti del ruolo |
| **PressingEngine** | Decide chi pressa, quando scatta il pressing collettivo (trigger dell'identità tattica), con quale intensità; consuma energia |
| **DefendingEngine** | Marcature, coperture, linee di fuorigioco, scalate difensive, intercetti (usa DuelEngine per i contrasti) |

### Individuale

| Modulo | Responsabilità |
| --- | --- |
| **PerceptionEngine** | Cosa "vede" il portatore: linee di passaggio aperte/chiuse, pressione addosso, spazio davanti, compagni smarcati. Filtrato da `visione` |
| **DecisionEngine** | Valuta le opzioni percepite con una funzione di utilità pesata da ruolo+tattica+contesto e sceglie. Il rumore sta nella *stima*, non nella scelta |
| **DuelEngine** | Servizio condiviso di risoluzione dei confronti: attributi attaccante vs difensore + modificatori di contesto → esito graduato |
| **PassingEngine / DribblingEngine / CrossingEngine / ShootingEngine / SetPieceEngine** | Esecuzione delle azioni: traducono la decisione in duelli e aggiornamenti di stato (posizione palla, possesso) |
| **GoalkeeperEngine** | AI del portiere: piazzamento, uscite, parate (duello tiratore-portiere), rinvii e distribuzione |

### Condizione

| Modulo | Responsabilità |
| --- | --- |
| **FatigueEngine** | Energia per giocatore: drenata da ruolo, tattica, pressing, scatti, minuti; degrada gli attributi fisici e la concentrazione. Punto di innesto della FORMA (Fase 6) |
| **MentalEngine** | Stato mentale in partita: pressione del punteggio, momentum, frustrazione, nervosismo. Modula freddezza e disciplina |
| **DisciplineEngine** | Falli e cartellini *emergenti*: derivano dai duelli persi in ritardo e dall'aggressività, mai estratti a sorte. Punto di innesto degli arbitri (futuro) |
| **InjuryEngine** | Infortuni in partita: probabilità funzione di fatica, resistenza infortuni, violenza del duello subito |

### Proiezione (strato 3)

| Modulo | Responsabilità |
| --- | --- |
| **StatsEngine** | Statistiche reali contate, mai stimate: possesso, tiri, xG, passaggi riusciti, duelli vinti, km percorsi… per giocatore e squadra |
| **RatingEngine** | Voti (4–10) accumulati dai contributi effettivi: azioni riuscite/fallite pesate per importanza, non più rumore attorno al 6 |
| **CommentaryEngine** | Da eventi semantici a cronaca italiana, con livelli di dettaglio (solo momenti chiave / esteso) e varietà testuale data-driven |
| **ReplayProjector** | Proietta lo stato (posizioni 22 + palla per tick) nel formato consumato da Campo2D: la vista 2D diventa una *ripresa* della simulazione, non un'animazione inventata |

## 3. Event bus e forma degli eventi

Il core emette **eventi semantici**, privi di testo. Esempio:

```js
{ t: 2741,                 // tick assoluto
  minuto: 63,
  tipo: 'tiro',
  esito: 'parato',         // esiti graduati, mai booleani
  squadra: 'sq_04',
  attore: 'g_1181',        // chi tira
  contro: 'g_0233',        // il portiere
  zona: 'Z_C6',            // zona del campo
  xg: 0.31,                // valore atteso calcolato dal contesto reale
  origine: 'cross',        // catena: che azione ha generato il tiro
  possessoId: 812 }
```

Lo strato 3 si sottoscrive al flusso: StatsEngine conta, RatingEngine pesa,
CommentaryEngine racconta, ReplayProjector registra. Aggiungere un consumatore
(es. heat-map, telemetria di bilanciamento) non tocca il core.

## 4. ModifierPipeline — l'estensibilità per composizione

Ogni punto in cui il contesto può alterare la simulazione passa da una pipeline
di **context provider** registrati:

```js
// firma di un provider
{ id: 'meteo',
  fase: 'duello',                       // dove si innesta
  applica(contesto, parametri) { ... }  // ritorna modificatori, non muta nulla
}
```

Punti di innesto previsti fin da subito (anche se all'inizio la pipeline
contiene solo i provider di base):

| Punto di innesto | Cosa può modificare | Estensioni future che lo useranno |
| --- | --- | --- |
| `pre-partita` | attributi efficaci, energia iniziale, morale | forma (Fase 6), importanza della partita, derby, pressione del pubblico |
| `duello` | pesi e differenziali dei duelli | meteo (pioggia → controllo/presa), terreno, intesa tra i due |
| `decisione` | utilità delle opzioni | personalità, istruzioni individuali avanzate, leadership di reparto |
| `posizionamento` | posizioni di dovere | familiarità tattica, crescita tattica, linguaggio comune |
| `disciplina` | soglie di fallo/cartellino | arbitri con caratteristiche differenti |
| `fatica` | tassi di drenaggio | meteo (caldo), qualità del terreno, preparatore |
| `evento` | arricchimento eventi | esperienza internazionale, narrativa |

**Regola:** una feature futura che non riesce a esprimersi come provider in uno
di questi punti richiede prima un aggiornamento di questo documento con
l'aggiunta del punto di innesto mancante — mai un `if` nel core.

## 5. Data-driven: configurazioni, registry, validazione

```
src/game/motore/
  config/
    ruoli/          # un file per ruolo (cap. 04) — solo dati
    tattiche/       # un file per identità (cap. 05) — solo dati
    duelli.js       # tabella dei tipi di duello: attributi e pesi (cap. 02 §7)
    azioni.js       # parametri delle azioni (gittate, tempi, rischi base)
    zone.js         # griglia campo, nomi, adiacenze
  schema.js         # validatori: un config malformato fallisce al load, non in partita
  registry.js       # registro ruoli/tattiche/provider: il core interroga il registro
  ...moduli (strato 2)
```

- Il core non contiene **nessun** riferimento a ruoli o tattiche specifiche:
  itera su ciò che il registry espone. `Regista Basso` e `Gegenpressing` sono
  righe di dati.
- Aggiungere un ruolo = aggiungere un file in `config/ruoli/` che passa la
  validazione. Idem per tattiche e provider.
- I config dichiarano `versione`: il validatore rifiuta schemi incompatibili,
  rendendo esplicite le migrazioni.

## 6. Determinismo e RNG

- Un **seed di partita** (persistito in `MatchState`) inizializza un unico
  stream `mulberry32` (già in `rng.js`).
- Ordine di consumo **stabile per costruzione**: i giocatori sono sempre
  iterati per indice, le opzioni valutate in ordine canonico. Nessun
  `Math.random`, nessuna iterazione su `Set`/oggetti non ordinati nel core.
- Le pause interattive (finestre cambi) non rompono il determinismo: alla
  ripresa lo stream riparte da un sub-seed `(seed, possessoId)`, così una
  sostituzione cambia il futuro ma non riscrive il passato.
- Beneficio diretto: **golden match** nei test (cap. 07) — stessa partita
  bit-per-bit su ogni macchina, regressioni individuabili al singolo evento.

## 7. Performance e livelli di dettaglio

Budget realistico di una partita completa:

- ~180-260 possessi × ~6 tick medi ≈ **1.500-2.500 tick**
- per tick: 22 aggiornamenti posizionali O(1) + 1 ciclo decisionale (≤ ~15
  opzioni valutate) + 0-2 duelli → costo dominato da aritmetica semplice
- stima: **< 30 ms** per partita completa su hardware modesto; una giornata
  con 10 partite resta sotto i 300 ms, ampiamente compatibile con l'avanzamento

Conseguenza importante: **tutte le partite dei campionati senior girano sulla
simulazione piena** (principio P6). I LOD riguardano solo la presentazione e i
mondi "di contorno":

| LOD | Chi lo usa | Cosa cambia |
| --- | --- | --- |
| `COMPLETO` | partita dell'utente vista in 2D | tutti gli eventi + snapshot posizioni per il ReplayProjector |
| `SINTESI` | partite CPU, "salta al risultato" | stessa simulazione, ma si conservano solo eventi chiave e statistiche (niente snapshot) |
| `DIGEST` | campionati giovanili specchio, future leghe lontane | modello statistico *derivato per calibrazione* dalla simulazione piena (stessi input: suitability, tattica, sinergia) |

Il `DIGEST` non è un secondo motore: è una regressione dei risultati del motore
pieno, ricalibrata automaticamente dall'harness (cap. 07 §4) a ogni modifica di
bilanciamento.

## 8. Integrazione col gioco esistente

### Contratto verso l'esterno (invariato per l'UI attuale)

L'adapter `motore/adapter.js` traduce il prodotto di Ventidue nelle strutture
già consumate dal gioco:

- `partita.eventi` nel formato attuale `{minuto, tipo, squadraId, giocatoreId, testo}`
  — i tipi esistenti (`gol`, `parata`, `occasione`, `palo`, `var`, `giallo`,
  `rosso`, `infortunio`, `cambio`, `intervallo`) restano validi; i nuovi tipi si
  aggiungono senza rimuovere
- voti, `statistiche` (presenze/gol/assist/sommaVoti), infortuni con prognosi,
  morale post-partita: stessi campi, nuova provenienza
- `SEGMENTI` e finestre cambi: il MatchDirector espone gli stessi punti di pausa
  ([1-30], [31-45], [46-70], [71-90]); la struttura `match` interattiva
  (`indiceSegmento`, `latoCasa`, `cambiRimasti`…) è preservata dall'adapter

### Convivenza e switch

- Feature flag `motoreV2` in `creaStatoIniziale` (default off) finché la
  calibrazione non è validata; l'harness A/B confronta v1 e v2 sugli stessi seed.
- Salvataggi: ogni milestone che tocca lo schema dei dati incrementa
  `VERSIONE_SALVATAGGIO`; il capitolo 07 elenca le migrazioni previste.
- Rimozione di v1 solo all'ultima milestone, quando la vista 2D è alimentata dal
  ReplayProjector.
