import assert from 'node:assert/strict';
import { generateWorld, creaStatoIniziale } from '../src/game/generator.js';
import { giocaGiornata } from '../src/game/engine.js';
import { DATABASE_BASE } from '../src/game/database.js';

const databaseCoppa = structuredClone(DATABASE_BASE);
const definizioneCoppa = databaseCoppa.competizioni.find((c) => c.id === 'ita-coppa-italia');
definizioneCoppa.attiva = true;
definizioneCoppa.partecipanti = { competizioniId: ['ita-serie-a'] };
definizioneCoppa.turni = [
  { id: 'primo-turno', nome: 'Primo turno', numeroClub: 20, andataRitorno: false },
  { id: 'ottavi', nome: 'Ottavi di finale', numeroClub: 16, andataRitorno: false },
  { id: 'quarti', nome: 'Quarti di finale', numeroClub: 8, andataRitorno: false },
  { id: 'semifinali', nome: 'Semifinali', numeroClub: 4, andataRitorno: true },
  { id: 'finale', nome: 'Finale', numeroClub: 2, andataRitorno: false },
];
const world = generateWorld(24051999, { database: databaseCoppa });
let stato = creaStatoIniziale({ world, squadraUtenteId: world.leghe[0].squadre[0], editorAttivo: false, presidente: { nome: 'Test', cognome: 'Coppa' } });
let coppa = stato.leghe.find((c) => c.tipo === 'coppa_nazionale');
assert.ok(coppa, 'La coppa nazionale attiva deve essere materializzata');
assert.equal(coppa.squadre.length, 20, 'La coppa di test deve includere tutti i club di Serie A');
assert.equal(coppa.calendario[0].partite.length, 4, 'Con 20 club servono 4 gare e 12 bye per arrivare agli ottavi');
assert.equal(coppa.calendario[0].qualificateAutomatiche.length, 12);

let sicurezza = 0;
while (!coppa.statoCoppa.finalizzata && sicurezza++ < 10) {
  const prossimo = coppa.calendario.find((g) => g.partite.some((p) => p.golCasa === null));
  assert.ok(prossimo, 'Ogni turno incompleto deve avere una data da giocare');
  stato.dataCorrente = prossimo.data;
  stato = giocaGiornata(stato).stato;
  coppa = stato.leghe.find((c) => c.codice === 'ita-coppa-italia');
}

assert.equal(coppa.statoCoppa.finalizzata, true, 'La coppa deve arrivare alla finale');
assert.ok(coppa.statoCoppa.vincitoreId, 'La finale deve produrre un vincitore');
assert.equal(coppa.calendario.filter((g) => g.turnoId === 'semifinali').length, 2, 'Le semifinali devono avere andata e ritorno');
assert.ok(stato.squadre.find((s) => s.id === coppa.statoCoppa.vincitoreId).trofei.some((t) => t.legaId === coppa.id));
const conPresenzeCoppa = stato.giocatori.find((g) => g.statisticheCompetizioni?.['ita-coppa-italia']?.presenze > 0);
assert.ok(conPresenzeCoppa, 'Le statistiche della coppa devono essere registrate separatamente');
assert.equal(conPresenzeCoppa.statisticheCompetizioni['ita-serie-a']?.presenze || 0, 0, 'Le gare di coppa non devono contaminare le statistiche del campionato');

console.log('Coppa nazionale valida: bye, turni, andata/ritorno, rigori e trofeo finale.');
