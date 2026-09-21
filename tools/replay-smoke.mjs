import assert from 'node:assert/strict';
import { generateWorld } from '../src/game/generator.js';
import { simulaPartitaV2 } from '../src/game/motore/adapter.js';
import { proiettaReplay } from '../src/game/motore/partita/replay.js';
import { registraTiro } from '../src/game/motore/partita/capture.js';
import { preparaTimeline, campionaReplay, eventoVisibile } from '../src/game/motore/partita/timeline.js';
import { iniziaPartitaInterattivaV2, giocaSegmentoInterattivoV2, effettuaCambioInterattivoV2, panchinaInterattivaV2 } from '../src/game/motore/partita/interattivo.js';

const world = generateWorld(777001), partita = world.leghe[0].calendario[0].partite[0];
const stato = { seed: 777001, ...world, squadraUtenteId: partita.casaId };
const semplice = simulaPartitaV2(stato, partita.casaId, partita.trasfertaId, 11);
const completo = simulaPartitaV2(stato, partita.casaId, partita.trasfertaId, 11, { lod: 'COMPLETO' });
assert.deepEqual(completo.matchState.eventi, semplice.matchState.eventi);
assert.deepEqual(completo.statistichePartita, semplice.statistichePartita);
assert.equal(semplice.snapshots.length, 0);
const replay = proiettaReplay(stato, completo.matchState, {casa:partita.casaId,trasferta:partita.trasfertaId});
const timeline = preparaTimeline(replay.frames);
assert.ok(timeline.length > 100);
assert.ok(timeline.every((f,i) => i === 0 || f.at > timeline[i-1].at));
assert.ok(timeline.every((f,i) => i === 0 || f.eventiCount >= timeline[i-1].eventiCount));
for (const e of completo.eventi.filter(e => e.tipo === 'gol')) {
  const termine = timeline.findIndex(f => f.eventiCount >= e.indiceEvento);
  assert.ok(termine > 0);
  assert.equal(eventoVisibile(e, campionaReplay(timeline,timeline[termine].at - 0.01)),false);
  const arrivo = campionaReplay(timeline,timeline[termine].at);
  assert.equal(eventoVisibile(e,arrivo),true);
  assert.equal(arrivo.evento?.esito,'gol');
}
console.log('OK: replay non altera risultati/statistiche; gol rivelati solo all’arrivo del tiro.');

const frame = {t:1,tempo:1,minuto:45,eventiCount:0,palla:{x:0,y:0},portatoreId:1,giocatori:[{id:1,x:0,y:0}]};
const sample = preparaTimeline([frame,{...frame,t:2,durata:1000,palla:{x:10,y:20},giocatori:[{id:1,x:10,y:20}],eventiCount:1}]);
assert.equal(campionaReplay(sample,500).palla.x,5);
assert.deepEqual(campionaReplay(sample,500),campionaReplay(sample,500));
assert.equal(campionaReplay(sample,500).eventiCount,0);
assert.equal(campionaReplay(sample,1000).eventiCount,1);
const cut = preparaTimeline([frame,{...frame,tempo:2,minuto:45,durata:100,taglio:true,palla:{x:90,y:90}}]);
assert.equal(campionaReplay(cut,99).palla.x,0);
assert.equal(campionaReplay(cut,100).palla.x,90);
assert.equal(eventoVisibile({tempo:2,minuto:46}, {...frame,minuto:48}), false);
assert.equal(eventoVisibile({tempo:1,minuto:48}, {...frame,tempo:2,minuto:45}), true);
assert.equal(campionaReplay([],10),null);
console.log('OK: interpolazione, pausa, stacchi, recupero e timeline vuota.');

for(const esito of ['gol','parato','parato_corner','palo','fuori']) {
  const m = structuredClone(completo.matchState);
  m.snapshots = [];
  const p = m.lati.casa.giocatori.find(p => !p.portiere);
  const k = m.lati.trasferta.giocatori.find(p => p.portiere);
  const before = structuredClone(m.lati);
  registraTiro(m,{tipo:'tiro',lato:'casa',attore:p.id,contro:k.id,esito});
  assert.equal(m.snapshots[0].palla.x,p.pos.x);
  assert.equal(m.snapshots[1].evento.esito,esito);
  assert.deepEqual(m.lati,before);
  if(esito === 'gol') assert.equal(m.snapshots[1].palla.y,99);
  if(esito === 'parato') assert.equal(m.snapshots[1].palla.x,k.pos.x);
  if(esito === 'palo' || esito === 'parato_corner') assert.equal(m.snapshots.length,4);
}
console.log('OK: esiti dei tiri distinti e nessuna mutazione dei giocatori.');

let pkt = iniziaPartitaInterattivaV2(stato,partita.id,world.leghe[0].id,1,partita.casaId,partita.trasfertaId);
let sostituito;
for(let i=0;i<4;i++) {
  const vecchiFrames = pkt.replay.frames.length;
  const precedente = JSON.stringify(pkt.replay.frames);
  const next = giocaSegmentoInterattivoV2(stato,pkt);
  assert.equal(JSON.stringify(pkt.replay.frames),precedente);
  assert.deepEqual(next.replay.frames.slice(0,vecchiFrames),pkt.replay.frames);
  assert.ok(next.replay.frames.length > vecchiFrames);
  assert.equal(next.indiceSegmento,i+1);
  assert.equal(next.finita,i===3);
  if(sostituito) {
    const nuovi = next.replay.frames.slice(vecchiFrames);
    assert.ok(nuovi.some(f => f.giocatori.some(p => p.id===sostituito)));
  }
  pkt=next;
  if(i===0) {
    const fuori=pkt.formazioneCasa.find(p => !p.portiere && !p.espulso);
    const dentro=panchinaInterattivaV2(pkt).find(p => p.ruolo !== 'POR');
    if(fuori && dentro) {
      pkt=effettuaCambioInterattivoV2(stato,pkt,fuori.giocatoreId,dentro.id);
      sostituito=dentro.id;
      assert.equal(pkt.formazioneCasa.some(p => p.giocatoreId===dentro.id),true);
    }
  }
}
assert.ok(sostituito);
const fine = preparaTimeline(pkt.replay.frames);
assert.equal(pkt.eventi.filter(e=>eventoVisibile(e,campionaReplay(fine,fine.at(-1).at),true)).length,pkt.eventi.length);
console.log('OK: quattro segmenti, sostituzione, storico stabile e risultato finale.');
console.log('Tutti i controlli replay superati.');
