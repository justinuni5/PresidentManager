# Game Design Document — President Manager

> Documento di consolidamento dell'intera visione di progetto. Non sostituisce
> [`docs/blueprint.md`](blueprint.md) (che resta la fonte di dettaglio per
> struct dati e specifiche di sistema) né [`docs/motore/`](motore/README.md)
> (blueprint tecnico del motore di simulazione partite "Ventidue") — li
> **consolida** in un'unica narrazione leggibile dall'inizio alla fine, per
> chi deve capire il progetto senza dover ricostruire il contesto da decine
> di sessioni di lavoro incrementali.
>
> Scritto in italiano, come tutta la documentazione di progetto. Aggiornato
> man mano che il design evolve — in caso di conflitto con `blueprint.md` su
> un dettaglio di struct dati, vince `blueprint.md` (più granulare); in caso
> di conflitto sulla *visione d'insieme*, vince questo documento.

---

## 0. Indice

1. Pitch e visione
2. Il giocatore: ruolo e fantasia centrale
3. Ambientazione e mondo di gioco
4. Core loop
5. Struttura calcistica: piramide, leghe, stagioni
6. Sistemi di gestione del club
7. Il motore di simulazione partite ("Ventidue")
8. Narrativa ed eventi (Sindaco, criminalità organizzata, spogliatoio)
9. UX e navigazione
10. Direzione artistica
11. Architettura tecnica: prototipo vs. prodotto finale
12. Roadmap complessiva
13. Limiti noti e debito di design del prototipo attuale
14. Domande aperte
15. Riferimenti

---

## 1. Pitch e visione

**President Manager** è un gioco manageriale di calcio in stile "Football
Manager light", ambientato nella piramide calcistica italiana **a partire dal
basso** — non si comincia in Serie A con una rosa di campioni, si comincia in
**Eccellenza**, il livello dilettantistico, con budget minuscoli, giocatori
mediocri e un comune di poche migliaia di abitanti come sede. La fantasia
centrale è quella della **scalata**: costruire un progetto sportivo da zero,
un anno alla volta, in un mondo che si comporta in modo credibile — dove le
decisioni gestionali (chi acquistare, con chi fare sponsorizzazioni, come
gestire lo spogliatoio, persino con chi stringere la mano in municipio)
contano quanto le decisioni tattiche in campo.

Il giocatore non è un semplice allenatore: è il **presidente-allenatore**, la
stessa persona che siede in panchina la domenica e che il lunedì firma i
contratti sponsor e discute col sindaco. Questa fusione di ruoli (assente
nella maggior parte dei manageriali, dove presidente e allenatore sono
entità separate, spesso in conflitto tra loro) è la scelta di design più
identitaria del gioco: **non esiste "il presidente mi ha venduto il
giocatore senza consultarmi"** — se succede qualcosa, è sempre una tua
decisione, diretta o indiretta.

**Non-obiettivi dichiarati** (per ora, non per sempre): motore fisico 3D per
le partite, IA neurale per le squadre CPU, licenze ufficiali di squadre/nomi/
volti reali (vedi §3 per come si gestisce l'ambientazione reale senza
materiale protetto).

---

## 2. Il giocatore: ruolo e fantasia centrale

Il giocatore veste i panni del **presidente-allenatore** di un club di
Eccellenza. Non esistono proprietari separati, direttori sportivi
indipendenti o allenatori licenziabili dal giocatore stesso — è tutto in
mano a una persona sola, con tutte le conseguenze (positive: pieno controllo;
negative: nessuno "scudo" quando le cose vanno male, sia sportivamente sia,
potenzialmente, legalmente — vedi §8 sulla criminalità organizzata).

Le decisioni che il giocatore prende attraversano contemporaneamente tre
piani, che nel design sono tenuti deliberatamente intrecciati invece che
separati in "modalità carriera" e "modalità manageriale" distinte:

1. **Sportivo** — tattica, formazioni, mercato, allenamento, gestione dello
   spogliatoio.
2. **Economico/gestionale** — sponsor, stadio, finanze, staff.
3. **Politico/sociale** — rapporto col sindaco, con la tifoseria, con la
   comunità locale — e, nei casi più estremi, con la criminalità organizzata
   che prova a infiltrarsi nel club attraverso gli sponsor.

Questo terzo piano è ciò che distingue di più President Manager da un
manageriale "puro": il presidente-allenatore non gioca in una bolla sportiva
isolata dal contesto sociale della città che rappresenta.

---

## 3. Ambientazione e mondo di gioco

**Geografia**: il mondo di gioco attuale (fase di sviluppo corrente) è
ambientato nella zona **Brescia/Franciacorta**, con 31 comuni reali generati
come sedi di club (Brescia, Desenzano del Garda, Castiglione delle Stiviere,
Chiari, Rovato, Carpenedolo, Ciliverghe, ecc. — elenco completo in
[`src/game/data.js`](../src/game/data.js)). Ogni comune ha un **profilo
numerico** — popolazione, ricchezza, saturazione calcistica, tradizione
giovanile, costo della vita — pensato per differenziare concretamente club
diversi che condividono lo stesso livello di lega. *(Nota di design onesta:
oggi solo la ricchezza incide meccanicamente, sul budget iniziale — vedi §13
per il dettaglio di questo gap tra intenzione e implementazione attuale.)*

