import { generateWorld, creaStatoIniziale, VERSIONE_SALVATAGGIO } from '../src/game/generator.js';
import { accettaSponsor } from '../src/game/sponsor.js';
import { gestisciStadio, registraPartitaStadio } from '../src/game/stadio.js';
import { applicaAllenamentoGiornaliero, impostaAllenamento } from '../src/game/allenamento.js';
import { creaPromessa, valutaPromesse, armoniaSpogliatoio } from '../src/game/spogliatoio.js';
import { riepilogoFinanze, pagaStipendiMensili } from '../src/game/finanze.js';
import { finestraMercato } from '../src/game/mercato.js';
import { migra } from '../src/game/migrazioni.js';
import { mulberry32 } from '../src/game/rng.js';

const world = generateWorld(424242);
let stato = creaStatoIniziale({
  world, squadraUtenteId: world.squadre[0].id, editorAttivo: false,
  presidente: { nome: 'Test', cognome: 'Gestione' },
});
const squadraId = stato.squadraUtenteId;
const squadra = () => stato.squadre.find((s) => s.id === squadraId);

const offerta = squadra().sponsor.offerte.find((o) => o.disponibile);
const primaSponsor = squadra().budget;
const firma = accettaSponsor(stato, offerta.id);
if (!firma.esito.ok) throw new Error('Firma sponsor rifiutata.');
stato = firma.stato;
if (squadra().budget !== primaSponsor + offerta.valoreAnnuo) throw new Error('Entrata sponsor non registrata.');

const primaBar = squadra().budget;
const bar = gestisciStadio(stato, 'bar');
if (!bar.esito.ok || bar.stato.squadre.find((s) => s.id === squadraId).stadio.bar.livello !== 1) throw new Error('Potenziamento bar non applicato.');
stato = bar.stato;
if (squadra().budget !== primaBar - 12000) throw new Error('Costo del bar errato.');

const primaPartita = squadra().budget;
const avversario = stato.squadre.find((s) => s.id !== squadraId);
registraPartitaStadio(stato, squadraId, avversario.id);
if (squadra().budget <= primaPartita) throw new Error('Incasso stadio non registrato.');

const primaStipendi = squadra().budget;
pagaStipendiMensili(stato, '2026-09-01');
if (squadra().budget >= primaStipendi) throw new Error('Stipendi mensili non addebitati.');

stato = impostaAllenamento(stato, { focus: 'tecnico', intensita: 'intensa' });
const giovane = stato.giocatori.find((g) => g.squadraId === squadraId && !g.settoreGiovanile);
giovane.eta = 18;
giovane.nascosti.potenziale = 99;
giovane.nascosti.professionalita = 99;
const sommaPrima = Object.values(giovane.attributi.tecnica).reduce((a, b) => a + b, 0);
const rng = mulberry32(9);
for (let i = 0; i < 180; i++) applicaAllenamentoGiornaliero(stato, rng);
const sommaDopo = Object.values(giovane.attributi.tecnica).reduce((a, b) => a + b, 0);
if (sommaDopo <= sommaPrima) throw new Error('Allenamento senza crescita osservabile.');

stato = creaPromessa(stato, giovane.id, 'permanenza');
const promessa = stato.promesse.at(-1);
stato.giocatori.find((g) => g.id === giovane.id).squadraId = avversario.id;
valutaPromesse(stato, promessa.scadenza);
if (promessa.stato !== 'mancata') throw new Error('Promessa non valutata correttamente.');
if (armoniaSpogliatoio(stato, squadraId) < 0 || armoniaSpogliatoio(stato, squadraId) > 100) throw new Error('Armonia fuori scala.');

const riepilogo = riepilogoFinanze(squadra(), stato.stagione);
if (!riepilogo.movimenti.length || riepilogo.entrate <= 0 || riepilogo.uscite <= 0) throw new Error('Riepilogo finanziario incompleto.');
if (!finestraMercato('2028-08-25').aperta) throw new Error('Mercato non ricorrente nelle stagioni future.');

const vecchio = structuredClone(stato);
vecchio.versione = 14;
delete vecchio.promesse;
for (const s of vecchio.squadre) {
  delete s.finanze; delete s.stadio; delete s.tifosi; delete s.allenamento; delete s.spogliatoio;
  s.sponsor = [];
}
const migrato = migra(vecchio, VERSIONE_SALVATAGGIO);
if (!migrato || !migrato.squadre[0].stadio || !migrato.squadre[0].finanze || migrato.versione !== VERSIONE_SALVATAGGIO) throw new Error('Migrazione gestionale e continuità fino alla versione corrente fallita.');

console.log('Gestione valida: sponsor, stadio, allenamento, finanze, spogliatoio e migrazione v15.');
