import { generateWorld, creaStatoIniziale } from '../src/game/generator.js';
import { rinnovaContratto } from '../src/game/carriere.js';
import { finestraMercato, ingaggiaSvincolato, puoVendereUtente } from '../src/game/mercato.js';

const world = generateWorld(14092026);
let stato = creaStatoIniziale({ world, squadraUtenteId: world.squadre[0].id, editorAttivo: false, presidente: { nome: 'Test', cognome: 'Contratti' } });
const senior = stato.giocatori.find((g) => g.squadraId === stato.squadraUtenteId && !g.settoreGiovanile);
senior.contrattoScadenza = 2027;
const primo = rinnovaContratto(stato, senior.id, 3, 10_000_000);
if (!primo.esito.ok) throw new Error('Primo rinnovo rifiutato.');
stato = primo.stato;
const rinnovato = stato.giocatori.find((g) => g.id === senior.id);
if (rinnovato.contrattoScadenza !== 2029 || !rinnovato.bloccoOperazioniFino) throw new Error('Rinnovo o blocco semestrale non applicato.');
const immediato = rinnovaContratto(stato, senior.id, 5, 10_000_000);
if (immediato.esito.ok || !immediato.esito.messaggio.includes('recentemente')) throw new Error('Secondo rinnovo consentito entro sei mesi.');

stato.dataCorrente = '2027-03-01';
const accorcia = rinnovaContratto(stato, senior.id, 2, 10_000_000);
if (accorcia.esito.ok || stato.giocatori.find((g) => g.id === senior.id).contrattoScadenza !== 2029) throw new Error('Il contratto è stato accorciato.');

const libero = stato.giocatori.find((g) => g.squadraId !== stato.squadraUtenteId && !g.settoreGiovanile);
libero.squadraId = null; libero.svincolato = true; libero.contrattoScadenza = null;
stato.dataCorrente = '2027-04-15';
if (finestraMercato(stato.dataCorrente).aperta) throw new Error('La data di test deve essere fuori mercato.');
const firma = ingaggiaSvincolato(stato, libero.id, 2, 10_000_000);
if (!firma.esito.ok) throw new Error(`Svincolato non ingaggiabile fuori mercato: ${firma.esito.messaggio}`);
const ingaggiato = firma.stato.giocatori.find((g) => g.id === libero.id);
if (ingaggiato.squadraId !== stato.squadraUtenteId || ingaggiato.contrattoScadenza !== 2029) throw new Error('Firma dello svincolato incompleta.');
if (puoVendereUtente(firma.stato, ingaggiato).ok) throw new Error('Giocatore appena ingaggiato immediatamente cedibile.');

console.log('Contratti validi: blocco di sei mesi, nessuna scadenza ridotta e svincolati ingaggiabili fuori mercato.');
