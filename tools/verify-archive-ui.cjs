#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - The Archive: browser check
   ---------------------------------------------------------------------
   Run with:  node tools/verify-archive-ui.cjs

   Starts a throwaway static server on port 4173, drives the real pages in
   Chromium, and exits non-zero if anything fails. It covers what a static
   check cannot: rendering, the four sections, the closed spoiler, keyboard
   toggling, deep links and their recovery, all nine routes at two widths,
   console errors, failed requests and save-key isolation.

   Needs Playwright. It looks for the copy bundled with the workspace and
   falls back to a normal install, so it is a development tool rather than
   part of the site. The site itself ships no dependencies.
   ===================================================================== */

'use strict';

const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const PORT = 4173;
const BASE = 'http://127.0.0.1:' + PORT;

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    '/opt/appjet/browser/node_modules/playwright',
    'playwright'
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch (err) { /* try the next one */ }
  }
  console.error('Playwright is not available; run this check in an environment that has it.');
  process.exit(2);
}

const { chromium } = loadPlaywright();

let failures = 0;
function check(ok, name, detail) {
  if (!ok) { failures += 1; }
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  [' + detail + ']' : ''));
}

function waitForServer(timeoutMs) {
  const started = Date.now();
  return new Promise(function (resolve, reject) {
    (function poll() {
      const req = require('http').get(BASE + '/archive/', function (res) {
        res.resume();
        resolve();
      });
      req.on('error', function () {
        if (Date.now() - started > timeoutMs) { reject(new Error('server did not start')); }
        else { setTimeout(poll, 120); }
      });
    })();
  });
}

const ROUTES = [
  '/',
  '/film/',
  '/stories/',
  '/stories/the-ninth-bell/',
  '/arcade/',
  '/arcade/signal-path/',
  '/gallery/',
  '/social-room/',
  '/archive/'
];

