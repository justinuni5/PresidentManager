// Smoke test delle fondamenta del motore (M0): valida che il registry
// accetti config ben formati, respinga quelli malformati, che la griglia
// zone sia coerente e che la catena RNG sia deterministica.
// Uso: node tools/motore-smoke.mjs
import assert from 'node:assert/strict';
import {
  registraRuolo, ottieniRuolo, elencaRuoli,
  registraTattica, ottieniTattica,
  registraProvider, ottieniProvider,
  svuotaRegistro,
} from '../src/game/motore/registry.js';
import { ZONE, ELENCO_ZONE, ADIACENZE, esisteZona } from '../src/game/motore/config/zone.js';
import { subSeed, creaStreamPossesso } from '../src/game/motore/rng.js';
import { RUOLI_CATALOGO } from '../src/game/motore/config/ruoli.js';
import { registraCatalogoRuoli, suitability, bandaSuitability, ruoliPerPosizione, ruoloDefault } from '../src/game/motore/suitability.js';
import { IDENTITA_CATALOGO } from '../src/game/motore/config/identita.js';
import {
  registraCatalogoIdentita, elencaIdentita, ottieniIdentita,
  parametriEfficaci, modificatoriForze, quotaPossesso,
  punteggioIdentitaRosa, mentalitaCpu,
} from '../src/game/motore/identita.js';
import { RUOLI, GRIGLIA_SLOT, PRESET_GRIGLIA } from '../src/game/ruoli.js';
import { migra } from '../src/game/migrazioni.js';
import { generateWorld } from '../src/game/generator.js';
import { simulaPartitaV2 } from '../src/game/motore/adapter.js';
import { rilevaTrigger, bonusTrigger } from '../src/game/motore/partita/pressing.js';
import { fuoriGioco, modalitaMarcatura } from '../src/game/motore/partita/difesa.js';
import { coerenzaGiocatore, mappaOccupazione } from '../src/game/motore/partita/sinergia.js';
import { attrEff } from '../src/game/motore/partita/setup.js';
import { iniziaFatica, aggiornaFattoriFatica } from '../src/game/motore/partita/fatica.js';
import { shockGol, aggiornaFattoreMentale, decadiMomentum } from '../src/game/motore/partita/mentale.js';
import { verificaInfortunio } from '../src/game/motore/partita/infortuni.js';
import { giocaGiornata } from '../src/game/engine.js';
import { statisticheVuote } from '../src/game/stats.js';
import { applicaProfiloAttributi, macroAttributi, overall } from '../src/game/attributi.js';
import { probabilitaDuello } from '../src/game/motore/partita/duello.js';

let ok = 0;
function verifica(nome, fn) {
  try {
    fn();
    ok++;
    console.log(`  ok  ${nome}`);
  } catch (e) {
    console.error(`FAIL  ${nome}`);
    console.error('      ' + e.message.split('\n').join('\n      '));
    process.exitCode = 1;
  }
}

console.log('== Griglia zone ==');
verifica('30 zone (5 corsie x 6 fasce)', () => assert.equal(ELENCO_ZONE.length, 30));
verifica('id zone nel formato Z_<corsia><fascia>', () => {
  for (const id of ELENCO_ZONE) assert.match(id, /^Z_(S|CS|C|CD|D)[1-6]$/);
});
verifica('pericolosità cresce con la fascia in corsia centrale', () => {
  const p = [1, 2, 3, 4, 5, 6].map((f) => ZONE[`Z_C${f}`].pericolosita);
  for (let i = 1; i < p.length; i++) assert.ok(p[i] > p[i - 1], `pericolosita Z_C${i} -> Z_C${i + 1} non crescente`);
});
verifica('adiacenze simmetriche', () => {
  for (const [id, vicini] of Object.entries(ADIACENZE)) {
    for (const v of vicini) assert.ok(ADIACENZE[v].includes(id), `${id} -> ${v} non è reciproca`);
  }
});
verifica('esisteZona coerente col registro zone', () => {
  assert.ok(esisteZona('Z_C3'));
  assert.ok(!esisteZona('Z_X9'));
});

console.log('== Registry: ruoli ==');
svuotaRegistro();
const ruoloValido = {
  id: 'regista_basso',
  nome: 'Regista Basso',
  posizioni: ['CDM'],
  comportamento: {
    costruzione: 95, finalizzazione: 10, pressing: 40, libertaCreativa: 85, rischioGiocate: 60,
    transizioneOffensiva: 80, transizioneDifensiva: 45, ampiezza: 20, profondita: 10,
  },
  movimenti: ['abbassarsi_tra_i_centrali', 'scarico_a_rombo'],
  zone: { possesso: ['Z_C2', 'Z_C3'], nonPossesso: ['Z_C2', 'Z_C3'] },
  prioritaDecisionali: { passaggioCorto: 1.2, filtrante: 1.3 },
  suitability: { primari: ['passaggio', 'visione', 'decisioni'], secondari: ['controllo'], terziari: ['resistenza'] },
  sinergie: { richiede: ['copertura_alle_spalle'] },
};
verifica('registra un ruolo ben formato', () => {
  registraRuolo(ruoloValido);
  assert.equal(ottieniRuolo('regista_basso').nome, 'Regista Basso');
  assert.equal(elencaRuoli().length, 1);
});
verifica('respinge id duplicato', () => {
  assert.throws(() => registraRuolo(ruoloValido), /duplicato/);
});
verifica('respinge zona inesistente', () => {
  const rotto = { ...ruoloValido, id: 'rotto', zone: { possesso: ['Z_ZZ'], nonPossesso: ['Z_C2'] } };
  assert.throws(() => registraRuolo(rotto), /zona inesistente/);
});
verifica('respinge campo comportamento fuori 0-100', () => {
  const rotto = { ...ruoloValido, id: 'rotto2', comportamento: { ...ruoloValido.comportamento, pressing: 250 } };
  assert.throws(() => registraRuolo(rotto), /0-100/);
});
verifica('respinge suitability con attributo ripetuto tra bande', () => {
  const rotto = {
    ...ruoloValido, id: 'rotto3',
    suitability: { primari: ['passaggio'], secondari: ['passaggio'], terziari: [] },
  };
  assert.throws(() => registraRuolo(rotto), /ripetuto/);
});

