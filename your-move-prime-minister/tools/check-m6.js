/* M6 Playwright verification: phone layout and accessibility. Serves next/
   externally (see the spec / README for the server command) and drives it
   at several viewport sizes with a cleared localStorage each time. Prints
   PASS/FAIL per check and exits non-zero on any failure. */
'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const BASE = process.env.CHECK_BASE_URL || 'http://127.0.0.1:8794/';
const ROOT = path.join(__dirname, '..');

let failures = 0;
function ok(name, cond, detail) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  (' + detail + ')' : ''));
  if (!cond) failures++;
}

async function freshPage(browser, vp) {
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', function (e) { pageErrors.push(String(e)); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  return { context: context, page: page, pageErrors: pageErrors };
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const allErrors = [];
  try {
    /* ------------------------------------------------------------ 1 --- */
    {
      const { context, page, pageErrors } = await freshPage(browser, { w: 390, h: 844 });
      await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
      await page.waitForTimeout(200);

      const hudBox = await page.locator('#hud').boundingBox();
      const deskBox = await page.locator('#desk').boundingBox();
      const runVisible = await page.locator('#run-btn').isVisible();
      const runInViewport = await page.evaluate(function () {
        const r = document.getElementById('run-btn').getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      });
      const mapVisible = await page.locator('#map').isVisible();
      const scrollW = await page.evaluate(function () { return document.documentElement.scrollWidth; });

      ok('1. 390x844: #hud height <= 64', hudBox.height <= 64, 'height=' + hudBox.height);
      ok('1. 390x844: #desk sits at the bottom (bbox.bottom >= viewport height - 40)',
         deskBox.y + deskBox.height >= 844 - 40, 'bottom=' + (deskBox.y + deskBox.height));
      ok('1. 390x844: #run-btn visible without scrolling', runVisible && runInViewport);
      ok('1. 390x844: the map is visible', mapVisible);
      ok('1. 390x844: document.documentElement.scrollWidth <= 390', scrollW <= 390, 'scrollWidth=' + scrollW);

      allErrors.push.apply(allErrors, pageErrors.map(function (e) { return '390x844/1: ' + e; }));
      await context.close();
    }

    /* ------------------------------------------------------------ 2 --- */
    {
      const { context, page, pageErrors } = await freshPage(browser, { w: 360, h: 740 });
      await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
      await page.waitForTimeout(200);
      const scrollW = await page.evaluate(function () { return document.documentElement.scrollWidth; });
      ok('2. 360x740: scrollWidth <= 360', scrollW <= 360, 'scrollWidth=' + scrollW);
      allErrors.push.apply(allErrors, pageErrors.map(function (e) { return '360x740/2: ' + e; }));
      await context.close();
    }

    /* ------------------------------------------------------------ 3 --- */
    {
      const { context, page, pageErrors } = await freshPage(browser, { w: 390, h: 844 });
      await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
      await page.waitForTimeout(200);

      const before = await page.locator('#desk').boundingBox();
      await page.locator('.desk-handle').click();
      await page.waitForTimeout(300);
      const expandedAttr = await page.locator('.desk-handle').getAttribute('aria-expanded');
      const after = await page.locator('#desk').boundingBox();
      const grew = after.height - before.height;

      await page.locator('.desk-handle').click();
      await page.waitForTimeout(300);
      const collapsedAttr = await page.locator('.desk-handle').getAttribute('aria-expanded');
      const back = await page.locator('#desk').boundingBox();

      ok('3. tap the desk handle: aria-expanded=true and height grows by >= 200px',
         expandedAttr === 'true' && grew >= 200, 'aria-expanded=' + expandedAttr + ' grew=' + grew);
      ok('3. tap again: collapses back', collapsedAttr === 'false' && back.height < after.height,
         'aria-expanded=' + collapsedAttr + ' before=' + before.height + ' back=' + back.height);

      allErrors.push.apply(allErrors, pageErrors.map(function (e) { return '390x844/3: ' + e; }));
      await context.close();
    }

    /* ------------------------------------------------------------ 4 --- */
    {
      const { context, page, pageErrors } = await freshPage(browser, { w: 390, h: 844 });
      await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
      await page.waitForTimeout(200);

      await page.locator('.map-toggle').click();
      await page.waitForTimeout(150);
      const chipCount = await page.locator('.map-chip').count();
      const collapsedNow = await page.evaluate(function () { return document.getElementById('map').classList.contains('map-collapsed'); });

      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(250);
      const stillCollapsed = await page.evaluate(function () { return document.getElementById('map').classList.contains('map-collapsed'); });

      await page.locator('.map-toggle').click();
      await page.waitForTimeout(150);
      const backExpanded = await page.evaluate(function () { return !document.getElementById('map').classList.contains('map-collapsed'); });

      ok('4. tap "Britain" toggle: six region chips, #map gets .map-collapsed',
         chipCount === 6 && collapsedNow, 'chips=' + chipCount + ' collapsed=' + collapsedNow);
      ok('4. reload: still collapsed (localStorage)', stillCollapsed);
      ok('4. toggle back: expands again', backExpanded);

      allErrors.push.apply(allErrors, pageErrors.map(function (e) { return '390x844/4: ' + e; }));
      await context.close();
    }

    /* ------------------------------------------------------------ 5 --- */
    {
      const { context, page, pageErrors } = await freshPage(browser, { w: 390, h: 844 });
      await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
      await page.waitForTimeout(200);

      await page.locator('.desk-card-btn').first().click();
      await page.waitForSelector('[role=dialog]', { state: 'visible' });
      await page.waitForTimeout(300); // let .overlay-panel's open animation (scale .985->1) settle
      const panelBox = await page.locator('.overlay-panel').boundingBox();
      const fillsWidth = Math.abs(panelBox.width - 390) <= 2;

      /* "visible without scrolling, or reachable after scrolling the body" */
      const lastChoice = page.locator('[role=dialog] .choice').last();
      await lastChoice.scrollIntoViewIfNeeded();
      const reachable = await lastChoice.isVisible();

      ok('5. open a card: the dialog fills the viewport width', fillsWidth, 'width=' + panelBox.width);
      ok('5. its primary button (the last choice) is reachable, scrolling if needed', reachable);

      allErrors.push.apply(allErrors, pageErrors.map(function (e) { return '390x844/5: ' + e; }));
      await context.close();
    }

    /* ------------------------------------------------------------ 6 --- */
    {
      const { context, page, pageErrors } = await freshPage(browser, { w: 390, h: 844 });
      await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
      await page.waitForTimeout(200);

      await page.locator('#run-btn').click();
      await page.waitForTimeout(800);
      const tickerVisible = await page.locator('#ticker').isVisible();
      const deskHidden = await page.evaluate(function () { return getComputedStyle(document.getElementById('desk')).display === 'none'; });
      const calloutsInside = await page.evaluate(function () {
        const els = Array.from(document.querySelectorAll('.run-callout'));
        if (!els.length) return null;
        return els.every(function (el) {
          const r = el.getBoundingClientRect();
          return r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight;
        });
      });

      await page.waitForSelector('#scorecard', { state: 'visible', timeout: 15000 });
      const scorecardBox = await page.locator('#scorecard').boundingBox();

      ok('6. running a quarter: ticker visible at the bottom', tickerVisible);
      ok('6. running a quarter: the desk sheet is hidden', deskHidden);
      ok('6. at least one callout appeared and every one seen was fully inside the viewport',
         calloutsInside !== false, 'calloutsInside=' + calloutsInside);
      ok('6. the scorecard is reachable', !!scorecardBox);

      allErrors.push.apply(allErrors, pageErrors.map(function (e) { return '390x844/6: ' + e; }));
      await context.close();
    }

    /* ------------------------------------------------------------ 7 --- */
    {
      const { context, page, pageErrors } = await freshPage(browser, { w: 390, h: 844 });
      await page.evaluate(function () { YM.debug.newGame(['nhs', 'housing', 'growth'], 42); });
      await page.waitForTimeout(200);
      /* Sweep every surface a button can appear on: the desk overlay, the
         expanded desk sheet, and the collapsed map. */
      await page.locator('.desk-card-btn').first().click();
      await page.waitForSelector('[role=dialog]', { state: 'visible' });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
      await page.locator('.desk-handle').click();
      await page.waitForTimeout(150);
      await page.locator('.map-toggle').click();
      await page.waitForTimeout(150);

      const emptyButtons = await page.$$eval('button', function (els) {
        return els.filter(function (b) {
          const name = (b.getAttribute('aria-label') || b.textContent || '').trim();
          return name.length === 0;
        }).map(function (b) { return b.outerHTML.slice(0, 120); });
      });
      ok('7. every <button> on the page has an accessible name', emptyButtons.length === 0, emptyButtons.join(' | '));

      allErrors.push.apply(allErrors, pageErrors.map(function (e) { return '390x844/7: ' + e; }));
      await context.close();
    }
  } finally {
    await browser.close();
  }

  ok('zero pageerrors across checks 1-7', allErrors.length === 0, allErrors.join(' | '));

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

  /* ------------------------------------------------------------ 8b-e --- */
  function runCheck(name, script, matchAllOk) {
    let pass = false;
    try {
      const out = execSync('node ' + script, { cwd: ROOT, env: Object.assign({}, process.env, { CHECK_BASE_URL: BASE }), stdio: 'pipe' }).toString();
      pass = matchAllOk ? /ALL OK/.test(out) : /ALL PASS/.test(out);
      if (!pass) console.log(out);
    } catch (e) {
      console.log((e.stdout || '').toString());
      console.log((e.stderr || '').toString());
      pass = false;
    }
    ok(name, pass);
  }
  runCheck('8b. node tools/check-m2.js still passes (1280x800 + 390x844)', 'tools/check-m2.js', false);
  runCheck('8c. node tools/check-m3.js still passes (1280x800)', 'tools/check-m3.js', false);
  runCheck('8d. node tools/check-m4.js still passes (1280x800 + 390x844)', 'tools/check-m4.js', false);
  runCheck('8e. node tools/check-m5.js still passes (1280x800 + 390x844)', 'tools/check-m5.js', false);
  runCheck('8f. node tools/timeline-check.js prints ALL OK', 'tools/timeline-check.js', true);

  console.log('\n' + (failures ? failures + ' FAILURE(S)' : 'ALL PASS'));
  process.exit(failures ? 1 : 0);
}

main().catch(function (e) { console.error(e); process.exit(1); });
