# 04 — Ruoli

Il ruolo è **l'interpretazione di una posizione**: due mediani (CDM) possono
essere una Diga che distrugge o un Regista Basso che costruisce. Il ruolo non è
un moltiplicatore: cambia le posizioni di dovere, i movimenti, le priorità
decisionali, l'intensità di pressing — cioè il comportamento dell'AI del
giocatore in ogni modulo del motore.

## 1. Schema di configurazione (un file per ruolo)

```js
{
  id: 'regista_basso',
  nome: 'Regista Basso',
  posizioni: ['CDM'],              // dove è assegnabile
  descrizione: '…',
  obiettivo: '…',

  comportamento: {                 // 0-100, letti dai motori (vedi §4)
    costruzione: 95,               // partecipazione alla costruzione
    finalizzazione: 10,            // partecipazione alla finalizzazione
    pressing: 40,                  // intensità del pressing individuale
    libertaCreativa: 85,           // aderenza al copione vs invenzione
    rischioGiocate: 60,            // propensione alla giocata rischiosa
    transizioneOffensiva: 80,      // coinvolgimento a palla conquistata
    transizioneDifensiva: 45,      // corsa all'indietro a palla persa
    ampiezza: 20,                  // tendenza ad allargarsi
    profondita: 10,                // tendenza ad attaccare lo spazio
  },

  movimenti: ['abbassarsi_tra_i_centrali', 'scarico_a_rombo', …],
                                   // vocabolario chiuso definito in config/azioni.js
  zone: {                          // zone di influenza sulla griglia 5×6
    possesso:    ['Z_C2','Z_C3','Z_CS3','Z_CD3'],
    nonPossesso: ['Z_C2','Z_C3'],
  },

  prioritaDecisionali: {           // moltiplicatori dell'utilità (cap. 02 §6)
    passaggioCorto: 1.2, filtrante: 1.3, lancio: 1.1, cambioGioco: 1.4,
    dribbling: 0.6, conduzione: 0.9, cross: 0.4, tiro: 0.5, scarico: 1.0,
  },

  suitability: {                   // §3 — pesi 3 / 1.5 / 0.5
    primari:   ['passaggio', 'visione', 'decisioni'],
    secondari: ['controllo', 'freddezza', 'anticipazione'],
    terziari:  ['calciPiazzati', 'resistenza'],
  },

  sinergie: {                      // consumate dal SynergyEngine (cap. 06)
    richiede: ['copertura_alle_spalle'],
    premia:   ['mezzali_che_attaccano', 'ampiezza_dai_terzini'],
    soffre:   ['pressing_avversario_sul_vertice'],
  },
}
```

## 2. Assegnazione in squadra

- Ogni slot della griglia tattica riceve **posizione + ruolo** (oggi solo la
  posizione). La UI della Tattica propone i ruoli disponibili per quello slot
  con la suitability calcolata di ogni giocatore.
- Le squadre CPU scelgono i ruoli automaticamente: massimizzano la suitability
  complessiva vincolata alla coerenza con la loro identità tattica (cap. 05) e
  ai requisiti di sinergia (cap. 06).
- L'istanza `giocatore.ruoli` esistente (posizioni naturali/forti/non giocabili)
  **resta** e continua a governare la penalità di posizione; la suitability di
  ruolo si moltiplica a valle (vedi §3.3).

## 3. Suitability — completamente calcolata

### 3.1 Formula

```
S(g, ruolo) = 100 × Σᵢ pesoᵢ × attributoᵢ(g) / (100 × Σᵢ pesoᵢ)

pesi: primari = 3 · secondari = 1.5 · terziari = 0.5
```

Nessun valore assegnato a mano: cambiano gli attributi → cambia la suitability.
Gli attributi primari incidono 6 volte più dei terziari.

### 3.2 Bande qualitative (mostrate in UI)

| Punteggio | Giudizio |
| --- | --- |
| ≥ 85 | **Su misura** |
| 72–84 | **Adatto** |
| 60–71 | **Discreto** |
| 45–59 | **Adattato** |
| < 45 | **Inadatto** |

### 3.3 Efficacia in partita

```
efficacia = S(g, ruolo) → curva dolce (0.78 + 0.22 × S/100)
          × affinitaPosizione(g, posizione slot)      // sistema esistente: 1 / 0.92 / 0.82 / 0.6 / 0.3
          × familiaritaRuolo                          // futuro (allenamento Fase 5), default 1
```

La penalità di ruolo è volutamente più dolce di quella di posizione: un CM
schierato Regista Centrale con suitability 60 gioca "spento", non incapace;
un CM schierato terzino resta un pesce fuor d'acqua. La `familiaritaRuolo` è
il punto di innesto dell'allenamento ruoli previsto in Fase 5.

## 4. Come i parametri guidano i motori

