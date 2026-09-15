/* The HUD: the strip across the top of the scene. Always visible outside the
   title screen, and always the same four numbers no matter what overlay is
   open on top of it — a player glances up, not away, to see how they stand. */

window.YM = window.YM || {};
YM.hud = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  const STAT_KEYS = ['approval', 'headroom', 'party', 'confidence'];
  let root = null;
  const valueEls = {}, trendEls = {};

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
  function pointValue(p, key) {
    if (!p) return null;
    if (key === 'approval') return p.a;
    if (key === 'headroom') return p.h;
    if (key === 'party') return p.p;
    if (key === 'confidence') return p.c;
    return null;
  }
  function statTrend(key, current) {
    const hist = E.history();
    if (hist.length < 2) return 0;
    const prev = pointValue(hist[hist.length - 2], key);
    if (prev === null || prev === undefined) return 0;
    return Math.round(current) - Math.round(prev);
  }
  function setStatTrend(el, key, delta) {
    if (!el) return;
    el.className = 'hud-stat-trend ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat');
    el.textContent = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
    const amount = key === 'headroom' ? '£' + Math.abs(delta) + 'bn' : Math.abs(delta) + ' points';
    el.setAttribute('aria-label', delta > 0 ? 'Up ' + amount + ' since last quarter' : delta < 0 ? 'Down ' + amount + ' since last quarter' : 'Unchanged since last quarter');
  }

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
      const trendEl = D.h('span', { class: 'hud-stat-trend flat', 'aria-hidden': 'false', text: '→' });
      setStatTrend(trendEl, key, statTrend(key, v));
      valueEls[key] = valueEl;
      trendEls[key] = trendEl;
      row.appendChild(D.h('div', {
        class: 'hud-stat', 'data-stat': key, 'data-value': String(v), title: meta.help
      },
        D.h('span', { class: 'hud-stat-label hud-stat-label-full', text: meta.name }),
        D.h('span', { class: 'hud-stat-label hud-stat-label-short', text: meta.short }),
        D.h('span', { class: 'hud-stat-reading' }, valueEl, trendEl)));
    });
    return row;
  }

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

  function targetFor(id) {
    if (!E.promiseTargets) return null;
    const targets = E.promiseTargets() || [];
    return targets.find(function (t) { return t.id === id; }) || null;
  }

  function displayTargetValue(v) {
    if (v === undefined || v === null) return '—';
    if (typeof v === 'object') {
      if (v.headline) return v.headline;
      if (v.text) return v.text;
      if (v.value !== undefined) return String(v.value);
    }
    return String(v);
  }

  function openPromise(p) {
    const t = targetFor(p.id);
    const statusClass = p.status === 'On track' || p.status === 'Delivered' ? 'up'
      : p.status === 'Broken' ? 'down' : '';
    const body = [
      D.h('p', null, D.h('span', { class: 'chip ' + statusClass, text: p.status })),
      D.h('p', { class: 'muted', text: 'This is one of the promises voters will judge you on at the election.' })
    ];
    if (t) {
      body.push(D.h('ul', { class: 'stat-list' },
        D.h('li', null, D.h('span', {}, 'Now'), D.h('b', { text: displayTargetValue(t.current) })),
        D.h('li', null, D.h('span', {}, 'Election target'), D.h('b', { text: displayTargetValue(t.target) })),
        t.region ? D.h('li', null, D.h('span', {}, 'Most visible in'), D.h('b', { text: t.region })) : null));
    }
    body.push(D.h('h3', { text: 'How to think about it' }));
    body.push(D.h('p', { text: 'Use the desk, the relevant country dial and the regional map together. Policies can improve the underlying measure immediately or take several quarters to land, so watch the trend as well as the current status.' }));
    B.open({ title: p.label, eyebrow: 'YOUR PROMISE', body: body.filter(Boolean) });
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
      wrap.appendChild(D.h('button', {
        class: 'chip promise-chip' + (cls ? ' ' + cls : ''),
        type: 'button', title: 'Open promise progress',
        'aria-label': p.label + ' — ' + p.status + '. Open progress.',
        onClick: function () { openPromise(p); }
      },
        D.icon(p.icon),
        D.h('span', { class: 'chip-text' }, ' ', p.label),
        D.h('span', { class: 'visually-hidden', text: ' — ' + p.status })));
    });
    return wrap;
  }

  function render() {
    if (!root) return;
    D.replace(root, turnBlock(), statsRow(), sparkline(), promiseChips());
  }

  function set(key, value, from) {
    const el = valueEls[key];
    if (!el) return;
    const to = Math.round(value);
    const holder = el.closest ? el.closest('.hud-stat') : null;
    if (holder) holder.setAttribute('data-value', String(to));
    if (from !== undefined && from !== null && Math.round(from) !== to) {
      D.tween(el, Math.round(from), to, function (v) { return statDisplay(key, v); }, 400);
      setStatTrend(trendEls[key], key, to - Math.round(from));
    } else {
      el.textContent = statDisplay(key, to);
      setStatTrend(trendEls[key], key, statTrend(key, to));
    }
  }

  function pulse(key, dir) {
    const el = valueEls[key];
    const holder = el && el.closest ? el.closest('.hud-stat') : null;
    if (holder) D.pulse(holder, dir === 'up' ? 'pulse-up' : dir === 'down' ? 'pulse-down' : 'pulse');
  }

  function pulsePromises() {
    const el = root && root.querySelector('.hud-promises');
    if (el) D.pulse(el, 'pulse');
  }

  return { mount: mount, render: render, set: set, pulse: pulse, pulsePromises: pulsePromises };
})();
