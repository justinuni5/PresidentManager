# Prossimi passi che puoi sviluppare manualmente

Questa lista parte dallo stato del 12/09/2026. Prima di ogni modifica eseguire i controlli già disponibili:

```bash
npm run database:validate
npm run season:smoke
npm run motore:smoke
npm run build
```

## 1. Popolare il mondo senza programmare

È il lavoro più utile e meno rischioso. Seguire [`database-editor-guide.md`](database-editor-guide.md) e aggiungere, nell'ordine:

1. un paese con le sue città;
2. le competizioni e gli eventuali gironi;
3. i collegamenti di promozione/retrocessione;
4. i club manuali;
5. alcuni giocatori importanti, lasciando al generatore il completamento delle rose.

Dopo ogni blocco eseguire `npm run database:validate` e aprire sempre una **nuova carriera**: il database di una carriera esistente resta fisso.

## 2. Paginazione del mercato

È una modifica React piccola e indipendente. In `src/ui/Mercato.jsx`:

```js
const PER_PAGINA = 25;
const [pagina, setPagina] = useState(1);
```

Non applicare più `.slice(0, 40)` alla ricerca. Conservare l'elenco completo in `risultatiFiltrati`, poi derivare:

```js
const totalePagine = Math.max(1, Math.ceil(risultatiFiltrati.length / PER_PAGINA));
const risultati = risultatiFiltrati.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA);
```

Aggiungere i pulsanti precedente/successiva sotto la tabella e riportare `pagina` a 1 in ogni `onChange` dei filtri. Aggiungere infine un test manuale con “Solo nel budget” disattivato, verificando che l'ultimo giocatore sia raggiungibile.

## 3. Calibrare la reputazione già visibile

Club, giocatori e competizioni hanno già una reputazione 1–300 e la mostrano nelle pagine pertinenti. Il prossimo lavoro manuale utile è assegnare valori coerenti nel JSON e confrontare club dello stesso livello. L'effetto completo sulle trattative resta una fase separata perché richiede una formula comune tra prestigio, stipendio, livello e ruolo promesso.

## 4. Aggiungere un nuovo campo al database

Per esempio, per `capienzaStadio`:

1. aggiungere il campo agli oggetti club nel JSON;
2. farlo leggere dal generatore con un valore di riserva: `capienzaStadio: clubManuale?.capienzaStadio ?? 1000`;
3. aggiungere il controllo in `validaDatabase`;
4. aumentare `schemaVersion` nel JSON solo se il nuovo campo diventa obbligatorio o cambia significato a dati esistenti;
5. se il campo entra anche nei salvataggi, aumentare `VERSIONE_SALVATAGGIO` e aggiungere un migratore in `migrazioni.js`.

Questa procedura vale anche per reputazione, clausole staff e future proprietà dello stadio. I campi opzionali con un valore di riserva permettono ai vecchi database di continuare a funzionare.

## 5. Lavori che conviene lasciare al prossimo blocco coordinato

- Effetto reputazione sulle trattative: richiede una formula comune tra club, giocatore, stipendio, livello e ruolo nella rosa.
- Staff iniziale e clausole: coinvolge generatore, finanze, candidati, licenziamento, UI e migrazione.
- Età, contratti, ritiri e nuovi giovani: devono essere eseguiti una sola volta per rollover e richiedono regole di sostituzione delle rose.
- Competizioni continentali e coppe con fase a gironi: la coppa nazionale a eliminazione diretta è già attiva; questi formati più complessi restano nel prossimo blocco coordinato.
- Editor visuale: va costruito quando il JSON contiene abbastanza dati reali da capire quali operazioni ripetitive deve velocizzare.

## 6. Controllo minimo per una nuova piramide

Dopo aver aggiunto una piramide manuale, creare una carriera nel nuovo paese e controllare:

- tutti i campionati compaiono nel selettore;
- ogni campionato contiene il numero dichiarato di club;
- il calendario non ha giornate dispari o squadre mancanti;
- al termine della stagione, le squadre indicate dai collegamenti cambiano davvero lega;
- la seconda stagione mostra calendari vuoti e l'evento iniziale in ufficio.
