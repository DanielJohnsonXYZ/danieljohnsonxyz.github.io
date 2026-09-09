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

  function turnBlock() {
    const s = E.state;
    return D.h('div', { class: 'hud-when' },
      D.h('p', { class: 'hud-turn serif', text: F.when(s.turn) }),
      D.h('p', { class: 'hud-countdown muted', text: F.countdown(s.turn) }));
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
        D.h('span', { class: 'hud-stat-label', text: meta.name }),
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
      wrap.appendChild(D.h('span', { class: 'chip promise-chip' + (cls ? ' ' + cls : ''), title: p.status },
        D.icon(p.icon), ' ', p.label));
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

  return { mount: mount, render: render, set: set, pulse: pulse };
})();
