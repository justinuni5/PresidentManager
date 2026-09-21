# Database mondiale — guida di modifica manuale

Il database è diviso nella cartella [`src/game/database/`](../src/game/database/): `paesi.json`, `competizioni.json`, `collegamenti.json`, `club.json` e `giocatori.json`. `metadata.json` contiene versione e identità del catalogo. Il caricatore li riunisce in memoria, mentre una nuova carriera materializza soltanto i paesi selezionati. Una carriera già iniziata resta legata all'id e alla versione del database con cui è nata.

Per popolare l'Italia lavora normalmente in questo ordine: prima `competizioni.json`, poi `club.json`, infine `giocatori.json`. Aumenta `versione` in `metadata.json` quando completi un blocco coerente di dati.

`paesi.json` contiene già le 249 entità territoriali del catalogo ISO più il Kosovo, rilevante nel calcio internazionale. Un paese senza campionati attivi resta consultabile e può essere collegato ai giocatori, ma non compare nella selezione delle nazioni da simulare. FIFA riconosce 211 associazioni: il futuro sistema delle nazionali userà un campo di eleggibilità calcistica separato dal semplice luogo di cittadinanza.

Le bandiere SVG vanno in `public/assets/bandiere/` con il codice ISO a due lettere in minuscolo, per esempio `it.svg`, `br.svg` e `ar.svg`. Non occorre scrivere il percorso in ogni paese: l'interfaccia lo ricava da `codiceIso2`. Per un'eccezione si può usare `"bandieraSvg": "/assets/bandiere/file-personalizzato.svg"` oppure `bandieraPng`. Se manca il file, viene mostrata automaticamente l'emoji della bandiera.

Prima di avviare il gioco, controllare sempre il file:

```bash
npm run database:validate
```

Per validare un vecchio database monolitico o una copia esportata dall'editor:

```bash
node tools/validate-database.mjs percorso/del/database.json
```

## Aggiungere un paese

Inserire un oggetto in `paesi`. Un paese diventa selezionabile soltanto se ha `selezionabile: true`, almeno una competizione e abbastanza città per tutti i club generati.

```json
{
  "id": "san-marino",
  "nome": "San Marino",
  "codice": "SMR",
  "selezionabile": true,
  "citta": [
    { "nome": "Serravalle", "regione": "San Marino", "popolazione": 11, "ricchezza": 5 },
    { "nome": "Borgo Maggiore", "regione": "San Marino", "popolazione": 7, "ricchezza": 5 },
    { "nome": "Domagnano", "regione": "San Marino", "popolazione": 4, "ricchezza": 4 },
    { "nome": "Fiorentino", "regione": "San Marino", "popolazione": 3, "ricchezza": 4 }
  ]
}
```

## Aggiungere campionati e gironi

Ogni girone è una competizione separata. `livello` descrive la posizione nella piramide; `gruppo` permette più gironi allo stesso livello. `numeroSquadre` può essere pari o dispari: in quest'ultimo caso il calendario introduce turni di riposo.

Usare `"massimaSerie": true` soltanto per la vera massima divisione nazionale. Il valore abilita l'eventuale seconda squadra U23 per i club idonei; `livello: 1` da solo non basta, perché un database può iniziare da categorie inferiori come l'Eccellenza.

```json
{
  "id": "smr-campionato-a",
  "paeseId": "san-marino",
  "nome": "Campionato Sammarinese",
  "tipo": "campionato",
  "attiva": true,
  "livello": 1,
  "forzaMedia": 44,
  "gruppo": "A",
  "numeroSquadre": 4,
  "reputazione": 70,
  "trofeoPng": "/assets/trofei/smr-campionato-a.png",
  "logoPng": "/assets/competizioni/smr-campionato-a.png",
  "colori": ["#174f88", "#f2f2f2"]
}
```

