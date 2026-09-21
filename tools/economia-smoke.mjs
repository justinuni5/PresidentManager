import assert from 'node:assert/strict';
import { generateWorld, creaStatoIniziale } from '../src/game/generator.js';
import { valoreMercato } from '../src/game/economia.js';
import { distribuisciDirittiTvSerieA, distribuisciPremiClassifica } from '../src/game/finanze.js';
import { calcolaClassifica } from '../src/game/stats.js';
import { DATABASE_BASE } from '../src/game/database.js';
import { migra } from '../src/game/migrazioni.js';

const mondo = generateWorld(123, { paesiAttivi: ['italia'] });
const stato = creaStatoIniziale({ world: mondo, squadraUtenteId: mondo.squadre[0].id,
  presidente: { nome: 'Test', cognome: 'Economia' } });
const lega = stato.leghe.find((l) => l.codice === 'ita-serie-a');
const club = stato.squadre.filter((s) => lega.squadre.includes(s.id));
const giocatori = stato.giocatori.filter((g) => lega.squadre.includes(g.squadraId) && !g.settoreGiovanile);
const totaleValori = giocatori.reduce((tot, g) => tot + g.valore, 0);
assert.ok(totaleValori > 3_000_000_000 && totaleValori < 7_000_000_000,
  `Cartellini Serie A fuori scala: €${Math.round(totaleValori / 1e6)}m`);

const modello = structuredClone(giocatori[0]);
for (const gruppo of Object.values(modello.attributi)) for (const chiave of Object.keys(gruppo)) gruppo[chiave] = 90;
modello.nascosti.potenziale = 95;
modello.reputazione = 200;
modello.eta = 19;
modello.ruolo = 'ST';
const giovaneAttaccante = valoreMercato(modello);
modello.eta = 32;
const veteranoAttaccante = valoreMercato(modello);
assert.ok(giovaneAttaccante > veteranoAttaccante * 3);
modello.eta = 26;
const attaccante = valoreMercato(modello);
modello.ruolo = 'POR';
assert.ok(valoreMercato(modello) < attaccante * 0.7, 'I portieri non risultano meno costosi degli attaccanti.');

assert.equal(club.find((s) => s.codiceDatabase === 'ita-inter').stadio.capienza, 75900);
assert.equal(club.find((s) => s.codiceDatabase === 'ita-como').stadio.capienza, 13600);
assert.ok(club.every((s) => s.stadio.prezzoBiglietto > 9));
assert.ok(club.some((s) => s.isCpu && s.sponsor.contratti.length > 0));

const prima = club.reduce((tot, s) => tot + s.finanze.movimenti
  .filter((m) => m.categoria === 'diritti-tv').reduce((sum, m) => sum + m.importo, 0), 0);
assert.ok(Math.abs(prima - 765_000_000) <= club.length);
distribuisciDirittiTvSerieA(stato);
const dopo = club.reduce((tot, s) => tot + s.finanze.movimenti
  .filter((m) => m.categoria === 'diritti-tv').reduce((sum, m) => sum + m.importo, 0), 0);
assert.equal(dopo, prima, 'I diritti TV sono stati versati due volte nella stessa stagione.');
for (const giornata of lega.calendario) for (const partita of giornata.partite) { partita.golCasa = 1; partita.golTrasferta = 0; }
const precedente = structuredClone(stato);
const vecchiaLega = precedente.leghe.find((l) => l.codice === 'ita-serie-a');
delete vecchiaLega.modelloTvPremi;
for (const squadra of precedente.squadre.filter((s) => vecchiaLega.squadre.includes(s.id))) {
  for (const movimento of squadra.finanze.movimenti.filter((m) => m.categoria === 'diritti-tv')) {
    const aumento = Math.round(movimento.importo / 0.85) - movimento.importo;
    movimento.importo += aumento;
    squadra.budget += aumento;
  }
}
distribuisciPremiClassifica(precedente, vecchiaLega, calcolaClassifica(vecchiaLega, precedente.squadre));
const bilancioTvVecchio = precedente.squadre.filter((s) => vecchiaLega.squadre.includes(s.id))
  .flatMap((s) => s.finanze.movimenti.filter((m) => ['diritti-tv', 'rettifica-tv', 'premio-piazzamento'].includes(m.categoria)))
  .reduce((tot, m) => tot + m.importo, 0);
assert.ok(Math.abs(bilancioTvVecchio - 900_000_000) <= 40);
const premi = distribuisciPremiClassifica(stato, lega, calcolaClassifica(lega, stato.squadre));
assert.equal(premi.length, 20);
assert.equal(premi.reduce((tot, p) => tot + p.importo, 0), 135_000_000);
assert.ok(premi[0].importo > premi.at(-1).importo);
assert.deepEqual(distribuisciPremiClassifica(stato, lega, calcolaClassifica(lega, stato.squadre)), []);
stato.stagione = '2027/28';
distribuisciDirittiTvSerieA(stato);
const nuovoAnno = club.reduce((tot, s) => tot + s.finanze.movimenti
  .filter((m) => m.categoria === 'diritti-tv').reduce((sum, m) => sum + m.importo, 0), 0);
assert.ok(Math.abs(nuovoAnno - prima * 2) <= club.length);

const vecchio = structuredClone(stato);
vecchio.versione = 20;
const vecchiaAtalanta = vecchio.squadre.find((s) => s.codiceDatabase === 'ita-atalanta');
vecchiaAtalanta.stadio.capienza = 5700;
vecchiaAtalanta.tifosi.numero = 6000;
delete vecchiaAtalanta.stadio.prezzoBiglietto;
const vecchioGiocatore = vecchio.giocatori.find((g) => g.squadraId === vecchiaAtalanta.id && !g.settoreGiovanile);
vecchioGiocatore.valore = 350_000;
const contrattoEsistente = vecchioGiocatore.stipendio;
const migrato = migra(vecchio, 21);
assert.equal(migrato.squadre.find((s) => s.id === vecchiaAtalanta.id).stadio.capienza, 24300);
assert.ok(migrato.giocatori.find((g) => g.id === vecchioGiocatore.id).valore > 350_000);
assert.equal(migrato.giocatori.find((g) => g.id === vecchioGiocatore.id).stipendio, contrattoEsistente);

const database = structuredClone(DATABASE_BASE);
database.giocatori.push({ id: 'calibrazione-manuale', clubId: 'ita-inter', nome: 'Test', cognome: 'Manuale', ruolo: 'ST',
  eta: 19, abilitaAttuale: 90, valore: 123_456_789, stipendio: 4_000_000, reputazione: 230 });
const manuale = generateWorld(123, { database, paesiAttivi: ['italia'] }).giocatori
  .find((g) => g.codiceDatabase === 'calibrazione-manuale');
assert.equal(manuale.valore, 123_456_789);
assert.equal(manuale.stipendio, 4_000_000);

console.log(`Economia Serie A valida: ${club.length} club, €${(totaleValori / 1e9).toFixed(2)} mld in cartellini, stadi, sponsor e €${((prima + 135_000_000) / 1e6).toFixed(0)} mln TV inclusi i premi senza duplicati.`);