console.log('== Registry: tattiche ==');
const tatticaValida = {
  id: 'equilibrata',
  nome: 'Equilibrata',
  filosofia: 'Nessuna estremizzazione: leggere la partita e adattarsi.',
  obiettivi: ['solidità', 'adattabilità'],
  parametri: {
    ritmo: 50, ampiezza: 50, distanzaReparti: 50, lineaDifensiva: 50, altezzaPressing: 50,
    intensitaPressing: 50, aggressivita: 50, ricercaProfondita: 50, cross: 50, lanciLunghi: 50,
    costruzioneDalBasso: 50, gestionePossesso: 50, transizioneOffensiva: 50, transizioneDifensiva: 50,
    consumoEnergetico: 50,
  },
  puntiForza: ['nessun punto debole strutturale'],
  puntiDeboli: ['non domina niente'],
};
verifica('registra una tattica ben formata', () => {
  registraTattica(tatticaValida);
  assert.equal(ottieniTattica('equilibrata').nome, 'Equilibrata');
});
verifica('respinge tattica senza un parametro richiesto', () => {
  const { consumoEnergetico, ...senzaCampo } = tatticaValida.parametri;
  const rotta = { ...tatticaValida, id: 'rotta', parametri: senzaCampo };
  assert.throws(() => registraTattica(rotta), /consumoEnergetico/);
});

console.log('== Registry: provider (ModifierPipeline) ==');
verifica('registra un provider su un punto di innesto valido', () => {
  registraProvider({ id: 'meteo', fase: 'duello', applica: () => ({}) });
  assert.equal(ottieniProvider('duello').length, 1);
});
verifica('respinge punto di innesto sconosciuto', () => {
  assert.throws(() => registraProvider({ id: 'x', fase: 'chissadove', applica: () => ({}) }), /fase deve essere/);
});
verifica('respinge provider senza funzione applica', () => {
  assert.throws(() => registraProvider({ id: 'y', fase: 'fatica', applica: 'no' }), /funzione/);
});

console.log('== RNG a sub-seed ==');
verifica('stesso seed + possessoId => stesso sub-seed (determinismo)', () => {
  assert.equal(subSeed(12345, 7), subSeed(12345, 7));
});
verifica('possessi diversi => sub-seed diversi', () => {
  assert.notEqual(subSeed(12345, 7), subSeed(12345, 8));
});
verifica('creaStreamPossesso produce uno stream deterministico e riproducibile', () => {
  const a = creaStreamPossesso(999, 42);
  const b = creaStreamPossesso(999, 42);
  const seqA = Array.from({ length: 5 }, () => a());
  const seqB = Array.from({ length: 5 }, () => b());
  assert.deepEqual(seqA, seqB);
});

console.log('== Catalogo ruoli (M1) ==');
svuotaRegistro();
verifica('35 ruoli nel catalogo, uno per scheda del blueprint', () => {
  assert.equal(RUOLI_CATALOGO.length, 35);
});
verifica('registraCatalogoRuoli registra tutti i 35 ruoli senza errori', () => {
  registraCatalogoRuoli();
  assert.equal(elencaRuoli().length, 35);
});
verifica('registraCatalogoRuoli è idempotente (richiamabile più volte)', () => {
  registraCatalogoRuoli();
  assert.equal(elencaRuoli().length, 35);
});
verifica('ogni posizione (15) ha almeno un ruolo assegnabile', () => {
  for (const posizione of RUOLI) {
    assert.ok(ruoliPerPosizione(posizione).length > 0, `nessun ruolo per la posizione ${posizione}`);
  }
});
verifica('la lavagna offre tre slot ST e i moduli a due punte usano i due laterali', () => {
  assert.deepEqual(['ST1', 'ST2', 'ST3'].map((id) => GRIGLIA_SLOT[id].ruolo), ['ST', 'ST', 'ST']);
  for (const modulo of ['4-4-2', '3-5-2', '4-3-1-2']) {
    assert.ok(PRESET_GRIGLIA[modulo].includes('ST1') && PRESET_GRIGLIA[modulo].includes('ST3'));
    assert.ok(!PRESET_GRIGLIA[modulo].includes('ST2'));
  }
});

