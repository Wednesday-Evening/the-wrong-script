/* Visual-direction refinement: browser verification.
 *
 * Drives real Chromium against the static site on port 4173.
 * Covers the eleven room routes plus the protected film: overflow, console and
 * HTTP errors, one background video per room, the first-visit sound choice,
 * the controller's real controls, footer clearance, Escape focus return,
 * reduced motion, storage isolation across all six existing save keys, and
 * malformed preference recovery.
 *
 * Exit code 0 means every assertion passed.
 */
'use strict';

const { chromium } = require('/opt/appjet/browser/node_modules/playwright');
const { spawn, execSync } = require('child_process');

const ROOT = process.cwd();
const PORT = 4173;
const BASE = 'http://127.0.0.1:' + PORT;
const PREF = 'wrong-script.audio-settings.v1';
const CHROME = '/opt/appjet/browser-binaries/chromium-1234/chrome-linux64/chrome';

const ROUTES = [
  '/', '/film/', '/stories/', '/stories/the-ninth-bell/',
  '/stories/the-returns-hatch/', '/arcade/', '/arcade/signal-path/',
  '/arcade/lamplight/', '/gallery/', '/social-room/', '/archive/',
  '/creator-studio/'
];

let pass = 0;
let fail = 0;

function ok(name, condition, detail) {
  const line = name + (detail ? '  [' + detail + ']' : '');
  if (condition) { pass += 1; console.log('PASS  ' + line); }
  else { fail += 1; console.log('FAIL  ' + line); }
}

