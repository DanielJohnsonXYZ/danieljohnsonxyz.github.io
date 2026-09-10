/* M5 Playwright verification: election night. Serves next/ externally (see
   the spec / README for the server command) and drives it at two viewport
   sizes with a cleared localStorage each time. Prints PASS/FAIL per check
   and exits non-zero on any failure. */
'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.CHECK_BASE_URL || 'http://127.0.0.1:8793/';
const ROOT = path.join(__dirname, '..');

let failures = 0;
function ok(name, cond, detail) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  (' + detail + ')' : ''));
  if (!cond) failures++;
}

/* Gets the election card to turn 20's desk, answers it (any choice), then
   returns to the desk with #run-btn reading "Face the voters". */
async function decideElectionCard(page) {
  await page.locator('.desk-card-btn[data-event-id="election"]').click();
  await page.waitForSelector('[role=dialog] .choices', { state: 'visible' });
  await page.locator('[role=dialog] .choice').first().click();
  await page.waitForSelector('[role=dialog] .outcome-strip', { state: 'visible' });
  await page.getByRole('button', { name: 'Back to the desk' }).click();
  await page.waitForTimeout(80);
}

async function runSuite(browser, vp) {
  const label = vp.w + 'x' + vp.h;
  console.log('\n== ' + label + ' ==');

  /* --------------------------------------------------- checks 1, 3, 4, 6 */
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', function (e) { pageErrors.push(String(e)); });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
  await page.evaluate(function () { YM.debug.runToTurn(20); });
  await page.waitForTimeout(100);

  await decideElectionCard(page);
  const runLabel2 = (await page.locator('#run-btn').textContent() || '').trim();
  await page.locator('#run-btn').click();
  await page.waitForSelector('#scorecard', { state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'To the count' }).click();
  await page.waitForSelector('body[data-phase="election"]', { timeout: 5000 });

  const phase1 = await page.evaluate(function () { return document.body.dataset.phase; });
  const resultsVisible = await page.locator('#results').isVisible();
  const rowCount1 = await page.locator('#results .results-row').count();

  /* Reduced motion finishes the whole count immediately (check 7 proper,
     with real timing, runs further down) — verdict should already be open. */
  await page.waitForSelector('#verdict', { state: 'visible', timeout: 1000 });
  const finalSeatsReduced = await page.evaluate(function () { return Engine.finish().seats; });
  const valuenowReduced = Number(await page.locator('.seats-bar').getAttribute('aria-valuenow'));

  ok(label + ' 1. election card decided, "To the count" reaches body[data-phase=election] with #results and six rows',
     /Face the voters/.test(runLabel2) && phase1 === 'election' && resultsVisible && rowCount1 === 6 &&
     valuenowReduced === finalSeatsReduced,
     'run-btn(20)="' + runLabel2 + '" phase=' + phase1 + ' results=' + resultsVisible + ' rows=' + rowCount1 +
     ' valuenow=' + valuenowReduced + ' finalSeats=' + finalSeatsReduced);

  /* ------------------------------------------------------------------ 3 */
  const verdictText = await page.locator('#verdict').innerText();
  const definingCount = await page.locator('#verdict .defining-item').count();
  const expectedDefining = await page.evaluate(function () { return Engine.finish().defining.length; });
  const legacy = await page.evaluate(function () { return Engine.finish().legacy; });
  const readoutCount = await page.locator('#verdict .readout-row').count();
  const promiseChipCount = await page.locator('#verdict .promise-row').count();
  const regionTableRows = await page.locator('#verdict .seats-table tbody tr').count();

  ok(label + ' 3. #verdict contains seats/legacy text, the right number of defining decisions, six readouts, three promise chips, six region rows',
     /of 650 seats/.test(verdictText) && verdictText.indexOf(legacy) >= 0 &&
     definingCount === expectedDefining && readoutCount === 6 && promiseChipCount === 3 && regionTableRows === 6,
     'defining=' + definingCount + '/' + expectedDefining + ' readouts=' + readoutCount +
     ' promises=' + promiseChipCount + ' regionRows=' + regionTableRows);

  /* ------------------------------------------------------------------ 4 */
  await page.getByRole('button', { name: 'Look at the map' }).click();
  await page.waitForTimeout(80);
  const verdictGoneAfterLook = (await page.locator('#verdict').count()) === 0;
  const resultsStillThere = await page.locator('#results').isVisible();
  await page.getByRole('button', { name: 'Back to the result' }).click();
  await page.waitForTimeout(80);
  const verdictBackOpen = await page.locator('#verdict').isVisible();
  ok(label + ' 4. "Look at the map" closes the verdict but keeps #results; "Back to the result" reopens it',
     verdictGoneAfterLook && resultsStillThere && verdictBackOpen,
     'goneAfterLook=' + verdictGoneAfterLook + ' resultsStill=' + resultsStillThere + ' backOpen=' + verdictBackOpen);

  /* ------------------------------------------------------------------ 6 */
  await page.getByRole('button', { name: 'Play again' }).click();
  await page.waitForTimeout(100);
  const phaseAfterAgain = await page.evaluate(function () { return document.body.dataset.phase; });
  const hasSaveAfter = await page.evaluate(function () { return Engine.hasSave(); });
  ok(label + ' 6. "Play again" returns to the title screen and clears the save',
     phaseAfterAgain === 'title' && hasSaveAfter === false,
     'phase=' + phaseAfterAgain + ' hasSave=' + hasSaveAfter);

  ok(label + ' zero pageerrors (checks 1,3,4,6)', pageErrors.length === 0, pageErrors.join(' | '));
  await context.close();

  /* ------------------------------------------------------------------ 2
     Normal motion: watch a live region declare, then skip. Fresh context
     so this game's timing is not polluted by the reduced-motion run above. */
  const context2 = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page2 = await context2.newPage();
  const pageErrors2 = [];
  page2.on('pageerror', function (e) { pageErrors2.push(String(e)); });

  await page2.goto(BASE, { waitUntil: 'load' });
  await page2.waitForTimeout(150);
  await page2.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
  await page2.evaluate(function () { YM.debug.runToTurn(20); });
  await page2.waitForTimeout(100);
  await decideElectionCard(page2);
  await page2.locator('#run-btn').click();
  await page2.waitForSelector('#scorecard', { state: 'visible', timeout: 12000 });
  await page2.getByRole('button', { name: 'To the count' }).click();
  await page2.waitForSelector('body[data-phase="election"]', { timeout: 5000 });

  await page2.waitForTimeout(3000);
  const declaredAt3s = await page2.locator('#results .results-row.declared').count();
  const valuenowAt3s = Number(await page2.locator('.seats-bar').getAttribute('aria-valuenow'));
  ok(label + ' 2a. normal motion, ~3s in: at least one region declared and the bar has moved',
     declaredAt3s >= 1 && valuenowAt3s > 0, 'declared=' + declaredAt3s + ' aria-valuenow=' + valuenowAt3s);

  const skipT0 = Date.now();
  await page2.locator('#skip-election').click();
  await page2.waitForSelector('#verdict', { state: 'visible', timeout: 1000 });
  const skipMs = Date.now() - skipT0;
  const declaredAfterSkip = await page2.locator('#results .results-row.declared').count();
  const finalSeats = await page2.evaluate(function () { return Engine.finish().seats; });
  const valuenowAfterSkip = await page2.locator('.seats-bar').getAttribute('aria-valuenow');
  ok(label + ' 2b. #skip-election: within 300ms all six rows filled, aria-valuenow equals final.seats, #verdict open',
     skipMs <= 300 && declaredAfterSkip === 6 && Number(valuenowAfterSkip) === finalSeats,
     'ms=' + skipMs + ' declared=' + declaredAfterSkip + ' valuenow=' + valuenowAfterSkip + ' finalSeats=' + finalSeats);

  ok(label + ' zero pageerrors (check 2)', pageErrors2.length === 0, pageErrors2.join(' | '));
  await context2.close();

  /* ------------------------------------------------------------------ 5
     Reload straight into a finished game: results + verdict immediately. */
  const context5 = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page5 = await context5.newPage();
  const pageErrors5 = [];
  page5.on('pageerror', function (e) { pageErrors5.push(String(e)); });
  await page5.emulateMedia({ reducedMotion: 'reduce' });
  await page5.goto(BASE, { waitUntil: 'load' });
  await page5.waitForTimeout(150);
  await page5.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 7); });
  await page5.evaluate(function () { YM.debug.runToTurn(20); });
  await page5.waitForTimeout(80);
  await decideElectionCard(page5);
  await page5.locator('#run-btn').click();
  await page5.waitForSelector('#scorecard', { state: 'visible', timeout: 5000 });
  await page5.getByRole('button', { name: 'To the count' }).click();
  await page5.waitForSelector('#verdict', { state: 'visible', timeout: 5000 });

  await page5.reload({ waitUntil: 'load' });
  await page5.waitForTimeout(250);
  const phase5 = await page5.evaluate(function () { return document.body.dataset.phase; });
  const results5 = await page5.locator('#results').isVisible();
  const verdict5 = await page5.locator('#verdict').isVisible();
  const rows5 = await page5.locator('#results .results-row.declared').count();
  ok(label + ' 5. reload after the term ended: straight to #results + #verdict',
     phase5 === 'election' && results5 && verdict5 && rows5 === 6,
     'phase=' + phase5 + ' results=' + results5 + ' verdict=' + verdict5 + ' declaredRows=' + rows5);
  ok(label + ' 5. zero pageerrors', pageErrors5.length === 0, pageErrors5.join(' | '));
  await context5.close();

  /* ------------------------------------------------------------------ 7
     Reduced motion: the whole count finishes within 300ms of "To the count". */
  const context7 = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page7 = await context7.newPage();
  const pageErrors7 = [];
  page7.on('pageerror', function (e) { pageErrors7.push(String(e)); });
  await page7.emulateMedia({ reducedMotion: 'reduce' });
  await page7.goto(BASE, { waitUntil: 'load' });
  await page7.waitForTimeout(150);
  await page7.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
  await page7.evaluate(function () { YM.debug.runToTurn(20); });
  await page7.waitForTimeout(80);
  await decideElectionCard(page7);
  await page7.locator('#run-btn').click();
  await page7.waitForSelector('#scorecard', { state: 'visible', timeout: 5000 });
  const t0 = Date.now();
  await page7.getByRole('button', { name: 'To the count' }).click();
  await page7.waitForSelector('#verdict', { state: 'visible', timeout: 1000 });
  const ms7 = Date.now() - t0;
  ok(label + ' 7. reduced motion: the whole count finishes within 300ms', ms7 <= 300, 'ms=' + ms7);
  ok(label + ' 7. zero pageerrors', pageErrors7.length === 0, pageErrors7.join(' | '));
  await context7.close();
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    await runSuite(browser, { w: 1280, h: 800 });
    await runSuite(browser, { w: 390, h: 844 });
  } finally {
    await browser.close();
  }

  /* ------------------------------------------------------------ 8a --- */
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
  ok('8a. grep -c innerHTML js/*.js is 0 for every file', allZero, grepOut.trim().replace(/\n/g, ', '));

  /* ------------------------------------------------------------ 8b-d --- */
  function runCheck(name, script, matchAllOk) {
    let pass = false;
    try {
      const out = execSync('node ' + script, { cwd: ROOT, env: Object.assign({}, process.env, { CHECK_BASE_URL: BASE }), stdio: 'pipe' }).toString();
      pass = matchAllOk ? /ALL OK/.test(out) : true;
      if (!pass) console.log(out);
    } catch (e) {
      console.log((e.stdout || '').toString());
      console.log((e.stderr || '').toString());
      pass = false;
    }
    ok(name, pass);
  }
  runCheck('8b. node tools/check-m2.js still passes', 'tools/check-m2.js', false);
  runCheck('8c. node tools/check-m3.js still passes', 'tools/check-m3.js', false);
  runCheck('8d. node tools/check-m4.js still passes', 'tools/check-m4.js', false);
  runCheck('8e. node tools/timeline-check.js prints ALL OK', 'tools/timeline-check.js', true);

  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'ALL PASS'));
  process.exit(failures ? 1 : 0);
}

main().catch(function (e) { console.error(e); process.exit(1); });
