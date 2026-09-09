/* Headless harness: loads the deployed content.js + engine.js verbatim into a vm
   context and drives full 20-turn terms under several strategies. */
const fs = require('fs');
const vm = require('vm');

function makeEngine(seed) {
  const store = {};
  const ctx = {
    window: {},
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, String: String, Number: Number, RegExp: RegExp,
    console: console
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../js/content.js', 'utf8'), ctx, { filename: 'content.js' });
  vm.runInContext(fs.readFileSync(__dirname + '/../js/engine.js', 'utf8'), ctx, { filename: 'engine.js' });
  const E = ctx.window.Engine;
  E.reset();
  if (seed !== undefined) E.state.seed = seed;
  return { E: E, ctx: ctx, store: store };
}

/* ---- strategies: given card (agendaCard), return choice index or null to skip ---- */
const STRATS = {
  random(card, s, rng) { return Math.floor(rng() * card.choices.length); },
  /* pick the option with the best immediate approval, tie-break by treasury */
  approval(card) {
    let best = 0, bestScore = -1e9;
    card.choices.forEach((c, i) => {
      const e = rawEffects(card, i);
      const sc = (e.approval || 0) * 3 + (e.britain || 0) + (e.economy || 0) + (e.housing || 0) + (e.power || 0) * 0.5 + (e.treasury || 0) * 0.2;
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    return best;
  },
  /* spend freely: maximise indicator gain regardless of treasury */
  spender(card) {
    let best = 0, bestScore = -1e9;
    card.choices.forEach((c, i) => {
      const e = rawEffects(card, i);
      const sc = (e.britain || 0) * 2 + (e.economy || 0) * 2 + (e.housing || 0) * 2 + (e.approval || 0) * 1.5 + (e.power || 0) * 0.5;
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    return best;
  },
  /* frugal: maximise treasury, then approval */
  /* prudent: values money but still funds what is failing; the honest "restraint" bot */
  prudent(card) {
    let best = 0, bestScore = -1e9;
    card.choices.forEach((c, i) => {
      const e = rawEffects(card, i);
      const sc = (e.treasury || 0) * 1.2 + (e.britain || 0) * 1.1 + (e.approval || 0) * 0.8 + (e.economy || 0) + (e.housing || 0) + (e.power || 0) * 0.4;
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    return best;
  },
  frugal(card) {
    let best = 0, bestScore = -1e9;
    card.choices.forEach((c, i) => {
      const e = rawEffects(card, i);
      const sc = (e.treasury || 0) * 3 + (e.approval || 0) + (e.britain || 0) * 0.5;
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    return best;
  },
  nothing() { return null; }
};

let CURRENT;
function rawEffects(card, i) {
  const ev = CURRENT.E.state.generated[card.id] || CURRENT.ctx.getEvent(card.id);
  return ev.choices[i].e || {};
}

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function playTerm(opts) {
  const { seed, strategy, promises, negotiate } = opts;
  const H = module.exports.makeEngine(seed);
  CURRENT = H;
  const E = H.E;
  const rng = mulberry(seed);
  E.setPromises(promises, []);
  E.beginTerm();
  const log = { agendaSizes: [], emptyAgendas: 0, bills: 0, billsPassed: 0, billsFailed: 0, billsAbandoned: 0,
                minHeadroom: 999, maxHeadroom: -999, approvalPath: [], headroomPath: [], errors: [] };
  const pick = STRATS[strategy];
  while (E.state.turn <= E.TURNS) {
    const s = E.state;
    const eventItems = s.agenda.filter(a => !String(a.eventId).startsWith('invest:'));
    log.agendaSizes.push(s.agenda.length);
    if (eventItems.length === 0 && s.turn < E.TURNS) log.emptyAgendas++;
    // urgent first, then others, then invest
    const order = s.agenda.slice().sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
    for (const entry of order) {
      if (entry.done) continue;
      if (s.actionsLeft < (entry.cost || 0)) continue;
      const card = E.agendaCard(entry);
      const idx = pick(card, s, rng);
      if (idx === null) continue;
      let r;
      try { r = E.decide(entry.eventId, idx); } catch (e) { log.errors.push('decide: ' + e.message); continue; }
      if (r && r.vote) {
        log.bills++;
        if (negotiate === 'abandon') { E.abandonBill(); log.billsAbandoned++; continue; }
        if (negotiate === 'all') {
          E.negotiate('concede'); E.negotiate('talk');
          if (E.voteState().support < 326) E.negotiate('threaten');
        } else if (negotiate === 'concede') {
          E.negotiate('concede'); E.negotiate('concede'); E.negotiate('concede');
        }
        let vr;
        try { vr = E.holdVote(); } catch (e) { log.errors.push('holdVote: ' + e.message); E.state.bill = null; continue; }
        if (vr.voteOutcome.passed) log.billsPassed++; else log.billsFailed++;
      }
    }
    log.approvalPath.push(Math.round(s.approval));
    log.headroomPath.push(Math.round(s.headroom));
    log.minHeadroom = Math.min(log.minHeadroom, s.headroom);
    log.maxHeadroom = Math.max(log.maxHeadroom, s.headroom);
    let rep;
    try { rep = E.endTurn(); } catch (e) { log.errors.push('endTurn: ' + e.message); break; }
    if (rep.final) { log.final = rep.final; break; }
  }
  if (!log.final) log.final = E.finish();
  log.state = E.state;
  return log;
}

module.exports = { makeEngine, playTerm, STRATS };

if (require.main === module) {
  const N = parseInt(process.argv[2] || '400', 10);
  const promiseSets = [
    ['nhs', 'housing', 'growth'], ['tax', 'crime', 'climate'], ['nhs', 'tax', 'crime'], ['growth', 'housing', 'climate']
  ];
  const rows = [];
  for (const strategy of Object.keys(STRATS)) {
    for (const negotiate of ['none', 'all', 'concede', 'abandon']) {
      if (strategy === 'nothing' && negotiate !== 'none') continue;
      const agg = { wins: 0, seats: 0, approval: 0, delivered: 0, total: 0, headroom: 0, minHR: 0, bills: 0, passed: 0, failed: 0, abandoned: 0,
                    empty: 0, errors: {}, legacy: {}, promiseMet: {}, promiseCount: {}, econ: 0, health: 0, services: 0, party: 0 };
      for (let i = 0; i < N; i++) {
        const promises = promiseSets[i % promiseSets.length];
        const log = playTerm({ seed: 1000 + i, strategy, promises, negotiate });
        const f = log.final;
        agg.wins += f.won ? 1 : 0; agg.seats += f.seats; agg.approval += log.state.approval;
        agg.delivered += f.delivered; agg.total += f.total; agg.headroom += log.state.headroom; agg.minHR += log.minHeadroom;
        agg.bills += log.bills; agg.passed += log.billsPassed; agg.failed += log.billsFailed; agg.abandoned += log.billsAbandoned;
        agg.empty += log.emptyAgendas;
        agg.econ += log.state.indicators.economy; agg.health += log.state.indicators.health; agg.services += log.state.indicators.services; agg.party += log.state.party;
        agg.legacy[f.legacy] = (agg.legacy[f.legacy] || 0) + 1;
        f.promises.forEach(p => { agg.promiseCount[p.id] = (agg.promiseCount[p.id] || 0) + 1; if (p.met) agg.promiseMet[p.id] = (agg.promiseMet[p.id] || 0) + 1; });
        log.errors.forEach(e => { agg.errors[e] = (agg.errors[e] || 0) + 1; });
      }
      const pm = {};
      Object.keys(agg.promiseCount).forEach(k => { pm[k] = Math.round(100 * (agg.promiseMet[k] || 0) / agg.promiseCount[k]) + '%'; });
      rows.push({
        strategy, negotiate, winRate: (100 * agg.wins / N).toFixed(1) + '%', avgSeats: (agg.seats / N).toFixed(0),
        avgApproval: (agg.approval / N).toFixed(1), promisesKept: (agg.delivered / N).toFixed(2) + '/3',
        avgHeadroom: (agg.headroom / N).toFixed(1), avgMinHeadroom: (agg.minHR / N).toFixed(1),
        bills: (agg.bills / N).toFixed(2), passRate: agg.bills ? (100 * agg.passed / agg.bills).toFixed(0) + '%' : '-',
        emptyAgendaTurns: (agg.empty / N).toFixed(2), econ: (agg.econ / N).toFixed(0), health: (agg.health / N).toFixed(0),
        services: (agg.services / N).toFixed(0), party: (agg.party / N).toFixed(0),
        legacy: JSON.stringify(agg.legacy), promises: JSON.stringify(pm), errors: JSON.stringify(agg.errors)
      });
    }
  }
  console.table(rows.map(r => { const c = Object.assign({}, r); delete c.legacy; delete c.promises; delete c.errors; return c; }));
  rows.forEach(r => console.log(r.strategy, r.negotiate, 'legacy', r.legacy, 'promises', r.promises, 'errors', r.errors));
}
