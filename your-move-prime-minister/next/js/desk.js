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

  /* Stage 'promises': not an engine event, so it is built here rather than
     coming from E.agendaCard — the desk's one way of saying "this is what
     the game needs from you next" when there is nothing real on the desk
     to point at yet. */
  function partyChairCard() {
    return D.h('li', { class: 'desk-card party-chair' },
      D.h('button', {
        class: 'desk-card-btn', type: 'button',
        onClick: function () { YM.onboarding.openPromisePicker(); }
      },
        D.icon('🗳', 'desk-card-icon'),
        D.h('div', { class: 'desk-card-body' },
          D.h('p', { class: 'eyebrow', text: 'Party HQ' }),
          D.h('p', { class: 'desk-card-title', text: 'THE PARTY CHAIR WANTS YOUR PROMISES' }),
          D.h('p', { class: 'muted small', text: '"The country needs to know what you stand for. Give me three."' }))));
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
    /* Once the term is over the desk has nothing left to offer — election
       night owns #desk from here (js/election.js), and re-rendering the
       normal desk UI over it would erase the results panel. */
    if (E.state.turn > E.TURNS) return;
    const s = E.state;
    const stage = E.onboarding().stage;
    const tutorialBlocked = stage === 'first_card' || stage === 'promises';
    const agenda = s.agenda.slice().sort(function (a, b) { return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0); });
    const items = agenda.map(cardItem).filter(Boolean);
    if (stage === 'promises') items.unshift(partyChairCard());
    const list = D.h('ul', { class: 'desk-list' }, items);
    const undone = agenda.filter(function (a) { return !a.done; }).length;

    const runLabel = stage === 'first_card' ? 'Answer the strike first'
      : stage === 'promises' ? 'Choose your promises first'
      : s.turn === E.TURNS ? 'Face the voters' : 'Run the quarter';
    runBtn = D.h('button', {
      id: 'run-btn', class: 'btn big block' + (stage === 'first_run' ? ' glow' : ''), type: 'button',
      disabled: !!s.bill || tutorialBlocked,
      onClick: function () { YM.run.quarter(); }
    }, runLabel);

    const hint = s.bill ? 'A bill is before the Commons. Settle it before you can run the quarter.'
      : stage === 'first_card' ? 'Answer the strike to begin'
      : stage === 'promises' ? 'Choose your promises first'
      : (undone ? undone + ' item' + (undone === 1 ? '' : 's') + ' left unanswered will get worse.' : 'Everything on your desk has an answer.');

    D.replace(root,
      D.h('div', { class: 'panel-head' },
        D.h('h2', { text: 'Your desk' }),
        coinRow(ACTIONS_TOTAL - s.actionsLeft, ACTIONS_TOTAL, s.actionsLeft + ' of ' + ACTIONS_TOTAL + ' actions left')),
      items.length ? list : D.h('p', { class: 'muted', text: 'Nothing on the desk. Run the quarter to see what comes next.' }),
      D.h('div', { class: 'desk-run' }, runBtn, D.h('p', { class: 'muted small', text: hint })));

    setEnabled(!s.bill);

    if (stage === 'first_card') {
      const el = root.querySelector('.desk-card-btn');
      if (el) el.closest('.desk-card').classList.add('glow');
    } else if (stage === 'promises') {
      YM.onboarding.coach('promises_card', root.querySelector('.party-chair .desk-card-btn'),
        'Open this to choose your promises');
    } else if (stage === 'first_run') {
      YM.onboarding.coach('run_btn', runBtn, 'Now run the quarter and watch Britain respond');
    }
  }

  function setEnabled(enabled) {
    if (!root) return;
    root.classList.toggle('desk-disabled', !enabled);
    root.querySelectorAll('.desk-card-btn').forEach(function (btn) {
      btn.disabled = !enabled;
      btn.setAttribute('aria-disabled', String(!enabled));
    });
    const stage = E.onboarding().stage;
    const tutorialBlocked = stage === 'first_card' || stage === 'promises';
    if (runBtn) runBtn.disabled = !enabled || tutorialBlocked;
  }

  return { mount: mount, render: render, setEnabled: setEnabled };
})();
