# 03 — Attributi

Regola (principio P4): **ogni attributo del database deve essere letto da
almeno un sottosistema del motore**. Questo capitolo è l'audit completo: prima
gli attributi esistenti con i loro consumatori, poi i nuovi attributi proposti
con motivazione, infine la migrazione.

## 1. Audit degli attributi esistenti

### 1.1 Tecnica (10) — tutti confermati

| Attributo | Consumatori nel motore | Note |
| --- | --- | --- |
| `tiro` | ShootingEngine (duello tiro/parata), DecisionEngine (utilità del tiro) | |
| `passaggio` | PassingEngine (corto, filtrante, lancio, cambio gioco), Intercetto (lato passatore) | |
| `dribbling` | DribblingEngine | |
| `controllo` | Ricezione/primo controllo, resistenza al pressing, conduzione | attributo-chiave contro il gegenpressing |
| `cross` | CrossingEngine, corner e punizioni laterali | |
| `calciPiazzati` | SetPieceEngine (battitore designato, qualità battuta) | |
| `rigori` | SetPieceEngine (duello dal dischetto) | |
| `marcatura` | DefendingEngine (duello marcatura/smarcamento, difesa in area) | |
| `contrasto` | DuelEngine (contrasto a terra, dribbling lato difensore) | |
| `colpoDiTesta` | Duello aereo (offensivo e difensivo) | |

### 1.2 Fisico (7) — tutti confermati

| Attributo | Consumatori | Note |
| --- | --- | --- |
| `velocita` | MovementEngine (spostamenti), conduzione, recupero sui filtranti | |
| `accelerazione` | MovementEngine (primi metri), dribbling, transizioni | decisivo nel contropiede |
| `resistenza` | FatigueEngine (tasso di drenaggio dell'energia) | diventa centrale: il calo nel finale emerge |
| `forza` | Contrasti, duelli aerei, protezione palla, ricezione spalle alla porta | attributo-chiave della Torre |
| `agilita` | Dribbling, parate, cambi di direzione, marcatura di giocatori rapidi | |
| `salto` | Duelli aerei, uscite alte | |
| `equilibrio` | Ricezione sotto contrasto, dribbling, resistenza alla carica | |

### 1.3 Mentale (8) — confermati, con due precisazioni

| Attributo | Consumatori | Note |
| --- | --- | --- |
| `freddezza` | Esecuzione sotto pressione (tutti i duelli in zona calda), rigori, MentalEngine | |
| `visione` | PerceptionEngine: quante e quali opzioni il portatore *vede* | visione bassa = la grande giocata non viene nemmeno considerata |
| `posizionamento` | PositioningEngine/DefendingEngine: precisione nel tenere la posizione di dovere difensiva, letture nel blocco | difensivo; il gemello offensivo è il nuovo `movimentoSenzaPalla` |
| `aggressivita` | PressingEngine (mordente), DisciplineEngine (rischio fallo/cartellino) | a doppio taglio, com'è giusto |
| `leadership` | Oggi: bonus di stabilità mentale ai compagni vicini (MentalEngine). Domani: leadership di reparto | |
| `lavoroSquadra` | Adesione ai compiti collettivi: scalate, coperture per il compagno salito, rispetto della fase | il "giocatore di sistema" |
| `piedeDebole` | Modificatore di esecuzione quando l'azione va eseguita col piede debole (tiro, cross, passaggio sotto pressione) | |
| `lealta` | **Fuori dal motore** (mercato/morale/rinnovi). Consumatore dichiarato: sistemi di club | resta, ma non è un attributo di partita |

### 1.4 Portiere (6) — confermati, nessuna aggiunta

| Attributo | Consumatori |
| --- | --- |
| `riflessi` | Duello parata (tiri ravvicinati soprattutto) |
| `presa` | Esito graduato della parata: bloccata vs respinta (le respinte generano pericolo reale) |
| `giocoPiedi` | Costruzione dal basso, resistenza al pressing sul portiere |
| `posizionamentoPortiere` | Piazzamento continuo, tiri da fuori, angoli coperti |
| `uscite` | Decisione ed esecuzione di uscite alte/basse |
| `giroPalla` | Distribuzione: rinvii, lanci, apertura del gioco |

Valutata e scartata l'aggiunta di "comando dell'area": è già rappresentato
dalla combinazione `uscite` + `presa` + `freddezza`; un settimo attributo GK
sarebbe ridondante (violazione P4).

### 1.5 Nascosti (4) — confermati, con ruoli più precisi

| Attributo | Ruolo nel nuovo motore |
| --- | --- |
| `potenziale` | Invariato (crescita/valore, fuori dal match engine) |
| `professionalita` | Fuori dal match engine (allenamento/crescita, Fase 5-6); dichiarato qui per completezza |
| `costanza` | **Cambia meccanismo**: non più rumore sul voto, ma ampiezza della *variazione giornaliera* degli attributi efficaci (cap. 02 §11). Il discontinuo gioca davvero male nelle giornate no |
| `resistenzaInfortuni` | InjuryEngine: valutato su ogni duello fisico perso e sugli scatti in fatica estrema |

## 2. Nuovi attributi proposti (5)

Cinque aggiunte, tutte nel gruppo Mentale (che passa da 8 a 13). Per ciascuna:
perché serve, chi la usa, cosa succederebbe senza.

### 2.1 `decisioni` — Processo decisionale

- **Perché**: è il cuore del DecisionEngine. Il motore v2 separa *scegliere
  bene* da *eseguire bene*; oggi non esiste alcun attributo che rappresenti la
  prima metà.
- **Consumatori**: DecisionEngine (ampiezza dell'errore di stima ε, cap. 02
  §6.3), tempismo dei contrasti, decisione d'uscita del portiere (in coppia con
  `uscite`).
