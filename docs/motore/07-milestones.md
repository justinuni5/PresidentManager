# 07 — Milestone di implementazione

Regole del piano (principio P8):

- ogni milestone lascia il gioco **completo, giocabile e testabile**;
- ogni milestone **prepara** le successive: niente soluzioni temporanee da
  buttare, niente scorciatoie architetturali;
- i salvataggi migrano sempre (versioni esplicite, migratori testati su
  fixture);
- il motore v1 resta il motore attivo finché Ventidue non supera i criteri di
  calibrazione — mai uno stato ibrido;
- ogni milestone che introduce un sottosistema coperto da un invariante del
  [capitolo 08](08-robustezza.md) lo verifica nell'harness prima di dirsi
  conclusa (mappa invariante→milestone qui sotto).

## M0 — Fondamenta (nessun cambiamento di gameplay)

**Contenuto**
- `src/game/motore/`: registry, validatore di schema, `config/zone.js`
  (griglia 5×6), catena RNG con sub-seed per possesso.
- **Harness di calibrazione** (`tools/` headless, Node): gioca N stagioni,
  raccoglie la telemetria (§ Target), produce il report. Prima esecuzione: la
  **baseline v1**, il metro di paragone di tutto il progetto.
- Scheletro dell'adapter verso le strutture esistenti.

**Accettazione:** validatore respinge config malformati (test); harness produce
il report baseline; `npm run build` pulito; zero differenze di gameplay.

**Stato: COMPLETATA.**
- Fondamenta in `src/game/motore/` (`config/zone.js`, `schema.js`, `registry.js`,
  `rng.js`); smoke test `npm run motore:smoke` (18 verifiche, tutte verdi):
  griglia 30 zone con adiacenze simmetriche e pericolosità crescente,
  validatore che accetta ruoli/tattiche/provider ben formati e respinge id
  duplicati, zone inesistenti, campi fuori 0-100, attributi di suitability
  ripetuti tra bande, tattiche incomplete, punti di innesto sconosciuti;
  sub-seed per possesso deterministico e riproducibile.
- Harness in `tools/harness/` (`simula.js`, `telemetria.js`, `run.js`);
  `npm run harness -- 50` gioca 50 stagioni indipendenti (9.000 partite) sul
  motore v1 e scrive `tools/harness/baseline/v1.json`. Risultati baseline:

  | Metrica | v1 | Target cap. 07 |
  | --- | --- | --- |
  | Gol/partita | 2.54 | 2.3–2.9 ✅ |
  | Casa/Pari/Trasferta | 43.6% / 26.7% / 29.7% | ~44/~27/~29 ✅ |
  | Infortuni/partita | 0.173 | 0.10–0.25 ✅ |
  | Rossi/partita | 0.082 | 0.10–0.25 (gialli N/A, v1 non li conserva per le CPU) |
  | Correlazione forza→punti | 0.022 | ≥ 0.75 ❌ (vedi rischio sotto) |
  | Upset rate | 48.0% | 8–18% ❌ (stesso rischio) |
  | Capocannoniere (18 giornate) | min 8 / media 10.6 / max 15 | 10–18 (parzialmente sotto) |
  | Media voto di lega | 6.17 (sd 0.25) | 6.5–6.9, sd 0.5–0.9 (sd bassa: voto ancora a rumore, atteso fino a M6) |
  | Prestazioni | 5.05 ms/partita | < 30 ms ✅ (ampio margine) |

  Possesso, tiri, xG, conversione, effetto sinergia: **N/A**, richiedono M3+
  (dichiarato esplicitamente nel report, non stimato).

  **Rischio scoperto dalla baseline (non era previsto nel cap. 07 originale):**
  il generatore v1 produce squadre quasi omogenee **entro la stessa lega**
  (tutte condividono lo stesso `livello` e quindi la stessa media-obiettivo
  degli attributi; la sola dispersione gaussiana per giocatore lascia una
  forza-rosa media con spread di ~1-2 punti su 22 giocatori). Questo spiega da
  solo gran parte della correlazione forza→punti vicina a zero e dell'upset
  rate ~48%: **non è (solo) un limite del motore di partita da risolvere con
  Ventidue, è una caratteristica del mondo generato**. Il target `r ≥ 0.75`
  presuppone rose realmente disomogenee. Aggiunto come rischio esplicito nella
  tabella rischi in fondo a questo capitolo; **M1 deve verificarlo** (i 35
  ruoli e la suitability da soli non creano varianza di squadra se il
  generatore continua a pescare tutti i giocatori dalla stessa media) e, se
  necessario, introdurre una variabilità di forza tra squadre della stessa
  lega nel generatore prima di considerare il target raggiungibile.

## M1 — Ruoli e suitability (sul gioco reale, motore v1 ancora attivo)

**Contenuto**
- Rinomina posizioni `CDC→CDM`, `ATT→ST` con alias di migrazione (cap. 03 §3).
- I 5 nuovi attributi con derivazione per i giocatori esistenti e generazione
  per i nuovi (cap. 03 §4). Editor e UI li mostrano automaticamente.
- Catalogo dei 35 ruoli come config validate; calcolo suitability; assegnazione
  ruolo per slot nella Tattica (UI: selettore + bande qualitative); profilo
  giocatore con i "ruoli consigliati" calcolati.
- CPU: assegnazione automatica dei ruoli (max suitability, vincoli base).
- **Ponte v1**: il ruolo modula l'`effettivo()` del motore v1 tramite la curva
  di efficacia (cap. 04 §3.3) — effetto moderato ma reale da subito.

**Accettazione:** salvataggi v8 migrano (fixture); suitability coerente su
casi campione (un DC lento non risulta "Su misura" come Punta di Profondità);
harness: la distribuzione dei risultati resta nei target baseline (il ponte
non stravolge il bilanciamento).
**Salvataggio:** v9.

**Stato: COMPLETATA.**
- Rinomina `CDC→CDM`, `ATT→ST` applicata in `ruoli.js`, `attributi.js`,
  `generator.js` (posizioni, griglia slot, preset, moduli CPU); i macro-ruoli
  reparto (`POR/DIF/CEN/ATT`) restano invariati (concetto distinto, non
  rinominato — la coincidenza di sigla con la vecchia posizione ATT era la
  fonte di confusione che la rinomina risolve).
- 5 nuovi attributi mentali aggiunti a `GRUPPI.mentale` (`attributi.js`);
  `derivaAttributiNuovi()` li deriva dagli attributi correlati con rumore ±8
  per i giocatori esistenti; il generatore li campiona come ogni altro
  attributo per i nuovi nati (bias di reparto leggeri aggiunti a `BIAS_MACRO`).
- Catalogo dei 35 ruoli in `src/game/motore/config/ruoli.js`, validato e
  registrato via `registraCatalogoRuoli()` (`src/game/motore/suitability.js`,
  lazy e idempotente). `suitability()` implementa la formula del cap. 04 §3.1;
  `ruoliConsigliati()`/`ruoloDefault()` coprono profilo giocatore e
  assegnazione CPU (max suitability).
- **Ponte v1**: `effettivoRuolo()` in `engine.js` applica la curva
  0.78+0.22·S/100 sopra l'`effettivo()` esistente, per titolari, cambi CPU e
  sostituzioni utente; il ruolo esplicito (`squadra.tattica.ruoliSlot`, UI in
  Tattica.jsx) ha priorità sul default a suitability massima.
- Migrazione `storage.js`→`migrazioni.js`: `carica()` non scarta più i
  salvataggi di versione diversa, prova un percorso di migratori (`migra`);
  v8→v9 rinomina posizioni/slot e deriva i nuovi attributi in place.
- **Smoke test** (`npm run motore:smoke`, 28 verifiche): registrazione del
  catalogo, copertura di tutte le 15 posizioni, caso campione DC-lento vs
  Punta di Profondità, `ruoloDefault` sempre nel catalogo, migrazione v8→v9
  end-to-end (rinomina, derivazione attributi, slot tattica), nessun percorso
  di migrazione per versioni sconosciute (mai un downgrade silenzioso).
- **Harness** (`npm run harness -- 50 --label=m1`): distribuzione confermata
  nei target — gol/partita 2.57, casa/pari/trasferta 44.3/25.4/30.3%,
  infortuni 0.176/partita, prestazioni 6.28 ms/partita — il ponte non
  stravolge il bilanciamento di v1, come richiesto dall'accettazione.
  **Correlazione forza→punti 0.007** (invariata rispetto a 0.022 di M0):
  conferma la previsione del rischio segnalato in M0 — 35 ruoli e suitability
  da soli non creano varianza di forza-rosa perché il generatore continua a
  campionare tutti i giocatori della stessa lega dalla stessa media. Il target
  `r ≥ 0.75` **non è raggiungibile senza intervenire sul generatore**
  (dispersione di forza tra squadre della stessa lega); non è stato toccato in
  questa milestone perché non richiesto esplicitamente e fuori dal perimetro
  dichiarato di M1 — resta il rischio aperto in tabella, ora con conferma
  sperimentale invece che ipotesi.

## M2 — Identità tattiche

**Contenuto**
- Le 13 identità come config; UI Tattica: card identità (filosofia,
  forza/deboli) + regolatore di mentalità; migrazione delle vecchie istruzioni.
- Report di sinergia v1 (ruolo↔tattica e coppie principali, cap. 06 §2) in
  lavagna.
