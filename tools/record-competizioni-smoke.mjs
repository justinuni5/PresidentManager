import { recordCompetizione } from '../src/game/recordCompetizioni.js';
import { statisticheVuote } from '../src/game/stats.js';

const statistiche = (gol, assist, presenze) => ({ ...statisticheVuote(), gol, assist, presenze });
const lega = {
  id: 10, codice: 'test-lega', storia: { vincitori: [] }, squadre: [1, 2],
  calendario: [{ giornata: 1, data: '2027-09-01', partite: [{ casaId: 1, trasfertaId: 2, golCasa: 2, golTrasferta: 0 }] },
    { giornata: 2, data: '2027-09-08', partite: [{ casaId: 2, trasfertaId: 1, golCasa: null, golTrasferta: null }] }],
};
const stato = {
  stagione: '2027/28', dataCorrente: '2027-09-02', leghe: [lega],
  squadre: [{ id: 1, nome: 'Club Uno' }, { id: 2, nome: 'Club Due' }],
  giocatori: [{
    id: 101, nome: 'Carlo', cognome: 'Bomber', squadraId: 1, eta: 19, settoreGiovanile: false, ritirato: false,
    statistiche: statistiche(12, 3, 5),
    stagioni: [{ stagione: '2026/27', squadraId: 1, statistiche: statistiche(50, 8, 30) }],
    primatiCompetizioni: { 'test-lega': { esordio: { stagione: '2027/28', data: '2027-09-01', eta: 19, squadraId: 1 }, primoGol: { stagione: '2027/28', data: '2027-09-01', eta: 19, squadraId: 1 } } },
  }],
  archivioStagioni: [{
    stagione: '2026/27',
    classifiche: [{ legaId: 10, codice: 'test-lega', posizioni: [{ squadraId: 1, posizione: 1, punti: 80 }, { squadraId: 2, posizione: 2, punti: 61 }] }],
  }],
};

const records = recordCompetizione(stato, lega);
const trova = (titolo) => records.find((r) => r.titolo === titolo);
if (trova('Gol in una stagione')?.valore !== 50) throw new Error('Il primato stagionale da 50 gol è stato sostituito dalla stagione corrente.');
if (trova('Gol totali nella competizione')?.valore !== 62) throw new Error('I gol di carriera non sono stati sommati tra le stagioni.');
if (trova('Campionati vinti')?.detentore !== 'Club Uno' || trova('Campionati vinti')?.valore !== 1) throw new Error('I titoli storici dei club non sono stati ricostruiti.');
if (trova('Esordiente più giovane')?.valore !== 19) throw new Error('Il record anagrafico dell’esordio non è stato registrato.');
console.log('Record validi: primati permanenti, totali multi-stagione, club e dati anagrafici.');
