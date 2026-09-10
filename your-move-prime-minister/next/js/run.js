/* Running the quarter: the engine settles everything in one call, but the
   player should *watch* it happen rather than read a summary of it. This
   turns report.timeline into a short, skippable show — thirteen "weeks"
   ticking past on the ticker, a callout over the map for each thing that
   actually happened, the dials and the map sliding to their new numbers —
   before the scorecard opens with everything already landed.

   Resume convention: E.endTurn() leaves E.state.phase === 'consequences'.
   That value is left untouched for as long as this quarter's scorecard is
   still open, including mid-animation — a reload in that window means the
   game reopens the same scorecard with no animation (js/app.js). Dismissing
   the scorecard (next(), below) is what moves E.state.phase on to
   'decision' — the same value E.decide() already uses for "a turn is under
   way" — so a reload after that point resumes on the desk as normal. */

window.YM = window.YM || {};
YM.run = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  const WEEK_MS = 520;      // ~6.8s for the full 13-week walk
  const TOTAL_WEEKS = 13;
  const BG_KINDS = ['drift', 'approval', 'fiscal', 'interest', 'surplus', 'confidence', 'strain'];

  /* ------------------------------------------------------- scorecard body */

  function changeRow(c) {
    return D.h('span', { class: 'chip ' + (c.delta > 0 ? 'up' : 'down'), text: F.deltaChip(c) });
  }

  function immediateBlock(report) {
    const rises = report.immediate.filter(function (c) { return c.delta > 0; })
      .sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); }).slice(0, 3);
    const falls = report.immediate.filter(function (c) { return c.delta < 0; })
      .sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); }).slice(0, 3);
    if (!rises.length && !falls.length) return null;
    const row = D.h('div', { class: 'change-chips' });
    rises.forEach(function (c) { row.appendChild(changeRow(c)); });
    falls.forEach(function (c) { row.appendChild(changeRow(c)); });
    return D.h('section', { class: 'score-block' }, D.h('h3', { text: 'What moved this quarter' }), row);
  }

  function maturedBlock(report) {
    if (!report.matured.length) return null;
    return D.h('section', { class: 'score-block' },
      D.h('h3', { text: 'Decisions you made earlier are landing' }),
      D.h('ul', { class: 'matured-list' }, report.matured.map(function (m) {
        const row = D.h('div', { class: 'change-chips' });
        (m.changes || []).forEach(function (c) { row.appendChild(changeRow(c)); });
        return D.h('li', null,
          D.h('p', null, D.h('b', { text: m.causeChoice || m.cause }), D.h('span', { text: ' → ' + m.text })),
          row);
      })));
  }

  function neglectedBlock(report) {
    if (!report.neglected.length) return null;
    return D.h('section', { class: 'score-block' },
      D.h('h3', { text: 'Left unattended' }),
      D.h('ul', { class: 'matured-list' }, report.neglected.map(function (n) {
        return D.h('li', null,
          D.h('p', null, D.h('b', { text: n.title }), D.h('span', { text: ' — ' + n.text })),
          D.h('span', { class: 'chip down', text: F.deltaChip(n.change) }));
      })));
  }

  function buildBody(report) {
    const blocks = [];
    if (report.headline) {
      blocks.push(D.h('div', { class: 'paper' },
        D.h('p', { class: 'eyebrow', text: 'The Herald' }),
        D.h('h3', { class: 'serif', text: report.headline.headline }),
        D.h('p', { text: report.headline.deck })));
    }
    if (report.abandonedBill) {
      blocks.push(D.h('p', { class: 'muted', text: 'Your ' + report.abandonedBill + ' lapsed because Parliament rose before you brought it to a vote.' }));
    }
    if (report.interest) {
      blocks.push(D.h('p', { class: 'muted', text: 'Debt interest cost £' + report.interest.cost.toFixed(1) + 'bn this quarter.' }));
    }
    if (report.strain) {
      blocks.push(D.h('p', { class: 'muted', text: report.strain.text }));
    }
    blocks.push(immediateBlock(report));
    blocks.push(maturedBlock(report));
    blocks.push(neglectedBlock(report));
    if (report.coming) {
      blocks.push(D.h('p', { class: 'coming', text: 'Coming: ' + report.coming.text + ' — in ' + report.coming.quarters + ' quarter' + (report.coming.quarters === 1 ? '' : 's') }));
    }
    blocks.push(D.h('button', {
      class: 'btn big block', type: 'button',
      onClick: function () { next(report); }
    }, 'Next quarter'));
    return blocks;
  }

  let handle = null;

  function scorecard(report) {
    B.setPhase('scorecard');
    handle = B.open({
      title: report.headline ? report.headline.headline : 'The quarter ends',
      eyebrow: F.when(report.turn), locked: true, body: buildBody(report)
    });
    handle.el.id = 'scorecard';
    if (E.onboarding().stage === 'first_run' && D.motion() !== 'reduced') {
      YM.onboarding.coach('run_scorecard', handle.el, 'What changed, and what is still coming');
    }
  }

  function next(report) {
    const h = handle; handle = null;
    if (h) h.close();
    /* This was the tutorial's one watched run: the player has now seen the
       country move on its own, so the tutorial is over. */
    if (E.onboarding().stage === 'first_run') E.setOnboardingStage('done');
    if (report.final) {
      YM.election.show(report.final);
      return;
    }
    /* The scorecard for this quarter is no longer showing: move off
       'consequences' (see the comment at the top of this file). */
    E.state.phase = 'decision';
    E.save();
    B.setPhase('desk');
    YM.desk.setEnabled(true);
    B.render();
  }

  /* ------------------------------------------------------------- callout */

  let calloutEl = null;
  function hideCallout() {
    if (calloutEl && calloutEl.parentNode) calloutEl.parentNode.removeChild(calloutEl);
    calloutEl = null;
  }

  function regionAnchor(name) {
    return name ? document.querySelector('.region[data-region="' + name + '"] .map-name') : null;
  }
  function deskAnchor() { return D.$('desk'); }

  /* At most one callout on screen at a time; the next one replaces it.
     Never shown under reduced motion — the scorecard carries the same
     information once the sequence finishes. */
  function showCallout(anchorEl, cause, effect, changes) {
    hideCallout();
    if (D.motion() === 'reduced' || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    if (!rect.width && !rect.height && !rect.top && !rect.left) return;
    const chips = D.h('div', { class: 'change-chips' });
    (changes || []).forEach(function (c) {
      chips.appendChild(D.h('span', { class: 'chip ' + (c.delta > 0 ? 'up' : 'down'), text: F.deltaChip(c) }));
    });
    const el = D.h('div', { class: 'run-callout' },
      cause ? D.h('p', { class: 'run-callout-cause small', text: cause }) : null,
      D.h('p', { class: 'run-callout-effect', text: effect }),
      (changes && changes.length) ? chips : null);
    document.body.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    let top = rect.top - h - 10;
    if (top < 8) top = rect.bottom + 10;
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    calloutEl = el;
  }

  /* -------------------------------------------------------------- ticker */

  let tickerHandle = null;
  function buildTicker(report) {
    const el = D.$('ticker');
    const weekEl = D.h('span', { class: 'ticker-week', text: 'Week 1 of ' + TOTAL_WEEKS });
    const lineEl = D.h('span', { class: 'ticker-line', text: 'Running ' + F.when(report.turn) + '…' });
    const skipBtn = D.h('button', {
      id: 'skip-run', class: 'btn ghost ticker-skip', type: 'button',
      onClick: function () { if (activeSeq) activeSeq.finish(); }
    }, 'Skip');
    D.replace(el, weekEl, lineEl, skipBtn);
    el.hidden = false;
    skipBtn.focus();
    tickerHandle = {
      el: el,
      setWeek: function (w) { weekEl.textContent = 'Week ' + w + ' of ' + TOTAL_WEEKS; },
      setLine: function (text) { lineEl.textContent = text; }
    };
    return tickerHandle;
  }
  function tickerLine(text) { if (tickerHandle) tickerHandle.setLine(text); }

  /* -------------------------------------------------------------- script */

  /* Every step targets the setters the scene already exposes (hud.set,
     dials.setDial, map.setRegion, plus their pulse() methods) with the
     values report.timeline already computed. Applying a step is always
     idempotent and finalising: it sets each changed value to its final
     `to`, whether animated (the normal walk) or instant (Skip, reduced
     motion, or any leftover steps when the sequence is finished early) —
     running every remaining step this way leaves the DOM exactly as the
     render() at the end of the sequence would. */

  /* The tutorial's second coach mark during a run: the first thing the
     player actually sees move, whichever key it happens to be — a dial, a
     region, or just the HUD. Fires at most once (coach() itself is
     idempotent once shown), so every call after the first is free. */
  function maybeLanding(animate, el) {
    if (!animate || !el) return;
    if (D.motion() === 'reduced') return;
    if (E.onboarding().stage !== 'first_run') return;
    YM.onboarding.coach('run_landing', el, 'Your decision is landing');
  }

  function applyChange(c, animate) {
    const key = c.key;
    if (key === 'approval' || key === 'headroom' || key === 'party' || key === 'confidence') {
      YM.hud.set(key, c.to, animate ? c.from : undefined);
      YM.hud.pulse(key, c.delta > 0 ? 'up' : c.delta < 0 ? 'down' : null);
      maybeLanding(animate, document.querySelector('.hud-stat[data-stat="' + key + '"]'));
    } else if (key.slice(0, 7) === 'region:') {
      const name = key.slice(7);
      YM.map.setRegion(name, c.to, animate ? c.from : undefined);
      YM.map.pulse(name, c.delta > 0 ? 'up' : c.delta < 0 ? 'down' : null);
      maybeLanding(animate, document.querySelector('.region[data-region="' + name + '"]'));
    } else if (F.DIAL_KEYS.indexOf(key) >= 0) {
      YM.dials.setDial(key, c.to);
      YM.dials.pulse(key, c.delta > 0 ? 'up' : c.delta < 0 ? 'down' : null);
      maybeLanding(animate, document.querySelector('.dial[data-key="' + key + '"]'));
    }
    /* Other indicator keys (services, migration, defence) have no tile of
       their own — the engine still holds the change, the map/region picture
       reflects it, there is just nothing on the desk to point at directly. */
  }

  function applyEntry(entry, instant) {
    if (!instant) hideCallout();
    (entry.changes || []).forEach(function (c) { applyChange(c, !instant); });
    if (instant) return; // no callouts or ticker chatter when finishing early

    switch (entry.kind) {
      case 'bill_lapsed': {
        const text = entry.name + ' lapsed — Parliament rose';
        tickerLine(text);
        showCallout(deskAnchor(), null, text, null);
        break;
      }
      case 'matured': {
        const cause = entry.causeChoice ? 'You chose ' + entry.causeChoice : (entry.cause || '');
        tickerLine(cause ? cause + ' · ' + entry.text : entry.text);
        showCallout(regionAnchor(entry.region), cause, entry.text, entry.changes);
        break;
      }
      case 'neglect': {
        const text = entry.title + ' was left on the desk';
        tickerLine(text);
        showCallout(regionAnchor(entry.region), null, text, entry.changes);
        break;
      }
      case 'interest':
        tickerLine('Debt interest cost £' + entry.cost.toFixed(1) + 'bn');
        break;
      case 'strain':
        if (entry.warned) tickerLine('Treasury warns: borrowing is crowding out everything else');
        break;
      case 'regions':
        hideCallout();
        break;
      case 'headline':
        hideCallout();
        if (entry.headline) tickerLine(entry.headline.headline.toUpperCase());
        break;
      default:
        break;
    }
  }

  /* Walks report.timeline in order, handing each entry a week from 1-13:
     the lapsed bill (if any) is week 1; every matured and every neglected
     entry gets its own week straight after; the background movers that
     have no callout of their own share whatever weeks are left before the
     map (week 12) and the headline (week 13). */
  function buildSteps(report) {
    const tl = report.timeline;
    const items = [];
    let week = 1;

    const bill = tl.filter(function (e) { return e.kind === 'bill_lapsed'; });
    bill.forEach(function (e) { items.push({ kind: e.kind, week: 1, entry: e }); });
    if (bill.length) week = 2;

    tl.filter(function (e) { return e.kind === 'matured'; }).forEach(function (e) {
      items.push({ kind: e.kind, week: week, entry: e }); week++;
    });
    tl.filter(function (e) { return e.kind === 'neglect'; }).forEach(function (e) {
      items.push({ kind: e.kind, week: week, entry: e }); week++;
    });
    tl.filter(function (e) { return BG_KINDS.indexOf(e.kind) >= 0; }).forEach(function (e) {
      items.push({ kind: e.kind, week: Math.min(11, week), entry: e }); week++;
    });

    const regionsEntry = tl.filter(function (e) { return e.kind === 'regions'; });
    regionsEntry.forEach(function (e) { items.push({ kind: e.kind, week: 12, entry: e }); });

    const headlineEntry = tl.filter(function (e) { return e.kind === 'headline'; });
    headlineEntry.forEach(function (e) { items.push({ kind: e.kind, week: 13, entry: e }); });

    return items;
  }

  /* Plays `items` — already sorted by week — against real time, one
     setTimeout per distinct week so entries sharing a week land together.
     finish() runs everything left immediately and synchronously; cancel()
     just stops, for when the scene changes out from under a running
     sequence. Both are safe to call more than once. */
  function playSeq(items, onDone) {
    let idx = 0, timer = null, cancelled = false, done = false;
    const startedAt = (window.performance && performance.now) ? performance.now() : Date.now();
    const now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

    function runBatch(week, instant) {
      while (idx < items.length && items[idx].week === week) {
        applyEntry(items[idx].entry, instant);
        idx++;
      }
    }
    function scheduleNext() {
      if (cancelled || done) return;
      if (idx >= items.length) { done = true; onDone(); return; }
      const week = items[idx].week;
      if (tickerHandle) tickerHandle.setWeek(week);
      const delay = Math.max(0, week * WEEK_MS - (now() - startedAt));
      timer = setTimeout(function () { runBatch(week, false); scheduleNext(); }, delay);
    }
    function finish() {
      if (done) return;
      cancelled = true;
      if (timer) clearTimeout(timer);
      while (idx < items.length) { applyEntry(items[idx].entry, true); idx++; }
      done = true;
      onDone();
    }
    function cancel() {
      if (done) return;
      cancelled = true;
      if (timer) clearTimeout(timer);
    }

    if (D.motion() === 'reduced') finish(); else scheduleNext();
    return { finish: finish, cancel: cancel };
  }

  let activeSeq = null;
  let lastSteps = [];

  /* Any change of scene while a sequence is running stops it — the render()
     that follows is what actually leaves the DOM correct, a stray timer
     firing into a scene that has moved on must not touch anything. */
  B.on('phase', function (p) { if (p !== 'running' && activeSeq) activeSeq.cancel(); });

  function quarter() {
    if (E.state.bill) return;

    /* 1. Freeze the scene and read the pre-turn display values before the
          engine advances — report.timeline's own `from` fields already
          carry these forward (the engine snapshots them before it touches
          anything), so nothing else needs to remember them separately. */
    B.freeze();

    /* 2. The engine settles the whole quarter in one call. E.state is now
          the *post*-turn state; nothing re-renders from it until step 6. */
    const report = E.endTurn();

    /* 3. Enter the running phase. */
    B.setPhase('running');
    YM.desk.setEnabled(false);
    buildTicker(report);
    D.announce('Running the quarter');
    if (E.onboarding().stage === 'first_run' && D.motion() !== 'reduced') {
      YM.onboarding.coach('run_ticker', D.$('ticker'), 'The country moves whether you act or not');
    }

    /* 4-5. Build and play the week-by-week script. */
    const items = buildSteps(report);
    lastSteps = items.map(function (it) { return { kind: it.kind, week: it.week }; });

    activeSeq = playSeq(items, function () {
      /* 6. Done (naturally, by Skip, or because motion is reduced): drop
            the ticker and callout, thaw the scene, and do one full render
            — that render is the correctness guarantee, not any of the
            steps above it. */
      hideCallout();
      if (tickerHandle) tickerHandle.el.hidden = true;
      B.thaw();
      B.render();
      scorecard(report);
      D.announce(report.headline ? report.headline.headline : 'The quarter has ended');
    });
  }

  return {
    quarter: quarter, scorecard: scorecard,
    /* debug-only surface, read by YM.debug in js/app.js */
    lastSteps: function () { return lastSteps.slice(); }
  };
})();
