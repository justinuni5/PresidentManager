# 05 — Tattiche

Le "istruzioni" attuali (pressing alto/basso, baricentro alto/basso) vengono
sostituite da **identità calcistiche** complete: modi diversi di interpretare
il calcio, che modificano il comportamento collettivo in ogni fase — non due
moltiplicatori sulle forze.

## 1. Schema di configurazione (un file per identità)

```js
{
  id: 'gegenpressing',
  nome: 'Gegenpressing',
  filosofia: '…',
  obiettivi: ['…'],

  parametri: {                    // 0-100, letti dai motori (vedi §2)
    ritmo: 90,                    // velocità di circolazione e di pensiero
    ampiezza: 55,                 // quanto la squadra allarga il campo
    distanzaReparti: 15,          // compattezza verticale (basso = corti)
    lineaDifensiva: 85,           // altezza della linea
    altezzaPressing: 90,          // dove inizia il pressing
    intensitaPressing: 95,        // quanta gente partecipa e quanto forte
    aggressivita: 85,             // durezza nei duelli
    ricercaProfondita: 70,        // verticalizzazioni alle spalle
    cross: 40,                    // ricorso ai traversoni
    lanciLunghi: 25,              // ricorso al lancio
    costruzioneDalBasso: 55,      // uscita palleggiata vs diretta
    gestionePossesso: 30,         // tenere palla vs andare alla conclusione
    transizioneOffensiva: 95,     // verticalità immediata a palla conquistata
    transizioneDifensiva: 95,     // reazione immediata a palla persa (contro-pressing)
    consumoEnergetico: 95,        // costo per il FatigueEngine
  },

  triggerPressing: ['ricezione_spalle_porta', 'controllo_sbagliato',
                    'passaggio_indietro', 'palla_sul_terzino'],
                                  // vocabolario chiuso in config/azioni.js
  ruoliAffini:    ['punta_pressante', 'incursore', 'box_to_box', 'terzino_spinta'],
  ruoliInattriti: ['trequartista', 'torre', 'regista_basso?fragile'],
  requisitiRosa:  { impegno: 'alto', resistenza: 'alta' },   // per il report sinergia

  puntiForza:  ['…'],
  puntiDeboli: ['…'],
}
```

## 2. Come i parametri guidano i motori

| Parametro | Motori |
| --- | --- |
| `ritmo` | Durata dei tick di palleggio, budget possessi, velocità decisionale richiesta (penalizza `decisioni` basse a ritmo alto) |
| `ampiezza` | PositioningEngine: posizioni di dovere sulle corsie esterne |
| `distanzaReparti` | PositioningEngine: compattezza; influenza intercetti e seconde palle |
| `lineaDifensiva` | DefendingEngine: altezza della linea, spazio alle spalle concesso |
| `altezzaPressing`, `intensitaPressing`, `triggerPressing` | PressingEngine |
| `aggressivita` | DuelEngine (modificatore), DisciplineEngine (rischio cartellini) |
| `ricercaProfondita`, `cross`, `lanciLunghi`, `gestionePossesso` | DecisionEngine: pesi delle famiglie di opzioni |
| `costruzioneDalBasso` | PossessionEngine (fase costruzione), GoalkeeperEngine |
| `transizioneOffensiva/Difensiva` | PossessionEngine: comportamento nei 2-3 tick dopo il cambio possesso |
| `consumoEnergetico` | FatigueEngine: moltiplicatore del drenaggio |

## 3. Mentalità (regolatore fine, separato dall'identità)

L'identità dice *come* giochi; la **mentalità** dice quanto rischi oggi, ora:

`Difensiva · Prudente · Equilibrata · Offensiva · Assalto`

Sposta di ±10/±20 i parametri di rischio (lineaDifensiva, ricercaProfondita,
gestionePossesso, uomini in area) senza cambiare l'identità. È il comando da
usare in corsa: 1-0 al minuto 85 → Prudente; 0-1 → Assalto. Le CPU la regolano
da sole in base a punteggio, minuto e obiettivo stagionale.

## 4. Familiarità tattica (predisposizione futura)

Lo schema prevede fin d'ora `familiaritaTattica` (0-100, default 100 alla
prima implementazione): quanto la squadra conosce l'identità. Ridurrà
l'aderenza dei giocatori ai parametri (via ModifierPipeline `posizionamento`).
L'allenamento la farà crescere (fase futura); cambiare identità a metà stagione
avrà un costo reale.

---

## 5. Catalogo delle identità (13)

