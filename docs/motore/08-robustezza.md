# 08 — Robustezza e invarianti

Questo capitolo blinda il motore contro sette patologie strutturali individuate
in fase di revisione del blueprint. Ogni sezione fissa un **invariante**: una
proprietà che il motore deve mantenere sempre, e che l'harness di calibrazione
(cap. 07) verifica a ogni milestone. Le formule qui riportate sono contratto, i
coefficienti sono soggetti a taratura.

Due chiarimenti architetturali reggono metà del capitolo e vanno enunciati una
volta sola, perché diverse "falle" nascono dal dimenticarli:

- **INV-0a — Simulazione ≠ presentazione.** Lo strato 2 produce *la partita*
  (tutti i tick, tutti gli eventi); lo strato 3 *proietta* (highlight, cronaca,
  2D). Nessun parametro di presentazione può alterare la simulazione.
- **INV-0b — Il motore gira sugli attributi atomici, mai sull'OVR.** L'OVR è un
  riassunto pesato per UI e mercato. Nessun duello, nessun modificatore legge
  l'OVR. I confronti sono sempre attributo-contro-attributo.

---

## 1. Budget highlight vs tick continui

**Patologia:** se il numero di momenti salienti fosse un budget imposto alla
simulazione, un'azione perfetta oltre budget andrebbe soppressa (rompe il
determinismo) o sforata (partite infinite).

**Invariante INV-1:** il numero di highlight è un parametro di *presentazione*.
La simulazione non lo conosce e non ne è vincolata. Nessun evento reale viene
mai soppresso: al più, non viene *raccontato*.

**Meccanismo:** ogni evento sul bus riceve una **salienza** deterministica.

```
S(e) = w1·xG(e) + w2·impattoPunteggio(e) + w3·raritàEsito(e)
     + w4·svoltaNarrativa(e) + w5·qualitàAzione(e)
```

Il reel è `top-N` per salienza con **soglia adattiva** che mira a una banda
(default 16–24), non a un numero fisso:

```
soglia = percentile(salienze, 100·(1 − Ntarget / numEventi))
reel   = { e : S(e) ≥ soglia }
```

- Determinismo preservato: `S` è deterministica, la selezione è *post-hoc*.
- Durata costante: la simulazione è < 30 ms qualunque sia N (cap. 01 §7).
- Un gol trascina la sua catena causale (`origine`, cap. 02 §3) come **capitolo
  unico**: il reel racconta l'azione, non il solo tiro.

