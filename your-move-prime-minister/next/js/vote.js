/* The Commons: having a majority is not the same as being able to do things.
   A whipped bill opens this overlay instead of resolving straight away, and
   nothing else on the desk is reachable until it is settled. */

window.YM = window.YM || {};
YM.vote = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus;

  let handle = null;
  let voteRegion = null;

  function bar(vs) {
    const pct = Math.max(0, Math.min(100, Math.round(vs.support / 650 * 100)));
    const needPct = Math.max(0, Math.min(100, vs.needed / 650 * 100));
    return D.h('div', { class: 'vote-bar' },
      D.h('span', { class: 'vote-bar-fill ' + (vs.likely === 'Likely to pass' ? 'up' : vs.likely === 'Likely to fail' ? 'down' : ''),
                    style: { width: pct + '%' } }),
      D.h('span', { class: 'vote-bar-need', style: { left: needPct + '%' }, 'aria-hidden': 'true' }));
  }

  function negotiateBtn(vs, kind, label, sub, blocked) {
    return D.h('button', {
      class: 'choice', type: 'button', disabled: blocked,
      onClick: function () { negotiate(kind); }
    },
      D.h('span', { class: 'choice-title', text: label }),
      D.h('span', { class: 'choice-sub', text: sub }));
  }

  function buildBody(vs, note) {
    const talkBlockedByActions = vs.canTalk && E.state.actionsLeft <= 0;
    return [
      D.h('p', { class: 'card-lede', text: 'Your own MPs decide whether this passes, not your majority on paper.' }),
      D.h('ul', { class: 'stat-list' },
        D.h('li', null, D.h('span', {}, 'Government MPs'), D.h('b', { text: String(vs.govSeats) })),
        D.h('li', null, D.h('span', {}, 'Expected to rebel'), D.h('b', { text: String(vs.rebels) })),
        D.h('li', { class: 'total' }, D.h('span', {}, 'Expected support'), D.h('b', { text: String(vs.support) })),
        D.h('li', null, D.h('span', {}, 'You need'), D.h('b', { text: String(vs.needed) }))),
      bar(vs),
      D.h('p', { class: 'vote-likely', text: vs.likely }),
      note ? D.h('p', { class: 'muted', role: 'status', text: note }) : null,
      D.h('h3', { text: 'Before the vote' }),
      D.h('div', { class: 'choices compact' },
        negotiateBtn(vs, 'concede', 'Make concessions', 'Fewer rebels, but a weaker bill', !vs.canConcede),
        negotiateBtn(vs, 'talk', 'Talk to the rebels', talkBlockedByActions ? 'No attention left' : 'Costs an action. Result uncertain', !vs.canTalk || talkBlockedByActions),
        negotiateBtn(vs, 'threaten', 'Threaten the whip', 'It might work. It might backfire badly', !vs.canThreaten)),
      D.h('div', { class: 'vote-actions' },
        D.h('button', { class: 'btn big block', type: 'button', onClick: hold }, 'Hold the vote'),
        D.h('button', { class: 'btn ghost block', type: 'button', onClick: abandon }, 'Abandon the bill'))
    ];
  }

  function open() {
    const vs = E.voteState();
    if (!vs) return;
    const b = E.state.bill;
    const entry = E.state.agenda.find(function (a) { return a.eventId === b.eventId; });
    const card = entry && E.agendaCard(entry);
    voteRegion = card ? card.region : null;
    B.setPhase('vote');
    YM.desk.setEnabled(false);
    handle = B.open({ title: vs.name, eyebrow: 'THE COMMONS', locked: true, body: buildBody(vs) });
  }

  function refresh(note) {
    if (!handle) return;
    const vs = E.voteState();
    if (!vs) return;
    handle.setBody(buildBody(vs, note));
  }

  function negotiate(kind) {
    const r = E.negotiate(kind);
    if (r && r.blocked === 'actions') { B.flash('No attention left this quarter'); return; }
    refresh(r && r.note);
    B.render();
  }

  function settle(result) {
    B.scene.lastOutcome = result;
    if (handle) handle.setBody(YM.card.outcomeStrip(result, function () {
      const h = handle; handle = null;
      if (h) h.close();
      B.setPhase('desk');
      YM.desk.setEnabled(true);
      B.render();
    }));
    YM.card.pulseChanges(result.changes, voteRegion);
    B.render();
  }

  function hold() { settle(E.holdVote()); }
  function abandon() { settle(E.abandonBill()); }

  return { open: open };
})();
