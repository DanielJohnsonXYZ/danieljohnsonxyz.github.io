/* The six dials beneath the map: the human sentence for each indicator,
   a bar, and the arrow that says whether this quarter has moved it yet. */

window.YM = window.YM || {};
YM.dials = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  let root = null;
  const tileEls = {}, headlineEls = {}, fillEls = {}, trendEls = {};

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

  function tile(key) {
    const r = E.readout(key);
    const delta = trendFor(key);
    const fill = D.h('span', { class: 'dial-bar-fill', style: { width: r.value + '%', background: F.fillFor(r.status) } });
    const headline = D.h('p', { class: 'dial-headline', text: r.headline });
    const trend = D.h('span', {
      class: 'dial-trend ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'),
      'aria-label': 'Trend: ' + F.trendWord(delta) + (delta ? ' by ' + Math.abs(delta) : '')
    }, D.icon(F.trendArrow(delta)));

    const btn = D.h('button', {
      class: 'dial', type: 'button', 'data-key': key, 'data-value': String(r.value),
      onClick: function () { openDial(key); }
    },
      D.h('div', { class: 'dial-top' },
        D.icon(F.DIAL_ICON[key] || '•', 'dial-icon'),
        D.h('span', { class: 'dial-name', text: r.name }),
        trend),
      headline,
      D.h('div', { class: 'dial-bar' }, fill),
      D.h('span', { class: 'dial-status muted small', text: r.status }));

    tileEls[key] = btn; headlineEls[key] = headline; fillEls[key] = fill; trendEls[key] = trend;
    return btn;
  }

  function render() {
    if (!root) return;
    const grid = D.h('div', { class: 'dial-grid' });
    F.DIAL_KEYS.forEach(function (key) { grid.appendChild(tile(key)); });
    D.replace(root,
      D.h('div', { class: 'panel-head' }, D.h('h2', { text: 'How the country is doing' })),
      grid);
  }

  function setDial(key, value) {
    const r = E.readoutValue(key, value);
    const tileEl = tileEls[key];
    if (!tileEl) return;
    tileEl.setAttribute('data-value', String(r.value));
    if (headlineEls[key]) headlineEls[key].textContent = r.headline;
    if (fillEls[key]) { fillEls[key].style.width = r.value + '%'; fillEls[key].style.background = F.fillFor(r.status); }
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
      D.h('ul', { class: 'stat-list' }, hist.map(function (p) {
        return D.h('li', null, D.h('span', {}, 'Turn ' + p.t), D.h('b', { text: (p.i[key] !== undefined ? p.i[key] : '—') + '/100' }));
      }))
    ];
    B.open({ title: r.name, eyebrow: 'HOW BRITAIN IS DOING', body: body });
  }

  return { mount: mount, render: render, setDial: setDial, pulse: pulse, openDial: openDial };
})();