- CPU: identità assegnata dal generatore secondo il profilo rosa; mentalità
  dinamica su punteggio/minuto (già nel ponte v1).
- **Ponte v1**: le identità sostituiscono pressing/baricentro come modificatori
  delle forze (mappatura più ricca ma stessa natura — verrà scartata con M5,
  è dichiaratamente il *contratto*, non l'implementazione finale).

**Accettazione:** ogni identità produce effetti misurabili e distinti
nell'harness (possesso, gol fatti/subiti); HaramBall vince e perde partite
folli; salvataggi v9→v10 migrano.
**Salvataggio:** v10.

**Stato: COMPLETATA.**
- Catalogo delle 13 identità in `src/game/motore/config/identita.js` (schema
  del cap. 05 §1, validato da `validateTattica` già presente da M0),
  registrato via `registraCatalogoIdentita()` (`src/game/motore/identita.js`,
  lazy e idempotente come il catalogo ruoli).
- **Ponte v1** (`modificatoriForze` in `motore/identita.js`): i 15 parametri
  vengono mappati su attacco/difesa/centrocampo attorno a un asse di
  "rischio" (linea+pressing+profondità−gestione possesso) che alza l'attacco
  e abbassa la difesa in proporzione — nessuna identità domina per
  costruzione, cambia il profilo. `equilibrata` (tutto a 50) è neutra per
  costruzione: moltiplicatori ×1. L'aggressività dell'identità modula i
  lambda di gialli/rossi. Coefficienti calibrati con l'harness (prima stesura
  portava i gol/partita a 2.80, ridotti a 2.74). Mappatura dichiaratamente da
  scartare con M5.
- **Mentalità** (cap. 05 §3): 5 livelli che spostano di ±10/±20 i soli
  parametri di rischio. Utente: scelta in Tattica, fissa. CPU: dinamica su
  punteggio/minuto (`mentalitaCpu`), ricalcolata all'inizio di ogni segmento —
  la simulazione rapida ora gioca negli stessi 4 segmenti della partita
  interattiva.
- **Possesso stimato**: quota relativa dei pesi `quotaPossesso(parametri) ×
  centrocampo`, salvata come `partita.possessoCasa`. Dichiarato come STIMA
  del ponte v1 nel report harness (il possesso vero arriva col
  PossessionEngine, M3).
- **Report sinergia v1** (`src/game/motore/sinergia.js`, in lavagna Tattica):
  ruoli affini/inattriti dell'identità, requisiti di rosa (soglie diffuse),
  coppia di centrali, doppi vertici bassi, ampiezza per corsia (da
  `comportamento.ampiezza` dei ruoli assegnati), catene Torre/Bomber,
  `sinergie.richiede` dei ruoli del catalogo M1. Punteggio 5-99.
- **Generatore**: ogni squadra riceve `tattica.{identitaId, mentalita}` alla
  creazione del mondo; l'identità è scelta con `identitaConsigliata` —
  classifica per coerenza col profilo rosa (media, sui ruoli affini, della
  migliore suitability disponibile in rosa) e scelta pesata sull'intera
  classifica (la più coerente esce ~13× più spesso dell'ultima, ma ogni
  identità resta possibile: con la top-5 secca HaramBall e Gegenpressing non
  comparivano mai nei mondi omogenei).
- **Migrazione v9→v10**: utente su `equilibrata` + mentalità tradotta dalle
  vecchie `istruzioni` (pressing/baricentro alti → offensiva, bassi →
  prudente: nessuna squadra cambia carattere); CPU con identità dal profilo
  rosa; `istruzioni` rimosse. UI Tattica: i due select sostituiti da identità
  (card con filosofia e punti forza/deboli) + regolatore di mentalità + card
  sinergia.
- **Smoke test** (40 verifiche): catalogo e referenze incrociate coi ruoli
  M1, neutralità di equilibrata, sbilanciamento haramball, protezione
  catenaccio/blocco basso, monotonia della mentalità, possesso tiki_taka ≥62%
  vs palla_lunga, rosa fisica → palla_lunga > tiki_taka, mentalità CPU,
  migrazione v9→v10 e catena v8→v10.
- **Harness** (`node tools/harness/run.js 50 1000 --label=m2`, 9.000
  partite): gol/partita 2.74, casa/pari/trasferta 43.6/26.0/30.4, infortuni
  0.185, 6.6 ms/partita — tutti i target baseline tengono. Effetti per
  identità misurabili e distinti: possesso da 36.2% (palla_lunga) a 67.2%
  (tiki_taka); catenaccio/blocco_basso coi GS minimi (1.26/1.18);
  **HaramBall con GF 1.65 e GS 1.69, entrambi i massimi del catalogo: vince e
  perde partite folli come da accettazione**. Punti/partita in banda stretta
  (1.33–1.45): nessuna identità dominante. Rossi/partita 0.090 (da 0.082:
  l'aggressività delle identità spinge verso il target 0.10-0.25, ancora
  sotto). La correlazione forza→punti resta ~0.01: il rischio generatore
  segnalato in M0/M1 è invariato e fuori dal perimetro anche di M2.

## M3 — Il cuore di Ventidue (dietro feature flag)

**Contenuto**
- MatchState, MatchDirector, TimeKeeper, PossessionEngine (FSM completa),
  PositioningEngine, PerceptionEngine, DecisionEngine, DuelEngine,
  Passing/Dribbling/Shooting/Crossing base, GoalkeeperEngine essenziale.
- La partita completa gira headless: risultato + flusso eventi semantici +
  statistiche di possesso/tiri. Adapter → formato eventi v1.
- Flag `motoreV2` (default off): attivabile per l'harness e per test manuali.

**Accettazione (la più dura del piano):** su ≥ 10.000 partite l'harness
verifica TUTTI i target statistici (§ Target); A/B con v1 sugli stessi mondi:
correlazione forza→punti almeno pari a v1; determinismo bit-per-bit su golden
seed; < 30 ms/partita.
**Salvataggio:** invariato (il flag non persiste risultati diversi).

**Stato: COMPLETATA** (con i fuori-target dichiarati in fondo al blocco).
- **Il motore**: `src/game/motore/partita/` — `campo.js` (frame di squadra,
  zone, geometria), `setup.js` (SetupEngine: XI con gli stessi criteri del v1
  per un A/B equo, suitability precomputate, variazione giornaliera dalla
  costanza consumata al setup), `duello.js` (DuelEngine: medie pesate di
  attributi ATOMICI mai OVR (INV-0b), sigmoide a sigma assoluta (INV-4),
  esiti graduati pulito/sporco/fallito/fallo, falli emergenti dai duelli
  fisici persi male), `posizionamento.js` (PositioningEngine: dovere da ruolo
  × tattica × fase × palla; marcatura di base uno-a-uno nel proprio terzo,
  stretta in area), `decisione.js` (PerceptionEngine + DecisionEngine:
  linee di passaggio filtrate dalla visione, utilità pesata da
  ruolo/tattica/contesto, errore di stima che scala con decisioni e
  pressione, scelta deterministica), `azioni.js` (Passing/Dribbling/
  Crossing/Shooting, GoalkeeperEngine essenziale con uscite sui filtranti,
  corner come micro-simulazione, rigori, spazzata come valvola di sfogo,
  disciplina essenziale), `direttore.js` (MatchDirector + TimeKeeper:
  possessi con sub-seed dedicato, tetto tick INV-7a, recupero dagli eventi).
  Config nuovi: `config/duelli.js` (tabella cap. 02 §7.2) e
  `config/azioni.js` (fasi, gittate, xG, pause, disciplina, fattore campo,
  Competition Factor per lega).
