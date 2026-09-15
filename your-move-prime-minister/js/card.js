/* The card overlay keeps decisions quick to scan. A player sees the problem,
   the options and their likely trade-offs first. Deeper briefing detail is
   available on demand. The result then clearly separates now from later. */

window.YM = window.YM || {};
YM.card = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  const ACTIONS_TOTAL = 3;
  const NAME_TO_DIAL = {
    NHS: 'health', Housing: 'housing', Economy: 'economy',
    Crime: 'crime', Energy: 'energy', Transport: 'transport'
  };

  let handle = null;
  let currentRegion = null;

  function coinChip(cost) {
    let glyphs = '';
    for (let i = 0; i < ACTIONS_TOTAL; i++) glyphs += (i < cost ? '●' : '○');
    return D.h('span', {
      class: 'chip gold attention-chip',
      'aria-label': 'Costs ' + cost + ' of ' + ACTIONS_TOTAL + ' attention this quarter'
    },
      D.icon(glyphs, 'attention-dots'),
      D.h('span', { class: 'attention-label', text: cost + ' attention' }));
  }

  function adviserBlock(a, second) {
    return D.h('div', { class: 'adviser' + (second ? ' second' : '') },
      D.icon(a.avatar || '•', 'avatar'),
      D.h('div', { class: 'adviser-text' },
        D.h('p', { class: 'adviser-name', text: a.name }),
        D.h('p', { text: a.text })));
  }

  function briefingBody(card) {
    return D.h('div', { class: 'card-briefing' },
      D.h('h3', { text: 'What is really going on' }), D.h('p', { text: card.briefing.explainer }),
      D.h('h3', { text: 'What you control' }), D.h('p', { text: card.briefing.control }),
      card.secondOpinion ? D.h('h3', { text: 'Another view' }) : null,
      card.secondOpinion ? adviserBlock(card.secondOpinion, true) : null,
      D.h('h3', { text: 'Who is affected' }),
      D.h('ul', { class: 'sign-list' }, card.briefing.stakeholders.map(function (st) {
        return D.h('li', null, D.icon(st[2]), D.h('b', { text: st[0] }), D.h('span', { text: st[1] }));
      })));
  }

  function choiceButton(card, entry, c) {
    const chips = D.h('div', { class: 'choice-chips' });
    c.preview.forEach(function (p) {
      chips.appendChild(D.h('span', { class: 'chip on-cream ' + (p.positive ? 'up' : 'down') },
        (p.positive ? '↑ ' : '↓ ') + F.statName(p.name) + ' ' + p.range));
    });
    if (c.delayed) chips.appendChild(D.h('span', { class: 'chip on-cream', text: 'Later effect' }));
    chips.appendChild(coinChip(entry.cost));

    return D.h('button', {
      class: 'choice' + (c.affordable === false ? ' unaffordable' : ''), type: 'button',
      'data-affordable': c.affordable === false ? 'false' : 'true',
      'aria-disabled': c.affordable === false ? 'true' : null,
      onClick: function () { choose(card.id, c.index); }
    },
      D.h('span', { class: 'choice-title', text: c.text }),
      D.h('span', { class: 'choice-sub', text: c.affordable === false ? 'You cannot afford this choice' : c.subtitle }),
      chips);
  }

  function buildBody(card, entry) {
    const explainBody = briefingBody(card);
    explainBody.hidden = true;
    const explainBtn = D.h('button', {
      class: 'btn secondary explain-toggle', type: 'button', 'aria-expanded': 'false'
    }, 'Need more context?');
    explainBtn.addEventListener('click', function () {
      const willOpen = explainBody.hidden;
      explainBody.hidden = !willOpen;
      explainBtn.setAttribute('aria-expanded', String(willOpen));
      explainBtn.textContent = willOpen ? 'Hide extra context' : 'Need more context?';
    });

    const choices = D.h('div', { class: 'choices decision-choices' });
    card.choices.forEach(function (c) { choices.appendChild(choiceButton(card, entry, c)); });

    return [
      D.h('p', { class: 'card-lede', text: card.text }),
      D.h('div', { class: 'adviser-quick' }, adviserBlock(card.adviser, false)),
      D.h('h3', { class: 'decision-question', text: 'What do you do?' }),
      choices,
      explainBtn, explainBody
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
    if (E.onboarding().stage === 'first_card') tutorialCoach(card);
  }

  function tutorialCoach(card) {
    const O = YM.onboarding;
    O.coach('chips', document.querySelector('[role=dialog] .choice-chips'),
      'Arrows show the likely direction. Attention is how much of this quarter the choice uses.');
    O.coach('coins', document.querySelector('[role=dialog] .attention-chip'),
      'You get three Attention each quarter. Bigger decisions use more of it.');
    if (card.region) {
      O.coach('pin', document.querySelector('.region[data-region="' + card.region + '"] .map-pin'),
        'This issue has a regional home. Watch the map after you act.');
    }
  }

  function changeImpact(c) {
    const positive = c.delta > 0;
    return D.h('div', { class: 'outcome-impact ' + (positive ? 'up' : 'down') },
      D.h('span', { class: 'outcome-impact-arrow', text: positive ? '↑' : '↓' }),
      D.h('span', { class: 'outcome-impact-value', text: F.deltaChip(c) }));
  }

  function outcomeStrip(result, onBack, choiceText) {
    const strip = D.h('div', { class: 'outcome-strip friendly-outcome' },
      D.h('p', { class: 'eyebrow', text: 'DECISION MADE' }),
      choiceText ? D.h('p', { class: 'outcome-choice serif', text: 'You chose: ' + choiceText }) : null,
      D.h('h3', { class: 'serif outcome-headline', text: result.headline }),
      result.deck ? D.h('p', { text: result.deck }) : null,
      result.voteOutcome ? D.h('p', { class: 'muted', text: result.voteOutcome.note }) : null);

    if (result.changes && result.changes.length) {
      const impacts = D.h('div', { class: 'outcome-impacts' });
      result.changes.forEach(function (c) { impacts.appendChild(changeImpact(c)); });
      strip.appendChild(D.h('div', { class: 'outcome-now' },
        D.h('p', { class: 'eyebrow', text: 'WHAT CHANGES NOW' }), impacts));
    } else {
      strip.appendChild(D.h('p', { class: 'muted small', text: 'Nothing moves immediately. The political effect may come later.' }));
    }

    if (result.delayed) {
      strip.appendChild(D.h('div', { class: 'outcome-later' },
        D.h('p', { class: 'eyebrow', text: 'WHAT HAPPENS LATER' }),
        D.h('p', { text: result.delayed })));
    }

    strip.appendChild(D.h('button', { class: 'btn big block', type: 'button', onClick: onBack }, 'Back to Britain'));
    return strip;
  }

  function pulseChanges(changes, region) {
    if (region) YM.map.pulse(region);
    (changes || []).forEach(function (c) {
      const dir = c.delta > 0 ? 'up' : (c.delta < 0 ? 'down' : null);
      if (c.key === 'approval' || c.key === 'headroom' || c.key === 'party' || c.key === 'confidence') {
        YM.hud.pulse(c.key, dir);
        return;
      }
      if (c.key && c.key.slice(0, 7) === 'region:') {
        YM.map.pulse(c.key.slice(7), dir);
        return;
      }
      const key = (c.key && F.DIAL_KEYS.indexOf(c.key) >= 0) ? c.key : NAME_TO_DIAL[c.name];
      if (key) YM.dials.pulse(key, dir);
    });
  }

  function choose(eventId, choiceIndex) {
    const entry = E.state.agenda.find(function (a) { return a.eventId === eventId; });
    const cardBefore = entry ? E.agendaCard(entry) : null;
    const picked = cardBefore && cardBefore.choices ? cardBefore.choices.find(function (c) { return c.index === choiceIndex; }) : null;
    const result = E.decide(eventId, choiceIndex);
    if (!result) {
      B.flash('That decision is no longer available.');
      if (handle) { const h = handle; handle = null; h.close(); }
      B.render();
      return;
    }
    if (result.blocked === 'vote') { B.flash('Answer this first: a bill is in the Commons'); return; }
    if (result.blocked === 'actions') { B.flash('No Attention left this quarter'); return; }
    if (result.blocked === 'money') { B.flash('You cannot afford this choice'); return; }
    if (result.vote) {
      const h = handle; handle = null;
      if (h) h.close();
      YM.vote.open();
      return;
    }
    B.scene.lastOutcome = result;
    const region = currentRegion;
    if (E.onboarding().stage === 'first_card') E.setOnboardingStage('promises');
    if (handle) handle.setBody(outcomeStrip(result, function () {
      const h = handle; handle = null;
      if (h) h.close();
      B.render();
      window.setTimeout(function () { pulseChanges(result.changes, region); }, 20);
    }, picked ? picked.text : null));
    B.render();
  }

  return { open: open, choose: choose, outcomeStrip: outcomeStrip, pulseChanges: pulseChanges };
})();