Parametri in forma compatta: Ritmo · Ampiezza · DistReparti · Linea ·
AltPress · IntPress · Aggr · Prof · Cross · Lanci · CostrBasso · GestPoss ·
TransOff · TransDif · Energia.

### Equilibrata `equilibrata` (default)
- **Filosofia:** nessuna estremizzazione: leggere la partita e adattarsi. È la baseline di calibrazione del motore.
- **Obiettivi:** solidità, adattabilità, nessun punto debole strutturale.
- **Parametri:** 50 · 50 · 50 · 50 · 50 · 50 · 50 · 50 · 50 · 50 · 50 · 50 · 50 · 50 · 50.
- **Ruoli affini:** tutti (nessun requisito).
- **Forza/deboli:** non regala niente / non domina niente. Ideale per rose incomplete o miste.

### Possesso `possesso`
- **Filosofia:** il pallone è la miglior difesa: se ce l'abbiamo noi, non segnano. Circolazione paziente, superiorità posizionale, pochi rischi.
- **Obiettivi:** controllo del ritmo, logorare il blocco avversario, limitare le transizioni subite.
- **Parametri:** 40 · 65 · 35 · 65 · 55 · 50 · 40 · 40 · 40 · 15 · 85 · 90 · 30 · 60 · 45.
- **Ruoli affini:** regista_basso, dc_costruttore, terzino_invertito, esterno_raccordo, falso_nove, punta_raccordo.
- **Forza:** possesso schiacciante, avversario che insegue e si stanca, pochissime transizioni concesse.
- **Deboli:** sterile senza rifinitori di qualità; vulnerabile all'unico contropiede concesso; soffre il Gegenpressing che ne aggredisce l'uscita.

### Tiki-Taka `tiki_taka`
- **Filosofia:** il Possesso portato all'estremo: triangoli corti, terzo uomo, il campo si accorcia attorno alla palla. Il possesso *è* pressing (a palla persa la palla è già circondata).
- **Obiettivi:** dominio totale, avversario ipnotizzato, recupero immediato.
- **Parametri:** 55 · 55 · 15 · 80 · 75 · 70 · 45 · 35 · 25 · 5 · 95 · 95 · 35 · 85 · 65.
- **Ruoli affini:** regista_basso, regista_avanzato, falso_nove, terzino_invertito, ala_invertita, mezzala_assalto.
- **Requisiti:** controllo/passaggio/visione alti *diffusi*: è l'identità più esigente tecnicamente (la sinergia punisce ogni anello debole).
- **Forza:** ingiocabile per squadre passive; ogni palla persa viene ricomprata in 3 secondi.
- **Deboli:** contro un Blocco Basso perfetto produce possesso sterile; una rosa tecnicamente povera la trasforma in autolesionismo.

### Gegenpressing `gegenpressing`
- **Filosofia:** il momento migliore per rubare palla è nei 5 secondi dopo averla persa; il pressing è il primo playmaker.
- **Obiettivi:** recuperi alti, verticalità immediata, occasioni da palla rubata in zona gol.
- **Parametri:** 90 · 55 · 15 · 85 · 90 · 95 · 85 · 70 · 40 · 25 · 55 · 30 · 95 · 95 · 95.
- **Trigger:** ricezione spalle alla porta, controllo sbagliato, passaggio arretrato, palla sul terzino.
- **Ruoli affini:** punta_pressante, incursore, box_to_box, mezzala_assalto, terzino_spinta, dc_marcatore.
- **Forza:** trasforma gli errori avversari in tiri; annichilisce le squadre che costruiscono dal basso con piedi mediocri.
- **Deboli:** consumo energetico massimo (crolli nei finali se la rosa non regge — simulato dal FatigueEngine); la linea altissima muore contro Punte di Profondità; servono impegno e resistenza diffusi.

### Verticale `verticale`
- **Filosofia:** il minor numero di passaggi tra il recupero e la porta; ogni tocco che non avvicina alla porta è un tocco sprecato.
- **Obiettivi:** attaccare la disorganizzazione avversaria prima che diventi organizzazione.
- **Parametri:** 85 · 45 · 35 · 60 · 60 · 60 · 60 · 90 · 40 · 45 · 35 · 15 · 95 · 70 · 75.
- **Ruoli affini:** punta_profondita, incursore, regista_centrale, ala_invertita, volante.
- **Forza:** micidiale contro squadre alte e lente a ricomporsi; pochi possessi, tanti tiri per possesso.
- **Deboli:** tanti palloni persi per costruzione (il filtrante è la giocata più rischiosa del motore); se la profondità non c'è, non c'è piano B.

