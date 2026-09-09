/* Britain, as a board rather than a chart: six places you can point at, each
   filled by how it is actually doing, each carrying the pins for whatever is
   on the desk about it. Tapping a region opens the story behind its number. */

window.YM = window.YM || {};
YM.map = (function () {
  'use strict';
  const E = window.Engine, D = YM.dom, B = YM.bus, F = YM.fmt;

  /* Taken verbatim from ../js/ui.js's MAP_SHAPES: paths, label centres and
     London's leader line. The viewBox here is 0 0 200 220 per spec; the
     shape coordinates are unchanged. */
  const MAP_SHAPES = {
    Scotland: { d: 'M78,8 L118,4 L132,30 L124,58 L104,70 L80,66 L62,44 L66,20 Z', cx: 96, cy: 36 },
    North:    { d: 'M62,44 L80,66 L104,70 L124,58 L136,76 L132,104 L104,116 L72,106 L54,80 Z', cx: 95, cy: 86 },
    Wales:    { d: 'M54,80 L72,106 L74,124 L62,146 L40,144 L30,118 L38,92 Z', cx: 52, cy: 118 },
    Midlands: { d: 'M72,106 L104,116 L132,104 L146,124 L140,150 L104,160 L76,150 L74,124 Z', cx: 107, cy: 132 },
    London:   { d: 'M140,150 L158,146 L166,164 L150,174 L136,166 Z',
                cx: 151, cy: 159, labelX: 174, labelY: 156, anchor: 'start', leader: 'M167,160 L172,158' },
    South:    { d: 'M62,146 L76,150 L104,160 L136,166 L150,174 L138,200 L100,212 L66,196 L52,172 Z', cx: 100, cy: 180 }
  };

  let root = null;
  const groupEls = {};
  const pathEls = {};
  const valueEls = {};

  function mount() {
    root = D.$('map');
    B.subscribe(render);
  }

  function pinsByRegion() {
    const out = {};
    (E.state.agenda || []).forEach(function (entry) {
      const card = E.agendaCard(entry);
      if (!card || !card.region) return;
      (out[card.region] = out[card.region] || []).push(card);
    });
    return out;
  }

  function regionGroup(r, pins) {
    const shape = MAP_SHAPES[r.name];
    const n = Math.abs(r.delta), pt = ' point' + (n === 1 ? '' : 's');
    const trend = r.delta > 0 ? 'up ' + n + pt : r.delta < 0 ? 'down ' + n + pt : 'unchanged';
    const signWords = r.signs.map(function (x) { return x.label; }).join('; ');
    const label = r.name + ': ' + r.approval + '% approval, ' + trend + ' since last quarter. ' +
      'Conditions ' + r.status.toLowerCase() + '.' + (signWords ? ' ' + signWords + '.' : '') +
      (pins.length ? ' ' + pins.length + ' item' + (pins.length === 1 ? '' : 's') + ' on the desk here.' : '');

    const group = D.svg('g', {
      class: 'region', role: 'button', tabindex: '0', 'data-region': r.name,
      'data-approval': String(r.approval), 'aria-label': label,
      onClick: function () { openRegion(r.name); },
      onKeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRegion(r.name); } }
    });
    const path = D.svg('path', { d: shape.d, class: 'map-shape', fill: F.fillForValue(r.approval) });
    group.appendChild(path);
    if (shape.leader) group.appendChild(D.svg('path', { d: shape.leader, class: 'map-leader' }));

    const lx = shape.labelX === undefined ? shape.cx : shape.labelX;
    const ly = shape.labelY === undefined ? shape.cy : shape.labelY;
    const anchor = shape.anchor || 'middle';
    const outside = shape.labelX !== undefined;
    group.appendChild(D.svg('text', { x: lx, y: ly, class: 'map-name' + (outside ? ' outside' : ''), 'text-anchor': anchor }, r.name));
    const valueEl = D.svg('text', { x: lx, y: ly + 11, class: 'map-value' + (outside ? ' outside' : ''), 'text-anchor': anchor }, r.approval + '%');
    group.appendChild(valueEl);
    if (r.signs.length) {
      group.appendChild(D.svg('text', { x: lx, y: ly + 23, class: 'map-signs', 'text-anchor': anchor },
        r.signs.map(function (x) { return x.icon; }).join(' ')));
    }
    if (pins.length) {
      const pinY = ly - 22;
      pins.slice(0, 3).forEach(function (card, i) {
        group.appendChild(D.svg('circle', { cx: lx - 14 + i * 12, cy: pinY, r: 6, class: 'map-pin' + (card.urgent ? ' urgent' : '') }));
        group.appendChild(D.svg('text', { x: lx - 14 + i * 12, y: pinY + 3, class: 'map-pin-icon', 'text-anchor': 'middle' }, card.icon || '•'));
      });
    }
    groupEls[r.name] = group;
    pathEls[r.name] = path;
    valueEls[r.name] = valueEl;
    return group;
  }

  function render() {
    if (!root) return;
    const pins = pinsByRegion();
    const board = D.svg('svg', {
      viewBox: '0 0 200 220', class: 'uk-map', role: 'group', 'aria-label': 'Map of Britain. Each region is a button.'
    });
    E.regions().forEach(function (r) {
      if (!MAP_SHAPES[r.name]) return;
      board.appendChild(regionGroup(r, pins[r.name] || []));
    });
    D.replace(root,
      D.h('div', { class: 'panel-head' }, D.h('h2', { text: 'Britain' }), D.h('p', { class: 'muted small', text: 'Tap a region for the story behind the number.' })),
      D.h('div', { class: 'map-wrap' }, board),
      legend());
  }

  function legend() {
    const wrap = D.h('ul', { class: 'map-legend' });
    ['Critical', 'Poor', 'Strained', 'Steady', 'Strong'].forEach(function (k) {
      wrap.appendChild(D.h('li', null,
        D.h('span', { class: 'swatch', style: { background: F.fillFor(k) }, 'aria-hidden': 'true' }),
        D.h('span', { text: k })));
    });
    return wrap;
  }

  function setRegion(name, approval) {
    const path = pathEls[name], valueEl = valueEls[name], group = groupEls[name];
    if (path) path.setAttribute('fill', F.fillForValue(approval));
    if (valueEl) valueEl.textContent = Math.round(approval) + '%';
    if (group) group.setAttribute('data-approval', String(Math.round(approval)));
  }

  function pulse(name, dir) {
    const el = groupEls[name];
    if (!el) return;
    D.pulse(el, dir === 'up' ? 'pulse-up' : dir === 'down' ? 'pulse-down' : 'pulse');
  }

  function openRegion(name) {
    const r = E.regionDetail(name);
    const pts = function (n) { return n + ' point' + (n === 1 ? '' : 's'); };
    const trend = r.delta > 0 ? 'Up ' + pts(r.delta) + ' since last quarter'
                : r.delta < 0 ? 'Down ' + pts(Math.abs(r.delta)) + ' since last quarter'
                : 'Unchanged since last quarter';
    const body = [
      D.h('p', { class: 'region-story', text: r.story }),
      D.h('ul', { class: 'stat-list' },
        D.h('li', null, D.h('span', {}, 'Approval here'), D.h('b', { text: r.approval + '%' })),
        D.h('li', null, D.h('span', {}, 'Trend'), D.h('b', { text: trend })),
        D.h('li', null, D.h('span', {}, 'Conditions'), D.h('b', { text: r.status }))),
      r.signs.length ? D.h('h3', { text: 'What you would notice there' }) : null,
      r.signs.length ? D.h('ul', { class: 'sign-list' }, r.signs.map(function (x) {
        return D.h('li', null, D.icon(x.icon), D.h('span', { text: x.label }));
      })) : null,
      D.h('h3', { text: 'What this place cares about' }),
      D.h('ul', { class: 'sign-list drivers' }, r.drivers.map(function (d) {
        return D.h('li', null, D.h('b', { text: d.name }), D.h('span', { text: d.value + '/100' }));
      }))
    ];
    B.open({ title: r.name, eyebrow: 'BRITAIN', body: body });
  }

  return { mount: mount, render: render, setRegion: setRegion, pulse: pulse, openRegion: openRegion };
})();
