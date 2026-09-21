# 06 — Sinergia

La sinergia è il sistema che rende vera la frase: **undici giocatori giusti
battono undici giocatori forti**. Non è un bonus estetico: è un insieme di
valutazioni *calcolate* che il SetupEngine precomputa a inizio partita e che i
motori consumano a ogni tick.

Principio: la sinergia non aggiunge numeri magici — **descrive fatti spaziali e
funzionali** che la simulazione poi fa pesare da sola. Se nessuno tiene
l'ampiezza a sinistra, il motore non applica un "-5%": semplicemente, quando il
possesso arriva su quel lato, *non ci sono opzioni buone* e il DecisionEngine
lo scopre da sé. La sinergia serve a: (a) precomputare queste condizioni per
efficienza, (b) spiegarle all'utente prima della partita, (c) guidare le CPU.

## 1. I tre livelli

### 1.1 Ruolo ↔ Tattica

Ogni identità dichiara `ruoliAffini` / `ruoliInattriti` e requisiti di rosa
(cap. 05 §1); ogni ruolo dichiara le proprie esigenze (`sinergie.richiede`,
cap. 04 §1). Il match produce un punteggio di coerenza per ciascun titolare:

- un **Regista Basso** nel `tiki_taka` riceve più opzioni di scarico (la
  struttura posizionale gli si dispone attorno): coerenza alta;
- lo stesso Regista Basso nella `palla_lunga` è un uomo che il sistema salta
  per definizione: coerenza bassa — gioca comunque, ma il suo talento non passa
  mai dal punto giusto del campo.

L'effetto è strutturale (posizioni e opzioni), non un moltiplicatore diretto.

### 1.2 Ruolo ↔ Ruolo (compagni)

Coppie e catene funzionali valutate sulla griglia delle zone:

| Relazione | Esempio virtuoso | Esempio tossico |
| --- | --- | --- |
| **Copertura** | Mezzala di Equilibrio dietro un Quinto d'Assalto | Terzino di Spinta + Ala Classica + Mezzala d'Assalto sullo stesso lato senza nessuno che copra |
| **Complementarietà di zona** | Ala Invertita (dentro) + Terzino di Spinta (fuori): il lato produce due minacce | Ala Invertita + Terzino Invertito: due uomini nello stesso mezzo spazio, corsia deserta |
| **Catena di rifornimento** | Torre + Seconda Punta d'Assalto (sponde → conclusioni) | Bomber d'Area + Falso Nove: nessuno dei due porta palla al Bomber |
| **Equilibrio di reparto** | Diga + Regista Basso? no: due vertici bassi si pestano — Regista Basso + Mezzala d'Equilibrio sì | Due Dighe: nessuno costruisce; due Registi: nessuno copre |
| **Coppia di centrali** | Marcatore (aggredisce) + Copertura (legge) | Due Marcatori: entrambi escono, nessuno protegge la profondità |

### 1.3 Squadra (occupazione degli spazi)

Il SetupEngine sovrappone le `zone` di tutti gli 11 ruoli, per fase:

```
copertura(fase) = zone strategiche occupate / zone strategiche richieste dall'identità
ridondanza(fase) = zone con >2 occupanti che si pestano i piedi
```

Output: la **mappa di occupazione** (per fase di possesso e non possesso) con i
buchi (nessuna presenza in una zona che l'identità considera vitale) e le
congestioni. È la stessa struttura dati usata dal PositioningEngine, quindi
per costruzione non può mentire.

## 2. Il report di sinergia (pre-partita e lavagna tattica)

L'utente lo vede nella Tattica, aggiornato a ogni modifica:

```
◤ SINERGIA — 4-3-3, Gegenpressing                          72/100 ◢
  ✓ Punta Pressante + 2 Mezzale d'Assalto: pressing coerente
  ✓ Copertura + Marcatore: coppia centrale bilanciata
  ⚠ Corsia sinistra: Ala Invertita + Terzino Invertito
     → nessuno tiene l'ampiezza a sinistra in fase di possesso
  ⚠ Rosa: 4 titolari con Impegno < 55
     → il contro-pressing perderà intensità dopo il 60'
  ✗ Regista Basso con Freddezza 38
     → bersaglio designato del pressing avversario in costruzione
```

Stessi dati, tre consumatori: l'UI (consapevolezza), le CPU (per scegliere
ruoli e undici), il CommentaryEngine (per raccontare *perché* una squadra
soffre: "tutto il gioco degli ospiti muore sul lato sinistro, dove nessuno
offre ampiezza").

## 3. Intesa tra compagni (predisposizione futura)

Lo schema di MatchState riserva `intesa(g1, g2) ∈ [0,1]` (default 1). Quando
arriverà (minuti giocati insieme, linguaggio comune, esperienza), entrerà come
provider nel punto `duello` (combinazioni: uno-due, filtrante su taglio) e
`decisione` (fiducia nel compagno = utilità percepita del passaggio). Nessuna
modifica al core: è già un fattore moltiplicativo previsto dalla pipeline.

## 4. Uso da parte delle CPU

Le squadre CPU non "vedono" numeri diversi dall'utente: usano lo stesso report.

1. scelgono l'identità più coerente col profilo rosa (in generazione, poi
   raramente);
2. assegnano i ruoli massimizzando `Σ suitability × coerenza` sotto i vincoli
   di copertura (niente formazioni con buchi strutturali);
3. in mercato (integrazione futura con `mercato.js`): i bisogni di rosa
   diventano *funzionali* — "manca una Torre per la nostra Palla Lunga" invece
   di "manca un ATT" — riusando `squadreInteressate` con il filtro sinergia.
