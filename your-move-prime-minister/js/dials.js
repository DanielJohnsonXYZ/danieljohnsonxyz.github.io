/* The six dials beneath the map: the human sentence for each indicator,
   a bar, and the arrow that says whether this quarter has moved it yet. */

window.YM = window.YM || {};
YM.dials = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  let root = null;
  const tileEls = {}, headlineEls = {}, fillEls = {}, trendEls = {}, barEls = {};

  function mount() {
    root = D.$('dials');
    B.subscribe(render);
  }

  function trendFor(key) {
    const hist = E.history();
    if (!hist.length) return 0;
    const prev = hist[hist.length - 1];
    const prevVal = prev.i[key];
    if (prevVal === undefined) return 0;
    return Math.round(E.state.indicators[key]) - Math.round(prevVal);
  }

  function trendText(delta) {
    if (!delta) return F.trendArrow(0);
    return F.trendArrow(delta) + ' ' + (delta > 0 ? '+' : '') + delta;
  }

  function setTrend(el, delta) {
    if (!el) return;
    el.className = 'dial-trend ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat');
    el.setAttribute('aria-label', 'Trend: ' + F.trendWord(delta) + (delta ? ' by ' + Math.abs(delta) : ''));
    el.textContent = trendText(delta);
  }

  function tile(key) {
    const r = E.readout(key);
    const delta = trendFor(key);
    const fill = D.h('span', { class: 'dial-bar-fill', style: { width: r.value + '%', background: F.fillFor(r.status) } });
    const headline = D.h('p', { class: 'dial-headline', text: r.headline });
    const trend = D.h('span', {
      class: 'dial-trend ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'),
      'aria-label': 'Trend: ' + F.trendWord(delta) + (delta ? ' by ' + Math.abs(delta) : ''),
      text: trendText(delta)
    });

    const bar = D.h('div', {
      class: 'dial-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100',
      'aria-valuenow': String(r.value), 'aria-valuetext': r.headline
    }, fill);

    const btn = D.h('button', {
      class: 'dial', type: 'button', 'data-key': key, 'data-value': String(r.value),
      onClick: function () { openDial(key); }
    },
      D.h('div', { class: 'dial-top' },
        D.icon(F.DIAL_ICON[key] || '•', 'dial-icon'),
        D.h('span', { class: 'dial-name', text: r.name }),
        trend),
      headline,
      bar,
      D.h('span', { class: 'dial-status muted small', text: r.status }));

    tileEls[key] = btn; headlineEls[key] = headline; fillEls[key] = fill; trendEls[key] = trend; barEls[key] = bar;
    return btn;
  }

  function render() {
    if (!root) return;
    const grid = D.h('div', { class: 'dial-grid', role: 'group', 'aria-label': 'How the country is doing: six indicators' });
    F.DIAL_KEYS.forEach(function (key) { grid.appendChild(tile(key)); });
    D.replace(root,
      D.h('div', { class: 'panel-head' }, D.h('h2', { text: 'How the country is doing' })),
      grid);
  }

  function setDial(key, value) {
    const r = E.readoutValue(key, value);
    const tileEl = tileEls[key];
    if (!tileEl) return;
    const previous = Number(tileEl.getAttribute('data-value'));
    const delta = Number.isFinite(previous) ? Math.round(r.value) - Math.round(previous) : 0;
    tileEl.setAttribute('data-value', String(r.value));
    if (headlineEls[key]) headlineEls[key].textContent = r.headline;
    if (fillEls[key]) { fillEls[key].style.width = r.value + '%'; fillEls[key].style.background = F.fillFor(r.status); }
    if (barEls[key]) { barEls[key].setAttribute('aria-valuenow', String(r.value)); barEls[key].setAttribute('aria-valuetext', r.headline); }
    setTrend(trendEls[key], delta);
  }

  function pulse(key, dir) {
    const el = tileEls[key];
    if (!el) return;
    D.pulse(el, dir === 'up' ? 'pulse-up' : dir === 'down' ? 'pulse-down' : 'pulse');
  }

  function openDial(key) {
    const r = E.readout(key);
    const hist = E.history().slice(-4);
    const body = [
      D.h('p', { class: 'dial-detail-headline serif', text: r.headline }),
      D.h('p', { class: 'muted', text: r.detail }),
      D.h('p', null, D.h('span', { class: 'chip', text: r.status })),
      D.h('h3', { text: 'The last few quarters' }),
      D.h('ul', { class: 'stat-list' }, hist.map(function (p, i) {
        const prev = i > 0 && hist[i - 1].i[key] !== undefined ? hist[i - 1].i[key] : null;
        const now = p.i[key] !== undefined ? p.i[key] : null;
        const delta = prev !== null && now !== null ? Math.round(now) - Math.round(prev) : 0;
        return D.h('li', null,
          D.h('span', {}, 'Turn ' + p.t),
          D.h('b', { text: (now !== null ? now : '—') + '/100' + (delta ? '  ' + trendText(delta) : '') }));
      }))
    ];
    B.open({ title: r.name, eyebrow: 'HOW BRITAIN IS DOING', body: body });
  }

  return { mount: mount, render: render, setDial: setDial, pulse: pulse, openDial: openDial };
})();
