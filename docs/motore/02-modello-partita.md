# 02 — Modello di partita

Questo capitolo definisce *come* Ventidue simula il calcio: lo spazio, il tempo,
lo stato, il ciclo di possesso, il sistema decisionale e il sistema dei duelli.

## 1. Modello spaziale

### 1.1 Coordinate continue

Il campo è un rettangolo normalizzato: `x ∈ [0,100]` da sinistra a destra
(punto di vista della squadra che attacca verso l'alto), `y ∈ [0,100]` dalla
propria porta a quella avversaria. Ogni giocatore e la palla hanno coordinate
continue — servono al ReplayProjector e alle misure di distanza.

### 1.2 Griglia delle zone (il livello del ragionamento)

Sopra le coordinate vive una griglia **5 corsie × 6 fasce = 30 zone**, l'unità
con cui ragionano PossessionEngine, PositioningEngine e la sinergia:

```
            fascia 6  ┌────┬────┬────┬────┬────┐   area avversaria
            fascia 5  │ S6 │CS6 │ C6 │CD6 │ D6 │   rifinitura alta
            fascia 4  │ …                       │   metà campo offensiva
            fascia 3  │                         │   metà campo difensiva
            fascia 2  │                         │   costruzione
            fascia 1  └────┴────┴────┴────┴────┘   propria area
   corsie:   Sinistra · Centro-Sx · Centro · Centro-Dx · Destra
```

- Ogni zona ha id (`Z_S1` … `Z_D6`), adiacenze e metadati in `config/zone.js`
  (es. pericolosità intrinseca per il calcolo dell'xG, §10).
- Le **zone di influenza** dei ruoli (cap. 04) e l'**occupazione degli spazi**
  della sinergia (cap. 06) sono espresse su questa griglia.
- La griglia è configurazione: una futura risoluzione più fine non tocca il core.

## 2. Modello temporale

- La partita è una sequenza di **possessi** (~180-260 totali, dipende dal ritmo
  delle due tattiche). Ogni possesso è una sequenza di **tick decisionali**.
- Un tick rappresenta ~2-4 secondi simulati: il TimeKeeper converte i tick in
  minuti di orologio e calcola il recupero dagli eventi realmente accaduti
  (infortuni, cambi, ammonizioni, esultanze).
- I punti di pausa interattivi restano i `SEGMENTI` attuali ([1-30], [31-45],
  [46-70], [71-90]): il MatchDirector si ferma lì per le finestre cambi e
  all'intervallo, esattamente come oggi.

Il **ritmo non è un parametro estratto**: il numero di possessi emerge da
quanto le squadre tengono palla (tiki-taka = possessi lunghi, quindi meno
possessi totali; palla lunga = possessi brevi e numerosi).

## 3. MatchState

Tutto lo stato della simulazione vive in un'unica struttura serializzabile
(persiste nelle pause, garantisce il determinismo alla ripresa):

```js
{
  seed, tick, minuto, possessoId,
  fase: 'sviluppo',                    // stato del PossessionEngine
  palla: { zona, x, y, portatoreId },  // null portatore = palla contesa/viaggia
  punteggio: { casa: 1, trasferta: 0 },
  lati: {
    casa: {
      squadraId, tatticaId, mentalita,
      giocatori: [ /* 11 × stato individuale, vedi sotto */ ],
      cambiRimasti, panchina: [...],
      sinergia: { ... },               // precomputata dal SetupEngine (cap. 06)
    },
    trasferta: { ... },
  },
  eventi: [...],                       // flusso semantico (cap. 01 §3)
  snapshot: [...],                     // solo LOD COMPLETO: posizioni per il 2D
}
```

Stato individuale di ciascun giocatore in campo:

```js
{
  giocatoreId,
  ruoloId: 'regista_basso',        // il ruolo assegnato (cap. 04)
  slotId: 'CDC2',                  // lo slot della griglia tattica
  suitability: 84,                 // precomputata dal SetupEngine
  pos: { x, y },                   // posizione corrente
  dovere: { x, y },                // posizione richiesta da PositioningEngine
  energia: 100,                    // FatigueEngine (0-100)
  mentale: { pressione, frustrazione, fiducia },   // MentalEngine
  ammonito: false, minuti: 0,
  contatori: { scatti, duelliVinti, ... },          // per StatsEngine/fatica
}
```

## 4. La macchina a stati del possesso

```
                    ┌──────────────────────────────────────────────┐
                    ▼                                              │
  palla conquistata ──► TRANSIZIONE OFFENSIVA ──► COSTRUZIONE      │
                              │ (contropiede?)        │            │
                              ▼                       ▼            │
                        FINALIZZAZIONE ◄── RIFINITURA ◄── SVILUPPO │
                              │                                    │
             ┌────────────────┼──────────────┐                     │
             ▼                ▼              ▼                     │
           TIRO         palla persa     palla inattiva             │
        (gol/parata/  ► TRANSIZIONE    (punizione, corner,         │
         fuori/palo)    DIFENSIVA       rimessa, rigore)           │
                            │                                      │
                            └──────────── cambio possesso ─────────┘
```

Ogni fase cambia il comportamento di **tutti e ventidue**:

| Fase | Squadra in possesso | Squadra senza palla |
| --- | --- | --- |
| **Costruzione** (fasce 1-2) | difensori e vertice basso a giro palla; portiere partecipa se `costruzioneDalBasso` | decide se pressare alto (trigger tattici) o aspettare nel blocco |
| **Sviluppo** (fasce 3-4) | mezzali e esterni offrono linee, ampiezza e superiorità | scalate, compattezza tra i reparti, copertura delle linee interne |
| **Rifinitura** (fascia 5) | trequartisti/ali cercano l'ultimo passaggio, punte attaccano l'area | difesa dell'area: marcature, raddoppi, linea del fuorigioco |
| **Finalizzazione** | il tiro e ciò che lo precede immediatamente (duelli in area) | portiere protagonista (GoalkeeperEngine) |
| **Transizione offensiva** | primi 2-3 tick dopo la conquista: opzione verticale immediata vs consolidamento (dipende da tattica e ruoli) | — |
| **Transizione difensiva** | — | contro-pressing immediato (gegenpress) vs rientro nel blocco |

La fase determina i pesi delle decisioni, le posizioni di dovere e quali
movimenti preferiti dei ruoli si attivano. Le soglie di passaggio tra fasi sono
in configurazione, non nel codice.

### Palle inattive (SetPieceEngine)

Punizioni, corner, rimesse laterali e rigori interrompono il flusso e hanno
micro-simulazioni dedicate ma costruite sugli stessi mattoni: il corner è un
CrossingEngine con piazzamenti da palla ferma e duelli aerei in serie; il
rigore è un duello tiratore(`rigori`, `freddezza`) vs portiere(`riflessi`,
`posizionamentoPortiere`). I tiratori designati derivano dagli attributi
(`calciPiazzati`), con override utente futuro già previsto dallo schema.

## 5. Il tick decisionale

Ogni tick del possesso esegue, nell'ordine:

```
1. POSIZIONAMENTO   PositioningEngine calcola le posizioni di dovere dei 22
                    (ruolo × tattica × fase × zona palla × punteggio × minuto)
2. MOVIMENTO        MovementEngine muove ciascuno verso il dovere + scostamenti
                    individuali (smarcamento, taglio, sovrapposizione, scalata),
                    limitati da velocità/accelerazione/energia
3. PERCEZIONE       PerceptionEngine costruisce la "vista" del portatore:
                    linee di passaggio (aperte/rischiose/chiuse), pressione
                    addosso, spazio percorribile, compagni in movimento
4. VALUTAZIONE      DecisionEngine assegna un'utilità a ogni opzione percepita
5. DECISIONE        scelta dell'opzione con utilità stimata più alta
6. ESECUZIONE       il motore d'azione competente risolve, di norma via DuelEngine
7. RISOLUZIONE      aggiornamento di MatchState: palla, fase, possesso, fatica,
                    contatori, eventuale fallo/infortunio
8. EMISSIONE        eventi semantici sul bus (+ snapshot se LOD COMPLETO)
```

I passi 1-2 sono la ragione per cui "il pallone è una piccola parte della
simulazione": la qualità delle opzioni del passo 3 dipende interamente da dove
i motori collettivi hanno portato gli altri ventuno giocatori.

## 6. Il sistema decisionale

### 6.1 Le opzioni

Generate dalla percezione, tipicamente 5-15 per tick:

`passaggio corto` (per ogni linea aperta) · `filtrante` · `lancio lungo` ·
`cambio gioco` · `cross` · `dribbling` (per direzione utile) · `conduzione` ·
`tiro` · `scarico all'indietro` · `protezione palla` · `spazzata` (fase difensiva)

### 6.2 La funzione di utilità

```
U(opzione) = Σ  peso(fattore) × valore(fattore, opzione)
```

I fattori (tutti già rappresentati nello stato, nessuno inventato al momento):

| Fattore | Da dove viene |
| --- | --- |
| progressione verso la porta | geometria (zone) |
| probabilità di riuscita stimata | pre-valutazione del duello che l'azione comporterebbe |
| pericolosità generata (xG potenziale) | zona di arrivo, posizione difesa |
| rischio in caso di perdita | zona palla, transizione avversaria attesa, punteggio |
| coerenza col ruolo | `prioritàDecisionali` del ruolo (cap. 04) |
| coerenza con la tattica | parametri identità (cap. 05): verticalità, cross, lanci… |
| pressione subita | PerceptionEngine + `freddezza` |
| condizione propria | energia, piede debole rispetto alla direzione |
| contesto partita | punteggio, minuto, mentalità (gestione vs assalto) |
| istruzioni individuali | (futuro, via ModifierPipeline `decisione`) |

### 6.3 Dove sta la casualità (e dove no)

- **La stima è imperfetta:** a ogni utilità si applica un errore di valutazione
  `ε` la cui ampiezza scala con `(100 − decisioni)` e con la pressione subita.
  Un giocatore con `decisioni` alta stima quasi il vero; uno scarso sopravvaluta
  la giocata sbagliata. La `visione` bassa fa di peggio: alcune opzioni buone
  **non entrano proprio nella lista** (percezione, non valutazione).
- **La scelta è deterministica:** presa la stima, si sceglie sempre la migliore.
  "Prima valuta, poi decide, infine esegue."
- **L'esecuzione è probabilistica:** l'esito dell'azione scelta lo decide il
  DuelEngine, dove gli attributi dominano (principio P1).

Questo produce esattamente il comportamento richiesto: mai decisioni casuali,
ma giocatori mentalmente scarsi che scelgono male sotto pressione, e campioni
che scelgono bene ma possono sbagliare l'esecuzione.

## 7. Il sistema dei duelli

Ogni azione contesa si risolve confrontando i protagonisti. Nessuna
probabilità fissa esiste nel motore.

### 7.1 Formula generale

```
A  = Σ pesoᵢ × attributoᵢ(attaccante)      (pesi da config/duelli.js)
D  = Σ pesoⱼ × attributoⱼ(difensore)
Δ  = (A × M_A) − (D × M_D)                 M = modificatori di contesto
p  = 1 / (1 + e^(−Δ/σ))                    sigmoide, σ = scala del tipo di duello
```

- `σ` regola quanto il duello è "rumoroso": un contrasto è più aleatorio di un
  passaggio a tre metri (σ per tipo di duello, in configurazione).
- I modificatori `M` arrivano SOLO dalla ModifierPipeline: fatica, piede debole,
  angolo/distanza, pressione, campo pesante (futuro), intesa (futuro)…
- L'esito non è binario: la stessa `p` viene mappata su **esiti graduati**
  (riuscito pulito / riuscito sporco → palla contesa / fallito / fallo subìto /
  fallo commesso), con soglie per tipo di duello.

### 7.2 Tabella dei tipi di duello

| Duello | Attributi attaccante (peso ↓) | Attributi difensore (peso ↓) | Contesto tipico |
| --- | --- | --- | --- |
| **Passaggio corto** | passaggio, controllo, visione | anticipazione, posizionamento | pressione sul portatore, densità sulla linea |
| **Filtrante** | visione, passaggio, decisioni | anticipazione, posizionamento, velocità (recupero) | compattezza linea, fuorigioco |
| **Lancio lungo / cambio gioco** | passaggio, visione, tecnica del lancio | posizionamento, anticipazione + duello aereo successivo | vento (futuro), altezza destinatario |
| **Ricezione / primo controllo** | controllo, equilibrio, forza | contrasto, aggressività, anticipo | pressione immediata, palla difficile |
| **Dribbling** | dribbling, agilità, accelerazione, equilibrio | contrasto, agilità, posizionamento, forza | spazio disponibile, raddoppio |
| **Conduzione / scatto** | velocità, accelerazione, controllo | velocità, accelerazione, posizionamento | campo aperto vs traffico |
| **Contrasto a terra** | (portatore) controllo, equilibrio, forza | contrasto, forza, aggressività, tempismo(decisioni) | da dietro → rischio fallo/cartellino |
| **Duello aereo** | salto, colpoDiTesta, forza, posizionamento | salto, colpoDiTesta, forza, marcatura | traiettoria del cross, uscita del portiere |
| **Intercetto** | (passatore) passaggio, visione | anticipazione, posizionamento, agilità | distanza dalla linea di passaggio |
| **Cross** | cross, piede, tecnica | (chi salta) + posizione del portiere | zona di battuta, presenza in area |
| **Tiro** | tiro, freddezza, tecnica | (vedi duello col portiere) | distanza, angolo, pressione, corpo tra palla e porta |
| **Parata** | (tiratore) tiro, freddezza | riflessi, posizionamentoPortiere, agilità, presa | distanza, deviazioni, visibilità |
| **Uscita (alta/bassa)** | (attaccante) anticipo sul pallone | uscite, presa, freddezza, salto | traffico in area, comunicazione |
| **Pressing (recupero)** | aggressività, velocità, anticipazione, impegno | (portatore) controllo, freddezza, visione (scarico) | trigger tattico, sostegno dei compagni |
| **Marcatura (smarcamento)** | movimentoSenzaPalla, agilità, velocità | marcatura, posizionamento, anticipazione | zona vs uomo, blocchi (futuro) |

I pesi numerici della tabella vivono in `config/duelli.js`; la tabella qui è il
contratto semantico.

### 7.3 Falli, cartellini, infortuni: emergenti

- Un contrasto perso "in ritardo" (grande Δ negativo + `aggressivita` alta)
  produce un fallo; la gravità (zona, gamba tesa ≈ code dell'esito) determina
  giallo/rosso tramite il DisciplineEngine. Il numero di cartellini di una
  partita non è mai estratto: emerge dal numero e dalla natura dei duelli.
- L'InjuryEngine valuta ogni duello fisico perso e ogni scatto in condizione di
  fatica estrema contro `resistenzaInfortuni`: gli infortuni si concentrano
  realisticamente su giocatori stanchi e fragili.

## 8. Il portiere (GoalkeeperEngine)

Il portiere è un giocatore a tutti gli effetti, con la sua AI:

- **piazzamento** continuo (posizionamentoPortiere) in funzione di palla e fase;
- **decisione d'uscita** su filtranti e cross (uscite, freddezza, velocità):
  un'uscita sbagliata lascia la porta vuota — l'errore del portiere è una
  decisione sbagliata simulata, non un numero estratto;
- **parata** come duello (tabella §7.2) con esiti graduati: bloccata, respinta
  centrale (pericolo!), deviata in corner, gol;
- **distribuzione**: coi piedi (giocoPiedi, giroPalla) partecipa alla
  costruzione se la tattica lo chiede; il rinvio lungo è un lancio.

## 9. Fatica e stato mentale in partita

- **FatigueEngine**: ogni giocatore parte con `energia` funzione di condizione
  (e, dalla Fase 6, FORMA); ogni tick drena in base a ruolo (un tuttafascia
  brucia più di un centrale), tattica (`consumoEnergetico`), pressing
  effettuato, scatti e duelli. Sotto soglia: attributi fisici degradati
  progressivamente, poi anche concentrazione → il calo nel finale *emerge*, e i
  cambi diventano decisioni tattiche vere.
- **MentalEngine**: pressione (punteggio, minuto, posta in palio futura),
  frustrazione (occasioni sbagliate, decisioni contrarie), fiducia (gol,
  duelli vinti). Modula `freddezza` e disciplina via ModifierPipeline. È il
  punto di innesto di personalità e leadership (futuro).

## 10. Statistiche, voti, xG (StatsEngine, RatingEngine)

- Tutte le statistiche sono **contate** dagli eventi: possesso %, tiri (in
  porta/fuori/bloccati), xG per tiro (funzione di zona, angolo, pressione,
  parte del corpo — calcolato dal contesto reale del tiro), passaggi
  tentati/riusciti, cross, dribbling, contrasti, intercetti, duelli aerei, km
  percorsi (dal MovementEngine), parate.
- **RatingEngine**: il voto parte da 6.0 e accumula contributi pesati
  (gol, assist, occasioni create, duelli vinti/persi in zone critiche, errori
  che portano a tiro subito, palle perse pericolose, parate…). La `costanza`
  nascosta non aggiunge più rumore al voto: agisce a monte, sulla prestazione
  (ampiezza della variazione giornaliera degli attributi efficaci, §11).
- Le medie storiche restano compatibili col formato attuale
  (`statistiche.sommaVoti` ecc.).

## 11. Il giocatore "efficace": la catena dei modificatori

Ogni attributo consumato dai duelli passa per una catena fissa e trasparente:

```
attributo base
  → variazione giornaliera (costanza nascosta: campanella stretta o larga)
  → forma (Fase 6, provider pre-partita)
  → suitability del ruolo assegnato (cap. 04 §3: penalità fuori ruolo)
  → energia corrente (FatigueEngine, solo attributi fisici/mentali sensibili)
  → stato mentale (MentalEngine, solo attributi mentali)
  → modificatori di contesto del duello (pipeline)
= attributo efficace nel duello
```

Nessun altro punto del motore può alterare un attributo.

## 12. Cronaca e replay (CommentaryEngine, ReplayProjector)

- **CommentaryEngine**: dizionario di template italiani per (tipo evento ×
  esito × zona × importanza), con varianti per evitare ripetizioni e livelli di
  dettaglio (`momenti chiave` per il feed, `esteso` per la partita vissuta).
  Le frasi sono dati (`config/cronaca/`), non stringhe nel motore. Poiché ogni
  gol ha una catena causale reale (`origine`), la cronaca può finalmente
  raccontarla: "azione insistita sulla sinistra, cross sul secondo palo, torre
  e conclusione vincente".
- **ReplayProjector**: in LOD COMPLETO registra le posizioni dei 22 + palla a
  ogni tick; Campo2D smette di animare palline inventate e *riproduce* la
  partita (traiettorie reali, pressing visibile, linea difensiva che sale).
  Il formato snapshot è pensato per streaming (array piatti, un frame per tick).
