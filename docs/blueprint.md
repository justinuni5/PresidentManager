# Blueprint — Gioco Manageriale di Calcio

## 1. Visione del progetto

Un gioco manageriale di calcio in stile "Football Manager light", ambientato nella realtà calcistica italiana, giocabile via browser (HTML/CSS/JS, React), con:

- Ambientazione italiana: piramide calcistica italiana, a partire dal basso — Eccellenza (18 squadre) e Promozione (10 squadre), ambientate nei comuni reali della zona Brescia/Franciacorta (non nei grandi capoluoghi nazionali), ognuno con un proprio profilo (popolazione, ricchezza, saturazione calcistica, tradizione giovanile, costo vita)
- Ruolo giocatore: **presidente-allenatore** — un'unica figura che gestisce sia il club (finanze, sponsor, mercato) sia la squadra sul campo (tattica, formazioni, allenamenti)
- Modalità di gioco: **squadra esistente** (parti da un club già presente nel mondo di gioco). La modalità **crea la tua squadra** (fondazione da zero, con scelta della città su mappa) è stata rimossa dallo scope corrente e spostata a caratteristica futura — vedi §9 e §4.11.
- Simulazione partite a statistiche con visualizzazione 2D "a eventi"
- Mercato trasferimenti attivo anche per le squadre CPU
- Gestione economica (inclusi sponsor), allenamenti, centro sviluppo giovani (11-18 anni)
- Ciclo giorno per giorno con notizie e messaggi
- Loghi squadra e avatar giocatori generati proceduralmente (SVG), non materiale reale su licenza
- Editor interno per modificare attributi giocatori, attivabile/disattivabile a inizio partita

**Non-obiettivi (per ora):** motore fisico 3D, IA neurale per le CPU.

**⚠️ Punto da chiarire — nomi/loghi reali:** vuoi restare sulla realtà calcistica italiana e poter scegliere "una squadra che già esiste". Distinzione importante:
- **Città reali, struttura dei campionati italiani, ambientazione calcistica italiana** → nessun problema, è contesto geografico/sportivo.
- **Nomi, stemmi, colori ufficiali di club realmente esistenti (es. grandi squadre italiane note) e nomi/facce di calciatori reali** → materiale protetto da copyright/diritti d'immagine, non posso riprodurlo né generare loghi che li imitano fedelmente.
- **Soluzione standard nei manageriali non ufficiali:** squadre "ispirate" al tessuto calcistico italiano ma con nomi/loghi reinventati, oppure un sistema dove **tu** rinomini/personalizzi le squadre una volta nel gioco (a quel punto la scelta del nome è tua, non mia). Ne parliamo al punto 4.8 e nelle decisioni aperte.

---

## 2. Stack tecnico

| Livello | Scelta | Perché |
|---|---|---|
| UI | React (artifact HTML) | Iterazione rapida, componenti riusabili per pannelli/tab/tabelle |
| Grafici | Recharts | Andamento bilancio, morale, forma squadra |
| Grafica campo/loghi/avatar | SVG generato via codice | Leggero, scalabile, nessun asset esterno, nessun problema di copyright |
| Persistenza | `window.storage` (key-value artifact) | Salvataggio partita senza backend esterno |
| Stato di gioco | React state + storage sync | Nessun server, tutto client-side |

**Limite noto:** lo storage è legato a questo artifact/conversazione. Un salvataggio "cloud" multi-dispositivo richiederebbe un backend esterno in futuro — non necessario per iniziare.

### 2.1 Nota strategica: questo stack è solo il prototipo

**L'attuale versione HTML/CSS/JS (React) serve esclusivamente a validare
meccaniche e design.** Non è la base tecnica del prodotto finale. La versione
definitiva del gioco sarà sviluppata in **Godot** (opzione più probabile) o
**Unity** — un motore di gioco vero, non un'app web.

**Implicazione pratica per come si lavora da qui in avanti:** ogni sistema,
formula o regola di gioco va documentato anche in **forma indipendente dal
linguaggio** (specifica testuale o pseudo-codice nel blueprint/GDD), non solo
nei commenti del codice JS del prototipo. Il codice del prototipo resta la
prova che una meccanica *funziona*, ma la futura riscrittura in Godot/Unity
deve poter partire da una base di design chiara e leggibile, senza dover
decompilare la logica dai file `.js`. Questo blueprint e il [Game Design
Document](GDD.md) sono quindi la fonte di verità per il *design*; il codice
in `src/` è la fonte di verità solo per il *comportamento attuale del
prototipo*, che può divergere man mano che il design evolve più in fretta di
quanto valga la pena implementare in JS.

---

## 3. Struttura dati (bozza)

### Giocatore
```
{
  id, nome, cognome, nazionalità, età, ruolo (o ruoli),
  attributi: { tecnica, fisico, mentale, portiere(se GK) ... },
  potenziale, forma, morale, condizione/infortunio,
  reputazione (intero 1–300, pianificato: §12),
  valore_mercato (calcolato), stipendio, contratto_scadenza,
  squadra_id, avatar_seed (per generare l'aspetto),
  is_settore_giovanile (bool, età 11-18), anni_al_settore,
  svincolato (bool, Fase 6), prestito: { da_squadra_id, a_squadra_id, stagione_rientro } | null (Fase 6),
  trofei: [ {premio_id, tipo (club/individuale), stagione, squadra_id, posizione (1°/2°/3° se podio)} ... ] (Fase 5)
}
```

### Squadra
```
{
  id, nome, abbreviazione, lega_id, città_id, colori, logo_seed,
  rosa: [player_id...], settore_giovanile: [player_id... età 11-18],
  budget, monte_stipendi, sponsor: [sponsor_id...],
  modulo_preferito, reputazione (intero 1–300, nuova scala pianificata: §12), is_cpu (bool), is_fondata_da_utente (bool),
  bisogni_rosa (calcolati per il mercato CPU)
}
```

### Città
```
{
  id, nome, regione,
  popolazione, ricchezza, saturazione_calcistica,
  tradizione_giovanile, costo_vita,
  squadre_presenti: [team_id...] (incluse eventuali CPU già radicate lì)
}
```

### Sponsor
Struct rivista in dettaglio in §4.12. Un contratto sponsor copre uno o più
**slot** (petto principale, manica sinistra, manica destra, kit allenamento)
e ha un **tipo di offerente** che determina benefici/rischi collaterali oltre
ai soldi (azienda locale normale, sindaco, azienda di facciata/mafia).
```
{
  id, nome, tipo_offerente ('azienda_locale' | 'sindaco' | 'azienda_di_facciata'),
  slot_richiesti: [ {posizione ('petto_principale'|'manica_sinistra'|'manica_destra'|'kit_allenamento'),
                      lato (solo per petto_principale: 'davanti'|'dietro' — mai entrambi contemporaneamente)} ... ],
  offerta_economica_annua, durata_contratto (1-7 anni, la maggioranza sceglie 3, 7 è raro),
  // Aziende locali "normali"
  obiettivi_richiesti (es. posizione minima in classifica, risultati) | null,
  penalità_se_non_rispettati | null,
  // Sindaco (vedi §4.12)
  effetti_collaterali_sindaco: { velocita_infrastrutture_bonus, iscrizioni_scuola_calcio_bonus, morale_tifosi_bonus } | null,
  associazione_politica: { orientamento_percepito, intensita_controversia, fedelta_ultras_bonus, rischio_perdita_tifosi_moderati } | null,
  richiesta_giocatore_sindaco: { giocatore_id (tipicamente il figlio, tipicamente scarso), minutaggio_atteso } | null,
  // Azienda di facciata / mafia (vedi §4.12) — MAI rivelato come tale all'utente all'atto della firma
  è_di_facciata (bool, nascosto in UI finché non emerge narrativamente),
  gruppo_mafioso_id | null,
  minacce_attive: [ {tipo ('autogol'|'cartellino'|'gol_subiti_minimo'), giocatore_bersaglio_id,
                      scadenza, tentativi_falliti (0-3, alla 3ª conseguenze narrative gravi)} ... ],
  rischio_indagine (0-100, cresce con pattern sospetti — troppi autogol/eventi anomali nello stesso periodo),
  stato ('attivo' | 'scaduto' | 'rescisso' | 'sotto_indagine')
}
```

