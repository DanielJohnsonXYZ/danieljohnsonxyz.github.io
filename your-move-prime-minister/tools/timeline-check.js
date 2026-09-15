/* Phase 2 engine checks: timeline continuity, history length, tutorial shape,
   defining decisions, and a full term through the onboarding exports. */
const H = require('./harness.js');
let fails = 0;
const ok = (name, cond) => { console.log((cond ? '  ok  ' : '  XX  ') + name); if (!cond) fails++; };

for (const seed of [1, 42, 999, 2024]) {
  const { E } = H.makeEngine(seed);
  E.setPromises(['nhs', 'housing', 'growth']); E.beginTerm();
  let cont = true, hist = true, keys = true, final = null;
  for (let t = 1; t <= 20; t++) {
    const s = E.state;
    s.agenda.filter(a => !a.done).slice(0, 2).forEach(a => {
      const r = E.decide(a.eventId, 0);
      if (r && r.vote) E.holdVote();
    });
    const rep = E.endTurn();
    const last = {};
    rep.timeline.forEach(step => {
      step.changes.forEach(c => {
        if (last[c.key] !== undefined && last[c.key] !== c.from) cont = false;
        last[c.key] = c.to;
        if (typeof c.name !== 'string') keys = false;
      });
    });
    /* the last recorded value must equal the state now */
    Object.keys(last).forEach(k => {
      const now = k === 'approval' || k === 'headroom' || k === 'party' || k === 'confidence' ? s[k]
                : k.slice(0, 7) === 'region:' ? s.regions[k.slice(7)] : s.indicators[k];
      if (Math.round(now) !== last[k]) cont = false;
    });
    if (E.history().length !== s.turn) hist = false;
    if (rep.final) final = rep.final;
  }
  ok('seed ' + seed + ': timeline continuous and ends on live state', cont);
  ok('seed ' + seed + ': history.length === turn', hist);
  ok('seed ' + seed + ': change names present', keys);
  ok('seed ' + seed + ': final has regionOrder/readouts/defining', final && final.regionOrder.length === 6 && final.readouts.length === 6 && final.defining.length <= 3);
  ok('seed ' + seed + ': defining scores descending', final.defining.every((d, i, a) => i === 0 || a[i - 1].score >= d.score));
  ok('seed ' + seed + ': every region row has held/swing/reason', final.regionOrder.every(r => typeof final.seatsByRegion[r].held === 'boolean' && typeof final.seatsByRegion[r].reason === 'string'));
  ok('seed ' + seed + ': record entries carry region and changes', E.state.record.filter(r => r.changes).every(r => r.region || r.eventId === 'election'));
}

/* tutorial term through the onboarding exports */
{
  const { E } = H.makeEngine(7);
  E.beginTerm({ tutorial: true });
  ok('tutorial agenda is exactly [nhs_strike]', E.state.agenda.length === 1 && E.state.agenda[0].eventId === 'nhs_strike');
  ok('tutorial stage first_card', E.onboarding().stage === 'first_card');
  ok('run blocked concept: nhs card carries region', E.agendaCard(E.state.agenda[0]).region === 'North');
  E.decide('nhs_strike', 1);
  E.setOnboardingStage('promises');
  E.markCoach('money'); E.markCoach('money');
  E.lockPromises(['nhs', 'tax', 'crime']);
  ok('lockPromises advances to first_run', E.onboarding().stage === 'first_run' && E.state.promises.length === 3);
  ok('promiseTargets has six with now/target', E.promiseTargets().length === 6 && E.promiseTargets().every(p => p.now && p.target && p.region));
  let errs = 0;
  for (let t = 1; t <= 20; t++) {
    try {
      E.state.agenda.filter(a => !a.done).forEach(a => { const r = E.decide(a.eventId, 0); if (r && r.vote) E.holdVote(); });
      E.endTurn();
    } catch (e) { errs++; console.log(e.stack); }
  }
  ok('tutorial term plays to the end without error', errs === 0 && E.state.turn === 21);
  ok('save round-trips with v3 fields', (() => { E.save(); const before = E.state.history.length; return E.load() && E.state.history.length === before && E.state.onboarding.stage === 'first_run'; })());
}
console.log(fails ? 'FAILED ' + fails : 'ALL OK');
process.exit(fails ? 1 : 0);
