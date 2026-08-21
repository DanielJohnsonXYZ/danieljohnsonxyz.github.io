/* Interface.

   One screen answers one question. The briefing answers "what needs me?", the
   decision screen answers "what will I do?", and the consequences screen answers
   "what happened because of it?". The original tried to answer all three at once
   on a dashboard with four tabs, six regions, four pressure gauges and two
   different end-month buttons.

   Nothing here is built with innerHTML. Every string goes in through textContent,
   which is why a player can safely write their own manifesto promise. */

window.UI = (function () {
  'use strict';

  const E = window.Engine;

  /* ------------------------------------------------------------ DOM helpers */

  function h(tag, props) {
    const el = document.createElement(tag);
    /* props is optional: h('span', 'text') passes a child, not attributes. */
    const isProps = props && typeof props === 'object' && !Array.isArray(props) && !props.nodeType;
    const firstChild = isProps ? 2 : 1;
    if (isProps) {
      Object.keys(props).forEach(k => {
        const v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      });
    }
    for (let i = firstChild; i < arguments.length; i++) {
      const kid = arguments[i];
      if (kid === null || kid === undefined || kid === false) continue;
      if (Array.isArray(kid)) kid.forEach(k => k && el.appendChild(node(k)));
      else el.appendChild(node(kid));
    }
    return el;
  }
  function node(x) { return typeof x === 'object' ? x : document.createTextNode(String(x)); }

  const SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, props) {
    const el = document.createElementNS(SVGNS, tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        const val = props[k];
        if (val === null || val === undefined || val === false) return;
        if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), val);
        else el.setAttribute(k, String(val));
      });
    }
    for (let i = 2; i < arguments.length; i++) {
      const kid = arguments[i];
      if (kid === null || kid === undefined || kid === false) continue;
      if (Array.isArray(kid)) kid.forEach(function (x) { x && el.appendChild(x); });
      else el.appendChild(typeof kid === 'object' ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  function $(id) { return document.getElementById(id); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  /* Decorative glyphs are hidden from screen readers: "flag of the United
     Kingdom Britain" is not a useful thing to hear. */
  function icon(ch) { return h('span', { class: 'icon', 'aria-hidden': 'true', text: ch }); }

  const VIEWS = ['title', 'manifesto', 'briefing', 'decision', 'vote', 'consequences', 'britain', 'government', 'end'];
  let currentView = 'title';
  let busy = false;              // guards double-clicks through a turn transition

  function announce(msg) { $('liveStatus').textContent = msg; }

  /* Focus moves to the new screen so keyboard and screen-reader users are told
     where they are. The old build left focus on a button it had just hidden. */
  let firstRender = true;
  function show(name) {
    VIEWS.forEach(v => { $('view-' + v).hidden = (v !== name); });
    currentView = name;
    const el = $('view-' + name);
    /* On the very first paint, leave focus at the top of the document so the
       skip link is still the first thing a keyboard user reaches. Every later
       screen change moves focus, because otherwise it lands on nothing. */
    if (firstRender) firstRender = false;
    else el.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    syncChrome();
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Header stats and navigation reflect where the player is and what they have
     unlocked so far. */
  function syncChrome() {
    const s = E.state;
    const playing = ['briefing', 'decision', 'vote', 'consequences', 'britain', 'government'].indexOf(currentView) >= 0;
    $('stats').hidden = !playing;
    $('tabs').hidden = !playing;
    if (playing) {
      $('statApproval').textContent = Math.round(s.approval) + '%';
      $('statMoney').textContent = E.money(s.headroom);
      $('statParty').textContent = Math.round(s.party) + '%';
      $('statMoney').classList.toggle('negative', s.headroom < 0);
    }
    const tabs = $('tabs').querySelectorAll('.tab');
    tabs.forEach(t => {
      const v = t.getAttribute('data-view');
      if (v === 'britain') t.hidden = !s.unlocked.britain;
      if (v === 'government') t.hidden = !s.unlocked.government;
      const active = (v === currentView) || (v === 'briefing' && ['decision', 'vote', 'consequences'].indexOf(currentView) >= 0);
      if (active) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
      t.classList.toggle('active', active);
    });
  }

  /* --------------------------------------------------------------- dialogs */

  /* A real dialog: labelled, focus-trapped, Escape closes it, and focus returns
     to whatever opened it. */
  let lastFocused = null;
  function openDialog(title, bodyNodes) {
    lastFocused = document.activeElement;
    const layer = $('dialogLayer');
    clear(layer);
    const closeBtn = h('button', { type: 'button', class: 'dialog-close', 'aria-label': 'Close', onclick: closeDialog }, '×');
    const panel = h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'dialog-head' }, h('h2', { class: 'dialog-title', text: title }), closeBtn),
      h('div', { class: 'dialog-body' }, bodyNodes));
    layer.appendChild(h('div', { class: 'dialog-backdrop', onclick: closeDialog }));
    layer.appendChild(panel);
    layer.hidden = false;
    layer.addEventListener('keydown', trap);
    closeBtn.focus();
  }
  function closeDialog() {
    const layer = $('dialogLayer');
    layer.hidden = true;
    layer.removeEventListener('keydown', trap);
    clear(layer);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function trap(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
    if (e.key !== 'Tab') return;
    const f = $('dialogLayer').querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function confirmDialog(title, message, confirmLabel, onConfirm) {
    openDialog(title, [
      h('p', { text: message }),
      h('div', { class: 'dialog-actions' },
        h('button', { type: 'button', class: 'btn ghost', onclick: closeDialog }, 'Cancel'),
        h('button', { type: 'button', class: 'btn danger', onclick: function () { closeDialog(); onConfirm(); } }, confirmLabel))
    ]);
  }

  /* ------------------------------------------------------------- fragments */

  function when(turn) {
    const year = Math.ceil(turn / 4);
    const month = ['March', 'June', 'September', 'December'][(turn - 1) % 4];
    return month + ', Year ' + year;
  }

  function actionPips(left, total) {
    const wrap = h('span', { class: 'pips', role: 'img',
      'aria-label': left + ' of ' + total + ' actions left this quarter' });
    for (let i = 0; i < total; i++) {
      wrap.appendChild(h('span', { class: 'pip' + (i < left ? ' on' : ''), 'aria-hidden': 'true' }, i < left ? '●' : '○'));
    }
    return wrap;
  }

  /* Status is never carried by colour alone — the word is always there too. */
  function statusChip(text) {
    const key = text.toLowerCase().replace(/\s+/g, '-');
    return h('span', { class: 'chip chip-' + key, text: text });
  }

  function deltaText(c) {
    const sign = c.delta > 0 ? '+' : '';
    const unit = c.unit === 'bn' ? 'bn' : (c.unit || '');
    if (c.unit === 'bn') return c.name + ' ' + E.money(c.from) + ' → ' + E.money(c.to);
    return c.name + ' ' + c.from + unit + ' → ' + c.to + unit + ' (' + sign + c.delta + ')';
  }

  /* ---------------------------------------------------------------- title */

  function renderTitle() {
    const v = $('view-title');
    clear(v);
    const canResume = E.hasSave();
    v.appendChild(h('div', { class: 'title-stage' },
      h('div', { class: 'seal', 'aria-hidden': 'true' }, '♛'),
      h('p', { class: 'eyebrow', text: 'RUN THE COUNTRY. LIVE WITH THE CONSEQUENCES.' }),
      h('h1', { class: 'game-title' }, 'Your Move,', h('br'), h('em', { text: 'Prime Minister' })),
      h('p', { class: 'tagline', text: 'Think you could do better?' }),
      h('p', { class: 'lede', text: 'Five years. Twenty quarters. Every one of them, somebody walks into your office wanting an answer by Thursday. Britain keeps moving whether you act or not.' }),
      h('div', { class: 'title-actions' },
        canResume
          ? h('button', { type: 'button', class: 'btn primary', onclick: resume }, 'Continue your term →')
          : null,
        h('button', { type: 'button', class: canResume ? 'btn ghost' : 'btn primary', onclick: startNew },
          canResume ? 'Start again' : 'Take office →'),
        h('button', { type: 'button', class: 'btn quiet', onclick: howItWorks }, 'How it works'))));
  }

  function howItWorks() {
    openDialog('How it works', [
      h('p', { text: 'You are Prime Minister for five years, played as twenty quarters.' }),
      h('ol', { class: 'how-list' },
        h('li', null, h('b', { text: 'Read the agenda. ' }), 'Two or three things want an answer. One is urgent. You do not have to deal with all of them.'),
        h('li', null, h('b', { text: 'Decide. ' }), 'Every decision costs action points, and you only get three a quarter. Choosing one thing means not choosing another.'),
        h('li', null, h('b', { text: 'Run the quarter. ' }), 'You then see exactly what changed, what your earlier decisions have started to do, and what got worse because you left it.')),
      h('p', { text: 'Doing nothing is a real option with real consequences. Most policy takes a year or more to reach people, so the decision that wins you the election is usually one you made a long time before it.' }),
      h('p', { class: 'muted', text: 'Your game saves automatically in this browser. Nothing is uploaded anywhere.' })
    ]);
  }

  /* ------------------------------------------------------------ manifesto */

  function renderManifesto() {
    const v = $('view-manifesto');
    clear(v);
    const s = E.state;
    const grid = h('div', { class: 'promise-grid' });

    PROMISES.forEach(function (p) {
      const id = p[0], selected = s.promises.indexOf(id) >= 0;
      grid.appendChild(h('button', {
        type: 'button',
        class: 'promise' + (selected ? ' selected' : ''),
        'aria-pressed': selected ? 'true' : 'false',
        onclick: function () { E.togglePromise(id); renderManifesto(); }
      }, icon(p[1]), h('b', { text: p[2] }),
         h('small', { text: selected ? 'Chosen' : 'Voters will remember this' })));
    });

    s.customPromises.forEach(function (text, i) {
      grid.appendChild(h('button', {
        type: 'button', class: 'promise selected', 'aria-pressed': 'true',
        onclick: function () { E.removeCustomPromise(i); renderManifesto(); }
      }, icon('✍️'), h('b', { text: text }), h('small', { text: 'Your own promise — click to remove' })));
    });

    const input = h('input', { id: 'customPromise', type: 'text', maxlength: '80',
      placeholder: 'e.g. Make childcare affordable' });
    function addCustom() {
      const value = input.value.trim();
      if (!value) return;
      if (E.totalPromises() >= 3) { flash('Remove a promise before adding another.'); return; }
      E.addCustomPromise(value);
      input.value = '';
      renderManifesto();
      $('customPromise').focus();
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
    });

    const total = E.totalPromises();
    v.appendChild(h('div', { class: 'card manifesto-card' },
      h('p', { class: 'eyebrow', text: 'YOUR MANDATE' }),
      h('h1', { class: 'screen-title', text: 'What did you promise?' }),
      h('p', { class: 'lede', text: 'Choose three. These are not scoring criteria — they are your objectives, and the game will keep telling you whether you are on track to keep them.' }),
      h('p', { class: 'counter' }, h('b', { text: String(total) }), ' of 3 chosen'),
      grid,
      h('div', { class: 'custom-promise' },
        h('label', { for: 'customPromise' }, 'Write your own promise ',
          h('span', { class: 'tag', text: 'experimental' })),
        h('div', { class: 'custom-row' }, input,
          h('button', { type: 'button', class: 'btn small', onclick: addCustom }, 'Add'))),
      h('button', {
        type: 'button', class: 'btn primary wide', disabled: total !== 3,
        onclick: function () { if (E.totalPromises() === 3) { E.beginTerm(); renderBriefing(); show('briefing'); } }
      }, total === 3 ? 'Enter Downing Street →' : 'Choose ' + (3 - total) + ' more')));
  }

  function flash(msg) {
    announce(msg);
    const t = h('div', { class: 'flash', role: 'alert', text: msg });
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
  }

  /* ------------------------------------------------------------- briefing */

  function renderBriefing() {
    const v = $('view-briefing');
    clear(v);
    const s = E.state;
    const agendaCost = s.agenda.filter(a => !a.done)
      .reduce(function (t, a) { return t + (a.cost || 0); }, 0);

    const agenda = h('ul', { class: 'agenda' });
    s.agenda.forEach(function (entry) {
      const card = E.agendaCard(entry);
      if (!card) return;
      const done = !!entry.done;
      const affordable = s.actionsLeft >= (entry.cost || 0);

      /* An agenda routinely costs more than three actions, which is the point —
         but a card you cannot afford has to say so. It used to sit there greyed
         out still reading "1 action", so clicking it simply did nothing. */
      const cost = entry.cost || 0;
      const meta = h('div', { class: 'agenda-meta' },
        entry.urgent && !done ? h('span', { class: 'chip chip-urgent', text: 'Urgent' }) : null,
        card.promise ? h('span', { class: 'chip chip-promise', text: 'Your promise' }) : null,
        done ? h('span', { class: 'chip chip-done', text: 'Decided' }) : null,
        !done && affordable ? h('span', { class: 'cost', text: cost + ' action' + (cost === 1 ? '' : 's') }) : null,
        !done && !affordable ? h('span', { class: 'chip chip-unaffordable',
          text: 'Needs ' + cost + ' action' + (cost === 1 ? '' : 's') + ' — you have ' + s.actionsLeft }) : null);

      agenda.appendChild(h('li', null,
        h('button', {
          type: 'button',
          class: 'agenda-item' + (entry.urgent ? ' urgent' : '') + (done ? ' done' : ''),
          disabled: done || !affordable,
          onclick: function () { openDecision(entry.eventId); }
        },
          icon(card.icon),
          h('div', { class: 'agenda-body' },
            h('b', { class: 'agenda-title', text: card.title }),
            h('p', { class: 'agenda-text', text: done ? 'You chose: ' + entry.choiceText : card.text }),
            meta),
          !done && affordable ? h('span', { class: 'chev', 'aria-hidden': 'true' }, '→') : null)));
    });

    if (!s.agenda.length) {
      agenda.appendChild(h('li', null, h('p', { class: 'muted', text: 'Nothing new has landed this quarter.' })));
    }

    const promises = h('ul', { class: 'promise-track' });
    E.promiseStatus().forEach(function (p) {
      promises.appendChild(h('li', { class: 'promise-row' },
        icon(p.icon), h('span', { class: 'promise-label', text: p.label }), statusChip(p.status)));
    });

    const undecided = s.agenda.filter(function (a) { return !a.done; }).length;
    const advanceLabel = undecided === s.agenda.length && s.agenda.length
      ? 'End the quarter without acting'
      : 'Run the quarter →';

    v.appendChild(h('div', { class: 'briefing' },
      h('header', { class: 'screen-head' },
        h('p', { class: 'eyebrow', text: when(s.turn).toUpperCase() + ' · QUARTER ' + s.turn + ' OF ' + E.TURNS }),
        h('h1', { class: 'screen-title', text: 'Britain needs your attention' }),
        h('div', { class: 'actions-left' }, actionPips(s.actionsLeft, 3),
          h('span', { text: s.actionsLeft + ' of 3 actions left this quarter' }),
          agendaCost > s.actionsLeft
            ? h('span', { class: 'overcommitted',
                text: '· everything here would take ' + agendaCost + '. You cannot do it all.' })
            : null)),
      h('section', { class: 'block' },
        h('h2', { class: 'block-title', text: 'On your desk' }), agenda),
      h('section', { class: 'block' },
        h('h2', { class: 'block-title', text: 'What you promised' }), promises),
      h('div', { class: 'advance' },
        h('button', { type: 'button', class: 'btn primary wide', onclick: runQuarter }, advanceLabel),
        h('p', { class: 'muted small', text: undecided
          ? undecided + ' item' + (undecided === 1 ? '' : 's') + ' left unanswered will get worse.'
          : 'Everything on your desk has an answer.' }))));

    syncChrome();
  }

  /* ------------------------------------------------------------- decision */

  let openEventId = null;

  function openDecision(eventId) {
    openEventId = eventId;
    renderDecision();
    show('decision');
  }

  function renderDecision() {
    const v = $('view-decision');
    clear(v);
    const s = E.state;
    const entry = s.agenda.find(function (a) { return a.eventId === openEventId; });
    if (!entry) { renderBriefing(); show('briefing'); return; }
    const card = E.agendaCard(entry);
    if (!card) { renderBriefing(); show('briefing'); return; }

    const choices = h('div', { class: 'choices' });
    card.choices.forEach(function (c) {
      const preview = h('ul', { class: 'preview' });
      c.preview.forEach(function (p) {
        preview.appendChild(h('li', { class: 'prev ' + (p.positive ? 'good' : 'bad') },
          h('span', { class: 'prev-name', text: p.name }),
          h('span', { class: 'prev-range', text: p.range })));
      });
      if (c.delayed) {
        preview.appendChild(h('li', { class: 'prev slow' },
          h('span', { class: 'prev-name', text: 'Takes time' }),
          h('span', { class: 'prev-range', text: 'more later' })));
      }
      choices.appendChild(h('button', {
        type: 'button', class: 'choice',
        onclick: function () { chooseOption(card.id, c.index); }
      },
        h('b', { class: 'choice-title', text: c.text }),
        h('span', { class: 'choice-sub', text: c.subtitle }),
        preview));
    });

    const advisers = h('div', { class: 'advisers' },
      h('div', { class: 'adviser' },
        h('span', { class: 'avatar', 'aria-hidden': 'true', text: card.adviser.avatar || '•' }),
        h('div', null, h('b', { text: card.adviser.name }),
          h('p', { text: card.adviser.text }))),
      card.secondOpinion
        ? h('div', { class: 'adviser second' },
            h('span', { class: 'avatar', 'aria-hidden': 'true', text: card.secondOpinion.avatar }),
            h('div', null, h('b', { text: card.secondOpinion.name }),
              h('p', { text: card.secondOpinion.text })))
        : null);

    const brief = card.briefing;
    const briefBody = [
      h('h3', { text: 'What is actually going on' }), h('p', { text: brief.explainer }),
      h('h3', { text: 'What you control' }), h('p', { text: brief.control }),
      h('h3', { text: 'Who wants what' }),
      h('ul', { class: 'stakeholders' }, brief.stakeholders.map(function (st) {
        return h('li', null, icon(st[2]), h('b', { text: st[0] }), h('span', { text: st[1] }));
      }))
    ];

    v.appendChild(h('div', { class: 'decision' },
      h('button', { type: 'button', class: 'btn back', onclick: function () { renderBriefing(); show('briefing'); } },
        '← Back to the agenda'),
      h('header', { class: 'screen-head' },
        h('p', { class: 'eyebrow' },
          card.category, ' · ', when(s.turn),
          card.promise ? h('span', { class: 'chip chip-promise', text: 'Your promise' }) : null),
        h('h1', { class: 'screen-title' }, icon(card.icon), ' ', card.title),
        h('p', { class: 'lede', text: card.text })),
      advisers,
      h('button', { type: 'button', class: 'btn quiet',
        onclick: function () { openDialog('The brief: ' + card.title, briefBody); } },
        'Read the brief'),
      h('h2', { class: 'block-title', text: 'What do you do?' }),
      choices,
      h('p', { class: 'muted small', text: 'This decision costs ' + (entry.cost || 0) +
        ' of your ' + s.actionsLeft + ' remaining action' + (s.actionsLeft === 1 ? '' : 's') + '.' })));
  }

  function chooseOption(eventId, choiceIndex) {
    if (busy) return;
    busy = true;
    const result = E.decide(eventId, choiceIndex);
    busy = false;
    if (!result) return;
    if (result.blocked === 'actions') {
      flash('You do not have enough actions left this quarter.');
      return;
    }
    if (result.vote) { renderVote(null); show('vote'); return; }
    E.save();
    showOutcome(result);
  }

  /* An immediate acknowledgement of what a decision did, before returning to the
     agenda. The original applied the effects silently behind a toast. */
  function showOutcome(result) {
    const body = [
      h('div', { class: 'paper' },
        h('p', { class: 'paper-name', text: 'The Herald' }),
        h('h3', { class: 'paper-headline', text: result.headline }),
        h('p', { class: 'paper-deck', text: result.deck })),
      result.voteOutcome ? h('p', { class: 'vote-note', text: result.voteOutcome.note }) : null,
      result.changes && result.changes.length
        ? h('ul', { class: 'changes' }, result.changes.map(function (c) {
            return h('li', { class: c.delta > 0 ? 'good' : 'bad', text: deltaText(c) });
          }))
        : h('p', { class: 'muted', text: 'Nothing moved immediately.' }),
      result.delayed
        ? h('p', { class: 'delayed-note' }, h('b', 'This will take time. '), result.delayed)
        : null,
      h('div', { class: 'dialog-actions' },
        h('button', { type: 'button', class: 'btn primary', onclick: function () {
          closeDialog(); renderBriefing(); show('briefing');
        } }, 'Back to the agenda'))
    ];
    announce(result.headline);
    openDialog('Decision made', body);
  }

  /* ----------------------------------------------------------------- vote */

  function renderVote(note) {
    const v = $('view-vote');
    clear(v);
    const vs = E.voteState();
    if (!vs) { renderBriefing(); show('briefing'); return; }

    const arithmetic = h('ul', { class: 'arithmetic' },
      h('li', null, h('span', 'Government MPs'), h('b', { text: String(vs.govSeats) })),
      h('li', null, h('span', 'Expected to rebel'), h('b', { text: String(vs.rebels) })),
      h('li', { class: 'total' }, h('span', 'Expected support'), h('b', { text: String(vs.support) })),
      h('li', null, h('span', 'You need'), h('b', { text: String(vs.needed) })));

    const act = function (kind) {
      return function () {
        const r = E.negotiate(kind);
        E.save();
        renderVote(r && r.note);
      };
    };

    v.appendChild(h('div', { class: 'decision' },
      h('header', { class: 'screen-head' },
        h('p', { class: 'eyebrow', text: 'THE COMMONS · ' + when(E.state.turn).toUpperCase() }),
        h('h1', { class: 'screen-title', text: vs.name }),
        h('p', { class: 'lede', text: 'Having a majority is not the same as being able to do things. Your own MPs decide whether this passes.' })),
      arithmetic,
      h('p', { class: 'likely ' + vs.likely.toLowerCase().replace(/\s+/g, '-'), text: vs.likely }),
      note ? h('p', { class: 'vote-note', text: note }) : null,
      h('h2', { class: 'block-title', text: 'Before the vote' }),
      h('div', { class: 'choices compact' },
        h('button', { type: 'button', class: 'choice', disabled: !vs.canConcede, onclick: act('concede') },
          h('b', { class: 'choice-title', text: 'Make concessions' }),
          h('span', { class: 'choice-sub', text: 'Fewer rebels, but a weaker bill' })),
        h('button', { type: 'button', class: 'choice', disabled: !vs.canTalk, onclick: act('talk') },
          h('b', { class: 'choice-title', text: 'Talk to the rebels' }),
          h('span', { class: 'choice-sub', text: 'Costs an action. Result uncertain' })),
        h('button', { type: 'button', class: 'choice', disabled: !vs.canThreaten, onclick: act('threaten') },
          h('b', { class: 'choice-title', text: 'Threaten the whip' }),
          h('span', { class: 'choice-sub', text: 'It might work. It might backfire badly' }))),
      h('div', { class: 'advance' },
        h('button', { type: 'button', class: 'btn primary wide', onclick: function () {
          if (busy) return; busy = true;
          const r = E.holdVote(); busy = false;
          E.save(); showOutcome(r);
        } }, 'Hold the vote'),
        h('button', { type: 'button', class: 'btn ghost wide', onclick: function () {
          const r = E.abandonBill(); E.save(); showOutcome(r);
        } }, 'Abandon the bill'))));

    show('vote');
  }

  /* --------------------------------------------------------- consequences */

  /* Running the quarter always interrupts with a report. This is the moment the
     game earns its delayed-consequence mechanic, which the original spent on a
     toast that was overwritten by the next toast. */
  function runQuarter() {
    if (busy) return;
    busy = true;
    const report = E.endTurn();
    busy = false;
    renderConsequences(report);
    show('consequences');
    announce('Quarter complete. ' + (report.headline ? report.headline.headline : ''));
  }

  function renderConsequences(report) {
    const v = $('view-consequences');
    clear(v);
    const blocks = [];

    if (report.headline) {
      blocks.push(h('div', { class: 'paper' },
        h('p', { class: 'paper-name', text: 'The Herald' }),
        h('h3', { class: 'paper-headline', text: report.headline.headline }),
        h('p', { class: 'paper-deck', text: report.headline.deck })));
    }

    if (report.matured.length) {
      blocks.push(h('section', { class: 'block' },
        h('h2', { class: 'block-title', text: 'Decisions you made earlier are landing' }),
        h('ul', { class: 'matured' }, report.matured.map(function (m) {
          return h('li', null,
            h('p', { class: 'chain' },
              h('b', { text: m.causeChoice || m.cause }), h('span', { class: 'arrow', 'aria-hidden': 'true', text: ' → ' }),
              h('span', { text: m.text })),
            m.changes.length ? h('ul', { class: 'changes' }, m.changes.map(function (c) {
              return h('li', { class: c.delta > 0 ? 'good' : 'bad', text: deltaText(c) });
            })) : null);
        }))));
    }

    if (report.immediate.length) {
      blocks.push(h('section', { class: 'block' },
        h('h2', { class: 'block-title', text: 'What changed this quarter' }),
        h('ul', { class: 'changes big' }, report.immediate.map(function (c) {
          return h('li', { class: c.delta > 0 ? 'good' : 'bad', text: deltaText(c) });
        }))));
    }

    if (report.neglected.length) {
      blocks.push(h('section', { class: 'block' },
        h('h2', { class: 'block-title', text: 'What you left alone' }),
        h('ul', { class: 'neglected' }, report.neglected.map(function (n) {
          return h('li', null, h('b', { text: n.title }), h('p', { text: n.text }));
        }))));
    }

    if (report.strain) {
      blocks.push(h('p', { class: 'strain', text: report.strain.text }));
    }

    if (report.unlocks && report.unlocks.length) {
      report.unlocks.forEach(function (u) {
        blocks.push(h('p', { class: 'unlock' },
          h('b', { text: 'New: ' + u.name + '. ' }), u.text));
      });
    }

    const promises = h('ul', { class: 'promise-track' });
    (report.promises || []).forEach(function (p) {
      promises.appendChild(h('li', { class: 'promise-row' },
        icon(p.icon), h('span', { class: 'promise-label', text: p.label }), statusChip(p.status)));
    });
    blocks.push(h('section', { class: 'block' },
      h('h2', { class: 'block-title', text: 'Your promises' }), promises));

    const finished = E.state.turn > E.TURNS;
    blocks.push(h('div', { class: 'advance' },
      h('button', { type: 'button', class: 'btn primary wide', onclick: function () {
        if (finished) { renderEnd(report.final); show('end'); }
        else { renderBriefing(); show('briefing'); }
      } }, finished ? 'Face the voters →' : 'Next quarter →')));

    v.appendChild(h('div', { class: 'consequences' },
      h('header', { class: 'screen-head' },
        h('p', { class: 'eyebrow', text: when(report.turn).toUpperCase() }),
        h('h1', { class: 'screen-title', text: 'What happened' })),
      blocks));
  }

  /* -------------------------------------------------------------- britain */

  /* A stylised board of Britain rather than a map traced from data — six places
     you can point at. Each is filled by how it is actually doing, carries its
     own name and number, and shows what you would notice if you went there. */
  const MAP_SHAPES = {
    Scotland: { d: 'M78,8 L118,4 L132,30 L124,58 L104,70 L80,66 L62,44 L66,20 Z', cx: 96,  cy: 36 },
    North:    { d: 'M62,44 L80,66 L104,70 L124,58 L136,76 L132,104 L104,116 L72,106 L54,80 Z', cx: 95, cy: 86 },
    Wales:    { d: 'M54,80 L72,106 L74,124 L62,146 L40,144 L30,118 L38,92 Z', cx: 52, cy: 118 },
    Midlands: { d: 'M72,106 L104,116 L132,104 L146,124 L140,150 L104,160 L76,150 L74,124 Z', cx: 107, cy: 132 },
    London:   { d: 'M140,150 L158,146 L166,164 L150,174 L136,166 Z',
                cx: 151, cy: 159, labelX: 174, labelY: 156, anchor: 'start', leader: 'M167,160 L172,158' },
    South:    { d: 'M62,146 L76,150 L104,160 L136,166 L150,174 L138,200 L100,212 L66,196 L52,172 Z', cx: 100, cy: 180 }
  };

  /* Fills are light enough to take dark labels, and colour is never the only
     signal: every region also states its name, number and status in words. */
  const CONDITION_FILL = {
    Critical: '#c96a6a', Poor: '#cf9256', Strained: '#c9b45f',
    Steady: '#6fbf90', Strong: '#8ad6a8'
  };

  function britainMap() {
    const board = svg('svg', {
      viewBox: '0 0 232 220', class: 'uk-map',
      role: 'group', 'aria-label': 'Map of Britain. Each region is a button.'
    });

    E.regions().forEach(function (r) {
      const shape = MAP_SHAPES[r.name];
      if (!shape) return;
      const signs = r.signs.map(function (x) { return x.label; }).join('; ');
      const n = Math.abs(r.delta), pt = ' point' + (n === 1 ? '' : 's');
      const trend = r.delta > 0 ? 'up ' + n + pt : r.delta < 0 ? 'down ' + n + pt : 'unchanged';
      const group = svg('g', {
        class: 'map-region', role: 'button', tabindex: '0',
        'aria-label': r.name + ': ' + r.approval + '% approval, ' + trend +
                      ' since last quarter. Conditions ' + r.status.toLowerCase() +
                      (signs ? '. ' + signs : '') + '.',
        onclick: function () { openRegion(r.name); },
        onkeydown: function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRegion(r.name); }
        }
      });
      group.appendChild(svg('path', { d: shape.d, class: 'map-shape',
        fill: CONDITION_FILL[r.status] || '#8aa0b8' }));
      if (shape.leader) group.appendChild(svg('path', { d: shape.leader, class: 'map-leader' }));
      const lx = shape.labelX === undefined ? shape.cx : shape.labelX;
      const ly = shape.labelY === undefined ? shape.cy : shape.labelY;
      const anchor = shape.anchor || 'middle';
      const outside = shape.labelX !== undefined;
      group.appendChild(svg('text', { x: lx, y: ly,
        class: 'map-name' + (outside ? ' outside' : ''), 'text-anchor': anchor }, r.name));
      group.appendChild(svg('text', { x: lx, y: ly + 9,
        class: 'map-value' + (outside ? ' outside' : ''), 'text-anchor': anchor }, r.approval + '%'));
      if (r.signs.length) {
        group.appendChild(svg('text', { x: lx, y: ly + 20, class: 'map-signs',
          'text-anchor': anchor }, r.signs.map(function (x) { return x.icon; }).join(' ')));
      }
      board.appendChild(group);
    });
    return board;
  }

  function conditionLegend() {
    const wrap = h('ul', { class: 'legend' });
    ['Critical', 'Poor', 'Strained', 'Steady', 'Strong'].forEach(function (k) {
      wrap.appendChild(h('li', null,
        h('span', { class: 'swatch', style: 'background:' + CONDITION_FILL[k], 'aria-hidden': 'true' }),
        h('span', { text: k })));
    });
    return wrap;
  }

  function openRegion(name) {
    const r = E.regionDetail(name);
    const pts = function (n) { return n + ' point' + (n === 1 ? '' : 's'); };
    const trend = r.delta > 0 ? 'Up ' + pts(r.delta) + ' since last quarter'
                : r.delta < 0 ? 'Down ' + pts(Math.abs(r.delta)) + ' since last quarter'
                : 'Unchanged since last quarter';
    openDialog(r.name, [
      h('p', { class: 'region-story', text: r.story }),
      h('ul', { class: 'arithmetic light' },
        h('li', null, h('span', 'Approval here'), h('b', { text: r.approval + '%' })),
        h('li', null, h('span', 'Trend'), h('b', { text: trend })),
        h('li', null, h('span', 'Conditions'), h('b', { text: r.status }))),
      r.signs.length ? h('h3', { text: 'What you would notice' }) : null,
      r.signs.length ? h('ul', { class: 'signs' }, r.signs.map(function (x) {
        return h('li', null, icon(x.icon), h('span', { text: x.label }));
      })) : null,
      h('h3', { text: 'What this place cares about' }),
      h('ul', { class: 'signs drivers' }, r.drivers.map(function (d) {
        return h('li', null, h('b', { text: d.name }), h('span', { text: d.value + '/100' }));
      })),
      h('div', { class: 'dialog-actions' },
        h('button', { type: 'button', class: 'btn primary', onclick: closeDialog }, 'Close'))
    ]);
  }

  function renderBritain() {
    const v = $('view-britain');
    clear(v);

    const list = h('ul', { class: 'indicators' });
    E.britain().forEach(function (r) {
      list.appendChild(h('li', { class: 'indicator' },
        h('div', { class: 'ind-head' },
          h('b', { text: r.name }), statusChip(r.status)),
        h('p', { class: 'ind-headline', text: r.headline }),
        h('p', { class: 'ind-detail', text: r.detail }),
        h('div', { class: 'meter' },
          h('span', { class: 'meter-fill', style: 'width:' + r.value + '%' }))));
    });

    v.appendChild(h('div', { class: 'britain' },
      h('header', { class: 'screen-head' },
        h('p', { class: 'eyebrow', text: 'THE COUNTRY · ' + when(E.state.turn).toUpperCase() }),
        h('h1', { class: 'screen-title', text: 'Britain' }),
        h('p', { class: 'lede', text: 'Six places, each with its own priorities. Pick one to see what is happening there.' })),
      h('div', { class: 'map-wrap' }, britainMap()),
      conditionLegend(),
      h('h2', { class: 'block-title', text: 'The country as a whole' }),
      h('p', { class: 'muted small', text: 'Worst first. Every reading points the same way: higher is better.' }),
      list));
  }

  /* ----------------------------------------------------------- government */

  function renderGovernment() {
    const v = $('view-government');
    clear(v);
    const s = E.state;

    const promises = h('ul', { class: 'promise-track' });
    E.promiseStatus().forEach(function (p) {
      promises.appendChild(h('li', { class: 'promise-row' },
        icon(p.icon), h('span', { class: 'promise-label', text: p.label }), statusChip(p.status)));
    });

    const record = h('ul', { class: 'record' });
    s.record.slice().reverse().forEach(function (r) {
      record.appendChild(h('li', null,
        h('span', { class: 'record-when', text: when(r.turn) }),
        h('b', { text: r.title }),
        h('span', { class: 'record-choice', text: r.choice })));
    });
    if (!s.record.length) record.appendChild(h('li', null, h('span', { class: 'muted', text: 'Nothing decided yet.' })));

    v.appendChild(h('div', { class: 'government' },
      h('header', { class: 'screen-head' },
        h('p', { class: 'eyebrow', text: 'YOUR GOVERNMENT' }),
        h('h1', { class: 'screen-title', text: 'Government' })),
      h('section', { class: 'block' },
        h('h2', { class: 'block-title', text: 'Promises' }), promises),
      h('section', { class: 'block' },
        h('h2', { class: 'block-title', text: 'The Commons' }),
        h('ul', { class: 'arithmetic' },
          h('li', null, h('span', 'Government MPs'), h('b', { text: String(E.govSeats()) })),
          h('li', null, h('span', 'Working majority'), h('b', { text: String(s.majority) })),
          h('li', null, h('span', 'Party unity'), h('b', { text: Math.round(s.party) + '%' })))),
      h('section', { class: 'block' },
        h('h2', { class: 'block-title', text: 'Your record' }), record)));
  }

  /* ------------------------------------------------------------------ end */

  function renderEnd(final) {
    const v = $('view-end');
    clear(v);
    if (!final) final = E.finish();

    const scores = h('ul', { class: 'scores' });
    final.scores.forEach(function (row) {
      scores.appendChild(h('li', null, h('small', { text: row[0] }), h('b', { text: String(row[1]) })));
    });

    const promises = h('ul', { class: 'promise-track' });
    final.promises.forEach(function (p) {
      promises.appendChild(h('li', { class: 'promise-row' },
        icon(p.icon), h('span', { class: 'promise-label', text: p.label }), statusChip(p.status)));
    });

    v.appendChild(h('div', { class: 'endgame' },
      h('header', { class: 'screen-head' },
        h('p', { class: 'eyebrow', text: 'THE GENERAL ELECTION' }),
        h('h1', { class: 'screen-title', text: final.won ? 'The voters give you another term.' : 'Your government is over.' }),
        h('p', { class: 'legacy', text: final.legacy })),
      h('p', { class: 'lede', text: 'You finish with ' + final.seats + ' projected seats and kept ' +
        final.delivered + ' of ' + final.total + ' promises. ' +
        (final.won ? 'Britain has handed you the keys again.'
                   : 'The opposition now gets to discover what the job feels like.') }),
      scores,
      h('h2', { class: 'block-title', text: 'What you promised' }), promises,
      h('div', { class: 'advance' },
        h('button', { type: 'button', class: 'btn primary wide', onclick: startNew }, 'Run again'))));
    announce(final.won ? 'You won the election with ' + final.seats + ' seats.'
                       : 'You lost the election with ' + final.seats + ' seats.');
  }

  /* ----------------------------------------------------------- lifecycle */

  function startNew() {
    E.reset();
    renderManifesto();
    show('manifesto');
  }

  function resume() {
    if (!E.load()) { startNew(); return; }
    const s = E.state;
    if (s.turn > E.TURNS) { renderEnd(null); show('end'); return; }
    if (s.bill) { renderVote(null); return; }
    renderBriefing();
    show('briefing');
  }

  /* The wordmark used to reset the game on a single click with no warning,
     which quietly destroyed a whole term. */
  function goHome() {
    if (currentView === 'title' || currentView === 'manifesto') { show('title'); return; }
    confirmDialog('Leave this term?',
      'Your term is saved, so you can pick it up again from the title screen. Nothing is lost.',
      'Back to the title', function () { renderTitle(); show('title'); });
  }

  function init() {
    $('homeBtn').addEventListener('click', goHome);
    $('tabs').addEventListener('click', function (e) {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      const view = btn.getAttribute('data-view');
      if (view === 'briefing') { renderBriefing(); show('briefing'); }
      if (view === 'britain') { renderBritain(); show('britain'); }
      if (view === 'government') { renderGovernment(); show('government'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('dialogLayer').hidden) closeDialog();
    });
    renderTitle();
    show('title');
  }

  return { init: init, renderTitle: renderTitle };
})();

document.addEventListener('DOMContentLoaded', function () { window.UI.init(); });
