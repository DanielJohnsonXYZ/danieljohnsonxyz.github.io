/* Scene state and the overlay stack.

   There is one screen. Modules mount once and re-render themselves from
   Engine.state whenever bus.render() is called. While a sequence (the
   running quarter, election night) is playing, the scene is frozen so no
   render can snap the dials to their end values mid-animation. */

window.YM = window.YM || {};
YM.bus = (function () {
  'use strict';
  const D = YM.dom;

  const scene = { phase: 'title', overlays: [], lastOutcome: null, frozen: false };
  const renderers = [];
  const listeners = {};

  function subscribe(fn) { renderers.push(fn); return fn; }
  function on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
  function fire(type, data) { (listeners[type] || []).forEach(function (fn) { fn(data); }); }

  function setPhase(p) {
    if (scene.phase === p) return;
    scene.phase = p;
    document.body.dataset.phase = p;
    fire('phase', p);
  }
  function render() {
    if (scene.frozen) return;
    renderers.forEach(function (fn) { fn(scene); });
  }
  function freeze() { scene.frozen = true; }
  function thaw() { scene.frozen = false; }

  /* ------------------------------------------------------------ overlays */

  /* open({ title, body, className, wide, onClose, initialFocus, closeLabel })
     Returns a handle { el, close, setBody }. Overlays stack; only the top one
     is visible and interactive. Escape closes the top overlay unless
     opts.locked is set. Focus returns to whatever opened it. */
  function open(opts) {
    const root = D.$('overlay');
    const opener = document.activeElement;
    const titleId = 'ov-title-' + Date.now() + '-' + scene.overlays.length;
    const panel = D.h('div', { class: 'overlay-panel' + (opts.className ? ' ' + opts.className : '') + (opts.wide ? ' wide' : ''),
                               role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' });
    const head = D.h('div', { class: 'overlay-head' },
      D.h('h2', { id: titleId, class: 'overlay-title', text: opts.title || '' }),
      opts.locked ? null : D.h('button', { class: 'btn ghost overlay-close', type: 'button', 'aria-label': opts.closeLabel || 'Close', onClick: function () { handle.close(); } }, D.icon('✕')));
    const body = D.h('div', { class: 'overlay-body' });
    if (opts.eyebrow) head.insertBefore(D.h('p', { class: 'eyebrow', text: opts.eyebrow }), head.firstChild);
    panel.appendChild(head);
    panel.appendChild(body);
    if (opts.body) D.replace(body, opts.body);

    const backdrop = D.h('div', { class: 'overlay-backdrop', onClick: function () { if (!opts.locked) handle.close(); } });
    const wrap = D.h('div', { class: 'overlay-wrap' }, backdrop, panel);
    const untrap = D.trap(panel);

    const handle = {
      el: panel, body: body, opts: opts,
      setTitle: function (t) { D.$(titleId).textContent = t; },
      setBody: function () { D.replace.apply(null, [body].concat(Array.prototype.slice.call(arguments))); return body; },
      close: function (result) {
        const i = scene.overlays.indexOf(handle);
        if (i < 0) return;
        scene.overlays.splice(i, 1);
        untrap();
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        const top = scene.overlays[scene.overlays.length - 1];
        if (top) { top.wrap.hidden = false; top.el.focus(); }
        else { root.hidden = true; document.body.classList.remove('has-overlay'); }
        if (opts.onClose) opts.onClose(result);
        if (!top && opener && opener.focus && document.body.contains(opener)) opener.focus();
        fire('overlay', scene.overlays.length);
      },
      wrap: wrap
    };
    scene.overlays.forEach(function (o) { o.wrap.hidden = true; });
    scene.overlays.push(handle);
    root.appendChild(wrap);
    root.hidden = false;
    document.body.classList.add('has-overlay');
    const target = opts.initialFocus ? panel.querySelector(opts.initialFocus) : null;
    (target || panel).focus();
    fire('overlay', scene.overlays.length);
    return handle;
  }
  function top() { return scene.overlays[scene.overlays.length - 1] || null; }
  function closeTop(result) { const t = top(); if (t) t.close(result); }
  function closeAll() { while (scene.overlays.length) scene.overlays[scene.overlays.length - 1].close(); }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const t = top();
    if (t && !t.opts.locked) { e.preventDefault(); t.close(); }
  });

  /* A short, non-blocking message (a blocked choice, a save error). */
  let flashTimer = null;
  function flash(msg) {
    let el = D.$('flash');
    if (!el) { el = D.h('div', { id: 'flash', class: 'flash', role: 'status' }); document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
    D.announce(msg);
  }

  return { scene: scene, subscribe: subscribe, on: on, fire: fire, setPhase: setPhase, render: render,
           freeze: freeze, thaw: thaw, open: open, top: top, closeTop: closeTop, closeAll: closeAll, flash: flash };
})();