- **Senza**: giocatori tecnicamente scarsi ma intelligenti e campioni confusionari
  sarebbero indistinguibili; l'intero sistema decisionale ridiventerebbe rumore
  uniforme — la negazione della filosofia del motore.

### 2.2 `anticipazione` — Lettura del gioco

- **Perché**: intercetti e letture difensive oggi non hanno un attributo
  proprio; `posizionamento` dice *dove stai*, `anticipazione` dice *cosa leggi
  prima che accada*.
- **Consumatori**: duello intercetto, chiusura delle linee di passaggio
  (PerceptionEngine avversario), recupero sui filtranti, pressing (scattare al
  momento giusto).
- **Senza**: impossibile distinguere il centrale piazzato che legge tutto dal
  centrale che insegue; i filtranti diventerebbero o troppo forti o troppo
  deboli per tutti allo stesso modo.

### 2.3 `movimentoSenzaPalla` — Smarcamento

- **Perché**: se ogni possesso è una micro-simulazione e le opzioni del
  portatore sono i movimenti dei compagni, serve l'attributo che governa la
  *qualità* di quei movimenti offensivi. È il gemello offensivo di
  `posizionamento`.
- **Consumatori**: MovementEngine (smarcamenti, tagli, attacco della
  profondità), duello marcatura/smarcamento, generazione delle opzioni di
  passaggio (un compagno che si muove bene apre linee migliori).
- **Senza**: il Bomber d'Area e l'Incursore non potrebbero esistere come ruoli:
  vivono di questo attributo. Ogni attaccante varrebbe solo per ciò che fa col
  pallone tra i piedi — il contrario della filosofia dei ventidue.

### 2.4 `impegno` — Applicazione (work rate)

- **Perché**: pressing collettivo e ripiegamenti richiedono di sapere *quanto*
  un giocatore è disposto a correre per la squadra. `lavoroSquadra` dice se
  rispetta i compiti tattici; `impegno` dice quanta benzina ci mette.