`reputazione` va da 1 a 300 e misura il prestigio della competizione. `logoPng` identifica il torneo, `trofeoPng` rappresenta la coppa e `colori` contiene almeno due colori usati nella testata. I PNG vanno rispettivamente in `public/assets/competizioni/` e `public/assets/trofei/`; quando un file manca, il gioco mostra un simbolo sostitutivo.

`forzaMedia` (1–99) della competizione è il valore di riserva usato per i club che non hanno una forza specifica. È distinta dalla reputazione: una lega può essere famosa senza avere la stessa qualità tecnica di un'altra. Come base iniziale da rifinire con i test puoi usare circa **76–80 per Serie A, 63–67 per Serie B, 51–56 per Serie C, 40–46 per Serie D e 32–38 per Eccellenza**. I giocatori inseriti manualmente conservano invece i loro attributi.

Per assegnare premi economici a fine campionato, aggiungi alla competizione `"premiClassifica": { "monteStagionale": 10000000 }`. Il valore è in euro e viene distribuito fra tutti i club in base a posizione e punti; lascialo assente o a zero se il torneo non paga premi. In Serie A il monte è la quota finale dei diritti TV già prevista dal gioco, mentre quello della Serie B è per ora un parametro provvisorio di bilanciamento.

Per collegare due categorie, aggiungere una regola in `collegamenti`. Questa riga promuove la prima classificata e retrocede l'ultima:

```json
{
  "daCompetizioneId": "smr-seconda-a",
  "aCompetizioneId": "smr-campionato-a",
  "promosse": 1,
  "retrocesse": 1
}
```

Il verso è sempre **categoria inferiore → categoria superiore**: `daCompetizioneId` è il campionato dal quale salgono le promosse, mentre `aCompetizioneId` è quello che riceve le promosse e dal quale scendono le retrocesse.

Con più gironi si aggiunge un collegamento per ciascun girone. Per tre gironi di Serie C verso la Serie B, per esempio:

```json
[
  { "daCompetizioneId": "ita-serie-c-a", "aCompetizioneId": "ita-serie-b", "promosse": 1, "retrocesse": 1 },
  { "daCompetizioneId": "ita-serie-c-b", "aCompetizioneId": "ita-serie-b", "promosse": 1, "retrocesse": 1 },
  { "daCompetizioneId": "ita-serie-c-c", "aCompetizioneId": "ita-serie-b", "promosse": 1, "retrocesse": 1 }
]
```

In questo esempio salgono tre club complessivi in Serie B e ne scendono tre, uno destinato a ogni girone. Il gioco evita che lo stesso club venga spostato due volte.

## Creare una coppa nazionale

Le coppe nazionali a eliminazione diretta sono simulate. Con `"attiva": true` entrano nella carriera, fermano l'avanzamento quando gioca il club dell'utente, risolvono i pareggi ai rigori, assegnano il trofeo e ripartono nella stagione successiva.

```json
{
  "id": "smr-coppa-nazionale",
  "paeseId": "san-marino",
  "nome": "Coppa di San Marino",
  "tipo": "coppa_nazionale",
  "attiva": true,
  "formato": "eliminazione_diretta",
  "reputazione": 65,
  "logoPng": "/assets/competizioni/smr-coppa-nazionale.png",
  "trofeoPng": "/assets/trofei/smr-coppa-nazionale.png",
  "colori": ["#4b83bd", "#ffffff"],
  "partecipanti": {
    "competizioniId": ["smr-campionato-a"]
  },
  "turni": [
    { "id": "semifinali", "nome": "Semifinali", "numeroClub": 4, "andataRitorno": false },
    { "id": "finale", "nome": "Finale", "numeroClub": 2, "andataRitorno": false }
  ],
  "storia": { "vincitori": [] }
}
```

`numeroClub` indica quante squadre sono ancora in corsa **all'inizio** del turno. Se il numero non è una potenza di due, le migliori teste di serie ricevono automaticamente un bye. Per esempio, 28 club al primo turno producono 12 partite e 4 bye, quindi 16 club agli ottavi.

