/* M4 Playwright verification: onboarding — learn by governing. Serves next/
   externally (see the spec / README for the server command) and drives it
   at two viewport sizes with a cleared localStorage each time. Prints
   PASS/FAIL per check and exits non-zero on any failure. */
'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.CHECK_BASE_URL || 'http://127.0.0.1:8792/';
const ROOT = path.join(__dirname, '..');

let failures = 0;
function ok(name, cond, detail) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  (' + detail + ')' : ''));
  if (!cond) failures++;
}

/* Escape is one of the three ways a coach mark is dismissed (the others
   being its own "Got it" button and the next coach mark taking over) — used
   here just to clear whatever is queued between steps so it never sits over
   an element a later step needs to click. */
async function drainCoach(page, max) {
  for (let i = 0; i < (max || 6); i++) {
    const visible = await page.locator('#coach').isVisible().catch(function () { return false; });
    if (!visible) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(30);
  }
}

async function runSuite(browser, vp) {
  const label = vp.w + 'x' + vp.h;
  console.log('\n== ' + label + ' ==');

  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' }); // needed for check 6; harmless for 1-5,7
  const pageErrors = [];
  page.on('pageerror', function (e) { pageErrors.push(String(e)); });

  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(150);

  /* --------------------------------------------------------------- 1 --- */
  await page.getByRole('button', { name: 'Take office' }).click();
  await page.waitForSelector('[role=dialog]', { state: 'visible' });
  const hudVisible = await page.locator('#hud').isVisible();
  const appVisible = await page.locator('#app').isVisible();
  const dialogTitle = await page.locator('[role=dialog] .overlay-title').first().textContent();
  const runDisabled1 = await page.locator('#run-btn').isDisabled();
  ok(label + ' 1. Take office: HUD/app visible, card auto-opens on "NHS STRIKE", #run-btn disabled',
     hudVisible && appVisible && /NHS STRIKE/.test(dialogTitle || '') && runDisabled1,
     'title=' + dialogTitle);

  /* --------------------------------------------------------------- 2 --- */
  const coachVisible = await page.locator('#coach').isVisible();
  const gotIt = page.locator('#coach .coach-bubble button', { hasText: 'Got it' });
  const gotItCount = await gotIt.count();
  ok(label + ' 2a. a coach mark is visible with a "Got it" button', coachVisible && gotItCount === 1);

  await gotIt.click();
  await page.waitForTimeout(50);
  const seenAfterGotIt = await page.evaluate(function () { return Engine.onboarding().seen; });
  ok(label + ' 2b. clicking "Got it" marks the shown key (chips) seen', seenAfterGotIt.chips === true,
     'seen=' + JSON.stringify(seenAfterGotIt));

  await drainCoach(page);

  /* --------------------------------------------------------------- 3 --- */
  await page.locator('[role=dialog] .choice').first().click();
  await page.waitForSelector('[role=dialog] .outcome-strip', { state: 'visible' });
  await page.getByRole('button', { name: 'Back to the desk' }).click();
  await page.waitForTimeout(150);
  const stage3 = await page.evaluate(function () { return Engine.onboarding().stage; });
  const partyChairVisible = await page.locator('.desk-card.party-chair').isVisible();
  const partyChairText = await page.locator('.party-chair .desk-card-title').textContent();
  const runDisabled3 = await page.locator('#run-btn').isDisabled();
  ok(label + ' 3. after the strike resolves: stage=promises, Party Chair card on the desk, #run-btn disabled',
     stage3 === 'promises' && partyChairVisible && /PARTY CHAIR/.test(partyChairText || '') && runDisabled3,
     'stage=' + stage3 + ' title=' + partyChairText);

  await drainCoach(page);

  /* --------------------------------------------------------------- 4 --- */
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(200);
  const stage4 = await page.evaluate(function () { return Engine.onboarding().stage; });
  const partyChairAfterReload = await page.locator('.desk-card.party-chair').isVisible();
  const dialogAfterReload = await page.locator('[role=dialog]').count();
  ok(label + ' 4. reload: still stage=promises, Party Chair card present, no card auto-open',
     stage4 === 'promises' && partyChairAfterReload && dialogAfterReload === 0,
     'stage=' + stage4 + ' dialogs=' + dialogAfterReload);

  /* --------------------------------------------------------------- 5 --- */
  await page.locator('.party-chair .desk-card-btn').click();
  await page.waitForSelector('[role=dialog] .choices', { state: 'visible' });
  await drainCoach(page);
  const optionCount = await page.locator('[role=dialog] .choices .choice').count();
  const confirmBtn = page.getByRole('button', { name: 'Promise these three' });
  const confirmDisabledAt0 = await confirmBtn.isDisabled();

  for (let i = 0; i < 3; i++) {
    await page.locator('[role=dialog] .choices .choice').nth(i).click();
    await page.waitForTimeout(30);
  }
  const counterAt3 = await page.locator('[role=dialog] .muted.small').first().textContent();
  const confirmEnabledAt3 = await confirmBtn.isDisabled();

  // a fourth click on an unselected option is refused (still three)
  await page.locator('[role=dialog] .choices .choice').nth(3).click();
  await page.waitForTimeout(30);
  const counterAfterFourth = await page.locator('[role=dialog] .muted.small').first().textContent();
  const confirmStillEnabled = await confirmBtn.isDisabled();

  ok(label + ' 5a. promises picker: six options, confirm disabled at 0, enabled at 3, refuses a fourth',
     optionCount === 6 && confirmDisabledAt0 && confirmEnabledAt3 === false &&
     /3 of 3/.test(counterAt3 || '') && /3 of 3/.test(counterAfterFourth || '') && confirmStillEnabled === false,
     'options=' + optionCount + ' counterAt3="' + counterAt3 + '" counterAfter4="' + counterAfterFourth + '"');

  await confirmBtn.click();
  await page.waitForTimeout(150);
  const stage5 = await page.evaluate(function () { return Engine.onboarding().stage; });
  const promiseChipCount = await page.locator('.hud-promises .promise-chip').count();
  const runEnabled5 = await page.locator('#run-btn').isEnabled();
  ok(label + ' 5b. confirm: stage=first_run, HUD shows three promise chips, #run-btn enabled',
     stage5 === 'first_run' && promiseChipCount === 3 && runEnabled5,
     'stage=' + stage5 + ' chips=' + promiseChipCount);

  await drainCoach(page);

  /* --------------------------------------------------------------- 6 --- */
  await page.locator('#run-btn').click();
  await page.waitForSelector('#scorecard', { state: 'visible', timeout: 2000 });
  await page.getByRole('button', { name: 'Next quarter' }).click();
  await page.waitForTimeout(100);
  const stage6 = await page.evaluate(function () { return Engine.onboarding().stage; });
  ok(label + ' 6. run the quarter (reduced motion): scorecard appears, closing it sets stage=done',
     stage6 === 'done', 'stage=' + stage6);

  ok(label + ' zero pageerrors through checks 1-6', pageErrors.length === 0, pageErrors.join(' | '));
  await context.close();

  /* --------------------------------------------------------------- 7 --- */
  const context7 = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page7 = await context7.newPage();
  const pageErrors7 = [];
  page7.on('pageerror', function (e) { pageErrors7.push(String(e)); });
  await page7.goto(BASE, { waitUntil: 'load' });
  await page7.waitForTimeout(150);
  await page7.getByRole('button', { name: 'Take office' }).click();
  await page7.waitForSelector('[role=dialog]', { state: 'visible' });
  await page7.waitForSelector('#coach .coach-bubble', { state: 'visible' });
  const focusBefore = await page7.evaluate(function () {
    const a = document.activeElement;
    return a ? (a.id || a.tagName) : null;
  });
  await page7.keyboard.press('Escape');
  await page7.waitForTimeout(60);
  const dialogStillOpen = (await page7.locator('[role=dialog]').count()) === 1;
  const focusAfter = await page7.evaluate(function () {
    const a = document.activeElement;
    return a ? (a.id || a.tagName) : null;
  });
  ok(label + ' 7. Escape dismisses a coach mark (not the card behind it), focus unaffected',
     dialogStillOpen && focusBefore === focusAfter,
     'dialogOpen=' + dialogStillOpen + ' focusBefore=' + focusBefore + ' focusAfter=' + focusAfter);
  ok(label + ' 7. zero pageerrors', pageErrors7.length === 0, pageErrors7.join(' | '));
  await context7.close();

  /* --------------------------------------------------------------- 8 --- */
  const context8 = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page8 = await context8.newPage();
  const pageErrors8 = [];
  page8.on('pageerror', function (e) { pageErrors8.push(String(e)); });
  await page8.goto(BASE, { waitUntil: 'load' });
  await page8.waitForTimeout(150);
  await page8.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
  await page8.waitForTimeout(150);
  const debugState = await page8.evaluate(function () {
    return { stage: Engine.onboarding().stage, agenda: Engine.state.agenda.length };
  });
  ok(label + ' 8. YM.debug.newGame starts a normal game: stage=done, full agenda (>=2 cards)',
     debugState.stage === 'done' && debugState.agenda >= 2, JSON.stringify(debugState));
  ok(label + ' 8. zero pageerrors', pageErrors8.length === 0, pageErrors8.join(' | '));
  await context8.close();
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    await runSuite(browser, { w: 1280, h: 800 });
    await runSuite(browser, { w: 390, h: 844 });
  } finally {
    await browser.close();
  }

  /* ------------------------------------------------------------ 9a --- */
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
  ok('9a. grep -c innerHTML js/*.js is 0 for every file', allZero, grepOut.trim().replace(/\n/g, ', '));

  /* ------------------------------------------------------------ 9b --- */
  let m2Pass = false;
  try {
    execSync('node tools/check-m2.js', { cwd: ROOT, env: Object.assign({}, process.env, { CHECK_BASE_URL: BASE }), stdio: 'pipe' });
    m2Pass = true;
  } catch (e) {
    console.log((e.stdout || '').toString());
    console.log((e.stderr || '').toString());
    m2Pass = false;
  }
  ok('9b. node tools/check-m2.js still passes', m2Pass);

  let m3Pass = false;
  try {
    execSync('node tools/check-m3.js', { cwd: ROOT, env: Object.assign({}, process.env, { CHECK_BASE_URL: BASE }), stdio: 'pipe' });
    m3Pass = true;
  } catch (e) {
    console.log((e.stdout || '').toString());
    console.log((e.stderr || '').toString());
    m3Pass = false;
  }
  ok('9c. node tools/check-m3.js still passes', m3Pass);

  let timelinePass = false, timelineOut = '';
  try {
    timelineOut = execSync('node tools/timeline-check.js', { cwd: ROOT }).toString();
    timelinePass = /ALL OK/.test(timelineOut);
  } catch (e) {
    timelineOut = (e.stdout || '').toString();
    timelinePass = false;
  }
  ok('9d. node tools/timeline-check.js prints ALL OK', timelinePass);

  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'ALL PASS'));
  process.exit(failures ? 1 : 0);
}

main().catch(function (e) { console.error(e); process.exit(1); });
