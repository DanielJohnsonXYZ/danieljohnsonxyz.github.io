/* Boots the scene: load a save if there is one, work out where that leaves
   the player, mount every module once, and render. Everything after this is
   event-driven — nothing else in the app runs on a timer. */

window.YM = window.YM || {};
YM.app = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus;

  const MODULES = [YM.hud, YM.map, YM.dials, YM.desk];

  function syncVisibility() {
    const atTitle = B.scene.phase === 'title';
    D.$('hud').hidden = atTitle;
    D.$('app').hidden = atTitle;
  }

  /* Pure: works out where a loaded game should resume, without touching
     anything. Boot and enterScene use this; nothing here has side effects. */
  function derivePhase() {
    if (E.state.turn > E.TURNS && E.state.lastReport && E.state.lastReport.final) return 'verdict';
    if (E.state.bill) return 'vote';
    return 'desk';
  }

  function enterScene() {
    const phase = derivePhase();
    B.setPhase(phase);
    syncVisibility();
    B.render();
    if (phase === 'vote') YM.vote.open();
    else if (phase === 'verdict') YM.election.show(E.state.lastReport.final);
    /* A reload mid-run (or while the scorecard from that run is still open)
       lands here with E.state.phase still 'consequences' — see the comment
       at the top of js/run.js. The desk is already rendered above; just
       reopen its scorecard, with no animation. */
    else if (phase === 'desk' && E.state.lastReport && E.state.phase === 'consequences') {
      YM.run.scorecard(E.state.lastReport);
    }
  }

  function boot() {
    MODULES.forEach(function (m) { m.mount(); });
    B.on('phase', syncVisibility);
    const loaded = E.load();
    if (!loaded) {
      B.setPhase('title');
      syncVisibility();
      YM.onboarding.title();
      return;
    }
    enterScene();
  }

  return { boot: boot, enterScene: enterScene, derivePhase: derivePhase };
})();

/* Debug surface for the Playwright verification harness. Never advances the
   engine's random sequence on its own — it only arranges state the normal
   flow already knows how to reach. */
window.YM.debug = (function () {
  'use strict';
  const E = window.Engine;

  function newGame(promises, seed) {
    E.reset();
    if (seed !== undefined) E.state.seed = seed;
    E.setPromises(promises || ['nhs', 'housing', 'growth']);
    E.beginTerm();
    YM.app.enterScene();
  }

  /* Loops YM.run.quarter() — the real public entry point, not a shortcut
     into the engine — with motion forced to reduced so every run resolves
     synchronously, dismissing each scorecard as it appears. Auto-answers
     nothing: agenda items left untouched just drift or get neglected, as
     they would for a player who does nothing but run the quarter. Stops
     at turn `n`, at a bill (nothing here can vote), or at the final turn. */
  function runToTurn(n) {
    const prevMotion = document.body.dataset.motion;
    document.body.dataset.motion = 'reduced';
    let guard = 0;
    while (E.state.turn < n && !E.state.bill && guard < 400) {
      guard++;
      YM.run.quarter();
      const sc = document.getElementById('scorecard');
      const btn = sc && sc.querySelector('.overlay-body > button.btn.big.block');
      if (btn) btn.click();
      if (E.state.lastReport && E.state.lastReport.final) break;
    }
    if (prevMotion === undefined) delete document.body.dataset.motion;
    else document.body.dataset.motion = prevMotion;
  }

  function lastSeq() { return YM.run.lastSteps(); }

  function forceAgenda(ids) {
    E.state.agenda = (ids || []).map(function (id, i) {
      const m = (typeof EVENT_META !== 'undefined' && EVENT_META[id]) || {};
      return { eventId: id, urgent: i === 0, cost: m.cost || 1 };
    });
    YM.bus.render();
  }

  function assertSynced() {
    const s = E.state, problems = [];
    const expectHud = {
      approval: Math.round(s.approval), headroom: Math.round(s.headroom),
      party: Math.round(s.party), confidence: E.confidence()
    };
    Object.keys(expectHud).forEach(function (k) {
      const el = document.querySelector('.hud-stat[data-stat="' + k + '"]');
      if (!el) { problems.push('missing hud stat ' + k); return; }
      if (Number(el.getAttribute('data-value')) !== expectHud[k]) {
        problems.push('hud ' + k + ' mismatch: dom=' + el.getAttribute('data-value') + ' engine=' + expectHud[k]);
      }
    });
    YM.fmt.DIAL_KEYS.forEach(function (key) {
      const el = document.querySelector('.dial[data-key="' + key + '"]');
      if (!el) { problems.push('missing dial ' + key); return; }
      const expect = E.readout(key).value;
      if (Number(el.getAttribute('data-value')) !== expect) problems.push('dial ' + key + ' mismatch');
    });
    Object.keys(s.regions).forEach(function (name) {
      const el = document.querySelector('.region[data-region="' + name + '"]');
      if (!el) { problems.push('missing region ' + name); return; }
      const expect = E.regionDetail(name).approval;
      if (Number(el.getAttribute('data-approval')) !== expect) problems.push('region ' + name + ' mismatch');
    });
    if (problems.length) throw new Error('assertSynced failed: ' + problems.join('; '));
    return true;
  }

  return { newGame: newGame, forceAgenda: forceAgenda, assertSynced: assertSynced,
           runToTurn: runToTurn, lastSeq: lastSeq };
})();

document.addEventListener('DOMContentLoaded', YM.app.boot);
