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
  const SAVE_KEY = 'ympm.save.v2';
  const SAVE_VERSION = 2;
  const COMMONS_SEATS = 650;
  const MAJORITY_THRESHOLD = 326; // seats needed to win a Commons vote

  const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
  const round = Math.round;

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
      party: 73,
      majority: 24,
      indicators: {
        health: 28, housing: 32, economy: 61, services: 48,
        crime: 46, energy: 44, transport: 45, migration: 42, defence: 55
      },
      regions: { Scotland: 49, North: 51, Midlands: 52, Wales: 50, London: 55, South: 52 },
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
      invested: {}                // topic -> how many times funded, for diminishing returns
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
    if (g) return { topic: g.investTopic, promise: null, cost: 1, invest: true };
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
      headline: round(120 + (100 - v) * 1.6).toLocaleString() + 'k homes a year',
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

  function readout(key) {
    const v = clamp(state.indicators[key]);
    const r = (READOUTS[key] || (x => ({ headline: label(x), detail: '' })))(v);
    return { key: key, name: INDICATOR_NAMES[key] || key, value: round(v), status: label(v),
             headline: r.headline, detail: r.detail };
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
        const b = state.headroom; state.headroom = clamp(state.headroom + v, -60, 120); push('Fiscal headroom', b, state.headroom);
      } else if (key === 'power') {
        const b = state.party; state.party = clamp(state.party + v); push('Your party', b, state.party);
      } else if (key === 'economy') {
        const b = state.indicators.economy; state.indicators.economy = clamp(b + v); push('Economy', b, state.indicators.economy);
      } else if (key === 'housing') {
        const b = state.indicators.housing; state.indicators.housing = clamp(b + v); push('Housing', b, state.indicators.housing);
      } else if (key === 'britain') {
        const b = state.indicators.services; state.indicators.services = clamp(b + v); push('Public services', b, state.indicators.services);
        if (topic && state.indicators[topic] !== undefined && topic !== 'services') {
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

    const candidates = EVENTS.filter(e => {
      const m = EVENT_META[e.id];
      if (!m || m.topic === 'final') return false;
      if (state.resolved.includes(e.id)) return false;
      return turn >= m.from && turn <= m.to;
    });

    const scored = candidates.map(e => {
      const m = EVENT_META[e.id];
      let score = rand() * 12;
      /* Things going badly ask for attention first. */
      const ind = state.indicators[m.topic];
      if (ind !== undefined) score += (60 - ind) * 0.55;
      /* An event that can deliver or break a promise matters more. */
      if (m.promise && state.promises.includes(m.promise)) score += 18;
      /* Something ignored keeps coming back, louder. */
      if (state.ignored[e.id]) score += state.ignored[e.id] * 14;
      if (m.topic === 'party' && state.party < 50) score += 12;
      if (m.topic === 'treasury' && state.headroom < 8) score += 20;
      return { event: e, meta: m, score: score };
    }).sort((a, b) => b.score - a.score);

    const agenda = scored.slice(0, 2).map((c, i) => ({
      eventId: c.event.id, urgent: i === 0, cost: c.meta.cost
    }));

    /* One standing item: money you can put behind a department. This is the old
       budget stepper rewritten as a decision, and it is what makes a manifesto
       promise reachable — the event library alone offers each topic only once. */
    const invest = makeInvestment();
    if (invest) agenda.push({ eventId: invest.id, urgent: false, cost: 1 });
    return agenda;
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
    return cost <= 0 || state.headroom - cost > -40;
  }

  /* Resolve a decision. Returns what happened so the UI can show it immediately
     rather than silently mutating numbers behind a toast. */
  function decide(eventId, choiceIndex) {
    const ev = lookup(eventId);
    if (!ev) return null;
    const entry = state.agenda.find(a => a.eventId === eventId);
    if (!entry || entry.done) return null;
    const choice = ev.choices[choiceIndex];
    if (!choice) return null;
    const m = meta(ev.id);

    if (state.actionsLeft < (entry.cost || 0)) return { blocked: 'actions' };

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
    const scaled = uncertainty() * (scale === undefined ? 1 : scale);
    const changes = applyEffects(choice.e, meta.topic, scaled);

    if (/raise .*tax|tax rise/i.test(choice.t) && (choice.e.treasury || 0) > 0) {
      state.flags.taxRaised = true;
    }

    if (choice.delay) {
      state.pending.push({
        dueTurn: state.turn + Math.max(1, Math.round(choice.delay.after / 3)),
        text: choice.delay.text, effects: choice.delay.e, topic: meta.topic,
        cause: ev.title, causeChoice: choice.t
      });
    }

    if (ev.invest && ev.investTopic) {
      state.invested[ev.investTopic] = (state.invested[ev.investTopic] || 0) + 1;
    }

    entry.done = true;
    entry.choiceText = choice.t;
    state.actionsLeft = Math.max(0, state.actionsLeft - (entry.cost || 0));
    state.resolved.push(ev.id);
    delete state.ignored[ev.id];
    state.record.push({ turn: state.turn, title: ev.title, choice: choice.t, headline: choice.h });
    state.news.unshift({ turn: state.turn, headline: choice.h, deck: choice.d });
    state.news = state.news.slice(0, 24);

    return {
      resolved: true, headline: choice.h, deck: choice.d, changes: changes,
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
      canConcede: b.concessions < 3, canTalk: !b.talked, canThreaten: !b.threatened,
      delayed: b.turnsDelayed
    };
  }

  /* Negotiation: this is where a player learns that having a majority is not
     the same as being able to do things. */
  function negotiate(action) {
    const b = state.bill;
    if (!b) return null;
    let note = '';
    if (action === 'concede' && b.concessions < 3) {
      b.concessions += round(4 + rand() * 5);
      state.party = clamp(state.party - 1);
      b.concessionCount = (b.concessionCount || 0) + 1;
      if (b.concessionCount >= 3) b.concessions = b.concessions;
      note = 'You water down the bill. Rebels peel away, but so does some of the point of it.';
      b.weakened = (b.weakened || 0) + 1;
    } else if (action === 'talk' && !b.talked) {
      b.talked = true;
      if (state.actionsLeft > 0) state.actionsLeft -= 1;
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
    if (entry) { entry.done = true; entry.choiceText = 'Bill abandoned'; }
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
    const before = snapshot();
    const report = { turn: state.turn, immediate: [], matured: [], neglected: [], headline: null, chains: [] };

    /* 1. Delayed consequences that have come due. */
    const due = state.pending.filter(p => p.dueTurn <= state.turn);
    state.pending = state.pending.filter(p => p.dueTurn > state.turn);
    due.forEach(p => {
      const changes = applyEffects(p.effects, p.topic, 1);
      report.matured.push({ text: p.text, cause: p.cause, causeChoice: p.causeChoice, changes: changes });
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
      if (state.indicators[m.topic] !== undefined) {
        const b = state.indicators[m.topic];
        state.indicators[m.topic] = clamp(b + drift);
        report.neglected.push({
          title: ev ? ev.title : a.eventId,
          text: 'Left unattended. ' + (INDICATOR_NAMES[m.topic] || m.topic) + ' has worsened.',
          change: { name: INDICATOR_NAMES[m.topic] || m.topic, from: round(b), to: round(state.indicators[m.topic]), delta: round(state.indicators[m.topic]) - round(b) }
        });
      }
    });

    /* 3. Background drift. Britain keeps moving whether you act or not. The
          economy reverts toward trend rather than compounding: the original let
          a healthy economy fund headroom which fed the economy again, so a good
          start ran away to the top of every scale. */
    const ind = state.indicators;
    ind.health = clamp(ind.health - 0.5);
    ind.housing = clamp(ind.housing - 0.45);
    ind.services = clamp(ind.services - 0.3);
    ind.crime = clamp(ind.crime - 0.25);
    ind.energy = clamp(ind.energy - 0.2);
    ind.transport = clamp(ind.transport - 0.3);
    ind.economy = clamp(ind.economy + (55 - ind.economy) * 0.04);

    /* 4. Approval is pulled toward what the fundamentals justify rather than
          accumulating quarter on quarter. A good week fades unless the country
          actually improved, and no run of luck can peg it at 100. The pull is
          comfortably larger than the noise beneath it, which is what the old
          model got backwards. */
    const fundamentals = 22 + ind.economy * 0.18 + ind.health * 0.12 +
                         ind.housing * 0.10 + ind.services * 0.10;
    const noise = (rand() - 0.5) * 1.2;
    state.approval = clamp(state.approval + (fundamentals - state.approval) * 0.28 + noise);

    /* 5. Fiscal position and the party. Growth is what pays for public services:
          a stronger economy widens the tax base, a weak one leaves a structural
          deficit no amount of good intentions closes. This is the trade-off the
          original never had — there, spending was free and debt cost nothing. */
    state.headroom = clamp(state.headroom + (ind.economy - 55) * 0.45 - 2.0, -60, 60);
    const partyTarget = 45 + (state.approval - 45) * 0.6 + (state.headroom > 0 ? 4 : -6);
    state.party = clamp(state.party + (partyTarget - state.party) * 0.25);
    state.majority = Math.max(0, round(24 + (state.party - 73) * 0.35 + (state.approval - 52) * 0.2));

    /* 5b. Debt has to cost something, or spending freely is simply the right
           answer every time — which is what the original model taught, since a
           negative balance cost 0.15 party unity a month and nothing else.
           Sustained deficits raise borrowing costs, and debt interest crowds out
           the growth that everything else depends on. */
    if (state.headroom < 0) {
      const strain = Math.min(1, -state.headroom / 45);
      ind.economy = clamp(ind.economy - strain * 1.7);
      state.approval = clamp(state.approval - strain * 0.9);
      state.party = clamp(state.party - strain * 1.0);
      if (strain > 0.55) {
        report.strain = {
          text: 'Borrowing costs are rising. The Treasury warns that debt interest is crowding out everything else.',
          headroom: round(state.headroom)
        };
      }
    }

    /* 6. Regions move with the national picture, with local character. */
    Object.keys(state.regions).forEach(r => {
      const bias = r === 'London' ? ind.housing * 0.02 : r === 'North' ? ind.transport * 0.02 : ind.economy * 0.015;
      state.regions[r] = clamp(state.regions[r] + (state.approval - state.regions[r]) * 0.18 + bias - 0.4);
    });

    /* 7. What the papers make of it. */
    report.headline = pickHeadline();
    report.immediate = diff(before, snapshot());
    report.promises = promiseStatus();

    state.turn += 1;
    state.actionsLeft = ACTIONS_PER_TURN;
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

  function finish() {
    /* Seat projection: approval is the main driver, but it does not convert
       directly into seats — geography and the state of the country matter. */
    /* First past the post is unforgiving: a government polling in the low
       fifties is on the edge, and one in the thirties is wiped out. 55% approval
       is roughly the line between another term and the opposition's turn. */
    const seats = clamp(round(
      MAJORITY_THRESHOLD + (state.approval - 55) * 4.2 +
      (state.indicators.economy - 60) * 0.35 + (state.party - 60) * 0.25 +
      (state.indicators.health - 45) * 0.15
    ), 150, 430);
    const won = seats >= MAJORITY_THRESHOLD;
    const delivered = promisesDelivered();

    let legacy = 'THE SURVIVOR';
    if (state.indicators.economy > 68 && state.indicators.housing > 55) legacy = 'THE BUILDER';
    else if (state.headroom > 18 && !state.flags.taxRaised) legacy = 'THE BOOKKEEPER';
    else if (state.indicators.health > 58 && state.indicators.services > 58) legacy = 'THE REFORMER';
    else if (delivered === totalPromises() && totalPromises() > 0) legacy = 'THE DELIVERER';

    return {
      seats: seats, won: won, legacy: legacy,
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
      record: state.record.slice()
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
  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!parsed || parsed.version !== SAVE_VERSION) return false;
      state = Object.assign(freshState(), parsed);
      return true;
    } catch (e) { return false; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  /* --------------------------------------------------------------- setup */

  function reset() { state = freshState(); clearSave(); }

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

  function beginTerm() {
    state.turn = 1;
    state.actionsLeft = ACTIONS_PER_TURN;
    state.agenda = buildAgenda();
    state.phase = 'briefing';
    save();
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
    save: save, load: load, hasSave: hasSave, clearSave: clearSave
  };
})();
