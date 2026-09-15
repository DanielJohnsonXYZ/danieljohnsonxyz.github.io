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

  const WEEK_MS = 520;
  const TOTAL_WEEKS = 13;
  const BG_KINDS = ['drift', 'approval', 'fiscal', 'interest', 'surplus', 'confidence', 'strain'];

  /* ------------------------------------------------------- scorecard body */

  function changeRow(c) {
    return D.h('span', { class: 'chip ' + (c.delta > 0 ? 'up' : 'down'), text: F.deltaChip(c) });
  }

  function changesWrap(changes) {
    const row = D.h('div', { class: 'change-chips' });
    (changes || []).forEach(function (c) { row.appendChild(changeRow(c)); });
    return row;
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
    return D.h('section', { class: 'score-block' },
      D.h('h3', { text: 'Net movement this quarter' }),
      D.h('p', { class: 'muted small', text: 'This is where Britain ended up after your choices, delayed effects and the things you left alone.' }),
      row);
  }

  function causeChainBlock(report) {
    const items = [];
    report.matured.forEach(function (m) {
      items.push(D.h('li', null,
        D.h('p', null,
          D.h('b', { text: 'Because you chose ' + (m.causeChoice || m.cause) }),
          D.h('span', { text: ' → ' + m.text })),
        changesWrap(m.changes || [])));
    });
    report.neglected.forEach(function (n) {
      items.push(D.h('li', null,
        D.h('p', null,
          D.h('b', { text: 'Because you left ' + n.title + ' unanswered' }),
          D.h('span', { text: ' → ' + n.text })),
        D.h('span', { class: 'chip down', text: F.deltaChip(n.change) })));
    });
    if (!items.length) return null;
    return D.h('section', { class: 'score-block' },
      D.h('h3', { text: 'Why it moved' }),
      D.h('ul', { class: 'matured-list' }, items));
  }

  function promiseBlock() {
    const promises = E.promiseStatus ? E.promiseStatus() : [];
    if (!promises.length) return null;
    const row = D.h('div', { class: 'change-chips' });
    promises.slice(0, 3).forEach(function (p) {
      const cls = p.status === 'On track' || p.status === 'Delivered' ? 'up'
        : p.status === 'Broken' ? 'down' : '';
      row.appendChild(D.h('span', { class: 'chip ' + cls, text: p.label + ': ' + p.status }));
    });
    return D.h('section', { class: 'score-block' },
      D.h('h3', { text: 'Your promises now' }), row);
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
    blocks.push(causeChainBlock(report));
    blocks.push(immediateBlock(report));
    blocks.push(promiseBlock());
    if (report.coming) {
      blocks.push(D.h('p', { class: 'coming', text: 'Coming: ' + report.coming.text + ' — in ' + report.coming.quarters + ' quarter' + (report.coming.quarters === 1 ? '' : 's') }));
    }
    blocks.push(D.h('button', {
      class: 'btn big block', type: 'button',
      onClick: function () { next(report); }
    }, report.final ? 'To the count' : 'Next quarter'));
    return blocks.filter(Boolean);
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
      YM.onboarding.coach('run_scorecard', handle.el, 'What changed, why it changed, and what is still coming');
    }
  }

  function next(report) {
    const h = handle; handle = null;
    if (h) h.close();
    if (E.onboarding().stage === 'first_run') E.setOnboardingStage('done');
    if (report.final) {
      YM.election.play(report.final);
      return;
    }
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

  function showCallout(anchorEl, cause, effect, changes) {
    hideCallout();
    if (D.motion() === 'reduced' || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    if (!rect.width && !rect.height && !rect.top && !rect.left) return;
    const chips = D.h('div', { class: 'change-chips' });
    (changes || []).forEach(function (c) {
      chips.appendChild(D.h('span', { class: 'chip ' + (c.delta > 0 ? 'up' : 'down'), text: F.deltaChip(c) }));
    });
    const el = D.h('div', { class: 'run-callout', 'aria-hidden': 'true' },
      cause ? D.h('p', { class: 'run-callout-cause small', text: cause }) : null,
      D.h('p', { class: 'run-callout-effect', text: effect }),
      (changes && changes.length) ? chips : null);
    document.body.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    let top = rect.top - h - 10;
    if (top < 8) top = rect.bottom + 10;
    top = Math.max(8, Math.min(window.innerHeight - h - 8, top));
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    calloutEl = el;
    D.announce((cause ? cause + '. ' : '') + effect);
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
  }

  function applyEntry(entry, instant) {
    if (!instant) hideCallout();
    (entry.changes || []).forEach(function (c) { applyChange(c, !instant); });
    if (instant) return;

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

  B.on('phase', function (p) { if (p !== 'running' && activeSeq) activeSeq.cancel(); });

  function quarter() {
    if (E.state.bill) return;
    B.freeze();
    const report = E.endTurn();
    B.setPhase('running');
    YM.desk.setEnabled(false);
    buildTicker(report);
    D.announce('Running the quarter');
    if (E.onboarding().stage === 'first_run' && D.motion() !== 'reduced') {
      YM.onboarding.coach('run_ticker', D.$('ticker'), 'The country moves whether you act or not');
    }

    const items = buildSteps(report);
    lastSteps = items.map(function (it) { return { kind: it.kind, week: it.week }; });

    activeSeq = playSeq(items, function () {
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
    lastSteps: function () { return lastSteps.slice(); }
  };
})();
