import assert from 'node:assert/strict';
import { DATABASE_BASE } from '../src/game/database.js';
import { generateWorld, creaStatoIniziale } from '../src/game/generator.js';
import { migra } from '../src/game/migrazioni.js';
import { calcolaClassifica } from '../src/game/stats.js';
import { distribuisciPremiClassifica } from '../src/game/finanze.js';
import { iniziaNuovaStagione } from '../src/game/continuita.js';
import { eventoCorrente, avanza } from '../src/game/avanzamento.js';
import { concludiInizioStagione } from '../src/game/stagione.js';

const mondoNuovo = generateWorld(120, { paesiAttivi: ['italia'] });
assert.equal(mondoNuovo.leghe.filter((l) => l.tipo === 'campionato').length, 2);
assert.equal(mondoNuovo.squadre.filter((s) => s.legaId === mondoNuovo.leghe.find((l) => l.codice === 'ita-serie-b').id).length, 20);
let provaAvanzamento = creaStatoIniziale({ world: mondoNuovo, squadraUtenteId: mondoNuovo.squadre[0].id,
  presidente: { nome: 'Test', cognome: 'Calendario' } });
provaAvanzamento = concludiInizioStagione(provaAvanzamento, { categoriaId: 'prima_meta', discorsoId: 'equilibrato' });
const garaB = provaAvanzamento.leghe.find((l) => l.codice === 'ita-serie-b').calendario[0];
garaB.data = '2026-08-30';
provaAvanzamento.dataCorrente = garaB.data;
assert.equal(eventoCorrente(provaAvanzamento)?.tipo, 'cpuMatchday');
provaAvanzamento = avanza(provaAvanzamento).stato;
assert.ok(garaB.partite.every((p) => provaAvanzamento.leghe.find((l) => l.codice === 'ita-serie-b').calendario[0].partite.find((x) => x.id === p.id).golCasa !== null));

const vecchioDatabase = structuredClone(DATABASE_BASE);
vecchioDatabase.competizioni.find((c) => c.id === 'ita-serie-b').attiva = false;
const vecchioMondo = generateWorld(120, { database: vecchioDatabase, paesiAttivi: ['italia'] });
const utenteId = vecchioMondo.squadre[0].id;
let vecchio = creaStatoIniziale({ world: vecchioMondo, squadraUtenteId: utenteId, presidente: { nome: 'Test', cognome: 'B' } });
vecchio.versione = 21;
vecchio.dataCorrente = '2026-12-15';
const idLegaA = vecchio.leghe.find((l) => l.codice === 'ita-serie-a').id;
let stato = migra(vecchio, 22);
assert.ok(stato);
const serieA = stato.leghe.find((l) => l.codice === 'ita-serie-a');
const serieB = stato.leghe.find((l) => l.codice === 'ita-serie-b');
assert.equal(serieA.id, idLegaA);
assert.equal(serieB.squadre.length, 20);
assert.equal(stato.squadre.filter((s) => s.legaId === serieB.id).length, 20);
assert.ok(serieB.calendario.some((g) => g.data < stato.dataCorrente && g.partite.every((p) => p.golCasa !== null)));
assert.ok(serieB.calendario.some((g) => g.data > stato.dataCorrente && g.partite.every((p) => p.golCasa === null)));
assert.ok(stato.collegamenti.some((c) => c.daCompetizioneId === 'ita-serie-b' && c.aCompetizioneId === 'ita-serie-a'));
assert.equal(new Set([...stato.squadre.map((s) => s.id), ...stato.giocatori.map((g) => g.id), ...stato.leghe.map((l) => l.id)]).size,
  stato.squadre.length + stato.giocatori.length + stato.leghe.length);

for (const lega of [serieA, serieB]) for (const giornata of lega.calendario) for (const partita of giornata.partite) {
  partita.golCasa ??= 1;
  partita.golTrasferta ??= 0;
}
const premiB = distribuisciPremiClassifica(stato, serieB, calcolaClassifica(serieB, stato.squadre));
assert.equal(premiB.reduce((somma, p) => somma + p.importo, 0), 10_000_000);
assert.ok(premiB[0].importo > premiB.at(-1).importo);
stato.notizie.push({ id: 9_999_991, data: '2027-03-01', tipo: 'club', titolo: 'Vecchio', testo: '' });
stato.notizie.push({ id: 9_999_992, data: '2027-04-15', tipo: 'club', titolo: 'Recente', testo: '' });
const nuova = iniziaNuovaStagione(stato);
assert.notEqual(nuova, stato);
assert.ok(!nuova.notizie.some((n) => n.titolo === 'Vecchio'));
assert.ok(nuova.notizie.some((n) => n.titolo === 'Recente'));
assert.equal(nuova.leghe.find((l) => l.codice === 'ita-serie-b').squadre.length, 20);
console.log('Serie B e premi validi: attivazione, migrazione, premi distinti e pulizia dei messaggi al cambio stagione.');
