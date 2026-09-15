/* The title screen, first-day briefing, Cabinet briefing, coach marks, and
   promises picker. A new player gets the premise first, then a simple game
   loop, then learns the rest by governing. */

window.YM = window.YM || {};
YM.onboarding = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus;

  /* ------------------------------------------------------------- title */

  let introPending = false;
  let introHandle = null;
  let cabinetHandle = null;

  function startNewTerm() {
    E.reset();
    E.beginTerm({ tutorial: true });
    introPending = true;
    YM.app.enterScene();
    openIntro();
  }

  function confirmOverwrite() {
    const handle = B.open({
      title: 'Start a new term?',
      body: [
        D.h('p', { text: 'Your saved term will be deleted.' }),
        D.h('div', { class: 'title-actions' },
          D.h('button', {
            class: 'btn big', type: 'button',
            onClick: function () { handle.close(); startNewTerm(); }
          }, 'Start new'),
          D.h('button', {
            class: 'btn secondary big', type: 'button',
            onClick: function () { handle.close(); }
          }, 'Keep playing'))
      ]
    });
  }

  function takeOffice() {
    if (E.hasSave()) { confirmOverwrite(); return; }
    startNewTerm();
  }

  function maybeBriefExistingTerm() {
    const o = E.onboarding();
    if (E.state.turn > 4) return;
    if (o.stage === 'first_card' || o.stage === 'promises') return;
    if (o.seen.cabinet_briefing) return;
    window.setTimeout(openCabinetBriefing, 0);
  }

  function continueTerm() {
    E.load();
    YM.app.enterScene();
    maybeBriefExistingTerm();
  }

  function title() {
    const root = D.$('title');
    const actions = [D.h('button', { class: 'btn big', type: 'button', onClick: takeOffice }, 'Take office')];
    if (E.hasSave()) {
      actions.push(D.h('button', { class: 'btn secondary big', type: 'button', onClick: continueTerm }, 'Continue your term'));
    }
    D.replace(root, D.h('div', { class: 'title-card' },
      D.h('p', { class: 'eyebrow', text: 'A game about running the country' }),
      D.h('h1', { id: 'title-heading', text: 'Your Move, Prime Minister' }),
      D.h('p', { class: 'title-lede', text: 'Five years. One desk. Britain is watching.' }),
      D.h('div', { class: 'title-actions' }, actions)));
  }

  /* ------------------------------------------------------- first briefing */

  function introRule(kicker, title, text) {
    return D.h('div', { class: 'intro-rule' },
      D.h('span', { class: 'intro-rule-kicker', text: kicker }),
      D.h('div', null,
        D.h('h3', { text: title }),
        D.h('p', { text: text })));
  }

  function finishIntro() {
    introPending = false;
    const h = introHandle;
    introHandle = null;
    if (h) h.close();
    window.setTimeout(enterDesk, 0);
  }

  function openIntro() {
    if (introHandle) return;
    const body = D.h('div', { class: 'intro-briefing' },
      D.h('p', { class: 'intro-opening serif', text: 'You have five years to run Britain, hold your government together and earn another mandate.' }),
      D.h('div', { class: 'intro-rules' },
        introRule('01', 'Three Attention each quarter', 'Big decisions consume your limited attention. You will not be able to answer everything.'),
        introRule('02', 'Britain keeps moving', 'Ignored problems worsen, while reforms can take several quarters before their effects appear.'),
        introRule('03', 'Power has limits', 'Your MPs, spare money and market confidence determine what you can get away with.'),
        introRule('04', 'The election remembers', 'Choose three promises. Voters will judge both those promises and the country you leave behind.')),
      D.h('div', { class: 'intro-redbox' },
        D.h('span', { class: 'intro-redbox-mark', 'aria-hidden': 'true' }),
        D.h('div', null,
          D.h('p', { class: 'eyebrow', text: 'YOUR FIRST RED BOX' }),
          D.h('p', { text: 'The NHS is already in crisis. Your Health Secretary needs a decision today.' }))),
      D.h('button', { class: 'btn big block intro-start', type: 'button', onClick: finishIntro }, 'Open your first red box'));

    introHandle = B.open({
      title: 'Welcome to Downing Street',
      eyebrow: 'YOUR FIRST DAY AS PRIME MINISTER',
      locked: true,
      className: 'intro-overlay',
      body: body
    });
  }

  /* ------------------------------------------------------ Cabinet briefing */

  function cabinetStep(number, title, text) {
    return D.h('div', { class: 'cabinet-step' },
      D.h('span', { class: 'cabinet-step-number', text: number }),
      D.h('div', null,
        D.h('h3', { text: title }),
        D.h('p', { text: text })));
  }

  function finishCabinetBriefing() {
    const h = cabinetHandle;
    cabinetHandle = null;
    if (h) h.close();
    B.render();
    YM.hud.pulsePromises();
    D.announce('The control room is ready. Start with your desk.');
  }

  function openCabinetBriefing() {
    if (cabinetHandle) return;
    if (!E.onboarding().seen.cabinet_briefing) E.markCoach('cabinet_briefing');

    const body = D.h('div', { class: 'cabinet-briefing' },
      D.h('p', { class: 'cabinet-opening serif', text: 'Every quarter follows the same loop. You are not meant to solve everything.' }),
      D.h('div', { class: 'cabinet-loop' },
        cabinetStep('1', 'Read your desk', 'Problems and opportunities arrive here. Decide what actually deserves the Prime Minister’s attention.'),
        cabinetStep('2', 'Spend your Attention', 'You have three each quarter. Bigger decisions cost more, so choosing one thing often means leaving another alone.'),
        cabinetStep('3', 'Advance the quarter', 'Britain moves. Your decisions land, delayed reforms mature and anything you ignored can get worse.')),
      D.h('div', { class: 'cabinet-goal' },
        D.h('p', { class: 'eyebrow', text: 'YOUR JOB' }),
        D.h('p', { text: 'Keep Britain moving, keep your government together, deliver enough of your promises, and win the election.' })),
      D.h('p', { class: 'muted small cabinet-note', text: 'You can click the map, dials and promises whenever you want more detail. The desk is where you act.' }),
      D.h('button', { class: 'btn big block', type: 'button', onClick: finishCabinetBriefing }, 'Enter the control room'));

    cabinetHandle = B.open({
      title: 'Your first Cabinet briefing',
      eyebrow: 'HOW TO GOVERN',
      locked: true,
      className: 'cabinet-overlay',
      body: body
    });
  }

  /* Runs once, when the scene is first entered with the tutorial's single
     card still waiting. The first-day briefing deliberately pauses this
     auto-open until the player presses "Open your first red box". */
  let opened = false;
  function enterDesk() {
    if (introPending || opened) return;
    const stage = E.onboarding().stage;
    if (stage !== 'first_card') return;
    const entry = E.state.agenda.find(function (a) { return !a.done; });
    if (!entry) return;
    opened = true;
    YM.card.open(entry.eventId);
  }

  /* ------------------------------------------------------------ coach */

  let activeCoach = null;
  let queue = [];

  function dismissCoach() {
    if (activeCoach) {
      document.removeEventListener('keydown', activeCoach.onKey, true);
      if (activeCoach.target && activeCoach.target.classList) activeCoach.target.classList.remove('coach-target');
    }
    activeCoach = null;
    const el = D.$('coach');
    if (!el) return;
    D.clear(el);
    el.hidden = true;
  }

  function clearCoachQueue() {
    queue = [];
    dismissCoach();
  }

  function advance() {
    dismissCoach();
    while (queue.length) {
      const item = queue.shift();
      if (E.onboarding().seen[item.key]) continue;
      const target = typeof item.target === 'function' ? item.target() : item.target;
      if (!target || !document.body.contains(target)) continue;
      display(item.key, target, item.text);
      return;
    }
  }

  function display(key, targetEl, text) {
    E.markCoach(key);
    if (targetEl.classList) targetEl.classList.add('coach-target');
    const el = D.$('coach');
    const bubble = D.h('div', { class: 'coach-bubble', role: 'status' },
      D.h('p', { class: 'coach-text', text: text }),
      D.h('button', { class: 'btn secondary', type: 'button', onClick: advance }, 'Got it'));
    D.replace(el, bubble);
    el.hidden = false;
    position(bubble, targetEl);
    D.announce(text);
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); advance(); } }
    document.addEventListener('keydown', onKey, true);
    activeCoach = { key: key, onKey: onKey, target: targetEl };
  }

  const detachWatcher = new MutationObserver(function () {
    if (activeCoach && activeCoach.target && !document.body.contains(activeCoach.target)) advance();
  });
  detachWatcher.observe(document.body, { childList: true, subtree: true });

  /* When a decision or other modal opens, any desk coach has already done its
     job. Clear it so the next coach can describe the state after the decision
     rather than being stuck behind an overlay. */
  B.on('overlay', function (count) {
    if (count > 0 && activeCoach) clearCoachQueue();
  });

  function position(bubble, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    if (!rect.width && !rect.height && !rect.top && !rect.left) {
      bubble.style.left = '12px'; bubble.style.top = '12px'; return;
    }
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    let top = rect.bottom + 10;
    if (top + h > window.innerHeight - 8) top = rect.top - h - 10;
    if (top < 8) top = 8;
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  }

  function coach(key, targetEl, text) {
    if (!targetEl) return;
    if (E.onboarding().seen[key]) return;
    if (activeCoach && activeCoach.key === key) return;
    if (activeCoach) { queue.push({ key: key, target: targetEl, text: text }); return; }
    display(key, targetEl, text);
  }

  /* ------------------------------------------------------ promises picker */

  let pickerHandle = null;
  let pickerSelected = [];

  function promiseOption(t) {
    const selected = pickerSelected.indexOf(t.id) >= 0;
    return D.h('button', {
      class: 'choice' + (selected ? ' selected' : ''), type: 'button',
      'aria-pressed': selected ? 'true' : 'false',
      onClick: function () { toggleOption(t.id); }
    },
      D.h('span', { class: 'choice-title' }, D.icon(t.icon), ' ', t.label),
      D.h('span', { class: 'choice-sub', text: t.now + ' → ' + t.target }),
      D.h('span', { class: 'chip', text: t.region }));
  }

  function toggleOption(id) {
    const i = pickerSelected.indexOf(id);
    if (i >= 0) pickerSelected.splice(i, 1);
    else {
      if (pickerSelected.length >= 3) { B.flash('You can only promise three things'); return; }
      pickerSelected.push(id);
    }
    renderPicker();
  }

  function confirmPromises() {
    if (pickerSelected.length !== 3) return;
    E.lockPromises(pickerSelected.slice());
    const h = pickerHandle; pickerHandle = null;
    if (h) h.close();
    openCabinetBriefing();
  }

  function renderPicker() {
    if (!pickerHandle) return;
    const targets = E.promiseTargets();
    const choices = D.h('div', { class: 'choices' }, targets.map(promiseOption));
    const counter = D.h('p', { class: 'muted small', text: pickerSelected.length + ' of 3 chosen' });
    const confirmBtn = D.h('button', {
      class: 'btn big block', type: 'button', disabled: pickerSelected.length !== 3,
      onClick: confirmPromises
    }, 'Promise these three');
    pickerHandle.setBody(
      D.h('p', { class: 'card-lede', text: 'Pick three. These are what your term is judged on.' }),
      choices, counter, confirmBtn);
  }

  function openPromisePicker() {
    pickerSelected = [];
    pickerHandle = B.open({
      title: 'Choose your promises', eyebrow: 'PARTY HQ',
      onClose: function () { pickerHandle = null; }
    });
    renderPicker();
  }

  return { title: title, enterDesk: enterDesk, coach: coach, openPromisePicker: openPromisePicker,
           openCabinetBriefing: openCabinetBriefing, clearCoach: clearCoachQueue };
})();
