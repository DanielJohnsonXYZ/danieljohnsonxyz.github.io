/* Simulation engine.

   The model from the original sim.js survives here, but three things changed:

   - Every indicator now runs in the same direction: higher is better. The old mix
     of "pressure" scores (high = bad) and quality scores (high = good) meant the
     player had to remember which way each dial pointed.
   - Indicators carry a human readout. Internally the NHS is a number out of 100;
     to the player it is a waiting list in millions, because that is the sentence
     a person can actually say out loud.
   - Decisions move the numbers far more than noise does. The old polling signal
     was smaller than its own random jitter, so nine months of active government
     moved the polls by one point.

   The engine holds no DOM references. ui.js renders whatever this returns. */

window.Engine = (function () {
  'use strict';

  const TURNS = 20;               // a five-year term, one turn per quarter
  const ACTIONS_PER_TURN = 3;
  const SAVE_KEY = 'ympm.save.v3';
  const SAVE_VERSION = 3;
  const COMMONS_SEATS = 650;
  const MAJORITY_THRESHOLD = 326; // seats needed to win a Commons vote

  const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
  const round = Math.round;
  const round1 = n => Math.round(n * 10) / 10;

  /* ---------------------------------------------------------------- state */

  /* Indicators all read 0-100, higher = better. The starting values are the
     original sim.js opening position, with the old "pressure" scores inverted
     (healthPressure 72 becomes an NHS score of 28). */
  function freshState(seed) {
    return {
      version: SAVE_VERSION,
      seed: seed || Date.now(),
      turn: 1,
      phase: 'briefing',          // briefing | decision | vote | consequences | end
      approval: 52,
      headroom: 24,               // £bn of fiscal room, not a 0-100 score
      borrowingCost: 0,           // £bn/quarter of debt interest, last quarter
      confidence: 70,             // market confidence, 0-100
      lastMarketsTurn: -99,       // last turn the markets event was offered
      party: 73,
      majority: 24,
      indicators: {
        health: 28, housing: 32, economy: 61, services: 48,
        crime: 46, energy: 44, transport: 45, migration: 42, defence: 55
      },
      regions: { Scotland: 49, North: 51, Midlands: 52, Wales: 50, London: 55, South: 52 },
      prevRegions: null,
      promises: [],
      customPromises: [],
      actionsLeft: ACTIONS_PER_TURN,
      agenda: [],
      pending: [],                // delayed consequences waiting to mature
      resolved: [],               // event ids already played
      ignored: {},                // eventId -> how many turns it has been left
      record: [],
      news: [],
      flags: { taxRaised: false },
      unlocked: { britain: false, government: false },
      lastReport: null,
      bill: null,                 // in-flight Commons vote
      generated: {},              // investment decisions minted this term
      invested: {},               // topic -> how many times funded, for diminishing returns
      history: [],                // one point per quarter, for sparklines and the election
      onboarding: { stage: 'done', seen: {} }  // first-term guidance; 'done' once shown
    };
  }

  /* Events come from the content library; investment decisions are minted at
     runtime. Both are addressed the same way so they flow through one code path. */
  function lookup(id) {
    return state.generated[id] || getEvent(id);
  }

  /* Scheduling metadata for either kind of decision. */
  function meta(id) {
    const g = state.generated[id];
    if (g) {
      if (g.invest) return { topic: g.investTopic, promise: null, cost: 1, invest: true };
      return { topic: g.topic || null, promise: null, cost: g.cost || 1 };
    }
    return EVENT_META[id] || {};
  }

  let state = freshState();

  /* Deterministic PRNG so a saved game resumes identically rather than
     re-rolling every uncertain outcome on reload. */
  function rand() {
    state.seed = (state.seed * 1664525 + 1013904223) % 4294967296;
    return state.seed / 4294967296;
  }

  /* ------------------------------------------------------- human readouts */

  /* Every indicator gets a sentence. If a player cannot say it in a pub,
     it is the wrong readout. */
  const READOUTS = {
    health: v => ({
      headline: (4.0 + (100 - v) * 0.05).toFixed(1) + 'm waiting',
      detail: 'People on an NHS waiting list'
    }),
    housing: v => ({
      headline: round(150 + v * 1.8).toLocaleString() + 'k homes a year',
      detail: 'New homes being built annually'
    }),
    economy: v => ({
      headline: ((v - 45) * 0.075).toFixed(1) + '% growth',
      detail: 'Inflation ' + (2 + (100 - v) * 0.045).toFixed(1) +
              '% · Unemployment ' + (3.2 + (100 - v) * 0.038).toFixed(1) + '%'
    }),
    services: v => ({ headline: label(v) + ' condition', detail: 'Schools, councils and public services' }),
    crime:     v => ({ headline: label(v) + ' confidence', detail: 'Public confidence in policing and courts' }),
    energy:    v => ({ headline: label(v) + ' security', detail: 'Energy supply and the transition to clean power' }),
    transport: v => ({ headline: label(v) + ' reliability', detail: 'Rail and road performance' }),
    migration: v => ({ headline: label(v) + ' control', detail: 'Confidence the system is being managed' }),
    defence:   v => ({ headline: label(v) + ' readiness', detail: 'Armed forces and alliance standing' })
  };

  const INDICATOR_NAMES = {
    health: 'NHS', housing: 'Housing', economy: 'Economy', services: 'Public services',
    crime: 'Crime', energy: 'Energy', transport: 'Transport', migration: 'Migration',
    defence: 'Defence'
  };

  function label(v) {
    if (v >= 70) return 'Strong';
    if (v >= 55) return 'Steady';
    if (v >= 42) return 'Strained';
    if (v >= 28) return 'Poor';
    return 'Critical';
  }

  /* The same sentence for any value, so "where you started" and "where you
     are" on election night come out of one function. */
  function readoutValue(key, value) {
    const v = clamp(value);
    const r = (READOUTS[key] || (x => ({ headline: label(x), detail: '' })))(v);
    return { key: key, name: INDICATOR_NAMES[key] || key, value: round(v), status: label(v),
             headline: r.headline, detail: r.detail };
  }

  function readout(key) {
    const v = clamp(state.indicators[key]);
    const r = (READOUTS[key] || (x => ({ headline: label(x), detail: '' })))(v);
    return { key: key, name: INDICATOR_NAMES[key] || key, value: round(v), status: label(v),
             headline: r.headline, detail: r.detail };
  }

  /* Regions are not six copies of the national mood. Each weights the country's
     indicators differently, so a housing collapse guts London while Scotland
     barely moves, and a transport failure is felt in the North first. This is
     what makes the map worth looking at. */
  const REGION_CHARACTER = {
    Scotland: { drivers: { services: 0.30, energy: 0.30, health: 0.22, economy: 0.18 },
                noun: 'Scotland' },
    North:    { drivers: { transport: 0.32, economy: 0.28, health: 0.22, housing: 0.18 },
                noun: 'the North' },
    Midlands: { drivers: { economy: 0.34, transport: 0.24, health: 0.22, housing: 0.20 },
                noun: 'the Midlands' },
    Wales:    { drivers: { economy: 0.30, services: 0.28, health: 0.26, transport: 0.16 },
                noun: 'Wales' },
    London:   { drivers: { housing: 0.44, transport: 0.24, economy: 0.20, crime: 0.12 },
                noun: 'London' },
    South:    { drivers: { housing: 0.34, economy: 0.30, crime: 0.20, transport: 0.16 },
                noun: 'the South' }
  };

  /* How the country feels in one place, on the same 0-100 scale as everything else. */
  function localCondition(name) {
    const c = REGION_CHARACTER[name];
    if (!c) return 50;
    let total = 0, weight = 0;
    Object.keys(c.drivers).forEach(function (k) {
      total += clamp(state.indicators[k]) * c.drivers[k];
      weight += c.drivers[k];
    });
    return weight ? total / weight : 50;
  }

  /* Conditions you can see on the ground. These drive the markers on the map,
     so investment shows up as cranes and neglect shows up as warnings. */
  const REGION_SIGNS = [
    { key: 'health',    when: v => v < 34, icon: '🏥', label: 'Hospitals overwhelmed' },
    { key: 'health',    when: v => v > 62, icon: '💚', label: 'Waiting lists falling' },
    { key: 'housing',   when: v => v < 32, icon: '🏚️', label: 'Housing unaffordable' },
    { key: 'housing',   when: v => v > 58, icon: '🏗️', label: 'Building again' },
    { key: 'economy',   when: v => v < 40, icon: '📉', label: 'Jobs being lost' },
    { key: 'economy',   when: v => v > 70, icon: '📈', label: 'Business investing' },
    { key: 'transport', when: v => v < 34, icon: '🚧', label: 'Transport failing' },
    { key: 'transport', when: v => v > 62, icon: '🚄', label: 'Transport improving' },
    { key: 'energy',    when: v => v < 34, icon: '🔌', label: 'Energy insecure' },
    { key: 'energy',    when: v => v > 62, icon: '⚡', label: 'Clean power online' },
    { key: 'crime',     when: v => v < 34, icon: '🚔', label: 'Crime rising' },
    { key: 'crime',     when: v => v > 62, icon: '🛡️', label: 'Streets safer' },
    { key: 'services',  when: v => v < 34, icon: '🏫', label: 'Schools and councils cut' },
    { key: 'services',  when: v => v > 62, icon: '📚', label: 'Services improving' }
  ];

  function regionSigns(name) {
    const c = REGION_CHARACTER[name];
    if (!c) return [];
    /* Only a place's two defining concerns produce signs, otherwise every region
       shows the same national story and the map stops meaning anything. */
    const dominant = Object.keys(c.drivers)
      .sort(function (a, b) { return c.drivers[b] - c.drivers[a]; })
      .slice(0, 2);
    return REGION_SIGNS
      .filter(function (sign) {
        return dominant.indexOf(sign.key) >= 0 && sign.when(clamp(state.indicators[sign.key]));
      })
      .sort(function (a, b) { return c.drivers[b.key] - c.drivers[a.key]; })
      .slice(0, 2);
  }

  /* Everything the map needs about one place. */
  function regionDetail(name) {
    const approval = clamp(state.regions[name]);
    const before = state.prevRegions ? state.prevRegions[name] : approval;
    const condition = localCondition(name);
    const signs = regionSigns(name);
    const c = REGION_CHARACTER[name] || { noun: name };
    /* The sentence is derived from the same bands as the status word, so the
       two can never disagree with each other on the same screen. */
    const Noun = c.noun.charAt(0).toUpperCase() + c.noun.slice(1);
    const STORIES = {
      Critical: 'Things are visibly going wrong in ' + c.noun + '.',
      Poor:     Noun + ' is in real trouble.',
      Strained: Noun + ' is under strain.',
      Steady:   'Life in ' + c.noun + ' is holding steady.',
      Strong:   Noun + ' is doing well.'
    };
    const story = STORIES[label(condition)];
    return {
      name: name, approval: round(approval), delta: round(approval) - round(before),
      condition: round(condition), status: label(condition),
      signs: signs, story: story,
      drivers: Object.keys(c.drivers || {}).map(function (k) {
        return { name: INDICATOR_NAMES[k] || k, value: round(clamp(state.indicators[k])), weight: c.drivers[k] };
      }).sort(function (a, b) { return b.weight - a.weight; })
    };
  }

  function regions() { return Object.keys(state.regions).map(regionDetail); }

  /* Where on the map a decision lands. Events about a place are pinned to it;
     everything else goes to the region that cares most about the topic, and
     Westminster business goes to London. */
  const EVENT_REGION = {
    nhs_strike: 'North', planning: 'South', tax_gap: 'London', rates: 'London', prisons: 'Midlands',
    energy: 'Scotland', minister_scandal: 'London', rail: 'North', migration: 'South', schools: 'Midlands',
    defence: 'Scotland', local_elections: 'Midlands', flood: 'Wales', ai_jobs: 'London', lords: 'London',
    by_election: 'Midlands', growth_budget: 'London', pmqs: 'London', data_breach: 'London',
    final_budget: 'London', eastern_europe_crisis: 'Scotland', shipping_shock: 'South',
    leadership_rumours: 'London', winter_crisis: 'Wales', rent_protests: 'London', strike_wave: 'North',
    opposition_lead: 'Midlands', inflation_spike: 'Midlands', crime_wave: 'South', blackout_warning: 'Scotland',
    pre_election_giveaway: 'South', manifesto_reckoning: 'London', honours_row: 'London', trade_talks: 'South',
    nurses_dispute: 'Wales'
  };

  function regionFor(eventId, topic) {
    if (eventId && EVENT_REGION[eventId]) return EVENT_REGION[eventId];
    let best = null, bestW = 0;
    Object.keys(REGION_CHARACTER).forEach(function (r) {
      const w = REGION_CHARACTER[r].drivers[topic] || 0;
      if (w > bestW) { bestW = w; best = r; }
    });
    return best || 'London';
  }

  /* Indicators the player sees on the Britain view, worst first so the thing
     that needs attention is at the top. */
  function britain() {
    return ['health', 'housing', 'economy', 'crime', 'energy', 'transport']
      .map(readout)
      .sort((a, b) => a.value - b.value);
  }

  /* ------------------------------------------------------------- promises */

  /* A promise is the player's own objective, so its status is the spine of the
     briefing screen rather than a score revealed at the end. */
  const PROMISE_TESTS = {
    nhs:     s => s.indicators.health  >= 45,
    housing: s => s.indicators.housing >= 45,
    growth:  s => s.indicators.economy >= 66,
    crime:   s => s.indicators.crime   >= 55,
    climate: s => s.indicators.energy  >= 55,
    tax:     s => !s.flags.taxRaised && s.headroom >= 8
  };

  const PROMISE_MARGIN = {
    nhs: s => s.indicators.health - 45, housing: s => s.indicators.housing - 45,
    growth: s => s.indicators.economy - 66, crime: s => s.indicators.crime - 55,
    climate: s => s.indicators.energy - 55,
    tax: s => s.flags.taxRaised ? -20 : s.headroom - 8
  };

  function promiseStatus() {
    const preset = state.promises.map(id => {
      const def = PROMISES.find(p => p[0] === id) || [id, '•', id];
      const met = PROMISE_TESTS[id] ? PROMISE_TESTS[id](state) : false;
      const margin = PROMISE_MARGIN[id] ? PROMISE_MARGIN[id](state) : 0;
      let status = met ? 'On track' : (margin > -12 ? 'At risk' : 'Off track');
      if (state.turn > TURNS) status = met ? 'Delivered' : 'Broken';
      return { id: id, icon: def[1], label: def[2], status: status, met: met, custom: false };
    });
    /* Custom promises are judged on overall standing rather than a specific
       indicator: the original scored them against nothing at all, so writing
       your own pledge made the ending unwinnable. */
    const custom = state.customPromises.map((text, i) => {
      const met = state.approval >= 50 && state.party >= 55;
      let status = met ? 'On track' : 'At risk';
      if (state.turn > TURNS) status = met ? 'Delivered' : 'Broken';
      return { id: 'custom' + i, icon: '✍️', label: text, status: status, met: met, custom: true };
    });
    return preset.concat(custom);
  }

  function promisesDelivered() { return promiseStatus().filter(p => p.met).length; }
  function totalPromises() { return state.promises.length + state.customPromises.length; }

  /* -------------------------------------------------------------- effects */

  /* Event effects use the original content's vocabulary. `britain` means "the
     state of this part of Britain", so it moves both the national services
     score and the indicator for whatever the event was about. */
  function applyEffects(effects, topic, scale) {
    const s = scale === undefined ? 1 : scale;
    const applied = [];
    const push = (name, before, after) => {
      if (round(before) !== round(after)) {
        applied.push({ name: name, from: round(before), to: round(after), delta: round(after) - round(before) });
      }
    };
    Object.keys(effects || {}).forEach(key => {
      const v = effects[key] * s;
      if (key === 'approval') {
        const b = state.approval; state.approval = clamp(state.approval + v); push('Approval', b, state.approval);
      } else if (key === 'treasury') {
        const b = state.headroom; state.headroom = clamp(state.headroom + v, -150, 120); push('Fiscal headroom', b, state.headroom);
      } else if (key === 'power') {
        const b = state.party; state.party = clamp(state.party + v); push('Your party', b, state.party);
      } else if (key === 'economy') {
        const b = state.indicators.economy; state.indicators.economy = clamp(b + v); push('Economy', b, state.indicators.economy);
      } else if (key === 'housing') {
        const b = state.indicators.housing; state.indicators.housing = clamp(b + v); push('Housing', b, state.indicators.housing);
      } else if (key === 'britain') {
        /* "britain" used to always move Public services and, on top of that,
           the event's own topic — so an NHS package inflated schools and
           councils for free. It now moves one or the other: Public services
           when the event is actually about public services (or has no
           topic indicator of its own), otherwise just the topic itself. */
        const hasOwnIndicator = topic && state.indicators[topic] !== undefined;
        if (!hasOwnIndicator || topic === 'services') {
          const b = state.indicators.services; state.indicators.services = clamp(b + v); push('Public services', b, state.indicators.services);
        } else {
          const t = state.indicators[topic];
          state.indicators[topic] = clamp(t + v);
          push(INDICATOR_NAMES[topic] || topic, t, state.indicators[topic]);
        }
      }
    });
    return applied;
  }

  /* Outcomes are uncertain: the same choice does not produce the same number
     every playthrough, so a second run is worth taking. */
  function uncertainty() { return 0.72 + rand() * 0.56; }

  function previewRange(effects) {
    const out = [];
    const NAMES = { approval: 'Approval', treasury: 'Fiscal headroom', power: 'Your party',
                    economy: 'Economy', housing: 'Housing', britain: 'Public services' };
    Object.keys(effects || {}).forEach(k => {
      const lo = effects[k] * 0.72, hi = effects[k] * 1.28;
      const unit = k === 'treasury' ? '£' : '';
      /* The sign is always spelled out: red text alone must not be the only
         thing telling a player that a choice costs money. */
      const fmt = function (n) {
        const r = round(n);
        const sign = r > 0 ? '+' : (r < 0 ? '\u2212' : '');
        return unit ? sign + unit + Math.abs(r) + 'bn' : sign + Math.abs(r);
      };
      out.push({ name: NAMES[k] || k,
                 range: Math.abs(hi - lo) < 2 ? fmt(effects[k]) : fmt(lo) + ' to ' + fmt(hi),
                 positive: effects[k] > 0 });
    });
    return out;
  }

  /* ---------------------------------------------------------------- agenda */

  /* The turn opens with an agenda rather than a dashboard: two or three things
     that want an answer, one of them urgent. Which events surface depends on
     what is actually going wrong and what the player promised, so no two terms
     run the same script. The original fired six crises on hardcoded months. */
  function buildAgenda() {
    const turn = state.turn;
    if (turn > TURNS) return [];
    if (turn === TURNS) {
      const finale = lookup('election');
      return finale ? [{ eventId: 'election', urgent: true, cost: 0 }] : [];
    }

    const unresolved = e => {
      const m = EVENT_META[e.id];
      return m && m.topic !== 'final' && !state.resolved.includes(e.id);
    };
    let candidates = EVENTS.filter(e => unresolved(e) && turn >= EVENT_META[e.id].from && turn <= EVENT_META[e.id].to);
    /* A quiet turn should never mean nothing to do. If an active player has
       cleared the library faster than new windows are opening, fall back to
       any event that has not fired yet rather than leaving the desk empty. */
    if (!candidates.length) candidates = EVENTS.filter(unresolved);

    const scored = candidates.map(e => {
      const m = EVENT_META[e.id];
      let score = rand() * 12;
      /* Things going badly ask for attention first — capped, so one
         catastrophic indicator cannot make the opening turns entirely
         predictable regardless of the random term and promise pressure. */
      const ind = state.indicators[m.topic];
      if (ind !== undefined) score += Math.min(12, (60 - ind) * 0.55);
      /* An event that can deliver or break a promise matters more. */
      if (m.promise && state.promises.includes(m.promise)) score += 18;
      /* Something ignored keeps coming back, louder. */
      if (state.ignored[e.id]) score += state.ignored[e.id] * 14;
      if (m.topic === 'party' && state.party < 50) score += 12;
      if (m.topic === 'treasury' && state.headroom < 8) score += 20;
      return { event: e, meta: m, score: score };
    }).sort((a, b) => b.score - a.score);

    /* The back half of the term has more content competing for the desk —
       a third slot from turn 13 keeps it from running dry. */
    const slots = turn >= 13 ? 3 : 2;
    const agenda = scored.slice(0, slots).map((c, i) => ({
      eventId: c.event.id, urgent: i === 0, cost: c.meta.cost
    }));

    /* One standing item: money you can put behind a department. This is the old
       budget stepper rewritten as a decision, and it is what makes a manifesto
       promise reachable — the event library alone offers each topic only once. */
    const invest = makeInvestment();
    if (invest) agenda.push({ eventId: invest.id, urgent: false, cost: 1 });

    /* When confidence collapses, the markets force their way onto the desk —
       ahead of everything else, and not more than once every three turns. */
    if (state.confidence < 45 && turn - state.lastMarketsTurn > 2) {
      const markets = makeMarketsEvent();
      agenda.unshift({ eventId: markets.id, urgent: true, cost: meta(markets.id).cost });
      state.lastMarketsTurn = turn;
    }
    return agenda;
  }

  const MARKETS_ADVISER = 'Confidence is ebbing. If borrowing costs spiral, everything else gets harder to fund.';

  function makeMarketsEvent() {
    const id = 'markets:' + state.turn;
    const ev = {
      id: id, icon: '📉', category: 'Crisis', title: 'THE MARKETS HAVE NOTICED',
      text: 'Gilt yields are creeping up and the papers have noticed. The Treasury wants a response before it becomes a crisis of its own.',
      adviser: 'The Chancellor', avatar: '£', adviserText: MARKETS_ADVISER,
      topic: 'services', cost: 2,
      choices: [
        { t: 'Emergency spending cuts', s: 'Reassure the markets, fast',
          e: { treasury: 8, britain: -5, approval: -3, power: -2 },
          h: 'EMERGENCY CUTS TO CALM THE MARKETS', d: 'Whitehall is ordered to find billions in savings overnight.' },
        { t: 'Raise taxes', s: 'Reassure the markets, at a political cost',
          e: { treasury: 8, approval: -5 },
          h: 'PM RAISES TAXES TO STEADY THE MARKETS', d: 'A tax rise is announced to reassure investors.' },
        { t: 'Hold the line', s: '40% chance of a crisis',
          e: { approval: 1 }, h: 'MARKETS HOLD THEIR NERVE', d: 'No emergency action is taken. Gilt yields ease back overnight.',
          risk: { chance: 0.4,
                  e: { economy: -8, approval: -6, power: -8, treasury: -6 },
                  h: 'GILT MARKET CRISIS FORCES EMERGENCY BUDGET',
                  d: 'Borrowing costs spike overnight, forcing an emergency budget within days.' } }
      ]
    };
    state.generated[id] = ev;
    return ev;
  }

  /* Pick the topic that most needs money: a promise the player is failing
     first, otherwise whatever is worst. */
  function investmentTopic() {
    const promiseTopics = { nhs: 'health', housing: 'housing', growth: 'economy',
                            crime: 'crime', climate: 'energy' };
    const failing = state.promises
      .filter(p => PROMISE_TESTS[p] && !PROMISE_TESTS[p](state) && promiseTopics[p])
      .map(p => promiseTopics[p])
      .sort((a, b) => state.indicators[a] - state.indicators[b]);
    if (failing.length) return failing[0];
    const all = ['health', 'housing', 'economy', 'crime', 'energy', 'transport'];
    return all.sort((a, b) => state.indicators[a] - state.indicators[b])[0];
  }

  const INVEST_COPY = {
    health:   { icon: '🏥', title: 'FUND THE NHS', what: 'the NHS',
                text: 'The Health Secretary has costed three options for bringing waiting lists down. None of them is free.' },
    housing:  { icon: '🏠', title: 'HOUSING PROGRAMME', what: 'housebuilding',
                text: 'Officials have drawn up a housebuilding package. The question is how much of it you are willing to pay for.' },
    economy:  { icon: '📈', title: 'INVEST IN GROWTH', what: 'the economy',
                text: 'The Treasury has a capital investment package ready. It would raise growth, eventually.' },
    crime:    { icon: '🚔', title: 'POLICING AND COURTS', what: 'policing',
                text: 'The Home Secretary wants money for officers and court capacity to clear the backlog.' },
    energy:   { icon: '⚡', title: 'ENERGY SECURITY', what: 'energy supply',
                text: 'Ministers have a plan to secure supply and speed up clean generation. It needs capital now.' },
    transport:{ icon: '🚆', title: 'TRANSPORT INVESTMENT', what: 'the railways',
                text: 'A rail investment package would improve reliability, though not this year.' }
  };

  function makeInvestment() {
    const topic = investmentTopic();
    const copy = INVEST_COPY[topic];
    if (!copy) return null;
    const n = state.invested[topic] || 0;
    /* Each successive package costs more and delivers less: the easy wins go first. */
    const bigCost = 7 + n * 2;
    const smallCost = 3 + n;
    const bigGain = Math.max(4, 9 - n);
    const smallGain = Math.max(2, 5 - n);
    const id = 'invest:' + topic + ':' + state.turn;

    const ev = {
      id: id, icon: copy.icon, category: 'Spending', title: copy.title,
      text: copy.text,
      adviser: 'The Chancellor', avatar: '£',
      adviserText: 'You can fund ' + copy.what + ' properly, fund it partly, or find the money by taking it from somewhere else. There is no fourth option.',
      invest: true, investTopic: topic,
      choices: [
        { t: 'Fund it properly (£' + bigCost + 'bn)', s: 'The full package',
          e: { britain: bigGain, treasury: -bigCost, approval: 2 },
          h: 'BILLIONS COMMITTED TO ' + copy.what.toUpperCase(),
          d: 'Government announces a major funding package for ' + copy.what + '.',
          delay: { after: 6, text: 'The money reaches the front line and ' + copy.what + ' starts to improve.',
                   e: { britain: round(bigGain * 0.6), approval: 1 } } },
        { t: 'A targeted package (£' + smallCost + 'bn)', s: 'Cheaper, slower',
          e: { britain: smallGain, treasury: -smallCost },
          h: 'TARGETED SUPPORT FOR ' + copy.what.toUpperCase(),
          d: 'Ministers announce a smaller, focused package.',
          delay: { after: 6, text: 'The targeted package delivers a modest improvement in ' + copy.what + '.',
                   e: { britain: round(smallGain * 0.5) } } },
        { t: 'Fund it from savings', s: 'No new money, political cost',
          e: { britain: smallGain, power: -4, approval: -1 },
          h: 'WHITEHALL ORDERED TO FIND SAVINGS',
          d: 'Other departments are told to absorb the cost.',
          delay: { after: 6, text: 'The savings bite elsewhere in government.',
                   e: { britain: -2, power: -1 } } }
      ]
    };
    state.generated[id] = ev;
    return ev;
  }

  /* ------------------------------------------------------------- decisions */

  function agendaCard(entry) {
    const ev = lookup(entry.eventId);
    if (!ev) return null;
    const m = meta(ev.id);
    return {
      id: ev.id, icon: ev.icon, category: ev.category, title: ev.title, text: ev.text,
      urgent: entry.urgent, cost: entry.cost, topic: m.topic,
      region: ev.final ? null : regionFor(ev.id, m.topic),
      promise: m.promise && state.promises.includes(m.promise) ? m.promise : null,
      adviser: { name: ev.adviser, avatar: ev.avatar, text: ev.adviserText },
      secondOpinion: secondOpinion(m),
      briefing: getBriefing(ev),
      vote: !!ev.vote, bill: ev.bill || null, final: !!ev.final,
      choices: ev.choices.map((c, i) => ({
        index: i, text: c.t, subtitle: c.s, preview: previewRange(c.e),
        delayed: !!c.delay, affordable: affordable(c)
      }))
    };
  }

  /* A second voice that sometimes disagrees with the event's own adviser,
     driven by whichever pressure is currently worst. */
  function secondOpinion(m) {
    if (state.headroom < 6) {
      return { name: 'The Chancellor', avatar: '£',
               text: 'There is almost no headroom left. Anything you fund now, you fund with borrowing.' };
    }
    if (state.party < 48) {
      return { name: 'Chief Whip', avatar: '🏛',
               text: 'Your own MPs are restless. Another unpopular decision and I cannot promise the votes.' };
    }
    if (state.approval < 42) {
      return { name: 'Party Pollster', avatar: '📊',
               text: 'We are behind. Voters have stopped giving this government the benefit of the doubt.' };
    }
    if (m.promise && state.promises.includes(m.promise)) {
      const def = PROMISES.find(p => p[0] === m.promise);
      return { name: 'Policy Unit', avatar: '📋',
               text: 'This is the one you promised: ' + (def ? def[2] : m.promise) + '. Voters will remember it.' };
    }
    return null;
  }

  function affordable(choice) {
    const cost = -(choice.e && choice.e.treasury ? choice.e.treasury : 0);
    return cost <= 0 || state.headroom - cost >= -90;
  }

  /* Resolve a decision. Returns what happened so the UI can show it immediately
     rather than silently mutating numbers behind a toast. */
  function decide(eventId, choiceIndex) {
    if (state.bill) return { blocked: 'vote' };
    const ev = lookup(eventId);
    if (!ev) return null;
    const entry = state.agenda.find(a => a.eventId === eventId);
    if (!entry || entry.done) return null;
    const choice = ev.choices[choiceIndex];
    if (!choice) return null;
    const m = meta(ev.id);

    if (state.actionsLeft < (entry.cost || 0)) return { blocked: 'actions' };
    if (!affordable(choice)) return { blocked: 'money' };

    /* A whipped bill goes to the Commons instead of resolving immediately. */
    if (ev.vote && !ev.final && choice.voteBoost !== undefined) {
      state.bill = {
        eventId: ev.id, choiceIndex: choiceIndex, name: ev.bill || 'Government Bill',
        rebels: baseRebels(choice.voteBoost), concessions: 0, talked: false,
        threatened: false, turnsDelayed: 0
      };
      state.phase = 'vote';
      return { vote: true, bill: voteState() };
    }

    return commitChoice(ev, choice, m, entry, 1);
  }

  function commitChoice(ev, choice, meta, entry, scale) {
    /* Generic support for a choice with an uncertain downside: if the roll
       falls inside `risk.chance`, the risk's effects and headline replace
       the choice's own rather than the safe outcome landing. */
    let eff = choice.e, headline = choice.h, deck = choice.d;
    if (choice.risk && rand() < choice.risk.chance) {
      eff = choice.risk.e; headline = choice.risk.h; deck = choice.risk.d;
    }

    const scaled = uncertainty() * (scale === undefined ? 1 : scale);
    const changes = applyEffects(eff, meta.topic, scaled);

    if (/raise .*tax|tax rise/i.test(choice.t) && (eff.treasury || 0) > 0) {
      state.flags.taxRaised = true;
    }

    /* The record entry carries enough to replay the decision on election night:
       what moved now, what it promised for later, and (filled in when the
       delayed effect matures) what actually arrived. */
    const recordIndex = state.record.length;
    state.record.push({
      turn: state.turn, title: ev.title, choice: choice.t, headline: headline,
      eventId: ev.id, topic: meta.topic || null, region: ev.final ? null : regionFor(ev.id, meta.topic),
      changes: changes, delayText: choice.delay ? choice.delay.text : null,
      expectedDelay: choice.delay ? choice.delay.e : null, matured: null
    });

    if (choice.delay) {
      state.pending.push({
        dueTurn: state.turn + Math.max(1, Math.round(choice.delay.after / 3)),
        text: choice.delay.text, effects: choice.delay.e, topic: meta.topic,
        cause: ev.title, causeChoice: choice.t, recordIndex: recordIndex
      });
    }

    if (ev.invest && ev.investTopic) {
      state.invested[ev.investTopic] = (state.invested[ev.investTopic] || 0) + 1;
    }

    if (entry) {
      entry.done = true;
      entry.choiceText = choice.t;
      state.actionsLeft = Math.max(0, state.actionsLeft - (entry.cost || 0));
    }
    state.resolved.push(ev.id);
    delete state.ignored[ev.id];
    state.news.unshift({ turn: state.turn, headline: headline, deck: deck });
    state.news = state.news.slice(0, 24);

    return {
      resolved: true, headline: headline, deck: deck, changes: changes,
      delayed: choice.delay ? choice.delay.text : null, eventId: ev.id
    };
  }

  /* ------------------------------------------------------ Commons votes */

  /* Government seats from the majority, done correctly. The original rendered
     326 + majority, which showed 350 MPs for a majority of 24. */
  function govSeats() { return round((COMMONS_SEATS + state.majority) / 2); }

  function baseRebels(voteBoost) {
    /* voteBoost in the content is negative when a choice angers your own side. */
    const hostility = Math.max(0, -voteBoost);
    const unityStrain = Math.max(0, (65 - state.party) * 0.4);
    return round(hostility * 1.6 + unityStrain + rand() * 6);
  }

  function voteState() {
    const b = state.bill;
    if (!b) return null;
    const seats = govSeats();
    const rebels = Math.max(0, b.rebels - b.concessions);
    const support = seats - rebels;
    return {
      name: b.name, govSeats: seats, rebels: rebels, support: support,
      needed: MAJORITY_THRESHOLD, shortfall: MAJORITY_THRESHOLD - support,
      likely: support >= MAJORITY_THRESHOLD + 6 ? 'Likely to pass'
            : support >= MAJORITY_THRESHOLD ? 'Too close to call' : 'Likely to fail',
      canConcede: (b.concessionCount || 0) < 3, canTalk: !b.talked, canThreaten: !b.threatened,
      delayed: b.turnsDelayed
    };
  }

  /* Negotiation: this is where a player learns that having a majority is not
     the same as being able to do things. */
  function negotiate(action) {
    const b = state.bill;
    if (!b) return null;
    if (action === 'talk' && !b.talked && state.actionsLeft <= 0) return { blocked: 'actions' };
    let note = '';
    if (action === 'concede' && (b.concessionCount || 0) < 3) {
      b.concessions += round(4 + rand() * 5);
      state.party = clamp(state.party - 1);
      b.concessionCount = (b.concessionCount || 0) + 1;
      note = 'You water down the bill. Rebels peel away, but so does some of the point of it.';
      b.weakened = (b.weakened || 0) + 1;
    } else if (action === 'talk' && !b.talked) {
      b.talked = true;
      state.actionsLeft -= 1;
      const won = round(rand() * 10);
      b.concessions += won;
      note = won > 5 ? 'An evening of persuasion in your office. Most of them come round.'
                     : 'You hear them out. A few soften; the hard core does not move.';
    } else if (action === 'threaten' && !b.threatened) {
      b.threatened = true;
      if (rand() > 0.42) {
        b.concessions += round(6 + rand() * 8);
        state.party = clamp(state.party - 3);
        note = 'The threat of losing the whip concentrates minds. It also costs you goodwill.';
      } else {
        b.rebels += round(4 + rand() * 6);
        state.party = clamp(state.party - 6);
        note = 'It backfires. Being threatened in public has made them dig in.';
      }
    }
    return { note: note, vote: voteState() };
  }

  function holdVote() {
    const b = state.bill;
    if (!b) return null;
    const ev = lookup(b.eventId);
    const m = meta(b.eventId);
    const entry = state.agenda.find(a => a.eventId === b.eventId);
    const v = voteState();
    const swing = round((rand() - 0.5) * 8);
    const support = v.support + swing;
    const passed = support >= MAJORITY_THRESHOLD;
    const choice = ev.choices[b.choiceIndex];

    let result;
    if (passed) {
      /* A bill dragged through with concessions delivers less than the original. */
      const dilution = Math.max(0.45, 1 - (b.weakened || 0) * 0.22);
      result = commitChoice(ev, choice, m, entry, dilution);
      result.voteOutcome = {
        passed: true, support: support, needed: MAJORITY_THRESHOLD,
        note: b.weakened ? 'It passes, but the version that passed is weaker than the one you introduced.'
                         : 'It passes largely intact.'
      };
      state.party = clamp(state.party - 1);
    } else {
      state.party = clamp(state.party - 5);
      state.approval = clamp(state.approval - 2);
      if (entry) { entry.done = true; entry.choiceText = 'Defeated in the Commons'; }
      state.actionsLeft = Math.max(0, state.actionsLeft - (entry ? entry.cost || 0 : 0));
      state.resolved.push(b.eventId);
      state.record.push({ turn: state.turn, title: ev.title, choice: 'Defeated in the Commons',
                          headline: 'GOVERNMENT DEFEATED ON ' + (b.name || 'BILL').toUpperCase() });
      state.news.unshift({ turn: state.turn, headline: 'GOVERNMENT DEFEATED IN THE COMMONS',
                           deck: b.name + ' falls as ' + (v.rebels) + ' government MPs refuse to back it.' });
      result = {
        resolved: true, headline: 'GOVERNMENT DEFEATED IN THE COMMONS',
        deck: b.name + ' falls.', changes: [], eventId: b.eventId,
        voteOutcome: { passed: false, support: support, needed: MAJORITY_THRESHOLD,
                       note: 'You lost the vote. A defeat on your own bill costs authority you will need later.' }
      };
    }
    state.bill = null;
    state.phase = 'decision';
    return result;
  }

  function abandonBill() {
    const b = state.bill;
    if (!b) return null;
    const entry = state.agenda.find(a => a.eventId === b.eventId);
    if (entry) {
      entry.done = true;
      entry.choiceText = 'Bill abandoned';
      state.actionsLeft = Math.max(0, state.actionsLeft - (entry.cost || 0));
    }
    state.approval = clamp(state.approval - 1);
    state.resolved.push(b.eventId);
    state.record.push({ turn: state.turn, title: (lookup(b.eventId) || {}).title || b.name,
                        choice: 'Abandoned the bill', headline: 'PM SHELVES ' + (b.name || '').toUpperCase() });
    state.bill = null;
    state.phase = 'decision';
    return { resolved: true, headline: 'PM SHELVES ' + (b.name || 'BILL').toUpperCase(),
             deck: 'Ministers quietly drop the legislation.', changes: [], abandoned: true };
  }

  /* ------------------------------------------------------------ end turn */

  /* Running the quarter produces a report. Everything the old build computed
     silently — drift, matured consequences, the cost of ignoring things — is
     returned here so the player can be shown what their decisions did. */
  function endTurn() {
    const report = { turn: state.turn, immediate: [], matured: [], neglected: [], headline: null, chains: [],
                     timeline: [], coming: null };

    /* The timeline is the quarter told in order: after each block below, the
       numbers that moved since the last entry are recorded with the reason.
       The UI plays these back one at a time so the player watches the
       quarter happen rather than reading a summary of it. */
    const TL_NAMES = { approval: 'Approval', headroom: 'Fiscal headroom', party: 'Your party', confidence: 'Market confidence' };
    function tlSnapshot() {
      const s = { approval: state.approval, headroom: state.headroom, party: state.party, confidence: state.confidence };
      Object.keys(state.indicators).forEach(k => { s[k] = state.indicators[k]; });
      Object.keys(state.regions).forEach(r => { s['region:' + r] = state.regions[r]; });
      return s;
    }
    let tlLast = tlSnapshot();
    function emit(kind, extra, always) {
      const now = tlSnapshot();
      const changes = [];
      Object.keys(now).forEach(k => {
        if (round(tlLast[k]) === round(now[k])) return;
        const name = TL_NAMES[k] || INDICATOR_NAMES[k] || (k.slice(0, 7) === 'region:' ? k.slice(7) : k);
        changes.push({ key: k, name: name, from: round(tlLast[k]), to: round(now[k]), delta: round(now[k]) - round(tlLast[k]) });
      });
      tlLast = now;
      if (!changes.length && !always) return;
      report.timeline.push(Object.assign({ kind: kind, changes: changes }, extra || {}));
    }

    /* Parliament rises at the end of the quarter, so any bill still awaiting
       a vote lapses rather than surviving into a turn that no longer has an
       agenda entry for it. */
    if (state.bill) {
      const billName = state.bill.name;
      abandonBill();
      report.abandonedBill = billName;
      emit('bill_lapsed', { name: billName }, true);
    }

    const before = snapshot();

    /* 1. Delayed consequences that have come due. */
    const due = state.pending.filter(p => p.dueTurn <= state.turn);
    state.pending = state.pending.filter(p => p.dueTurn > state.turn);
    due.forEach(p => {
      const changes = applyEffects(p.effects, p.topic, 1);
      report.matured.push({ text: p.text, cause: p.cause, causeChoice: p.causeChoice, changes: changes });
      if (p.recordIndex !== undefined && state.record[p.recordIndex]) state.record[p.recordIndex].matured = changes;
      emit('matured', { text: p.text, cause: p.cause, causeChoice: p.causeChoice, topic: p.topic || null,
                        region: state.record[p.recordIndex] ? state.record[p.recordIndex].region : regionFor(null, p.topic),
                        recordIndex: p.recordIndex }, true);
      report.chains.push({
        steps: [p.causeChoice, p.text],
        explain: 'You chose this ' + Math.max(1, state.turn - (p.dueTurn - 1)) +
                 ' quarter(s) ago. Policy takes time to reach people.'
      });
    });

    /* 2. Anything left on the agenda drifts, and comes back louder. */
    state.agenda.filter(a => !a.done).forEach(a => {
      const ev = lookup(a.eventId);
      const m = meta(a.eventId);
      /* A funding offer is a standing option, not a problem that landed on the
         desk. Declining to spend is a legitimate choice and is punished by the
         drift below, not by a neglect penalty on top of it. */
      if (m.invest) return;
      state.ignored[a.eventId] = (state.ignored[a.eventId] || 0) + 1;
      const drift = -(2 + rand() * 2.5) * (a.urgent ? 1.5 : 1);
      /* A government that leaves something on the desk unanswered looks
         indecisive whether or not it happens to move an indicator — this
         is what actually separates governing badly from not governing at
         all, which no indicator-driven approval weight can capture on its
         own. */
      state.approval = clamp(state.approval + drift * 0.35);
      if (state.indicators[m.topic] !== undefined) {
        const b = state.indicators[m.topic];
        state.indicators[m.topic] = clamp(b + drift);
        report.neglected.push({
          title: ev ? ev.title : a.eventId,
          text: 'Left unattended. ' + (INDICATOR_NAMES[m.topic] || m.topic) + ' has worsened.',
          change: { name: INDICATOR_NAMES[m.topic] || m.topic, from: round(b), to: round(state.indicators[m.topic]), delta: round(state.indicators[m.topic]) - round(b) }
        });
        emit('neglect', { title: ev ? ev.title : a.eventId, topic: m.topic, region: regionFor(a.eventId, m.topic) }, true);
      } else if (m.topic === 'party') {
        /* A political problem left alone does not damage a public service —
           it damages your own side. */
        const b = state.party;
        state.party = clamp(state.party + drift);
        report.neglected.push({
          title: ev ? ev.title : a.eventId,
          text: 'Left unattended. Your party has worsened.',
          change: { name: 'Your party', from: round(b), to: round(state.party), delta: round(state.party) - round(b) }
        });
        emit('neglect', { title: ev ? ev.title : a.eventId, topic: 'party', region: regionFor(a.eventId, 'party') }, true);
      } else if (m.topic === 'treasury') {
        /* A fiscal problem left alone does not damage a public service either
           — it costs money, at a bigger multiple since the sums are bigger. */
        const b = state.headroom;
        state.headroom = clamp(state.headroom + drift * 1.5, -150, 120);
        report.neglected.push({
          title: ev ? ev.title : a.eventId,
          text: 'Left unattended. Fiscal headroom has worsened.',
          change: { name: 'Fiscal headroom', from: round(b), to: round(state.headroom), delta: round(state.headroom) - round(b) }
        });
        emit('neglect', { title: ev ? ev.title : a.eventId, topic: 'treasury', region: regionFor(a.eventId, 'treasury') }, true);
      }
    });

    /* 3. Background drift. Britain keeps moving whether you act or not. The
          economy reverts toward trend rather than compounding: the original let
          a healthy economy fund headroom which fed the economy again, so a good
          start ran away to the top of every scale. */
    const ind = state.indicators;
    ind.health = clamp(ind.health - 0.35);
    ind.housing = clamp(ind.housing - 0.45);
    ind.services = clamp(ind.services - 0.15);
    ind.crime = clamp(ind.crime - 0.25);
    ind.energy = clamp(ind.energy - 0.2);
    ind.transport = clamp(ind.transport - 0.3);
    ind.economy = clamp(ind.economy + (55 - ind.economy) * 0.04);
    emit('drift');

    /* 4. Approval is pulled toward what the fundamentals justify rather than
          accumulating quarter on quarter. A good week fades unless the country
          actually improved, and no run of luck can peg it at 100. The pull is
          comfortably larger than the noise beneath it, which is what the old
          model got backwards. */
    const fundamentals = 28 + ind.economy * 0.14 + ind.health * 0.1 + ind.housing * 0.08 + ind.services * 0.08;
    const noise = (rand() - 0.5) * 4;
    state.approval = clamp(state.approval + (fundamentals - state.approval) * 0.28 + noise);
    emit('approval', { fundamentals: round(fundamentals) });

    /* 5. Fiscal position and the party. Growth is what pays for public services:
          a stronger economy widens the tax base, a weak one leaves a structural
          deficit no amount of good intentions closes. This is the trade-off the
          original never had — there, spending was free and debt cost nothing. */
    state.headroom = clamp(state.headroom + (ind.economy - 55) * 0.45 - 1.0, -150, 60);
    const partyTarget = 45 + (state.approval - 45) * 0.6 + (state.headroom > 0 ? 4 : -6);
    state.party = clamp(state.party + (partyTarget - state.party) * 0.25);
    state.majority = Math.max(0, round(24 + (state.party - 73) * 0.35 + (state.approval - 52) * 0.2));
    emit('fiscal', { growth: round1((ind.economy - 55) * 0.45 - 1.0) });

    /* 5b. Debt interest: borrowing is not free. A quarter spent below zero
           costs real money the next quarter, deducted before anything else
           happens, and reported so the player sees exactly what it cost. */
    if (state.headroom < 0) {
      state.borrowingCost = round1(Math.max(0, -state.headroom) * 0.04);
      state.headroom = clamp(state.headroom - state.borrowingCost, -150, 60);
      report.interest = { cost: state.borrowingCost, headroom: round(state.headroom) };
      emit('interest', { cost: state.borrowingCost }, true);
    } else {
      state.borrowingCost = 0;
      /* A surplus is not dead money: cheap borrowing and a credible Treasury pull in investment. */
      ind.economy = clamp(ind.economy + Math.min(state.headroom, 60) / 60 * 0.25);
      emit('surplus');
    }

    /* 5c. Confidence tracks the fiscal and economic picture and decides
           whether the markets force their way onto the desk. */
    const confidenceTarget = clamp(70 + state.headroom * 1 + (ind.economy - 55) * 0.4);
    state.confidence = clamp(state.confidence + (confidenceTarget - state.confidence) * 0.3);
    if (state.confidence > 70) state.approval = clamp(state.approval + (state.confidence - 70) * 0.02);
    emit('confidence', { confidence: round(state.confidence) });

    /* 5d. Debt has to cost more than interest, or spending freely is simply
           the right answer every time — which is what the original model
           taught, since a negative balance cost 0.15 party unity a month and
           nothing else. Sustained deficits raise borrowing costs, and debt
           interest crowds out the growth that everything else depends on. */
    if (state.headroom < 0) {
      const strain = Math.min(1, -state.headroom / 55);
      ind.economy = clamp(ind.economy - strain * 1.1);
      state.approval = clamp(state.approval - strain * 2.6);
      state.party = clamp(state.party - strain * 0.6);
      if (strain > 0.55) {
        report.strain = {
          text: 'Borrowing costs are rising. The Treasury warns that debt interest is crowding out everything else.',
          headroom: round(state.headroom)
        };
      }
      emit('strain', { strain: round1(strain), warned: strain > 0.55 });
    }

    /* 6. Regions move toward their own mix of national mood and local
          conditions, so the map diverges instead of six dials tracking one. */
    state.prevRegions = Object.assign({}, state.regions);
    Object.keys(state.regions).forEach(r => {
      const target = clamp(state.approval * 0.6 + localCondition(r) * 0.40);
      state.regions[r] = clamp(state.regions[r] + (target - state.regions[r]) * 0.30 + (rand() - 0.5) * 3);
    });
    emit('regions');

    /* 7. What the papers make of it. */
    report.headline = pickHeadline();
    report.immediate = diff(before, snapshot());
    report.promises = promiseStatus();
    emit('headline', { headline: report.headline }, true);

    state.turn += 1;
    state.actionsLeft = ACTIONS_PER_TURN;
    state.history.push(historyPoint());
    /* The one thing still in the post: the next delayed consequence to land. */
    const next = state.pending.slice().sort((a, b) => a.dueTurn - b.dueTurn)[0];
    if (next) {
      report.coming = { text: next.text, cause: next.cause, causeChoice: next.causeChoice,
                        quarters: Math.max(1, next.dueTurn - state.turn + 1),
                        region: state.record[next.recordIndex] ? state.record[next.recordIndex].region : regionFor(null, next.topic) };
    }
    unlockFeatures(report);

    if (state.turn > TURNS) {
      state.phase = 'end';
      report.final = finish();
    } else {
      state.agenda = buildAgenda();
      state.phase = 'consequences';
    }
    state.lastReport = report;
    save();
    return report;
  }

  /* Systems arrive when they become relevant rather than all at once on turn
     one, which is what made the original opening screen unreadable. */
  function unlockFeatures(report) {
    report.unlocks = [];
    if (!state.unlocked.britain && state.turn >= 2) {
      state.unlocked.britain = true;
      report.unlocks.push({ name: 'Britain', text: 'You can now inspect the country in detail — what is improving, and what is not.' });
    }
    if (!state.unlocked.government && state.turn >= 4) {
      state.unlocked.government = true;
      report.unlocks.push({ name: 'Government', text: 'Your promises, the Commons and your record are now tracked in one place.' });
    }
  }

  function snapshot() {
    return {
      approval: state.approval, headroom: state.headroom, party: state.party,
      indicators: Object.assign({}, state.indicators)
    };
  }

  function diff(a, b) {
    const out = [];
    const add = (name, x, y, unit) => {
      if (round(x) !== round(y)) out.push({ name: name, from: round(x), to: round(y), delta: round(y) - round(x), unit: unit || '' });
    };
    add('Approval', a.approval, b.approval, '%');
    add('Fiscal headroom', a.headroom, b.headroom, 'bn');
    add('Your party', a.party, b.party, '%');
    Object.keys(b.indicators).forEach(k => add(INDICATOR_NAMES[k] || k, a.indicators[k], b.indicators[k]));
    return out;
  }

  function pickHeadline() {
    const recent = state.news[0];
    if (recent && state.record.some(r => r.turn === state.turn)) return recent;
    const worst = britain()[0];
    if (worst && worst.value < 35) {
      return { headline: worst.name.toUpperCase() + ' CRISIS DEEPENS',
               deck: worst.headline + '. Ministers under pressure to explain what they are doing.' };
    }
    const w = WORLD_NEWS[Math.floor(rand() * WORLD_NEWS.length)];
    return { headline: w.split(' • ')[1] ? w.split(' • ')[1].toUpperCase() : w, deck: 'World news reaches Downing Street.' };
  }

  /* ------------------------------------------------------------- the end */

  /* Seats per region (total 650), the actual distribution of Commons seats
     rather than a single national dial. First past the post is unforgiving:
     a region you have lost decisively returns almost none of its seats to
     you, and one you dominate returns almost all of them. */
  const REGION_SEATS = { Scotland: 57, North: 158, Midlands: 105, Wales: 32, London: 75, South: 223 };

  /* One compact point per quarter: the sparkline and election-night "then and
     now" come from these, not from re-simulating anything. */
  function historyPoint() {
    const i = {}, r = {};
    Object.keys(state.indicators).forEach(k => { i[k] = round(clamp(state.indicators[k])); });
    Object.keys(state.regions).forEach(k => { r[k] = round(clamp(state.regions[k])); });
    return { t: state.turn, a: round(state.approval), h: round(state.headroom), p: round(state.party),
             c: round(state.confidence), i: i, r: r };
  }

  /* The decisions that mattered most, judged by how much they moved — now and,
     if the delayed part has landed, later. Each comes with its chain so the
     ending can say "you did X, then Y happened". */
  function definingDecisions(n) {
    const sum = list => (list || []).reduce((t, c) => t + Math.abs(c.delta || 0), 0);
    const sumEffects = e => Object.keys(e || {}).reduce((t, k) => t + Math.abs(e[k]), 0);
    return state.record.map((r, idx) => {
      const score = sum(r.changes) + (r.matured ? sum(r.matured) : sumEffects(r.expectedDelay));
      const chain = [{ text: r.choice, changes: r.changes || [] }];
      if (r.delayText) chain.push({ text: r.delayText, changes: r.matured || [], pending: !r.matured });
      return { index: idx, turn: r.turn, title: r.title, choice: r.choice, headline: r.headline,
               region: r.region || null, topic: r.topic || null, score: round1(score), chain: chain };
    }).sort((a, b) => b.score - a.score || a.turn - b.turn).slice(0, n || 3);
  }

  const REGION_ORDER = ['North', 'Scotland', 'Wales', 'Midlands', 'London', 'South'];

  function finish() {
    /* Approval is the national headline number, but seats are won region by
       region: each region's own approval maps to a share of its seats, from
       a floor of 15% (you keep some seats even where you are hated) to a
       ceiling of 85% (never a total sweep). */
    const seatsByRegion = {};
    let seats = 0;
    Object.keys(REGION_SEATS).forEach(r => {
      const regionTotal = REGION_SEATS[r];
      const share = clamp((state.regions[r] - 22) / 60, 0, 1);
      const won = round(regionTotal * (0.15 + 0.7 * share));
      seatsByRegion[r] = { seats: regionTotal, won: won, approval: round(clamp(state.regions[r])) };
      seats += won;
    });
    const first = state.history[0] || historyPoint();
    const after = historyPoint();
    REGION_ORDER.forEach(r => {
      const row = seatsByRegion[r];
      const d = regionDetail(r);
      row.held = row.won * 2 > row.seats;
      row.swing = row.approval - (first.r[r] !== undefined ? first.r[r] : row.approval);
      row.reason = d.signs.length ? d.signs[0].label : d.story;
    });
    const readouts = ['health', 'housing', 'economy', 'crime', 'energy', 'transport'].map(k => ({
      key: k, name: INDICATOR_NAMES[k], from: first.i[k], to: after.i[k],
      before: readoutValue(k, first.i[k]).headline, after: readoutValue(k, after.i[k]).headline
    }));
    const won = seats >= MAJORITY_THRESHOLD;
    const delivered = promisesDelivered();

    let legacy = 'THE SURVIVOR';
    if (state.indicators.economy > 68 && state.indicators.housing > 55) legacy = 'THE BUILDER';
    else if (state.headroom > 18 && !state.flags.taxRaised) legacy = 'THE BOOKKEEPER';
    else if (state.indicators.health > 58 && state.indicators.services > 58) legacy = 'THE REFORMER';
    else if (delivered === totalPromises() && totalPromises() > 0) legacy = 'THE DELIVERER';

    return {
      seats: seats, won: won, legacy: legacy,
      seatsByRegion: seatsByRegion,
      delivered: delivered, total: totalPromises(),
      promises: promiseStatus(),
      scores: [
        ['Approval', round(state.approval) + '%'],
        ['Projected seats', seats],
        ['Promises delivered', delivered + '/' + totalPromises()],
        ['Fiscal headroom', money(state.headroom)],
        ['NHS', readout('health').headline],
        ['Housing', readout('housing').headline]
      ],
      record: state.record.slice(),
      regionOrder: REGION_ORDER.slice(),
      before: first, after: after, readouts: readouts,
      defining: definingDecisions(3)
    };
  }

  /* Sign is taken from the rounded value, so a headroom of -0.4 reads as
     £0bn rather than the original's "-£0bn". */
  function money(n) {
    const r = round(n);
    return (r < 0 ? '-' : '') + '£' + Math.abs(r) + 'bn';
  }

  /* ---------------------------------------------------------------- save */

  /* A twenty-turn game with no save meant a refresh destroyed the whole term. */
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  function hasSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return parsed && parsed.version === SAVE_VERSION && parsed.turn >= 1;
    } catch (e) { return false; }
  }
  /* A save is only as good as its shape. A partially-corrupted blob (a
     failed write, a hand-edited localStorage, a future version's fields)
     used to load anyway and crash the first screen that touched a missing
     field. This checks the fields every other function assumes exist. */
  function validSave(p) {
    if (!p || typeof p !== 'object' || p.version !== SAVE_VERSION) return false;
    const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
    if (!isObj(p.indicators) || !isObj(p.regions)) return false;
    if (!Array.isArray(p.agenda) || !Array.isArray(p.promises)) return false;
    if (!Array.isArray(p.pending) || !Array.isArray(p.resolved)) return false;
    if (!Array.isArray(p.record)) return false;
    if (p.history !== undefined && !Array.isArray(p.history)) return false;
    if (!Number.isFinite(p.approval) || !Number.isFinite(p.headroom)) return false;
    if (!Number.isFinite(p.party) || !Number.isFinite(p.turn)) return false;
    return true;
  }
  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!validSave(parsed)) return false;
      state = Object.assign(freshState(), parsed);
      return true;
    } catch (e) { return false; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  /* --------------------------------------------------------------- setup */

  /* Resetting in-memory state is not the same as discarding the save: a
     player who backs out of the manifesto screen without starting a new
     term must still find their old game intact on the title screen. */
  function reset() { state = freshState(); }

  function setPromises(ids, custom) {
    state.promises = ids.slice(0, 3);
    state.customPromises = (custom || []).slice(0, 3);
  }
  function togglePromise(id) {
    const i = state.promises.indexOf(id);
    if (i >= 0) state.promises.splice(i, 1);
    else if (totalPromises() < 3) state.promises.push(id);
    return totalPromises();
  }
  function addCustomPromise(text) {
    if (!text || totalPromises() >= 3) return false;
    state.customPromises.push(text);
    return true;
  }
  function removeCustomPromise(i) { state.customPromises.splice(i, 1); }

  function beginTerm(opts) {
    opts = opts || {};
    /* A new term replaces the old save only when it actually begins —
       not the moment the player looks at the manifesto screen. */
    clearSave();
    state.turn = 1;
    state.actionsLeft = ACTIONS_PER_TURN;
    if (opts.tutorial && EVENT_META.nhs_strike) {
      /* A first term opens on one card, the NHS strike, so the player learns
         the game by answering something rather than reading about it. The
         promises are chosen after that, once the currencies mean something. */
      state.onboarding = { stage: 'first_card', seen: {} };
      state.agenda = [{ eventId: 'nhs_strike', urgent: true, cost: EVENT_META.nhs_strike.cost }];
    } else {
      state.onboarding = { stage: 'done', seen: {} };
      state.agenda = buildAgenda();
    }
    state.phase = 'briefing';
    state.history = [historyPoint()];
    save();
  }

  /* Promises chosen mid-tutorial, after the first decision. */
  function lockPromises(ids) {
    state.promises = (ids || []).slice(0, 3);
    if (state.onboarding.stage === 'promises') state.onboarding.stage = 'first_run';
    save();
    return state.promises.slice();
  }
  function setOnboardingStage(stage) { state.onboarding.stage = stage; save(); return stage; }
  function markCoach(key) {
    if (!state.onboarding.seen[key]) { state.onboarding.seen[key] = true; save(); }
  }
  function onboarding() {
    return { stage: state.onboarding.stage, seen: Object.assign({}, state.onboarding.seen) };
  }

  /* What each promise would mean, in the same words the dials use, so the
     picker can say "4.9m waiting now, 6.7m to keep the promise". */
  const PROMISE_TARGETS = {
    nhs: ['health', 45], housing: ['housing', 45], growth: ['economy', 66],
    crime: ['crime', 55], climate: ['energy', 55]
  };
  function promiseTargets() {
    return PROMISES.map(p => {
      const id = p[0];
      const t = PROMISE_TARGETS[id];
      if (t) {
        return { id: id, icon: p[1], label: p[2], key: t[0], region: regionFor(null, t[0]),
                 value: round(state.indicators[t[0]]), threshold: t[1],
                 now: readoutValue(t[0], state.indicators[t[0]]).headline,
                 target: readoutValue(t[0], t[1]).headline };
      }
      return { id: id, icon: p[1], label: p[2], key: 'headroom', region: 'London',
               value: round(state.headroom), threshold: 8,
               now: money(state.headroom) + ' headroom', target: '£8bn+ headroom, no tax rises' };
    });
  }

  return {
    TURNS: TURNS,
    get state() { return state; },
    freshState: freshState, reset: reset,
    setPromises: setPromises, togglePromise: togglePromise,
    addCustomPromise: addCustomPromise, removeCustomPromise: removeCustomPromise,
    totalPromises: totalPromises, promiseStatus: promiseStatus,
    beginTerm: beginTerm, buildAgenda: buildAgenda, agendaCard: agendaCard,
    decide: decide, endTurn: endTurn, finish: finish,
    voteState: voteState, negotiate: negotiate, holdVote: holdVote, abandonBill: abandonBill,
    britain: britain, readout: readout, money: money, govSeats: govSeats,
    confidence: function () { return round(state.confidence); },
    regions: regions, regionDetail: regionDetail, localCondition: localCondition,
    save: save, load: load, hasSave: hasSave, clearSave: clearSave,
    history: function () { return state.history.slice(); },
    readoutValue: readoutValue, regionFor: regionFor, definingDecisions: definingDecisions,
    lockPromises: lockPromises, setOnboardingStage: setOnboardingStage, markCoach: markCoach,
    onboarding: onboarding, promiseTargets: promiseTargets
  };
})();
