/* The desk: what is waiting for an answer, what has already been answered
   this quarter, how much attention is left, and the button that ends it. */

window.YM = window.YM || {};
YM.desk = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus;

  const ACTIONS_TOTAL = 3;
  let root = null;
  let runBtn = null;

  function mount() {
    root = D.$('desk');
    B.subscribe(render);
  }

  function coinRow(used, total, label) {
    const row = D.h('span', { class: 'coins', 'aria-label': label });
    for (let i = 0; i < total; i++) {
      row.appendChild(D.h('span', { class: 'coin' + (i < used ? ' filled' : ''), 'aria-hidden': 'true', text: i < used ? '●' : '○' }));
    }
    return row;
  }

  function cardItem(entry) {
    const card = E.agendaCard(entry);
    if (!card) return null;
    if (entry.done) {
      return D.h('li', { class: 'desk-card done', 'data-event-id': entry.eventId },
        D.icon(card.icon, 'desk-card-icon'),
        D.h('div', { class: 'desk-card-body' },
          D.h('p', { class: 'desk-card-title', text: card.title }),
          D.h('p', { class: 'muted small', text: 'Chosen: ' + (entry.choiceText || '—') })));
    }
    return D.h('li', { class: 'desk-card' + (entry.urgent ? ' urgent' : '') },
      D.h('button', {
        class: 'desk-card-btn', type: 'button', 'data-event-id': entry.eventId,
        onClick: function () { YM.card.open(entry.eventId); }
      },
        D.icon(card.icon, 'desk-card-icon'),
        D.h('div', { class: 'desk-card-body' },
          D.h('p', { class: 'eyebrow', text: card.category + (entry.urgent ? ' · Urgent' : '') }),
          D.h('p', { class: 'desk-card-title', text: card.title }),
          card.promise ? D.h('span', { class: 'chip gold', text: 'Your promise' }) : null),
        coinRow(card.cost, ACTIONS_TOTAL, 'Costs ' + card.cost + ' of ' + ACTIONS_TOTAL + ' actions')));
  }

  function render() {
    if (!root) return;
    const s = E.state;
    const agenda = s.agenda.slice().sort(function (a, b) { return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0); });
    const list = D.h('ul', { class: 'desk-list' }, agenda.map(cardItem).filter(Boolean));
    const undone = agenda.filter(function (a) { return !a.done; }).length;

    runBtn = D.h('button', {
      id: 'run-btn', class: 'btn big block', type: 'button', disabled: !!s.bill,
      onClick: function () { YM.run.quarter(); }
    }, s.turn === E.TURNS ? 'Face the voters' : 'Run the quarter');

    D.replace(root,
      D.h('div', { class: 'panel-head' },
        D.h('h2', { text: 'Your desk' }),
        coinRow(ACTIONS_TOTAL - s.actionsLeft, ACTIONS_TOTAL, s.actionsLeft + ' of ' + ACTIONS_TOTAL + ' actions left')),
      agenda.length ? list : D.h('p', { class: 'muted', text: 'Nothing on the desk. Run the quarter to see what comes next.' }),
      D.h('div', { class: 'desk-run' },
        runBtn,
        D.h('p', { class: 'muted small', text: s.bill
          ? 'A bill is before the Commons. Settle it before you can run the quarter.'
          : (undone ? undone + ' item' + (undone === 1 ? '' : 's') + ' left unanswered will get worse.' : 'Everything on your desk has an answer.') })));

    setEnabled(!s.bill);
  }

  function setEnabled(enabled) {
    if (!root) return;
    root.classList.toggle('desk-disabled', !enabled);
    root.querySelectorAll('.desk-card-btn').forEach(function (btn) {
      btn.disabled = !enabled;
      btn.setAttribute('aria-disabled', String(!enabled));
    });
    if (runBtn) runBtn.disabled = !enabled;
  }

  return { mount: mount, render: render, setEnabled: setEnabled };
})();