### Stadio
Struct nuova, dettagliata in §4.14. Ogni squadra ha uno stadio, di proprietà
comunale per default.
```
{
  id, squadra_id, nome,
  proprietà ('comunale' | 'club' — default comunale, acquistabile già in Eccellenza
             ma economicamente quasi proibitivo, richiede rapporto sufficiente
             sia col Sindaco sia coi tifosi),
  capienza, pista_atletica (bool — alza capienza, svaluta gli sponsor bordocampo
                             dietro la pista, migliora gli allenamenti atletici),
  ingabbiato (bool),
  bar_ristoro: { presente (bool), livello_investimento (capienza/efficacia/personale),
                 merchandising_incluso (bool, si sblocca a un certo livello di investimento) } | null,
  store_merchandising_dedicato (bool — il merchandising del bar si "scorpora" in
                                 negozio dedicato quando la squadra, partita
                                 dall'Eccellenza, raggiunge la Serie B),
  sponsor_bordocampo: [ {posizione, prezzo_annuo (500-2000€ a posizione), sponsor_id} ... ]
    // totale 20k-50k in base ad attributi stadio/location/città/affluenza media;
    // con un solo settore (tipico Eccellenza) nessuno sponsor vuole la posizione
    // sotto il settore stesso (invisibile ai tifosi)
  bus_prima_squadra: { tipo ('noleggio_con_conducente' | 'proprietà'), dettagli } (vedi §4.14),
  minibus_giovanili: [ {dettagli} ... ] (fino a 3, 9 posti ciascuno, vedi §4.14)
}
```

### Tifosi (contatore fan — concettuale, formule da bilanciare in una fase successiva)
```
{
  squadra_id, numero_tifosi (contatore, valore assoluto),
  trend ('in_crescita' | 'stabile' | 'in_calo'),
  // Collegamenti concettuali (nessuna formula definitiva ancora): risultati
  // sportivi, morale_tifosi (§4.5), azioni del sindaco/altri sponsor (§4.12),
  // profilo della città (popolazione, saturazione_calcistica — §3 Città)
}
```

### Lega
```
{
  id, nome, livello (per scalare forza/budget),
  squadre: [team_id...], calendario, classifica
}
```

### Partita (evento simulato)
```
{
  id, lega_id, giornata, casa_id, trasferta_id,
  eventi: [ {minuto, tipo (tiro/gol/cartellino/infortunio), giocatore_id, esito} ... ],
  risultato
}
```

### Premio (Fase 5)
```
{
  id, tipo (settimana/mese/anno), categoria (giocatore/giocatore_u21/squadra/capocannoniere/squadra_del_mese/squadra_dell_anno),
  ufficiale (bool — se falso è un riconoscimento "TuttoCampo", non ufficiale di lega),
  in_bacheca (bool — se il tipo compare nella bacheca trofei del profilo),
  lega_id, stagione, giornata (solo per i premi settimanali),
  podio: [ {giocatore_id, posizione} ... ] (solo mensili/annuali — la notizia mostra 1°-2°-3°, il trofeo va solo al 1°),
  vincitore: giocatore_id (settimanali: solo il vincitore),
  formazione: [ {giocatore_id, ruolo, titolare (bool)} ... ] (solo squadra del mese/anno — 11 titolari + 7 riserve per l'anno)
}
```

### Stato di gioco globale (salvato in storage)
```
{
  save_id, data_corrente, squadra_utente_id,
  leghe: [...], squadre: [...], giocatori: [...],
  calendario_partite: [...], mercato_attivo (bool/finestra),
  notizie: [...], finanze_club: {...}
}
```

---

## 4. Sistemi di gioco

### 4.1 Generazione procedurale
- Generatore leghe → Eccellenza 18 squadre, Promozione 10 (dimensione per lega non più uniforme; le altre categorie della piramide, quando arriveranno, avranno le proprie)
- Generatore squadre → nome/colori/logo SVG generati da seed, budget iniziale per livello lega, sede pescata dal pool di comuni reali Brescia/Franciacorta
- Generatore giocatori → attributi realistici per un campionato di Eccellenza: **media rosa 25-39** su scala 1-100 (dove 95+ è livello internazionale), non più 57-59. Ogni club pesca il proprio centro di forza (non più una media fissa condivisa da tutta la lega): dà sia varietà reale tra le rose (squadre oggettivamente più forti/deboli, non solo sulla carta) sia, tra i singoli giocatori di una stessa rosa, outlier di talento fisico/mentale (rari, es. un giovane fisicamente prematuro) o di lacuna fisico/mentale (più comuni) — mai sulla tecnica, che resta uniforme: un calciatore di Eccellenza si allena e la manualità tecnica non si discosta quanto un fisico o una testa
- Parametrizzabile: numero leghe, squadre per lega, giocatori per rosa

### 4.2 Simulazione partite
- Motore a statistiche: forza attacco vs difesa, forma, tattica/modulo, fattore casa, un po' di randomicità pesata
- Output: sequenza di eventi testuali con minuto e protagonista
- **Momenti salienti mostrati, non solo i gol** — occasioni clamorose fallite, parate decisive, cartellini (giallo/rosso), infortuni, VAR/episodi dubbi. Questo è voluto: se mostrassi solo i gol, l'utente capirebbe in anticipo che sta per arrivare un gol ogni volta che parte un evento. Mostrando anche le occasioni sprecate e le parate, la tensione resta fino all'ultimo
- Visualizzazione: campo SVG statico + animazione leggera per evento (pallino che si muove, icona tiro/parata/gol/cartellino), non fisica in tempo reale

### 4.3 Mercato trasferimenti (utente + CPU)
- Valore di mercato calcolato da formula (età, attributi, potenziale, forma, contratto residuo)
- Squadre CPU: valutano bisogni rosa periodicamente → cercano giocatori compatibili → offrono % del valore con variazione random
- Regole di accettazione/rifiuto/contro-offerta, vincolate al budget/monte stipendi
- Attivo principalmente in finestre di mercato (per non generare rumore continuo)
- Rumor di mercato tra CPU integrati nel sistema notizie

### 4.4 Allenamento e crescita
- Focus allenamento assegnabile (fisico/tecnico/tattico/portiere)
- Evoluzione attributi nel tempo in base a età, potenziale, focus, minutaggio
- Giovani: crescita più rapida verso il potenziale, rischio di stagnazione se non giocano

### 4.5 Sistema morale (multi-livello)
Non un singolo numero "morale squadra" — più livelli che si influenzano a vicenda:

