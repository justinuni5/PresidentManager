import assert from 'node:assert/strict';
import { assegnaPremiStagione } from '../src/game/premi.js';

const ruoli = ['POR', 'DC', 'DC', 'DC', 'DC', 'CM', 'CM', 'CM', 'ST', 'ST', 'ST', 'ST'];
const giocatori = ruoli.map((ruolo, i) => {
  const capocannoniere = i === 8;
  const media = capocannoniere ? 6.6 : i >= 9 ? 7.35 - (i - 9) * .1 : 7;
  return {
    id: i + 1, nome: 'Test', cognome: `Giocatore${i + 1}`, squadraId: 1, ruolo,
    settoreGiovanile: false, eta: 25, trofei: [],
    statistiche: { presenze: 34, sommaVoti: media * 34, gol: capocannoniere ? 56 : i >= 9 ? 20 : 0, assist: 0, parate: 0 },
  };
});
const stato = { stagione: '2026/27', giocatori, squadre: [{ id: 1, nome: 'Club Test' }], premi: [] };
const lega = { id: 1, nome: 'Lega Test', squadre: [1], calendario: Array.from({ length: 34 }, (_, i) => ({ giornata: i + 1 })) };

assegnaPremiStagione(stato, lega, () => {});
const squadraAnno = stato.premi.find((p) => p.categoria === 'squadra_anno');
assert.ok(squadraAnno, "La squadra dell'anno deve essere assegnata");
assert.ok(squadraAnno.formazione.some((f) => f.titolare && f.giocatoreId === 9), 'Il capocannoniere dominante deve entrare nei titolari');
console.log("Premi validi: il capocannoniere dominante entra nella Squadra dell'Anno.");
