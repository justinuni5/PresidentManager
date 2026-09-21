import { generateWorld, creaStatoIniziale, generaCalendario, VERSIONE_SALVATAGGIO } from '../src/game/generator.js';
import { FASCE_GIOVANILI, overall } from '../src/game/attributi.js';
import { accettaRiduzioneVolontaria, rinnovaContratto, segnalaInteresseU13 } from '../src/game/carriere.js';
import { gestisciEventiCarrieraGiornalieri } from '../src/game/eventiCarriera.js';
import { aggiornaAllenamentiCpu } from '../src/game/allenamento.js';
import { iniziaNuovaStagione } from '../src/game/continuita.js';
import { mulberry32 } from '../src/game/rng.js';
import { migra } from '../src/game/migrazioni.js';
import { creaU23Richieste, requisitiU23, richiediU23 } from '../src/game/secondeSquadre.js';

const world = generateWorld(16092026);
let stato = creaStatoIniziale({ world, squadraUtenteId: world.squadre[0].id, editorAttivo: false, presidente: { nome: 'Test', cognome: 'Carriere' } });
if (FASCE_GIOVANILI.some((f) => f.id === 'U21') || !FASCE_GIOVANILI.some((f) => f.id === 'U19')) throw new Error('Passaggio U19 incompleto.');
if (stato.squadre.some((s) => Object.values(s.staff).some((m) => !m))) throw new Error('Una squadra parte senza staff.');
if (stato.giocatori.some((g) => g.settoreGiovanile && g.eta <= 17 && (g.contrattoScadenza || g.stipendio))) throw new Error('U17/U13 con contratto professionistico.');
if (stato.giocatori.some((g) => g.settoreGiovanile && g.eta <= 13 && g.valore)) throw new Error('Un Under 13 ha valore di mercato.');
const u13Altrui = stato.giocatori.find((g) => g.squadraId !== stato.squadraUtenteId && g.settoreGiovanile && g.eta <= 13);
const interesseU13 = segnalaInteresseU13(stato, u13Altrui.id);
if (!interesseU13.esito.ok || !interesseU13.stato.giocatori.find((g) => g.id === u13Altrui.id).interessiU13.includes(stato.squadraUtenteId)) throw new Error('Interesse alla famiglia U13 non registrato.');

const senior = stato.giocatori.find((g) => g.squadraId === stato.squadraUtenteId && !g.settoreGiovanile);
senior.contrattoScadenza = 2027;
const rinnovo = rinnovaContratto(stato, senior.id, 2, Math.max(senior.stipendio * 2, 20000));
if (!rinnovo.esito.ok || rinnovo.stato.giocatori.find((g) => g.id === senior.id).contrattoScadenza !== 2028) throw new Error('Rinnovo manuale non applicato.');

senior.propostaRiduzione = { nuovoStipendio: Math.max(3000, senior.stipendio - 1000), data: stato.dataCorrente };
const stipendioRidotto = senior.propostaRiduzione.nuovoStipendio;
const conRiduzione = accettaRiduzioneVolontaria(stato, senior.id);
const seniorRidotto = conRiduzione.giocatori.find((g) => g.id === senior.id);
if (seniorRidotto.stipendio !== stipendioRidotto || seniorRidotto.propostaRiduzione) throw new Error('Riduzione volontaria non applicata.');

const cpu = stato.squadre.find((s) => s.isCpu);
cpu.allenamento.focus = 'tattico';
aggiornaAllenamentiCpu(stato, '2026-09-01');
if (cpu.allenamento.ultimoAggiornamentoCpu !== '2026-09-01') throw new Error('La CPU non rivaluta l’allenamento.');

gestisciEventiCarrieraGiornalieri(stato, '2026-10-15', mulberry32(33));
if (!stato.provini.sessioni.length || stato.provini.sessioni[0].giocatori.length !== 20) throw new Error('Giornata dei provini non creata.');

