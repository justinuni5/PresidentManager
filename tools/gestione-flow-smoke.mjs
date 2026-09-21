import assert from 'node:assert/strict';
import { generateWorld, creaStatoIniziale } from '../src/game/generator.js';
import { CATEGORIE_OBIETTIVO, concludiInizioStagione } from '../src/game/stagione.js';
import { cambiaGruppoGiocatore } from '../src/game/carriere.js';
import { avanza } from '../src/game/avanzamento.js';

const world = generateWorld(78, { paesiAttivi: ['italia'] });
const club = world.squadre.find((s) => s.codiceDatabase === 'ita-inter') || world.squadre[0];
let stato = creaStatoIniziale({ world, squadraUtenteId: club.id, presidente: { nome: 'Test', cognome: 'Gestionale' } });
assert.ok(stato.notizie.some((n) => n.obbligatorio === 'inizioStagione' && n.tipo === 'club'));
assert.equal(CATEGORIE_OBIETTIVO.find((o) => o.id === 'lottare_vittoria').posizione(20), 4);
assert.equal(CATEGORIE_OBIETTIVO.find((o) => o.id === 'zona_europea').posizione(20), 6);
assert.equal(CATEGORIE_OBIETTIVO.find((o) => o.id === 'prima_meta').posizione(20), 10);

stato = concludiInizioStagione(stato, { categoriaId: 'zona_europea', discorsoId: 'equilibrato' });
assert.equal(stato.obiettivoStagione.posizioneTarget, 6);
assert.ok(stato.notizie.find((n) => n.obbligatorio === 'inizioStagione').risolta);

const u19 = stato.giocatori.find((g) => g.squadraId === club.id && g.settoreGiovanile && g.eta >= 18);
assert.ok(u19);
let cambio = cambiaGruppoGiocatore(stato, u19.id, 'prima');
assert.ok(cambio.esito.ok);
stato = cambio.stato;
assert.ok(stato.giocatori.find((g) => g.id === u19.id).aggregatoPrimaSquadra);
cambio = cambiaGruppoGiocatore(stato, u19.id, 'U19');
assert.ok(cambio.esito.ok);
stato = cambio.stato;
assert.equal(stato.giocatori.find((g) => g.id === u19.id).aggregatoPrimaSquadra, false);
cambio = cambiaGruppoGiocatore(stato, u19.id, 'U17');
assert.ok(cambio.esito.ok);
assert.equal(cambio.stato.giocatori.find((g) => g.id === u19.id).fasciaGiovanile, 'U17');
const senior = stato.giocatori.find((g) => g.squadraId === club.id && !g.settoreGiovanile);
assert.ok(senior);
const contratto = senior.contrattoScadenza;
const retrocesso = cambiaGruppoGiocatore(stato, senior.id, 'U19');
assert.ok(retrocesso.esito.ok);
assert.equal(retrocesso.stato.giocatori.find((g) => g.id === senior.id).contrattoScadenza, contratto);
assert.equal(retrocesso.stato.giocatori.find((g) => g.id === senior.id).fasciaGiovanile, 'U19');
const ritorno = cambiaGruppoGiocatore(retrocesso.stato, senior.id, 'prima');
assert.ok(ritorno.esito.ok);
assert.equal(ritorno.stato.giocatori.find((g) => g.id === senior.id).settoreGiovanile, false);

const passo = avanza(stato);
assert.ok(passo.stato.dataCorrente >= stato.dataCorrente);
console.log('Flusso gestionale valido: obiettivi, messaggi iniziali e passaggi prima squadra/U19/U17.');