**Verifica harness:** su un match dato, cambiare Ntarget non cambia di un bit il
`MatchState` finale né gli eventi (solo l'insieme `reel`).

---

## 2. Fatica nel tempo continuo

**Patologia:** integrare la fatica sullo spostamento in coordinate a ogni tick
brucerebbe energia nei tratti non salienti; congelarla o applicarne una lineare
uguale per tutti negherebbe la simulazione continua.

**Invariante INV-2:** la fatica è un **modello a rate sul minuto di gioco**, non
sul tick di simulazione, con sovrapposti gli **spike** degli eventi ad alta
intensità realmente occorsi.

**Meccanismo:**

```
E(t) = E0 − ∫ rateBase(ruolo, tattica, fase) dt − Σ_k spike_k

rateBase = drift0 · fattoreRuolo(ruolo) · (tattica.consumoEnergetico / 50)
                  · intensitàFase(fase) · pressioneContestuale
spike_k  = costo(azione_k)   per scatti, trigger di pressing, duelli fisici
```

- L'integrale è **analitico**: `rateBase · Δminuti`, calcolato per intervalli di
  fase, non tick per tick → costo O(numero di fasi), non O(secondi).
- `fattoreRuolo` distingue un Tuttafascia (alto) da un Difensore Centrale
  (basso); `pressioneContestuale` cresce se entrambe le squadre alzano
  l'intensità (chi pressa tanto ed è pressato tanto consuma di più).
- Gli spike contano solo azioni **davvero simulate** nei possessi, mai stimate.

**Punto d'innesto:** provider `fatica` della ModifierPipeline. **Verifica
harness:** curva media di energia a fine partita nella banda realistica
(titolari 55–75%), correlata a resistenza e a `consumoEnergetico` della tattica.

---

## 3. Jittering ai confini della griglia

**Patologia:** un giocatore sul confine tra due zone cambierebbe zona logica a
ogni micro-spostamento, con switch frenetico di comportamento e sovraccarico CPU.

**Invariante INV-3a — Il ruolo è immutabile in partita.** Le
`prioritaDecisionali` appartengono al ruolo assegnato al setup, non alla cella
istantanea. Un Regista Basso resta Regista Basso ovunque poggi i piedi: lo
switch "Regista↔Trequartista" non può strutturalmente avvenire.

**Invariante INV-3b — La lettura dello spazio usa appartenenza fuzzy + isteresi**,
mai assegnazione netta di cella.

```
appartenenza(g, z) = softmax( −dist(pos_g, centro_z)² / 2τ² )
```

Il comportamento vicino a un confine **interpola** sulle appartenenze, non
scatta. Dove serve una zona discreta (trigger, conteggi), dead-band a doppia
soglia:

```
cambio zona logica  ⟺  penetrazione oltre il confine > δ  ∧  permanenza ≥ K tick
soglia_ingresso > soglia_uscita          (isteresi)
```

**Costo CPU:** il ricalcolo scatta solo all'attraversamento reale, non a ogni
tick. **Verifica harness:** conteggio dei cambi-zona per giocatore entro un
tetto fisiologico; nessun oscillatore a due tick.

---

## 4. Compressione dell'OVR nelle categorie basse

**Patologia:** con OVR medio 25–30 in Eccellenza, i divari sembrano schiacciarsi
in pochi punti e i modificatori rischiano di azzerarli.

**Invariante INV-4:** i divari che il motore usa sono **per-attributo**, non
sull'OVR, e non sono compressi.

**Meccanismo, tre leve:**

1. **Generazione a σ costante tra leghe.** La lega fissa la *media*; la
   deviazione standard per attributo resta ~10–12 punti a ogni livello.
   Eccellenza: media 30, σ 11 → 20+ punti di spread reale sugli attributi chiave.
2. **Il duello confronta l'attributo rilevante.** Ala `velocità 60` vs terzino
   `velocità 33`: 27 punti di divario decisivo, anche se entrambi ~28 di OVR.
3. **σ del sigmoide assoluta, non relativa alla media** (cap. 02 §7): un
   `Δ = 25` è decisivo che i due siano 28 o 78 di OVR.

**Modificatori globali simmetrici preservano il differenziale:**

```
Δ_efficace = (A·m) − (D·m) = m·(A − D)      m globale (es. meteo) ⇒ segno e forza del divario invariati
```

Solo i modificatori **asimmetrici** (trasferta, freschezza) spostano `Δ`, ed è
il loro scopo. **Corollario di mercato:** la classe è intrinseca e portabile —
un giocatore vale lo stesso in ogni lega; cambia l'ambiente (§7), non lui.

**Verifica harness:** a parità di lega, r(forza rosa → punti) ≥ 0.75; il divario
percentuale di conversione tra miglior e peggior reparto resta significativo
dopo l'applicazione dei modificatori globali.

---

## 5. Il panchinaro fresco che batte il titolare stanco

**Patologia:** un taglio percentuale globale sul valore per fatica renderebbe
qualunque riserva fresca superiore a un campione stanco.

**Invariante INV-5:** la fatica degrada **solo** gli attributi fisici e, agli
estremi, la concentrazione. Non tocca mai la classe (visione, passaggio,
freddezza, decisioni, posizionamento, anticipazione).

```
attr_fisico_eff  = attr · φ(E)      φ(E) = 1 − kf · max(0, (Esoglia − E)/Esoglia)²
attr_classe_eff  = attr             (invariato dalla fatica)
```

- φ è **non lineare**: ≈1 sopra soglia, poi accelera. Un campione da 70 stanco
  non è "42": è un 70 con lo scatto a 55 ma testa e tecnica ancora a 70.
- La riserva da 50 è 50 *ovunque*: perde i duelli di classe, vince le corse pure.
- La `professionalità` rallenta il decadimento della concentrazione.
- **Malus da ingresso a freddo:** il subentrante paga per qualche minuto un
  piccolo malus (ritmo-partita e intesa non ancora dentro), che smorza
  l'over-performance immediata.

**Effetto di design:** il cambio diventa una vera scelta da manager — gambe
(profondità/pressing/rincorse) contro testa (possesso/palle inattive/gestione).
**Verifica harness:** i titolari forti stanchi mantengono un vantaggio nei
duelli di classe fino a energie basse; le sostituzioni cambiano l'esito solo
nelle partite "di gambe".

---

## 6. Effetto valanga della pipeline

**Patologia:** modificatori moltiplicativi concordi (gol → morale → lucidità →
errori → fatica) potrebbero trasformare un 1-0 in un 7-0 inevitabile.

**Invariante INV-6a — Momentum limitato, sublineare, con decadimento.**

```
M ← clamp( M·λ + shock·(1 − |M|),  −1, +1 )     λ ≈ 0.98 / minuto
mult_mentale = clamp( 1 + kM·M,  0.85, 1.12 )   solo su attributi mentali-esecutivi
```

Il fattore `(1 − |M|)` rende ogni shock successivo meno efficace; `λ` fa svanire
un gol al 20' se non rinforzato.

**Invariante INV-6b — Tetto sulla pipeline, non sul singolo provider.** Il
modificatore contestuale *totale* su ogni attributo (morale+fatica+meteo+intesa…)
è clampato in banda fissa:

```
m_totale(attr) = clamp( ∏ provider_i(attr),  0.80, 1.15 )
```

Nessuna catena di provider concordi può sfondare la banda: la composizione è
**saturante**, non libera.

**Invariante INV-6c — Forza di richiamo tattica (calcio vero).** La squadra in
vantaggio si abbassa (mentalità/logica CPU) → concede possesso e campo; quella
sotto passa a Offensiva. È feedback negativo strutturale. In più, per giocatori
con leadership/mentalità alta, il gol subìto può *alzare* la determinazione
(kick positivo limitato, "animale ferito").

**Verifica harness:** distribuzione delle differenze reti a fine partita
realistica; scarti ≥ 5 gol rari e correlati a divari di classe reali, non alla
sequenza degli eventi; a parità di rose, l'ordine dei gol non produce derive.

---

## 7. Caos e paralisi nelle categorie inferiori

**Patologia:** con attributi bassi (OVR ~20), il determinismo puro potrebbe
intrappolare il motore in errori e rimpalli a catena senza mai produrre gioco.

**Invariante INV-7a — Nessun possesso irrisolvibile.**

```
ogni possesso ha un tetto di tick → superato, risoluzione forzata (turnover/fallo/fuori)
ogni palla vagante → micro-duello a esito garantito ogni tick (qualcuno la prende, o esce)
```

Il livelock è impossibile per costruzione. Il gioco "sporco" residuo in
Eccellenza è *realistico*, entro il pavimento dei target (gol/partita ≥ 2.3).

**Invariante INV-7b — Autoregolazione per simmetria.** Se si simulano
onestamente gli attributi bassi di *entrambe* le squadre, il flusso si
autoregola: passatore scarso (30) vs anticipazione scarsa (30) → `Δ≈0` → ~50% di
riuscita, non paralisi. La paralisi nascerebbe solo opponendo attacco scarso a
una difficoltà di base alta e fissa — che invece scala con la lega (sotto).

**Il Competition Factor come provider d'ambiente (non buff agli attributi).**
Per non violare INV-0b e non inquinare il mercato, il fattore-lega tara
l'*ambiente*, mai i giocatori:

```
contestoLega = { σ_lega, compattezza, intensitàOrganizzata }
```

- `σ_lega` alza il **rumore d'esecuzione** in basso → più imprevedibilità → più
  upset (target 8–18%);
- `compattezza` / `intensitàOrganizzata` abbassano la **difficoltà ambientale**
  in basso (pressing meno coordinato ⇒ minore penalità da pressione sul
  passaggio), mantenendo il flusso.

È una **manopola leggera di calibrazione** (regola σ e soglie del DuelEngine),
non una stampella che falsa i valori. Lo stesso `contestoLega` alimenta la
calibrazione del LOD `DIGEST` (cap. 07 §7). **Punto d'innesto:** provider
`pre-partita` + `duello`. **Verifica harness:** nessuna partita con 0 tiri;
possesso e occasioni entro i target a tutti i livelli; upset rate nella banda.

---

## Riepilogo degli invarianti

| # | Invariante | Punto d'innesto | Check harness |
| --- | --- | --- | --- |
| 0a | Simulazione ≠ presentazione | strati 2/3 | N highlight non altera il MatchState |
| 0b | Motore su attributi atomici, mai OVR | DuelEngine | nessun accesso a OVR nei duelli |
| 1 | Highlight = presentazione, salienza post-hoc | strato 3 | determinismo invariato al variare di N |
| 2 | Fatica a rate sul minuto + spike | pipeline `fatica` | curva energia realistica e correlata |
| 3 | Ruolo immutabile; zone fuzzy + isteresi | Positioning/Movement | cambi-zona entro tetto |
| 4 | Divari per-attributo, σ assoluta | DuelEngine | r(forza→punti) ≥ 0.75 |
| 5 | Fatica solo su fisico/concentrazione | pipeline `fatica` | il campione stanco vince i duelli di classe |
| 6 | Momentum limitato + tetto pipeline + richiamo tattico | pipeline `decisione`/mentalità | niente derive da sequenza gol |
| 7 | Possesso risolvibile + Competition Factor d'ambiente | `pre-partita`/`duello` | 0 partite senza tiri; upset in banda |
