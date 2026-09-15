/* Phase 3A verification: strategic feedback and one-click decision handling.
   Serve your-move-prime-minister/ externally and set CHECK_BASE_URL. */
'use strict';
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.CHECK_BASE_URL || 'http://127.0.0.1:8794/';
let failures = 0;
function ok(name, cond, detail) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  (' + detail + ')' : ''));
  if (!cond) failures++;
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', function (e) { pageErrors.push(String(e)); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
  await page.waitForTimeout(150);

  /* Promise chips should now be strategic drill-downs, not passive labels. */
  const promise = page.locator('.promise-chip').first();
  await promise.click();
  await page.waitForSelector('[role=dialog]', { state: 'visible' });
  const promiseText = await page.locator('[role=dialog]').innerText();
  ok('promise chip opens progress view', /YOUR PROMISE/i.test(promiseText) && /Election target/i.test(promiseText), promiseText.slice(0, 120));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);

  /* Region labels should communicate direction, not only the approval level. */
  const mapText = await page.locator('.map-value').first().innerText();
  ok('map shows a visible regional trend arrow', /[↑↓→]/.test(mapText), mapText);

  /* If cards are left, the run area names the consequence before the click. */
  await page.evaluate(function () { YM.debug.forceAgenda(['rates', 'energy']); });
  await page.waitForTimeout(100);
  const runArea = await page.locator('.desk-run').innerText();
  ok('desk explicitly warns about unanswered items', /leave these unanswered/i.test(runArea) && /will worsen if ignored/i.test(runArea), runArea.slice(0, 180));

  /* Regression for the audit finding: a normal rates choice must resolve on one click. */
  await page.locator('.desk-card-btn[data-event-id="rates"]').click();
  await page.waitForSelector('[role=dialog] .choice', { state: 'visible' });
  const before = await page.evaluate(function () { return Engine.state.actionsLeft; });
  await page.locator('[role=dialog] .choice').first().click();
  await page.waitForTimeout(100);
  const after = await page.evaluate(function () { return Engine.state.actionsLeft; });
  const outcome = await page.locator('[role=dialog]').innerText();
  ok('Respect the Bank resolves on one click', /PM BACKS INDEPENDENT BANK/i.test(outcome), outcome.slice(0, 140));
  ok('one rates click spends exactly one card cost', before - after === 1, 'before=' + before + ' after=' + after);

  await page.locator('[role=dialog] .btn.big.block').click();
  await page.waitForTimeout(100);
  const doneText = await page.locator('.desk-card.done[data-event-id="rates"]').innerText();
  ok('resolved rates card is recorded as done', /Chosen: Respect the Bank/i.test(doneText), doneText);

  /* Dial history and live movement should expose signed deltas. */
  await page.evaluate(function () {
    const el = document.querySelector('.dial[data-key="economy"]');
    el.setAttribute('data-value', '50');
    YM.dials.setDial('economy', 55);
  });
  const trend = await page.locator('.dial[data-key="economy"] .dial-trend').innerText();
  ok('dial movement shows a signed delta', /\+5/.test(trend), trend);

  ok('zero pageerrors', pageErrors.length === 0, pageErrors.join(' | '));

  await context.close();
  await browser.close();
  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'ALL PASS'));
  process.exit(failures ? 1 : 0);
}

main().catch(function (e) { console.error(e); process.exit(1); });