| Parametro | Motori che lo leggono |
| --- | --- |
| `costruzione` | PositioningEngine (quanto viene incontro), PerceptionEngine avversario (chi cercare in uscita) |
| `finalizzazione` | MovementEngine (presenza in area), DecisionEngine (utilità del tiro/dell'ultimo passaggio ricevuto) |
| `pressing` | PressingEngine (chi scatta sui trigger), FatigueEngine (consumo) |
| `libertaCreativa` | DecisionEngine: quanto le priorità del ruolo *stringono* la scelta (bassa = copione, alta = licenza) |
| `rischioGiocate` | DecisionEngine: peso del fattore rischio nell'utilità |
| `transizioneOffensiva/Difensiva` | PossessionEngine e MovementEngine nelle transizioni |
| `ampiezza`, `profondita` | PositioningEngine/MovementEngine: direzione degli scostamenti |
| `movimenti` | MovementEngine: repertorio attivabile per fase |
| `zone` | PositioningEngine (dovere), SynergyEngine (occupazione spazi) |
| `prioritaDecisionali` | DecisionEngine: moltiplicatori dell'utilità per tipo d'azione |

---

## 5. Catalogo dei ruoli (35)

Formato di ogni scheda: descrizione e obiettivo · comportamento nelle due fasi ·
movimenti e zone · **parametri** (costruzione C, finalizzazione F, pressing P,
creatività L, rischio R, transizione offensiva TO, transizione difensiva TD) ·
priorità decisionali · attributi di suitability (primari / secondari / terziari)
· punti di forza e limiti. I valori numerici qui riportati sono la baseline di
configurazione, soggetta a calibrazione (cap. 07).

### PORTIERE (POR)

#### Portiere Classico `portiere_classico`
- **Descrizione/obiettivo:** custode della porta; minimizzare i gol subiti, zero rischi col pallone.
- **In possesso:** si smarca poco, gioca semplice o lungo appena pressato.
- **Senza palla:** resta tra i pali, esce solo su palle nettamente sue.
- **Movimenti:** piazzamento conservativo, presidio del primo palo.
- **Zone:** `Z_C1` (possesso e non).
- **Parametri:** C 15 · F 0 · P 0 · L 10 · R 10 · TO 30 · TD 100.
- **Priorità:** spazzata/lancio ↑↑, passaggio corto ↓.
- **Suitability:** primari riflessi, presa, posizionamentoPortiere / secondari uscite, freddezza, concentrazione / terziari salto, agilita.
- **Forza/limiti:** sicurezza sulle conclusioni; squadra più bassa, costruzione dal basso preclusa.

#### Portiere Moderno `portiere_moderno`
- **Descrizione/obiettivo:** primo costruttore e "libero aggiunto" dietro la linea alta.
- **In possesso:** si propone come appoggio, apre il gioco, rompe il pressing col palleggio.
- **Senza palla:** parte alto, copre la profondità alle spalle della difesa, esce anche fuori area.
- **Movimenti:** ricezione da terzo centrale, uscita anticipata sui filtranti.
- **Zone:** possesso `Z_C1-C2`; non possesso `Z_C1` + copertura fascia 2.
- **Parametri:** C 70 · F 0 · P 10 · L 55 · R 55 · TO 65 · TD 100.
- **Priorità:** passaggio corto ↑↑, cambio gioco ↑, spazzata ↓.
- **Suitability:** primari giocoPiedi, uscite, decisioni / secondari giroPalla, velocita, anticipazione / terziari riflessi, freddezza.
- **Forza/limiti:** +1 in costruzione, neutralizza la palla alle spalle; l'errore col pallone o nell'uscita è gol quasi certo (rischio reale simulato, cap. 02 §8).

### DIFENSORE CENTRALE (DC)

#### Marcatore `dc_marcatore`
- **Descrizione/obiettivo:** aggredisce la punta, vince i duelli individuali; annullare il riferimento offensivo avversario.
- **In possesso:** appoggi semplici, nessuna avventura.
- **Senza palla:** esce forte sull'attaccante che riceve, segue l'uomo anche fuori zona, attacca ogni palla aerea.
- **Movimenti:** uscita in anticipo, marcatura opprimente in area.
- **Zone:** fasce 1-2, corsia del proprio centro-sinistra/destra.
- **Parametri:** C 20 · F 10 (corner) · P 55 · L 10 · R 20 · TO 20 · TD 90.
- **Priorità:** spazzata ↑, anticipo ↑↑, passaggio corto =.
- **Suitability:** primari marcatura, contrasto, forza / secondari aggressivita, colpoDiTesta, anticipazione / terziari salto, concentrazione.
- **Forza/limiti:** cancella la Torre e il Bomber; l'uscita a vuoto lascia il buco — soffre punte mobili e Falsi Nove che lo portano a spasso.

#### Copertura `dc_copertura`
- **Descrizione/obiettivo:** legge, scala, protegge la profondità; essere sempre dove la palla arriverà.
- **In possesso:** primo appoggio d'ordine, fa girare il giro palla.
- **Senza palla:** non esce quasi mai: copre le spalle del compagno aggressivo, guida la linea del fuorigioco.
- **Movimenti:** scalata diagonale, ripiegamento a protezione della porta.
- **Zone:** fasce 1-2, ampiezza di tutta la linea in copertura.
- **Parametri:** C 35 · F 5 · P 25 · L 15 · R 15 · TO 25 · TD 95.
- **Priorità:** intercetto ↑↑, temporeggiare ↑, contrasto = (solo a colpo sicuro).
- **Suitability:** primari posizionamento, anticipazione, concentrazione / secondari velocita, marcatura, decisioni / terziari passaggio, freddezza.
- **Forza/limiti:** assicurazione contro profondità e contropiedi; nei duelli fisici puri rende meno di un Marcatore.

#### Costruttore `dc_costruttore`
- **Descrizione/obiettivo:** primo regista della squadra; far uscire il pallone pulito rompendo la prima linea di pressing.
- **In possesso:** conduce palla al piede fino a metà campo se non pressato, cerca il filtrante tra le linee e il cambio gioco.
- **Senza palla:** difende in zona, preferisce l'intercetto al contrasto.
- **Movimenti:** conduzione ad attirare il pressing, apertura sull'esterno.
- **Zone:** possesso fasce 1-3; non possesso fasce 1-2.
- **Parametri:** C 85 · F 5 · P 25 · L 60 · R 55 · TO 60 · TD 80.
- **Priorità:** filtrante ↑↑, cambio gioco ↑, conduzione ↑, spazzata ↓↓.
- **Suitability:** primari passaggio, controllo, visione / secondari decisioni, freddezza, posizionamento / terziari dribbling, marcatura.
- **Forza/limiti:** supera il pressing e alimenta i registi; la palla persa in uscita è un'occasione regalata — soffre le Punte Pressanti.

### TERZINO (TS / TD — schede speculari)

#### Terzino Bloccato `terzino_bloccato`
- **Descrizione/obiettivo:** quarto difensore puro; chiudere la propria corsia, zero concessioni alle spalle.
- **In possesso:** appoggio corto, non supera quasi mai la metà campo.
- **Senza palla:** stringe a formare la linea a 4, raddoppia sull'ala avversaria.
- **Movimenti:** raddoppio sull'esterno, chiusura sul secondo palo.
- **Zone:** corsia esterna, fasce 1-3.
- **Parametri:** C 25 · F 5 · P 40 · L 10 · R 15 · TO 20 · TD 95.
- **Priorità:** contrasto ↑, spazzata ↑, cross ↓↓.
- **Suitability:** primari marcatura, posizionamento, contrasto / secondari concentrazione, velocita, forza / terziari anticipazione, lavoroSquadra.
- **Forza/limiti:** blinda il lato debole (perfetto dietro un'Ala Invertita che non rientra); non dà ampiezza — la sinergia segnala il buco se nessun altro la offre.

#### Terzino di Spinta `terzino_spinta`
- **Descrizione/obiettivo:** ampiezza e sovrapposizioni; essere l'uomo in più sulla corsia.
- **In possesso:** sale ad ogni possesso consolidato, si sovrappone all'ala, crossa dal fondo.
- **Senza palla:** rientra nella linea, ma il ritardo dopo la spinta è simulato (transizione).
- **Movimenti:** sovrapposizione esterna, cross dalla linea di fondo.
- **Zone:** tutta la corsia, fasce 1-5.
- **Parametri:** C 45 · F 25 · P 45 · L 35 · R 45 · TO 65 · TD 60.
- **Priorità:** cross ↑↑, conduzione ↑, sovrapposizione ↑↑.
- **Suitability:** primari velocita, resistenza, cross / secondari impegno, dribbling, movimentoSenzaPalla / terziari marcatura, contrasto.
- **Forza/limiti:** superiorità numerica costante sulla fascia; lo spazio che lascia è il bersaglio preferito del Contropiede avversario.

#### Terzino Invertito `terzino_invertito`
- **Descrizione/obiettivo:** in possesso entra *dentro* il campo a fare il mediano aggiunto; dare superiorità in mezzo, non sulla fascia.
- **In possesso:** stringe accanto al vertice basso, palleggia, lascia la corsia all'ala.
- **Senza palla:** torna terzino classico nella linea a 4.
- **Movimenti:** taglio interno in costruzione, posizione da doppio mediano.
- **Zone:** possesso corsie interne fasce 2-4; non possesso corsia esterna fasce 1-2.
- **Parametri:** C 75 · F 10 · P 45 · L 50 · R 40 · TO 55 · TD 75.
- **Priorità:** passaggio corto ↑↑, filtrante ↑, cross ↓.
- **Suitability:** primari passaggio, controllo, decisioni / secondari posizionamento, visione, anticipazione / terziari contrasto, resistenza.
- **Forza/limiti:** dominio del centrocampo nel Possesso/Tiki-Taka; richiede un'ala che tenga l'ampiezza, altrimenti la corsia muore (sinergia).

### ESTERNO A TUTTA FASCIA (LWB / RWB — schede speculari)

#### Quinto Difensivo `quinto_difensivo`
- **Descrizione/obiettivo:** quinto di una difesa a 5 orientato a proteggere; corsia presidiata prima che attaccata.
- **In possesso:** appoggio e ripartenza semplice, sale solo a difesa schierata avversaria.
- **Senza palla:** si abbassa a formare la linea a 5.
- **Parametri:** C 30 · F 10 · P 45 · L 15 · R 20 · TO 35 · TD 90.
- **Movimenti/zone:** scivolamento in linea, corsia fasce 1-4.
- **Priorità:** contrasto ↑, appoggio ↑, cross =.
- **Suitability:** primari posizionamento, resistenza, marcatura / secondari velocita, impegno, contrasto / terziari cross, concentrazione.
- **Forza/limiti:** solidità nel Catenaccio/Blocco Basso; produce poco davanti.

#### Tuttafascia `tuttafascia`
- **Descrizione/obiettivo:** padrone dell'intera corsia per 90 minuti, unico responsabile dell'ampiezza del suo lato.
- **In possesso:** ampiezza costante, riceve e punta, cross o scarico.
- **Senza palla:** rientra a 5, poi riparte: il motore del su-e-giù.
- **Parametri:** C 50 · F 25 · P 55 · L 35 · R 40 · TO 80 · TD 75.
- **Movimenti/zone:** corsa a tutta corsia, fasce 1-5.
- **Priorità:** conduzione ↑↑, cross ↑↑, uno-due ↑.
- **Suitability:** primari resistenza, velocita, impegno / secondari cross, dribbling, accelerazione / terziari marcatura, movimentoSenzaPalla.
- **Forza/limiti:** copre due ruoli in uno nel 3-5-2; il consumo di energia è il più alto del catalogo — cala chi non ha benzina (FatigueEngine).

#### Quinto d'Assalto `quinto_assalto`
- **Descrizione/obiettivo:** ala travestita da quinto; segnare e far segnare partendo da dietro.
- **In possesso:** altissimo, attacca l'area sul cross opposto, gioca da ala pura.
- **Senza palla:** rientra tardi e controvoglia (TD basso: il costo è reale).
- **Parametri:** C 40 · F 55 · P 50 · L 55 · R 55 · TO 90 · TD 45.
- **Movimenti/zone:** taglio sul secondo palo, corsia fasce 2-6.
- **Priorità:** cross ↑↑, dribbling ↑, tiro ↑, inserimento ↑↑.
- **Suitability:** primari velocita, cross, movimentoSenzaPalla / secondari dribbling, accelerazione, tiro / terziari resistenza, marcatura.
- **Forza/limiti:** devastante nel Calcio Totale con tre dietro solidi; dietro di lui serve un Copertura, o la corsia è un'autostrada.

### MEDIANO (CDM)

#### Diga `diga`
- **Descrizione/obiettivo:** frangiflutti davanti alla difesa; spezzare ogni azione centrale avversaria.
- **In possesso:** due tocchi, palla al regista più vicino, mai un rischio.
- **Senza palla:** schermo fisso sulla trequarti avversaria di riferimento (il 10 nemico), raddoppi, coperture sulle uscite dei centrali.
- **Movimenti:** posizione-schermo tra palla e porta, scivolamenti orizzontali.
- **Zone:** `Z_C2-C3` e corsie interne, fasce 2-3.
- **Parametri:** C 30 · F 5 · P 60 · L 5 · R 10 · TO 25 · TD 95.
- **Priorità:** intercetto ↑↑, contrasto ↑↑, scarico ↑, filtrante ↓.
- **Suitability:** primari contrasto, posizionamento, anticipazione / secondari forza, aggressivita, lavoroSquadra / terziari passaggio, concentrazione.
- **Forza/limiti:** spegne Trequartisti e Incursori; in costruzione è un uomo in meno — con due Dighe il palleggio muore (la sinergia lo segnala).

#### Regista Basso `regista_basso`
- **Descrizione/obiettivo:** il metronomo davanti alla difesa; dettare tempi e geometrie di tutta la squadra.
- **In possesso:** si abbassa tra i centrali per ricevere, smista corto, filtra tra le linee e apre col cambio gioco.
- **Senza palla:** schermo posizionale (legge, non aggredisce).
- **Movimenti:** abbassamento a rombo coi centrali, smarcamento orizzontale continuo.
- **Zone:** possesso fasce 2-4 corsie centrali; non possesso fasce 2-3.
- **Parametri:** C 95 · F 10 · P 40 · L 85 · R 60 · TO 80 · TD 45.
- **Priorità:** cambio gioco ↑↑, filtrante ↑↑, passaggio corto ↑, tiro ↓, dribbling ↓.
- **Suitability:** primari passaggio, visione, decisioni / secondari controllo, freddezza, anticipazione / terziari calciPiazzati, resistenza.
- **Forza/limiti:** trasforma il possesso sterile in pericolo; bersaglio numero uno del Gegenpressing — con pressing addosso e freddezza bassa diventa un passivo.

#### Volante d'Inserimento `volante`
- **Descrizione/obiettivo:** mediano che parte da dietro e arriva davanti; sorprendere con inserimenti da lontano.
- **In possesso:** primo scarico da mediano, poi corsa ad attaccare l'area quando la palla è sull'esterno.
- **Senza palla:** mediano vero, contrasti e chilometri.
- **Movimenti:** inserimento a rimorchio, tiro dal limite.
- **Zone:** fasce 2-5, corsie centrali.
- **Parametri:** C 55 · F 55 · P 60 · L 40 · R 45 · TO 75 · TD 70.
- **Priorità:** inserimento ↑↑, tiro da fuori ↑, contrasto ↑.
- **Suitability:** primari resistenza, movimentoSenzaPalla, impegno / secondari tiro, contrasto, accelerazione / terziari passaggio, forza.
- **Forza/limiti:** gol dal nulla di un uomo non marcato; se si inserisce a vuoto la mediana resta scoperta (rischio simulato in transizione).

### CENTROCAMPISTA CENTRALE (CM)

#### Mezzala di Equilibrio `mezzala_equilibrio`
- **Descrizione/obiettivo:** l'uomo che sta *sempre* nel posto giusto; garantire equilibrio e transizioni coperte, sacrificandosi per il sistema.
- **In possesso:** appoggio sicuro, terzo uomo nei triangoli, mai oltre palla.
- **Senza palla:** copre la fascia dietro il terzino salito, scala su tutto.
- **Parametri:** C 55 · F 15 · P 55 · L 20 · R 20 · TO 45 · TD 90.
- **Movimenti/zone:** scivolamento verso l'esterno di copertura, fasce 2-4.
- **Priorità:** scarico ↑, passaggio corto ↑, copertura ↑↑.
- **Suitability:** primari lavoroSquadra, posizionamento, impegno / secondari resistenza, anticipazione, passaggio / terziari contrasto, decisioni.
- **Forza/limiti:** libera i compagni offensivi dai compiti sporchi; non vince le partite da solo, e in una squadra già coperta è sprecato.

#### Centrocampista Totale `box_to_box`
- **Descrizione/obiettivo:** da area ad area; esserci in entrambe le fasi, ovunque serva.
- **In possesso:** riceve, conduce, si inserisce, conclude.
- **Senza palla:** rientra fino in area propria, contrasta, riparte.
- **Parametri:** C 60 · F 55 · P 65 · L 45 · R 45 · TO 80 · TD 80.
- **Movimenti/zone:** inserimento centrale, recupero-ripartenza; fasce 1-5.
- **Priorità:** conduzione ↑, inserimento ↑, contrasto ↑, tiro =.
- **Suitability:** primari resistenza, impegno, movimentoSenzaPalla / secondari contrasto, controllo, tiro / terziari velocita, passaggio, decisioni.
- **Forza/limiti:** due giocatori al prezzo di uno se ha benzina infinita; con resistenza mediocre è un fantasma dal 60' in poi.

#### Regista Centrale `regista_centrale`
- **Descrizione/obiettivo:** il metronomo a mezza altezza (quando non c'è un vertice basso dedicato); cucire costruzione e rifinitura.
- **In possesso:** riceve tra le linee basse, orchestra, verticalizza al momento giusto.
- **Senza palla:** pressing posizionale, chiude le linee centrali.
- **Parametri:** C 90 · F 20 · P 45 · L 80 · R 55 · TO 70 · TD 55.
- **Movimenti/zone:** smarcamento a ricevere sul mezzo spazio; fasce 3-4.
- **Priorità:** filtrante ↑↑, passaggio corto ↑, cambio gioco ↑.
- **Suitability:** primari passaggio, visione, controllo / secondari decisioni, freddezza, movimentoSenzaPalla / terziari resistenza, anticipazione.
- **Forza/limiti:** geometrie più vicine alla porta rispetto al Regista Basso; meno protetto: gli serve una Diga o una Mezzala di Equilibrio accanto.

#### Mezzala d'Assalto `mezzala_assalto`
- **Descrizione/obiettivo:** l'ottavo che gioca da dieci; invadere il mezzo spazio e l'area come un trequartista aggiunto.
- **In possesso:** riceve nel mezzo spazio, combina, si inserisce oltre le punte.
- **Senza palla:** pressa in avanti; il rientro non è il suo forte.
- **Parametri:** C 55 · F 65 · P 55 · L 65 · R 60 · TO 80 · TD 50.
- **Movimenti/zone:** taglio nel mezzo spazio, inserimento senza palla; fasce 3-6, corsia interna.
- **Priorità:** inserimento ↑↑, uno-due ↑, tiro ↑, filtrante ↑.
- **Suitability:** primari movimentoSenzaPalla, controllo, accelerazione / secondari tiro, dribbling, visione / terziari resistenza, freddezza.
- **Forza/limiti:** imprevedibilità da zone cieche per le difese; sbilancia la mediana — serve equilibrio alle sue spalle (sinergia).

### TREQUARTISTA (CAM)

#### Trequartista Classico `trequartista`
- **Descrizione/obiettivo:** il dieci; l'ultimo passaggio è suo. Vive tra le linee e rifiuta la banalità.
- **In possesso:** riceve tra le linee spalle o fronte alla porta, rifinisce, inventa.
- **Senza palla:** pressing blando di posizione; il ripiegamento è un optional (TD 30: il costo è nella simulazione, non in una nota).
- **Parametri:** C 70 · F 45 · P 30 · L 95 · R 75 · TO 70 · TD 30.
- **Movimenti/zone:** smarcamento tra le linee, venire incontro a rientrare; fasce 4-5, corsie centrali.
- **Priorità:** filtrante ↑↑, ultimo passaggio ↑↑, dribbling ↑, tiro ↑.
- **Suitability:** primari visione, passaggio, controllo / secondari dribbling, decisioni, freddezza / terziari movimentoSenzaPalla, agilita.
- **Forza/limiti:** l'unico che vede giocate che non esistono; contro Dighe e Blocchi Bassi che gli tolgono lo spazio tra le linee sparisce dalla partita.

#### Regista Avanzato `regista_avanzato`
- **Descrizione/obiettivo:** un regista spostato a ridosso delle punte; comandare il gioco dall'ultimo terzo.
- **In possesso:** più tocchi e più ordine del Trequartista: associativo, pulito, verticale al momento giusto.
- **Senza palla:** primo schermo sul vertice basso avversario.
- **Parametri:** C 85 · F 30 · P 45 · L 80 · R 55 · TO 65 · TD 45.
- **Movimenti/zone:** abbassarsi a legare i reparti; fasce 3-5.
- **Priorità:** passaggio corto ↑, filtrante ↑↑, cambio gioco ↑.
- **Suitability:** primari passaggio, visione, decisioni / secondari controllo, freddezza, lavoroSquadra / terziari anticipazione, resistenza.
- **Forza/limiti:** il possesso alto trova ordine; meno strappi e meno gol del Trequartista puro.

#### Incursore `incursore`
- **Descrizione/obiettivo:** il trequartista-attaccante (shadow striker); arrivare in area *dopo* la palla e segnare da secondo attaccante.
- **In possesso:** gioca semplice e poi scatta: il suo contributo è il movimento, non il palleggio.
- **Senza palla (fase off.):** attacca l'area a ogni cross e a ogni filtrante; **(fase dif.)** pressa i centrali come una punta.
- **Parametri:** C 35 · F 85 · P 60 · L 50 · R 55 · TO 85 · TD 40.
- **Movimenti/zone:** taglio alle spalle della punta, inserimento sul secondo palo; fasce 4-6.
- **Priorità:** inserimento ↑↑, tiro ↑↑, uno-due ↑.
- **Suitability:** primari movimentoSenzaPalla, tiro, accelerazione / secondari freddezza, anticipazione, agilita / terziari controllo, impegno.
- **Forza/limiti:** il marcatore non sa mai di chi è; se la squadra non tiene palla, corre a vuoto per 90 minuti.

### ESTERNO DI CENTROCAMPO (LM / RM — schede speculari)

#### Tornante `tornante`
- **Descrizione/obiettivo:** l'ala operaia; la fascia è sua per intero, prima in copertura poi in spinta.
- **In possesso:** riceve e appoggia, cross semplice, poche giocate individuali.
- **Senza palla:** raddoppia sul terzino avversario, si abbassa a 5 quando serve.
- **Parametri:** C 40 · F 20 · P 65 · L 25 · R 25 · TO 55 · TD 90.
- **Movimenti/zone:** raddoppio difensivo, corsa all'indietro; corsia, fasce 2-4.
- **Priorità:** copertura ↑↑, appoggio ↑, cross =.
- **Suitability:** primari impegno, resistenza, lavoroSquadra / secondari posizionamento, velocita, marcatura / terziari cross, contrasto.
- **Forza/limiti:** neutralizza i Terzini di Spinta avversari; produce poco là davanti.

#### Esterno di Raccordo `esterno_raccordo`
- **Descrizione/obiettivo:** regista mascherato da esterno; portare il gioco dentro al campo partendo da fuori.
- **In possesso:** stringe dentro a palleggiare, apre lo spazio per la sovrapposizione del terzino.
- **Senza palla:** ripiega ordinato in linea.
- **Parametri:** C 75 · F 30 · P 45 · L 70 · R 45 · TO 60 · TD 60.
- **Movimenti/zone:** dentro al mezzo spazio, scambio col terzino; corsia + mezzo spazio, fasce 3-5.
- **Priorità:** passaggio corto ↑, filtrante ↑, uno-due ↑↑, cross ↓.
- **Suitability:** primari passaggio, controllo, visione / secondari decisioni, dribbling, lavoroSquadra / terziari resistenza, movimentoSenzaPalla.
- **Forza/limiti:** superiorità in mezzo con l'ampiezza delegata al terzino; senza un terzino che spinge il lato si spegne (sinergia).

#### Ala Arretrata `ala_arretrata`
- **Descrizione/obiettivo:** l'ala pura che parte più bassa; puntare l'uomo dalla metà campo con più campo davanti.
- **In possesso:** riceve sul piede, punta il terzino, fondo o taglio dentro.
- **Senza palla:** rientro dovuto ma non naturale.
- **Parametri:** C 40 · F 50 · P 45 · L 65 · R 60 · TO 80 · TD 55.
- **Movimenti/zone:** attacco in conduzione da campo aperto; corsia, fasce 3-6.
- **Priorità:** dribbling ↑↑, cross ↑, conduzione ↑↑.
- **Suitability:** primari dribbling, velocita, accelerazione / secondari cross, agilita, movimentoSenzaPalla / terziari tiro, resistenza.
- **Forza/limiti:** letale in campo aperto e nel Contropiede; a difesa avversaria schierata ha meno spazio per far male.

### ALA ALTA (LW / RW — schede speculari)

#### Ala Classica `ala_classica`
- **Descrizione/obiettivo:** ampiezza massima, uno contro uno, fondo e cross; il piede forte è quello del lato.
- **In possesso:** incollata alla linea laterale, punta il terzino, arriva sul fondo e mette in mezzo.
- **Senza palla:** pressa il terzino avversario in uscita; rientro parziale.
- **Parametri:** C 35 · F 50 · P 50 · L 60 · R 60 · TO 85 · TD 40.
- **Movimenti/zone:** allargarsi a tenere il campo grande, fondo + cross; corsia esterna, fasce 4-6.
- **Priorità:** dribbling ↑↑, cross ↑↑, fondo ↑.
- **Suitability:** primari dribbling, velocita, cross / secondari accelerazione, agilita, movimentoSenzaPalla / terziari controllo, equilibrio.
- **Forza/limiti:** allarga le difese e alimenta Torri e Bomber; prevedibile se il cross è l'unica giocata — serve area occupata (sinergia).

#### Ala Invertita `ala_invertita`
- **Descrizione/obiettivo:** piede invertito rispetto al lato; convergere e concludere. È il "quasi attaccante" moderno.
- **In possesso:** riceve largo, converge sul piede forte, tira o filtra sotto porta.
- **Senza palla:** stringe dentro lasciando la corsia al terzino.
- **Parametri:** C 40 · F 70 · P 50 · L 70 · R 65 · TO 85 · TD 40.
- **Movimenti/zone:** taglio a convergere, attacco al secondo palo; mezzo spazio + corsia, fasce 4-6.
- **Priorità:** tiro ↑↑, dribbling a rientrare ↑↑, filtrante ↑.
- **Suitability:** primari dribbling, tiro, accelerazione / secondari piedeDebole, agilita, movimentoSenzaPalla / terziari freddezza, visione.
- **Forza/limiti:** doppia minaccia tiro/assist dal mezzo spazio; l'ampiezza va garantita dal terzino dietro di lei, o il lato si intasa.

#### Rifinitore Esterno `rifinitore_esterno`
- **Descrizione/obiettivo:** trequartista che parte largo; creare dal mezzo spazio, ultima scelta il cross.
- **In possesso:** dentro al campo tra le linee, ultimo passaggio, gestione del ritmo alto.
- **Senza palla:** pressing di reparto, posizione interna.
- **Parametri:** C 65 · F 45 · P 45 · L 85 · R 60 · TO 70 · TD 45.
- **Movimenti/zone:** ricezione interna tra le linee; mezzo spazio, fasce 4-6.
- **Priorità:** filtrante ↑↑, ultimo passaggio ↑↑, uno-due ↑, cross ↓.
- **Suitability:** primari visione, passaggio, controllo / secondari dribbling, decisioni, agilita / terziari movimentoSenzaPalla, freddezza.
- **Forza/limiti:** un dieci in più senza rinunciare al modulo; poca profondità e poca ampiezza — il lato vive solo se il terzino spinge.

### SECONDA PUNTA (CF)

#### Seconda Punta d'Assalto `seconda_punta_assalto`
- **Descrizione/obiettivo:** attaccante ombra a ridosso della prima punta; raccogliere e colpire attorno al centravanti.
- **In possesso:** gioca di rimessa attorno alla punta: seconde palle, tiri da dentro l'area, tagli corti.
- **Senza palla:** primo pressing insieme alla punta.
- **Parametri:** C 30 · F 85 · P 55 · L 55 · R 55 · TO 85 · TD 35.
- **Movimenti/zone:** movimento a girare attorno alla Torre, attacco delle respinte; fasce 5-6.
- **Priorità:** tiro ↑↑, taglio ↑↑, uno-due ↑.
- **Suitability:** primari movimentoSenzaPalla, tiro, accelerazione / secondari agilita, freddezza, anticipazione / terziari dribbling, controllo.
- **Forza/limiti:** vive delle sponde della Torre (coppia storica, cap. 06); da sola, contro due centrali, sparisce.

#### Punta di Raccordo `punta_raccordo`
- **Descrizione/obiettivo:** seconda punta che viene incontro a legare il gioco; essere il ponte tra centrocampo e attacco.
- **In possesso:** incontro alla palla, sponde, combinazioni, poi accompagna.
- **Senza palla:** schermo sul mediano avversario in ripiegamento.
- **Parametri:** C 70 · F 50 · P 50 · L 70 · R 45 · TO 70 · TD 45.
- **Movimenti/zone:** venire incontro tra le linee, sponda e giro; fasce 4-6.
- **Priorità:** sponda ↑↑, uno-due ↑↑, filtrante ↑, tiro =.
- **Suitability:** primari controllo, passaggio, visione / secondari forza, movimentoSenzaPalla, decisioni / terziari tiro, equilibrio.
- **Forza/limiti:** dà sempre una linea di passaggio in avanti; segna meno di ogni altro attaccante del catalogo.

#### Falso Nove `falso_nove`
- **Descrizione/obiettivo:** il centravanti che non sta mai in area; portare a spasso i centrali e creare il vuoto per gli inserimenti altrui.
- **In possesso:** si abbassa fino a metà campo, palleggia da trequartista, apre corridoi per ali e mezzali.
- **Senza palla:** primo pressatore sul regista avversario.
- **Parametri:** C 80 · F 55 · P 60 · L 90 · R 65 · TO 75 · TD 40.
- **Movimenti/zone:** abbassarsi a ricevere nel buco, rotazioni con le ali; fasce 4-6, tutte le corsie centrali.
- **Priorità:** filtrante ↑↑, uno-due ↑↑, dribbling ↑, tiro ↑.
- **Suitability:** primari controllo, visione, passaggio / secondari dribbling, decisioni, movimentoSenzaPalla / terziari tiro, agilita, freddezza.
- **Forza/limiti:** ingestibile per difese a uomo (il centrale che lo segue apre il buco — simulato davvero dal PositioningEngine); senza inserimenti altrui l'area resta vuota e la squadra non tira mai.

### PUNTA CENTRALE (ST)

#### Bomber d'Area `bomber`
- **Descrizione/obiettivo:** il rapace; toccare tre palloni e segnare con due.
- **In possesso:** partecipa pochissimo alla manovra: il suo lavoro inizia quando la palla entra nell'ultimo terzo.
- **Senza palla (off.):** movimento continuo sul filo del fuorigioco, attacco del primo palo, letture in area; **(dif.)** pressing minimo di disturbo.
- **Parametri:** C 10 · F 100 · P 25 · L 30 · R 40 · TO 60 · TD 15.
- **Movimenti/zone:** taglio sul primo palo, smarcamento in area cieca; fasce 5-6, corsie centrali.
- **Priorità:** tiro ↑↑↑, anticipo sul cross ↑↑, tap-in ↑↑.
- **Suitability:** primari tiro, movimentoSenzaPalla, anticipazione / secondari freddezza, accelerazione, colpoDiTesta / terziari agilita, equilibrio.
- **Forza/limiti:** il miglior convertitore di occasioni del catalogo; se la squadra non produce rifornimenti è un undicesimo in meno.

#### Torre `torre`
- **Descrizione/obiettivo:** riferimento fisico; vincere ogni duello aereo e far salire la squadra.
- **In possesso:** sponde di testa e di petto, protezione palla spalle alla porta, presenza sui cross.
- **Senza palla:** blocca la costruzione centrale avversaria col fisico.
- **Parametri:** C 45 · F 75 · P 35 · L 25 · R 30 · TO 50 · TD 30.
- **Movimenti/zone:** incontro alla palla lunga, posizione fissa sul cross; fasce 4-6, corsia centrale.
- **Priorità:** sponda ↑↑, colpo di testa ↑↑↑, protezione ↑↑.
- **Suitability:** primari colpoDiTesta, forza, salto / secondari controllo, equilibrio, tiro / terziari movimentoSenzaPalla, freddezza.
- **Forza/limiti:** rende giocabile la Palla Lunga e devastanti i cross (sinergia con Ali Classiche e Seconda Punta); lenta: contro linee alte e veloci non ha profondità da attaccare.

#### Punta Completa `punta_completa`
- **Descrizione/obiettivo:** il centravanti totale; fare tutto: legare, attaccare, segnare.
- **In possesso:** alterna il venire incontro e l'attacco alla profondità, letto in base al contesto (DecisionEngine con libertà alta).
- **Senza palla:** pressing intelligente sui centrali.
- **Parametri:** C 55 · F 85 · P 50 · L 75 · R 50 · TO 75 · TD 30.
- **Movimenti/zone:** repertorio completo; fasce 4-6.
- **Priorità:** bilanciate (nessun archetipo dominante: decide il contesto).
- **Suitability:** primari tiro, controllo, movimentoSenzaPalla / secondari forza, visione, freddezza / terziari dribbling, colpoDiTesta, decisioni.
- **Forza/limiti:** si adatta a qualsiasi identità tattica; richiede un giocatore completo — la suitability alta è rara per costruzione.

#### Punta di Profondità `punta_profondita`
- **Descrizione/obiettivo:** vivere sull'ultimo uomo; trasformare ogni filtrante in un uno-contro-uno col portiere.
- **In possesso:** non viene mai incontro: allunga la squadra avversaria stando sul filo.
- **Senza palla (off.):** scatti ripetuti alle spalle della linea; **(dif.)** taglia i passaggi verso il vertice basso.
- **Parametri:** C 15 · F 90 · P 45 · L 40 · R 55 · TO 95 · TD 20.
- **Movimenti/zone:** attacco della profondità in diagonale, movimento a uscire dal cono di copertura; fasce 5-6.
- **Priorità:** attacco profondità ↑↑↑, tiro in corsa ↑↑, filtrante ricevuto ↑↑.
- **Suitability:** primari velocita, accelerazione, movimentoSenzaPalla / secondari tiro, freddezza, anticipazione / terziari controllo, equilibrio.
- **Forza/limiti:** punisce ogni linea alta (arma primaria di Verticale e Contropiede); contro un Blocco Basso non ha spazio ed evapora.

#### Punta Pressante `punta_pressante`
- **Descrizione/obiettivo:** il primo difensore; trasformare la costruzione avversaria in occasioni proprie.
- **In possesso:** essenziale, attacca l'area con tempi da bomber di riporto.
- **Senza palla:** caccia furiosa su centrali e portiere secondo i trigger tattici; orienta il pressing di tutta la squadra.
- **Parametri:** C 25 · F 70 · P 100 · L 30 · R 45 · TO 80 · TD 55.
- **Movimenti/zone:** corsa a schermare il passaggio interno mentre pressa; fasce 4-6.
- **Priorità:** pressing ↑↑↑, tiro ↑, recupero-e-tiro ↑↑.
- **Suitability:** primari impegno, aggressivita, velocita / secondari anticipazione, resistenza, tiro / terziari forza, freddezza.
- **Forza/limiti:** il motore del Gegenpressing: i suoi recuperi alti valgono un rigore in movimento; segna meno di un Bomber e consuma tantissimo.

---

## 6. Compatibilità col sistema esistente

- I 15 ruoli attuali diventano **posizioni** (con le rinomine CDM/ST, cap. 03
  §3); l'istanza `giocatore.ruoli` resta la mappa delle posizioni giocabili.
- Alla migrazione ogni giocatore riceve il ruolo di default della sua posizione
  (quello con suitability calcolata più alta tra i ruoli della posizione): il
  mondo esistente resta valido e già "interpretato".
- La griglia tattica (`GRIGLIA_SLOT`) non cambia geometria: ogni slot acquisisce
  il selettore di ruolo.