- **Consumatori**: PressingEngine (adesione ai trigger, chilometri percorsi),
  MovementEngine (rientri in transizione difensiva), FatigueEngine (chi corre
  tanto consuma tanto — l'attributo si paga).
- **Senza**: il Gegenpressing sarebbe uguale per qualunque rosa; il fantasista
  pigro e il guerriero instancabile presserebbero allo stesso modo, azzerando
  una dimensione fondamentale della costruzione della squadra.

### 2.5 `concentrazione` — Tenuta mentale

- **Perché**: gli errori difensivi nei finali di partita — il tratto più
  riconoscibile del calcio vero — richiedono un attributo che rappresenti la
  tenuta dell'attenzione nel tempo e sugli episodi "freddi" (palla lontana,
  ripartenza dopo un errore).
- **Consumatori**: DefendingEngine (probabilità di "buco" su marcature e linea
  del fuorigioco, crescente col minuto e col drenaggio di energia),
  GoalkeeperEngine (tiri improvvisi dopo lunghi periodi di inattività),
  MentalEngine (recupero dopo un errore).
- **Senza**: i cali di tensione andrebbero simulati con rumore globale uguale
  per tutti — di nuovo probabilità fisse, vietate dal principio P2.

### 2.6 Valutati e scartati

- **`tecnica` generica**: ridondante — è la somma pesata di controllo/dribbling/
  passaggio già presenti.
- **`coraggio`**: comportamento derivabile da aggressivita + freddezza; nessun
  duello lo richiederebbe in esclusiva.
- **`comando area` (POR)**: vedi §1.4.
- **`FORMA`**: non è un attributo del database ma uno *stato* (Fase 6); il
  motore la consuma dal provider `pre-partita` (cap. 02 §11) — l'innesto è già
  progettato, l'implementazione resta in Fase 6 come da roadmap.

## 3. Rinomina delle posizioni

Con il nuovo sistema ruoli le sigle si allineano alla nomenclatura richiesta:

| Oggi | Diventa | Etichetta italiana (invariata) |
| --- | --- | --- |
| `CDC` | **`CDM`** | Mediano |
| `ATT` | **`ST`** | Punta centrale |

Tutte le altre 13 sigle restano invariate. La migrazione (cap. 07) applica una
mappa di alias in caricamento (`CDC→CDM`, `ATT→ST`) su ruoli dei giocatori,
istanze `giocatore.ruoli`, slot della griglia (`CDC1-3` → `CDM1-3`,
`ATT1-3` → `ST1-3`... con `ATT2` → `ST`) e tattiche salvate, così i salvataggi
esistenti si aprono senza perdita.

## 4. Migrazione dei nuovi attributi

I salvataggi e il generatore devono popolarli per tutti i giocatori esistenti.
Non si estraggono a caso: si **derivano dagli attributi correlati** più rumore,
così un mondo già generato resta coerente con se stesso:

| Nuovo | Derivazione per giocatori esistenti (con rumore ±8) |
| --- | --- |
| `decisioni` | 0.45·visione + 0.35·freddezza + 0.20·lavoroSquadra |
| `anticipazione` | 0.55·posizionamento + 0.25·visione + 0.20·marcatura (POR: da posizionamentoPortiere/uscite) |
| `movimentoSenzaPalla` | 0.40·posizionamento + 0.30·visione + 0.30·accelerazione, con bonus per macro-ruolo ATT |
| `impegno` | 0.50·lavoroSquadra + 0.30·resistenza + 0.20·aggressivita |
| `concentrazione` | 0.50·(costanza nascosta) + 0.30·freddezza + 0.20·professionalita |

Il generatore, per i nuovi nati, li campiona come gli altri attributi (medie
per macro-ruolo, correlazioni del profilo). L'editor attributi li mostra nel
gruppo Mentale automaticamente (la UI legge `GRUPPI`, nessun lavoro extra).

## 5. Tabella riassuntiva dei consumi

A regime il database conta **36 attributi visibili** (10 tecnica + 7 fisico +
13 mentale + 6 portiere) **+ 4 nascosti**. Ognuno con almeno un consumatore
dichiarato in questo capitolo; il validatore dei config (cap. 01 §5) verifica a
build-time che ogni attributo referenziato da ruoli/duelli esista e che ogni
attributo del database sia referenziato da almeno un config — P4 diventa un
check automatico, non una promessa.
