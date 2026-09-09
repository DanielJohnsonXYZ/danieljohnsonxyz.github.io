/* The title screen. A stub for now — M4 replaces it with the real tutorial —
   so it stays to one screen and two buttons. */

window.YM = window.YM || {};
YM.onboarding = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom;

  function takeOffice() {
    E.reset();
    E.setPromises(['nhs', 'housing', 'growth']);
    E.beginTerm();
    YM.app.enterScene();
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
      D.h('p', { class: 'eyebrow', text: 'A five-year term' }),
      D.h('h1', { id: 'title-heading', text: 'Your Move, Prime Minister' }),
      D.h('p', { class: 'title-lede', text: 'Run Britain for five years. One screen, every decision, and an election at the end.' }),
      D.h('div', { class: 'title-actions' }, actions)));
  }

  return { title: title };
})();
