/* Election night: a stub for now — M5 replaces it — but it still has to
   answer "did I win", region by region, and let the player go again. */

window.YM = window.YM || {};
YM.election = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  function regionRow(name, final) {
    const row = final.seatsByRegion[name];
    return D.h('li', { class: 'election-row' },
      D.h('span', { class: 'election-row-name', text: name }),
      D.h('span', { class: 'election-row-seats', text: row.won + ' / ' + row.seats + ' seats' }),
      D.h('span', { class: 'chip ' + (row.held ? 'up' : 'down'), text: row.held ? 'Held' : 'Lost' }),
      D.h('span', { class: 'muted small', text: row.reason }));
  }

  function promiseRow(p) {
    return D.h('li', { class: 'promise-row' },
      D.icon(p.icon), D.h('span', { text: p.label }), D.h('span', { class: 'chip', text: p.status }));
  }

  function playAgain() {
    E.clearSave();
    E.reset();
    const h = handle; handle = null;
    if (h) h.close();
    B.setPhase('title');
    YM.onboarding.title();
  }

  let handle = null;

  function show(final) {
    B.setPhase('verdict');
    const body = [
      D.h('p', { class: 'election-verdict serif', text: (final.won ? 'You held the country. ' : 'You lost the country. ') + final.seats + ' of 650 seats.' }),
      D.h('p', { class: 'chip gold', text: final.legacy }),
      D.h('h3', { text: 'How it broke down' }),
      D.h('ul', { class: 'election-rows' }, final.regionOrder.map(function (name) { return regionRow(name, final); })),
      D.h('h3', { text: 'What you promised' }),
      D.h('ul', { class: 'promise-track' }, final.promises.map(promiseRow)),
      D.h('button', { class: 'btn big block', type: 'button', onClick: playAgain }, 'Play again')
    ];
    handle = B.open({
      title: final.won ? 'You held on' : 'You lost the country',
      eyebrow: 'THE RESULT · ' + final.delivered + '/' + final.total + ' PROMISES KEPT',
      wide: true, locked: true, body: body
    });
    handle.el.id = 'election';
  }

  return { show: show };
})();