Per scegliere soltanto una parte dei club di una divisione e far entrare le squadre più importanti in un turno successivo, usare la forma dettagliata:

```json
"partecipanti": {
  "competizioni": [
    { "competizioneId": "ita-serie-a", "numeroClub": 8, "ingressoTurnoId": "ottavi" },
    { "competizioneId": "ita-serie-b", "numeroClub": 12, "ingressoTurnoId": "primo-turno" },
    { "competizioneId": "ita-serie-c-a", "numeroClub": 4, "ingressoTurnoId": "primo-turno" }
  ]
}
```

Il gioco sceglie in base alla reputazione quando `numeroClub` è inferiore alla dimensione del campionato. La somma delle qualificate dal turno precedente e delle nuove entranti deve coincidere con `numeroClub` del turno. È possibile indicare `data` e, per i turni con andata e ritorno, `dataRitorno` nel formato `AAAA-MM-GG`; senza date il gioco distribuisce i turni dal 16 settembre.

Per la prima versione italiana conviene iniziare con una Coppa Italia configurata sulle divisioni già complete. Non inserire Eccellenza nazionale come una lega unica: ogni girone lombardo è una competizione autonoma e può fornire un numero esplicito di club alla coppa.

## Preparare una competizione continentale

Una competizione continentale usa `continenteId` al posto di un singolo `paeseId`. Le regole di qualificazione indicano da quale campionato e da quali posizioni arriveranno i partecipanti quando la simulazione verrà attivata.

```json
{
  "id": "eur-coppa-campioni",
  "continenteId": "europa",
  "nome": "Coppa dei Campioni d'Europa",
  "tipo": "continentale",
  "attiva": false,
  "formato": "fase_campionato_e_eliminazione",
  "reputazione": 300,
  "logoPng": "/assets/competizioni/eur-coppa-campioni.png",
  "trofeoPng": "/assets/trofei/eur-coppa-campioni.png",
  "colori": ["#111b4d", "#7fa8ff"],
  "regoleQualificazione": [
    { "paeseId": "italia", "competizioneId": "ita-serie-a", "posizioni": [1, 2, 3, 4] }
  ],
  "turni": [
    { "id": "fase-campionato", "nome": "Fase campionato", "numeroClub": 36, "andataRitorno": false },
    { "id": "ottavi", "nome": "Ottavi", "numeroClub": 16, "andataRitorno": true },
    { "id": "finale", "nome": "Finale", "numeroClub": 2, "andataRitorno": false }
  ],
  "storia": { "vincitori": [] }
}
```

## Inserire la storia di una competizione

I vincitori storici si scrivono dentro la competizione. La bacheca dei club verrà derivata da questa fonte, evitando di duplicare lo stesso titolo in due punti.

Quando il club esiste già in `club`, usare il suo id:

```json
"storia": {
  "vincitori": [
    { "stagione": "2025/26", "clubId": "ita-real-madrid-demo", "finalistaId": "ita-inter-demo", "risultato": "2-1" }
  ]
}
```

Per inserire provvisoriamente un vincitore che non è ancora presente nel database, usare `nomeClub`:

```json
{ "stagione": "1990/91", "nomeClub": "Club storico da collegare" }
```

Appena viene creato il club corrispondente, conviene sostituire `nomeClub` con `clubId`. Il validatore segnala gli id che non esistono.

I record già esistenti possono essere aggiunti nello stesso blocco. Fra le chiavi riconosciute ci sono i totali e i primati stagionali dei giocatori (`Gol totali nella competizione`, `Gol in una stagione`, `Assist totali nella competizione`, `Assist in una stagione`, `Presenze totali nella competizione`), i record anagrafici (`Esordiente più giovane`, `Esordiente più anziano`, `Marcatore più giovane`, `Marcatore più anziano`) e quelli dei club (`Campionati vinti`, `Vittorie totali`, `Gol segnati dal club`, `Reti inviolate del club`, `Punti in una stagione`, `Vittorie in una stagione`, `Gol del club in una stagione`):

