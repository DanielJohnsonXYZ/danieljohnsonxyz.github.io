/* The card overlay: one decision, its advisers, its brief, and its options.
   Choosing resolves in place — the same dialog becomes the outcome — so the
   country never disappears behind a screen change while a choice lands. */

window.YM = window.YM || {};
YM.card = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  const ACTIONS_TOTAL = 3;

  /* Maps the engine's change names (as returned by decide/holdVote/etc.) back
     to the six dial keys, so a resolved card can pulse the dials it moved. */
  const NAME_TO_DIAL = {
    NHS: 'health', Housing: 'housing', Economy: 'economy',
    Crime: 'crime', Energy: 'energy', Transport: 'transport'
  };

  let handle = null;
  let currentRegion = null;

  function coinChip(cost) {
    let glyphs = '';
    for (let i = 0; i < ACTIONS_TOTAL; i++) glyphs += (i < cost ? '●' : '○');
    return D.h('span', { class: 'chip gold', 'aria-label': 'Costs ' + cost + ' of ' + ACTIONS_TOTAL + ' actions' }, D.icon(glyphs));
  }

  function adviserBlock(a, second) {
    return D.h('div', { class: 'adviser' + (second ? ' second' : '') },
      D.icon(a.avatar || '•', 'avatar'),
      D.h('div', { class: 'adviser-text' },
        D.h('p', { class: 'adviser-name', text: a.name }),
        D.h('p', { text: a.text })));
  }

  function briefingBody(brief) {
    return D.h('div', { class: 'card-briefing' },
      D.h('h3', { text: 'What is actually going on' }), D.h('p', { text: brief.explainer }),
      D.h('h3', { text: 'What you control' }), D.h('p', { text: brief.control }),
      D.h('h3', { text: 'Who wants what' }),
      D.h('ul', { class: 'sign-list' }, brief.stakeholders.map(function (st) {
        return D.h('li', null, D.icon(st[2]), D.h('b', { text: st[0] }), D.h('span', { text: st[1] }));
      })));
  }

  function choiceButton(card, entry, c) {
    const chips = D.h('div', { class: 'choice-chips' });
    c.preview.forEach(function (p) {
      chips.appendChild(D.h('span', { class: 'chip on-cream ' + (p.positive ? 'up' : 'down') },
        F.statName(p.name) + ' ' + p.range));
    });
    if (c.delayed) chips.appendChild(D.h('span', { class: 'chip on-cream', text: 'Takes time' }));
    chips.appendChild(coinChip(entry.cost));

    return D.h('button', {
      class: 'choice' + (c.affordable === false ? ' unaffordable' : ''), type: 'button',
      'data-affordable': c.affordable === false ? 'false' : 'true',
      'aria-disabled': c.affordable === false ? 'true' : null,
      onClick: function () { choose(card.id, c.index); }
    },
      D.h('span', { class: 'choice-title', text: c.text }),
      D.h('span', { class: 'choice-sub', text: c.affordable === false ? 'You cannot borrow this much' : c.subtitle }),
      chips);
  }

  function buildBody(card, entry) {
    const explainBody = briefingBody(card.briefing);
    explainBody.hidden = true;
    const explainBtn = D.h('button', {
      class: 'btn secondary explain-toggle', type: 'button', 'aria-expanded': 'false'
    }, 'Explain this');
    explainBtn.addEventListener('click', function () {
      const willOpen = explainBody.hidden;
      explainBody.hidden = !willOpen;
      explainBtn.setAttribute('aria-expanded', String(willOpen));
    });

    const choices = D.h('div', { class: 'choices' });
    card.choices.forEach(function (c) { choices.appendChild(choiceButton(card, entry, c)); });

    return [
      D.h('p', { class: 'card-lede', text: card.text }),
      adviserBlock(card.adviser, false),
      card.secondOpinion ? adviserBlock(card.secondOpinion, true) : null,
      explainBtn, explainBody,
      D.h('h3', { text: 'What do you do?' }),
      choices
    ];
  }

  function open(eventId) {
    const entry = E.state.agenda.find(function (a) { return a.eventId === eventId; });
    const card = entry && !entry.done ? E.agendaCard(entry) : null;
    if (!entry || !card) { B.flash('That decision is no longer on your desk.'); B.render(); return; }
    currentRegion = card.region;
    handle = B.open({
      title: card.title,
      eyebrow: card.category + (entry.urgent ? ' · Urgent' : ''),
      body: buildBody(card, entry)
    });
  }

  /* Shared by card.js and vote.js: the same strip replaces whichever overlay
     resolved, so a decision and a vote outcome read identically. */
  function outcomeStrip(result, onBack) {
    const strip = D.h('div', { class: 'outcome-strip' },
      D.h('h3', { class: 'serif', text: result.headline }),
      result.deck ? D.h('p', { text: result.deck }) : null,
      result.voteOutcome ? D.h('p', { class: 'muted', text: result.voteOutcome.note }) : null);

    if (result.changes && result.changes.length) {
      const row = D.h('div', { class: 'change-chips' });
      result.changes.forEach(function (c) {
        row.appendChild(D.h('span', { class: 'chip ' + (c.delta > 0 ? 'up' : 'down'), text: F.deltaChip(c) }));
      });
      strip.appendChild(row);
    }
    if (result.delayed) strip.appendChild(D.h('p', { class: 'muted small', text: 'Takes time: ' + result.delayed }));
    strip.appendChild(D.h('button', { class: 'btn big block', type: 'button', onClick: onBack }, 'Back to the desk'));
    return strip;
  }

  function pulseChanges(changes, region) {
    if (region) YM.map.pulse(region);
    (changes || []).forEach(function (c) {
      const key = NAME_TO_DIAL[c.name];
      if (key) YM.dials.pulse(key, c.delta > 0 ? 'up' : (c.delta < 0 ? 'down' : null));
    });
  }

  function choose(eventId, choiceIndex) {
    const result = E.decide(eventId, choiceIndex);
    if (!result) {
      B.flash('That decision is no longer available.');
      if (handle) { const h = handle; handle = null; h.close(); }
      B.render();
      return;
    }
    if (result.blocked === 'vote') { B.flash('Answer this first: a bill is in the Commons'); return; }
    if (result.blocked === 'actions') { B.flash('No attention left this quarter'); return; }
    if (result.blocked === 'money') { B.flash('You cannot borrow this much'); return; }
    if (result.vote) {
      const h = handle; handle = null;
      if (h) h.close();
      YM.vote.open();
      return;
    }
    B.scene.lastOutcome = result;
    const region = currentRegion;
    if (handle) handle.setBody(outcomeStrip(result, function () {
      const h = handle; handle = null;
      if (h) h.close();
      B.render();
    }));
    pulseChanges(result.changes, region);
    B.render();
  }

  return { open: open, choose: choose, outcomeStrip: outcomeStrip, pulseChanges: pulseChanges };
})();