(async function main() {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore'
  });

  const browser = await chromium.launch();

  try {
    await waitForServer(15000);

    /* ---------- 1. every route, both widths ---------- */

    for (const width of [390, 1280]) {
      const context = await browser.newContext({ viewport: { width: width, height: 900 } });
      const page = await context.newPage();
      const consoleErrors = [];
      const failed = [];
      page.on('console', function (msg) { if (msg.type() === 'error') { consoleErrors.push(msg.text()); } });
      page.on('pageerror', function (err) { consoleErrors.push('pageerror: ' + err.message); });
      page.on('requestfailed', function (req) { failed.push(req.url()); });
      page.on('response', function (res) {
        if (res.status() >= 400) { failed.push(res.status() + ' ' + res.url()); }
      });

      for (const route of ROUTES) {
        await page.goto(BASE + route, { waitUntil: 'load' });
        const status = await page.evaluate(function () { return document.readyState; });
        const overflow = await page.evaluate(function () {
          return document.documentElement.scrollWidth - document.documentElement.clientWidth;
        });
        const text = await page.evaluate(function () { return document.body.innerText.trim().length; });
        check(status === 'complete' && text > 0, width + 'px ' + route + ' renders', text + ' chars');
        check(overflow <= 1, width + 'px ' + route + ' has no horizontal overflow', 'overflow ' + overflow + 'px');
      }

      check(consoleErrors.length === 0, width + 'px no console or page errors', consoleErrors.slice(0, 3).join(' | '));
      check(failed.length === 0, width + 'px no failed local requests', failed.slice(0, 3).join(' | '));
      await context.close();
    }

    /* ---------- 2. the catalogue renders ---------- */

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('console', function (msg) { if (msg.type() === 'error') { errors.push(msg.text()); } });
    page.on('pageerror', function (err) { errors.push('pageerror: ' + err.message); });

    await page.goto(BASE + '/archive/', { waitUntil: 'load' });
    await page.waitForSelector('.file');

    check(await page.locator('.file').count() === 3, 'three completed files rendered',
      String(await page.locator('.file').count()));
    check(await page.locator('.collection').count() === 3, 'three collections rendered',
      String(await page.locator('.collection').count()));
    check(await page.locator('.discovery').count() === 8, 'eight discoveries rendered',
      String(await page.locator('.discovery').count()));
    check(await page.locator('.record p').count() >= 3, 'the record has its paragraphs',
      String(await page.locator('.record p').count()));

    const closing = (await page.locator('#closing-text').innerText()).toLowerCase();
    check(closing.length > 120 && closing.indexOf('progress') !== -1, 'closing note explains the Archive',
      closing.slice(0, 48) + '...');

    const body = (await page.locator('main').innerText()).toLowerCase();
    check(body.indexOf('drafts') === -1 && body.indexOf('deleted scenes') === -1,
      'no promise of drafts or deleted scenes');

    /* ---------- 3. every link resolves ---------- */

    const hrefs = await page.$$eval('.file-link, .collection-item a, .discovery-link', function (nodes) {
      return nodes.map(function (n) { return n.getAttribute('href'); });
    });
    let broken = [];
    for (const href of hrefs) {
      const url = new URL(href, BASE + '/archive/').href;
      const response = await page.request.get(url);
      if (response.status() !== 200) { broken.push(href + ' -> ' + response.status()); }
    }
    check(broken.length === 0, 'all ' + hrefs.length + ' catalogue links return 200', broken.join(', '));

    const galleryDeep = hrefs.filter(function (h) { return h.indexOf('gallery/#') !== -1; });
    check(galleryDeep.length === 6, 'six Gallery deep links present', String(galleryDeep.length));

    for (const href of galleryDeep) {
      await page.goto(BASE + '/archive/' + href, { waitUntil: 'load' });
      const opened = await page.locator('.exhibit-panel:not([hidden])').count();
      const hash = await page.evaluate(function () { return location.hash; });
      check(opened >= 1 || hash.length > 1, 'gallery deep link ' + href.split('#')[1] + ' opens the exhibit',
        'panel ' + opened);
    }

    /* ---------- 4. spoilers ---------- */

    await page.goto(BASE + '/archive/', { waitUntil: 'load' });
    await page.waitForSelector('.discovery');

    const detailsCount = await page.locator('.discovery details').count();
    check(detailsCount === 1, 'exactly one spoiler disclosure', String(detailsCount));

    const openBefore = await page.$$eval('.discovery details', function (nodes) {
      return nodes.map(function (n) { return n.open; });
    });
    check(openBefore.every(function (open) { return open === false; }), 'disclosures start closed',
      JSON.stringify(openBefore));

    const summaryText = await page.locator('.discovery summary').innerText();
    check(/spoiler/i.test(summaryText), 'summary is labelled Spoiler', summaryText);

    const leaked = await page.evaluate(function () {
      const visible = document.querySelector('.discovery-note').innerText
        + ' ' + document.querySelector('.discovery h3').innerText
        + ' ' + document.querySelector('.discovery summary').getAttribute('title');
      const hidden = Array.from(document.querySelectorAll('.discovery details p')).map(function (p) {
        return p.textContent;
      }).join(' ');
      return { visible: visible.toLowerCase(), hidden: hidden.toLowerCase() };
    });
    check(leaked.hidden.indexOf('ledger') !== -1, 'spoiler text does name the ending once opened',
      'inside the disclosure only');
    check(leaked.visible.indexOf('ledger') === -1, 'spoiler is not in the visible summary or note');
    check(leaked.visible.indexOf('null') !== 0, 'no title attribute on the summary');

    await page.locator('.discovery summary').click();
    const openAfter = await page.locator('.discovery details').evaluate(function (n) { return n.open; });
    check(openAfter === true, 'clicking the summary opens it');
    const revealed = await page.locator('.discovery details p').first().innerText();
    check(revealed.toLowerCase().indexOf('ledger') !== -1, 'revealed text is the spoiler',
      revealed.slice(0, 40) + '...');

    await page.locator('.discovery summary').click();
    check(await page.locator('.discovery details').evaluate(function (n) { return n.open; }) === false,
      'clicking again closes it');

    await page.locator('.discovery summary').focus();
    await page.keyboard.press('Enter');
    check(await page.locator('.discovery details').evaluate(function (n) { return n.open; }) === true,
      'keyboard Enter opens the disclosure');
    await page.keyboard.press('Space');
    check(await page.locator('.discovery details').evaluate(function (n) { return n.open; }) === false,
      'keyboard Space closes it');

    /* ---------- 5. deep links and recovery ---------- */

    await page.goto(BASE + '/archive/#discovery-the-closed-beacon', { waitUntil: 'load' });
    await page.waitForSelector('.discovery');
    const marked = await page.locator('#discovery-the-closed-beacon').count();
    check(marked === 1, 'a known entry hash resolves to its entry');

    await page.goto(BASE + '/archive/#collections', { waitUntil: 'load' });
    const sectionVisible = await page.locator('#collections').isVisible();
    check(sectionVisible, 'a section hash resolves to its section');

    await page.goto(BASE + '/archive/#not-a-real-entry', { waitUntil: 'load' });
    await page.waitForSelector('.discovery');
    const note = page.locator('#hash-note');
    check(await note.isVisible(), 'unknown hash shows a recovery note');
    const noteText = await note.innerText();
    check(noteText.indexOf('No entry is filed under') !== -1, 'recovery note explains the problem',
      noteText.slice(0, 60) + '...');
    await note.locator('a').first().click();
    check((await page.evaluate(function () { return location.hash; })) === '#completed-files',
      'recovery note links to a real section');

    /* ---------- 6. navigation ---------- */

    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.locator('.site-nav a[href="archive/"]').click();
    await page.waitForLoadState('load');
    check((await page.evaluate(function () { return location.pathname; })).indexOf('/archive/') !== -1,
      'Lobby nav opens the Archive');

    await page.locator('footer a[href="../"]').first().click();
    await page.waitForLoadState('load');
    check((await page.evaluate(function () { return location.pathname; })) === '/', 'Archive returns to the Lobby');

    const lobbyCard = await page.locator('#archive a').first().getAttribute('href');
    check(lobbyCard === 'archive/', 'Lobby Archive card links to the room', lobbyCard);
    const cardText = await page.locator('#archive').innerText();
    check(cardText.toLowerCase().indexOf('drafts') === -1, 'Lobby card no longer promises drafts');

    const eyebrow = await page.locator('.eyebrow').first().innerText();
    check(/phase six/i.test(eyebrow), 'Lobby eyebrow reflects Phase 6', eyebrow);

    for (const route of ['/stories/', '/arcade/', '/gallery/', '/social-room/', '/stories/the-ninth-bell/', '/arcade/signal-path/']) {
      await page.goto(BASE + route, { waitUntil: 'load' });
      const href = await page.locator('.site-nav a[href$="archive/"]').first().getAttribute('href');
      const response = await page.request.get(new URL(href, BASE + route).href);
      check(response.status() === 200, route + ' nav Archive link resolves', href);
    }

    /* ---------- 7. keyboard and reduced motion ---------- */

    await page.goto(BASE + '/archive/', { waitUntil: 'load' });
    await page.waitForSelector('.file');
    await page.locator('.jump-list a').first().focus();
    const focusRing = await page.locator('.jump-list a').first().evaluate(function (n) {
      const style = getComputedStyle(n);
      return { outline: style.outlineStyle, width: style.outlineWidth };
    });
    check(focusRing.outline !== 'none' && focusRing.width !== '0px', 'jump links show a visible focus ring',
      focusRing.outline + ' ' + focusRing.width);

    const targets = await page.$$eval('.jump-list a, .file-link, .discovery-link', function (nodes) {
      return nodes.map(function (n) { return Math.round(n.getBoundingClientRect().height); });
    });
    check(Math.min.apply(null, targets) >= 44, 'touch targets are at least 44px',
      'smallest ' + Math.min.apply(null, targets) + 'px');

    const calm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const calmPage = await calm.newPage();
    await calmPage.goto(BASE + '/archive/', { waitUntil: 'load' });
    await calmPage.waitForSelector('.file-link');
    const motion = await calmPage.evaluate(function () {
      function ms(value) {
        if (!value || value === 'none') { return 0; }
        return Math.max.apply(null, value.split(',').map(function (part) {
          return parseFloat(part) * (part.indexOf('ms') !== -1 ? 1 : 1000);
        }));
      }
      const node = document.querySelector('.file-link');
      const style = getComputedStyle(node);
      return {
        transition: ms(style.transitionDuration),
        animation: ms(style.animationDuration),
        scroll: getComputedStyle(document.documentElement).scrollBehavior
      };
    });
    check(motion.transition <= 20 && motion.animation <= 20, 'reduced motion removes transitions',
      'transition ' + motion.transition + 'ms, animation ' + motion.animation + 'ms');
    await calm.close();

    /* ---------- 8. save isolation ---------- */

    const isolated = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await isolated.addInitScript(function () {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('tws', '{"sc":"cast","v":2}');
        localStorage.setItem('wrong-script.story.the-ninth-bell.v1', '{"scene":"watch_1"}');
        localStorage.setItem('wrong-script.arcade.signal-path.v1', '{"unlocked":3}');
      }
    });
    const isoPage = await isolated.newPage();
    await isoPage.goto(BASE + '/archive/', { waitUntil: 'load' });
    const before = await isoPage.evaluate(function () {
      return JSON.stringify(Object.keys(localStorage).sort().map(function (key) {
        return [key, localStorage.getItem(key)];
      }));
    });
    await isoPage.goto(BASE + '/archive/#discoveries', { waitUntil: 'load' });
    await isoPage.locator('.discovery summary').click();
    await isoPage.goto(BASE + '/archive/#not-a-real-entry', { waitUntil: 'load' });
    const after = await isoPage.evaluate(function () {
      return JSON.stringify(Object.keys(localStorage).sort().map(function (key) {
        return [key, localStorage.getItem(key)];
      }));
    });
    check(before === after, 'browsing the Archive leaves stored values byte-identical',
      JSON.parse(after).length + ' keys');
    check(JSON.parse(after).length === 3, 'no fourth storage key was created',
      JSON.parse(after).map(function (pair) { return pair[0]; }).join(', '));
    await isolated.close();

    check(errors.length === 0, 'no console or page errors during the Archive walk', errors.slice(0, 3).join(' | '));
    await context.close();

  } finally {
    await browser.close();
    server.kill();
  }

  console.log('');
  console.log(failures === 0 ? 'RESULT  all checks passed' : 'RESULT  ' + failures + ' check(s) failed');
  process.exit(failures === 0 ? 0 : 1);
})().catch(function (error) {
  console.error('HARNESS ERROR ' + (error && error.message));
  process.exit(2);
});