const TECNICA_BASE = { tiro: 50, passaggio: 50, dribbling: 50, controllo: 50, cross: 50, calciPiazzati: 50, rigori: 50, marcatura: 50, contrasto: 50, colpoDiTesta: 50 };
const FISICO_BASE = { velocita: 50, accelerazione: 50, resistenza: 50, forza: 50, agilita: 50, salto: 50, equilibrio: 50 };
const MENTALE_BASE = { freddezza: 50, visione: 50, posizionamento: 50, aggressivita: 50, leadership: 50, lavoroSquadra: 50, piedeDebole: 50, lealta: 50, decisioni: 50, anticipazione: 50, movimentoSenzaPalla: 50, impegno: 50, concentrazione: 50 };

function giocatoreFinto(ruolo, overrides = {}) {
  return {
    ruolo,
    nascosti: { potenziale: 60, professionalita: 50, costanza: 50, resistenzaInfortuni: 50 },
    attributi: {
      tecnica: { ...TECNICA_BASE, ...(overrides.tecnica || {}) },
      fisico: { ...FISICO_BASE, ...(overrides.fisico || {}) },
      mentale: { ...MENTALE_BASE, ...(overrides.mentale || {}) },
      ...(ruolo === 'POR' ? { portiere: { riflessi: 50, presa: 50, giocoPiedi: 50, posizionamentoPortiere: 50, uscite: 50, giroPalla: 50, ...(overrides.portiere || {}) } } : {}),
    },
  };
}

console.log('== Profili compatti giocatore e portiere ==');
verifica('la sola abilitaAttuale porta il profilo vicino alla CA senza azzerarne le differenze', () => {
  const por = giocatoreFinto('POR', { portiere: { riflessi: 66, presa: 42, uscite: 55 } });
  applicaProfiloAttributi(por, { abilitaAttuale: 72 });
  assert.ok(Math.abs(overall(por) - 72) <= 1, `overall ottenuto ${overall(por)}`);
  assert.notEqual(por.attributi.portiere.riflessi, por.attributi.portiere.presa, 'il profilo è stato appiattito');
});
verifica('le sei macro del portiere producono profili diversi e l’override atomico vince', () => {
  const por = giocatoreFinto('POR');
  applicaProfiloAttributi(por, {
    macroPortiere: { parate: 88, presa: 74, uscite: 61, posizionamento: 82, distribuzione: 55, fisico: 72 },
    attributiOverride: { riflessi: 94 },
  });
  const macro = macroAttributi(por);
  assert.equal(por.attributi.portiere.riflessi, 94);
  assert.ok(macro.parate > macro.distribuzione, `${JSON.stringify(macro)}`);
});
verifica('un portiere tecnico distribuisce meglio e uno sicuro concede meno respinte', () => {
  const state = { contestoLega: { sigmaFattore: 1 } };
  const mk = (attrs) => ({ attr: attrs, effTotale: 1, statsPartita: {} });
  const pressore = mk({ anticipazione: 60, posizionamento: 60, aggressivita: 60 });
  const scarsoPiedi = mk({ giocoPiedi: 25, giroPalla: 25, decisioni: 45, freddezza: 45 });
  const bravoPiedi = mk({ giocoPiedi: 90, giroPalla: 90, decisioni: 80, freddezza: 75 });
  assert.ok(probabilitaDuello(state, 'distribuzioneCorta', bravoPiedi, pressore) > probabilitaDuello(state, 'distribuzioneCorta', scarsoPiedi, pressore) + 0.45);
  const tiratore = mk({ tiro: 70, forza: 65, freddezza: 70 });
  const presaBassa = mk({ presa: 25, concentrazione: 35, freddezza: 40, riflessi: 60 });
  const presaAlta = mk({ presa: 92, concentrazione: 88, freddezza: 82, riflessi: 80 });
  assert.ok(probabilitaDuello(state, 'controlloParata', tiratore, presaAlta) < probabilitaDuello(state, 'controlloParata', tiratore, presaBassa) - 0.45);
});

verifica('un DC lento e impacciato non risulta "Su misura" da Punta di Profondità', () => {
  const dcLento = giocatoreFinto('DC', {
    fisico: { velocita: 22, accelerazione: 20, resistenza: 45, forza: 70, agilita: 30, salto: 60, equilibrio: 45 },
    mentale: { movimentoSenzaPalla: 15, freddezza: 40, anticipazione: 55 },
    tecnica: { tiro: 20, controllo: 30, equilibrio: 45 },
  });
  const s = suitability(dcLento, 'punta_profondita');
  assert.notEqual(bandaSuitability(s), 'Su misura', `punteggio ${s} inatteso per un DC lento su Punta di Profondità`);
});
verifica('un DC lento resta comunque un DC coerente (Marcatore/Copertura non "Inadatto")', () => {
  const dcLento = giocatoreFinto('DC', {
    fisico: { velocita: 22, accelerazione: 20, forza: 78, salto: 68 },
    tecnica: { marcatura: 75, contrasto: 72 },
    mentale: { posizionamento: 68, anticipazione: 60, aggressivita: 65 },
  });
  const s = suitability(dcLento, 'dc_marcatore');
  assert.notEqual(bandaSuitability(s), 'Inadatto', `punteggio ${s} inatteso per un DC marcatore-tipo`);
});
verifica('ruoloDefault sceglie sempre un ruolo valido per la posizione', () => {
  for (const posizione of RUOLI) {
    const g = giocatoreFinto(posizione);
    const id = ruoloDefault(g, posizione);
    assert.ok(ruoliPerPosizione(posizione).some((r) => r.id === id), `ruoloDefault fuori catalogo per ${posizione}: ${id}`);
  }
});