### Palla Lunga `palla_lunga`
- **Filosofia:** saltare il centrocampo per decreto: lancio sulla Torre, seconde palle, dentro l'area. Il calcio diretto delle categorie minori — onesto e efficace.
- **Obiettivi:** portare la palla nell'ultimo terzo col minimo rischio di palleggio, dominare le seconde palle.
- **Parametri:** 70 · 60 · 30 · 45 · 40 · 55 · 70 · 65 · 70 · 95 · 10 · 20 · 80 · 60 · 65.
- **Ruoli affini:** torre, seconda_punta_assalto, tornante, dc_marcatore, portiere_classico.
- **Forza:** azzera il valore del pressing avversario (non c'è costruzione da aggredire); esalta rose fisiche e povere tecnicamente — realistico per il basso della piramide.
- **Deboli:** possesso bassissimo, dipendenza totale dai duelli aerei della Torre; contro centrali dominanti nell'aria non resta niente.

### Gioco sulle Fasce `fasce`
- **Filosofia:** il campo è largo 68 metri: usiamoli tutti. Palla larga, fondo, cross, area piena.
- **Obiettivi:** creare 2c1 sulle corsie, colpire con i traversoni.
- **Parametri:** 65 · 95 · 45 · 55 · 50 · 55 · 55 · 55 · 95 · 50 · 45 · 40 · 70 · 55 · 70.
- **Ruoli affini:** ala_classica, terzino_spinta, tuttafascia, torre, bomber, volante (a rimorchio).
- **Forza:** doppia sorgente di gioco, difese costrette ad allargarsi (si aprono i mezzi spazi); esalta crossatori e saltatori.
- **Deboli:** prevedibile se l'area non è occupata da almeno due saltatori (sinergia); i cross sono duelli a bassa conversione contro centrali forti di testa; centro del campo in inferiorità.

### Contropiede `contropiede`
- **Filosofia:** concedere il possesso, non le occasioni: blocco medio-basso ordinato, poi 30 metri di prateria in quattro secondi.
- **Obiettivi:** invitare l'avversario a sbilanciarsi e colpirlo in transizione.
- **Parametri:** 45(90 in trans.) · 40 · 30 · 35 · 30 · 45 · 55 · 95 · 45 · 55 · 25 · 15 · 100 · 75 · 55.
- **Ruoli affini:** punta_profondita, ala_arretrata, incursore, diga, dc_copertura, quinto_difensivo.
- **Forza:** letale contro chi attacca con troppi uomini (il Gegenpressing altrui diventa la sua benzina); efficiente: poche occasioni ma ad altissimo xG.
- **Deboli:** se l'avversario non attacca, la partita muore su 0 tiri; dipendenza estrema dalla velocità dei tre davanti; il primo gol subito rompe il piano partita.

### Catenaccio `catenaccio`
- **Filosofia:** la scuola italiana: la porta inviolata come opera d'arte. Marcature ossessive, copertura, cinismo su piazzati e ripartenze.
- **Obiettivi:** portare a casa il punto, colpire nell'unico momento di distrazione altrui.
- **Parametri:** 35 · 35 · 20 · 25 · 20 · 60 · 75 · 60 · 40 · 60 · 15 · 25 · 85 · 85 · 50.
- **Ruoli affini:** dc_marcatore, dc_copertura (il "libero"), diga, tornante, punta_raccordo, torre.
- **Forza:** trasforma partite proibitive in 0-0 e 1-0; esalta rose difensive; l'avversario forte gioca contro un muro e contro i nervi.
- **Deboli:** produzione offensiva minima: ogni errore individuale dietro costa mezzo campionato; sotto di un gol l'identità rema contro (serve il cambio di mentalità).

### Blocco Basso `blocco_basso`
- **Filosofia:** difesa posizionale pura a ridosso della propria area: due linee da quattro/cinque, zero spazio tra le linee, zero profondità concessa. Diverso dal Catenaccio: zona compatta, non marcature.
- **Obiettivi:** rendere l'ultimo terzo avversario un territorio senza ossigeno.
- **Parametri:** 40 · 40 · 10 · 15 · 15 · 40 · 45 · 70 · 35 · 65 · 15 · 30 · 80 · 90 · 40.
- **Ruoli affini:** dc_copertura, tornante, diga, mezzala_equilibrio, punta_profondita (unico riferimento davanti).
- **Forza:** il consumo energetico più basso del catalogo (si difende con la posizione, non con la corsa); annulla Trequartisti e Punte di Profondità avversarie.
- **Deboli:** invita a un assedio senza fine: contro crossatori e tiratori da fuori di livello prima o poi il muro cede; il possesso ~30% significa che ogni ripartenza deve pesare.

### Calcio Totale `calcio_totale`
- **Filosofia:** ogni giocatore può occupare ogni zona: rotazioni continue, ampiezza e profondità insieme, coraggio sistemico. L'erede olandese.
- **Obiettivi:** disordinare ogni schema di marcatura avversario tramite lo scambio costante delle posizioni.
- **Parametri:** 75 · 85 · 25 · 80 · 75 · 75 · 60 · 75 · 55 · 30 · 80 · 60 · 85 · 80 · 90.
- **Meccanica speciale:** abilita il set di movimenti `rotazione` (l'ala che entra, la mezzala che allarga, il terzino che diventa mediano) — configurazione, non codice: è il vocabolario `movimenti` esteso.
- **Ruoli affini:** punta_completa, falso_nove, quinto_assalto, box_to_box, dc_costruttore, portiere_moderno.
- **Requisiti:** lavoroSquadra, decisioni e movimentoSenzaPalla alti *ovunque*: l'identità più esigente del catalogo sul piano collettivo.
- **Forza:** immarcabile quando gira: la sinergia massima possibile del motore.
- **Deboli:** ogni rotazione sbagliata è un buco in transizione; con giocatori tatticamente poveri produce caos in casa propria; consumo altissimo.

### Uomo su Uomo `uomo_su_uomo`
- **Filosofia:** marcature individuali a tutto campo, alla Bielsa: ognuno ha la sua ombra, sempre, ovunque.
- **Obiettivi:** negare all'avversario ogni ricezione pulita, vincere il proprio duello su ogni zolla.
- **Parametri:** 80 · 50 · 25 · 75 · 85 · 90 · 90 · 65 · 45 · 30 · 45 · 30 · 85 · 85 · 95.
- **Meccanica speciale:** DefendingEngine in modalità `uomo`: le marcature seguono gli uomini, non le zone — il Falso Nove avversario diventa un problema strutturale (chi lo segue apre il buco), simulato davvero.
- **Ruoli affini:** dc_marcatore, box_to_box, tornante, punta_pressante.
- **Forza:** annulla squadre inferiori uomo per uomo; pressione psicologica costante.
- **Deboli:** se perdi troppi duelli individuali perdi tutto insieme; le rotazioni del Calcio Totale la mandano in tilt; energia al limite.

### HaramBall `haramball`
- **Filosofia:** l'assalto senza pentimenti reso identità: tutti oltre la palla, tiro appena possibile, il portiere unico difensore designato. Nata come esperimento estremo della community manageriale, inclusa come *stress test permanente* del motore.
- **Obiettivi:** massimizzare i tiri per minuto, costi quel che costi.
- **Parametri:** 100 · 70 · 10 · 95 · 95 · 90 · 80 · 95 · 60 · 40 · 30 · 5 · 100 · 60 · 100.
- **Ruoli affini:** bomber, incursore, quinto_assalto, mezzala_assalto, portiere_moderno (per disperazione).
- **Forza:** volume di fuoco irreale contro squadre deboli; garantisce partite folli.
- **Deboli:** tutti. Ogni transizione concessa è un 2-contro-1 subito; i giocatori finiscono la benzina al 60'. Se il motore è sano, HaramBall vince 5-3 con le piccole e perde 2-6 con le grandi — è esattamente il suo scopo di collaudo.

---

## 6. Compatibilità e migrazione

- `squadra.tattica` acquisisce `identitaId` e `mentalita`; i vecchi campi
  `istruzioni.pressing/baricentro` vengono tradotti in migrazione
  (pressing alto + baricentro alto → `gegenpressing` attenuato? no: mappa
  conservativa su `equilibrata` con mentalità corrispondente — nessuna squadra
  cambia carattere per una migrazione).
- Le squadre CPU ricevono un'identità coerente col profilo della rosa
  (generatore: la squadra fisica e scarsa tecnicamente gioca `palla_lunga`, non
  `tiki_taka`) e la cambiano raramente — diventa parte della loro personalità
  e del pre-partita ("il Real Aversa non rinuncia mai al suo blocco basso").
- La UI Tattica sostituisce i due select con la scelta dell'identità (card con
  filosofia, punti di forza/deboli e verdetto di sinergia sulla propria rosa) +
  il regolatore di mentalità.
