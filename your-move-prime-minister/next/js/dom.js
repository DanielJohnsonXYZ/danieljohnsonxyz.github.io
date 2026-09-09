/* DOM helpers shared by every module. Nothing here knows about the game.

   Rules the whole client follows:
   - build elements with h()/svg() and set text with textContent — never with
     raw markup strings;
   - decorative glyphs are aria-hidden;
   - anything that moves respects the reduced-motion setting. */

window.YM = window.YM || {};
YM.dom = (function () {
  'use strict';

  function h(tag, props) {
    const el = document.createElement(tag);
    /* props is optional: h('span', 'text') passes a child, not attributes. */
    const isProps = props && typeof props === 'object' && !Array.isArray(props) && !props.nodeType;
    const firstChild = isProps ? 2 : 1;
    if (isProps) {
      Object.keys(props).forEach(function (k) {
        const v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (p) { el.style[p] = v[p]; });
        else if (k === 'dataset' && typeof v === 'object') Object.keys(v).forEach(function (p) { el.dataset[p] = v[p]; });
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      });
    }
    for (let i = firstChild; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) kid.forEach(function (k) { append(el, k); });
    else el.appendChild(typeof kid === 'object' ? kid : document.createTextNode(String(kid)));
  }

  const SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, props) {
    const el = document.createElementNS(SVGNS, tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        const val = props[k];
        if (val === null || val === undefined || val === false) return;
        if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), val);
        else if (k === 'text') el.textContent = val;
        else el.setAttribute(k, String(val));
      });
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }

  function $(id) { return document.getElementById(id); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function replace(el) { clear(el); for (let i = 1; i < arguments.length; i++) append(el, arguments[i]); return el; }

  /* Decorative glyphs are hidden from screen readers. */
  function icon(ch, cls) { return h('span', { class: 'icon' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', text: ch }); }

  /* One polite live region for the whole app. */
  let liveTimer = null;
  function announce(msg) {
    const live = $('live');
    if (!live) return;
    /* Clear first so an identical message is announced again. */
    live.textContent = '';
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () { live.textContent = msg; }, 30);
  }

  /* Motion: 'reduced' if the OS asks for it or the page has been told to. */
  function motion() {
    if (document.body.dataset.motion === 'reduced') return 'reduced';
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced';
    } catch (e) { /* ignore */ }
    return 'full';
  }

  /* Count a number up or down inside an element. Finishes instantly under
     reduced motion. Always ends on exactly `to`. */
  function tween(el, from, to, format, ms) {
    const fmt = format || String;
    if (el._tween) cancelAnimationFrame(el._tween);
    if (motion() === 'reduced' || from === to || !ms) { el.textContent = fmt(to); return; }
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * eased));
      if (p < 1) el._tween = requestAnimationFrame(step); else { el._tween = null; el.textContent = fmt(to); }
    }
    el._tween = requestAnimationFrame(step);
  }

  /* Re-trigger a CSS animation class. */
  function pulse(el, cls) {
    if (!el) return;
    const c = cls || 'pulse';
    el.classList.remove(c);
    void el.offsetWidth; // restart the animation
    el.classList.add(c);
  }

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll(FOCUSABLE)).filter(function (el) {
      return el.offsetParent !== null || el === document.activeElement;
    });
  }
  /* Keep Tab inside `root`. Returns a function that removes the trap. */
  function trap(root) {
    function onKey(e) {
      if (e.key !== 'Tab') return;
      const list = focusables(root);
      if (!list.length) { e.preventDefault(); return; }
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    root.addEventListener('keydown', onKey);
    return function () { root.removeEventListener('keydown', onKey); };
  }

  function on(el, type, fn) { el.addEventListener(type, fn); return function () { el.removeEventListener(type, fn); }; }

  return { h: h, svg: svg, $: $, clear: clear, replace: replace, icon: icon, announce: announce,
           motion: motion, tween: tween, pulse: pulse, trap: trap, focusables: focusables, on: on };
})();