console.log('== Migrazione salvataggi v8 -> v9 ==');
verifica('rinomina posizioni, deriva nuovi attributi, allinea slot tattica', () => {
  const attributiV8 = () => ({
    tecnica: { ...TECNICA_BASE }, fisico: { ...FISICO_BASE },
    // Simula un salvataggio pre-Ventidue: senza i 5 nuovi attributi mentali.
    mentale: { freddezza: 50, visione: 50, posizionamento: 50, aggressivita: 50, leadership: 50, lavoroSquadra: 50, piedeDebole: 50, lealta: 50 },
  });
  const v8 = {
    versione: 8,
    seed: 42,
    giocatori: [
      { ruolo: 'CDC', attributi: attributiV8(), nascosti: { potenziale: 60, professionalita: 50, costanza: 50, resistenzaInfortuni: 50 } },
      {
        ruolo: 'ATT', attributi: attributiV8(), nascosti: { potenziale: 60, professionalita: 50, costanza: 50, resistenzaInfortuni: 50 },
        ruoli: { naturale_primario: 'ATT', naturali_extra: ['CDC'], forte_non_naturale: [], non_giocabile: [] },
      },
    ],
    squadre: [
      { id: 1, tattica: { schieramento: { CDC1: 10, ATT2: 11, TS: 12 } } },
    ],
  };
  const v9 = migra(v8, 9);
  assert.equal(v9.versione, 9);
  assert.equal(v9.giocatori[0].ruolo, 'CDM');
  assert.equal(v9.giocatori[1].ruolo, 'ST');
  assert.deepEqual(v9.giocatori[1].ruoli.naturali_extra, ['CDM']);
  assert.ok(Number.isFinite(v9.giocatori[0].attributi.mentale.decisioni));
  assert.ok(Number.isFinite(v9.giocatori[0].attributi.mentale.concentrazione));
  assert.deepEqual(Object.keys(v9.squadre[0].tattica.schieramento).sort(), ['CDM1', 'ST2', 'TS']);
});
verifica('versione sconosciuta non ha percorso di migrazione (nessun downgrade silenzioso)', () => {
  assert.equal(migra({ versione: 3, giocatori: [], squadre: [] }, 9), null);
});
verifica('versione già corrente non viene toccata', () => {
  const stato = { versione: 9, giocatori: [], squadre: [] };
  assert.equal(migra(stato, 9).versione, 9);
});

console.log('== Catalogo identità (M2) ==');
svuotaRegistro();
verifica('13 identità nel catalogo, una per scheda del blueprint', () => {
  assert.equal(IDENTITA_CATALOGO.length, 13);
});
verifica('registraCatalogoIdentita registra e valida tutte le 13 (idempotente)', () => {
  registraCatalogoIdentita();
  registraCatalogoIdentita();
  assert.equal(elencaIdentita().length, 13);
});
verifica('ruoliAffini e ruoliInattriti referenziano solo ruoli del catalogo M1', () => {
  const idRuoli = new Set(RUOLI_CATALOGO.map((r) => r.id));
  for (const identita of IDENTITA_CATALOGO) {
    for (const id of [...(identita.ruoliAffini || []), ...(identita.ruoliInattriti || [])]) {
      assert.ok(idRuoli.has(id), `${identita.id} referenzia un ruolo inesistente: ${id}`);
    }
  }
});

