/* The HUD: the strip across the top of the scene. Always visible outside the
   title screen, and always the same four numbers no matter what overlay is
   open on top of it — a player glances up, not away, to see how they stand. */

window.YM = window.YM || {};
YM.hud = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  const STAT_KEYS = ['approval', 'headroom', 'party', 'confidence'];
  let root = null;
  const valueEls = {};

  function mount() {
    root = D.$('hud');
    B.subscribe(render);
  }

  function statValue(key) {
    if (key === 'headroom') return Math.round(E.state.headroom);
    if (key === 'confidence') return E.confidence();
    return Math.round(E.state[key]);
  }
  function statDisplay(key, v) {
    return key === 'headroom' ? F.money(v) : (v + '%');
  }

  /* Short forms for the 56px mobile row — "Year 2, Autumn" and "13 quarters
     to the election" both run well past what two lines at that height can
     hold without wrapping onto a third. CSS picks whichever pair is shown. */
  function whenShort(turn) { return 'Y' + F.year(turn) + ' ' + F.season(turn).slice(0, 3); }
  function countdownShort(turn) {
    const left = E.TURNS - turn;
    return left <= 0 ? 'Election now' : left + 'Q to go';
  }

  function turnBlock() {
    const s = E.state;
    return D.h('div', { class: 'hud-when' },
      D.h('p', { class: 'hud-turn hud-turn-full serif', text: F.when(s.turn) }),
      D.h('p', { class: 'hud-turn hud-turn-short serif', text: whenShort(s.turn) }),
      D.h('p', { class: 'hud-countdown hud-countdown-full muted', text: F.countdown(s.turn) }),
      D.h('p', { class: 'hud-countdown hud-countdown-short muted', text: countdownShort(s.turn) }));
  }

  function statsRow() {
    const row = D.h('div', { class: 'hud-stats' });
    STAT_KEYS.forEach(function (key) {
      const meta = F.STAT[key];
      const v = statValue(key);
      const valueEl = D.h('span', { class: 'hud-stat-value', text: statDisplay(key, v) });
      valueEls[key] = valueEl;
      row.appendChild(D.h('div', {
        class: 'hud-stat', 'data-stat': key, 'data-value': String(v), title: meta.help
      },
        /* Two labels, one shown at a time by CSS: the full name at 900px
           and up, the short one below it, where there is no room for
           "Market confidence" on a 56px-tall row. */
        D.h('span', { class: 'hud-stat-label hud-stat-label-full', text: meta.name }),
        D.h('span', { class: 'hud-stat-label hud-stat-label-short', text: meta.short }),
        valueEl));
    });
    return row;
  }

  /* Eight quarters of approval, smallest possible chart that still shows a
     shape: not "is it up" but "what has it been doing". */
  function sparkline() {
    const hist = E.history().slice(-8);
    const w = 96, h = 28, pad = 3;
    const svg = D.svg('svg', {
      class: 'hud-spark', viewBox: '0 0 ' + w + ' ' + h, width: w, height: h,
      role: 'img', 'aria-label': 'Approval over the last ' + hist.length + ' quarters'
    });
    if (hist.length < 2) {
      svg.appendChild(D.svg('line', { x1: pad, y1: h - pad, x2: w - pad, y2: h - pad, class: 'hud-spark-line' }));
      return svg;
    }
    const xs = hist.map(function (p, i) { return pad + (w - pad * 2) * (i / (hist.length - 1)); });
    const ys = hist.map(function (p) { return h - pad - (h - pad * 2) * (Math.max(0, Math.min(100, p.a)) / 100); });
    const points = xs.map(function (x, i) { return x.toFixed(1) + ',' + ys[i].toFixed(1); }).join(' ');
    svg.appendChild(D.svg('polyline', { points: points, class: 'hud-spark-line', fill: 'none' }));
    svg.appendChild(D.svg('circle', { cx: xs[xs.length - 1], cy: ys[ys.length - 1], r: 2.2, class: 'hud-spark-dot' }));
    return svg;
  }

  /* Under 900px the chips collapse to icon-only; tapping one expands it to
     show its label too (js/hud.js keeps which ones are expanded — a plain
     CSS/media-query toggle can't remember per-chip state across renders).
     Above 900px the CSS never hides .chip-text, so this has no visible
     effect on desktop. */
  const expandedPromises = {};
  function togglePromiseChip(id) { expandedPromises[id] = !expandedPromises[id]; render(); }

  function promiseChips() {
    const wrap = D.h('div', { class: 'hud-promises', 'aria-label': 'Your promises' });
    const list = E.promiseStatus();
    if (!list.length) {
      wrap.appendChild(D.h('span', { class: 'chip' }, 'Choose your promises'));
      return wrap;
    }
    list.slice(0, 3).forEach(function (p) {
      const cls = p.status === 'On track' || p.status === 'Delivered' ? 'up'
                : p.status === 'Broken' ? 'down' : '';
      const expanded = !!expandedPromises[p.id];
      wrap.appendChild(D.h('button', {
        class: 'chip promise-chip' + (cls ? ' ' + cls : '') + (expanded ? ' expanded' : ''),
        type: 'button', title: p.status, 'aria-expanded': String(expanded),
        'aria-label': p.label + ' — ' + p.status,
        onClick: function () { togglePromiseChip(p.id); }
      },
        D.icon(p.icon),
        D.h('span', { class: 'chip-text', 'aria-hidden': 'true' }, ' ', p.label)));
    });
    return wrap;
  }

  function render() {
    if (!root) return;
    D.replace(root, turnBlock(), statsRow(), sparkline(), promiseChips());
  }

  /* Targeted update: just the one number, no rebuild. `from`, when given,
     counts the visible text up from there over ~400ms (js/run.js, watching
     the quarter happen); the data-value attribute — what assertSynced()
     checks — is always set to the true value immediately, only the on-screen
     digits lag behind while they animate. */
  function set(key, value, from) {
    const el = valueEls[key];
    if (!el) return;
    const to = Math.round(value);
    const holder = el.closest ? el.closest('.hud-stat') : null;
    if (holder) holder.setAttribute('data-value', String(to));
    if (from !== undefined && from !== null && Math.round(from) !== to) {
      D.tween(el, Math.round(from), to, function (v) { return statDisplay(key, v); }, 400);
    } else {
      el.textContent = statDisplay(key, to);
    }
  }

  function pulse(key, dir) {
    const el = valueEls[key];
    const holder = el && el.closest ? el.closest('.hud-stat') : null;
    if (holder) D.pulse(holder, dir === 'up' ? 'pulse-up' : dir === 'down' ? 'pulse-down' : 'pulse');
  }

  /* Called once, right after the promises picker locks in three: the HUD
     chips it just grew get the same gold ring every other landed change
     gets, so a player looks up and sees where their promises went. */
  function pulsePromises() {
    const el = root && root.querySelector('.hud-promises');
    if (el) D.pulse(el, 'pulse');
  }

  return { mount: mount, render: render, set: set, pulse: pulse, pulsePromises: pulsePromises };
})();
