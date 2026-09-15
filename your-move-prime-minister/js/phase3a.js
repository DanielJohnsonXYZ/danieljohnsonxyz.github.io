/* Phase 3A: strategic legibility enhancements. Additive only, no balance changes. */
(function () {
  'use strict';
  if (!window.Engine) return;

  var E = window.Engine;
  var lastTurn = -1;
  var lastHistoryLen = -1;
  var rafPending = false;

  var PROMISE_LEVERS = {
    health: ['NHS funding', 'pay settlements', 'workforce and productivity reform'],
    housing: ['planning reform', 'housing investment', 'infrastructure'],
    economy: ['growth investment', 'tax and borrowing choices', 'energy stability'],
    crime: ['policing', 'prisons', 'justice policy'],
    energy: ['energy investment', 'household support', 'domestic supply'],
    transport: ['transport investment', 'infrastructure', 'regional spending']
  };

  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function signed(n) { return n > 0 ? '+' + n : String(n); }
  function trend(delta) { return delta > 0 ? '↑' : delta < 0 ? '↓' : '→'; }

  function history() {
    try { return typeof E.history === 'function' ? E.history() : (E.state.history || []); }
    catch (_) { return E.state.history || []; }
  }

  function latestDelta(kind, key) {
    var h = history();
    if (!h || h.length < 2) return 0;
    var a = h[h.length - 2], b = h[h.length - 1];
    if (kind === 'region') return ((b.r && b.r[key]) || 0) - ((a.r && a.r[key]) || 0);
    if (kind === 'indicator') return ((b.i && b.i[key]) || 0) - ((a.i && a.i[key]) || 0);
    return 0;
  }

  function promiseTargets() {
    try { return typeof E.promiseTargets === 'function' ? E.promiseTargets() : []; }
    catch (_) { return []; }
  }

  function openPromiseDetail(target) {
    var old = q('#phase3a-promise-detail');
    if (old) old.remove();
    var layer = el('div', 'phase3a-modal-layer');
    layer.id = 'phase3a-promise-detail';
    layer.setAttribute('role', 'presentation');
    var panel = el('section', 'phase3a-modal');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Promise progress');

    var head = el('div', 'phase3a-modal-head');
    head.appendChild(el('p', 'eyebrow', 'YOUR PROMISE'));
    head.appendChild(el('h2', 'serif', target.text || target.name || 'Promise'));
    var close = el('button', 'btn secondary', 'Close');
    close.type = 'button';
    close.addEventListener('click', function () { layer.remove(); });
    head.appendChild(close);
    panel.appendChild(head);

    var current = target.currentText || target.current || 'Current position';
    var goal = target.targetText || target.target || 'Election target';
    var status = target.status || 'In progress';
    var body = el('div', 'phase3a-promise-body');
    body.appendChild(el('p', 'phase3a-promise-status', status));
    var track = el('div', 'phase3a-promise-track');
    var now = el('div', 'phase3a-track-point');
    now.appendChild(el('span', 'muted small', 'Now'));
    now.appendChild(el('strong', '', String(current)));
    var arrow = el('span', 'phase3a-track-arrow', '→');
    var end = el('div', 'phase3a-track-point');
    end.appendChild(el('span', 'muted small', 'Election target'));
    end.appendChild(el('strong', '', String(goal)));
    track.appendChild(now); track.appendChild(arrow); track.appendChild(end);
    body.appendChild(track);

    var key = target.key || target.indicator || target.id || '';
    var levers = PROMISE_LEVERS[key] || ['relevant policy decisions', 'funding choices', 'avoiding neglect'];
    body.appendChild(el('h3', '', 'What moves this'));
    var ul = el('ul', 'phase3a-levers');
    levers.forEach(function (x) { ul.appendChild(el('li', '', x)); });
    body.appendChild(ul);
    body.appendChild(el('p', 'muted small', 'Promises are judged at the election, so direction matters as much as one good quarter.'));
    panel.appendChild(body);
    layer.appendChild(panel);
    document.body.appendChild(layer);
    close.focus();
    layer.addEventListener('click', function (ev) { if (ev.target === layer) layer.remove(); });
  }

  function enhancePromises() {
    var targets = promiseTargets();
    if (!targets.length) return;
    var chips = qa('#hud .promise-chip, #hud [data-promise], #hud .chip');
    chips.forEach(function (chip, i) {
      if (chip.dataset.phase3aPromise === '1') return;
      var target = targets[i];
      if (!target) return;
      chip.dataset.phase3aPromise = '1';
      chip.classList.add('phase3a-clickable');
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('aria-label', (chip.textContent || 'Promise') + ', open promise progress');
      function open() { openPromiseDetail(target); }
      chip.addEventListener('click', open);
      chip.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } });
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
    if (!desk || !E.state || !E.state.agenda) return;
    qa('.desk-card', desk).forEach(function (node) {
      if (node.classList.contains('done')) return;
      var btn = q('[data-event-id]', node);
      var id = btn && btn.getAttribute('data-event-id');
      if (!id) return;
      var entry = E.state.agenda.find(function (a) { return a.eventId === id; });
      if (!entry || entry.done) return;
      var card = null;
      try { card = E.agendaCard(entry); } catch (_) {}
      var existing = q('.phase3a-risk', node);
      var risk = riskFor(entry, card);
      if (!existing) {
        existing = el('span', 'phase3a-risk ' + risk.cls, risk.label);
        var body = q('.desk-card-body', node) || node;
        body.appendChild(existing);
      } else {
        existing.className = 'phase3a-risk ' + risk.cls;
        existing.textContent = risk.label;
      }
    });

    var run = q('.desk-run', desk);
    if (!run) return;
    var old = q('.phase3a-left-behind', run);
    var undone = E.state.agenda.filter(function (a) { return !a.done; });
    if (!undone.length) { if (old) old.remove(); return; }
    if (!old) {
      old = el('div', 'phase3a-left-behind');
      run.insertBefore(old, run.firstChild);
    }
    old.textContent = '';
    old.appendChild(el('strong', '', 'If you run now, you leave behind:'));
    var list = el('ul', 'phase3a-left-list');
    undone.slice(0, 3).forEach(function (entry) {
      var card = null;
      try { card = E.agendaCard(entry); } catch (_) {}
      var risk = riskFor(entry, card);
      list.appendChild(el('li', risk.cls, (card ? card.title : entry.eventId) + ' · ' + risk.label));
    });
    old.appendChild(list);
  }

  function enhanceRegions() {
    qa('.region[data-region]').forEach(function (region) {
      var name = region.getAttribute('data-region');
      var delta = latestDelta('region', name);
      var value = q('.map-value', region);
      if (!value) return;
      var badge = q('.phase3a-region-trend', region);
      if (!badge) {
        badge = el('span', 'phase3a-region-trend');
        region.appendChild(badge);
      }
      badge.textContent = trend(delta) + (delta ? ' ' + signed(Math.round(delta)) : '');
      badge.className = 'phase3a-region-trend ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat');
    });
  }

  function enhanceDials() {
    qa('.dial[data-key]').forEach(function (dial) {
      var key = dial.getAttribute('data-key');
      var delta = latestDelta('indicator', key);
      var badge = q('.phase3a-dial-delta', dial);
      if (!badge) {
        badge = el('span', 'phase3a-dial-delta');
        dial.appendChild(badge);
      }
      badge.textContent = trend(delta) + (delta ? ' ' + signed(Math.round(delta)) : '');
      badge.className = 'phase3a-dial-delta ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat');
      if (delta) {
        dial.classList.remove('phase3a-moved');
        void dial.offsetWidth;
        dial.classList.add('phase3a-moved');
      }
    });
  }

  function report() {
    return E.state && E.state.lastReport ? E.state.lastReport : null;
  }

  function enhanceScorecard() {
    var card = q('#scorecard');
    var r = report();
    if (!card || !r || q('.phase3a-causality', card)) return;
    var chains = [];
    (r.matured || []).forEach(function (m) {
      var effects = (m.changes || []).map(function (c) { return c.name + ' ' + signed(c.delta); }).join(' · ');
      chains.push({ cause: m.causeChoice || m.cause || 'Earlier decision', effect: m.text || '', stats: effects, cls: 'good' });
    });
    (r.neglected || []).forEach(function (n) {
      var c = n.change;
      var effects = c ? ((c.name || c.key || 'Impact') + ' ' + signed(c.delta || 0)) : '';
      chains.push({ cause: 'You left ' + n.title + ' unanswered', effect: n.text || 'It got worse.', stats: effects, cls: 'bad' });
    });
    if (!chains.length) return;
    var block = el('section', 'score-block phase3a-causality');
    block.appendChild(el('h3', '', 'Why Britain moved'));
    var list = el('div', 'phase3a-chain-list');
    chains.slice(0, 5).forEach(function (x) {
      var row = el('div', 'phase3a-chain ' + x.cls);
      row.appendChild(el('strong', 'phase3a-chain-cause', x.cause));
      row.appendChild(el('span', 'phase3a-chain-arrow', '→'));
      row.appendChild(el('span', 'phase3a-chain-effect', x.effect));
      if (x.stats) row.appendChild(el('span', 'phase3a-chain-stats', x.stats));
      list.appendChild(row);
    });
    block.appendChild(list);
    var button = q('#scorecard .btn.big.block');
    if (button && button.parentNode) button.parentNode.insertBefore(block, button);
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
      var h = history();
      lastHistoryLen = h ? h.length : 0;
      lastTurn = E.state ? E.state.turn : -1;
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
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: false });
  document.addEventListener('click', schedule, true);
  window.addEventListener('load', schedule);
  schedule();
})();