let id = 1;
const dispari = generaCalendario(mulberry32(1), [1, 2, 3, 4, 5], () => id++, '2026-09-01');
if (dispari.length !== 10 || dispari.some((g) => g.partite.length !== 2)) throw new Error('Calendario con riposi non valido.');

if (requisitiU23(stato, stato.squadraUtenteId).visibile) throw new Error('U23 visibile a un club che non è in massima serie.');
const mondoU23 = structuredClone(stato);
const madreU23 = mondoU23.squadre.find((s) => s.id === mondoU23.squadraUtenteId);
const legaMadre = mondoU23.leghe.find((l) => l.id === madreU23.legaId);
legaMadre.massimaSerie = true;
madreU23.struttureGiovanili = 90;
madreU23.budget = 30_000_000;
const legaU23 = { ...structuredClone(legaMadre), id: 999001, nome: 'Terza divisione test', livello: 3, massimaSerie: false, squadre: [], calendario: [], classifica: [], campionatiGiovanili: {} };
mondoU23.leghe.push(legaU23);
const richiestaU23 = richiediU23(mondoU23);
if (!richiestaU23.esito.ok) throw new Error('U23 non richiedibile con tutti i requisiti validi.');
let prossimoIdU23 = 8_000_000;
creaU23Richieste(richiestaU23.stato, { anno: 2027, rng: mulberry32(44), nuovoId: () => prossimoIdU23++ });
const seconda = richiestaU23.stato.squadre.find((s) => s.clubMadreId === madreU23.id && s.isSecondaSquadra);
if (!seconda || seconda.legaId !== legaU23.id || richiestaU23.stato.giocatori.filter((g) => g.squadraId === seconda.id).length !== 20) throw new Error('Creazione U23 incompleta.');

const vecchio = structuredClone(stato);
vecchio.versione = 15;
for (const l of vecchio.leghe) if (l.campionatiGiovanili.U19) { l.campionatiGiovanili.U21 = l.campionatiGiovanili.U19; delete l.campionatiGiovanili.U19; }
const migrato = migra(vecchio, VERSIONE_SALVATAGGIO);
if (!migrato || migrato.versione !== VERSIONE_SALVATAGGIO || migrato.leghe.some((l) => l.campionatiGiovanili.U21)) throw new Error('Migrazione U21 -> U19 fallita.');
if (migrato.giocatori.some((g) => g.settoreGiovanile && g.eta <= 13 && (g.valore || g.trasferibile || g.stipendio || g.contrattoScadenza))) throw new Error('Migrazione delle regole U13 incompleta.');

for (const lega of stato.leghe) for (const giornata of lega.calendario) for (const p of giornata.partite) { p.golCasa = 1; p.golTrasferta = 0; }
const veterano = stato.giocatori.find((g) => g.squadraId === stato.squadraUtenteId && !g.settoreGiovanile && g.ruolo === 'POR');
veterano.eta = 35; veterano.statistiche.presenze = 22; veterano.statistiche.sommaVoti = 165;
const overallPrima = overall(veterano);
const scaduto = stato.giocatori.find((g) => g.squadraId === stato.squadraUtenteId && !g.settoreGiovanile && g.id !== veterano.id);
scaduto.contrattoScadenza = 2027;
const nuova = iniziaNuovaStagione(stato);
if (nuova.stagione !== '2027/28' || nuova.giocatori.find((g) => g.id === veterano.id).eta !== 36) throw new Error('Invecchiamento non applicato.');
if (overall(nuova.giocatori.find((g) => g.id === veterano.id)) < overallPrima) throw new Error('Grande stagione del veterano ignorata.');
if (!nuova.giocatori.find((g) => g.id === scaduto.id)?.svincolato) throw new Error('Scadenza utente non trasformata in svincolo.');
if (nuova.leghe.some((l) => l.campionatiGiovanili.U21 || !l.campionatiGiovanili.U19)) throw new Error('Nuova stagione non usa U19.');

console.log('Carriere valide: U19/U23, staff iniziale, rinnovi e riduzioni, CPU attiva, provini, calendario dispari, migrazione e rollover biologico.');
