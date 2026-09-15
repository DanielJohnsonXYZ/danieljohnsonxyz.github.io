/* M1+M2 Playwright verification. Serves the app externally (see the spec /
   README for the server command) and drives it at two viewport sizes.
   Prints PASS/FAIL per check and exits non-zero on any failure. */
'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.CHECK_BASE_URL || 'http://127.0.0.1:8790/';
const ROOT = path.join(__dirname, '..');

let failures = 0;
function ok(name, cond, detail) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  (' + detail + ')' : ''));
  if (!cond) failures++;
}

/* Resolve every open (not-done) card on the desk this quarter, choosing the
   first affordable option; hold any vote that comes up. Records whether a
   vote happened via the mutable `state` object passed in. */
async function resolveOpenCards(page, state) {
  const ids = await page.evaluate(() => Engine.state.agenda.filter(function (a) { return !a.done; }).map(function (a) { return a.eventId; }));
  for (const id of ids) {
    const stillThere = await page.locator('.desk-card-btn[data-event-id="' + id + '"]').count();
    if (!stillThere) continue;
    const actionsLeft = await page.evaluate(() => Engine.state.actionsLeft);
    if (actionsLeft <= 0) break;

    await page.locator('.desk-card-btn[data-event-id="' + id + '"]').click();
    await page.waitForSelector('[role=dialog]', { state: 'visible' });
    const affordable = await page.locator('[role=dialog] .choice[data-affordable="true"]').count();
    if (!affordable) { await page.keyboard.press('Escape'); await page.waitForTimeout(30); continue; }

    await page.locator('[role=dialog] .choice[data-affordable="true"]').first().click();
    await page.waitForTimeout(60);

    const billOpen = await page.evaluate(() => !!Engine.state.bill);
    if (billOpen) {
      state.voteHappened = true;
      await page.getByRole('button', { name: 'Hold the vote' }).click();
      await page.waitForTimeout(60);
    }
    const resolved = await page.locator('[role=dialog] .outcome-strip').count();
    if (resolved) await page.getByRole('button', { name: 'Back to the desk' }).click();
    else await page.keyboard.press('Escape'); // blocked (out of actions/money this turn) — move on
    await page.waitForTimeout(40);
  }
}

async function playFullTerm(page) {
  const state = { voteHappened: false };
  let scorecards = 0;
  for (let guard = 0; guard < 25; guard++) {
    await resolveOpenCards(page, state);
    await page.locator('#run-btn').click();
    await page.waitForSelector('#scorecard', { state: 'visible', timeout: 10000 });
    scorecards++;
    const isFinal = await page.evaluate(() => !!(Engine.state.lastReport && Engine.state.lastReport.final));
    if (isFinal) {
      /* M5: the final quarter's scorecard hands off to election night
         instead of closing to the desk — its button reads "To the count". */
      await page.getByRole('button', { name: 'To the count' }).click();
      await page.waitForSelector('body[data-phase="election"]', { timeout: 10000 });
      const skip = page.locator('#skip-election');
      if (await skip.count()) await skip.click();
      await page.waitForSelector('#verdict', { state: 'visible', timeout: 10000 });
      break;
    }
    await page.getByRole('button', { name: 'Next quarter' }).click();
    await page.waitForTimeout(50);
  }
  return { scorecards: scorecards, voteHappened: state.voteHappened };
}

