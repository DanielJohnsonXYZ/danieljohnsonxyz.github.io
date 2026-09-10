/* The title screen, coach marks, and the promises picker — everything a
   brand new player meets before the game becomes just the game. A new
   player learns by answering something, not by reading about it: the title
   screen is one line and a button, and the tutorial itself is three short
   stages carried entirely in the save (state.onboarding), so a refresh at
   any point resumes exactly where it left off. */

window.YM = window.YM || {};
YM.onboarding = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus;

  /* ------------------------------------------------------------- title */

  function startNewTerm() {
    E.reset();
    E.beginTerm({ tutorial: true });
    YM.app.enterScene();
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

  function continueTerm() {
    E.load();
    YM.app.enterScene();
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

  /* Runs once, when the scene is first entered with the tutorial's single
     card still waiting: opens it so a new player answers something before
     they do anything else. `opened` is reset only by a page load, so a
     player who closes the card sees it stay closed for the rest of this
     visit, but a reload (a new visit) opens it again — matching what the
     save itself remembers about the stage. */
  let opened = false;
  function enterDesk() {
    if (opened) return;
    const stage = E.onboarding().stage;
    if (stage !== 'first_card') return;
    const entry = E.state.agenda.find(function (a) { return !a.done; });
    if (!entry) return;
    opened = true;
    YM.card.open(entry.eventId);
  }

  /* ------------------------------------------------------------ coach */

  /* One bubble on screen at a time. A coach() call for a different key
     while one is showing queues behind it rather than replacing it, so the
     chips/coins/pin trio (fired together, in order) is actually seen one
     at a time rather than only the last one flashing past. */
  let activeCoach = null;
  let queue = [];

  function dismissCoach() {
    if (activeCoach) document.removeEventListener('keydown', activeCoach.onKey, true);
    activeCoach = null;
    const el = D.$('coach');
    if (!el) return;
    D.clear(el);
    el.hidden = true;
  }

  function advance() {
    dismissCoach();
    while (queue.length) {
      const item = queue.shift();
      if (E.onboarding().seen[item.key]) continue;
      const target = typeof item.target === 'function' ? item.target() : item.target;
      if (!target) continue;
      display(item.key, target, item.text);
      return;
    }
  }

  function display(key, targetEl, text) {
    E.markCoach(key);
    const el = D.$('coach');
    const bubble = D.h('div', { class: 'coach-bubble', role: 'status' },
      D.h('p', { class: 'coach-text', text: text }),
      D.h('button', { class: 'btn secondary', type: 'button', onClick: advance }, 'Got it'));
    D.replace(el, bubble);
    el.hidden = false;
    position(bubble, targetEl);
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); advance(); } }
    document.addEventListener('keydown', onKey, true);
    activeCoach = { key: key, onKey: onKey, target: targetEl };
  }

  /* A coach mark anchored to something that has since left the page (the
     card's chips once the outcome strip replaces them, say) must not hang
     in mid-air over whatever is there now. Watch the DOM and move on. */
  const detachWatcher = new MutationObserver(function () {
    if (activeCoach && activeCoach.target && !document.body.contains(activeCoach.target)) advance();
  });
  detachWatcher.observe(document.body, { childList: true, subtree: true });

  /* Below the target by default; above it if there is no room underneath —
     the same rule js/run.js uses for the callouts during a run. */
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

  /* Public entry point: YM.onboarding.coach(key, targetEl, text). Each key
     shows once ever (E.markCoach/seen); a target that is not on screen this
     turn is simply skipped. Never traps focus (no D.trap, no auto-focus)
     and never sits over the target (#coach itself is pointer-events:none;
     only the bubble is interactive), so it can never block a click. */
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
    B.render();
    YM.hud.pulsePromises();
    B.flash('Your promises are on the map');
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

  return { title: title, enterDesk: enterDesk, coach: coach, openPromisePicker: openPromisePicker };
})();