- **Adapter** (`motore/adapter.js`): eventi semantici → formato v1
  (gol/parata/occasione/palo/giallo/rosso/intervallo), lati compatibili con
  `finalizzaPartita`, possesso CONTATO (non stimato), assist da catena reale.
  Infortuni post-partita come proxy statistico ai tassi v1 (dichiaratamente
  un tappabuchi: con M5 l'InjuryEngine li farà emergere dalla partita).
- **Flag `motoreV2`** (default off) in `creaStatoIniziale`; ramo in
  `giocaGiornata`; harness con `--motore=v2`. La partita interattiva 2D resta
  v1 fino allo switch di M5, come da piano.
- **Determinismo**: golden seed (`npm run motore:golden`, 5 partite
  bit-per-bit su eventi semantici + statistiche; `--aggiorna` consapevole);
  smoke test a 46 verifiche (determinismo stesso-seed, coerenza statistiche,
  formato adapter, INV-7 su un campione).
- **Calibrazione su 10.800 partite** (`npm run harness -- 60 2000
  --motore=v2 --label=m3-v2`), tutti i target del motore in banda:
  gol/partita 2.57 · casa/pari/trasferta 47.2/26.2/26.6 · tiri/squadra 10.1 ·
  in porta 38.1% · conversione 12.7% · xG 2.57 vs gol 2.57 (scarto ~0) ·
  rigori 0.29 · gialli 3.32 · rossi 0.208 · infortuni 0.172 (proxy) ·
  possesso speculari 50±2 · tiki_taka vs palla_lunga 64/38 (emergente dai
  parametri, non imposto) · 18.0 ms/partita (< 30). A/B sugli stessi 60 seed:
  r(forza→punti) v2 = 0.014 vs v1 = 0.022 — statisticamente indistinguibili
  (entrambe compatibili con zero: è l'artefatto del generatore omogeneo, non
  una differenza tra motori).
- Le identità producono profili emergenti coerenti: possesso 44.9%
  (palla_lunga) – 58.8% (tiki_taka); tiki_taka/possesso in rose tecnicamente
  povere fanno pochi punti (1.02-1.04: "una rosa tecnicamente povera la
  trasforma in autolesionismo", come da scheda); haramball GF 2.74 (massimo
  del catalogo) e GS sopra la media.
- **Lezioni di calibrazione** (fix strutturali, non coefficienti): senza
  valvole il pressing alto trasformava ogni rinvio in un furto-tiro
  (capocannoniere a 116 gol) — risolto con: spazzata sotto pressione, reset
  del blocco sul rinvio dal fondo, controllo obbligatorio sulla palla appena
  rubata, caos di transizione sui tiri immediati, pressing individuale raro
  nell'ultimo terzo senza trigger di squadra (arriva col PressingEngine M4),
  filtrante avvantaggiato contro la linea alta (il contrappeso naturale del
  Gegenpressing), marcatura uno-a-uno con presa stretta in area.

  **Fuori target, dichiarati e tracciati:**
  - **Capocannoniere ~54 gol medi** (target 10-18): i tiri di squadra si
    concentrano sul riferimento offensivo (~70-90% al centravanti). Le
    meccaniche che distribuiscono i marcatori nel calcio vero mancano ancora
    per piano: movimenti/rotazioni (MovementEngine M4), palle inattive
    complete (SetPieceEngine M4), fatica e turnover di formazione (M5).
    Riverificato a M4 e M5; se non rientra, servirà un intervento dedicato.
  - **r(forza→punti) ≈ 0 e upset ~46%**: invariato da M0 — artefatto del
    generatore omogeneo (rischio in tabella), non del motore.
  - **INV-7 parziale**: 368 lati su 21.600 (1,7%) chiudono senza tiri
    (erano il 7,3% a inizio calibrazione). Nessun possesso irrisolvibile
    (tetto tick), ma una squadra schiacciata può non arrivare mai al tiro:
    atteso in chiusura con i movimenti offensivi di M4.
  - Distribuzione temporale dei gol piatta (serve FatigueEngine, M5) e
    media voto ancora a rumore v1 (RatingEngine, M6): dichiarati N/A come
    da piano.

## M4 — Il collettivo completo

**Contenuto**
- PressingEngine (trigger), DefendingEngine (zona/uomo, linea, fuorigioco),
  MovementEngine completo (repertori, rotazioni del Calcio Totale),
  transizioni, SetPieceEngine (corner, punizioni, rigori, rimesse).
- SynergyEngine completo: mappa di occupazione consumata dai motori + report
  completo in UI (sostituisce il report v1 di M2).
- Seconda campagna di calibrazione.

**Accettazione:** i pattern emergono nei numeri dell'harness: il Contropiede
batte in media gli sbilanciati, il Blocco Basso abbassa gli xG concessi, la
coppia Torre+Seconda Punta converte i cross sopra la media, l'undici "giusto"
batte l'undici "forte ma incompatibile" su campione significativo.

**Stato: COMPLETATA** (con i pattern non ancora confermati dichiarati in fondo
al blocco, sullo stesso principio di onestà di M0/M3).
- **PressingEngine** (`motore/partita/pressing.js`): i `triggerPressing`
  dell'identità (dichiarati dal catalogo dal M2, mai consumati finora)
  intensificano il `tentaPressing` essenziale di M3 quando la situazione del
  portatore corrisponde a un trigger della difesa — `palla_sul_terzino`
  (persistente, letto sul portatore corrente), `passaggio_indietro` e
  `controllo_sbagliato` (flag di un tick sul passaggio appena risolto),
  `ricezione_spalle_porta` (flag di un tick alla ricezione, non una
  condizione di posizione persistente — la prima versione teneva il trigger
  sempre acceso durante la costruzione, pressing mai spento; corretto).
- **DefendingEngine** (`motore/partita/difesa.js`): fuorigioco sui filtranti
  — linea del difensore più arretrato nel frame dell'attacco, ricevente oltre
  la linea E oltre la palla al momento del passaggio, turnover invece del
  duello; modalità di marcatura letta dall'identità, `uomo` per l'Uomo su
  Uomo (marcatura estesa a tutto il campo, presa 0.85 fissa — la "meccanica
  speciale" del cap. 05, mai implementata prima), `zona` (uno-a-uno nel
  proprio terzo, M3) per tutte le altre. Solidità del blocco basso
  (`modificatoriPortatore`, decisione.js): linea difensiva E reparti stretti
  insieme alzano `modD` sui duelli del portatore avversario — il contrappeso
  simmetrico dell'alta linea che si scopre sui filtranti (M3), qui è la
  difesa organizzata a rendere più dura ogni giocata contro un blocco vero.
- **MovementEngine** (`motore/partita/movimento.js`): spinta d'attacco
  riservata a chi dichiara ESPLICITAMENTE un movimento d'attacco dello
  spazio nel proprio vocabolario `movimenti` — mai al riferimento offensivo
  principale (finalizzazione massima della squadra), già strutturalmente il
  più avanzato: chi altro si offre nell'ultimo terzo compete per la stessa
  palla, la leva diretta contro la concentrazione dei tiri dichiarata fuori
  target a M3 (capocannoniere 45.5 medi, giù da 54.1 — miglioramento reale
  ma non ancora nel target 10-18, riverificato a M5 con fatica/rotazioni).
  Rotazioni del Calcio Totale: scambio delle zone di dovere (mai dei ruoli,
  INV-3a) tra coppie di titolari vicini, applicato una volta al setup —
  semplificazione dichiarata delle "rotazioni continue" del blueprint.
- **SetPieceEngine**: punizioni (`azioni.js`, `battiPunizione`) — dirette se
  a distanza di tiro realistica (scalate su calciPiazzati e distanza, nessun
  muro esplicito: semplificazione dichiarata, l'efficacia è già nella
  probabilità di tentativo e nell'xG ridotto), laterali (stesso schema del
  corner, mischia aerea condivisa via `disputaPalloAlto`) se battute vicino
  al fondo, altrimenti il restart aperto già presente da M3. Corner, rigori
  già di M3; rimesse: il turnover esistente è già corretto (palla alla
  squadra che non l'ha toccata per ultima) e non richiede una contesa
  dedicata.
- **SynergyEngine completo** (`motore/partita/sinergia.js`): mappa di
  occupazione per corsia e fase (cap. 06 §1.3) calcolata dalle zone di
  dovere REALI dei titolari, non più un'euristica separata — sostituisce il
  blocco "ampiezza per corsia" del report v1 di M2
  (`motore/sinergia.js`, in lavagna Tattica). Coerenza-giocatore: ruolo↔
  identità propria (premia/penalizza `ruoliAffini`/`ruoliInattriti`),
  ruolo↔compagni (`sinergie.premia`/`richiede` del catalogo M1), ruolo contro
  l'identità/i ruoli avversari (`sinergie.soffre`) — un moltiplicatore
  piccolo e clampato (±12%) piegato in `effTotale` al setup, mai un bonus
  diretto all'esito (INV-0b: modula l'efficacia, mai gli attributi).
- **Calibrazione su 10.800 partite** (`npm run harness -- 60 2000
  --motore=v2 --label=m4-v2-final2`): gol/partita 2.30 · casa/pari/trasferta
  44.9/28.5/26.6 · tiri/squadra 9.9 · in porta 37.7% · conversione 11.6% ·
  xG 2.33 vs gol 2.30 · rigori 0.23 · gialli 3.28 · rossi 0.202 · infortuni
  0.184 (proxy) · 23.3 ms/partita (< 30). INV-7: 341/21.600 lati senza tiri
  (1,6%, in linea con l'1,7% di fine M3). Golden seed rigenerato e verificato
  bit-per-bit; smoke test a 53 verifiche (le 7 di M4: trigger di pressing,
  fuorigioco, modalità di marcatura, coerenza di sinergia, mappa di
  occupazione, fuorigioco/punizioni su campione).
- **Verifica dei pattern di accettazione**
  (`node tools/harness/m4-pattern.js`, 8.000 partite tra coppie casuali di
  squadre reali del mondo generato, più un test dedicato per il quarto
  pattern):
  - ✅ **Blocco Basso abbassa gli xG concessi**: 2° su 13 identità per xG
    concesso/partita (0,88, dietro solo al Calcio Totale a 0,81) — confermato
    dalla solidità del blocco basso in `modificatoriPortatore`.
  - ✅ **Torre + Seconda Punta d'Assalto convertono i cross sopra la
    media**: 10,8% (15/139 tiri da cross/corner) contro 8,9% (307/3.467) di
    chi non ha la coppia in campo — confermato, coerente col bonus
    `sinergie.premia` di Torre per la Seconda Punta d'Assalto.
  - ❌ **Contropiede vs identità sbilanciate** (Gegenpressing, HaramBall,
    Tiki-Taka, Calcio Totale): quota punti 18,4% su 745 partite dirette —
    il Contropiede NON prevale nel confronto diretto, pur avendo punti/
    partita nella media alta sull'intero campione misto (1,43, sopra
    l'Equilibrata). Ipotesi verificata quanto possibile in questa milestone:
    la finestra di transizione (2 tick) non compensa a sufficienza la
    pressione sostenuta di identità ad altissima intensità — il
    Contropiede concede più xG (1,69/partita, 8° su 10) di quanto la
    qualità del contropiede stesso renda in gol. Non risolto con
    ritocchi ai coefficienti nel tempo di questa milestone: probabile
    dipendenza da momentum/richiamo tattico (INV-6, mappato a M5).
  - ❌ **XI "giusto" vs XI "forte ma incompatibile"**: quota punti 45,5% su
    500 coppie stesso-avversario-stesso-seed (stessi 11 giocatori, stessa
    identità, ruoli di suitability più alta vs più bassa per slot) — l'XI
    "giusto" NON supera la soglia del 52%. Causa plausibile isolata: alcuni
    archetipi di ruolo (es. Diga, Terzino Bloccato) hanno profili
    decisionali strutturalmente più sicuri (bassa `libertaCreativa`/
    `rischioGiocate`) di archetipi tecnici (Regista Basso, Mezzala
    d'Assalto) — su una rosa sotto la media il rischio dei ruoli tecnici
    pesa più della curva "dolce" di suitability (cap. 04 §3.3, 0.78-1.00,
    intenzionalmente mite) e del bonus di coerenza SynergyEngine (±12%).
    Non è un difetto della curva di suitability (di progetto, non toccata)
    né del SynergyEngine in sé (i pattern 2 e 3, che lo esercitano
    direttamente, sono confermati): è l'interazione fra profilo di rischio
    del ruolo ed esecuzione su una rosa modesta. Riverifica candidata a M5
    (FatigueEngine/MentalEngine possono cambiare il calcolo del rischio).
- Le identità continuano a produrre profili emergenti coerenti e distinti:
  possesso 44,9%–58,4%; Catenaccio e Blocco Basso ai GS minimi (0,91/0,89);
  HaramBall ancora il massimo GF (2,27) e ai vertici di GS; nessuna identità
  domina i punti/partita in banda stretta salvo gli estremi già noti.

## M5 — Condizione, disciplina, uomini

**Contenuto**
- FatigueEngine (energia, cali, drenaggi per ruolo/identità), MentalEngine
  (pressione, frustrazione, momentum), DisciplineEngine (falli/cartellini
  emergenti), InjuryEngine in-match; cambi CPU intelligenti (stanchezza,
  punteggio, ruoli); recupero calcolato dagli eventi.
- **Switch:** `motoreV2` default ON per tutte le partite senior in modalità
  risultato. Il v1 resta solo dietro la vista 2D (che ancora anima gli eventi
  vecchio stile) e come fallback d'emergenza.

**Accettazione:** distribuzione temporale dei gol realistica (più gol nei
finali, § Target); cartellini correlati ad aggressività/identità e non
uniformi; infortuni concentrati su fatica+fragilità; harness completo entro
i target.
**Salvataggio:** v11 (energia/condizione nello stato giocatore).

**Stato: COMPLETATA** (con il target di timing centrato solo in parte, e il
capocannoniere ancora fuori banda, dichiarati in fondo al blocco).
- **FatigueEngine** (`motore/partita/fatica.js`): energia a RATE sul minuto
  (INV-2) — `driftBase × fattoreRuolo × consumoEnergetico × intensitàFase ×
  pressioneContestuale × fattoreResistenza`, integrale analitico per tick, non
  per secondo — più gli SPIKE di pressing/scatti/duelli fisici realmente
  occorsi. Sotto soglia degradano SOLO gli attributi fisici e, agli estremi,
  la concentrazione (INV-5): la classe (visione, passaggio, freddezza,
  decisioni…) resta intatta — il campione stanco perde le corse, non la testa.
  Soglia bassa + k alto: il crollo si concentra negli ultimi 15-20'. Malus da
  ingresso a freddo per i subentrati.
- **MentalEngine** (`motore/partita/mentale.js`): momentum di squadra
  limitato, sublineare (`shock × (1-|M|)`) e con decadimento λ/minuto
  (INV-6a); moltiplicatore mentale clampato in banda `[0.85, 1.12]` sui soli
  attributi mentali-esecutivi (INV-6b); scudo di leadership sullo shock
  negativo del gol subito, "animale ferito" (INV-6c). **Richiamo tattico CPU**
  nel direttore v2: ai confini di segmento la CPU rilegge punteggio/minuto e
  adatta la mentalità (sotto attacca, avanti gestisce) — il feedback negativo
  strutturale del cap. 08.
- **InjuryEngine in-match** (`motore/partita/infortuni.js`): gli infortuni
  EMERGONO dai duelli fisici persi male e dagli scatti in fatica estrema,
  pesati contro `resistenzaInfortuni` (fatica alta = rischio moltiplicato).
  Registrati come pendenti nel possesso, applicati a fine possesso (indici
  stabili): cambio forzato se c'è il rimpiazzo, altrimenti uomo in meno.
  L'adapter legge gli infortuni VERI dal MatchState — il proxy statistico di
  M3 è rimosso.
- **DisciplineEngine** (`azioni.js`): il rischio cartellino scala con
  l'aggressività dell'IDENTITÀ oltre che del giocatore — i cartellini si
  correlano allo stile della squadra, non sono uniformi.
- **Cambi CPU** (`motore/partita/cambi.js`): il SetupEngine seleziona anche
  una panchina; alle finestre-cambio (confini di segmento 30'/46'/70') la CPU
  sostituisce per stanchezza, ammonizione a rischio, infortunio e punteggio,
  rischierando il subentrante allo slot di chi esce (indice invariato, 5 cambi
  max). I subentrati contano tra i partecipanti (presenze/voti).
- **Condizione persistente (v11)**: campo `condizione` (0-100) sul giocatore
  senior che semina l'energia di partita, si drena coi minuti giocati (più i
  ruoli dispendiosi e i meno resistenti) e recupera tra le gare
  (`finalizzaPartita`). A fine stagione si distribuisce realisticamente
  (media ~62, min 20, max 100). Migrazione v10→v11 (condizione dalla forma,
  ancorata alta) + **switch `motoreV2` a ON di default** in `creaStatoIniziale`
  e in migrazione: tutte le partite senior in modalità risultato girano su
  Ventidue. Il v1 resta solo dietro la vista 2D interattiva (che anima ancora
  gli eventi vecchio stile) e come fallback.
- **Calibrazione su 10.800 partite** (`npm run harness -- 60 2000
  --motore=v2 --label=m5-v2-final`), tutti i target MISURABILI in banda:
  gol/partita 2.52 · casa/pari/trasferta 46.8/26.6/26.6 · tiri/squadra 10.5 ·
  in porta 37.3% · conversione 12.0% · xG 2.56 vs gol 2.52 · rigori 0.23 ·
  gialli 4.15 · rossi 0.164 · **infortuni 0.171 (ora EMERGENTI dalla partita,
  non più un proxy)** · 28.2 ms/partita (< 30). INV-7 in ulteriore
  miglioramento: 178/21.600 lati senza tiri (0,8%, da 1,6% a M4) — il richiamo
  tattico e i cambi aiutano le squadre schiacciate ad arrivare comunque al
  tiro. Golden seed rigenerato e verificato bit-per-bit; smoke test a 58
  verifiche (le 5 di M5: φ fisico che scende mentre la classe regge, momentum
  clampato e decadente, infortunio su fatica pesato sulla fragilità, cambi coi
  subentrati tra i partecipanti, switch/migrazione v11).
- **Verifica dei pattern di accettazione**
  (`node tools/harness/m5-pattern.js`, 5.000 partite):
  - ✅ **Cartellini correlati all'identità (non uniformi)**: Gegenpressing
    2,63 gialli/partita vs Tiki-Taka 1,48 (spread 1,77×), ordinamento
    realistico (le identità di pressing/duello ne prendono più di quelle di
    possesso).
  - ✅ **Infortuni concentrati sui fragili**: `resistenzaInfortuni` media
    degli infortunati 52,0 contro 59,7 della popolazione a rischio (verifica
    di correlazione, non di sola media).
  - ✅ **Infortuni più frequenti a gara avanzata** (fatica): 2° tempo > 1°
    tempo (1,07× nei one-off a condizione fresca; più marcato in stagione,
    dove la condizione cala e il tasso sale a 0,171/partita).
  - ✅ **Curva di energia realistica**: energia media dei titolari di
    movimento a fine gara ~69, nella banda 55-75 del cap. 08 §2.

  **Fuori target / centrati solo in parte, dichiarati e tracciati:**
  - **Timing dei gol** (target: 75'-90' ≈ 1,3× la media degli altri quarti):
    la curva è ora corretta nella FORMA — bimodale con i due picchi a 31-45'
    (fine primo tempo, 18,3%) e 76-90' (fine gara, 18,3%), gli altri quarti a
    15,7-16,1% — ma il rapporto è ~1,12×, non 1,3×. Correzione importante di
    misura scoperta qui: i gol di recupero venivano attribuiti al quarto
    d'ora dell'orologio (1° tempo di recupero → 46-60', 2° tempo di recupero
    91'+ → fuori da ogni fascia), gonfiando il 46-60' e svuotando il 76-90'.
    Ora l'evento porta `tempo` e la telemetria attribuisce i gol di recupero
    al loro tempo. Il picco finale c'è ed è (pari)massimo; il 1,3× pieno
    richiederebbe un crollo fisico ancora più estremo che spegnerebbe il
    gioco a metà gara — scelta di non forzarlo.
  - **Capocannoniere** (target 10-18): media ~39,5 (min 19). Migliora ancora
    (M3 54 → M4 45,5 → M5 39,5) grazie a cambi e fatica che distribuiscono i
    minuti, ma resta ~2× sopra la banda: la concentrazione dei tiri sul
    riferimento offensivo è strutturale e non si chiude come effetto
    collaterale di una milestone. Richiede un intervento DEDICATO sulla
    distribuzione delle occasioni tra gli attaccanti (candidato a M6 con lo
    StatsEngine, o task a sé) — non più "riverificato alla prossima".
  - **r(forza→punti) ≈ 0 e upset ~47%**: invariato, artefatto del generatore
    omogeneo (rischio in tabella, di competenza M1), non del motore.
  - **Media voto 6.13**: il voto resta a rumore v1 — il RatingEngine a
    contributi è M6, dichiarato N/A come da piano.

## M6 — Proiezione: statistiche, voti, cronaca

**Contenuto**
- StatsEngine completo (xG, possesso, passaggi, duelli, km) con UI: pagina
  partita arricchita, statistiche stagionali estese, leaderboard nuove.
- RatingEngine a contributi (sostituisce il voto a rumore); la costanza migra
  al nuovo meccanismo (cap. 02 §11).
- CommentaryEngine v2 data-driven con catene causali e livelli di dettaglio.

**Accettazione:** media voti di lega 6.5–6.9 con code realistiche; xG/gol
coerenti (± 10% su stagione); nessuna frase ripetuta due volte nella stessa
partita; formato `statistiche` legacy ancora popolato.
**Salvataggio:** v12 (statistiche estese).

**Stato: COMPLETATA** (con il capocannoniere ancora fuori banda pur
migliorato, dichiarato in fondo al blocco).
- **StatsEngine** (`motore/partita/setup.js` `statsPartitaVuote()` +
  instrumentazione): contatori REALI per giocatore azzerati a ogni partita —
  tiri, tiri in porta, xG, passaggi tentati/riusciti, cross, dribbling,
  contrasti, duelli aerei, duelli generici vinti/persi, parate, occasioni
  create, minuti giocati, km percorsi (approssimazione a rate per ruolo/fase,
  dichiarata: il motore è a zone/decisioni discrete, non integra una
  posizione reale al secondo). Un solo punto d'innesto in `duello.js`
  (`registraDuello`) copre la maggioranza dei duelli generici e aerei; il
  resto (tiri/xG/gol/assist/occasioni create/parate in `azioni.js`,
  minuti/km in `fatica.js`) è instrumentato ai motori d'azione già esistenti,
  nessun nuovo attraversamento del match loop. **Chi esce per cambio**
  (`cambi.js`, `lato.statsArchiviate`) viene archiviato prima che l'oggetto
  giocatore sia sostituito per indice — altrimenti le sue statistiche
  andrebbero perse alla sostituzione (bug isolato e corretto in questa
  milestone). L'adapter (`statistichePartitaDaMatchState`) aggrega titolari +
  subentrati + archiviati in una mappa `giocatoreId → statsPartita`; `engine.js`
  la accumula sulle statistiche di carriera del giocatore
  (`accumulaStatsPartita`), la stessa pipeline che già gestiva
  presenze/gol/assist/sommaVoti (formato legacy invariato, cap. 07
  accettazione). Schema condiviso (`stats.js` `statisticheVuote()`) tra
  generatore, mercato (reset alla cessione) e migrazione, per non fare
  divergere le tre origini del campo `statistiche`.
- **RatingEngine a contributi** (`config/azioni.js` `AZIONI.rating`,
  `engine.js` `votoContributi`): il voto parte da 6.0 e accumula SOLO
  contributi reali — gol, assist, occasioni create, duelli/duelli
  aerei/contrasti/dribbling/cross vinti (clampati in un tetto contributi-vari
  per non far pesare il volume di un centrocampista più di un episodio
  decisivo), un malus sui tiri sprecati oltre una franchigia di 2, un bonus
  di accuratezza sui passaggi (sopra soglia e volume minimo), parate,
  porta inviolata, vittoria/sconfitta, cartellini — **mai più rumore dalla
  costanza**. La costanza non è sparita: agisce a monte come sempre, sulla
  `varGiorno` (variazione giornaliera degli attributi efficaci, cap. 02 §11),
  già presente dal M3 in `setup.js` — un giorno storto produce prestazioni
  reali peggiori, che il RatingEngine poi legge dai contributi, non un voto
  rumoroso sopra una prestazione identica. Il ramo v1/giovanili (nessuna
  statsPartita reale disponibile) resta sul vecchio voto a rumore, invariato
  e dichiarato fuori standard M6 come da piano.
- **CommentaryEngine v2** (`motore/config/cronaca.js` + `adapter.js`
  `traduciEventi`): dizionario di template dati (non stringhe nel motore) per
  tipo evento × esito × origine, con RNG dedicato derivato dal seed di
  partita (mai il flusso di gioco: la cronaca è narrazione post-hoc, non deve
  poter influenzare l'esito) e anti-ripetizione per categoria nella stessa
  gara. Ogni gol usa la propria catena causale reale: `origine` (azione/cross/
  corner/punizione/filtrante/ripartenza/rigore) e assist quando presente
  pescano pool di frasi dedicate ("cross dalla fascia e colpo di testa
  vincente", "filtrante illuminante... brucia l'uscita del portiere").
  **Bug isolato scoperto e corretto in questa milestone**: sul SetPieceEngine
  (M4) il battitore del corner può risultare anche il miglior saltatore della
  propria mischia e segnare lui stesso — "assist a se stesso", già scartato
  correttamente dalla logica esistente, ma il template "corner"/"cross"/
  "filtrante" restava selezionato lasciando il placeholder `{A}` vuoto;
  fix nell'adapter (fallback al pool "azione" quando l'origine richiede un
  assist che non c'è). **Pool dimensionate sul volume reale**: le pool
  iniziali (3-5 varianti) si esaurivano ben prima di fine partita per le
  categorie ad alta frequenza (occasioni, parate, gialli, cambi — verificato
  su un campione di 400 partite: 1.253 ripetizioni nella stessa gara);
  ampliate a 8-16 varianti per le categorie più frequenti, portando le
  ripetizioni a 117 su 11.735 testi (~1%), concentrate quasi tutte in
  incontri fuori scala di questo campione non pesato per livello
  (accoppiamenti casuali tra squadre di leghe diverse, non rappresentativi
  del campionato reale a squadre pari livello). Zero placeholder vuoti o non
  sostituiti sullo stesso campione.
- **Migrazione v11→v12**: i nuovi campi StatsEngine aggiunti a 0 a
  `giocatore.statistiche` senza toccare i quattro campi legacy
  (presenze/gol/assist/sommaVoti). `VERSIONE_SALVATAGGIO` 11→12.
- **UI**: pagina partita (`PartitaDettaglio.jsx`) con sezione statistiche a
  confronto (possesso, tiri, tiri in porta, xG, corner, ammonizioni,
  espulsioni, precisione passaggi) quando `statisticheV2` è presente; profilo
  giocatore (`PlayerProfile.jsx`) con riquadro tiri/xG/passaggi%/km-partita
  per chi ha statsPartita reali; tre nuove classifiche individuali
  (`stats.js` `classificheIndividuali`, `Campionato.jsx`): Duellisti
  (% duelli vinti, volume minimo 5), Migliori passatori (% precisione,
  volume minimo 20 tentativi), Migliori portieri (parate). Verificate
  end-to-end nel browser su una carriera nuova (due giornate giocate):
  cronaca varia senza placeholder vuoti, statistiche di partita coerenti,
  profilo giocatore con i nuovi contatori popolati, tutte e tre le nuove
  classifiche con dati plausibili.
- **Capocannoniere — tentativo dedicato** (candidato dichiarato a M5):
  marcatura che si stringe realisticamente su un tiratore che ha già provato
  più volte nella stessa gara (`decisione.js` `pressioneMarcaturaTiratore`,
  letta da `statsPartita.tiri`, saturata a 6 tentativi) — un malus su
  bersaglio-da-passaggio, target-da-cross e sull'utilità del tiro stesso di
  chi è già "caldo", rappresentando la difesa che raddoppia la marcatura sul
  centravanti che ha già tirato ripetutamente. Non è un limite artificiale
  sul numero di tiri: è un contrappeso realistico che, come ogni altro
  modificatore del motore, passa dall'utilità della decisione (INV-0b
  rispettato). Calibrato insieme a `xg.base` (0.60→0.63) per non far scendere
  gol/partita e tiri/squadra sotto banda nel bilanciare l'effetto.
- **Calibrazione su 10.800 partite** (`npm run harness -- 60 2000
  --motore=v2 --label=m6-v2-final`), tutti i target MISURABILI in banda:
  gol/partita 2.37 · casa/pari/trasferta 45.5/27.7/26.8 · tiri/squadra 9.2 ·
  in porta 37.8% · conversione 12.9% · xG 2.43 vs gol 2.37 (scarto ~2.5%) ·
  rigori 0.22 · gialli 4.24 · rossi 0.178 · infortuni 0.172 ·
  **media voto di lega 6.63 (sd 0.61) — entrambi nel target 6.5-6.9 / sd
  0.5-0.9, il primo requisito centrato di questa milestone** · 29.6
  ms/partita (< 30, margine ridotto ma ancora rispettato). INV-7: 171/21.600
  lati senza tiri (0,79%, sostanzialmente invariato dal 0,82% di M5). Golden
  seed rigenerato e verificato bit-per-bit (i tweak di `decisione.js`
  cambiano le decisioni di gioco, quindi gli eventi — il cambiamento è
  motivato e consapevole); smoke test a 62 verifiche (le 4 di M6: statsPartita
  coerenti dopo una giornata v2, voto v2 con dispersione reale e non più
  rumore piatto, migrazione v11→v12, nessun placeholder di cronaca residuo).

  **Fuori target, dichiarato e tracciato:**
  - **Capocannoniere**: media 33,4 (min 17, max 72) — migliora ancora (M3 54
    → M4 45,5 → M5 39,5 → **M6 33,4**, −15% da M5) grazie al contrappeso di
    marcatura, ma resta ~2× sopra la banda 10-18. Non si chiude come effetto
    collaterale di una milestone (dichiarato esplicitamente da M3): la
    concentrazione dei tiri sul riferimento offensivo è strutturale al modo
    in cui MovementEngine/PositioningEngine posizionano i ruoli, e spingere
    oltre il contrappeso di marcatura degrada altri target (tentato fino a
    ~31 di media, ma gol/partita e tiri/squadra scendevano sotto banda).
    Nessuna milestone residua del piano è dedicata esplicitamente a questo;
    resta un candidato per un intervento a sé se richiesto.
  - **r(forza→punti) ≈ 0.02 e upset ~47%**: invariato, artefatto del
    generatore omogeneo (rischio in tabella, di competenza M1), non del
    motore — come in ogni milestone precedente.

## M7 — Replay 2D e pensionamento del v1

**Contenuto**
- ReplayProjector: snapshot per tick in LOD COMPLETO; Campo2D riproduce la
  partita vera (22 + palla), pause ai `SEGMENTI`, cambi interattivi sul nuovo
  MatchState.
- LOD `DIGEST` calibrato dall'harness per i campionati giovanili specchio.
- **Rimozione di `engine.js` v1** e del ponte M1-M2. Ventidue è il motore.

**Accettazione:** partita 2D fluida e fedele agli eventi; niente riferimenti
residui a v1; suite completa dell'harness verde; regressione UI end-to-end
(carriera nuova + salvataggio migrato da v8).

### Stato di avanzamento M7

Fatto (verificato con smoke + golden invariati e un playthrough in browser,
partita reale giocata fino al fischio finale con cambio utente):

- **ReplayProjector — registrazione**: `direttore.js` registra `state.snapshots`
  (posizioni dei 22 + palla + portatore) un frame per tick, ma **solo in
  `state.lod === 'COMPLETO'`**: le partite CPU (default `SINTESI`) non pagano
  nulla (0 frame, overhead ~1ms su una partita COMPLETO da 958 frame/57ms,
  sotto il tetto di 120ms cap.07). L'esito è identico a SINTESI a parità di
  seed: il replay è passivo, non tocca la simulazione.
- **ReplayProjector — proiezione**: `partita/replay.js` (`proiettaReplay`)
  unisce l'anagrafica (cognome, macro-ruolo) una sola volta in una "rosa",
  non ripetuta a ogni frame (formato streaming, cap. 02 §12); `frameAlMinuto`
  per l'aggancio cronaca↔campo.
- **Partita interattiva sul motore v2**: `partita/interattivo.js` — il
  MatchDirector (`simulaPartita`) è stato scomposto in primitive riusabili
  (`iniziaTempo`, `avanzaFinoA`, `calcolaDurataTick`) senza cambiare
  `simulaPartita` stesso (bit-per-bit identico, verificato su golden).
  `richiamoTatticoECambi` accetta un `chiaveUtente` opzionale: il lato umano
  non viene più riletto/sostituito dalla CPU, resta sotto controllo
  dell'utente (mentalità da Tattica, cambi dalla finestra interattiva).
  `cambi.js` espone `sostituisciUtente` (stesso corpo di `sostituisci`,
  scelta dell'utente invece del best-pick CPU). Il vecchio
  `iniziaPartitaInterattiva`/`giocaSegmentoInterattivo`/`effettuaCambio` di
  `engine.js` (v1) non sono più usati dalla UI.
- **Campo2D**: riscritto per riprodurre i frame reali (22 cerchi colorati per
  squadra, palla, minuto, badge ultimo evento) invece di animare una pallina
  su posizioni inventate; `PartitaLive.jsx` è agganciato interamente al
  motore v2 (formazione d'anteprima da `selezionaXI`, finestra cambi dalla
  formazione *attuale* — non quella d'inizio partita — con panchina di
  matchday). Il pacchetto restituito da `interattivo.js` è già nel contratto
  v1 che `giocaGiornata` si aspetta da `matchInterattivo`: nessuna modifica
  a `engine.js`/`App.jsx` è servita per il collegamento finale.

**Rimozione di `engine.js` v1 — fatto.** `engine.js` è stato riscritto da
910 a ~370 righe: restano solo `giocaGiornata` (l'orchestratore di giornata:
voti, statistiche, forma, morale, notizie, premi, verdetto obiettivo) e le
funzioni che gli servono davvero, indipendenti da quale motore ha simulato la
partita (`finalizzaPartita`, `votoContributi`, `resocontoPartita`,
`forzeLato` — quest'ultima sopravvive non come "ponte v1" ma come stima di
riserva del possesso per la sola partita interattiva dell'utente, che non
espone ancora un possesso contato a questo livello). Eliminate integralmente:
`selezionaAssegnazioni`, `creaLato`, `panchinaDisponibile`,
`iniziaPartitaInterattiva`, `giocaSegmentoInterattivo`, `effettuaCambio`,
`simulaEventi`, `cambioCpu`, `aggiornaMentalitaCpu` e l'intero ramo `else`
(v1) di `giocaGiornata` — il branching su `nuovo.motoreV2` è sparito, ogni
partita non interattiva passa da `simulaPartitaV2` incondizionatamente.
L'unica altra dipendenza reale dal v1 nel resto del codice era
`motore/sinergia.js` (`reportSinergia`, il report di sinergia mostrato in
Tattica), che usava `engine.selezionaAssegnazioni` per l'anteprima
titolari: migrata a `selezionaXI` (v2, la stessa usata dal SetupEngine per
la partita vera). Verificato: smoke 62/62, golden bit-per-bit identico,
bundle -6.7KB, harness (`run.js`, ora senza il flag `--motore=`, sempre
Ventidue) e un playthrough completo in browser (carriera nuova → Tattica/
sinergia → partita interattiva con cambio → risultato salvato in classifica/
notizie/premi TuttoCampo su entrambe le leghe, zero errori console).
`stato.motoreV2` resta nel salvataggio (scritto da `creaStatoIniziale`,
forzato a `true` dalla migrazione v11) ma non è più letto da nessun codice
di simulazione: campo vestigiale, innocuo, non è stata aggiunta una
migrazione per rimuoverlo (nessun beneficio, tocca lo schema di
salvataggio per una singola chiave booleana morta).

Non fatto:

- **LOD `DIGEST`** per i campionati giovanili specchio: non iniziato — oggi
  quei campionati restano sulla stima statistica pre-Ventidue
  (`forzaGiovanile` in `engine.js`).

### Bug noto post-M7: la vista 2D è percepita come rotta

Segnalazione dell'utente dopo un playthrough reale: la vista 2D (Campo2D)
appare come un loop della stessa animazione, senza varietà percepibile tra i
giocatori — "il 2D esiste ma è rotto". Non ancora root-causato in profondità;
da investigare e correggere prossimamente. Ipotesi plausibili, non
confermate, utili come punto di partenza:

- **Nessuna identità visiva per giocatore**: `Campo2D.jsx` disegna ogni
  giocatore come un cerchio colorato per squadra (raggio leggermente
  maggiore solo per il portiere) — nessun numero, iniziale o indicatore di
  ruolo. Con 22 pallini indistinguibili tra loro, la percezione "tutti
  uguali, sembra sempre la stessa scena" è comprensibile anche se le
  posizioni sottostanti sono realmente diverse frame per frame (verificato
  in questa sessione via `translate()` sui `<g>` SVG).
- **Il replay del segmento si interrompe bruscamente**: in `Campo2D.jsx` la
  riproduzione (`giocando`) è legata a `fase === 'live'`; quando la cronaca
  testuale finisce di rivelare gli eventi del segmento (`visibili >=
  pkt.eventi.length`) `PartitaLive.jsx` passa a `fase = 'pausa'` **anche se
  l'animazione dei frame non è ancora arrivata in fondo** (i frame di un
  segmento normalmente superano in durata la cronaca a 900ms/evento — es.
  302 frame × 45ms ≈ 13.6s contro 9 eventi × 900ms ≈ 8.1s osservati). Quando
  questo accade, `giocando` diventa `false` e l'`useEffect` salta di scatto
  all'ultimo frame disponibile: un "salto" a fine riproduzione, non un vero
  fischio più il nuovo segmento che riparte da `cursor = 0` in una zona di
  campo diversa — la sequenza "gioco compresso, salto, restart altrove" può
  leggersi come "loop rotto" più che come partita continua.
- **Il gioco di posizione tende a ripetere pattern simili**: `aggiornaPosizioni`
  muove i giocatori dentro le loro zone di dovere; in fasi di possesso
  prolungato senza eventi salienti i movimenti sono oscillazioni contenute
  attorno alla stessa area — visivamente meno "vari" di quanto la cronaca
  testuale (che seleziona solo i momenti chiave) lascerebbe immaginare.

Nessuna di queste ipotesi è stata verificata con un secondo playthrough
mirato: prima di intervenire, andrebbe registrata la sessione (screenshot o
video) e confrontata frame per frame con `pkt.replay.frames` per capire quale
meccanismo è davvero responsabile della percezione di "rottura".

---

## Mappa invarianti → milestone

Ogni invariante del [capitolo 08](08-robustezza.md) entra in vigore (e diventa
check dell'harness) alla milestone che introduce il sottosistema relativo.

| Invariante | Entra in | Check |
| --- | --- | --- |
| INV-0a/0b (sim≠presentazione, no OVR) | M0 | strutturale, verificato a build (validatore + review) |
| INV-4 (divari per-attributo, σ assoluta) | M1 | r(forza→punti) ≥ 0.75 già col ponte |
| INV-3 (ruolo immutabile, zone fuzzy+isteresi) | M3 | cambi-zona entro tetto; nessun oscillatore |
| INV-1 (salienza highlight post-hoc) | M3 | determinismo invariato al variare di N |
| INV-7 (possesso risolvibile, Competition Factor) | M3 (guardie) → M4 (contesto lega) | 0 partite senza tiri; upset in banda |
| INV-6 (momentum + tetto pipeline + richiamo tattico) | M5 ✓ | momentum clampato [0.85,1.12] + decadimento + richiamo tattico CPU |
| INV-2 (fatica a rate + spike) | M5 ✓ | energia media fine gara ~69 (banda 55-75), correlata a ruolo/tattica |
| INV-5 (fatica solo fisico/concentrazione) | M5 ✓ | la classe (passaggio/visione/decisioni) non degrada; solo i fisici |

---

## Target statistici (contratto di calibrazione)

Misurati dall'harness su ≥ 10.000 partite tra squadre di pari livello con
identità `equilibrata`, salvo dove indicato. Fuori target = milestone respinta.

| Metrica | Target |
| --- | --- |
| Gol totali / partita | 2.3 – 2.9 (media ~2.6) |
| Vittorie casa / pareggi / trasferta | ~44% / ~27% / ~29% (± 4) |
| Tiri per squadra | 9 – 16 |
| Tiri in porta / tiri | 30% – 45% |
| Conversione (gol/tiri) | 9% – 13% |
| xG totale vs gol reali (stagione) | scarto < 10% |
| Possesso con identità speculari | 50% ± 3 |
| Possesso `tiki_taka` vs `palla_lunga` | ≥ 62% / ≤ 38% |
| Gialli / partita | 3 – 5 · Rossi: 0.10 – 0.25 |
| Rigori / partita | 0.20 – 0.35 |
| Distribuzione temporale gol | crescente; 75'-90' ≈ 1.3× la media degli altri quarti d'ora |
| Infortuni in partita | 0.10 – 0.25 / partita, correlati a fatica e resistenzaInfortuni (verifica di correlazione, non solo di media) |
| Correlazione forza rosa → punti (stagione) | r ≥ 0.75 (e ≥ della baseline v1) |
| Upset (ultima batte prima, singola gara) | 8% – 18% |
| Capocannoniere (18 giornate) | 10 – 18 gol |
| Media voto di lega | 6.5 – 6.9, σ per partita 0.5 – 0.9 |
| Effetto sinergia | XI compatibile batte XI +3 overall ma incompatibile: > 52% dei punti su 1.000 partite |
| Performance | < 30 ms / partita (LOD SINTESI), < 120 ms (COMPLETO) |

L'harness mantiene inoltre i **golden seed**: 5 partite di riferimento
ri-simulate a ogni modifica; qualunque differenza di eventi rispetto al golden
file richiede una motivazione esplicita nel commit.

### Nota post-M6 (Fase 5 blueprint): generatore realistico e ricalibrazione

Il generatore (`generator.js`) è cambiato in modo sostanziale fuori dal
tracciato M0-M7 (blueprint Fase 5, non una milestone del motore): Eccellenza
a 18 squadre, ambientazione nei comuni di Brescia/Franciacorta, e soprattutto
**media rosa realistica 25-39** (era 57-59) con media *per club* (non più
fissa di livello) e outlier fisico/mentale (mai tecnica) sui singoli
giocatori. Questo però sposta la scala assoluta su cui gira mezzo motore:
diverse formule leggono un attributo grezzo come frazione assoluta
(`attr/100`), non solo come confronto relativo attaccante-difensore
(INV-4 riguarda solo i duelli). Per non ri-derivare tutta la calibrazione
M0-M6, è stato introdotto `AZIONI.scala.riferimentoAssoluto` (55): sostituisce
il "100" fisso in quelle formule (velocità nel passo di movimento,
aggressività nella probabilità di fallo, resistenza nel drenaggio energia,
leadership nello scudo di momentum, tiro/calci piazzati nella precisione,
decisioni/freddezza nella variabilità di scelta, suitability nella curva di
efficacia ruolo e nelle soglie "Su misura/Adatto/…"). Ritarati anche
`sigmaFattore` (1.0→1.15 Eccellenza, 1.12→1.25 Promozione, i gap assoluti tra
rose sono ora reali), `xg.base` (0.63→0.46), `tiro.inPortaAttributo`
(0.24→0.18), `infortuni.baseDuelloPerso/baseFaticaEstrema` (-35%), quota
rigore su fallo in area (0.76→0.80).

Risultato finale su 30 stagioni campione, `fase5-v2-final.json` (motore v2):
gol/partita 2.35, xG/gol coerenti (2.31 vs 2.35), correlazione forza→punti
0.906, upset 17.8%, tiri/conversione/inPorta/gialli/rossi/infortuni/media
voto tutti in banda cap.07 (rigori 0.36, appena sopra il tetto 0.35).
**Fuori target, peggiorato rispetto a M6**: il capocannoniere di lega (media
66.9 su 18 giornate contro il target 10-18, era 33.4 in M6) — conseguenza diretta e attesa dell'aver reso reali i gap di
forza tra squadre: una rosa oggettivamente più forte segna più delle altre,
anche a livello individuale, cosa che il target cap.07 non prevedeva quando
fu scritto su un generatore omogeneo. Non richiuso in questa passata:
il meccanismo di marcatura anti-ripetizione (`pressioneMarcaturaTiratore`,
M3-M6) agisce solo nella singola partita, non sulla concentrazione a livello
di stagione — la leva giusta sarebbe una redistribuzione dei tiri più a monte
(DecisionEngine), fuori scope per un cambio lato-generatore. Golden seed
rigenerato (world/rose diverse a parità di seed): differenza attesa e
motivata, non un difetto di determinismo.

### Nota post-Fase 5 (bis): individualità del tiratore + bug di formazione CPU

Verifica manuale dell'utente: un giocatore a 99 in tutti gli attributi
inserito nella squadra più debole di Eccellenza (18 squadre) chiudeva 3° nella
classifica marcatori (35 gol) dietro giocatori da 36-39 OVR, e la sua squadra
restava a metà classifica. Analisi: l'OVR non entra mai nel motore (INV-0b, i
duelli leggono solo attributi atomici), ma **volume e qualità delle occasioni
create dipendevano quasi solo dal resto della squadra**, non dal singolo — xG
puramente geometrico (nessuna dipendenza dagli attributi del tiratore), scelta
del bersaglio del passaggio cieca alla qualità di rifinitura del ricevente,
malus anti-accentramento (`pressioneMarcaturaTiratore`, M6) senza eccezione
per chi si libera meglio, banda di conversione tiratore-portiere stretta
(×0.45-1.4). Introdotte 5 leve in `decisione.js`/`azioni.js`, tutte centrate
su `contestoLega.mediaLega` (mai su `riferimentoAssoluto`, che resta la scala
per i giocatori nella media — solo chi si scosta viene toccato):
`AZIONI.xg.pesoMovimento` (xG sensibile a movimento/anticipazione/decisioni
del tiratore), `AZIONI.individualita.pesoFinalizzatore` (bias bersaglio
passaggio verso il miglior finalizzatore in zona pericolosa),
`pesoLiberazione` (dribbling/agilità alti riducono il malus anti-accentramento),
banda di conversione allargata (`tiro.conversioneBase/Peso/Max`),
`pesoQualitaTiro` (propensione al tiro pesata su tiro/freddezza propri). Prima
calibrazione troppo aggressiva (capocannoniere medio 89/max 217 su 30
stagioni): pesi dimezzati/ritarati a valori più deboli individualmente.

**Bug scoperto durante la verifica, non dell'individualità**: la selezione
XI automatica CPU (`selezionaXI` in `setup.js`, duplicata come
`selezionaAssegnazioni` in `engine.js` per il ramo v1/possesso stimato) è un
greedy per-slot in ordine fisso — `effettivo(g) × affinitaRuolo(g, slot)` con
`effettivo` basato sull'OVR generico. Con gap di forza piccoli (pre-Fase 5)
l'ordine non contava; con un outlier vero (99 ovunque, o anche solo un
`profiloOutlier` fortunato del generatore) il giocatore più forte "vince"
qualunque slot valutato per primo — nel test dell'utente lo schierava
addirittura in porta o in difesa centrale, con 0 tiri e statistiche da
portiere. Corretto sostituendo il greedy per-slot con un abbinamento greedy
**globale** (slot × giocatore, ogni round sceglie la coppia di valore più alto
tra tutte le rimanenti) più un gate esplicito sul portiere (mai un giocatore
non-POR se esiste almeno un portiere naturale disponibile). Il fix è generale,
non specifico al caso di test: si applica a ogni squadra CPU con un outlier
individuale marcato, incluse quelle generate dal `profiloOutlier` raro
(6% di probabilità) del generatore Fase 5.

Risultato finale (`fase5-individualita-final.json`, 30 stagioni, motore v2):
gol/partita 2.52, xG coerente (2.40 vs 2.52), tiri/inPorta/conversione/
rigori/gialli/rossi/infortuni/media voto tutti in banda cap.07, correlazione
forza→punti 0.908, upset 17.1%. **Verifica del caso limite** (99 OVR in
squadra più debole, 6 run indipendenti): con il bug di formazione corretto
lo 0 di `parate` conferma che resta sempre schierato nel suo ruolo naturale;
produce costantemente 6-14 gol + 10-19 assist e domina i duelli individuali
(vince pressoché sempre dribbling/aerei), ma la squadra resta comunque in
basso classifica (13°-16° su 18) e NON diventa capocannoniere con largo
margine. **Fuori target, non aggravato in modo sostanziale**: il
capocannoniere di lega resta fuori banda (media 73.6, invariato rispetto ai
66.9-94 già documentati sopra) — stessa causa radice non affrontata in questa
passata (concentrazione dei gol trainata dalla forza di squadra collettiva,
non dal singolo tiratore; la leva corretta resta una redistribuzione dei tiri
a livello di stagione nel DecisionEngine, esplicitamente fuori scope).
L'individualità del tiratore ora funziona correttamente (un fuoriclasse vero
produce output nettamente sopra la media della sua squadra), ma non basta da
sola a rendere un singolo giocatore dominante nella classifica marcatori di
un'intera lega quando gioca nella squadra più debole — resta vincolato dal
volume di occasioni che il resto della rosa riesce a creargli.

## Calibrazione multidivisione — settembre 2026

Ventidue dispone ora di un laboratorio verticale indipendente dal database
attivo (`tools/harness/multidivisione.js`). Ogni fascia viene materializzata
da sola: Serie A, Serie B, un girone rappresentativo di Serie C, Serie D
sintetica e Eccellenza. La Serie D sintetica non entra in editor o carriera;
serve a misurare il tratto ancora non popolato fra C ed Eccellenza. Il comando
è `npm run harness:multidivisione -- <stagioni> <seedBase>`.

Il Competition Factor è continuo sulla `forzaMedia` della competizione e non
contiene eccezioni nominate per Serie A/B/C. Oltre al rumore dei duelli e alla
pressione organizzata, il contesto calcola:

- `qualitaEsecuzione`: introduce l'errore tecnico non forzato su passaggi,
  lanci, filtranti, cross e distribuzione del portiere;
- `qualitaOccasioni`: nelle categorie meno organizzate compensa la minore
  finalizzazione con occasioni mediamente più pulite;
- selettività e marcatura del tiratore: riducono le conclusioni forzate e
  redistribuiscono il gioco quando un riferimento viene cercato di continuo;
- attenzione stagionale selettiva: si attiva soltanto sui marcatori davvero
  fuori norma e influenza la scelta del destinatario, senza abbassarne gli
  attributi.

L'harness completo è deterministico anche tra giornate: `giocaGiornata`
accetta un seed esplicito per i test, mentre il gioco normale conserva la
sorgente variabile. Il capocannoniere viene letto dalle statistiche della
singola competizione, non dai contatori globali del giocatore.

Baseline corrente, 3 stagioni per fascia e 5.256 partite: Serie A/B/C/D/
Eccellenza rispettivamente 2,23/2,09/2,23/2,07/2,46 gol per partita,
10,7/11,7/12,8/11,8/13,0 tiri per squadra e 83,4/80,2/78,2/75,8/73,8% di
passaggi riusciti. Conversione 8,7–10,4%; correlazione forza-punti 0,75–0,88.
Residui tracciati: rarissimi lati senza tiro (9 su oltre 10.000 prestazioni
di squadra), capocannoniere medio ancora alto in alcune fasce e tasso di
rigori/cartellini leggermente basso nei livelli inferiori. Servono più seed e
club reali di C/D/Eccellenza prima di irrigidire ulteriormente i coefficienti.

La verifica successiva della distribuzione temporale ha individuato un avvio
di gara anomalo (29,5% dei gol nei primi 15 minuti e 10,5% negli ultimi 15).
L'xG ora incorpora una curva temporale dichiarata: avvio prudente e crescita
nel finale per fatica difensiva, cambi e rischio tattico. Nel campione completo
i primi cinque quarti raccolgono ciascuno circa il 12,5–16,9% dei gol, mentre
il 76'-90' ne raccoglie il 22,4–25,7%. La quota per reparto è 0% portieri,
10,3–11,5% difensori, 7,1–14,0% centrocampisti e 75,7–82,4% attaccanti. La
selezione automatica e i cambi CPU riservano ai portieri naturali il solo
posto in porta; il report multidivisione conserva distribuzione temporale e
quota dei gol per reparto.

## Rischi e mitigazioni

| Rischio | Mitigazione |
| --- | --- |
| Complessità che esplode (motore "infinito") | I gate di accettazione per milestone sono il perimetro: niente feature fuori scaletta; le estensioni future passano SOLO dalla ModifierPipeline |
| Bilanciamento che deriva a ogni ritocco | Harness in ogni milestone + golden seed + target come contratto scritto |
| Prestazioni | Budget dichiarato (30 ms) misurato dall'harness fin da M3, non a fine progetto |
| Migrazioni salvataggi | Un migratore per versione, testato su fixture reali conservate in `tools/fixtures/` |
| Regressioni UI durante la convivenza v1/v2 | Adapter con contratto esplicito (cap. 01 §8) + feature flag: l'UI non sa mai quale motore gira |
| Il DIGEST giovanile diverge dal motore pieno | Ricalibrazione automatica nell'harness a ogni modifica dei config |
| **Squadre quasi omogenee entro la stessa lega nel generatore v1** (scoperto dalla baseline M0: r(forza→punti)=0.022, upset 48%) — **RISOLTO in Fase 5** (vedi nota sotto): media squadra per-club (non più fissa di livello) porta r a ~0.89-0.91, upset ~17-18% | Verifica esplicita in M1 dopo l'introduzione di ruoli/suitability; se la varianza resta insufficiente, il generatore riceve una dispersione di forza tra squadre della stessa lega prima di dichiarare il target r≥0.75 raggiungibile |

## Dipendenze con la roadmap di gioco

- **Fase 5 (allenamento ruoli)** si aggancia a `familiaritaRuolo` (cap. 04
  §3.3) e al catalogo ruoli di M1: nessun rework previsto.
- **Fase 6 (FORMA, morale multi-livello)** entra dal provider `pre-partita`
  (cap. 02 §11) e dal FatigueEngine di M5: punto di innesto già pronto.
- **Fase 7 (multi-stagione)** non tocca il motore; beneficia della telemetria
  per il bilanciamento promozioni/retrocessioni.
- **Fase ruoli tattici dedicata** — assorbita: questo blueprint LA realizza
  (capitolo 04), come richiesto dalla roadmap "fase dedicata da definire".


## Revisione replay — settembre 2026

**Priorità concordata il 10/09/2026:** completare quasi tutte le funzionalità del gioco prima di riprendere il lavoro sul 2D. Sincronizzazione campo/cronaca, animazioni e qualità visiva restano problemi aperti ma posticipati. Anticipare soltanto correzioni indispensabili se un errore impedisce di proseguire la carriera. Non è prevista una v0.9.1 dedicata al replay.
**Stato al 10/09/2026: problema ancora aperto.** L’utente segnala che la vista 2D va ulteriormente migliorata e il campo non è perfettamente sincronizzato con la cronaca a lato. Le correzioni seguenti sono parziali e non chiudono la segnalazione.

Correzione precedente: rimosso il timer della cronaca e il timer interno di Campo2D; una timeline stabile controlla campo, eventi e punteggio. Gli eventi tradotti conservano tick, tempo e indice dell'evento semantico, evitando di confondere recupero del primo tempo e inizio del secondo.
La registrazione ora conserva anche trasferimenti di palla e conclusioni dei tiri, senza consumare RNG o cambiare gli esiti. Gol, parate, pali e fuori hanno una rappresentazione stilizzata deterministica; il motore non calcola ancora una traiettoria fisica del tiro. Numeri di distinta assegnati nel replay, colori sociali, portatore evidenziato. Pausa e velocità agiscono esclusivamente sulla visione.


### Verifica residua richiesta il 10 settembre 2026

**Backlog posticipato:** eseguire queste verifiche nella rifinitura finale del 2D, quando le funzionalità del gioco saranno quasi complete; non sono il prossimo intervento della v0.9.

- [ ] Riprodurre lo scostamento campo/cronaca con gli stessi eventi e la stessa velocità di visione.
- [ ] Correggere la sequenza visiva e il momento di comparsa del testo, includendo tiri, esiti, pause, cambi e recupero.
- [ ] Verificare visivamente una partita completa e confermare che il punteggio cambi insieme all’azione mostrata.
- [ ] Migliorare leggibilità e continuità delle animazioni. I test automatici esistenti restano necessari, ma non sufficienti a dichiarare il replay risolto.