async function runSuite(browser, vp) {
  const label = vp.w + 'x' + vp.h;
  console.log('\n== ' + label + ' ==');

  /* ---- checks 1-5, 7: title, take office, sync, dials, card, reload ---- */
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', function (e) { pageErrors.push(String(e)); });

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(200);

  // 1. loads clean, title visible, HUD hidden
  const titleVisible = await page.locator('#title').isVisible();
  const hudHiddenAtStart = await page.locator('#hud').isHidden();
  ok(label + ' 1. clean load: title visible, HUD hidden, no pageerrors',
     pageErrors.length === 0 && titleVisible && hudHiddenAtStart,
     'pageerrors=' + pageErrors.length);

  // 2. Take office -> HUD/map/dials/desk visible, 6 regions, 6 dials, synced
  // (YM.debug.newGame, not the title's "Take office" — that now opens onto
  // the M4 tutorial, which this suite of checks is not exercising.)
  await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 1); });
  await page.waitForTimeout(200);
  const hudVisible = await page.locator('#hud').isVisible();
  const appVisible = await page.locator('#app').isVisible();
  const regionCount = await page.locator('.region[data-region]').count();
  const dialCount = await page.locator('.dial[data-key]').count();
  const synced1 = await page.evaluate(function () { try { return YM.debug.assertSynced(); } catch (e) { return e.message; } });
  ok(label + ' 2. Take office reveals the scene, 6 regions, 6 dials, assertSynced',
     hudVisible && appVisible && regionCount === 6 && dialCount === 6 && synced1 === true,
     'regions=' + regionCount + ' dials=' + dialCount + ' synced=' + synced1);

  // 3. dial headlines match the engine
  const dialProblems = await page.evaluate(function () {
    const problems = [];
    document.querySelectorAll('.dial[data-key]').forEach(function (el) {
      const key = el.getAttribute('data-key');
      const shown = el.querySelector('.dial-headline').textContent;
      const expect = Engine.readout(key).headline;
      if (shown !== expect) problems.push(key + ': "' + shown + '" != "' + expect + '"');
    });
    return problems;
  });
  ok(label + ' 3. every dial headline equals Engine.readout(key).headline', dialProblems.length === 0, dialProblems.join('; '));

  // Deterministic state for 4/5/7: a seeded game with one simple forced card.
  await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 424242); });
  await page.waitForTimeout(100);
  await page.evaluate(function () { YM.debug.forceAgenda(['nhs_strike']); });
  await page.waitForTimeout(100);

  // 4. open first card -> dialog, >=2 choices, chips; Escape -> gone, focus restored
  const firstBtn = page.locator('.desk-card-btn').first();
  const firstEventId = await firstBtn.getAttribute('data-event-id');
  await firstBtn.click();
  await page.waitForSelector('[role=dialog]', { state: 'visible' });
  const dialogVisible = await page.locator('[role=dialog]').first().isVisible();
  const choiceCount = await page.locator('[role=dialog] .choice').count();
  const chipCount = await page.locator('[role=dialog] .chip').count();
  ok(label + ' 4a. card overlay: dialog + >=2 .choice + chips',
     dialogVisible && choiceCount >= 2 && chipCount > 0,
     'choices=' + choiceCount + ' chips=' + chipCount);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const dialogGone = (await page.locator('[role=dialog]').count()) === 0;
  const focusedId = await page.evaluate(function () { return document.activeElement && document.activeElement.getAttribute('data-event-id'); });
  ok(label + ' 4b. Escape closes the dialog and returns focus to the desk card',
     dialogGone && focusedId === firstEventId, 'focusedId=' + focusedId + ' expected=' + firstEventId);

  // 5. reopen, choose first affordable -> outcome-strip w/ lastOutcome headline; Back closes; desk shows done; synced
  await firstBtn.click();
  await page.waitForSelector('[role=dialog]', { state: 'visible' });
  await page.locator('[role=dialog] .choice[data-affordable="true"]').first().click();
  await page.waitForTimeout(150);
  const outcomeVisible = await page.locator('[role=dialog] .outcome-strip').isVisible();
  const headlineMatches = await page.evaluate(function () {
    const el = document.querySelector('[role=dialog] .outcome-strip h3');
    return !!(el && YM.bus.scene.lastOutcome && el.textContent === YM.bus.scene.lastOutcome.headline);
  });
  ok(label + ' 5a. choosing resolves in place: .outcome-strip headline == lastOutcome.headline',
     outcomeVisible && headlineMatches);

  await page.getByRole('button', { name: 'Back to the desk' }).click();
  await page.waitForTimeout(150);
  const dialogGone2 = (await page.locator('[role=dialog]').count()) === 0;
  const cardDone = await page.evaluate(function (id) { return !!document.querySelector('.desk-card.done[data-event-id="' + id + '"]'); }, firstEventId);
  const synced2 = await page.evaluate(function () { try { return YM.debug.assertSynced(); } catch (e) { return e.message; } });
  ok(label + ' 5b. Back to the desk closes it, card shows done, assertSynced',
     dialogGone2 && cardDone && synced2 === true, 'synced=' + synced2);

  // 7. reload mid-term (after turn 3): desk resumes at the same turn with the same cards
  for (let i = 0; i < 3; i++) {
    await page.locator('#run-btn').click();
    await page.waitForSelector('#scorecard', { state: 'visible' });
    await page.getByRole('button', { name: 'Next quarter' }).click();
    await page.waitForTimeout(80);
  }
  const before = await page.evaluate(function () {
    return { turn: Engine.state.turn, ids: Engine.state.agenda.map(function (a) { return a.eventId; }).sort() };
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(250);
  const after = await page.evaluate(function () {
    return { turn: Engine.state.turn, ids: Engine.state.agenda.map(function (a) { return a.eventId; }).sort() };
  });
  const deskVisibleAfterReload = await page.locator('#desk').isVisible();
  ok(label + ' 7. reload mid-term resumes the same turn and the same agenda',
     before.turn >= 4 && before.turn === after.turn && JSON.stringify(before.ids) === JSON.stringify(after.ids) && deskVisibleAfterReload,
     'before=' + JSON.stringify(before) + ' after=' + JSON.stringify(after));

  ok(label + ' (1-5,7) zero pageerrors throughout', pageErrors.length === 0, pageErrors.join(' | '));
  await context.close();

  /* ---------------------------- check 6: a full term, fresh context ---- */
  const context2 = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page2 = await context2.newPage();
  const pageErrors2 = [];
  page2.on('pageerror', function (e) { pageErrors2.push(String(e)); });
  await page2.goto(BASE, { waitUntil: 'load' });
  await page2.waitForTimeout(150);
  await page2.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 2); });
  await page2.waitForTimeout(150);

  const result = await playFullTerm(page2);
  const electionRows = await page2.locator('#results .results-row').count();
  ok(label + ' 6. a full term: scorecard x20, a vote happened, election lists 6 regions, no pageerrors',
     result.scorecards === 20 && result.voteHappened && electionRows === 6 && pageErrors2.length === 0,
     'scorecards=' + result.scorecards + ' vote=' + result.voteHappened + ' rows=' + electionRows + ' errors=' + pageErrors2.length);

  await context2.close();
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    await runSuite(browser, { w: 1280, h: 800 });
    await runSuite(browser, { w: 390, h: 844 });
  } finally {
    await browser.close();
  }

  // 8. no innerHTML anywhere in js/*.js
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
  ok('8. grep -c "innerHTML" js/*.js is 0 for every file', allZero, grepOut.trim().replace(/\n/g, ', '));

  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'ALL PASS'));
  process.exit(failures ? 1 : 0);
}

main().catch(function (e) { console.error(e); process.exit(1); });