**Morale tifosi**
- Sale/scende in base a scarto tra risultato atteso e risultato reale (non solo vittoria/sconfitta in sé: perdere contro una big non abbatte quanto perdere contro una piccola quando "si doveva vincere")
- Influenzato da obiettivi di stagione fissati a inizio anno (se dichiari "salvezza" e la ottieni con margine, morale alto; se dichiari "promozione" e sfumi all'ultima giornata, morale basso) — gli obiettivi "sottostimati" rispetto al potenziale reale della squadra possono anche giocare a favore quando vengono superati facilmente

**Morale giocatore (individuale)**
- Minutaggio reale vs minutaggio atteso dal proprio contratto/status in rosa
- **Con "motivo valido" il giocatore non si lamenta irrazionalmente** — es. se un giovane wonderkid sta rendendo molto meglio e gli toglie spazio, il giocatore escluso può capire la situazione (magari chiede comunque un confronto, ma con un tono diverso da chi si sente escluso senza motivo). Il sistema quindi non è solo "minuti sotto soglia → malcontento", ma valuta anche il contesto (chi gli sta davanti, come sta rendendo, se ci sono infortuni/squalifiche che giustificano l'esclusione)
- Un giocatore scontento può chiedere un confronto diretto (dialogo con opzioni di risposta), non solo generare un evento passivo

**Effetto conferenze stampa**
- Le domande in conferenza stampa hanno bersagli diversi a seconda di cosa viene chiesto e di chi si sta parlando: una risposta può impattare un singolo giocatore, un intero reparto (es. critica alla difesa), tutta la squadra, oppure il morale dei tifosi — non è un evento generico, il sistema traccia chi è "il destinatario" della dichiarazione

**Offerte di mercato rifiutate**
- Se il giocatore riceve un'offerta importante per la sua carriera e l'utente la rifiuta, il giocatore può arrabbiarsi, e in casi estremi sfogarsi pubblicamente (evento "post social" che genera reazioni a catena — tifosi, compagni, stampa)

**Relazioni e conflitti**
- Squilibri/rivalità tra allenatori avversari (derby, storia recente tra le due squadre)
- Giocatori in prestito gestiti male dalla squadra ospitante (poco utilizzati senza motivo) possono generare malcontento sia nel giocatore che, indirettamente, nel rapporto con la squadra di provenienza (rilevante se in futuro vuoi ritrattare prestiti con quella squadra)

Tecnicamente: ogni entità (giocatore, reparto, squadra, tifosi) ha un proprio valore di morale che viene aggiornato da un insieme di "trigger" (risultato partita, minutaggio, dichiarazione, offerta rifiutata, ecc.), ognuno con un peso e un target specifico — così un singolo evento può toccare più livelli contemporaneamente (es. rifiutare un'offerta abbassa il morale del giocatore, e se lo scopre la stampa, anche un po' quello dei tifosi).

### 4.6 Editor attributi (contestuale)
- Non una schermata separata: un'**icona a pennello** visibile nella pagina profilo del giocatore (solo se l'editor è stato attivato a inizio partita)
- Cliccandola si aprono in modifica sia gli **attributi visibili** (quelli che vedi normalmente, es. tecnica/fisico/mentale) sia quelli **nascosti** (es. potenziale, professionalità, coerenza di rendimento) — utile per bilanciare/testare o semplicemente giocare come preferisci
- Scope di default: solo la tua squadra (vedi decisioni aperte più sotto se vuoi estenderlo)
### 4.7 Ciclo di avanzamento — "avanza al prossimo evento importante"
Non un banale "+1 giorno" ripetuto manualmente: il pulsante "Avanza" salta automaticamente al **prossimo evento rilevante**, che può essere lo stesso giorno o distare più giorni, a seconda di cosa c'è nel mezzo. Eventi che fermano l'avanzamento:

- **Matchday** (partita da giocare/seguire)
- **Conferenza stampa** (pre/post partita, o su richiesta)
- **Scadenza di mercato rilevante** (offerta ricevuta, trattativa da rispondere, chiusura finestra)
- **Evento rosa** (infortunio significativo, giocatore in scadenza contratto, richiesta di cessione)
- **Messaggio/notizia importante** (sponsor, giovane pronto per la prima squadra, traguardo raggiunto)
- **Allenamento** solo se richiede una decisione (es. scelta focus settimanale), non ogni singola sessione

Tra un evento e l'altro, tutto ciò che è "routine" (allenamenti senza decisioni, giorni di riposo, piccoli aggiornamenti di forma/morale) viene simulato internamente senza fermare il giocatore, e riassunto nel feed notizie se rilevante. Questo tiene il ritmo di gioco vicino a "premo avanza e succede sempre qualcosa di interessante", invece che avanzare giorno per giorno senza motivo.

- Generatore di notizie/eventi testuali basato su regole (serie di risultati, scadenze contratti, richieste organizzative)
- Messaggi/eventi: obiettivi di stagione, feedback su risultati/mercato, eventuali comunicazioni da sponsor o organi federali (promozione/retrocessione, calendario)

### 4.8 Finanze club
- Budget trasferimenti, monte stipendi, incassi (biglietti/sponsor), spese
- Vincoli realistici: non puoi spendere oltre budget, stipendi impattano il tetto

### 4.9 Identità visiva procedurale
- **Badge squadra (v1, semplice):** generato dai colori sociali scelti (2 colori + iniziali/abbreviazione), forma base (cerchio/scudo). Non uno stemma elaborato — quello resta un'estensione futura opzionale, non prioritaria ora.
- Avatar giocatori: SVG parametrico (tratti/colori combinati da seed), non fotorealistico
- Estendibile in futuro con stemmi più elaborati o image generation esterna via API, se vorrai

### 4.10 Nomi squadre — inseriti dall'utente
- Nome squadra, abbreviazione (e opzionalmente città/colori) sono **campi di testo che compili tu**, sia in modalità "crea la tua squadra" sia per rinominare le squadre CPU pre-generate prima di iniziare (se vuoi usare nomi di club reali, è una tua scelta nel tuo salvataggio — io fornisco solo il campo, non genero io quei contenuti)
- Il generatore procedurale userà **nomi placeholder neutri** (es. combinazioni città + suffisso tipo "Calcio", "FC", "Sporting Club") come default per le squadre che non rinomini, così il mondo di gioco è comunque popolato senza intervento manuale ovunque

### 4.11 Modalità "Crea la tua squadra" — ⏸️ caratteristica futura, fuori dallo scope corrente
Spostata al backlog (vedi §9): si prosegue solo con la modalità "squadra esistente". Contenuto conservato qui come riferimento per quando verrà ripresa in una fase futura.

Percorso guidato in step:

1. **Mappa dell'Italia** — città selezionabili come sede della nuova squadra. Ogni città ha un set di **pro/contro** che influenzano il gioco fin dall'inizio, ad esempio:

   | Fattore | Effetto |
   |---|---|
   | Bacino tifosi potenziale | Città grandi = più tifosi potenziali, ma quota "già presa" da squadre storiche locali → più lento a crescere |
   | Concorrenza locale | Presenza di altre squadre (proprie del mondo di gioco) nella stessa città/regione → competizione per tifosi, sponsor, giovani talenti |
   | Costo della vita / aspettative salariali | Città con costo vita alto → giocatori pretendono stipendi più alti a parità di livello, anche in categorie basse |
   | Offerta sponsor | Città con più aziende/economia forte → sponsor disponibili più ricchi, ma magari più esigenti (obiettivi richiesti) |
   | Bacino giovani/vivaio | Città con tradizione calcistica → migliori prospetti disponibili per il centro sviluppo |
   | Costo infrastrutture | Stadio/centro sportivo iniziale più caro o più economico a seconda della città |
   | Categoria di partenza | Si parte sempre dal fondo della piramide (categoria più bassa), ma il "soffitto" reputazionale/di crescita può variare per città |

   Questo sistema è modellabile con un semplice **profilo numerico per città** (es. `{popolazione, ricchezza, saturazione_calcistica, tradizione_giovanile, costo_vita}`) da cui deriviamo automaticamente budget iniziale, aspettative salariali, offerta sponsor e qualità vivaio disponibile. Non serve scrivere regole uniche per ogni città: un set di formule applicate al profilo basta per Milano, Ravenna, Palermo, ecc.

2. **Nome squadra**
3. **Abbreviazione** (es. 3 lettere per tabellini/classifiche)
4. **Colori sociali** (primario/secondario, eventualmente terza maglia)
5. **Stemma** — generato proceduralmente in base a forma scelta + colori + iniziali, con possibilità di rigenerare finché non piace

Al termine: la squadra nasce nell'ultima categoria disponibile nella piramide, nella città scelta, con budget/rosa iniziale calcolati dal profilo città + categoria.

### 4.12 Sistema Sponsor (dettagliato)

Il club può avere contratti sponsor attivi su più **slot** indipendenti della
divisa e del kit. Ogni slot può avere un titolare diverso; alcuni sponsor
vogliono più slot insieme, altri solo una parte specifica.

**Slot disponibili:**

| Slot | Vincoli | Range economico annuo |
|---|---|---|
| Petto principale | Uno slot solo — alternato **davanti O dietro**, mai entrambi insieme | 10k-35k€ |
| Manica sinistra | Indipendente dalla destra | 3k-8k€ |
| Manica destra | Indipendente dalla sinistra | 3k-8k€ |
| Kit allenamento (incluso borsone) | — | 2k-6k€ |

Il prezzo del petto principale dipende da: obiettivi dello sponsor, città
della squadra, reputazione della squadra, reputazione/dimensione dello
sponsor (una multinazionale è impossibile in Eccellenza, plausibile in Serie
A). La maggior parte degli sponsor vuole petto + maniche insieme, ma alcuni
richiedono solo una parte specifica. Durata contratto: 1-7 anni — la
maggioranza sceglie 3 anni, 7 anni è raro (e sconveniente per l'utente, che
resta vincolato a lungo a condizioni che potrebbero invecchiare male).

**Tipologie di offerenti**, oltre alle normali aziende locali:

**Il Sindaco.** Offerta economica tra le più basse del mercato sponsor, ma
con benefici collaterali concreti:
- Velocizza costruzione/riparazione di infrastrutture (percentuale di lavoro
  più alta sulle richieste in corso)
- Aumenta le iscrizioni alla scuola calcio (Centro Sviluppo)
- Migliora il morale dei tifosi (dichiarazioni pubbliche a favore, interviste,
  campagne elettorali)

Contropartite/rischi: "presenza insieme" (cene, eventi pubblici) crea nei
tifosi un'associazione tra il presidente-allenatore e l'orientamento politico
del sindaco — se il sindaco ha posizioni politiche controverse/estremiste,
può causare la perdita di una parte della tifoseria, ma **rendere più
fedeli gli ultras rimasti**, specialmente se l'utente resta coerente nel
tempo (non cambia sponsor/sindaco a ogni piè sospinto). Il sindaco tipicamente
chiede favori sportivi: far giocare/acquistare certi giocatori, in
particolare il figlio del sindaco stesso (tipicamente scarso, minutaggio
atteso quasi nullo — un vincolo scomodo per la squadra).

**Aziende "di facciata" (riciclaggio/mafia).** Non rivelate come tali
all'atto della firma: agli occhi dell'utente sono aziende locali come le
altre, con un'offerta però molto più competitiva/alta della media. Il vero
obiettivo è il riciclaggio di denaro attraverso il club.
- Possono arrivare a **minacciare** (non semplicemente chiedere) di pilotare
  eventi in partita: autogol (il tipo di richiesta più pericoloso da gestire
  per l'utente, perché il più visibile/sospetto), cartellini gialli/rossi
  mirati su un giocatore specifico, numero minimo di gol subiti per il
  portiere in una partita.
- Le forze dell'ordine possono notare pattern sospetti (troppi autogol,
  eventi che sembrano forzati nello stesso periodo) e **aprire un'indagine**
  — se un giocatore confessa il coinvolgimento della proprietà, conseguenze
  serie per l'utente/club (narrativamente: sanzioni federali, sequestro del
  club, scandalo mediatico — dettagli da definire in fase di scrittura degli
  eventi).
