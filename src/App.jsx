import { useEffect, useState } from 'react';
import MainMenu from './ui/MainMenu.jsx';
import NewCareer from './ui/NewCareer.jsx';
import GameShell from './ui/GameShell.jsx';
import { salva, carica } from './game/storage.js';
import { giocaGiornata } from './game/engine.js';
import { avanza } from './game/avanzamento.js';
import { concludiInizioStagione } from './game/stagione.js';
import { offri, rispondiOfferta, ingaggiaSvincolato } from './game/mercato.js';
import { assumiStaff, licenziaStaff } from './game/staff.js';
import { iniziaNuovaStagione } from './game/continuita.js';
import { accettaSponsor } from './game/sponsor.js';
import { gestisciStadio } from './game/stadio.js';
import { impostaAllenamento } from './game/allenamento.js';
import { creaPromessa } from './game/spogliatoio.js';
import { rinnovaContratto, accettaRiduzioneVolontaria, segnalaInteresseU13, cambiaGruppoGiocatore } from './game/carriere.js';
import { offriAProvino } from './game/eventiCarriera.js';
import { richiediU23 } from './game/secondeSquadre.js';
import { confermaNumeriMaglia, impostaNumeroMaglia } from './game/numeriMaglia.js';

export default function App() {
  const [schermata, setSchermata] = useState('menu'); // menu | nuova | gioco
  const [stato, setStato] = useState(null);
  const [skin, setSkin] = useState(() => localStorage.getItem('pm-skin') || 'normale');

  useEffect(() => {
    localStorage.setItem('pm-skin', skin);
    const colori = stato?.squadre.find((s) => s.id === stato.squadraUtenteId)?.colori;
    const colore = skin === 'squadra' && stato && colori?.[0];
    const radice = document.documentElement;
    if (colore) {
      radice.style.setProperty('--accento', colore);
      radice.style.setProperty('--accento-chiaro', colore);
      const hex = colore.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
      radice.style.setProperty('--accento-testo', (r * .299 + g * .587 + b * .114) > 155 ? '#111827' : '#ffffff');
    } else {
      radice.style.removeProperty('--accento');
      radice.style.removeProperty('--accento-chiaro');
      radice.style.removeProperty('--accento-testo');
    }
  }, [skin, stato?.squadraUtenteId, stato?.squadre]);

  // Autosave: ogni modifica allo stato di gioco viene persistita.
  useEffect(() => {
    if (stato) salva(stato);
  }, [stato]);

  function aggiornaGiocatore(aggiornato) {
    setStato((s) => ({
      ...s,
      giocatori: s.giocatori.map((g) => (g.id === aggiornato.id ? aggiornato : g)),
    }));
  }

  function aggiornaSquadra(aggiornata) {
    setStato((s) => ({
      ...s,
      squadre: s.squadre.map((x) => (x.id === aggiornata.id ? aggiornata : x)),
    }));
  }

  function handleAvanza() {
    const ris = avanza(stato);
    setStato(ris.stato);
    return ris;
  }

  // matchInterattivo: risultato della partita giocata in 2D (null = simula tutto).
  function handleGiocaGiornata(matchInterattivo = null) {
    const ris = giocaGiornata(stato, matchInterattivo);
    setStato(ris.stato);
    return ris;
  }

  // Scena in ufficio: obiettivo di stagione + discorso di presentazione.
  function handleConcludiUfficio(scelte) {
    setStato(concludiInizioStagione(stato, scelte));
  }

  // Mercato: offerta dell'utente (accettata = stato nuovo; altrimenti solo esito).
  function handleOffri(giocatoreId, importo) {
    const ris = offri(stato, giocatoreId, importo);
    if (ris.stato) setStato(ris.stato);
    return ris.esito;
  }

  function handleIngaggia(giocatoreId, durata, stipendio) {
    const ris = ingaggiaSvincolato(stato, giocatoreId, durata, stipendio);
    if (ris.stato) setStato(ris.stato);
    return ris.esito;
  }

  function handleRispondiOfferta(trattativaId, accetta) {
    setStato(rispondiOfferta(stato, trattativaId, accetta));
  }

  function handleSegnaLetta(notiziaId) {
    setStato((s) => ({ ...s, notizie: s.notizie.map((n) => n.id === notiziaId ? { ...n, letta: true } : n) }));
  }

  function handleAssumiStaff(ruolo, candidatoId) {
    setStato(assumiStaff(stato, ruolo, candidatoId));
  }

  function handleLicenziaStaff(ruolo) {
    setStato(licenziaStaff(stato, ruolo));
  }

  function handleAccettaSponsor(offertaId) {
    const ris = accettaSponsor(stato, offertaId);
    if (ris.esito.ok) setStato(ris.stato);
    return ris.esito;
  }

  function handleGestisciStadio(azione) {
    const ris = gestisciStadio(stato, azione);
    if (ris.esito.ok) setStato(ris.stato);
    return ris.esito;
  }

  function handleRinnova(giocatoreId, durata, stipendio) {
    if (durata === 'riduzione') {
      setStato((s) => accettaRiduzioneVolontaria(s, giocatoreId));
      return { ok: true, messaggio: 'Riduzione accettata.' };
    }
    const ris = rinnovaContratto(stato, giocatoreId, durata, stipendio);
    if (ris.esito.ok) setStato(ris.stato);
    return ris.esito;
  }

  function handleProvino(sessioneId, giocatoreId) {
    const ris = offriAProvino(stato, sessioneId, giocatoreId);
    if (ris.esito.ok) setStato(ris.stato);
    return ris.esito;
  }

  function handleRichiediU23() {
    const ris = richiediU23(stato);
    if (ris.esito.ok) setStato(ris.stato);
    return ris.esito;
  }

  function handleInteresseU13(giocatoreId) {
    const ris = segnalaInteresseU13(stato, giocatoreId);
    if (ris.esito.ok) setStato(ris.stato);
    return ris.esito;
  }

  function handleCambioGruppo(giocatoreId, destinazione) {
    const ris = cambiaGruppoGiocatore(stato, giocatoreId, destinazione);
    if (ris.esito.ok) setStato(ris.stato);
    return ris.esito;
  }

  if (schermata === 'nuova') {
    return (
      <NewCareer
        onAnnulla={() => setSchermata('menu')}
        onInizia={(nuovoStato) => {
          setStato(nuovoStato);
          setSchermata('gioco');
        }}
      />
    );
  }

  if (schermata === 'gioco' && stato) {
    return (
      <GameShell
        stato={stato}
        onAggiornaGiocatore={aggiornaGiocatore}
        onAggiornaSquadra={aggiornaSquadra}
        onAvanza={handleAvanza}
        onGiocaGiornata={handleGiocaGiornata}
        onConcludiUfficio={handleConcludiUfficio}
        onOffri={handleOffri}
        onIngaggia={handleIngaggia}
        onRispondiOfferta={handleRispondiOfferta}
        onSegnaLetta={handleSegnaLetta}
        onAssumiStaff={handleAssumiStaff}
        onLicenziaStaff={handleLicenziaStaff}
        onAccettaSponsor={handleAccettaSponsor}
        onGestisciStadio={handleGestisciStadio}
        onImpostaAllenamento={(modifiche) => setStato((s) => impostaAllenamento(s, modifiche))}
        onPromessa={(giocatoreId, tipo) => setStato((s) => creaPromessa(s, giocatoreId, tipo))}
        onRinnova={handleRinnova}
        onProvino={handleProvino}
        onRichiediU23={handleRichiediU23}
        onInteresseU13={handleInteresseU13}
        onCambioGruppo={handleCambioGruppo}
        onNumeroMaglia={(giocatoreId, numero) => setStato((s) => impostaNumeroMaglia(s, s.squadraUtenteId, giocatoreId, numero))}
        onConfermaNumeri={(delegata) => setStato((s) => confermaNumeriMaglia(s, delegata))}
        onNuovaStagione={() => setStato((s) => iniziaNuovaStagione(s))}
        onEsci={() => {
          salva(stato);
          setStato(null);
          setSchermata('menu');
        }}
      />
    );
  }

  return (
    <MainMenu
      skin={skin}
      onSkinChange={setSkin}
      onNuovaCarriera={() => setSchermata('nuova')}
      onContinua={() => {
        const salvato = carica();
        if (salvato) {
          setStato(salvato);
          setSchermata('gioco');
        }
      }}
    />
  );
}
