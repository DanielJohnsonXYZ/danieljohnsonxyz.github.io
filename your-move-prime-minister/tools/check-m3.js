/* M3 Playwright verification: the watched quarter. Serves next/ on 8791 in
   the background (see the spec) and drives it at 1280x800. Prints PASS/FAIL
   per check and exits non-zero on any failure. */
'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.CHECK_BASE_URL || 'http://127.0.0.1:8791/';
const ROOT = path.join(__dirname, '..');

let failures = 0;
function ok(name, cond, detail) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  (' + detail + ')' : ''));
  if (!cond) failures++;
}

/* Decides straight through the engine (as tools/check-m2.js's harness does)
   rather than clicking through the card overlay — but a real decision is
   always followed by a render (card.js does this itself), so this must be
   too, or the desk is left showing stale numbers no player would ever see. */
async function decideFirstCard(page) {
  await page.evaluate(function () {
    const a = Engine.state.agenda.find(function (x) { return !x.done; });
    if (a) Engine.decide(a.eventId, 0);
    YM.bus.render();
  });
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', function (e) { pageErrors.push(String(e)); });

    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(150);

    /* ---------------------------------------------------------- check 1 */
    await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
    await page.waitForTimeout(80);
    await decideFirstCard(page);
    await page.waitForTimeout(80);

    const preApproval = await page.evaluate(function () { return Math.round(Engine.state.approval); });

    await page.locator('#run-btn').click();
    await page.waitForTimeout(50);
    const phaseRunning = await page.evaluate(function () { return document.body.dataset.phase; });
    const tickerVisible = await page.locator('#ticker').isVisible();
    const skipFocused = await page.evaluate(function () {
      const a = document.activeElement;
      return !!a && a.id === 'skip-run';
    });
    ok('1a. run-btn starts the running phase: body[data-phase=running], #ticker visible, #skip-run focused',
       phaseRunning === 'running' && tickerVisible && skipFocused,
       'phase=' + phaseRunning + ' ticker=' + tickerVisible + ' skipFocused=' + skipFocused);

    await page.waitForTimeout(150); // ~200ms since the run-btn click
    const approvalAt200 = await page.evaluate(function () {
      const el = document.querySelector('.hud-stat[data-stat="approval"] .hud-stat-value');
      return el ? el.textContent : null;
    });
    ok('1b. HUD approval still shows the pre-turn value 200ms in (not snapped)',
       approvalAt200 === preApproval + '%', 'shown=' + approvalAt200 + ' pre=' + preApproval + '%');

    await page.waitForSelector('#scorecard', { state: 'visible', timeout: 12000 });
    const synced1 = await page.evaluate(function () { try { return YM.debug.assertSynced(); } catch (e) { return e.message; } });
    ok('1c. #scorecard appears within 12s and assertSynced() passes', synced1 === true, 'synced=' + synced1);

    await page.getByRole('button', { name: 'Next quarter' }).click();
    await page.waitForTimeout(80);

    /* ---------------------------------------------------------- check 2 */
    await decideFirstCard(page);
    await page.waitForTimeout(80);
    await page.locator('#run-btn').click();
    await page.waitForTimeout(1000);
    const t0 = Date.now();
    await page.locator('#skip-run').click();
    await page.waitForSelector('#scorecard', { state: 'visible', timeout: 2000 });
    const skipMs = Date.now() - t0;
    const synced2 = await page.evaluate(function () { try { return YM.debug.assertSynced(); } catch (e) { return e.message; } });
    const domVsEngine = await page.evaluate(function () {
      const problems = [];
      const s = Engine.state;
      [['approval', s.approval], ['headroom', s.headroom], ['party', s.party], ['confidence', Engine.confidence()]].forEach(function (pair) {
        const el = document.querySelector('.hud-stat[data-stat="' + pair[0] + '"]');
        if (Number(el.getAttribute('data-value')) !== Math.round(pair[1])) problems.push('hud ' + pair[0]);
      });
      YM.fmt.DIAL_KEYS.forEach(function (key) {
        const el = document.querySelector('.dial[data-key="' + key + '"]');
        if (Number(el.getAttribute('data-value')) !== Engine.readout(key).value) problems.push('dial ' + key);
      });
      Object.keys(s.regions).forEach(function (name) {
        const el = document.querySelector('.region[data-region="' + name + '"]');
        if (Number(el.getAttribute('data-approval')) !== Engine.regionDetail(name).approval) problems.push('region ' + name);
      });
      return problems;
    });
    ok('2. Skip at ~1s: #scorecard within 300ms, assertSynced() passes, DOM matches engine exactly',
       skipMs <= 300 && synced2 === true && domVsEngine.length === 0,
       'ms=' + skipMs + ' synced=' + synced2 + ' mismatches=' + domVsEngine.join(','));

    await page.getByRole('button', { name: 'Next quarter' }).click();
    await page.waitForTimeout(80);

    /* ---------------------------------------------------------- check 3 */
    await context.close();

    const context3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page3 = await context3.newPage();
    const pageErrors3 = [];
    page3.on('pageerror', function (e) { pageErrors3.push(String(e)); });
    await page3.emulateMedia({ reducedMotion: 'reduce' });
    await page3.goto(BASE, { waitUntil: 'load' });
    await page3.waitForTimeout(150);
    await page3.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 7); });
    await page3.waitForTimeout(80);
    await decideFirstCard(page3);
    await page3.waitForTimeout(80);

    const t3 = Date.now();
    await page3.locator('#run-btn').click();
    await page3.waitForSelector('#scorecard', { state: 'visible', timeout: 1000 });
    const reducedMs = Date.now() - t3;
    const synced3 = await page3.evaluate(function () { try { return YM.debug.assertSynced(); } catch (e) { return e.message; } });
    ok('3. reduced motion: #scorecard within 200ms, assertSynced() passes',
       reducedMs <= 200 && synced3 === true, 'ms=' + reducedMs + ' synced=' + synced3);
    ok('3. reduced motion: zero pageerrors', pageErrors3.length === 0, pageErrors3.join(' | '));
    await context3.close();

    /* ---------------------------------------------------------- check 4 */
    const context4 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page4 = await context4.newPage();
    const pageErrors4 = [];
    page4.on('pageerror', function (e) { pageErrors4.push(String(e)); });
    await page4.goto(BASE, { waitUntil: 'load' });
    await page4.waitForTimeout(150);
    await page4.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 3); });
    await page4.waitForTimeout(80);
    /* Force a delayed effect: fund the standing investment card in full. */
    const investDecided = await page4.evaluate(function () {
      const a = Engine.state.agenda.find(function (x) { return !x.done && x.eventId.indexOf('invest:') === 0; });
      if (!a) return false;
      const r = Engine.decide(a.eventId, 0);
      return !!(r && r.delayed);
    });
    /* Everything else on the desk is left alone on purpose: runToTurn only
       drives YM.run.quarter(), and deciding another card could raise a
       vote, which nothing here can hold. */

    const matured = await page4.evaluate(function () {
      document.body.dataset.motion = 'reduced';
      let guard = 0;
      while ((!Engine.state.lastReport || !Engine.state.lastReport.matured.length) && !Engine.state.bill && guard < 10) {
        guard++;
        YM.debug.runToTurn(Engine.state.turn + 1);
      }
      delete document.body.dataset.motion;
      const rep = Engine.state.lastReport;
      return { found: !!(rep && rep.matured && rep.matured.length), steps: YM.debug.lastSeq() };
    });
    const kinds = matured.steps.map(function (s) { return s.kind; });
    const iMatured = kinds.indexOf('matured');
    const iRegions = kinds.lastIndexOf('regions');
    const iHeadline = kinds.indexOf('headline');
    ok('4. investDecided had a delay', investDecided, 'investDecided=' + investDecided);
    ok('4. YM.debug.lastSeq() has a matured step and a regions step before the headline step',
       matured.found && iMatured >= 0 && iRegions >= 0 && iHeadline >= 0 && iMatured < iHeadline && iRegions < iHeadline,
       'found=' + matured.found + ' kinds=' + JSON.stringify(kinds));
    ok('4. zero pageerrors', pageErrors4.length === 0, pageErrors4.join(' | '));
    await context4.close();

    /* ---------------------------------------------------------- check 5 */
    const context5 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page5 = await context5.newPage();
    const pageErrors5 = [];
    page5.on('pageerror', function (e) { pageErrors5.push(String(e)); });
    await page5.goto(BASE, { waitUntil: 'load' });
    await page5.waitForTimeout(150);
    await page5.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 99); });
    await page5.waitForTimeout(80);
    await decideFirstCard(page5);
    await page5.waitForTimeout(80);
    await page5.locator('#run-btn').click();
    await page5.waitForTimeout(1000);
    await page5.reload({ waitUntil: 'load' });
    await page5.waitForTimeout(300);
    const afterReload = await page5.evaluate(function () {
      return {
        deskVisible: !!document.getElementById('desk') && document.getElementById('desk').offsetParent !== null,
        scorecardOpen: !!document.getElementById('scorecard'),
        turn: Engine.state.turn
      };
    });
    ok('5. reload during a run: desk renders and the scorecard from lastReport is open',
       afterReload.deskVisible && afterReload.scorecardOpen, JSON.stringify(afterReload));
    ok('5. zero pageerrors', pageErrors5.length === 0, pageErrors5.join(' | '));
    await context5.close();

    /* ---------------------------------------------------------- check 6 */
    const context6 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page6 = await context6.newPage();
    const pageErrors6 = [];
    page6.on('pageerror', function (e) { pageErrors6.push(String(e)); });
    await page6.goto(BASE, { waitUntil: 'load' });
    await page6.waitForTimeout(150);
    await page6.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 5); });
    await page6.waitForTimeout(80);
    await decideFirstCard(page6);
    await page6.waitForTimeout(80);

    await page6.locator('#run-btn').focus();
    await page6.keyboard.press('Enter');
    await page6.waitForTimeout(60);
    const focusedAfterEnter = await page6.evaluate(function () { return document.activeElement && document.activeElement.id; });
    await page6.keyboard.press('Enter'); // Skip is focused; Enter activates it
    await page6.waitForSelector('#scorecard', { state: 'visible', timeout: 2000 });
    let tabs = 0, reachedButton = false;
    while (tabs < 30 && !reachedButton) {
      await page6.keyboard.press('Tab');
      tabs++;
      reachedButton = await page6.evaluate(function () {
        const a = document.activeElement;
        return !!a && a.tagName === 'BUTTON' && a.textContent === 'Next quarter';
      });
    }
    await page6.keyboard.press('Enter');
    await page6.waitForTimeout(120);
    const scorecardGone = (await page6.locator('#scorecard').count()) === 0;
    ok('6. keyboard only: Enter on run-btn focuses Skip, Enter on Skip reaches the scorecard, Tab reaches its button, Enter closes it',
       focusedAfterEnter === 'skip-run' && reachedButton && scorecardGone,
       'focusedAfterEnter=' + focusedAfterEnter + ' reachedButton=' + reachedButton + ' scorecardGone=' + scorecardGone);
    ok('6. zero pageerrors', pageErrors6.length === 0, pageErrors6.join(' | '));
    await context6.close();

    ok('7a. zero pageerrors throughout check 1/2', pageErrors.length === 0, pageErrors.join(' | '));
  } finally {
    await browser.close();
  }

  /* ---------------------------------------------------------- check 7 */
  console.log('\n== source check ==');
  let grepOut;
  try {
    grepOut = execSync('grep -c "innerHTML" js/*.js', { cwd: ROOT }).toString();
  } catch (e) {
    grepOut = (e.stdout || '').toString();
  }
  const lines = grepOut.trim().split('\n').filter(Boolean);
  lines.forEach(function (l) { console.log('  ' + l); });
  const allZero = lines.length > 0 && lines.every(function (l) { return /:0$/.test(l); });
  ok('7b. grep -c "innerHTML" js/*.js is 0 for every file', allZero, grepOut.trim().replace(/\n/g, ', '));

  let m2Pass = false;
  try {
    execSync('node tools/check-m2.js', { cwd: ROOT, env: Object.assign({}, process.env, { CHECK_BASE_URL: BASE }), stdio: 'pipe' });
    m2Pass = true;
  } catch (e) {
    console.log((e.stdout || '').toString());
    console.log((e.stderr || '').toString());
    m2Pass = false;
  }
  ok('7c. node tools/check-m2.js still passes', m2Pass);

  let timelinePass = false, timelineOut = '';
  try {
    timelineOut = execSync('node tools/timeline-check.js', { cwd: ROOT }).toString();
    timelinePass = /ALL OK/.test(timelineOut);
  } catch (e) {
    timelineOut = (e.stdout || '').toString();
    timelinePass = false;
  }
  ok('7d. node tools/timeline-check.js prints ALL OK', timelinePass);

  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'ALL PASS'));
  process.exit(failures ? 1 : 0);
}

main().catch(function (e) { console.error(e); process.exit(1); });
