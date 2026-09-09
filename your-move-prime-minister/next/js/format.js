/* Words and numbers the way the player reads them. */

window.YM = window.YM || {};
YM.fmt = (function () {
  'use strict';
  const E = window.Engine;

  const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
  function year(turn) { return Math.ceil(turn / 4); }
  function season(turn) { return SEASONS[(turn - 1) % 4]; }
  /* "Year 2, Autumn" */
  function when(turn) { return 'Year ' + year(turn) + ', ' + season(turn); }
  /* "13 quarters to the election" / "The election is this quarter" */
  function countdown(turn) {
    const left = E.TURNS - turn;
    if (left <= 0) return 'The election is this quarter';
    if (left === 1) return 'One quarter to the election';
    return left + ' quarters to the election';
  }

  /* Plain-English names for the four currencies. The engine's names are
     kept as aria descriptions so the numbers still mean the same thing. */
  const STAT = {
    approval:   { name: 'Approval',      short: 'Approval', unit: '%',  help: 'How the country rates the government' },
    headroom:   { name: 'Spare money',   short: 'Money',    unit: 'bn', help: 'Fiscal headroom: what you can spend without borrowing' },
    party:      { name: 'Your MPs',      short: 'MPs',      unit: '%',  help: 'Party unity: how far your own side will follow you' },
    confidence: { name: 'Market confidence', short: 'Markets', unit: '%', help: 'What lenders think of your books' }
  };
  /* Change lists use the engine's names; map them to the player-facing ones. */
  const ENGINE_TO_STAT = { 'Approval': 'approval', 'Fiscal headroom': 'headroom', 'Your party': 'party', 'Market confidence': 'confidence' };
  function statName(engineName) {
    const k = ENGINE_TO_STAT[engineName];
    return k ? STAT[k].name : engineName;
  }

  function money(n) { return E.money(n); }
  function signed(n, unit) {
    const r = Math.round(n);
    const sign = r > 0 ? '+' : (r < 0 ? '−' : '');
    if (unit === 'bn') return sign + '£' + Math.abs(r) + 'bn';
    return sign + Math.abs(r) + (unit || '');
  }
  /* "NHS 28 → 32 (+4)" / "Spare money £24bn → £17bn" */
  function deltaText(c) {
    const isMoney = c.unit === 'bn' || c.name === 'Fiscal headroom';
    if (isMoney) return statName(c.name) + ' ' + money(c.from) + ' → ' + money(c.to);
    return statName(c.name) + ' ' + c.from + ' → ' + c.to + ' (' + signed(c.delta) + ')';
  }
  /* "+4 NHS" — the compact version for chips and callouts. */
  function deltaChip(c) {
    const isMoney = c.unit === 'bn' || c.name === 'Fiscal headroom';
    return (isMoney ? signed(c.delta, 'bn') : signed(c.delta)) + ' ' + statName(c.name);
  }

  /* Region fills: light enough to take dark labels. Colour is never the only
     signal — every region also states its name and status in words. */
  const CONDITION_FILL = {
    Critical: '#c96a6a', Poor: '#cf9256', Strained: '#c9b45f', Steady: '#6fbf90', Strong: '#8ad6a8'
  };
  function fillFor(status) { return CONDITION_FILL[status] || '#c9b45f'; }
  function fillForValue(v) {
    if (v >= 70) return CONDITION_FILL.Strong;
    if (v >= 55) return CONDITION_FILL.Steady;
    if (v >= 42) return CONDITION_FILL.Strained;
    if (v >= 28) return CONDITION_FILL.Poor;
    return CONDITION_FILL.Critical;
  }

  const DIAL_KEYS = ['health', 'housing', 'economy', 'crime', 'energy', 'transport'];
  const DIAL_ICON = { health: '🏥', housing: '🏠', economy: '📈', crime: '🚔', energy: '⚡', transport: '🚆', services: '🏫' };
  const REGION_NOUN = { Scotland: 'Scotland', North: 'the North', Midlands: 'the Midlands', Wales: 'Wales', London: 'London', South: 'the South' };

  function trendArrow(delta) { return delta > 0 ? '↑' : (delta < 0 ? '↓' : '→'); }
  function trendWord(delta) { return delta > 0 ? 'improving' : (delta < 0 ? 'worsening' : 'steady'); }

  return { when: when, year: year, season: season, countdown: countdown, STAT: STAT, statName: statName,
           money: money, signed: signed, deltaText: deltaText, deltaChip: deltaChip,
           fillFor: fillFor, fillForValue: fillForValue, CONDITION_FILL: CONDITION_FILL,
           DIAL_KEYS: DIAL_KEYS, DIAL_ICON: DIAL_ICON, REGION_NOUN: REGION_NOUN,
           trendArrow: trendArrow, trendWord: trendWord };
})();