```json
"storia": {
  "vincitori": [],
  "record": {
    "Gol totali nella competizione": { "valore": 164, "detentore": "Mario Rossi" },
    "Gol in una stagione": { "valore": 31, "detentore": "Luca Bianchi", "stagione": "2018/19" }
  }
}
```

Se `record` è assente o vuoto, il gioco comincia automaticamente la raccolta dalla prima stagione simulata e conserva i primati dopo promozioni, retrocessioni e cambi di stagione. Le statistiche archiviate da un salvataggio precedente vengono recuperate automaticamente: per esempio, 50 gol nella prima stagione restano il primato stagionale anche quando il leader della seconda è fermo a 12, mentre il totale di carriera somma entrambe le stagioni.

## Aggiungere un club

I club manuali vengono usati per primi; gli slot rimanenti sono riempiti proceduralmente. `id` è stabile e viene usato dai giocatori. `reputazione` accetta valori da 1 a 300. `forzaMedia` accetta valori da 1 a 99 e stabilisce la qualità media della rosa generata per quel club.

```json
{
  "id": "smr-serravalle",
  "competizioneId": "smr-campionato-a",
  "nome": "Serravalle Calcio",
  "abbreviazione": "SER",
  "citta": "Serravalle",
  "colori": ["#1a5fb4", "#ffffff"],
  "logoPng": "/assets/club/smr-serravalle.png",
  "budget": 350000,
  "reputazione": 35,
  "forzaMedia": 42,
  "stadio": { "nome": "Stadio di Serravalle", "capienza": 5000 }
}
```

La forza del club ha priorità su quella della competizione. Se `forzaMedia` manca nel club, il gioco usa quella del campionato e introduce una piccola variazione fra le squadre. Se è presente, diventa il centro esatto attorno al quale vengono creati i giocatori mancanti: portieri, titolari e riserve avranno comunque valori diversi. Non modifica i giocatori compilati manualmente.

Tieni separati i due concetti:

- `reputazione`: prestigio, seguito e attrattiva sul mercato;
- `forzaMedia`: qualità sportiva attuale della rosa.

Per iniziare a differenziare le rose puoi usare queste fasce indicative:

| Livello del club | Serie A | Serie B |
| --- | ---: | ---: |
| favorito/promozione diretta | 82–86 | 68–72 |
| zona alta | 77–81 | 64–68 |
| metà classifica | 71–76 | 59–64 |
| lotta salvezza | 65–70 | 54–59 |

Evita di ricavare automaticamente `forzaMedia` dalla reputazione: un club storico può avere grande prestigio ma una rosa momentaneamente debole, oppure il contrario.

La città indicata da un club manuale viene creata automaticamente se non è già presente in `paesi.json`, e può essere condivisa da più club: Milan e Inter possono quindi usare entrambi `"citta": "Milano"`. Per una città creata dal club si possono aggiungere `regione`, `popolazioneCitta`, `ricchezzaCitta` e `tradizioneCitta`; in assenza di questi dati il generatore usa valori neutrali.

`stadio` è facoltativo. Se lo inserisci, `capienza` deve essere un numero intero di almeno 800 posti; il nome è facoltativo. I 20 club già presenti in Serie A hanno una capienza iniziale configurata nel database. Per un nuovo club di Serie A senza questo campo il gioco la stima dalla reputazione. Prezzo medio del biglietto e sponsor bordocampo sono calcolati separatamente.

I loghi dei club vanno in `public/assets/club/` e si collegano con `logoPng`. Non esiste una dimensione obbligatoria: l'interfaccia li ridimensiona mantenendo le proporzioni. Per evitare immagini sfocate è consigliato un PNG quadrato trasparente da **256×256 o 512×512 px**, con poco spazio vuoto attorno allo stemma. Se il file manca o non viene caricato, resta visibile il badge generato dal gioco.

## Aggiungere un giocatore

