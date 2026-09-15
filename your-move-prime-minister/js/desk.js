/* The desk: what is waiting for an answer, what has already been answered
   this quarter, how much attention is left, and the button that advances time. */

window.YM = window.YM || {};
YM.desk = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus;

  const ACTIONS_TOTAL = 3;
  let root = null;
  let runBtn = null;
  let expanded = false;
  function toggleExpanded() { expanded = !expanded; render(); }

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
        D.h('span', { class: 'desk-card-cost', 'aria-label': 'Costs ' + card.cost + ' attention' },
          D.h('span', { class: 'desk-card-cost-num', text: String(card.cost) }),
          D.h('span', { class: 'desk-card-cost-label', text: 'attention' }))));
  }

  function leftBehindBlock(agenda, stage) {
    if (stage === 'first_card' || stage === 'promises') return null;
    const undone = agenda.filter(function (a) { return !a.done; });
    if (!undone.length) return null;
    const list = undone.slice(0, 4).map(function (entry) {
      const card = E.agendaCard(entry);
      if (!card) return null;
      return D.h('li', null,
        D.h('b', { text: card.title }),
        D.h('span', { text: entry.urgent ? ' — urgent' : '' }));
    }).filter(Boolean);
    if (!list.length) return null;
    return D.h('div', { class: 'score-block desk-left-behind' },
      D.h('p', { class: 'eyebrow', text: 'UNRESOLVED ISSUES' }),
      D.h('p', { class: 'small', text: 'These will worsen if you advance:' }),
      D.h('ul', { class: 'matured-list' }, list));
  }

  function maybeFirstFullQuarterCoach(s, stage, undone) {
    if (B.scene.overlays.length) return;
    const o = E.onboarding();
    const firstFullQuarter = stage === 'done' && E.history().length === 1;
    if (!firstFullQuarter) return;

    if (s.actionsLeft === ACTIONS_TOTAL && !o.seen.first_real_desk) {
      const first = root.querySelector('.desk-card:not(.done) .desk-card-btn');
      if (first) {
        YM.onboarding.coach('first_real_desk', first,
          'Start here. Your desk is where you govern. Open an issue, make a choice, then come back and decide what deserves the rest of your attention.');
      }
      return;
    }

    if (s.actionsLeft < ACTIONS_TOTAL) {
      const left = s.actionsLeft;
      YM.onboarding.coach('first_attention_after_choice', root.querySelector('.desk-attention'),
        'You have ' + left + ' Attention left this quarter. You do not need to clear the whole desk.');
      YM.onboarding.coach('first_advance_after_choice', runBtn,
        undone ? 'When you are ready, advance the quarter. The ' + undone + ' unresolved issue' + (undone === 1 ? '' : 's') + ' will worsen.'
               : 'When you are ready, advance the quarter and watch Britain respond.');
    }
  }

  function render() {
    if (!root) return;
    if (E.state.turn > E.TURNS) return;
    const s = E.state;
    const stage = E.onboarding().stage;
    const tutorialBlocked = stage === 'first_card' || stage === 'promises';
    const agenda = s.agenda.slice().sort(function (a, b) { return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0); });
    const items = agenda.map(cardItem).filter(Boolean);
    if (stage === 'promises') items.unshift(partyChairCard());
    const list = D.h('ul', { class: 'desk-list' }, items);
    const undone = agenda.filter(function (a) { return !a.done; }).length;

    const runLabel = stage === 'first_card' ? 'Deal with the NHS strike first'
      : stage === 'promises' ? 'Choose your promises first'
      : stage === 'first_run' ? 'Advance to your first full quarter'
      : s.turn === E.TURNS ? 'Face the voters'
      : 'Advance to next quarter';
    runBtn = D.h('button', {
      id: 'run-btn', class: 'btn big block' + (stage === 'first_run' ? ' glow' : ''), type: 'button',
      disabled: !!s.bill || tutorialBlocked,
      onClick: function () { YM.run.quarter(); }
    }, runLabel);

    const hint = s.bill ? 'A bill is before the Commons. Settle it before you can advance.'
      : stage === 'first_card' ? 'Required before the government can move on.'
      : stage === 'promises' ? 'Choose your promises first.'
      : stage === 'first_run' ? 'This starts your first full quarter of government.'
      : (undone ? undone + ' unresolved issue' + (undone === 1 ? '' : 's') + ' will worsen if you advance.' : 'Everything on your desk has an answer.');

    const handle = D.h('button', {
      class: 'desk-handle', type: 'button', 'aria-expanded': String(expanded),
      'aria-label': expanded ? 'Collapse your desk' : 'Expand your desk',
      onClick: toggleExpanded
    }, D.h('span', { class: 'desk-handle-bar', 'aria-hidden': 'true' }));
    const heading = D.h('button', {
      class: 'panel-head-btn', type: 'button', 'aria-expanded': String(expanded),
      onClick: toggleExpanded
    }, 'Your desk');
    const attention = D.h('div', { class: 'desk-attention' },
      D.h('span', { text: 'Attention' }),
      coinRow(ACTIONS_TOTAL - s.actionsLeft, ACTIONS_TOTAL, s.actionsLeft + ' of ' + ACTIONS_TOTAL + ' attention left'));

    D.replace(root,
      handle,
      D.h('div', { class: 'panel-head' }, heading, attention),
      D.h('div', { class: 'desk-scroll' },
        items.length ? list : D.h('p', { class: 'muted', text: 'Nothing on the desk. Advance the quarter to see what comes next.' })),
      D.h('div', { class: 'desk-run' }, leftBehindBlock(agenda, stage), runBtn, D.h('p', { class: 'muted small', text: hint })));

    root.classList.toggle('desk-expanded', expanded);
    setEnabled(!s.bill);

    if (stage === 'first_card') {
      const el = root.querySelector('.desk-card-btn');
      if (el) el.closest('.desk-card').classList.add('glow');
    } else if (stage === 'promises') {
      YM.onboarding.coach('promises_card', root.querySelector('.party-chair .desk-card-btn'),
        'Open this to choose your promises');
    } else if (stage === 'first_run') {
      YM.onboarding.coach('run_btn', runBtn,
        'Advance the quarter to begin your first full round of government.');
    }

    maybeFirstFullQuarterCoach(s, stage, undone);
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