- I mafiosi possono anche minacciare direttamente i giocatori **senza che
  l'utente lo sappia**, del tutto indipendentemente da un eventuale contratto
  sponsor in corso. In questo caso l'utente non subisce conseguenze dirette:
  solo il/i giocatori coinvolti sono impattati.
- **Segnali che l'utente può notare**: comportamento anomalo di un giocatore
  (cartellini rossi frequenti mai visti prima nel suo profilo, un portiere
  improvvisamente impreciso, gol facili concessi fuori pattern), oppure il
  giocatore stesso che si confida — subito dopo la minaccia, o più tardi, da
  pentito.
- **Casi estremi**: se un giocatore minacciato fallisce ripetutamente (3
  volte) nel soddisfare le richieste, può subire conseguenze gravi nella
  narrazione, fino alla sua scomparsa dal roster/dalla storia.
- Esistono **più gruppi mafiosi distinti**, presenti soprattutto nei
  campionati del sud, ma anche (in misura minore) al nord — coerente con la
  futura espansione multi-regione della piramide (Fase 7).
- La probabilità che un giocatore accetti/ceda a una minaccia **diminuisce
  salendo di categoria** (un giocatore di Serie A ha meno motivo e più
  consapevolezza dei rischi), **tranne** in casi di dipendenza da gioco
  d'azzardo o debiti gravi, che rendono un giocatore vulnerabile
  indipendentemente dal livello in cui gioca.

*Nota di scope: questo è un sistema narrativo complesso (minacce, indagini,
conseguenze a cascata) — richiederà probabilmente un motore di eventi
dedicato, non solo trigger puntuali come il resto del morale. Va pianificato
come sistema a sé quando si arriva a implementarlo, non una semplice
estensione di `morale.js`.*

### 4.13 Contatore Fan (concettuale)

Un contatore del numero di tifosi della squadra, collegato concettualmente a:
risultati sportivi, morale (§4.5), azioni del sindaco/altri sponsor (§4.12),
profilo della città (§3 Città — popolazione, saturazione calcistica). Per ora
serve solo la **struttura dati** (vedi §3 — struct `Tifosi`) e il
collegamento concettuale ai sistemi esistenti; le formule esatte di
crescita/calo restano da bilanciare in una fase di sviluppo successiva.

### 4.14 Sezione Stadio

Tutti gli stadi sono **di proprietà comunale per default**. È possibile
acquistarli già in categoria Eccellenza (non solo da Serie C in su, come
ipotizzato inizialmente) — ma le finanze tipiche di una squadra di Eccellenza
rendono l'operazione quasi un "suicidio economico" nella pratica: un vincolo
economico naturale più che una regola artificiale. Per poter acquistare,
serve inoltre un rapporto sufficientemente positivo **sia** col Sindaco
**sia** con i tifosi (entrambe le condizioni, non una a scelta).

**Attributi stadio**: nome, capienza, presenza pista atletica, se è
"ingabbiato", presenza bar ristoro, presenza store merchandising.

**Sponsor bordocampo**: 20k-50k€ totali, in base ad attributi
stadio/location/città, prezzo per singola posizione (500-2000€ a posizione),
affluenza media. La pista atletica aumenta la capienza ma svaluta gli sponsor
posizionati dietro la pista (troppo lontani dai tifosi per essere visibili);
in compenso migliora la qualità degli allenamenti atletici. Con un solo
settore (tipico di uno stadio di Eccellenza), nessuno sponsor vuole la
posizione sotto il settore stesso (invisibile a chi è seduto sopra).