(async function main() {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: ROOT, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));

  const browser = await chromium.launch({ executablePath: CHROME });
  const badRequests = [];

  /* ---------------- A. routes, both widths ---------------- */
  console.log('--- A. routes, overflow, errors, one background video ---');
  for (const vp of [{ w: 390, h: 844, touch: true }, { w: 1280, h: 800, touch: false }]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h }, hasTouch: vp.touch
    });
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));
      page.on('response', r => {
        if (r.status() >= 400) { errors.push(r.status() + ' ' + r.url()); badRequests.push(r.url()); }
      });
      page.on('requestfailed', r => errors.push('failed ' + r.url()));

      const response = await page.goto(BASE + route, { waitUntil: 'load' });
      await page.waitForTimeout(400);
      const shape = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        videos: document.querySelectorAll('.ambience__video').length,
        mixer: document.querySelectorAll('.mixer').length
      }));

      ok('A ' + route + ' @' + vp.w + ' HTTP 200', !!response && response.status() === 200,
        response && response.status());
      ok('A ' + route + ' @' + vp.w + ' no horizontal overflow', shape.overflow === 0,
        shape.overflow + 'px');
      ok('A ' + route + ' @' + vp.w + ' no console, page or HTTP errors', errors.length === 0,
        errors.slice(0, 2).join(' | ') || 'clean');

      if (route === '/film/') {
        ok('A /film/ @' + vp.w + ' keeps the film free of the room layer',
          shape.videos === 0 && shape.mixer === 0, shape.videos + ' video, ' + shape.mixer + ' mixer');
      } else {
        ok('A ' + route + ' @' + vp.w + ' exactly one background video', shape.videos === 1,
          shape.videos + ' video');
      }
      await page.close();
    }
    await ctx.close();
  }

  /* ---------------- B. first visit, choice, persistence ---------------- */
  console.log('--- B. first-visit sound choice and controller ---');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errorsB = [];
  page.on('pageerror', e => errorsB.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errorsB.push(m.text()); });

  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const pill = page.locator('.mixer__compact').first();
  const panel = page.locator('.mixer__panel').first();

  ok('B the panel opens on a first visit', await panel.isVisible());
  ok('B the sound question is shown before anything plays',
    await page.locator('.mixer__ask').isVisible());
  ok('B the question offers both choices',
    (await page.getByRole('button', { name: 'Enter with sound' }).count()) === 1 &&
    (await page.getByRole('button', { name: 'Continue silently' }).count()) === 1);

  await page.getByRole('button', { name: 'Enter with sound' }).click();
  await page.waitForTimeout(300);
  ok('B the question closes after the choice', !(await page.locator('.mixer__ask').isVisible()));
  const stored = await page.evaluate(k => localStorage.getItem(k), PREF);
  ok('B the choice is saved under the documented key',
    !!stored && /"choice"\s*:\s*"sound"/.test(stored), stored);

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  ok('B a returning visitor is not asked again',
    !(await page.locator('.mixer__ask').isVisible()));
  ok('B the panel starts collapsed once the choice is saved',
    (await pill.getAttribute('aria-expanded')) === 'false');
  await pill.click();
  await page.waitForTimeout(250);
  ok('B the pill reopens the panel', await panel.isVisible());
  ok('B the reopened panel still hides the question',
    !(await page.locator('.mixer__ask').isVisible()));

  /* ---------------- C. real controls ---------------- */
  console.log('--- C. master mute, channel volumes, video control ---');
  const switches = page.locator('.mixer__switch');
  ok('C two switches: master and background video', (await switches.count()) === 2,
    (await switches.count()) + ' switch');
  ok('C the master switch is labelled for sound',
    /All sound/.test((await switches.nth(0).getAttribute('aria-label')) || ''));

  const masterBefore = await switches.nth(0).getAttribute('aria-checked');
  await switches.nth(0).click();
  await page.waitForTimeout(200);
  const masterAfter = await switches.nth(0).getAttribute('aria-checked');
  ok('C master mute toggles', masterBefore !== masterAfter, masterBefore + ' -> ' + masterAfter);
  const mutedPref = await page.evaluate(k => localStorage.getItem(k), PREF);
  ok('C the mute is persisted', /"master"\s*:\s*false/.test(mutedPref || ''), mutedPref);
  await switches.nth(0).click();
  await page.waitForTimeout(200);
  ok('C master sound can be restored',
    (await switches.nth(0).getAttribute('aria-checked')) === 'true');

  const ranges = page.locator('.mixer__range');
  ok('C three independent channel sliders', (await ranges.count()) === 3,
    (await ranges.count()) + ' slider');
  const music = ranges.first();
  const before = await music.inputValue();
  await music.focus();
  for (let i = 0; i < 6; i += 1) { await music.press('ArrowLeft'); }
  const after = await music.inputValue();
  ok('C music volume moves by keyboard', Number(after) < Number(before), before + ' -> ' + after);
  const volPref = await page.evaluate(k => localStorage.getItem(k), PREF);
  ok('C the new volume is persisted', volPref !== mutedPref);

  const state = () => page.evaluate(() => {
    const v = document.querySelector('.ambience__video');
    return {
      paused: v ? v.paused : null,
      status: window.TWSAmbience ? window.TWSAmbience.state().status : null
    };
  });
  const videoSwitch = switches.nth(1);
  ok('C the video switch is labelled for video',
    /Background video/.test((await videoSwitch.getAttribute('aria-label')) || ''));
  await videoSwitch.click();
  await page.waitForTimeout(600);
  const off = await state();
  ok('C the video switch stops the background video',
    off.paused === true || off.status === 'off', JSON.stringify(off));
  await videoSwitch.click();
  await page.waitForTimeout(1800);
  const on = await state();
  ok('C the video switch restarts it',
    on.paused === false || on.status === 'playing', JSON.stringify(on));

  /* ---------------- D. footer clearance ---------------- */
  console.log('--- D. controller clears the footer ---');
  const geo = await page.evaluate(() => {
    const mixer = document.querySelector('.mixer');
    const footer = document.querySelector('.site-footer');
    if (!mixer || !footer) { return null; }
    const last = footer.lastElementChild || footer;
    return {
      mixerTop: Math.round(mixer.getBoundingClientRect().top),
      footerBottom: Math.round(last.getBoundingClientRect().bottom)
    };
  });
  ok('D footer content ends above the controller', !!geo && geo.footerBottom <= geo.mixerTop,
    JSON.stringify(geo));

  /* ---------------- E. keyboard ---------------- */
  console.log('--- E. keyboard ---');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  ok('E Escape collapses the panel', !(await panel.isVisible()));
  const focused = await page.evaluate(() => (document.activeElement || {}).className || '');
  ok('E focus returns to the pill', /mixer__compact/.test(focused), focused);
  ok('E no errors during the interaction', errorsB.length === 0,
    errorsB.slice(0, 2).join(' | ') || 'clean');
  await ctx.close();

  /* ---------------- F. reduced motion ---------------- */
  console.log('--- F. reduced motion ---');
  const rm = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rmPage = await rm.newPage();
  await rmPage.goto(BASE + '/gallery/', { waitUntil: 'load' });
  await rmPage.waitForTimeout(1800);
  const rmState = await rmPage.evaluate(() => {
    const v = document.querySelector('.ambience__video');
    const pill = document.querySelector('.mixer__compact');
    return {
      paused: v ? v.paused : null,
      status: window.TWSAmbience ? window.TWSAmbience.state().status : null,
      transition: pill ? getComputedStyle(pill).transitionDuration : null
    };
  });
  ok('F reduced motion keeps the room still',
    rmState.paused !== false || rmState.status === 'still', JSON.stringify(rmState));
  ok('F reduced motion removes long transitions', /^0s|0ms/.test(rmState.transition || ''),
    rmState.transition);
  await rm.close();

  /* ---------------- G. storage isolation, six existing keys ---------------- */
  console.log('--- G. storage isolation ---');
  const seed = {
    'tws': '{"scene":"cast","v":1,"sentinel":"vd"}',
    'tws.corrupt': '{"bad":',
    'wrong-script.story.the-ninth-bell.v1': '{"watch":2,"sentinel":"vd"}',
    'wrong-script.story.the-returns-hatch.v1': '{"scene":"hatch","sentinel":"vd"}',
    'wrong-script.arcade.signal-path.v1': '{"unlocked":3,"sentinel":"vd"}',
    'wrong-script.arcade.lamplight.v1': '{"room":2,"sentinel":"vd"}'
  };
  const iso = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await iso.addInitScript(values => {
    for (const key in values) {
      if (localStorage.getItem(key) === null) { localStorage.setItem(key, values[key]); }
    }
  }, seed);
  const isoPage = await iso.newPage();
  for (const route of ['/', '/gallery/', '/archive/', '/social-room/', '/creator-studio/',
    '/stories/', '/stories/the-ninth-bell/', '/stories/the-returns-hatch/',
    '/arcade/', '/arcade/lamplight/', '/arcade/signal-path/']) {
    await isoPage.goto(BASE + route, { waitUntil: 'load' });
    await isoPage.waitForTimeout(250);
  }
  const snapshot = await isoPage.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      out[key] = localStorage.getItem(key);
    }
    return out;
  });
  for (const key in seed) {
    ok('G ' + key + ' unchanged', snapshot[key] === seed[key],
      snapshot[key] === seed[key] ? 'byte-identical' : 'CHANGED to ' + snapshot[key]);
  }
  const extra = Object.keys(snapshot).filter(k => !(k in seed) && k !== PREF);
  ok('G no unexpected new storage key', extra.length === 0, extra.join(',') || 'none');
  await iso.close();

  /* ---------------- H. malformed preference ---------------- */
  console.log('--- H. malformed preference ---');
  const bad = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await bad.addInitScript(k => localStorage.setItem(k, '{not json'), PREF);
  const badPage = await bad.newPage();
  const errorsH = [];
  badPage.on('pageerror', e => errorsH.push(String(e)));
  badPage.on('console', m => { if (m.type() === 'error') errorsH.push(m.text()); });
  await badPage.goto(BASE + '/', { waitUntil: 'load' });
  await badPage.waitForTimeout(800);
  ok('H a malformed preference does not break the room',
    (await badPage.locator('.mixer__compact').count()) === 1 && errorsH.length === 0,
    errorsH[0] || 'clean');
  const preserved = await badPage.evaluate(k => localStorage.getItem(k), PREF);
  ok('H the malformed value is preserved, not silently replaced', preserved === '{not json',
    preserved);
  await bad.close();

  /* ---------------- I. protected film ---------------- */
  console.log('--- I. protected film ---');
  const diff = execSync('git -C ' + ROOT + ' diff --stat -- film/', { encoding: 'utf8' }).trim();
  ok('I film/ has no diff against HEAD', diff === '', diff || 'no diff');

  await browser.close();
  server.kill();

  if (badRequests.length) {
    console.log('HTTP >= 400 seen: ' + Array.from(new Set(badRequests)).join(', '));
  }
  console.log('\nRESULT ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})().catch(error => {
  console.error('HARNESS ERROR', error);
  process.exit(2);
});
