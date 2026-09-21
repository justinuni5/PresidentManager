// Confronto A/B riproducibile tra un portiere debole e uno forte nella
// stessa partita. Serve a verificare che le differenze individuali arrivino
// davvero al risultato e agli esiti (prese/respinte/uscite), non solo all'OVR.
import { generateWorld } from '../src/game/generator.js';
import { simulaPartitaV2 } from '../src/game/motore/adapter.js';

const N = Number.parseInt(process.argv[2], 10) || 100;
const base = generateWorld(771922);
const partita = base.leghe[0].calendario[0].partite[0];

function impostaPortiere(stato, squadraId, valore) {
  for (const g of stato.giocatori.filter((x) => x.squadraId === squadraId && x.ruolo === 'POR' && !x.settoreGiovanile)) {
    for (const chiave of ['riflessi', 'presa', 'posizionamentoPortiere', 'uscite']) g.attributi.portiere[chiave] = valore;
    for (const chiave of ['agilita', 'salto']) g.attributi.fisico[chiave] = valore;
    for (const chiave of ['concentrazione', 'freddezza', 'decisioni', 'anticipazione']) g.attributi.mentale[chiave] = valore;
  }
}

function prova(valore) {
  const stato = structuredClone(base);
  impostaPortiere(stato, partita.trasfertaId, valore);
  const tot = { subiti: 0, parate: 0, prese: 0, respinte: 0, uscite: 0 };
  for (let i = 0; i < N; i++) {
    const r = simulaPartitaV2(stato, partita.casaId, partita.trasfertaId, 90000 + i);
    tot.subiti += r.golCasa;
    const por = r.matchState.lati.trasferta.giocatori.find((p) => p.portiere);
    tot.parate += por?.statsPartita.parate || 0;
    tot.prese += por?.statsPartita.prese || 0;
    tot.respinte += por?.statsPartita.respinte || 0;
    tot.uscite += por?.statsPartita.usciteRiuscite || 0;
  }
  return Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, Math.round(v / N * 100) / 100]));
}

const debole = prova(25);
const forte = prova(90);
console.log(`Confronto portieri su ${N} partite identiche per profilo:`);
console.table({ debole, forte });
if (!(forte.subiti < debole.subiti && forte.prese > debole.prese)) {
  console.error('CALIBRAZIONE FALLITA: il profilo forte non produce il vantaggio atteso.');
  process.exitCode = 1;
}
