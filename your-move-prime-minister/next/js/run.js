/* Running the quarter: end the turn, show what happened, then either open
   the next quarter or the election. Plain for now — no animation, just the
   report the engine already computed. */

window.YM = window.YM || {};
YM.run = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  function changeRow(c) {
    return D.h('span', { class: 'chip ' + (c.delta > 0 ? 'up' : 'down'), text: F.deltaChip(c) });
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
    return D.h('section', { class: 'score-block' }, D.h('h3', { text: 'What moved this quarter' }), row);
  }

  function maturedBlock(report) {
    if (!report.matured.length) return null;
    return D.h('section', { class: 'score-block' },
      D.h('h3', { text: 'Decisions you made earlier are landing' }),
      D.h('ul', { class: 'matured-list' }, report.matured.map(function (m) {
        const row = D.h('div', { class: 'change-chips' });
        (m.changes || []).forEach(function (c) { row.appendChild(changeRow(c)); });
        return D.h('li', null,
          D.h('p', null, D.h('b', { text: m.causeChoice || m.cause }), D.h('span', { text: ' → ' + m.text })),
          row);
      })));
  }

  function neglectedBlock(report) {
    if (!report.neglected.length) return null;
    return D.h('section', { class: 'score-block' },
      D.h('h3', { text: 'Left unattended' }),
      D.h('ul', { class: 'matured-list' }, report.neglected.map(function (n) {
        return D.h('li', null,
          D.h('p', null, D.h('b', { text: n.title }), D.h('span', { text: ' — ' + n.text })),
          D.h('span', { class: 'chip down', text: F.deltaChip(n.change) }));
      })));
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
    blocks.push(immediateBlock(report));
    blocks.push(maturedBlock(report));
    blocks.push(neglectedBlock(report));
    if (report.coming) {
      blocks.push(D.h('p', { class: 'coming', text: 'Coming: ' + report.coming.text + ' — in ' + report.coming.quarters + ' quarter' + (report.coming.quarters === 1 ? '' : 's') }));
    }
    blocks.push(D.h('button', {
      class: 'btn big block', type: 'button',
      onClick: function () { next(report); }
    }, 'Next quarter'));
    return blocks;
  }

  let handle = null;

  function scorecard(report) {
    B.setPhase('scorecard');
    handle = B.open({
      title: report.headline ? report.headline.headline : 'The quarter ends',
      eyebrow: F.when(report.turn), locked: true, body: buildBody(report)
    });
    handle.el.id = 'scorecard';
  }

  function next(report) {
    const h = handle; handle = null;
    if (h) h.close();
    if (report.final) {
      YM.election.show(report.final);
    } else {
      B.setPhase('desk');
      YM.desk.setEnabled(true);
      B.render();
    }
  }

  function quarter() {
    if (E.state.bill) return;
    const report = E.endTurn();
    scorecard(report);
  }

  return { quarter: quarter, scorecard: scorecard };
})();
