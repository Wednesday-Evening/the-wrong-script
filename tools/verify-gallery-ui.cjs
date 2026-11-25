#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - The Gallery: browser check
   ---------------------------------------------------------------------
   Run with:  node tools/verify-gallery-ui.cjs

   Starts a throwaway static server on port 4173, drives the real pages in
   Chromium, and exits non-zero if anything fails. It covers the things a
   static check cannot: rendering, filtering, the exhibit panel, deep
   links, keyboard focus, mobile overflow, reduced motion, console errors
   and save-key isolation.

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
      const req = require('http').get(BASE + '/gallery/', function (res) {
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

(async function () {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: root,
    stdio: 'ignore'
  });

  const browser = await chromium.launch();

  try {
    await waitForServer(8000);

    /* ---- every destination still loads, at both widths ---- */
    const routes = ['/', '/film/', '/stories/', '/stories/the-ninth-bell/', '/arcade/', '/arcade/signal-path/', '/gallery/'];

    for (const viewport of [{ width: 1280, height: 900, tag: '1280' }, { width: 390, height: 844, tag: '390' }]) {
      const context = await browser.newContext({ viewport });
      for (const route of routes) {
        const page = await context.newPage();
        const problems = [];
        page.on('console', function (message) { if (message.type() === 'error') { problems.push(message.text()); } });
        page.on('pageerror', function (error) { problems.push('pageerror: ' + error.message); });
        page.on('requestfailed', function (request) { problems.push('failed: ' + request.url()); });

        const response = await page.goto(BASE + route, { waitUntil: 'load' });
        await page.waitForTimeout(350);

        const measured = await page.evaluate(function () {
          return {
            length: document.documentElement.outerHTML.length,
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            frames: document.querySelectorAll('#collection .frame').length
          };
        });

        check(Boolean(response) && response.status() === 200 && measured.length > 500,
          route + ' (' + viewport.tag + ') loads', 'status ' + (response && response.status()));
        check(measured.scrollWidth <= measured.innerWidth + 1,
          route + ' (' + viewport.tag + ') has no horizontal overflow',
          measured.scrollWidth + ' vs ' + measured.innerWidth);
        check(problems.length === 0,
          route + ' (' + viewport.tag + ') has no console errors or failed requests',
          problems.slice(0, 2).join(' | ') || 'none');

        if (route === '/gallery/') {
          check(measured.frames === 8, 'the Gallery draws eight frames (' + viewport.tag + ')', measured.frames + ' frames');
        }
        await page.close();
      }
      await context.close();
    }

    /* ---- browsing, the exhibit panel, and the save keys ---- */
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(function () {
      localStorage.setItem('tws', '{"scene":"cast","v":1}');
      localStorage.setItem('wrong-script.story.the-ninth-bell.v1', '{"scene":"bell"}');
      localStorage.setItem('wrong-script.arcade.signal-path.v1', '{"version":1,"unlocked":2}');
    });
    const page = await context.newPage();
    const problems = [];
    page.on('console', function (message) { if (message.type() === 'error') { problems.push(message.text()); } });
    page.on('pageerror', function (error) { problems.push('pageerror: ' + error.message); });

    await page.goto(BASE + '/gallery/', { waitUntil: 'load' });
    const status = page.locator('#status');
    check((await status.textContent()).includes('Showing 8 exhibits'), 'the whole collection is shown by default', await status.textContent());

    await page.locator('#filters button[data-category="poetry"]').click();
    await page.waitForTimeout(150);
    check((await page.locator('#collection .frame').count()) === 2, 'a category narrows the wall', await status.textContent());
    check((await page.locator('#filters button[data-category="poetry"]').getAttribute('aria-pressed')) === 'true',
      'the active category is announced with aria-pressed');

    await page.locator('#card-ledger-of-small-hours .frame-link').click();
    await page.waitForTimeout(250);
    check(await page.locator('#exhibit-panel').isVisible(), 'an exhibit opens');
    check((await page.locator('#exhibit-title').textContent()).trim() === 'Ledger of Small Hours',
      'the panel shows the exhibit that was chosen');
    check((await page.locator('#exhibit-body').innerText()).length > 200, 'the panel carries the full text');
    check((await page.locator('#exhibit-credit').textContent()).includes('The Wrong Script Studio'),
      'the panel credits the studio');
    check(page.url().endsWith('#ledger-of-small-hours'), 'the address bar names the exhibit', page.url());
    check(await page.locator('#exhibit-figure').isHidden(), 'a text exhibit hides the figure');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    check(await page.locator('#exhibit-panel').isHidden(), 'Escape closes the panel');
    check((await page.evaluate(function () {
      return document.activeElement && document.activeElement.getAttribute('href');
    })) === '#ledger-of-small-hours', 'focus returns to the card that opened it');

    await page.goto(BASE + '/gallery/#low-water-halversen-light', { waitUntil: 'load' });
    await page.waitForTimeout(400);
    check(await page.locator('#exhibit-panel').isVisible(), 'a deep link opens its exhibit');
    const artwork = await page.evaluate(function () {
      const img = document.querySelector('#exhibit-img');
      return { width: img.naturalWidth, alt: img.alt, src: img.getAttribute('src') };
    });
    check(artwork.width > 100, 'the artwork loads from disk', artwork.src + ' at ' + artwork.width + 'px');
    check(artwork.alt.length > 20, 'the artwork carries alt text', artwork.alt.slice(0, 50) + '...');

    await page.locator('#exhibit-close').click();
    await page.waitForTimeout(200);
    check(await page.locator('#exhibit-panel').isHidden(), 'the close button returns to the wall');

    await page.goto(BASE + '/gallery/#not-a-real-exhibit', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    check(await page.locator('#hash-note').isVisible(), 'an unknown exhibit link is explained rather than ignored',
      (await page.locator('#hash-note').textContent()).slice(0, 60));

    await page.goto(BASE + '/gallery/', { waitUntil: 'load' });
    await page.locator('#filters button[data-category="music"]').click();
    await page.waitForTimeout(120);
    const musicCount = await page.locator('#collection .frame').count();
    await page.locator('#filters button[data-category="all"]').click();
    await page.waitForTimeout(120);
    check(musicCount === 1 && (await page.locator('#collection .frame').count()) === 8,
      'switching categories and returning to everything works', musicCount + ' music, then all');

    /* ---- keyboard ---- */
    await page.goto(BASE + '/gallery/', { waitUntil: 'load' });
    const stops = [];
    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press('Tab');
      stops.push(await page.evaluate(function () {
        const el = document.activeElement;
        if (!el || el === document.body) { return { name: '(body)', ring: false }; }
        const style = getComputedStyle(el);
        const ring = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none';
        return { name: (el.innerText || el.getAttribute('aria-label') || el.id || el.tagName).trim().slice(0, 40), ring };
      }));
    }
    check(stops.every(function (stop) { return stop.name !== '(body)'; }),
      'Tab stays inside the page for 14 stops');
    check(stops.every(function (stop) { return stop.ring; }), 'every keyboard stop shows a focus indicator',
      stops.filter(function (stop) { return !stop.ring; }).map(function (stop) { return stop.name; }).join(', ') || stops.length + ' stops checked');

    await page.locator('#filters button[data-category="writing"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    check((await page.locator('#collection .frame').count()) === 1, 'a category filter works from the keyboard',
      await page.locator('#status').textContent());

    /* ---- the other rooms' saves ---- */
    const store = await page.evaluate(function () {
      const out = {};
      Object.keys(localStorage).forEach(function (key) { out[key] = localStorage.getItem(key); });
      return out;
    });
    check(store['tws'] === '{"scene":"cast","v":1}', 'the film save is untouched', String(store['tws']));
    check(store['wrong-script.story.the-ninth-bell.v1'] === '{"scene":"bell"}', 'the story save is untouched');
    check(store['wrong-script.arcade.signal-path.v1'] === '{"version":1,"unlocked":2}', 'the arcade save is untouched');
    check(Object.keys(store).length === 3, 'the Gallery created no save key of its own', Object.keys(store).join(', '));

    /* ---- Lobby entry and return ---- */
    await page.goto(BASE + '/', { waitUntil: 'load' });
    const lobbyLink = page.locator('#gallery a[href="gallery/"]');
    check((await lobbyLink.count()) > 0, 'the Lobby Gallery card links to the Gallery');
    await lobbyLink.first().click();
    await page.waitForTimeout(400);
    check(page.url().endsWith('/gallery/'), 'the Lobby card opens the Gallery', page.url());
    await page.locator('a.btn.btn-primary', { hasText: 'Return to the Lobby' }).click();
    await page.waitForTimeout(400);
    check(new URL(page.url()).pathname === '/', 'Return to the Lobby works', page.url());

    check(problems.length === 0, 'the whole session logged no console errors or page errors',
      problems.slice(0, 2).join(' | ') || 'none');
    await context.close();

    /* ---- mobile: the panel, and touch target sizes ---- */
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const phonePage = await phone.newPage();
    await phonePage.goto(BASE + '/gallery/#red-room-no-take', { waitUntil: 'load' });
    await phonePage.waitForTimeout(400);
    const mobile = await phonePage.evaluate(function () {
      const scrollWidth = document.documentElement.scrollWidth;
      const filter = document.querySelector('#filters button');
      const close = document.querySelector('#exhibit-close');
      const rect = filter.getBoundingClientRect();
      const closeRect = close.getBoundingClientRect();
      return {
        scrollWidth,
        innerWidth: window.innerWidth,
        filterHeight: Math.round(rect.height),
        closeHeight: Math.round(closeRect.height),
        imgWidth: document.querySelector('#exhibit-img').naturalWidth
      };
    });
    check(mobile.scrollWidth <= mobile.innerWidth + 1, 'the exhibit panel does not overflow a phone',
      mobile.scrollWidth + ' vs ' + mobile.innerWidth);
    check(mobile.filterHeight >= 44 && mobile.closeHeight >= 44, 'controls are at least 44px tall',
      'filter ' + mobile.filterHeight + 'px, close ' + mobile.closeHeight + 'px');
    check(mobile.imgWidth > 100, 'the artwork loads on a phone too');
    await phone.close();

    /* ---- reduced motion ---- */
    const calm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const calmPage = await calm.newPage();
    await calmPage.goto(BASE + '/gallery/', { waitUntil: 'load' });
    await calmPage.waitForTimeout(300);
    const motion = await calmPage.evaluate(function () {
      function pick(selector) {
        const el = document.querySelector(selector);
        if (!el) { return null; }
        const style = getComputedStyle(el);
        return { transition: style.transitionDuration, animation: style.animationDuration };
      }
      return {
        frame: pick('.frame'),
        panel: pick('.panel'),
        html: getComputedStyle(document.documentElement).scrollBehavior
      };
    });
    function longest(value) {
      return Math.max.apply(null, String(value || '0s').split(',').map(function (part) {
        const trimmed = part.trim();
        return trimmed.indexOf('ms') !== -1 ? parseFloat(trimmed) : parseFloat(trimmed) * 1000;
      }));
    }
    const maxTransition = Math.max(longest(motion.frame && motion.frame.transition), longest(motion.panel && motion.panel.transition));
    const maxAnimation = Math.max(longest(motion.frame && motion.frame.animation), longest(motion.panel && motion.panel.animation));
    check(maxTransition <= 20 && maxAnimation <= 20, 'reduced motion removes transitions and animation',
      'transition ' + maxTransition + 'ms, animation ' + maxAnimation + 'ms');
    check(motion.html === 'auto', 'reduced motion keeps scrolling immediate', motion.html);
    await calm.close();

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