Il club indicato deve essere manuale. I valori omessi vengono generati dal gioco, quindi per iniziare bastano i campi qui sotto. La reputazione del giocatore (1–300) incide già sul valore di mercato insieme ad abilità, età, potenziale e posizione: un portiere costa mediamente meno di un attaccante di pari profilo. Per un calciatore reale puoi specificare `"valore": 75000000` e `"stipendio": 4000000` in euro annui: i dati manuali hanno la precedenza sulla stima iniziale.

```json
{
  "id": "smr-m-rossi",
  "clubId": "smr-serravalle",
  "nome": "Marco",
  "cognome": "Rossi",
  "nazionalita": "San Marino",
  "nazionalitaPaeseId": "smr",
  "nazionalitaSecondarie": [],
  "eta": 23,
  "ruolo": "CM",
  "reputazione": 24,
  "numeroMaglia": 8,
  "contrattoScadenza": 2029,
  "attributi": {
    "tecnica": { "passaggio": 48, "controllo": 45 },
    "mentale": { "visione": 46, "decisioni": 44 }
  },
  "nascosti": { "potenziale": 58, "professionalita": 70 }
}
```

I ruoli ammessi sono `POR`, `TS`, `DC`, `TD`, `LWB`, `RWB`, `CDM`, `CM`, `CAM`, `LM`, `RM`, `ST`, `CF`, `RW`, `LW`. `numeroMaglia` è facoltativo, deve essere tra 1 e 99 e non può essere duplicato nello stesso club; il gioco completa automaticamente i numeri mancanti e li fa confermare prima della prima giornata. Una rosa viene completata automaticamente fino a 22 senior e con le squadre giovanili.

### Compilazione rapida degli attributi

Non è necessario scrivere tutti gli attributi. Con la sola `abilitaAttuale` il gioco conserva un profilo personale casuale e lo porta al livello richiesto:

```json
{
  "id": "ita-portiere-esempio",
  "clubId": "ita-club-esempio",
  "nome": "Luca",
  "cognome": "Esempio",
  "ruolo": "POR",
  "abilitaAttuale": 78
}
```

Per distinguere due portieri della stessa qualità si possono compilare le sei macro specifiche. I valori dettagliati vengono generati a partire da queste e Ventidue continua a leggere soltanto gli attributi atomici:

```json
{
  "abilitaAttuale": 78,
  "macroPortiere": {
    "parate": 88,
    "presa": 74,
    "uscite": 61,
    "posizionamento": 82,
    "distribuzione": 55,
    "fisico": 72
  },
  "attributiOverride": {
    "riflessi": 94
  }
}
```

Per i giocatori di movimento la proprietà si chiama `macroAttributi` e accetta `velocita`, `tiro`, `passaggio`, `dribbling`, `difesa` e `fisico`. Se sono presenti le macro, `abilitaAttuale` è soltanto indicativa: l'overall mostrato viene ricalcolato dagli attributi generati. `attributiOverride` vince sempre sulla generazione; anche il vecchio oggetto `attributi` per gruppi resta supportato e ha precedenza sui valori compatti.

## Come evolverà il formato

`schemaVersion` appartiene al formato del database; `versione` identifica il contenuto. Lo schema 2 accetta campionati e coppe nazionali a eliminazione diretta con `attiva: true`; le competizioni continentali devono ancora usare `attiva: false`. Il futuro editor visuale leggerà e scriverà lo stesso JSON.

Il catalogo è già diviso in file JSON componibili. I giocatori usano `nazionalitaPaeseId` e possono avere `nazionalitaSecondarie`; entrambi vengono verificati dal validatore. Questa base permette pagine nazionali, convocazioni future e competizioni tra rappresentative senza associare nuovamente i nomi a mano.

Per ora soltanto l'Italia del prototipo ha campionati giocabili. Il catalogo non è ancora caricabile da un selettore esterno: dopo una modifica va ricostruita o riavviata l'app e va iniziata una nuova carriera.