console.log('== Ponte v1: modificatori identità (M2) ==');
verifica('equilibrata è neutra: tutti i moltiplicatori valgono 1', () => {
  const mod = modificatoriForze(ottieniIdentita('equilibrata').parametri);
  for (const k of ['attacco', 'difesa', 'centrocampo', 'aggressivita']) {
    assert.ok(Math.abs(mod[k] - 1) < 1e-9, `${k} = ${mod[k]} invece di 1`);
  }
  assert.ok(Math.abs(quotaPossesso(ottieniIdentita('equilibrata').parametri) - 1) < 1e-9);
});
verifica('haramball si sbilancia: attacco alto, difesa che crolla', () => {
  const mod = modificatoriForze(ottieniIdentita('haramball').parametri);
  assert.ok(mod.attacco > 1.1, `attacco ${mod.attacco}`);
  assert.ok(mod.difesa < 0.95, `difesa ${mod.difesa}`);
});
verifica('catenaccio e blocco basso proteggono senza dominare in avanti', () => {
  for (const id of ['catenaccio', 'blocco_basso']) {
    const mod = modificatoriForze(ottieniIdentita(id).parametri);
    assert.ok(mod.difesa > 1.04, `${id}: difesa ${mod.difesa}`);
    assert.ok(mod.attacco < 1.05, `${id}: attacco ${mod.attacco}`);
  }
});
verifica('la mentalità sposta il rischio in modo monotono', () => {
  const identita = ottieniIdentita('equilibrata');
  const scala = ['difensiva', 'prudente', 'equilibrata', 'offensiva', 'assalto'];
  const mods = scala.map((m) => modificatoriForze(parametriEfficaci(identita, m)));
  for (let i = 1; i < mods.length; i++) {
    assert.ok(mods[i].attacco > mods[i - 1].attacco, `attacco non crescente da ${scala[i - 1]} a ${scala[i]}`);
    assert.ok(mods[i].difesa < mods[i - 1].difesa, `difesa non decrescente da ${scala[i - 1]} a ${scala[i]}`);
  }
});
verifica('possesso stimato: tiki_taka >= 62% contro palla_lunga (target cap. 07)', () => {
  const qTiki = quotaPossesso(ottieniIdentita('tiki_taka').parametri);
  const qPalla = quotaPossesso(ottieniIdentita('palla_lunga').parametri);
  const possesso = (100 * qTiki) / (qTiki + qPalla);
  assert.ok(possesso >= 62, `possesso tiki_taka ${possesso.toFixed(1)}%`);
});
verifica('rosa fisica e povera tecnicamente: palla_lunga batte tiki_taka', () => {
  const rosaFisica = RUOLI.map((pos) => giocatoreFinto(pos, {
    fisico: { forza: 78, salto: 75, resistenza: 70, velocita: 55, accelerazione: 55, agilita: 45, equilibrio: 60 },
    tecnica: { controllo: 30, passaggio: 32, visione: 28, colpoDiTesta: 78, marcatura: 65, contrasto: 68, dribbling: 25 },
  }));
  const pl = punteggioIdentitaRosa(ottieniIdentita('palla_lunga'), rosaFisica);
  const tt = punteggioIdentitaRosa(ottieniIdentita('tiki_taka'), rosaFisica);
  assert.ok(pl > tt, `palla_lunga ${pl.toFixed(1)} non batte tiki_taka ${tt.toFixed(1)}`);
});
verifica('mentalità dinamica CPU coerente con punteggio e minuto', () => {
  assert.equal(mentalitaCpu(0, 0, 30), 'equilibrata');
  assert.equal(mentalitaCpu(0, 1, 65), 'offensiva');
  assert.equal(mentalitaCpu(0, 1, 80), 'assalto');
  assert.equal(mentalitaCpu(1, 0, 80), 'prudente');
  assert.equal(mentalitaCpu(2, 0, 80), 'difensiva');
});

console.log('== Migrazione salvataggi v9 -> v10 ==');
verifica('utente su equilibrata + mentalità dalle vecchie istruzioni; CPU con identità dal profilo rosa', () => {
  const v9 = {
    versione: 10 - 1,
    seed: 7,
    giocatori: [
      ...['POR', 'DC', 'CDM', 'ST'].map((pos) => ({ ...giocatoreFinto(pos), squadraId: 2, settoreGiovanile: false })),
    ],
    squadre: [
      {
        id: 1, isCpu: false,
        tattica: { schieramento: { POR: 10 }, ruoliSlot: {}, istruzioni: { pressing: 'alto', baricentro: 'medio' } },
      },
      { id: 2, isCpu: true, tattica: null },
    ],
  };
  const v10 = migra(v9, 10);
  assert.equal(v10.versione, 10);
  const utente = v10.squadre[0];
  assert.equal(utente.tattica.identitaId, 'equilibrata');
  assert.equal(utente.tattica.mentalita, 'offensiva');
  assert.equal(utente.tattica.istruzioni, undefined);
  assert.deepEqual(utente.tattica.schieramento, { POR: 10 });
  const cpu = v10.squadre[1];
  assert.ok(IDENTITA_CATALOGO.some((i) => i.id === cpu.tattica.identitaId), `identità CPU fuori catalogo: ${cpu.tattica.identitaId}`);
  assert.equal(cpu.tattica.mentalita, 'equilibrata');
});
verifica('catena completa v8 -> v10 in un solo passaggio di migra', () => {
  const attributiV8 = () => ({
    tecnica: { ...TECNICA_BASE }, fisico: { ...FISICO_BASE },
    mentale: { freddezza: 50, visione: 50, posizionamento: 50, aggressivita: 50, leadership: 50, lavoroSquadra: 50, piedeDebole: 50, lealta: 50 },
  });
  const v8 = {
    versione: 8,
    seed: 42,
    giocatori: [
      { ruolo: 'CDC', squadraId: 1, settoreGiovanile: false, attributi: attributiV8(), nascosti: { potenziale: 60, professionalita: 50, costanza: 50, resistenzaInfortuni: 50 } },
    ],
    squadre: [{ id: 1, isCpu: true, tattica: null }],
  };
  const v10 = migra(v8, 10);
  assert.equal(v10.versione, 10);
  assert.equal(v10.giocatori[0].ruolo, 'CDM');
  assert.ok(IDENTITA_CATALOGO.some((i) => i.id === v10.squadre[0].tattica.identitaId));
});

console.log('== Motore Ventidue (M3) ==');
const worldV2 = generateWorld(424242);
const statoV2 = { seed: 424242, ...worldV2 };
const partitaV2 = worldV2.leghe[0].calendario[0].partite[0];

