import { generateWorld, creaStatoIniziale } from '../src/game/generator.js';
import { iniziaNuovaStagione, stagioneTerminata } from '../src/game/continuita.js';
import { calcolaClassifica } from '../src/game/stats.js';
import { DATABASE_BASE } from '../src/game/database.js';

const databaseStagione = structuredClone(DATABASE_BASE);
databaseStagione.competizioni.find((c) => c.id === 'ita-serie-b').attiva = true;
const world = generateWorld(23091993, { database: databaseStagione });
const squadraUtenteId = world.leghe[0].squadre[0];
const stato = creaStatoIniziale({
  world, squadraUtenteId, editorAttivo: false,
  presidente: { nome: 'Test', cognome: 'Stagione' },
});
for (const lega of stato.leghe) {
  for (const giornata of lega.calendario) for (const p of giornata.partite) {
    p.golCasa = p.casaId % 3;
    p.golTrasferta = p.trasfertaId % 2;
  }
  if (lega.tipo === 'coppa_nazionale') lega.statoCoppa = { ...lega.statoCoppa, finalizzata: true, vincitoreId: lega.squadre[0] };
}
if (!stagioneTerminata(stato)) throw new Error('La stagione completa non viene riconosciuta.');
const sopra = stato.leghe.find((l) => l.codice === 'ita-serie-a');
const sotto = stato.leghe.find((l) => l.codice === 'ita-serie-b');
const retrocessa = calcolaClassifica(sopra, stato.squadre).at(-1).squadra.id;
const promossa = calcolaClassifica(sotto, stato.squadre)[0].squadra.id;
stato.giocatori[0].statistiche.presenze = 7;
const nuovo = iniziaNuovaStagione(stato);
if (nuovo.stagione !== '2027/28') throw new Error('Stagione successiva errata.');
if (!nuovo.leghe.find((l) => l.codice === 'ita-serie-a').squadre.includes(promossa)) throw new Error('Promozione non applicata.');
if (!nuovo.leghe.find((l) => l.codice === 'ita-serie-b').squadre.includes(retrocessa)) throw new Error('Retrocessione non applicata.');
if (nuovo.giocatori[0].statistiche.presenze !== 0 || nuovo.giocatori[0].stagioni[0].statistiche.presenze !== 7) throw new Error('Archivio statistiche errato.');
if (nuovo.leghe.some((l) => l.calendario.some((g) => g.partite.some((p) => p.golCasa !== null)))) throw new Error('Il nuovo calendario contiene risultati.');
console.log('Continuità stagionale valida: archivio, promozioni/retrocessioni e calendari rigenerati.');

const databaseManuale = structuredClone(DATABASE_BASE);
databaseManuale.competizioni.push({ id: 'ita-test-manuale', paeseId: 'italia', nome: 'Test manuale', tipo: 'campionato', attiva: true, livello: 9, numeroSquadre: 2, reputazione: 1, forzaMedia: 20 });
databaseManuale.club.push({
  id: 'club-test', competizioneId: 'ita-test-manuale', nome: 'Club Test',
  abbreviazione: 'TST', citta: 'Brescia', colori: ['#000000', '#ffffff'], reputazione: 77,
});
databaseManuale.giocatori.push({
  id: 'giocatore-test', clubId: 'club-test', nome: 'Ada', cognome: 'Prova',
  ruolo: 'CM', eta: 24, reputazione: 66, attributi: { tecnica: { passaggio: 61 } },
});
const manuale = generateWorld(12, { database: databaseManuale, paesiAttivi: ['italia'] });
const clubTest = manuale.squadre.find((s) => s.codiceDatabase === 'club-test');
const giocatoreTest = manuale.giocatori.find((g) => g.codiceDatabase === 'giocatore-test');
if (!clubTest || clubTest.reputazione !== 77 || !giocatoreTest || giocatoreTest.reputazione !== 66) {
  throw new Error('Club o giocatore manuale non materializzato dal database.');
}
console.log('Contenuti manuali validi: club, giocatore e reputazioni caricati dal JSON.');
