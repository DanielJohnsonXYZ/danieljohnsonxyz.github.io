/* Phase 3A strategic legibility enhancements.
   Deliberately additive: this file does not change engine balance or random calls. */
(function () {
  'use strict';
  if (!window.Engine) return;

  var E = window.Engine;
  var rafPending = false;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var PROMISE_LEVERS = {
    health: ['NHS funding and workforce', 'pay and productivity settlements', 'avoiding prolonged health crises'],
    housing: ['planning reform', 'housing investment', 'transport and infrastructure'],
    economy: ['growth investment', 'tax and borrowing choices', 'energy and market confidence'],
    crime: ['policing', 'prisons and court capacity', 'justice policy'],
    energy: ['domestic energy investment', 'grid and clean-power decisions', 'how you handle energy shocks'],
    headroom: ['tax and spending choices', 'borrowing and debt interest', 'avoiding unfunded commitments']
  };

  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs, text) {
    var n = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }
  function signed(n) { n = Math.round(Number(n) || 0); return n > 0 ? '+' + n : String(n); }
  function arrow(n) { return n > 0 ? '↑' : n < 0 ? '↓' : '→'; }

  function promiseTargets() {
    try { return typeof E.promiseTargets === 'function' ? E.promiseTargets() : []; }
    catch (_) { return []; }
  }
  function promiseStatus() {
    try { return typeof E.promiseStatus === 'function' ? E.promiseStatus() : []; }
    catch (_) { return []; }
  }

  function findPromiseTarget(chip, targets, statuses) {
    var label = (chip.getAttribute('aria-label') || chip.textContent || '').toLowerCase();
    var status = statuses.find(function (p) { return label.indexOf(String(p.label || '').toLowerCase()) >= 0; });
    if (status) return targets.find(function (t) { return t.id === status.id; });
    return null;
  }

  function openPromiseDetail(target) {
    var old = q('#phase3a-promise-detail');
    if (old) old.remove();

    var status = promiseStatus().find(function (p) { return p.id === target.id; });
    var layer = el('div', 'phase3a-modal-layer');
    layer.id = 'phase3a-promise-detail';
    var panel = el('section', 'phase3a-modal');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Promise progress: ' + target.label);

    var head = el('div', 'phase3a-modal-head');
    var headingWrap = el('div');
    headingWrap.appendChild(el('p', 'eyebrow', 'YOUR PROMISE'));
    headingWrap.appendChild(el('h2', 'serif', target.label));
    head.appendChild(headingWrap);
    var close = el('button', 'btn secondary', 'Close');
    close.type = 'button';
    head.appendChild(close);
    panel.appendChild(head);

    var body = el('div', 'phase3a-promise-body');
    var statusLine = el('p', 'phase3a-promise-status ' + ((status && status.status === 'On track') ? 'good' : 'warn'), status ? status.status : 'In progress');
    body.appendChild(statusLine);

    var track = el('div', 'phase3a-promise-track');
    var now = el('div', 'phase3a-track-point');
    now.appendChild(el('span', 'muted small', 'Now'));
    now.appendChild(el('strong', '', target.now || String(target.value)));
    var arr = el('span', 'phase3a-track-arrow', '→');
    var goal = el('div', 'phase3a-track-point');
    goal.appendChild(el('span', 'muted small', 'Election target'));
    goal.appendChild(el('strong', '', target.target || String(target.threshold)));
    track.appendChild(now); track.appendChild(arr); track.appendChild(goal);
    body.appendChild(track);

    var direction = Number(target.value) - Number(target.threshold);
    var forecast = target.key === 'headroom'
      ? (direction >= 0 ? 'You are currently above the target.' : 'You need more fiscal room before polling day.')
      : (direction >= 0 ? 'You are currently at or beyond the target.' : 'You still have ground to make up before polling day.');
    body.appendChild(el('p', 'phase3a-forecast', forecast));
    body.appendChild(el('h3', '', 'What moves this'));
    var list = el('ul', 'phase3a-levers');
    (PROMISE_LEVERS[target.key] || ['relevant policy decisions', 'funding choices', 'avoiding neglect']).forEach(function (x) {
      list.appendChild(el('li', '', x));
    });
    body.appendChild(list);
    body.appendChild(el('p', 'muted small', 'The election judges where you finish, not whether one quarter looked good.'));
    panel.appendChild(body);
    layer.appendChild(panel);
    document.body.appendChild(layer);

    function dismiss() { if (layer.parentNode) layer.remove(); }
    close.addEventListener('click', dismiss);
    layer.addEventListener('click', function (ev) { if (ev.target === layer) dismiss(); });
    layer.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') dismiss(); });
    close.focus();
  }

  function enhancePromises() {
    var targets = promiseTargets();
    var statuses = promiseStatus();
    if (!targets.length || !statuses.length) return;
    qa('#hud .promise-chip').forEach(function (chip) {
      var target = findPromiseTarget(chip, targets, statuses);
      if (!target) return;
      chip.classList.add('phase3a-clickable');
      chip.title = (chip.title ? chip.title + ' · ' : '') + 'Click for target and policy levers';
      if (chip.dataset.phase3aPromise === '1') return;
      chip.dataset.phase3aPromise = '1';
      chip.addEventListener('dblclick', function (ev) { ev.preventDefault(); ev.stopPropagation(); openPromiseDetail(target); });
      chip.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && ev.shiftKey) { ev.preventDefault(); openPromiseDetail(target); }
      });
      /* Existing single click expands the mobile chip. A second click on an
         already-expanded chip opens strategy detail, so we preserve M6 behaviour. */
      chip.addEventListener('click', function () {
        if (chip.getAttribute('aria-expanded') === 'true') setTimeout(function () { openPromiseDetail(target); }, 0);
      });
    });
  }

  function riskFor(entry, card) {
    if (entry.urgent) return { label: 'Severe if ignored', cls: 'severe' };
    if (card && card.promise) return { label: 'Risks your promise', cls: 'promise' };
    if (card && card.cost >= 2) return { label: 'High-impact choice', cls: 'high' };
    return { label: 'Will worsen if ignored', cls: 'medium' };
  }

  function enhanceDesk() {
    var desk = q('#desk');
    if (!desk || !E.state || !Array.isArray(E.state.agenda)) return;

    qa('.desk-card', desk).forEach(function (node) {
      if (node.classList.contains('done')) return;
      var btn = q('[data-event-id]', node);
      var id = btn && btn.getAttribute('data-event-id');
      if (!id) return;
      var entry = E.state.agenda.find(function (a) { return a.eventId === id; });
      if (!entry || entry.done) return;
      var card = null;
      try { card = E.agendaCard(entry); } catch (_) {}
      var risk = riskFor(entry, card);
      var badge = q('.phase3a-risk', node);
      if (!badge) {
        badge = el('span', 'phase3a-risk ' + risk.cls, risk.label);
        (q('.desk-card-body', node) || node).appendChild(badge);
      } else if (badge.textContent !== risk.label || !badge.classList.contains(risk.cls)) {
        badge.className = 'phase3a-risk ' + risk.cls;
        badge.textContent = risk.label;
      }
    });

    var run = q('.desk-run', desk);
    if (!run) return;
    var undone = E.state.agenda.filter(function (a) { return !a.done; });
    var box = q('.phase3a-left-behind', run);
    if (!undone.length) { if (box) box.remove(); return; }

    var rows = undone.slice(0, 3).map(function (entry) {
      var card = null;
      try { card = E.agendaCard(entry); } catch (_) {}
      var risk = riskFor(entry, card);
      return { id: entry.eventId, title: card ? card.title : entry.eventId, risk: risk };
    });
    var signature = rows.map(function (r) { return r.id + ':' + r.risk.label; }).join('|');
    if (box && box.dataset.signature === signature) return;
    if (!box) {
      box = el('div', 'phase3a-left-behind');
      run.insertBefore(box, run.firstChild);
    }
    box.dataset.signature = signature;
    box.textContent = '';
    box.appendChild(el('strong', '', 'If you run now, you leave behind:'));
    var list = el('ul', 'phase3a-left-list');
    rows.forEach(function (r) { list.appendChild(el('li', r.risk.cls, r.title + ' · ' + r.risk.label)); });
    box.appendChild(list);
  }

  function enhanceRegions() {
    var details = {};
    try { E.regions().forEach(function (r) { details[r.name] = r; }); } catch (_) { return; }
    qa('.region[data-region]').forEach(function (group) {
      var name = group.getAttribute('data-region');
      var r = details[name];
      var value = q('.map-value', group);
      if (!r || !value) return;
      var label = q('.map-name', group);
      var trendEl = q('.phase3a-region-trend', group);
      if (!trendEl) {
        var x = value.getAttribute('x') || (label && label.getAttribute('x')) || '0';
        var y = Number(value.getAttribute('y') || 0) + 11;
        trendEl = svg('text', {
          x: x, y: String(y), 'text-anchor': value.getAttribute('text-anchor') || 'middle',
          class: 'phase3a-region-trend' + (value.classList.contains('outside') ? ' outside' : '')
        });
        group.appendChild(trendEl);
      }
      trendEl.textContent = arrow(r.delta) + (r.delta ? ' ' + signed(r.delta) : '');
      trendEl.setAttribute('class', 'phase3a-region-trend ' + (r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : 'flat') + (value.classList.contains('outside') ? ' outside' : ''));
    });

    qa('.map-chip[data-region]').forEach(function (chip) {
      var name = chip.getAttribute('data-region');
      var r = details[name];
      var val = q('.map-chip-value', chip);
      if (!r || !val) return;
      var base = r.approval + '%';
      var text = base + ' ' + arrow(r.delta) + (r.delta ? signed(r.delta) : '');
      if (val.textContent !== text) val.textContent = text;
    });
  }

  function enhanceDials() {
    qa('.dial[data-key]').forEach(function (dial) {
      var trendEl = q('.dial-trend', dial);
      if (!trendEl) return;
      var aria = trendEl.getAttribute('aria-label') || '';
      var m = aria.match(/by\s+(\d+(?:\.\d+)?)/i);
      var dir = trendEl.classList.contains('up') ? 1 : trendEl.classList.contains('down') ? -1 : 0;
      var magnitude = m ? Math.round(Number(m[1])) : 0;
      var delta = dir * magnitude;
      var badge = q('.phase3a-dial-delta', dial);
      if (!badge) {
        badge = el('span', 'phase3a-dial-delta');
        dial.appendChild(badge);
      }
      var text = arrow(delta) + (delta ? ' ' + signed(delta) : '');
      if (badge.textContent !== text) badge.textContent = text;
      badge.className = 'phase3a-dial-delta ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat');

      var pulseKey = String(E.state.turn) + ':' + text;
      if (delta && dial.dataset.phase3aPulseKey !== pulseKey) {
        dial.dataset.phase3aPulseKey = pulseKey;
        dial.classList.remove('phase3a-moved');
        void dial.offsetWidth;
        dial.classList.add('phase3a-moved');
      }
    });
  }

  function currentReport() { return E.state && E.state.lastReport ? E.state.lastReport : null; }

  function chainRow(cause, effect, stats, cls) {
    var row = el('div', 'phase3a-chain ' + cls);
    row.appendChild(el('strong', 'phase3a-chain-cause', cause));
    row.appendChild(el('span', 'phase3a-chain-arrow', '→'));
    row.appendChild(el('span', 'phase3a-chain-effect', effect));
    if (stats) row.appendChild(el('span', 'phase3a-chain-stats', stats));
    return row;
  }

  function formatChanges(changes) {
    return (changes || []).map(function (c) { return (c.name || c.key || 'Impact') + ' ' + signed(c.delta); }).join(' · ');
  }

  function enhanceScorecard() {
    var card = q('#scorecard');
    var r = currentReport();
    if (!card || !r || q('.phase3a-causality', card)) return;

    var block = el('section', 'score-block phase3a-causality');
    block.appendChild(el('h3', '', 'Why Britain moved'));
    var list = el('div', 'phase3a-chain-list');
    var count = 0;

    (E.state.record || []).filter(function (rec) { return rec.turn === r.turn; }).slice(-3).forEach(function (rec) {
      if (count >= 5) return;
      var stats = formatChanges(rec.changes);
      list.appendChild(chainRow('You chose ' + rec.choice, rec.headline || rec.title, stats, 'decision'));
      count++;
    });
    (r.matured || []).forEach(function (m) {
      if (count >= 5) return;
      list.appendChild(chainRow(m.causeChoice ? 'Earlier: ' + m.causeChoice : (m.cause || 'Earlier decision'), m.text || 'The delayed effect arrived.', formatChanges(m.changes), 'good'));
      count++;
    });
    (r.neglected || []).forEach(function (n) {
      if (count >= 5) return;
      list.appendChild(chainRow('You left ' + n.title + ' unanswered', n.text || 'It got worse.', n.change ? formatChanges([n.change]) : '', 'bad'));
      count++;
    });

    if (!count) return;
    block.appendChild(list);
    var next = q('#scorecard .btn.big.block');
    if (next && next.parentNode) next.parentNode.insertBefore(block, next);
    else card.appendChild(block);
  }

  function renderEnhancements() {
    rafPending = false;
    try {
      enhancePromises();
      enhanceDesk();
      enhanceRegions();
      enhanceDials();
      enhanceScorecard();
    } catch (err) {
      console.warn('Phase 3A enhancement skipped:', err);
    }
  }

  function schedule() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(renderEnhancements);
  }

  var observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', schedule, true);
  window.addEventListener('load', schedule);
  schedule();
})();