verifica('la partita completa gira headless e produce risultato e statistiche', () => {
  const r = simulaPartitaV2(statoV2, partitaV2.casaId, partitaV2.trasfertaId, 99);
  assert.ok(Number.isInteger(r.golCasa) && Number.isInteger(r.golTrasferta));
  assert.ok(r.matchState.possessoId > 100, `solo ${r.matchState.possessoId} possessi`);
  assert.ok(r.eventi.some((e) => e.tipo === 'intervallo'), 'manca l\'intervallo');
});
verifica('determinismo bit-per-bit: stesso seed, stessa partita', () => {
  const a = simulaPartitaV2(statoV2, partitaV2.casaId, partitaV2.trasfertaId, 1234);
  const b = simulaPartitaV2(statoV2, partitaV2.casaId, partitaV2.trasfertaId, 1234);
  assert.deepEqual(a.matchState.eventi, b.matchState.eventi);
  assert.equal(a.golCasa, b.golCasa);
  assert.equal(a.golTrasferta, b.golTrasferta);
  assert.deepEqual(a.statistiche, b.statistiche);
});
verifica('seed diversi producono partite diverse', () => {
  const a = simulaPartitaV2(statoV2, partitaV2.casaId, partitaV2.trasfertaId, 1);
  const b = simulaPartitaV2(statoV2, partitaV2.casaId, partitaV2.trasfertaId, 2);
  assert.notDeepEqual(a.matchState.eventi, b.matchState.eventi);
});
verifica('statistiche coerenti: gol <= in porta <= tiri, possesso a somma 100', () => {
  const r = simulaPartitaV2(statoV2, partitaV2.casaId, partitaV2.trasfertaId, 7);
  for (const s of [r.statistiche.casa, r.statistiche.trasferta]) {
    assert.ok(s.gol <= s.inPorta, `gol ${s.gol} > in porta ${s.inPorta}`);
    assert.ok(s.inPorta <= s.tiri, `in porta ${s.inPorta} > tiri ${s.tiri}`);
    assert.ok(s.passRiusciti <= s.passTentati);
  }
  assert.equal(r.statistiche.casa.possesso + r.statistiche.trasferta.possesso, 100);
  assert.equal(r.golCasa, r.statistiche.casa.gol);
  assert.equal(r.golTrasferta, r.statistiche.trasferta.gol);
});
verifica('INV-7: nessuna partita senza tiri su un campione di giornate', () => {
  const legaCampione = worldV2.leghe.find((l) => l.calendario?.[0]);
  assert.ok(legaCampione, 'nessuna lega materializzata nel mondo di test');
  for (const p of legaCampione.calendario[0].partite) {
    const r = simulaPartitaV2(statoV2, p.casaId, p.trasfertaId, p.id);
    assert.ok(r.statistiche.casa.tiri + r.statistiche.trasferta.tiri > 0, 'partita senza alcun tiro');
  }
});
verifica('adapter: eventi nel formato v1 con testi e squadraId valide', () => {
  const r = simulaPartitaV2(statoV2, partitaV2.casaId, partitaV2.trasfertaId, 55);
  const idValidi = new Set([partitaV2.casaId, partitaV2.trasfertaId]);
  for (const e of r.eventi) {
    assert.ok(['gol', 'parata', 'occasione', 'palo', 'giallo', 'rosso', 'intervallo', 'infortunio', 'cambio'].includes(e.tipo), `tipo sconosciuto ${e.tipo}`);
    assert.ok(typeof e.minuto === 'number');
    if (e.tipo !== 'intervallo') {
      assert.ok(idValidi.has(e.squadraId), `squadraId fuori partita: ${e.squadraId}`);
      assert.ok(typeof e.testo === 'string' && e.testo.length > 0);
    }
  }
});

console.log('== Il collettivo completo (M4) ==');