**Bar ristoro**: genera entrate scalabili con l'investimento (capienza,
efficacia, personale richiesto). A un certo livello di investimento sblocca
la vendita di merchandising all'interno del bar stesso; quando la squadra
(partita dall'Eccellenza) raggiunge la Serie B, il merchandising si
"scorpora" in un negozio dedicato separato.

**Gestione bus**:
- *Prima squadra*: noleggio con conducente (opzione più comune, 500-800€ per
  trasferta in base alla distanza) oppure acquisto di un bus usato
  (40.000-80.000€, durata minima 4 anni per i modelli più economici, con
  manutenzione più frequente/costosa; costo per trasferta 100-220€ in base al
  prezzo del bus e alla distanza — più costoso il bus, meno consuma).
- *Settore giovanile*: fino a 3 minibus da 9 posti (12.000-25.000€ ciascuno,
  stessi criteri di prezzo del bus della prima squadra) — migliorano il
  morale della tifoseria generale (un club che investe visibilmente sul
  vivaio comunica serietà); costo di gestione 50€/settimana per minibus.

### 4.15 Flusso di avvio

1. **Schermata iniziale** — copertina/titolo del gioco, un bottone per
   entrare nel Main Menu.
2. **Main Menu** — quattro voci:
   - **Nuova Carriera**
   - **Crea la Tua Squadra** — porta a una schermata "in arrivo" con
     anteprima delle feature previste e un bottone per tornare indietro (non
     funzionante: coerente con lo stato di §4.11, caratteristica futura)
   - **Carica Salvataggio**
   - **Impostazioni**
3. **Dopo "Nuova Carriera"** — l'utente sceglie un **database** da una
   cartella dedicata del gioco (lista dei database disponibili). Questo passo
   anticipa l'architettura a database editabile descritta in §10: anche nel
   prototipo, "iniziare una carriera" significa scegliere quale mondo di
   gioco caricare, non generarne uno al volo senza scelta.

---

## 5. Schermate principali (UI)

**Ordine della sidebar di navigazione:** Dashboard · Notizie e Messaggi ·
Rosa · Centro Sviluppo · Calendario · Campionato · Tattiche · Mercato · Staff
· Sponsor · Stadio · Allenamento · Finanze · Club. Contratti vive nei profili
dei giocatori e Spogliatoio è una pagina interna di Rosa.

1. **Dashboard/Home** — prossima partita, notizie recenti, messaggi/eventi. Click-through bidirezionale con la schermata Notizie e Messaggi (Fase 5)
2. **Notizie e Messaggi (Fase 5)** — schermata dedicata, layout in stile Football Manager: lista notizie a sinistra, click su una notizia espande i dettagli a destra (se la notizia riguarda un giocatore, mostra il suo avatar nel pannello espanso). Copre: eventi generici, conferenze stampa, reazioni social, resoconti post-partita (marcatori, cartellini, migliore in campo), assegnazione premi (con click-through al nome del giocatore/pagina Albo d'Oro)
3. **Rosa (prima squadra)** — tabella giocatori ordinabile, profilo giocatore al click. Nel profilo, se l'editor è attivo: icona a pennello che apre la modifica di statistiche visibili **e nascoste** (potenziale, professionalità, ecc.) per quel giocatore. **Tab "Storia" (Fase 5):** bacheca trofei del giocatore (club + individuali), con click-through dal nome di ogni premio verso la sua pagina Albo d'Oro
4. **Tattiche** — campo con drag & drop, scelta modulo, **istruzioni personalizzate per ruolo** (non solo modulo fisso — es. terzino "spingi/resta basso", attaccante "gioca largo/centrale", pressing/possesso per fase di gioco)
5. **Spogliatoio dentro Rosa** — promesse fatte ai giocatori, giocatori scontenti e relativo motivo (con o senza "motivo valido", §4.5), rivalità/beef tra giocatori e gerarchia di spogliatoio — dettagliato nel [GDD](GDD.md)
6. **Club** — presidente-allenatore, storico piazzamenti, obiettivo di stagione, finanze essenziali (rimando alla schermata Finanze per il dettaglio), morale (squadra/tifosi), bacheca trofei di club. Posizionata sopra Centro Sviluppo e sotto Staff nella sidebar
7. **Calendario** — lista verticale delle sole partite della propria squadra
8. **Campionato** — classifica completa, risultati per giornata, classifiche individuali (capocannonieri, assist, difensori, media voto), notizie di lega
9. **Allenamento** — assegnazione focus, stato forma/infortuni (prima squadra + settore giovanile)
10. **Mercato** — ricerca giocatori (filtro a cascata posizione → ruolo, Fase 5), trattative in corso, rumor, svincolo di un proprio giocatore, pool giocatori svincolati, prestiti in entrata/uscita (Fase 6)
11. **Staff** — scout, staff medico, preparatore atletico, vice-allenatore: livelli, stipendi, assunzione/licenziamento
12. **Centro Sviluppo** *(nome provvisorio — valutare anche "Scuola Calcio")* — settore giovanile 11-18, elenco giovani, progressione verso potenziale, promozione in prima squadra quando pronti/maggiorenni o comunque idonei
13. **Sponsor** — offerte disponibili per slot (petto/maniche/kit), contratti attivi, obiettivi richiesti e relativo stato; include le tipologie speciali di offerente (Sindaco, aziende di facciata) — dettaglio in §4.12
14. **Stadio** — attributi stadio, proprietà (comunale/club), sponsor bordocampo, bar ristoro/store, gestione bus prima squadra e minibus giovanili — dettaglio in §4.14
15. **Finanze** — budget, grafici entrate/uscite (incluse entrate sponsor, bordocampo, bar ristoro)

Non in sidebar ma raggiungibile da altre schermate: **Partita (match view)**
— campo 2D a eventi, tabellino live.

---

## 6. Roadmap di sviluppo (fasi)

**Fase 1 — Fondamenta**
- Struttura dati (giocatore/squadra/città/lega)
- Generatore procedurale (1 lega piccola per iniziare, es. 8-10 squadre, poche città reali con profilo)
- Modalità "squadra esistente" (selezione tra squadre pre-generate)
- Storage: salvataggio/caricamento partita

**Fase 2 — Core loop**
- Schermata Rosa + profilo giocatore
- Motore simulazione partite (testuale) + risultati/classifica
- Avanzamento giorno per giorno (base)

**Fase 3 — Tattica e visual**
- Schermata Tattica (drag & drop)
- Match view 2D a eventi
- Badge squadra (v1, da colori) + avatar giocatori SVG proceduali
- Campo nome/abbreviazione editabile in creazione squadra

**Fase 4 — Mercato e CPU**
- Sistema trasferimenti utente
- Logica CPU (bisogni, offerte, trattative)
- Finestre di mercato

**Fase 5 — Notizie, Storia e Premi** *(sostituisce la precedente "Modalità Crea la tua squadra", spostata a caratteristica futura — vedi §9)*
- **Eccellenza a 18 squadre** (era 10; la Promozione resta a 10 — non fa ancora parte della piramide vera e propria, che arriva con le altre categorie in Fase 7)
- **Ambientazione geografica realistica**: comuni reali della zona Brescia/Franciacorta al posto delle grandi città nazionali generiche, profilo città scalato a centri piccoli/medi (popolazione, ricchezza, saturazione, tradizione, costo vita coerenti con la zona, non con una metropoli)
- **Generatore giocatori più realistico**: media rosa Eccellenza 25-39 (non più 57-59), varietà reale tra squadre e tra singoli giocatori, outlier fisico/mentale (negativi più frequenti dei positivi), tecnica esclusa dagli outlier — dettagli in §4.1. Impatto collaterale positivo: la correlazione forza→punti, quasi nulla nel motore v1 (lega omogenea), ora è realistica; contropartita accettata: il capocannoniere di lega resta sopra il target statistico del motore (una squadra oggettivamente più forte segna di più, anche a livello individuale) — vedi `docs/motore/07-milestones.md`
- Schermata dedicata **Notizie e Messaggi** (voce di navigazione come Club/Rosa, layout FM a due colonne, click-through bidirezionale dalla Dashboard) — vedi §5.11
- Resoconto post-partita nelle notizie: marcatori, cartellini, migliore in campo (nominato, non è un trofeo/premio formale)
- Sistema premi/riconoscimenti "TuttoCampo" (per campionato di competenza):
  - *Non ufficiali, non in bacheca:* Giocatore della Settimana (solo vincitore nella notizia), Squadra della Settimana
  - *Ufficiali di lega, non in bacheca:* Squadra del Mese (1 portiere, 4 difensori, 3 centrocampisti, 3 attaccanti)
  - *Ufficiali di lega e in bacheca trofei:* Giocatore del Mese, Giocatore del Mese U19, Giocatore dell'Anno U19, Giocatore dell'Anno, Squadra dell'Anno (11 titolari + 7 riserve: 1 portiere/2 difensori/2 centrocampisti/2 attaccanti), Capocannoniere
  - Premi mensili/annuali: la notizia mostra 1°-2°-3° classificato, solo il 1° riceve il trofeo
  - Ogni premio (tranne Squadra della Settimana) ha una pagina dedicata con albo d'oro, raggiungibile da barra di ricerca, click-through dal nome nella notizia, o dalla bacheca trofei del giocatore
- Bacheca trofei nel profilo giocatore (tab "Storia"): trofei di club e individuali
- Fix e rifiniture minori:
  - Ordine lista titolari nella schermata pre-partita (2D/risultato istantaneo/rivedi tattica): la lista CPU resta sempre ordinata correttamente, quella dell'utente cambia in base alle ultime modifiche — va uniformato
  - Ricerca giocatori: filtro ruolo a cascata, visibile solo dopo aver scelto la posizione (non un dropdown con tutti i 15 ruoli insieme)

### Priorità operative aggiornate al 10 settembre 2026

**Priorità concordata il 10/09/2026:** completare quasi tutte le funzionalità del gioco prima di riprendere il lavoro sul 2D. Sincronizzazione campo/cronaca, animazioni e qualità visiva restano problemi aperti ma posticipati. Anticipare soltanto correzioni indispensabili se un errore impedisce di proseguire la carriera. Non è prevista una v0.9.1 dedicata al replay.

La fondazione Fase 7/Fase 8 è completata dal 12/09/2026: rollover con calendario nuovo, promozioni/retrocessioni, archivio e reset statistiche; database mondiale JSON, scelta paesi, più livelli/gironi e validatore. Guida: [database-editor-guide.md](database-editor-guide.md).

1. **Continuità completa dei giocatori:** invecchiamento, crescita/calo, contratti e rinnovi, scadenze e svincolati, ritiri, nuovi giovani e rientro dai prestiti. Tutti gli effetti si applicano una sola volta al rollover e le rose devono restare utilizzabili.
2. **Anagrafiche mondiali e reputazione:** catalogo mondiale, collegamenti dei giocatori a nazionalità primaria/secondarie e pagine paese completati; restano eleggibilità per le rappresentative, reputazione nazionale/internazionale di club e giocatori e calibrazione della scala.
3. **Mercato completo:** paginazione, svincolati, prestiti base, rinnovi e gestione contrattuale.
4. **Staff completo:** personale iniziale sotto contratto per ogni club, stipendi, durata e clausole di licenziamento.
5. **Bilanciamento della gestione:** sponsor, stadio, allenamento, finanze, tifosi e spogliatoio su più stagioni.
6. **Spogliatoio avanzato:** rivalità, gruppi sociali, richieste e confronti.
7. **Simulazione leggera dei campionati lontani:** ridurre il costo delle leghe non seguite senza spezzare il mondo persistente.
8. **Coppe:** coppe nazionali a eliminazione diretta completate; restano tornei continentali, fasi a gironi e qualificazioni avanzate.
9. **Editor esterno visuale:** modifica del database mondiale sullo schema esistente.
10. **Rifinitura del 2D:** sincronizzazione campo/cronaca, movimenti, varietà e qualità visiva quando le funzionalità saranno quasi complete.

Il catalogo mondiale è ora composto da file JSON distinti per metadati, paesi, competizioni, collegamenti, club e giocatori. Un unico caricatore li consegna allo stesso validatore; i file di contenuto non dipendono dalla logica JavaScript e potranno essere letti e riscritti dall'editor esterno.

Vincolo implementato per la fase Mercato: un giocatore appena acquistato, ingaggiato da svincolato o rinnovato non può essere ceduto, messo sul mercato o rinnovato nuovamente per 180 giorni, con data persistente nel salvataggio. Un rinnovo può soltanto spostare in avanti la scadenza. La CPU rispetta gli stessi vincoli. Gli svincolati possono firmare durante tutto l'anno, anche fuori dalle finestre di trasferimento.

**Fase 6 — Profondità gestionale**
- Reputazione club e giocatori 1–300, mercato paginato, staff già assunto per ogni squadra e clausola di licenziamento — requisiti del 10/09/2026, §12, da implementare.
- Centro Sviluppo (settore giovanile 11-18) + promozione in prima squadra
- [x] **Sistema Sponsor base** con slot indipendenti, offerte normali/Comune, contratti e incassi. Restano obiettivi con premi/sanzioni e il motore narrativo delle aziende di facciata/mafia (§4.12).
- [x] **Stadio base**: proprietà, affluenza, botteghino, sponsor bordocampo, bar/store, bus e minibus con effetti economici (§4.14).
- [x] **Contatore Fan:** struttura dati collegata all'affluenza; crescita/calo dinamici ancora da bilanciare (§4.13).
- [x] **Armonia Settore base:** gerarchia, malcontento e promesse con effetti sul morale. Rivalità/eventi di confronto restano da sviluppare.
- [x] **Allenamento base:** focus/intensità e crescita di prima squadra/giovani, familiarità tattica e condizione; restano riepiloghi periodici e bilanciamento.
- Sistema notizie/eventi
- [x] Finanze base con movimenti, riepilogo per categoria e collegamenti a sponsor/stadio/stipendi/mercato; restano proiezioni e bilanciamento
- Editor attributi giocatori (toggle a inizio partita)
- Svincolo giocatori: dalla scheda Trasferimento, nessun costo per il club, il giocatore diventa svincolato immediatamente; pool di giocatori svincolati (free agent) disponibili sul mercato
- Prestiti (versione base): durata fissa 1 stagione, invio/ricezione giocatori in prestito da/verso altri club — nessuna gestione di stipendio condiviso o opzione riscatto (rimandata a caratteristica futura, §9)
- **Flusso di avvio completo** (schermata iniziale → Main Menu → selezione database → Nuova Carriera) — §4.15, non ancora implementato nel prototipo (che oggi entra direttamente nella creazione carriera)
- **Nuovo ordine di navigazione sidebar** — §5, non ancora applicato al prototipo

**Fase 7 — Scala**
- [x] Base per più paesi, leghe, livelli e gironi nello stesso livello
- [x] Promozione/retrocessione configurabile tra Eccellenza e Promozione
- [x] Rollover base: nuova stagione/calendario, archivio classifiche/statistiche e reset stagionale
- [x] Continuità biologica/contrattuale: età, crescita o calo legati al rendimento, rinnovi manuali e CPU, scadenze, svincolati, ritiri, nuovi giovani e provini
- [x] Coppe nazionali a eliminazione diretta configurabili nel database: partecipanti e ingressi per divisione, bye, gare secche o andata/ritorno, rigori, sorteggi, trofei e rollover
- [ ] Competizioni continentali e coppe con fase a gironi
- Bilanciamento generale
- Eventuali salvataggi multipli, difficoltà, ecc.

#### Regole approvate per la continuità dei giocatori — 13/09/2026

- I contratti professionistici della prima squadra dell'utente sono gestiti manualmente. A inizio stagione e a gennaio lo staff invia un riepilogo dei giocatori in scadenza con consiglio individuale: rinnovare, aspettare o lasciar partire.
- Le altre squadre applicano la stessa logica decisionale in modo automatico. Il vivaio dell'utente è delegato allo staff, ma un giovane molto ambizioso e dominante nel proprio livello può rifiutare la permanenza per cercare un club di reputazione superiore.
- U17 e fasce inferiori non hanno un contratto professionistico né stipendio. Le famiglie versano una quota di iscrizione, che rappresenta una piccola entrata soprattutto per i club minori. L'U19 può essere gestita tramite accordi giovanili/delegati fino alla promozione in prima squadra.
- Nelle trattative contano morale, rendimento, stipendio, ambizione, lealtà, legame con il club e situazione finanziaria. Un giocatore legato al club può accettare una riduzione o proporsi di ridurre lo stipendio per evitare la cessione. I comportamenti narrativi più articolati sono mostrati soprattutto nelle leghe maggiori.
- Crescita e declino non dipendono soltanto dall'età: minuti, rendimento e allenamento hanno un peso centrale. Una stagione straordinaria può mantenere o migliorare anche un giocatore di 35 anni.
- Un veterano che non è più adatto ai massimi campionati può scegliere di continuare in una lega minore invece di ritirarsi, se riceve un'opportunità coerente.
- A inizio stagione e dicembre lo staff ricorda quali giovani devono essere promossi, trattenuti o lasciati liberi.
- Ogni club riceve nuovi giovani e organizza due giornate di provini l'anno. I partecipanti appartengono a un bacino condiviso: possono sostenere provini per più squadre e rimandare la decisione su un'offerta in attesa di altri club. Il formato previsto è un torneo di quattro squadre di giocatori in prova.
- I giocatori scaduti diventano svincolati mantenendo la propria storia.
- I giocatori ritirati rimangono nell'archivio soltanto quando hanno rilevanza mondiale o sono figure importanti per un club. Circa il 90% degli ex giocatori entra nel bacino staff, soprattutto come allenatore U13/U17/U19 o scout.
- La categoria U21 del Centro Sviluppo è sostituita dalla **U19**. Una seconda squadra **U23** è un'entità distinta: l'opzione è visibile esclusivamente ai club della massima serie, richiede strutture giovanili almeno 85/100, almeno 20 milioni disponibili e un campionato nazionale di terzo o quarto livello. L'iscrizione costa 5 milioni ed entra in vigore dalla stagione successiva.
- La CPU rivede il piano di allenamento ogni due settimane, gestisce rinnovi e sostenibilità del monte ingaggi, promuove giovani e completa la rosa con svincolati quando necessario.
- Il rientro dai prestiti è compatibile con il rollover e sarà consegnato insieme alla successiva fase di mercato, perché nel prototipo non esistono ancora prestiti attivi.

#### Revisione interfaccia e vivaio — 13/09/2026

- Notizie e Messaggi segue immediatamente Dashboard nella navigazione; Club chiude l'elenco. La futura rappresentazione dell'ufficio userà un portatile per leggere messaggi e notizie e documenti sul tavolo per le decisioni urgenti.
- Il calendario personale usa una lista verticale.
- U13 e U17 non mostrano un overall numerico: il club li valuta con cinque stelle relative alla qualità della propria prima squadra. Le stelle gialle indicano l'abilità attuale; il contorno fino all'ultima stella raggiungibile indica il potenziale stimato.
- Gli U13 non possiedono valore di mercato e non possono essere ceduti. Un club può comunicare interesse alla famiglia; la decisione del giovane e della famiglia arriva soltanto a fine stagione e non produce un trasferimento economico.
- La pagina Contratti autonoma è rimossa. Ogni profilo giocatore contiene la propria scheda Contratto; riepiloghi e scadenze arrivano come messaggi dello staff.
- La tabella Rosa elimina Tec/Fis/Men e mostra la scadenza. Spogliatoio, già chiamato Armonia Settore, è una scheda autonoma dentro la pagina Rosa.
- Finanze usa indicatori riepilogativi e grafici per andamento mensile del saldo, flussi in entrata e uscita e distribuzione dei costi per categoria.
- L'acquisto dello stadio costa almeno 4 milioni e richiede almeno 80/100 nel rapporto col Sindaco.
- Notizie e Messaggi contiene due schede: Messaggi raccoglie comunicazioni interne del club; Notizie raccoglie campionato, Premi TuttoCampo e mercato. In futuro saranno aggiunte notizie estere.
- Sponsor futuri: ogni azienda può avere un logo; i contratti accettati alimentano una rappresentazione 3D configurabile della maglia.

**Fase 8 — Architettura dati a database editabile** *(avviata — vedi §10)*
- [x] Formato JSON mondiale versionato per paesi, competizioni, gerarchie, club e giocatori
- [x] Validatore da riga di comando e guida di modifica manuale
- [x] Scelta a inizio carriera dei paesi da materializzare; database fissato per quella carriera
- [ ] Importazione/selezione di file database senza ricostruire l'app
- [ ] Tool visuale esterno stile FM Editor, basato sullo stesso schema

---

## 7. Decisioni aperte da confermare insieme

- [x] **Nomi/loghi:** risolto — nome/abbreviazione inseriti manualmente dall'utente (campo di testo libero), placeholder neutri generati per le squadre non rinominate. Badge v1 generato dai colori, non stemma elaborato.
- [ ] Quante città/squadre "esistenti" pre-generate per iniziare (consiglio: partire con una manciata di città rappresentative — es. una grande metropoli, una media, una piccola — per testare bene le differenze di profilo, poi espandere)
- [x] **Categorie iniziali:** risolto — si parte con 2-3 categorie basse della piramide, per avere fin da subito promozione/retrocessione.
- [x] **Editor attributi (scope):** risolto — icona a pennello nel profilo giocatore, editabile solo per la tua squadra di default.
- [x] **Dettaglio tattico:** risolto — istruzioni personalizzate per ruolo (non solo modulo fisso), es. ampiezza, altezza della fase difensiva, libertà del singolo giocatore.
- [x] **Ritmo di gioco:** risolto — avanzamento "al prossimo evento importante" (matchday, conferenza stampa, mercato, eventi rosa, notizie rilevanti), non giorno-per-giorno secco. Vedi punto 4.7.
- [x] **Vincolo database per carriera:** risolto — un database mondiale scelto all'avvio; si selezionano i paesi da simulare e la scelta resta fissa per la carriera.
- [ ] **Merge/integrazione di più database:** come funzionerà l'integrazione/merge di più database (come in Football Manager, dove si possono combinare più "ricerche" dati)? Dettaglio in §10.
- [ ] **Database e multiplayer:** come si concilia il sistema a database editabile con un eventuale multiplayer futuro (mondo condiviso vs. database personali)? Dettaglio in §10.

---

## 8. Ordine di costruzione consigliato (primi passi su Claude Code)

Prima di partire con leghe/generatori (Fase 1 della roadmap), conviene costruire lo "scheletro" di navigazione in questo ordine, perché ogni pezzo definisce i dati che il successivo userà:

1. **Main Menu** — nuova carriera / continua partita / impostazioni (incluso il toggle "editor attributi attivo o no")
2. **Selezione squadra esistente** — è qui che si genera lo stato iniziale della partita (il wizard "Crea la tua squadra" è rimandato a caratteristica futura, vedi §9)
3. **Dashboard/Home** — primo punto d'atterraggio dopo la creazione, hub di navigazione verso tutte le altre schermate
4. **Rosa + profilo giocatore** (con icona editor a pennello, se attivo) — è il cuore dei dati: tattica, mercato e allenamento dipendono tutti dalla rosa
5. Da qui in poi, le altre schermate (Tattica, Mercato, Sponsor, Centro Sviluppo, Finanze, Match view) sono ragionevolmente indipendenti tra loro e possono essere costruite in qualsiasi ordine

Questo ordine garantisce che, arrivati al punto 4, si abbia già una base dati solida (stato di gioco + squadra + rosa) su cui appoggiare tutto il resto senza dover tornare indietro a ristrutturare.

---

## 9. Caratteristiche future (backlog, non pianificate)

Elementi discussi ma esplicitamente **fuori dallo scope corrente** — non vanno implementati finché non si decide di riprenderli in una fase dedicata:

- **Modalità "Crea la tua squadra"** (mappa Italia, wizard città/nome/colori/stemma) — rimossa dalla Fase 5, contenuto conservato in §4.11
- **Allenatore del Mese**, **Allenatore dell'Anno** — riconoscimenti ufficiali di lega per il presidente-allenatore, non per i giocatori
- **FIFA XI** — squadra dell'anno globale (cross-lega/cross-piramide), distinta dalla Squadra dell'Anno di singola lega (Fase 5)
- **Pallone d'Oro** — massimo riconoscimento individuale globale, distinto dal Giocatore dell'Anno di singola lega (Fase 5)
- **Bacheca trofei "personali"** nella sezione Club — per ospitare i premi da allenatore (Allenatore del Mese/Anno) una volta introdotti, distinta dalla bacheca trofei del giocatore in §5.2
- **Dettagli economici avanzati dei prestiti** — stipendio condiviso tra club, opzione di riscatto a fine prestito (la versione base in Fase 6 copre solo durata fissa 1 stagione, nessun dettaglio economico)

---

## 10. Architettura dati — verso un sistema a database editabile

**Stato attuale:** il catalogo è composto dai JSON versionati in
`src/game/database/`, separati per metadati, paesi, competizioni,
collegamenti, club e giocatori. Il generatore materializza solo i paesi
selezionati e completa proceduralmente gli slot senza club o giocatori
manuali. Il salvataggio registra identità e versione del database.
Formato, validatore ed esempi sono descritti in
[database-editor-guide.md](database-editor-guide.md).

**Obiettivo finale:** un sistema a **database editabile esternamente**, in
stile "FM Editor" (l'editor dati di Football Manager): un tool dedicato,
separato dal gioco stesso, con cui modificare nomi squadre, abbreviazioni,
colori, rose, e rigenerare/esportare un mondo di gioco a partire da quei
dati. Il flusso d'avvio già anticipa questo futuro (§4.15): "Nuova Carriera"
sceglie un database da una cartella dedicata, non genera un mondo senza
scelta.

L'editor visuale resta un'applicazione separata futura, ma non deve inventare
un secondo formato: leggerà e scriverà lo stesso JSON. La prima versione usa
modifica manuale + `npm run database:validate`; restano da costruire il
selettore di file esterni e l'interfaccia grafica.

**Decisioni e domande residue:**

1. **Vincolo database per carriera — deciso.** Un database mondiale per
   carriera; i paesi da simulare si scelgono prima di iniziare e non si
   aggiungono a partita in corso.
2. **Merge/integrazione di più database.** Se in futuro esistono più
   database (es. uno per la Lombardia, uno per il Lazio, uno creato da un
   utente terzo), come si combinano? Serve un formato con id stabili e
   risoluzione dei conflitti (stesso nome squadra in due database diversi,
   ecc.), o database sempre mutuamente esclusivi?
3. **Database e multiplayer.** Se in futuro arriva un multiplayer (anche solo
   "hotseat" o import/export di salvataggi tra amici), un mondo condiviso
   richiede che tutti i partecipanti abbiano lo stesso database — come si
   concilia questo con l'idea di database personalizzabili/editabili
   liberamente da ciascun utente? Serve una nozione di "database
   certificato/hash" per garantire che due giocatori stiano davvero giocando
   lo stesso mondo?

Queste domande non bloccano il lavoro sul prototipo attuale — sono qui perché
le scelte di oggi su come sono strutturati i dati di gioco condizionano
quanto sarà costoso rispondere a queste domande più avanti.

---

## 11. Direzione artistica

Riferimento di palette per l'identità visiva definitiva del gioco: lo stile
grafico di **WWE SummerSlam 2007-2009** — **azzurro elettrico** abbinato a un
**verde acceso/sinuoso**. Da tenere come riferimento quando si lavorerà sulla
direzione artistica vera e propria (loghi, UI del prodotto finale, materiale
promozionale).

**Non si applica al prototipo HTML/JS attuale**, che resta puramente
funzionale/temporaneo (vedi §2.1) — la sua palette CSS corrente non è un
segnale di direzione artistica, solo una scelta pragmatica per lavorare
comodamente sul prototipo. La palette definitiva verrà applicata in sede di
sviluppo del prodotto finale (Godot/Unity).


## 12. Requisiti aggiuntivi — 10 settembre 2026

**Stato:** i campi reputazione 1–300 sono accettati dal database e generati per i giocatori, ma visualizzazione ed effetto sul mercato restano pianificati. Paginazione e contratti dello staff non sono ancora implementati. Le reputazioni e i riferimenti sotto sono scelte di design dell'utente, non valutazioni ufficiali dei club o dei calciatori reali.

### 12.1 Partita 2D: miglioramento e sincronizzazione ancora aperti

**Priorità concordata il 10/09/2026:** completare quasi tutte le funzionalità del gioco prima di riprendere il lavoro sul 2D. Sincronizzazione campo/cronaca, animazioni e qualità visiva restano problemi aperti ma posticipati. Anticipare soltanto correzioni indispensabili se un errore impedisce di proseguire la carriera. Non è prevista una v0.9.1 dedicata al replay.

Dopo la revisione di settembre il campo non sincronizza ancora perfettamente con ciò che viene scritto nella cronaca laterale, secondo la nuova prova dell'utente. L'introduzione di un orologio unico e il superamento dei test non bastano a considerare il problema risolto.

- [ ] Riprodurre e individuare gli scostamenti tra animazione, cronaca e punteggio durante una partita reale.
- [ ] Mostrare passaggi, tiri e conclusioni nello stesso momento in cui compaiono i rispettivi eventi testuali, comprese pause, ripresa, recupero e cambi di velocità.
- [ ] Migliorare continuità e leggibilità della vista 2D; le traiettorie attuali restano stilizzate.
- [ ] Chiudere il problema solo dopo una verifica visiva, oltre ai test automatici. Dettaglio tecnico in [milestone del motore](motore/07-milestones.md).

### 12.2 Reputazione dei club

Ogni club, utente o CPU, deve avere una reputazione intera da **1 a 300**, che rappresenta la sua importanza/prestigio. Riferimenti: **Real Madrid = 300; Parma = 200**.

Una reputazione più alta deve aumentare le possibilità di acquistare giocatori, influenzando la loro disponibilità a trasferirsi. Non garantisce automaticamente l'acquisto: disponibilità economica, contratto e accordo con il venditore continuano a contare. La formula e i pesi rispetto alla reputazione del giocatore sono da definire e bilanciare; gli esempi non implicano una formula lineare già approvata.

Il prototipo contiene già il campo reputazione del club con una scala diversa. L'implementazione dovrà adeguare generatore, usi attuali del valore e salvataggi preesistenti, evitando di reinterpretare silenziosamente i vecchi numeri. Mostrare il valore nella scheda club e prevederlo nel futuro database/editor.

### 12.3 Reputazione dei giocatori

Ogni giocatore deve avere una reputazione intera da **1 a 300**, distinta da overall, attributi e potenziale: esprime prestigio/notorietà. Riferimenti: **Messi = 300; Cristiano Ronaldo = 300; Domenico Berardi = 200**.

Mostrare il valore nel profilo e prevederlo nel futuro database/editor. Assegnazione iniziale, conversione dei salvataggi che ne sono privi ed eventuale evoluzione nel tempo sono da definire. Il rapporto tra reputazione del club e reputazione del giocatore va considerato nella progettazione dell'attrattiva di mercato (§12.2), senza introdurre soglie automatiche non ancora bilanciate.

### 12.4 Mercato: accesso a tutti i risultati

La sezione Mercato deve avere **Pagina successiva** e **Pagina precedente**, con indicazione della pagina corrente e del totale dei risultati. Tutti i giocatori corrispondenti ai filtri devono essere raggiungibili, senza un taglio fisso della lista.

Filtri e ordinamento si applicano all'intero insieme prima della paginazione e restano coerenti cambiando pagina. Quando i filtri cambiano, tornare alla prima pagina; disabilitare i pulsanti ai limiti della lista e gestire esplicitamente zero risultati. Numero di giocatori per pagina da scegliere in implementazione.

### 12.5 Staff iniziale e clausola di licenziamento

**Ogni squadra, inclusa quella dell'utente e tutte le CPU, inizia già con lo staff assunto** nei quattro ruoli esistenti: scout, staff medico, preparatore atletico e vice-allenatore. Non sono posti vacanti da riempire al primo avvio. Il monte stipendi iniziale deve includere i loro stipendi.

Ogni membro ha un contratto con una **clausola economica di licenziamento**. Mostrare il costo prima dell'azione e addebitarlo una sola volta alla risoluzione, aggiornando budget e monte stipendi. La sostituzione diretta con un altro candidato non deve aggirare la clausola del membro uscente.

Importo/calcolo della clausola, durata contrattuale, livelli iniziali e gestione dei fondi insufficienti restano da definire. Considerare anche le carriere esistenti, che oggi possono avere ruoli vuoti: la compatibilità va gestita esplicitamente, senza inventare costi retroattivi.
