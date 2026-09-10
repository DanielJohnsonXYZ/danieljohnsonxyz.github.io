/* Election night: the payoff of the whole term. Turn 20's election card
   resolves like any other card, and the quarter that follows it runs like
   any other quarter — the only thing different is what its scorecard's
   button does (js/run.js: 'To the count' calls play() instead of closing
   to the desk).

   play() replaces the desk with a results panel and declares the six
   regions one at a time, television-style: the map recolours, the bar
   creeps toward 326, a callout gives the reason, and if the outcome is
   decided early there is a beat before the count continues. Skipping or
   reduced motion jumps straight to the final state. Either way the run
   ends the same place: bus.thaw() then verdict(), a locked overlay with
   the result, the defining decisions, the country before and after, the
   promises, and the seats by region.

   Reused from js/run.js rather than imported (nothing there is exported):
   the setTimeout-chained scheduler whose finish() applies every remaining
   step synchronously and whose cancel() just stops, and the floating
   callout anchored to a region's label. */

window.YM = window.YM || {};
YM.election = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  const MAJORITY = 326;
  const TOTAL_SEATS = 650;
  const REGION_MS = 2600;   // ~2.6s between declarations
  const BEAT_MS = 1500;     // the pause when the result is decided

  /* ------------------------------------------------------------- results
     panel: lives inside #desk for the whole of election night (both the
     live count and, on reload, the instant boot path). Rebuilt fresh each
     time play()/boot() starts a term's election. */

  let panelRefs = null;
  let currentFinal = null;

  function swingWord(swing) {
    const n = Math.abs(Math.round(swing));
    if (swing > 0) return 'up ' + n + ' point' + (n === 1 ? '' : 's');
    if (swing < 0) return 'down ' + n + ' point' + (n === 1 ? '' : 's');
    return 'unchanged';
  }

  function buildRow(name) {
    const seatsEl = D.h('span', { class: 'results-row-seats', hidden: true });
    const statusEl = D.h('span', { class: 'chip', hidden: true });
    const swingEl = D.h('span', { class: 'chip', hidden: true });
    const reasonEl = D.h('p', { class: 'muted small results-row-reason', hidden: true });
    const li = D.h('li', { class: 'results-row', 'data-region': name },
      D.h('span', { class: 'results-row-name', text: name }),
      D.h('div', { class: 'results-row-chips' }, seatsEl, statusEl, swingEl),
      reasonEl);
    return { li: li, seats: seatsEl, status: statusEl, swing: swingEl, reason: reasonEl };
  }

  function buildResultsPanel(final) {
    const fillEl = D.h('span', { class: 'seats-bar-fill', style: { width: '0%' } });
    const markPct = (MAJORITY / TOTAL_SEATS * 100).toFixed(2) + '%';
    const barEl = D.h('div', {
      class: 'seats-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(TOTAL_SEATS),
      'aria-valuenow': '0', 'aria-label': 'Seats declared, 326 needed for a majority'
    },
      fillEl,
      D.h('span', { class: 'seats-bar-mark', style: { left: markPct }, 'aria-hidden': 'true' }),
      D.h('span', { class: 'seats-bar-mark-label', style: { left: markPct } }, '326 to win'));
    const totalEl = D.h('p', { class: 'seats-total serif', text: '0 seats' });

    const rows = {};
    const rowsList = D.h('ul', { class: 'results-rows' }, final.regionOrder.map(function (name) {
      const r = buildRow(name);
      rows[name] = r;
      return r.li;
    }));

    const backBtn = D.h('button', {
      id: 'back-to-result', class: 'btn secondary block', type: 'button', hidden: true,
      onClick: function () { if (currentFinal) verdict(currentFinal); }
    }, 'Back to the result');

    const panel = D.h('div', { id: 'results' },
      D.h('div', { class: 'panel-head' }, D.h('h2', { text: 'ELECTION NIGHT' })),
      barEl, totalEl, rowsList, backBtn);

    D.replace(D.$('desk'), panel);
    panelRefs = { barEl: barEl, fillEl: fillEl, totalEl: totalEl, rows: rows, backBtn: backBtn };
  }

  function fillRow(name, row) {
    const r = panelRefs && panelRefs.rows[name];
    if (!r) return;
    r.li.classList.add('declared');
    r.seats.hidden = false;
    r.seats.textContent = row.won + ' / ' + row.seats + ' seats';
    r.status.hidden = false;
    r.status.className = 'chip ' + (row.held ? 'up' : 'down');
    r.status.textContent = row.held ? 'Held' : 'Lost';
    r.swing.hidden = false;
    r.swing.className = 'chip ' + (row.swing > 0 ? 'up' : row.swing < 0 ? 'down' : '');
    r.swing.textContent = F.signed(row.swing);
    r.swing.setAttribute('aria-label', 'Swing since Year 1: ' + swingWord(row.swing));
    r.reason.hidden = false;
    r.reason.textContent = row.reason;
  }

  function paintRegion(name, row, silent) {
    const group = document.querySelector('.region[data-region="' + name + '"]');
    if (!group) return;
    const path = group.querySelector('.map-shape');
    if (path) path.style.fill = row.held ? 'var(--good-on-navy)' : 'var(--bad-on-navy)';
    group.classList.remove('election-held', 'election-lost');
    group.classList.add(row.held ? 'election-held' : 'election-lost');
    const valueEl = group.querySelector('.map-value');
    if (valueEl) valueEl.textContent = row.won + '/' + row.seats;
    if (!silent) YM.map.pulse(name, row.held ? 'up' : 'down');
  }

  function updateBar(total) {
    if (!panelRefs) return;
    const pct = Math.max(0, Math.min(100, total / TOTAL_SEATS * 100));
    panelRefs.fillEl.style.width = pct + '%';
    panelRefs.barEl.setAttribute('aria-valuenow', String(total));
    panelRefs.barEl.classList.toggle('majority', total >= MAJORITY);
    panelRefs.totalEl.textContent = total + ' seats';
  }

  /* -------------------------------------------------------------- callout
     Same shape as js/run.js's showCallout: at most one on screen, anchored
     over the region's map label, never shown under reduced motion. */
  let calloutEl = null;
  function hideCallout() {
    if (calloutEl && calloutEl.parentNode) calloutEl.parentNode.removeChild(calloutEl);
    calloutEl = null;
  }
  function showCallout(name, reason, swing) {
    hideCallout();
    if (D.motion() === 'reduced') return;
    const anchorEl = document.querySelector('.region[data-region="' + name + '"] .map-name');
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    if (!rect.width && !rect.height && !rect.top && !rect.left) return;
    const chip = D.h('span', { class: 'chip ' + (swing > 0 ? 'up' : swing < 0 ? 'down' : ''), text: F.signed(swing) + ' since Year 1' });
    const el = D.h('div', { class: 'run-callout' },
      D.h('p', { class: 'run-callout-effect', text: reason }),
      D.h('div', { class: 'change-chips' }, chip));
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

  /* ---------------------------------------------------------------- ticker
     Same element as js/run.js's, rebuilt for the count: no week counter,
     just "Polls have closed" and the skip button in the same spot. */
  let tickerCtl = null;
  function buildTicker() {
    const el = D.$('ticker');
    const lineEl = D.h('span', { class: 'ticker-line', text: 'Polls have closed' });
    const skipBtn = D.h('button', {
      id: 'skip-election', class: 'btn ghost ticker-skip', type: 'button',
      onClick: function () { if (activeSeq) activeSeq.finish(); }
    }, 'Skip');
    D.replace(el, lineEl, skipBtn);
    el.hidden = false;
    skipBtn.focus();
    tickerCtl = { setLine: function (t) { lineEl.textContent = t; } };
    return tickerCtl;
  }

  /* --------------------------------------------------------------- script
     The declare order and each region's own won/lost seats are already
     fixed by final.seatsByRegion, so exactly where the beat falls — the
     point the result stops being in doubt — can be worked out up front
     rather than re-checked on every declaration. */
  function buildPlan(final) {
    const order = final.regionOrder;
    let running = 0, beatIndex = -1, beatKind = null;
    order.forEach(function (name, i) {
      running += final.seatsByRegion[name].won;
      if (beatIndex >= 0) return;
      if (running >= MAJORITY) { beatIndex = i; beatKind = 'won'; return; }
      let remaining = 0;
      for (let j = i + 1; j < order.length; j++) remaining += final.seatsByRegion[order[j]].won;
      if (running + remaining < MAJORITY) { beatIndex = i; beatKind = 'lost'; }
    });
    const steps = order.map(function (name, i) {
      return { region: name, delay: REGION_MS + (i > 0 && i - 1 === beatIndex ? BEAT_MS : 0) };
    });
    return { steps: steps, beatIndex: beatIndex, beatKind: beatKind, tailPause: beatIndex === order.length - 1 };
  }

  /* Mirrors js/run.js's playSeq: a chain of setTimeouts, one per step.
     finish() applies whatever is left synchronously and instantly — always
     the map/bar/row updates a render() would leave, never the ticker
     chatter or callout a live viewer would have seen. cancel() just stops.
     Both are safe to call more than once. */
  function playSeq(final, plan, onDone) {
    let idx = 0, timer = null, done = false, cancelled = false, running = 0;

    function apply(step, instant) {
      const row = final.seatsByRegion[step.region];
      running += row.won;
      fillRow(step.region, row);
      paintRegion(step.region, row, instant);
      updateBar(running);
      if (instant) return; // no callouts or ticker chatter when finishing early
      D.announce(step.region + ': ' + (row.held ? 'held, ' : 'lost, ') + row.won + ' of ' + row.seats + ' seats.');
      showCallout(step.region, row.reason, row.swing);
      if (step.index === plan.beatIndex) {
        tickerLine(plan.beatKind === 'won' ? 'THE GOVERNMENT HAS WON A MAJORITY' : 'THE GOVERNMENT HAS LOST ITS MAJORITY');
      } else {
        tickerLine(step.region + ' declares: ' + (row.held ? 'held' : 'lost'));
      }
    }
    function tickerLine(text) { if (tickerCtl) tickerCtl.setLine(text); }

    function finishUp() { if (done) return; done = true; onDone(); }
    function scheduleNext() {
      if (cancelled || done) return;
      if (idx >= plan.steps.length) {
        if (plan.tailPause) { timer = setTimeout(finishUp, BEAT_MS); } else { finishUp(); }
        return;
      }
      const step = plan.steps[idx];
      timer = setTimeout(function () {
        apply(Object.assign({ index: idx }, step), false);
        idx++;
        scheduleNext();
      }, step.delay);
    }
    function finish() {
      if (done) return;
      cancelled = true;
      if (timer) clearTimeout(timer);
      while (idx < plan.steps.length) { apply(Object.assign({ index: idx }, plan.steps[idx]), true); idx++; }
      finishUp();
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
  B.on('phase', function (p) { if (p !== 'election' && activeSeq) { activeSeq.cancel(); activeSeq = null; } });

  function dimMap(on) {
    const mapEl = D.$('map');
    if (mapEl) mapEl.classList.toggle('election-dim', !!on);
  }

  /* ------------------------------------------------------------- the play
     Turn 20's election card has already resolved like any other card; this
     is what its own quarter's scorecard hands off to instead of the desk
     (js/run.js). */
  function play(final) {
    currentFinal = final;
    B.freeze();
    B.setPhase('election');
    B.closeAll();
    buildResultsPanel(final);
    dimMap(true);
    buildTicker();
    D.announce('Polls have closed');

    const plan = buildPlan(final);
    activeSeq = playSeq(final, plan, function () {
      hideCallout();
      const tk = D.$('ticker');
      if (tk) tk.hidden = true;
      B.thaw();
      verdict(final);
    });
  }

  /* A reload well after the term ended (js/app.js): no count to watch, just
     the finished board and the verdict, straight away. finish() is safe to
     call again — it reads state, it does not touch the random sequence. */
  function boot(final) {
    currentFinal = final;
    B.setPhase('election');
    buildResultsPanel(final);
    dimMap(true);
    let total = 0;
    final.regionOrder.forEach(function (name) {
      const row = final.seatsByRegion[name];
      total += row.won;
      fillRow(name, row);
      paintRegion(name, row, true);
    });
    updateBar(total);
    const tk = D.$('ticker');
    if (tk) tk.hidden = true;
    verdict(final);
  }

  /* ----------------------------------------------------------- the verdict */

  function changeChips(changes) {
    const row = D.h('div', { class: 'change-chips' });
    (changes || []).forEach(function (c) {
      row.appendChild(D.h('span', { class: 'chip ' + (c.delta > 0 ? 'up' : 'down'), text: F.deltaChip(c) }));
    });
    return row;
  }

  function definingBlock(d) {
    const chain = d.chain || [];
    const first = chain[0], second = chain[1];
    const parts = [
      D.h('p', { class: 'eyebrow', text: F.when(d.turn) }),
      D.h('h4', { class: 'serif', text: d.title })
    ];
    if (first) {
      parts.push(D.h('p', { class: 'defining-choice', text: 'You chose ' + first.text + (second ? ' →' : '.') }));
      if (first.changes && first.changes.length) parts.push(changeChips(first.changes));
    }
    if (second) {
      parts.push(D.h('p', { class: 'defining-delayed', text: second.pending ? '(still to come)' : second.text }));
      if (!second.pending && second.changes && second.changes.length) parts.push(changeChips(second.changes));
    }
    return D.h('div', { class: 'defining-item' }, parts);
  }

  function readoutRow(r) {
    const dir = r.to > r.from ? 'up' : r.to < r.from ? 'down' : '';
    return D.h('li', { class: 'readout-row' },
      D.h('span', { text: r.name + ': ' + r.before + ' → ' + r.after }),
      D.h('b', { class: dir, 'aria-hidden': 'true', text: F.trendArrow(r.to - r.from) }));
  }

  function promiseRow(p) {
    const cls = p.status === 'Delivered' ? 'up' : p.status === 'Broken' ? 'down' : '';
    return D.h('li', { class: 'promise-row' },
      D.icon(p.icon), D.h('span', { text: p.label }),
      D.h('span', { class: 'chip' + (cls ? ' ' + cls : ''), text: p.status }));
  }

  function seatsTable(final) {
    return D.h('table', { class: 'seats-table' },
      D.h('thead', null, D.h('tr', null,
        D.h('th', { text: 'Region' }), D.h('th', { text: 'Seats' }),
        D.h('th', { text: 'Result' }), D.h('th', { text: 'Swing' }))),
      D.h('tbody', null, final.regionOrder.map(function (name) {
        const row = final.seatsByRegion[name];
        return D.h('tr', null,
          D.h('td', { text: name }),
          D.h('td', { text: row.won + '/' + row.seats }),
          D.h('td', null, D.h('span', { class: 'chip ' + (row.held ? 'up' : 'down'), text: row.held ? 'Held' : 'Lost' })),
          D.h('td', { text: F.signed(row.swing) }));
      })));
  }

  let verdictHandle = null;

  function verdictBody(final) {
    return [
      D.h('p', { class: 'election-verdict serif', text: final.seats + ' of 650 seats' + (final.won ? ', a working majority.' : '. Short of the 326 you needed.') }),
      D.h('p', { class: 'chip gold', text: 'History will call you ' + final.legacy }),
      D.h('h3', { text: 'Your defining decisions' }),
      D.h('div', { class: 'defining-list' }, final.defining.map(definingBlock)),
      D.h('h3', { text: 'Britain, Year 1 → Year 5' }),
      D.h('ul', { class: 'stat-list' },
        D.h('li', null, D.h('span', {}, 'Approval'), D.h('b', { text: Math.round(final.before.a) + '% → ' + Math.round(final.after.a) + '%' })),
        D.h('li', null, D.h('span', {}, 'Spare money'), D.h('b', { text: F.money(final.before.h) + ' → ' + F.money(final.after.h) }))),
      D.h('ul', { class: 'readouts' }, final.readouts.map(readoutRow)),
      D.h('h3', { text: 'Promises' }),
      D.h('ul', { class: 'promise-track' }, final.promises.map(promiseRow)),
      D.h('h3', { text: 'Seats by region' }),
      D.h('div', { class: 'table-scroll' }, seatsTable(final)),
      D.h('div', { class: 'verdict-actions' },
        D.h('button', { class: 'btn big block', type: 'button', onClick: playAgain }, 'Play again'),
        D.h('button', { class: 'btn secondary big block', type: 'button', onClick: lookAtMap }, 'Look at the map'))
    ];
  }

  function verdict(final) {
    currentFinal = final;
    if (panelRefs && panelRefs.backBtn) panelRefs.backBtn.hidden = false;
    verdictHandle = B.open({
      title: final.won ? 'You won' : 'You lost',
      eyebrow: 'THE GENERAL ELECTION · YEAR 5',
      wide: true, locked: true, body: verdictBody(final)
    });
    verdictHandle.el.id = 'verdict';
  }

  function lookAtMap() {
    const h = verdictHandle; verdictHandle = null;
    if (h) h.close();
  }

  function playAgain() {
    const h = verdictHandle; verdictHandle = null;
    if (h) h.close();
    E.clearSave();
    E.reset();
    panelRefs = null;
    currentFinal = null;
    dimMap(false);
    const tk = D.$('ticker');
    if (tk) { tk.hidden = true; }
    B.setPhase('title');
    YM.onboarding.title();
  }

  return { play: play, boot: boot, verdict: verdict };
})();