verifica('PressingEngine: il bonus si attiva solo se un trigger della difesa è tra quelli attivi', () => {
  const attivi = new Set(['controllo_sbagliato']);
  assert.equal(bonusTrigger(attivi, ['palla_sul_terzino']).attivo, false);
  assert.equal(bonusTrigger(attivi, ['controllo_sbagliato', 'passaggio_indietro']).attivo, true);
  assert.equal(bonusTrigger(attivi, []).attivo, false);
});
verifica('PressingEngine: rilevaTrigger consuma i flag di un tick', () => {
  const state = { palla: { portatore: null }, lati: {}, ultimoPassoFamiglia: 'scarico', controlloSbagliato: true, riceutoSpallePorta: false };
  const attivi = rilevaTrigger(state);
  assert.ok(attivi.has('passaggio_indietro') && attivi.has('controllo_sbagliato'));
  assert.equal(state.ultimoPassoFamiglia, null, 'il flag va consumato, non deve restare acceso');
  assert.equal(state.controlloSbagliato, false);
});
verifica('DefendingEngine: un bersaglio oltre l\'ultimo difensore e la palla è in fuorigioco', () => {
  const state = {
    palla: { x: 50, y: 50 },
    lati: { casa: { giocatori: [] }, trasferta: { giocatori: [{ espulso: false, portiere: false, pos: { x: 50, y: 70 } }] } },
  };
  assert.equal(fuoriGioco(state, 'casa', { pos: { x: 50, y: 80 } }), true);
  assert.equal(fuoriGioco(state, 'casa', { pos: { x: 50, y: 40 } }), false);
});
verifica('DefendingEngine: modalità di marcatura uomo solo per Uomo su Uomo', () => {
  assert.equal(modalitaMarcatura('uomo_su_uomo'), 'uomo');
  assert.equal(modalitaMarcatura('gegenpressing'), 'zona');
  assert.equal(modalitaMarcatura('equilibrata'), 'zona');
});
verifica('SynergyEngine: un ruolo affine all\'identità coerenza più di uno neutro', () => {
  registraCatalogoRuoli();
  registraCatalogoIdentita();
  const registaBasso = ottieniRuolo('regista_basso');
  const tikiTaka = ottieniIdentita('tiki_taka');
  const equilibrata = ottieniIdentita('equilibrata');
  const cAffine = coerenzaGiocatore('regista_basso', registaBasso, tikiTaka, new Set(), equilibrata, new Set());
  const cNeutro = coerenzaGiocatore('regista_basso', registaBasso, equilibrata, new Set(), equilibrata, new Set());
  assert.ok(cAffine > cNeutro, `affine ${cAffine} non supera neutro ${cNeutro}`);
});
verifica('SynergyEngine: la mappa di occupazione conta le corsie dei ruoli titolari', () => {
  registraCatalogoRuoli();
  const alaClassica = ottieniRuolo('ala_classica');
  const mappa = mappaOccupazione([{ slot: { ruolo: 'LW', x: 15, y: 90 }, ruolo: alaClassica }]);
  const totale = Object.values(mappa.possesso).reduce((a, b) => a + b, 0) + Object.values(mappa.nonPossesso).reduce((a, b) => a + b, 0);
  assert.ok(totale > 0, 'nessuna corsia occupata dal ruolo titolare');
});
verifica('DefendingEngine + SetPieceEngine: fuorigioco e punizioni battute emergono su un campione di partite', () => {
  let fuorigioco = 0;
  let punizioni = 0;
  for (const lega of worldV2.leghe) {
    for (const p of lega.calendario[0].partite) {
      const r = simulaPartitaV2(statoV2, p.casaId, p.trasfertaId, p.id + 500000);
      for (const e of r.matchState.eventi) {
        if (e.tipo === 'fuorigioco') fuorigioco++;
        if (e.origine === 'punizione') punizioni++;
      }
    }
  }
  assert.ok(fuorigioco > 0, 'nessun fuorigioco rilevato sul campione');
  assert.ok(punizioni > 0, 'nessuna punizione battuta (diretta o laterale) sul campione');
});

console.log('== Condizione, disciplina, uomini (M5) ==');

verifica('FatigueEngine: φ fisico scende con l\'energia, la classe resta intatta (INV-5)', () => {
  const pl = { attr: { velocita: 80, passaggio: 80 }, effTotale: 1, energia: 100 };
  iniziaFatica(pl);
  const vFresco = attrEff(pl, 'velocita');
  const passFresco = attrEff(pl, 'passaggio');
  pl.energia = 25;
  aggiornaFattoriFatica(pl, 80);
  assert.ok(attrEff(pl, 'velocita') < vFresco, 'la velocità non è degradata dalla fatica');
  assert.equal(attrEff(pl, 'passaggio'), passFresco, 'la classe (passaggio) non deve degradare (INV-5)');
});
verifica('MentalEngine: il momentum è clampato in banda (INV-6b) e decade (INV-6a)', () => {
  const segna = { giocatori: [{ attr: {} }], momentum: 0 };
  const subisce = { giocatori: [{ attr: { leadership: 50 } }], momentum: 0 };
  for (let i = 0; i < 20; i++) shockGol(segna, subisce);
  aggiornaFattoreMentale(segna);
  assert.ok(segna.fattoreMentale <= 1.12 + 1e-9, 'il moltiplicatore mentale sfora la banda alta');
  assert.ok(subisce.momentum >= -1, 'il momentum negativo sfora -1');
  const prima = segna.momentum;
  decadiMomentum(segna, 30);
  assert.ok(Math.abs(segna.momentum) < Math.abs(prima), 'il momentum non decade nel tempo');
});
verifica('InjuryEngine: registra un infortunio pendente su fatica estrema, pesato sulla fragilità', () => {
  const rngAlto = () => 0.0001; // forza lo scatto in fatica a superare la soglia
  const state = { infortunioPendente: null, infortuniPartita: [] };
  const lato = { chiave: 'casa' };
  const fragile = { id: 1, espulso: false, energia: 10, g: { nascosti: { resistenzaInfortuni: 20 } } };
  verificaInfortunio(state, lato, fragile, 'scatto', rngAlto);
  assert.ok(state.infortunioPendente, 'nessun infortunio su un fragile stremato');
  // Un giocatore fresco non è a rischio da "scatto" (energia sopra soglia).
  const state2 = { infortunioPendente: null, infortuniPartita: [] };
  verificaInfortunio(state2, lato, { id: 2, energia: 90, g: { nascosti: { resistenzaInfortuni: 20 } } }, 'scatto', rngAlto);
  assert.equal(state2.infortunioPendente, null, 'un giocatore fresco non deve infortunarsi per scatto');
});
verifica('SubstitutionEngine: una partita v2 produce cambi e i subentrati risultano tra i partecipanti', () => {
  // Campione di seed anziché uno fisso (Fase 5): con rose realmente
  // disomogenee alcune partite specifiche restano sotto soglia di fatica per
  // tutti i 90' (niente da recriminare, cap. 02 §9) — il campione verifica
  // che il meccanismo scatti nella normalità dei casi, non in ognuno.
  let trovato = null;
  for (let seed = 1; seed <= 12 && !trovato; seed++) {
    const r = simulaPartitaV2(statoV2, partitaV2.casaId, partitaV2.trasfertaId, seed);
    const cambi = r.matchState.eventi.filter((e) => e.tipo === 'cambio');
    if (cambi.length > 0) trovato = { r, cambi };
  }
  assert.ok(trovato, 'nessun cambio in 12 partite campione');
  const partCasa = new Set(trovato.r.latoCasa.partecipanti.map((p) => p.giocatoreId));
  const entratiCasa = trovato.cambi.filter((e) => e.lato === 'casa').map((e) => e.attore);
  for (const id of entratiCasa) assert.ok(partCasa.has(id), 'un subentrato non compare tra i partecipanti');
});
verifica('Switch M5: il motore Ventidue è attivo di default (creaStatoIniziale / migrazione v11)', () => {
  const v10 = { versione: 10, seed: 5, motoreV2: false, giocatori: [{ id: 1, forma: 80, settoreGiovanile: false }], squadre: [] };
  const v11 = migra(v10, 11);
  assert.equal(v11.versione, 11);
  assert.equal(v11.motoreV2, true, 'la migrazione v11 non attiva il motore Ventidue');
  assert.equal(typeof v11.giocatori[0].condizione, 'number', 'la migrazione v11 non assegna la condizione');
});