Questa scelta geografica (una zona specifica, non l'intera Italia) è
deliberata per il prototipo: valida le meccaniche su un bacino contenuto e
coerente prima di espandersi. L'espansione alla piramide calcistica italiana
completa (regioni multiple, categorie superiori fino ai professionisti) è
pianificata per fasi successive (§12).

**Nomi e materiale protetto**: nessun nome, stemma o colore ufficiale di club
realmente esistente viene riprodotto, così come nessun volto/nome di
calciatore reale. Città reali e struttura della piramide calcistica italiana
sono contesto geografico/sportivo libero da problemi di copyright; i club
generati hanno nomi placeholder neutri (combinazioni città + suffisso tipo
"Calcio", "FC", "Sporting Club") che l'utente può rinominare liberamente nel
proprio salvataggio.

**Piramide calcistica**: attualmente due leghe piatte e **non collegate**,
Eccellenza (18 squadre) e Promozione (10 squadre) — la vera piramide, con
promozioni/retrocessioni e più categorie, arriva in una fase futura (§12,
§13).

---

## 4. Core loop

Il ciclo di gioco quotidiano non è un "+1 giorno" ripetuto manualmente: il
bottone **Avanza** salta automaticamente al **prossimo evento rilevante**
(che può essere lo stesso giorno o distare più giorni), fermandosi solo
quando serve una decisione dell'utente:

- **Matchday** (partita da giocare/seguire)
- **Conferenza stampa** (pre/post partita, o su richiesta)
- **Scadenza di mercato rilevante** (offerta ricevuta, trattativa da
  rispondere, chiusura finestra)
- **Evento rosa** (infortunio significativo, giocatore in scadenza
  contratto, richiesta di cessione)
- **Messaggio/notizia importante** (sponsor, giovane pronto per la prima
  squadra, traguardo raggiunto)
- **Decisioni di Armonia Settore** (confronto richiesto da un giocatore
  scontento — §6.7)
- **Eventi narrativi speciali** (approccio del sindaco, sospetto su uno
  sponsor, giocatore che si confida — §8)

Tutto ciò che è "routine" (giorni senza decisioni, piccoli aggiornamenti di
forma/morale) viene simulato internamente senza fermare il giocatore, e
riassunto nel feed **Notizie e Messaggi** se rilevante. Il ritmo cercato è
"premo avanza e succede sempre qualcosa di interessante", non un
avanzamento meccanico senza motivo.

Il ciclo settimanale tipico: gestione rosa/mercato/sponsor nei giorni morti →
allenamento → partita (vissuta in 2D a eventi o saltata al risultato) →
conseguenze (voti, morale, notizie, eventuale evento narrativo) → si
ricomincia. Il ciclo annuale: obiettivo di stagione fissato a inizio anno →
stagione giocata → verdetto a fine stagione (raggiunto/mancato, impatto su
morale e reputazione) → *(quando il rollover multi-stagione sarà
implementato, §12/§13)* nuova stagione con continuità.

---

## 5. Struttura calcistica: piramide, leghe, stagioni

- **Eccellenza** (livello 1, 18 squadre) e **Promozione** (livello 2, 10
  squadre) — calendario round-robin bilanciato (max 2 gare consecutive con
  lo stesso fattore campo).
- Ogni lega ha calendario, classifica, classifiche individuali
  (capocannonieri, assist, media voto), sistema premi "TuttoCampo" (§6.13).
- **Stato attuale:** promozione/retrocessione e rollover base sono operativi;
  classifiche e statistiche vengono archiviate. Mancano ancora età, crescita,
  contratti, ritiri e nuovi giovani — vedi §13.
- **Competizioni**: nessuna coppa, nessuna nazionale, nessuna competizione
  internazionale nel prototipo attuale — territorio interamente da
  progettare per fasi future.

---

## 6. Sistemi di gestione del club

### 6.1 Rosa e giocatori

Ogni giocatore ha attributi dettagliati per gruppo (10 tecnici, 7 fisici, 8
mentali + 6 specifici da portiere), più attributi nascosti mai mostrati
direttamente (potenziale, professionalità, costanza di rendimento,
resistenza infortuni). L'**overall** è una media pesata per ruolo, mai un
numero unico universale — un attributo che conta molto per un attaccante
(tiro) conta poco per un difensore, e viceversa.

Il generatore produce rose realistiche per un campionato di Eccellenza:
media rosa **25-39** su scala 1-100 (dove 95+ è livello internazionale), con
un **centro di forza per club** (non una media fissa condivisa da tutta la
lega, che renderebbe ogni squadra praticamente equivalente) e **outlier**
individuali di talento o lacuna fisico/mentale (mai sulla tecnica, che resta
più uniforme — il gesto tecnico si allena e cambia meno velocemente di un
fisico o di una testa).

**Gap noto**: il potenziale nascosto oggi non guida alcuna crescita reale nel
tempo — è puramente decorativo (usato solo dallo scout e dal valore di
mercato). Non esiste ancora invecchiamento né un sistema di allenamento che
sposti gli attributi. Vedi §13.

### 6.2 Ruoli e tattica

35 ruoli specifici (catalogo completo in `docs/motore/04-ruoli.md`), ognuno
con un profilo di comportamento (costruzione, finalizzazione, pressing,
libertà creativa, ecc.) e una **suitability** calcolata (mai assegnata a
mano) rispetto agli attributi del giocatore. La tattica si gestisce come una
lavagna FM-style: 24 slot semi-fissi sul campo, il modulo **risulta** da dove
posizioni i giocatori (non lo scegli da un menù a tendina). 13 identità
tattiche (da Catenaccio a Gegenpressing a HaramBall) modulano stile di gioco,
rischio, pressing, possesso.

Il motore che risolve le partite è descritto in dettaglio al §7.

### 6.3 Mercato trasferimenti

Attivo per utente e CPU, in due finestre stagionali (estiva/invernale).
Valore di mercato calcolato da una formula non lineare su overall/età/
potenziale. Le squadre CPU valutano periodicamente i propri bisogni di rosa,
cercano giocatori compatibili, offrono una percentuale del valore con
variazione casuale, e possono bussare direttamente alla porta dell'utente
con offerte formali (eventi urgenti con scadenza). Rumor di mercato tra CPU
integrati nel feed notizie. Prestiti e svincoli pianificati in Fase 6 (durata
fissa 1 stagione nella prima versione, senza stipendio condiviso o opzione
riscatto — dettagli economici avanzati rimandati al backlog).

### 6.4 Staff

**Requisito pianificato del 10/09/2026:** ogni club deve iniziare con tutti e quattro i ruoli già coperti da personale sotto contratto. Il licenziamento richiede il pagamento della clausola del membro uscente, anche quando viene sostituito direttamente. I relativi stipendi contano dal primo giorno. Dettagli in [blueprint §12.5](blueprint.md#125-staff-iniziale-e-clausola-di-licenziamento).

Quattro ruoli, ciascuno livello 1-5: **scout** (giudizio in stelle sul
potenziale, accuratezza crescente col livello — il numero esatto non è mai
mostrato), **staff medico** (accorcia le prognosi infortuni), **preparatore
atletico** (alza il target giornaliero di forma), **vice-allenatore** (bonus
in partita). Assunzione/licenziamento da un pool di 3 candidati per ruolo,
stipendi che pesano sul monte stipendi complessivo.

### 6.5 Centro Sviluppo (settore giovanile)

Tre fasce (U13, U17, U19), ognuna con tattica propria (indipendente dalla
prima squadra), rosa dedicata e un **campionato specchio**: le stesse
squadre CPU della prima squadra in versione giovanile, calendario
sincronizzato, risultati semplificati. I giovani vengono promossi in prima
squadra quando pronti/maggiorenni o comunque idonei. Nome provvisorio, in
valutazione anche "Scuola Calcio" come alternativa.

### 6.6 Allenamento (prima base implementata)

Focus allenamento assegnabile (equilibrato/fisico/tecnico/mentale/tattico/
portiere) e intensità. La prima implementazione fa crescere gli attributi in
base a età, potenziale, professionalità e vivaio; l'intensità tocca la
condizione e la pista atletica aiuta il lavoro fisico. La familiarità tattica
entra nel motore partita. Restano minutaggio, stagnazione, report periodici e
bilanciamento su più stagioni.

### 6.7 Spogliatoio dentro Rosa *(prima base implementata)*

Pagina interna di Rosa dedicata alla vita di spogliatoio, distinta dal morale
"numerico" già esistente (§6.8):

La prima base mostra gerarchia e malcontento, registra tre tipi di promessa,
ne valuta la scadenza e applica le conseguenze al morale. Il morale personale
modula il rendimento nel motore entro una banda ridotta. Rivalità, confronti
dialogati e motivazioni più profonde restano da sviluppare.

- **Promesse fatte ai giocatori** — tracciamento di impegni presi
  esplicitamente dal presidente-allenatore (es. "giocherai titolare",
  "resterai qui almeno una stagione") e delle conseguenze quando vengono
  mantenute o disattese.
- **Giocatori scontenti e il relativo motivo** — coerente col principio già
  presente nel sistema morale (§6.8): un malcontento "con motivo valido"
  (es. escluso da un giovane che sta rendendo meglio) si comporta
  diversamente da un malcontento senza motivo apparente.
- **Rivalità/beef tra giocatori** — relazioni interpersonali negative tra
  membri della rosa che possono impattare sinergia e prestazioni.
- **Gerarchia di spogliatoio** — chi sono i leader riconosciuti, chi ha voce
  in capitolo nelle dinamiche interne, indipendentemente dal ruolo tattico.

Spogliatoio non occupa una voce autonoma della sidebar: è raggiungibile
direttamente dentro Rosa, insieme ai giocatori a cui si riferisce.

### 6.8 Sistema morale (multi-livello)

Non un singolo numero "morale squadra" — più livelli che si influenzano a
vicenda, ognuno aggiornato da "trigger" pesati (risultato partita,
minutaggio, dichiarazione in conferenza stampa, offerta di mercato
rifiutata, ecc.):

- **Morale tifosi** — reagisce allo scarto tra risultato atteso e risultato
  reale (perdere contro una big non pesa come perdere contro una piccola
  quando "si doveva vincere"), e all'obiettivo di stagione dichiarato a
  inizio anno vs. il risultato finale.
- **Morale giocatore (individuale)** — minutaggio reale vs. atteso dal
  proprio status in rosa, **con valutazione del contesto** (un'esclusione
  giustificata da un compagno in forma migliore non genera lo stesso
  malcontento di un'esclusione immotivata). Un giocatore scontento può
  chiedere un confronto diretto (dialogo con opzioni di risposta).
- **Effetto conferenze stampa** — ogni dichiarazione ha un bersaglio
  specifico (un giocatore, un reparto, tutta la squadra, i tifosi), non è un
  evento generico.
- **Offerte di mercato rifiutate** — possono generare malcontento pubblico
  (post social, reazioni a catena di tifosi/compagni/stampa).
- **Relazioni e conflitti** — rivalità tra allenatori avversari (derby,
  storia recente), giocatori in prestito gestiti male da altre squadre.

Tecnicamente ogni entità (giocatore, reparto, squadra, tifosi) ha un proprio
valore di morale, aggiornato da trigger indipendenti — un singolo evento può
toccare più livelli contemporaneamente.

### 6.9 Sistema Sponsor

**Prima base implementata:** offerte per slot, contratti pluriennali, incasso
annuale e Comune come offerente speciale con effetto sul rapporto col Sindaco.
Il filone aziende di facciata/mafia resta fuori finché non viene costruito il
motore narrativo dedicato descritto sotto.

Il club può avere più contratti sponsor attivi in parallelo, uno per
**slot**:

| Slot | Vincoli | Range annuo |
|---|---|---|
| Petto principale | Uno solo — alternato **davanti O dietro**, mai entrambi | 10k-35k€ |
| Manica sinistra | Indipendente dalla destra | 3k-8k€ |
| Manica destra | Indipendente dalla sinistra | 3k-8k€ |
| Kit allenamento (incluso borsone) | — | 2k-6k€ |

Il prezzo del petto principale dipende da obiettivi dello sponsor, città
della squadra, reputazione della squadra, reputazione/dimensione dello
sponsor (una multinazionale è impossibile in Eccellenza, plausibile in Serie
A). La maggior parte degli sponsor vuole petto + maniche insieme; alcuni
richiedono solo una parte specifica. Durata contratto 1-7 anni — la
maggioranza sceglie 3 anni, 7 anni è raro e sconveniente per l'utente
(vincolo lungo a condizioni che possono invecchiare male).

**Tipologie speciali di offerente**, oltre alle normali aziende locali:

**Il Sindaco.** L'offerta economica è tra le più basse del mercato, ma porta
benefici collaterali concreti: velocizza costruzione/riparazione di
infrastrutture (più lavoro per unità di tempo sulle richieste in corso),
aumenta le iscrizioni alla scuola calcio, migliora il morale dei tifosi
(dichiarazioni pubbliche, interviste, campagne elettorali). Il rovescio della
medaglia: la "presenza insieme" in pubblico (cene, eventi) crea nei tifosi
un'associazione tra il presidente-allenatore e l'orientamento politico del
sindaco. Se il sindaco ha posizioni controverse/estremiste, questo può
costare una parte della tifoseria — ma **rendere più fedeli gli ultras
rimasti**, specialmente se l'utente resta coerente nel tempo. Il sindaco
tipicamente chiede favori sportivi in cambio: far giocare/acquistare certi
giocatori, in particolare il figlio del sindaco (tipicamente scarso,
minutaggio atteso quasi nullo — un vincolo scomodo, non un regalo).

**Aziende "di facciata" (riciclaggio).** All'atto della firma appaiono come
aziende locali normali, con un'offerta però nettamente più competitiva della
media — mai rivelate come tali all'utente in anticipo. Il vero obiettivo è
il riciclaggio di denaro attraverso il club:

- Possono **minacciare** (non semplicemente chiedere) di pilotare eventi in
  partita: autogol (il tipo di richiesta più pericoloso da gestire, il più
  visibile/sospetto), cartellini gialli/rossi mirati su un giocatore
  specifico, un numero minimo di gol subiti richiesto al portiere.
- Le forze dell'ordine possono notare pattern sospetti (troppi autogol,
  eventi anomali concentrati nello stesso periodo) e aprire
  un'**indagine** — se un giocatore confessa il coinvolgimento della
  proprietà, conseguenze serie per l'utente/club.
- I mafiosi possono minacciare direttamente i giocatori **senza che l'utente
  lo sappia**, indipendentemente da un eventuale contratto sponsor in corso —
  in questo caso l'utente non ha conseguenze dirette, solo il/i giocatori
  coinvolti.
- **Segnali osservabili dall'utente**: comportamento anomalo di un giocatore
  (cartellini rossi frequenti mai visti prima, un portiere improvvisamente
  impreciso, gol facili concessi fuori pattern), oppure il giocatore stesso
  che si confida — subito dopo la minaccia, o più tardi, da pentito.
- **Casi estremi**: un giocatore minacciato che fallisce ripetutamente (3
  volte) nel soddisfare le richieste può subire conseguenze gravi nella
  narrazione, fino alla sua scomparsa dal roster/dalla storia.
- Esistono **più gruppi mafiosi distinti**, presenti soprattutto nei
  campionati del sud, ma anche (in misura minore) al nord — coerente con la
  futura espansione multi-regionale della piramide.
- La probabilità che un giocatore ceda a una minaccia **diminuisce salendo
  di categoria** (più consapevolezza dei rischi in Serie A che in
  Eccellenza), **tranne** in casi di dipendenza da gioco d'azzardo o debiti
  gravi, che rendono vulnerabile un giocatore indipendentemente dal livello.

Questo è probabilmente il sistema narrativo più complesso del gioco — un
motore di eventi a sé (minacce, indagini, conseguenze a cascata), non una
semplice estensione del sistema morale. Va progettato come sistema dedicato
quando si arriva a implementarlo.

### 6.10 Contatore Fan *(concettuale, formule da bilanciare in futuro)*

Un contatore del numero di tifosi della squadra, concettualmente collegato a
risultati sportivi, morale, azioni del sindaco/sponsor, profilo della città
(popolazione, saturazione calcistica). Oggi esiste solo come intenzione di
design e struttura dati minima — nessuna formula di crescita/calo definita.

### 6.11 Stadio

**Prima base implementata:** dati impianto, affluenza, botteghino, affitto
comunale, acquisto, sponsor bordocampo, bar/store, bus e minibus sono visibili
e producono movimenti economici. Costruzioni temporizzate e manutenzione
avanzata restano successive.

Tutti gli stadi sono di proprietà **comunale** per default. L'acquisto è
possibile già in Eccellenza (non solo dalle categorie superiori, come
ipotizzato in una prima versione del design) — ma le finanze tipiche di un
club di Eccellenza rendono l'operazione quasi un "suicidio economico" nella
pratica: un freno economico naturale, non una regola artificiale. Per poter
acquistare serve inoltre un rapporto sufficientemente positivo **sia** col
Sindaco **sia** con i tifosi.

**Attributi**: nome, capienza, presenza pista atletica, se è "ingabbiato",
presenza bar ristoro, presenza store merchandising.

**Sponsor bordocampo**: 20k-50k€ totali in base ad attributi
stadio/location/città/affluenza media, prezzo per singola posizione
(500-2000€). La pista atletica aumenta la capienza ma svaluta gli sponsor
dietro la pista (troppo lontani dai tifosi per essere visibili), in cambio
migliora la qualità degli allenamenti atletici. Con un solo settore (tipico
di uno stadio di Eccellenza), nessuno sponsor vuole la posizione sotto il
settore stesso.

**Bar ristoro**: entrate scalabili con l'investimento (capienza, efficacia,
personale). A un certo livello sblocca il merchandising interno al bar;
quando la squadra (partita dall'Eccellenza) raggiunge la Serie B, il
merchandising si "scorpora" in un negozio dedicato.

**Gestione bus**: prima squadra a noleggio con conducente (500-800€ a
trasferta, in base alla distanza) oppure di proprietà (usato, 40.000-80.000€,
durata minima 4 anni per i modelli più economici con manutenzione più
frequente; 100-220€ a trasferta — più costoso il bus, meno consuma). Settore
giovanile: fino a 3 minibus da 9 posti (12.000-25.000€ ciascuno, stessi
criteri di prezzo), che migliorano il morale della tifoseria generale (segno
di investimento serio sul vivaio), 50€/settimana di gestione ciascuno.

### 6.12 Finanze

Budget trasferimenti, monte stipendi, incassi (biglietti, sponsor, bar
ristoro, sponsor bordocampo), spese, grafici andamento. Vincoli realistici:
non si spende oltre budget, gli stipendi impattano il tetto.

**Prima base implementata:** registro movimenti e riepilogo per categoria,
collegati a sponsor, gare interne, trasferte, mezzi, stipendi e trasferimenti.
Restano previsioni, rate/debiti e bilanciamento economico di lungo periodo.

### 6.13 Notizie e Messaggi, e sistema premi "TuttoCampo"

Schermata dedicata in stile Football Manager (lista notizie a sinistra,
dettaglio espanso a destra), che copre eventi generici, conferenze stampa,
reazioni social, resoconti post-partita (marcatori, cartellini, migliore in
campo) e assegnazione premi.

Sistema premi per campionato di competenza, tre livelli di ufficialità:

- *Non ufficiali, non in bacheca*: Giocatore della Settimana, Squadra della
  Settimana
- *Ufficiali di lega, non in bacheca*: Squadra del Mese
- *Ufficiali di lega e in bacheca trofei*: Giocatore del Mese (e U19),
  Giocatore dell'Anno (e U19), Squadra dell'Anno, Capocannoniere

Ogni premio (tranne Squadra della Settimana) ha una pagina Albo d'Oro
dedicata, raggiungibile da ricerca globale, click-through dalla notizia, o
dalla bacheca trofei del profilo giocatore.

---

## 7. Il motore di simulazione partite ("Ventidue")

Il cuore tecnico del gioco è un motore di simulazione a **duelli attributo
su attributo**, non a formula statistica aggregata: ogni possesso di palla è
una sequenza di micro-decisioni (passaggio, dribbling, tiro, pressing…)
risolte confrontando gli **attributi atomici** (mai l'overall) dei giocatori
coinvolti attraverso un sigmoide a scala assoluta. Punti chiave del design:

- **35 ruoli** con profili di comportamento e suitability calcolata, **13
  identità tattiche** (da Catenaccio a Gegenpressing a HaramBall) che
  modulano rischio/pressing/possesso a livello di squadra.
- **Percezione filtrata**: un giocatore con visione bassa non "vede" alcune
  opzioni di passaggio buone — l'errore di valutazione è un attributo del
  giocatore, non rumore uniforme.
- **Motori dedicati** per fatica (energia a rate + spike su eventi ad alta
  intensità, con `INV-5`: la fatica intacca solo gli attributi fisici, mai
  tecnica/lucidità mentale), momentum psicologico di squadra (banda
  limitata, mai una "deriva" incontrollata), infortuni in-partita (emergono
  da duelli fisici persi o scatti in fatica estrema, mai un'estrazione
  casuale post-partita), disciplina, pressing collettivo con trigger,
  fuorigioco/marcatura, sinergia di ruolo/identità.
- **Calibrato con un harness dedicato**: ogni modifica al motore viene
  verificata su decine di stagioni simulate contro un set di target
  statistici dichiarati (gol/partita, correlazione forza→punti, capocannoniere
  atteso, distribuzione cartellini, ecc. — `docs/motore/07-milestones.md`),
  più un "golden seed" di partite a determinismo bit-per-bit per intercettare
  regressioni.

Il blueprint tecnico completo (capitoli 01-07, con formule, invarianti di
design (`INV-*`) e log di calibrazione) vive in
[`docs/motore/`](motore/README.md) — questo GDD ne riassume solo
l'architettura concettuale. Per l'elenco onesto dei limiti attuali del
motore, vedi §13.

---

## 8. Narrativa ed eventi

Oltre agli eventi meccanici (risultati, mercato, infortuni), il gioco ha un
layer narrativo esplicito che nasce dall'intreccio tra sportivo, economico e
politico descritto al §2:

- **Conferenze stampa** — domande con bersagli diversi (giocatore, reparto,
  squadra, tifosi), risposte a scelta multipla con conseguenze tracciate.
- **Il Sindaco** — filone narrativo di medio termine: sponsorizzazione a
  basso costo ma alto impatto collaterale, richieste di favori sportivi,
  effetto sulla tifoseria legato all'esposizione pubblica insieme al
  primo cittadino (vedi §6.9 per il dettaglio completo).
- **Criminalità organizzata / aziende di facciata** — il filone narrativo più
  complesso del gioco: infiltrazione tramite sponsor apparentemente
  legittimi, minacce ai giocatori (autogol, cartellini, gol subiti forzati),
  rischio di indagine delle forze dell'ordine, possibili confessioni,
  conseguenze a cascata fino a esiti narrativi gravi per un giocatore che
  fallisce ripetutamente (vedi §6.9). Più gruppi distinti, distribuzione
  geografica realistica (più frequenti al sud, presenti anche al nord),
  vulnerabilità legata a dipendenze/debiti indipendentemente dal livello di
  gioco.
- **Dinamiche di spogliatoio** — Armonia Settore (§6.7): promesse, rivalità,
  gerarchie, confronti diretti con giocatori scontenti.
- **Offerte di mercato rifiutate** — possibili sfoghi pubblici con reazioni a
  catena.

Questo layer richiederà, in fase di implementazione, un vero e proprio
motore di eventi narrativi (stato, trigger, conseguenze differite nel tempo,
possibilmente con memoria multi-stagionale) — non è riducibile a semplici
notifiche una tantum. È pianificato ma non specificato in dettaglio tecnico
in questo round di documentazione: qui si fissa la *visione*, l'ingegneria
verrà quando si arriva a costruirlo.

---

## 9. UX e navigazione

### 9.1 Flusso di avvio

1. **Schermata iniziale** — copertina/titolo del gioco, bottone per entrare
   nel Main Menu.
2. **Main Menu**:
   - **Nuova Carriera**
   - **Crea la Tua Squadra** — porta a una schermata "in arrivo" con
     anteprima delle feature previste e un bottone per tornare indietro (non
     funzionante — caratteristica futura, vedi blueprint §4.11)
   - **Carica Salvataggio**
   - **Impostazioni**
3. **Dopo "Nuova Carriera"** — l'utente sceglie un **database** da una
   cartella dedicata del gioco (lista dei database disponibili). Questo
   passo anticipa l'architettura a database editabile del §11.3.

### 9.2 Sidebar di navigazione

Ordine applicato nel prototipo:

**Dashboard · Notizie e Messaggi · Rosa · Centro Sviluppo · Calendario ·
Campionato · Tattiche · Mercato · Staff · Sponsor · Stadio · Allenamento ·
Finanze · Club**

Contratti è una scheda del profilo giocatore; Spogliatoio è interno a Rosa.
Il dettaglio di ogni schermata è in [`blueprint.md` §5](blueprint.md).

---

## 10. Direzione artistica

Riferimento di palette per l'identità visiva definitiva: lo stile grafico di
**WWE SummerSlam 2007-2009** — **azzurro elettrico** abbinato a un **verde
acceso/sinuoso**. Riferimento da tenere per quando si lavorerà sulla
direzione artistica vera e propria (loghi, UI del prodotto finale, materiale
promozionale) — **non si applica al prototipo HTML/JS attuale**, la cui
palette CSS è una scelta puramente pragmatica e temporanea, non un segnale di
direzione artistica.

---

## 11. Architettura tecnica: prototipo vs. prodotto finale

### 11.1 Lo stack attuale è solo un prototipo

La versione HTML/CSS/JS (React) esistente serve **esclusivamente a validare
meccaniche e design**. Non è la base tecnica del prodotto finale. La
versione definitiva sarà sviluppata in **Godot** (opzione più probabile) o
**Unity** — un motore di gioco vero, non un'applicazione web.

**Implicazione pratica**: da qui in avanti, ogni sistema/formula/regola di
gioco va documentato anche in forma **indipendente dal linguaggio**
(specifica testuale o pseudo-codice nei documenti di design), non solo nei
commenti del codice JS. Il codice del prototipo dimostra che una meccanica
*funziona*; la riscrittura in Godot/Unity deve poter partire da una base di
design chiara, senza dover decompilare la logica dai file `.js`. Blueprint e
GDD sono quindi la fonte di verità per il *design*; il codice in `src/`
resta fonte di verità solo per il *comportamento del prototipo attuale*, che
può divergere dal design man mano che questo evolve più in fretta di quanto
valga la pena implementare in JS.

### 11.2 Generazione procedurale come scelta di prototipo, non di prodotto

Il catalogo mondiale è descritto da un JSON versionato. Il generatore usa un
seed per completare gli slot senza contenuto manuale e materializza soltanto
i paesi scelti all'avvio della carriera.

### 11.3 Verso un sistema a database editabile

**Obiettivo finale**: un sistema a **database editabile esternamente**, in
stile "FM Editor" — un tool dedicato, separato dal gioco, per modificare
nomi squadre, abbreviazioni, colori, rose, e generare/esportare un mondo di
gioco a partire da quei dati. Il flusso d'avvio (§9.1) anticipa già questo
futuro: "Nuova Carriera" sceglie un database da una cartella dedicata.

La fondazione è implementata con JSON mondiale, validatore e scelta dei paesi.
L'editor visuale resta un'applicazione separata futura e userà lo stesso
formato; resta anche da aggiungere il caricamento di file senza ricostruire
l'app.

**Domande aperte, da documentare e non decidere unilateralmente** (vedi
anche §14):

1. **Vincolo database per carriera — deciso:** un database mondiale; i paesi
   simulati si scelgono all'avvio e restano fissi per la carriera.
2. **Merge/integrazione di più database** — come si combinano database
   diversi (es. regioni diverse, o database creati da utenti terzi)? Serve
   un formato con id stabili e risoluzione dei conflitti?
3. **Database e multiplayer futuro** — un eventuale multiplayer richiede che
   tutti i partecipanti condividano lo stesso database: come si concilia con
   database liberamente editabili da ciascun utente? Serve una nozione di
   "database certificato/hash"?

---

## 12. Roadmap complessiva

**Priorità concordata il 10/09/2026:** completare quasi tutte le funzionalità del gioco prima di riprendere il lavoro sul 2D. Sincronizzazione campo/cronaca, animazioni e qualità visiva restano problemi aperti ma posticipati. Anticipare soltanto correzioni indispensabili se un errore impedisce di proseguire la carriera. Non è prevista una v0.9.1 dedicata al replay.

### Ordine operativo aggiornato

La fondazione Fase 7/Fase 8 è completata dal 12/09/2026: rollover base, promozioni/retrocessioni, archivio statistiche, database mondiale JSON e scelta paesi.

1. **Continuità completa dei giocatori — completata:** età, crescita/calo basati anche sul rendimento, contratti e rinnovi, svincolati, ritiri, nuovi giovani, promemoria, provini e gestione attiva delle CPU. Il rientro dai prestiti sarà aggiunto con il mercato dei prestiti.
2. **Anagrafiche mondiali e reputazione:** catalogo mondiale, nazionalità primaria/secondarie e pagine paese completati; restano eleggibilità internazionale, reputazione nazionale/internazionale di club e giocatori ed evoluzione stagionale.
3. **Mercato completo:** paginazione, svincolati, prestiti e rinnovi.
4. **Staff completo:** personale iniziale, contratti, stipendi e clausole di licenziamento.
5. **Bilanciamento della gestione:** sponsor, stadio, allenamento, finanze, tifosi e spogliatoio.
6. **Spogliatoio avanzato:** rivalità, gruppi, richieste e confronti.
7. **Simulazione leggera per i campionati lontani.**
8. **Coppe:** coppe nazionali a eliminazione diretta completate; restano competizioni continentali e fasi a gironi.
9. **Editor esterno visuale del database.**
10. **Rifinitura del 2D:** sincronizzazione campo/cronaca, movimenti e qualità visiva quando le funzionalità saranno quasi complete.

Acquisti, ingaggi da svincolato e rinnovi impostano un blocco persistente di 180 giorni: durante il blocco il giocatore non può essere ceduto, messo in vendita o rinnovato ancora. Il vincolo vale anche per la CPU e un rinnovo non può mai accorciare la scadenza esistente. Gli svincolati possono firmare in qualsiasi momento, anche a mercato chiuso.

### Stato e contenuto delle fasi

**Completate** (Fasi 1-5 + motore Ventidue M0-M6):
- Fondamenta (dati, generatore, storage), core loop, tattica/visual, mercato
  e CPU, notizie/storia/premi
- Motore di simulazione "Ventidue" completo e calibrato: 35 ruoli, 13
  identità, duelli attributo-su-attributo, fatica/mentale/infortuni/
  disciplina/pressing/sinergia, statistiche e voti a contributi
- Generatore realistico: 18 squadre Eccellenza, ambientazione Brescia/
  Franciacorta, rose 25-39 OVR con outlier, individualità del tiratore

**Fase 6 — Profondità gestionale**:
- Prima base implementata per Sponsor (§6.9), Stadio (§6.11), Contatore Fan
  (§6.10), Armonia Settore (§6.7), Allenamento e Finanze
- Da completare: narrazione sponsor avanzata, crescita dinamica fan,
  rivalità/confronti, bilanciamento, promozione giovani, svincoli e prestiti
- Flusso di avvio completo (§9.1), nuovo ordine sidebar (§9.2)

**Aggiunte alla Fase 6 — richieste del 10/09/2026, da implementare:**
- Reputazione **1–300** per ogni club (**Real Madrid 300, Parma 200**) e ogni giocatore (**Messi/Cristiano Ronaldo 300, Domenico Berardi 200**); il prestigio del club deve aumentare la sua attrattiva negli acquisti.
- Mercato con pulsanti per scorrere le pagine e raggiungere tutti i risultati.
- Staff già assunto in tutte le squadre e clausola da pagare al licenziamento.
- Specifiche e punti da bilanciare nel [blueprint §12](blueprint.md#12-requisiti-aggiuntivi--10-settembre-2026).

**Fase 7 — Scala**:
- Implementato: più paesi/livelli/gironi, promozione/retrocessione,
  rigenerazione calendari, archivio e reset delle statistiche stagionali
- Implementato: invecchiamento, crescita e calo, contratti e rinnovi,
  scadenze, svincolati, ritiri, nuovi giovani, provini, U19 e U23 condizionata
- Da completare: bilanciamento generale, salvataggi multipli/difficoltà e
  rientro prestiti quando il mercato dei prestiti sarà disponibile
- Implementato: coppe nazionali a eliminazione diretta configurabili, con
  ingressi per divisione, bye, andata/ritorno, rigori, trofeo e rollover
- Da completare: competizioni continentali e coppe con fase a gironi
- Continuità giocatori approvata: rinnovi manuali per la prima squadra
  dell'utente e delegati altrove; promemoria scadenze a inizio stagione/gennaio
  e vivaio a inizio stagione/dicembre; crescita legata a rendimento e
  allenamento; possibilità per veterani di scendere di categoria; quote di
  iscrizione per U17/U13; due provini annuali con bacino condiviso; ex
  giocatori importanti archiviati e, nel 90% dei casi, convertiti in staff

**Fase 8 — Architettura dati a database editabile**: JSON mondiale versionato,
validatore e selezione paesi implementati; importazione di file esterni ed
editor visuale restano da costruire (§11.3).

**Backlog non pianificato** (fuori scope finché non ripreso esplicitamente):
modalità "Crea la tua squadra" (mappa Italia), Allenatore del Mese/Anno,
FIFA XI, Pallone d'Oro, dettagli economici avanzati dei prestiti.

**Presentazione futura dell'ufficio e dei media:** Notizie e Messaggi saranno
mostrati sul portatile dell'ufficio, mentre documenti figurativi sul tavolo
apriranno le decisioni urgenti. La sezione avrà messaggi interni separati da
notizie di campionato, mercato, Premi TuttoCampo e, con il mondo esteso,
notizie estere. Gli sponsor potranno fornire un logo e aggiornare
figurativamente una maglia 3D secondo gli accordi firmati.

---

## 13. Limiti noti e debito di design del prototipo attuale

Sezione scritta per onestà intellettuale verso chiunque riprenda questo
progetto: elenco dei gap più significativi tra la visione (questo documento)
e lo stato implementato oggi, con l'indicazione di dove sono già discussi in
dettaglio.

- **Continuità da bilanciare sul lungo periodo**: rollover, archivi,
  promozioni/retrocessioni, età, crescita, contratti, ritiri e nuovi giovani
  sono presenti. Servono simulazioni di molte stagioni per calibrare età
  medie, qualità delle rose, numero di svincolati e sostenibilità economica.
- **City-profile in gran parte decorativo**: dei cinque campi del profilo
  città (popolazione, ricchezza, saturazione, tradizione giovanile, costo
  vita), solo la ricchezza incide oggi meccanicamente (sul budget) — la forza
  di una rosa è generata indipendentemente dal contesto cittadino in cui
  gioca, anche se il design (§3) presuppone il contrario.
- **Allenamento da bilanciare sul lungo periodo** (§6.6): utente e CPU
  impostano focus e intensità e la CPU rivaluta il piano ogni due settimane.
  Servono simulazioni pluriennali per calibrare crescita e condizione.
- **Motore di simulazione**: numerose semplificazioni dichiarate nel codice
  stesso (fatica che non tocca mai tecnica/lucidità mentale, momentum
  psicologico clampato in banda stretta — niente crolli/rimonte
  psicologiche estreme, rotazioni "Calcio Totale" in realtà statiche dopo un
  singolo scambio a inizio partita, tattiche CPU che si ricalibrano solo a 3
  checkpoint fissi per partita, capocannoniere di lega strutturalmente fuori
  target statistico perché trainato dalla forza di squadra più che dal
  talento individuale). Elenco completo e proposte di soluzione discussi in
  sessione di lavoro — da consolidare in un documento dedicato se si vuole
  intervenire sistematicamente sul motore.
- **Staff con effetti da verificare**: le descrizioni di staff medico e
  vice-allenatore promettono bonus meccanici specifici (-7% recupero
  infortuni/livello, +0.5% rendimento squadra/livello) che non sono stati
  confermati come effettivamente cablati end-to-end nel motore durante
  l'ultima verifica — solo il preparatore atletico è chiaramente confermato
  attivo.
- **Morale senza vita propria**: nessun decadimento passivo verso la
  neutralità, nessuna reazione automatica a serie di risultati se non
  tramite chiamate esplicite già previste (discorso inizio stagione, esito
  obiettivo).
- **Nessun sistema di allenamento per cambiare ruolo**, nonostante fosse
  promesso da un commento nel codice per la Fase 5 (poi non mantenuto in
  quella fase).
- **Vista 2D da migliorare — problema aperto e posticipato al 10/09/2026:** la revisione del replay ha corretto alcuni problemi, ma l’utente segnala che campo e cronaca laterale non sono ancora perfettamente sincronizzati. Diagnosi dello scostamento residuo, miglioramenti delle animazioni e verifica visiva oltre ai test sono rimandati a funzionalità quasi complete, salvo errori che blocchino la carriera. Dettaglio in [milestone del motore](motore/07-milestones.md) e [blueprint §12.1](blueprint.md#121-partita-2d-miglioramento-e-sincronizzazione-ancora-aperti).

Questi limiti (a eccezione del bug 2D appena citato) non sono bug nascosti: sono scelte di scope consapevoli di un
prototipo che doveva validare le meccaniche core prima di tutto. Restano
comunque il punto di partenza più utile per chiunque pianifichi le prossime
fasi di sviluppo.

---

## 14. Domande aperte

Riepilogo delle domande che richiedono una decisione condivisa, non
unilaterale (dettaglio completo dove indicato):

- Quante città/squadre "esistenti" pre-generate conviene avere per iniziare
  a espandere oltre Brescia/Franciacorta?
- **Architettura dati** (§11.3): vincolo database per carriera, merge di più
  database, conciliazione con un eventuale multiplayer futuro.
- Nome definitivo per "Armonia Settore" (§6.7) e per "Centro Sviluppo" (in
  valutazione anche "Scuola Calcio", §6.5).
- Dettaglio tecnico del motore di eventi narrativi (§8) che dovrà reggere i
  filoni Sindaco/criminalità organizzata/Armonia Settore — non specificato in
  questo round, da progettare quando si arriva all'implementazione.

---

## 15. Riferimenti

- [`docs/blueprint.md`](blueprint.md) — blueprint di prodotto, struct dati
  dettagliate, roadmap a fasi
- [`docs/motore/README.md`](motore/README.md) — blueprint tecnico del motore
  di simulazione partite "Ventidue" (capitoli 01-07)
- [`docs/motore/07-milestones.md`](motore/07-milestones.md) — target
  statistici di calibrazione e log delle milestone del motore
- [`README.md`](../README.md) — stato attuale del prototipo, changelog per
  versione, istruzioni di avvio