console.log('== Proiezione: statistiche, voti, cronaca (M6) ==');

const worldM6 = generateWorld(909090);
const dateM6 = [...new Set(worldM6.leghe.flatMap((l) => l.calendario.map((g) => g.data)))].sort();
let statoM6 = {
  seed: 909090,
  dataCorrente: dateM6[0],
  squadraUtenteId: worldM6.squadre[0].id,
  obiettivoStagione: null,
  eventiUrgenti: [],
  notizie: [],
  motoreV2: true,
  ...worldM6,
};
statoM6 = giocaGiornata(statoM6).stato;

verifica('StatsEngine: statsPartita reali accumulate su giocatore.statistiche', () => {
  const conTiri = statoM6.giocatori.filter((g) => g.statistiche.tiri > 0);
  assert.ok(conTiri.length > 0, 'nessun giocatore con tiri registrati dopo una giornata v2');
  for (const g of conTiri) {
    assert.ok(g.statistiche.tiriInPorta <= g.statistiche.tiri, 'tiriInPorta non può superare tiri');
    assert.ok(g.statistiche.passRiusciti <= g.statistiche.passTentati, 'passRiusciti non può superare passTentati');
    assert.ok(g.statistiche.minutiGiocati > 0, 'un giocatore con tiri deve avere minuti giocati');
  }
});
verifica('RatingEngine a contributi: il voto v2 non è più rumore piatto (varia coi contributi reali)', () => {
  const conPresenze = statoM6.giocatori.filter((g) => g.statistiche.presenze > 0);
  const voti = conPresenze.map((g) => g.statistiche.sommaVoti / g.statistiche.presenze);
  const media = voti.reduce((s, v) => s + v, 0) / voti.length;
  const varianza = voti.reduce((s, v) => s + (v - media) ** 2, 0) / voti.length;
  assert.ok(varianza > 0.01, 'voto v2 senza alcuna dispersione: sembra ancora rumore piatto o costante');
  const golGiocatori = statoM6.giocatori.filter((g) => g.statistiche.gol > 0);
  if (golGiocatori.length > 0) {
    const mediaGol = golGiocatori.reduce((s, g) => s + g.statistiche.sommaVoti / g.statistiche.presenze, 0) / golGiocatori.length;
    assert.ok(mediaGol > media, 'chi ha segnato dovrebbe avere in media un voto più alto (contributo gol)');
  }
});
verifica('Migrazione salvataggi v11 -> v12: nuovi campi StatsEngine a 0, legacy invariati', () => {
  const v11 = {
    versione: 11, seed: 5, motoreV2: true,
    giocatori: [{ id: 1, statistiche: { presenze: 10, gol: 3, assist: 2, sommaVoti: 65 } }],
    squadre: [],
  };
  const v12 = migra(v11, 12);
  assert.equal(v12.versione, 12);
  assert.equal(v12.giocatori[0].statistiche.presenze, 10, 'la migrazione v12 non deve alterare le presenze legacy');
  assert.equal(v12.giocatori[0].statistiche.gol, 3, 'la migrazione v12 non deve alterare i gol legacy');
  assert.equal(v12.giocatori[0].statistiche.tiri, 0, 'i nuovi campi StatsEngine devono partire da 0');
  assert.deepEqual(Object.keys(v12.giocatori[0].statistiche).sort(), Object.keys(statisticheVuote()).sort());
});
verifica('CommentaryEngine v2: nessun evento con testo vuoto o placeholder non sostituito', () => {
  for (const g of statoM6.leghe.flatMap((l) => l.calendario).flatMap((gg) => gg.partite)) {
    if (!g.eventi) continue;
    for (const e of g.eventi) {
      assert.ok(e.testo && e.testo.length > 0, `evento ${e.tipo} senza testo`);
      assert.ok(!/\{[GSAKT]\}/.test(e.testo), `placeholder non sostituito in "${e.testo}"`);
    }
  }
});

console.log(`\n${ok} verifiche superate.`);
if (process.exitCode) {
  console.error('\nSMOKE TEST FALLITO.');
  process.exit(1);
} else {
  console.log('Smoke test superato: fondamenta del motore OK.');
}
