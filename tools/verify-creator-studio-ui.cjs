#!/usr/bin/env node
'use strict';

/* =====================================================================
   THE WRONG SCRIPT - The Creator Studio: browser check
   ---------------------------------------------------------------------
   Run with:  node tools/verify-creator-studio-ui.cjs

   Starts a throwaway static server on port 4173, drives the real pages in
   Chromium, and exits non-zero if anything fails. It covers what a static
   check cannot: that all ten routes render, that the Studio's five parts
   draw from the content file, that the platform nav walks in and out of
   the room, that the jump links and deep links work, that the small-screen
   menu opens and closes, that focus is visible, that reduced motion is
   honoured, and that browsing changes no stored value.

   What it is not: a physical-device test, a cross-browser test or an
   assistive-technology audit. Viewports are emulated; no screen reader is
   involved. Chromium only.
   ===================================================================== */

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 4173;
const BASE = 'http://127.0.0.1:' + PORT;

const ROUTES = [
  '/',
  '/film/',
  '/stories/',
  '/stories/the-ninth-bell/',
  '/arcade/',
  '/arcade/signal-path/',
  '/gallery/',
  '/social-room/',
  '/archive/',
  '/creator-studio/'
];

const SAVE_KEYS = [
  'tws',
  'wrong-script.story.the-ninth-bell.v1',
  'wrong-script.arcade.signal-path.v1'
];

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    passed += 1;
    console.log('PASS  ' + name + (detail ? '  [' + detail + ']' : ''));
  } catch (err) {
    failures.push(name + ': ' + err.message);
    console.log('FAIL  ' + name + '  -> ' + err.message);
  }
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

function loadPlaywright() {
  const candidates = [
    '/opt/appjet/browser/node_modules/playwright',
    'playwright'
  ];
  for (const candidate of candidates) {
    try { return require(candidate); } catch (err) { /* next */ }
  }
  throw new Error('Playwright is not available in this environment');
}

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + '/', { method: 'GET' });
      if (res.ok) return true;
    } catch (err) { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

function watch(page, sink) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') sink.console.push(msg.text());
  });
  page.on('pageerror', (err) => sink.page.push(err.message));
  page.on('requestfailed', (req) => {
    if (/favicon/.test(req.url())) return;
    const failure = req.failure();
    sink.failed.push(req.url() + ' ' + (failure ? failure.errorText : ''));
  });
  page.on('response', (res) => {
    if (res.status() >= 400 && !/favicon/.test(res.url())) {
      sink.bad.push(res.status() + ' ' + res.url());
    }
  });
}

function newSink() {
  return { console: [], page: [], failed: [], bad: [] };
}

function sinkProblem(sink, label) {
  const all = []
    .concat(sink.console.map((line) => 'console: ' + line))
    .concat(sink.page.map((line) => 'pageerror: ' + line))
    .concat(sink.failed.map((line) => 'requestfailed: ' + line))
    .concat(sink.bad.map((line) => 'http: ' + line));
  ok(all.length === 0, label + ': ' + all.join(' | '));
  return 'clean';
}

async function overflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scroll: doc.scrollWidth,
      client: doc.clientWidth,
      over: doc.scrollWidth - doc.clientWidth
    };
  });
}

async function main() {
  const playwright = loadPlaywright();
  const server = spawn(
    'python3',
    ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: ROOT, stdio: 'ignore' }
  );

  const up = await waitForServer(20000);
  if (!up) {
    console.log('FAIL  the static server never answered on ' + BASE);
    server.kill('SIGTERM');
    process.exit(1);
  }

  const browser = await playwright.chromium.launch({ headless: true });

  try {
    /* ---------- A. every route, both viewports ---------- */

    for (const [label, viewport] of [
      ['1280', { width: 1280, height: 800 }],
      ['390', { width: 390, height: 844 }]
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const sink = newSink();
      watch(page, sink);

      for (const route of ROUTES) {
        await check('route ' + route + ' loads at ' + label + 'px', async () => {
          const res = await page.goto(BASE + route, { waitUntil: 'load' });
          ok(res && res.status() === 200, 'status ' + (res ? res.status() : 'none'));
          const length = (await page.content()).length;
          ok(length > 500, 'document is only ' + length + ' characters');
          const title = await page.title();
          ok(title.length > 0, 'empty title');
          const size = await overflow(page);
          ok(size.over <= 1, 'horizontal overflow of ' + size.over + 'px');
          return '200, ' + length + ' chars, 0px overflow';
        });
      }

      await check('no console, page or request errors at ' + label + 'px', async () => {
        return sinkProblem(sink, 'route sweep ' + label + 'px');
      });

      await context.close();
    }

    /* ---------- B. the Studio's content, drawn ---------- */

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const sink = newSink();
    watch(page, sink);

    await page.goto(BASE + '/creator-studio/', { waitUntil: 'load' });

    await check('the page is the Creator Studio', async () => {
      const title = await page.title();
      ok(title === 'The Creator Studio - The Wrong Script', 'title is "' + title + '"');
      const h1 = (await page.locator('h1').first().innerText()).toLowerCase();
      ok(h1.indexOf('desk') !== -1, 'h1 is "' + h1 + '"');
      return title;
    });

    await check('the status line says submissions are not open', async () => {
      const text = (await page.locator('.std-status').innerText()).toLowerCase();
      ok(text.indexOf('submissions not open') !== -1, 'status reads "' + text + '"');
      ok(text.indexOf('no accounts') !== -1, 'status does not say "no accounts"');
      ok(text.indexOf('no uploads') !== -1, 'status does not say "no uploads"');
      return text.replace(/\s+/g, ' ');
    });

    await check('all five parts are on the page', async () => {
      const heads = await page.locator('.std-section-head h2').allInnerTexts();
      const lower = heads.map((text) => text.trim().toLowerCase());
      ['the desk', 'the format', 'the standard', 'the review process', 'not yet'].forEach((needle) => {
        ok(lower.indexOf(needle) !== -1, 'missing heading "' + needle + '" (found ' + lower.join(', ') + ')');
      });
      return heads.length + ' parts';
    });

    await check('the five formats are drawn with their expectations', async () => {
      const formats = await page.locator('.formats .format').count();
      ok(formats === 5, 'expected 5 formats, found ' + formats);
      const expects = await page.locator('.formats .format .format-expects li').count();
      ok(expects >= 15, 'expected at least 15 expectation lines, found ' + expects);
      const numbers = await page.locator('.format-num').allInnerTexts();
      ok(numbers.join(',') === '01,02,03,04,05', 'numbers read ' + numbers.join(','));
      return formats + ' formats, ' + expects + ' expectations';
    });

    await check('the standard is drawn with seven principles', async () => {
      const rules = await page.locator('.standard-list .rule').count();
      ok(rules === 7, 'expected 7 principles, found ' + rules);
      const titles = await page.locator('.standard-list .rule h3').allInnerTexts();
      ok(titles.length === 7, 'expected 7 titles');
      return rules + ' principles';
    });

    await check('the review route is drawn with five stages and two outcomes', async () => {
      const stages = await page.locator('.process .stage').count();
      ok(stages === 5, 'expected 5 stages, found ' + stages);
      const names = (await page.locator('.stage-name').allInnerTexts()).map((t) => t.toLowerCase());
      ok(names[0] === 'draft', 'first stage is "' + names[0] + '"');
      ok(names[4] === 'published', 'last stage is "' + names[4] + '"');
      const outcomes = await page.locator('.outcomes .outcome').count();
      ok(outcomes === 2, 'expected 2 outcomes, found ' + outcomes);
      return stages + ' stages, ' + outcomes + ' outcomes';
    });

    await check('Not Yet lists five absences', async () => {
      const items = await page.locator('#not-yet-list .absent').count();
      ok(items === 5, 'expected 5 absent items, found ' + items);
      const text = (await page.locator('#not-yet').innerText()).toLowerCase();
      ['account', 'upload', 'submission'].forEach((needle) => {
        ok(text.indexOf(needle) !== -1, 'Not Yet never mentions "' + needle + '"');
      });
      return items + ' items';
    });

    await check('the page offers no form or upload control', async () => {
      const controls = await page.locator('form, input, textarea, select').count();
      ok(controls === 0, 'found ' + controls + ' form controls');
      const buttons = await page.locator('button').count();
      ok(buttons === 1, 'expected 1 button (nav toggle), found ' + buttons);
      const buttonName = (await page.locator('button').first().innerText()).toLowerCase();
      ok(buttonName.indexOf('menu') !== -1, 'the only button is "' + buttonName + '"');
      return 'no forms; 1 menu button';
    });

    /* ---------- C. navigation in and out ---------- */

    await check('the Lobby walks into the Studio through the platform nav', async () => {
      await page.goto(BASE + '/', { waitUntil: 'load' });
      await page.locator('.site-nav a[href$="creator-studio/"]').first().click();
      await page.waitForURL(/\/creator-studio\/$/);
      const h1 = (await page.locator('h1').first().innerText()).toLowerCase();
      ok(h1.indexOf('desk') !== -1, 'landed on a page whose h1 is "' + h1 + '"');
      return '/ -> /creator-studio/';
    });

    await check('the Studio walks back to the Lobby', async () => {
      await page.locator('.site-nav a[href="../"]').first().click();
      await page.waitForURL(/\/$/);
      const title = await page.title();
      ok(/Lobby/i.test(title), 'landed on "' + title + '"');
      return '/creator-studio/ -> /';
    });

    await check('the Lobby card for the Studio is open and clickable', async () => {
      const card = page.locator('#creator-studio');
      const classes = await card.getAttribute('class');
      ok(/is-open/.test(classes), 'card classes are "' + classes + '"');
      const text = (await card.innerText()).toLowerCase();
      ok(text.indexOf('under construction') === -1, 'the card still says under construction');
      await card.locator('a[href="creator-studio/"]').first().click();
      await page.waitForURL(/\/creator-studio\/$/);
      return 'card -> /creator-studio/';
    });

    await check('the Studio reaches every open room from its own nav', async () => {
      const targets = ['../film/', '../stories/', '../arcade/', '../gallery/', '../social-room/', '../archive/'];
      const results = [];
      for (const href of targets) {
        await page.goto(BASE + '/creator-studio/', { waitUntil: 'load' });
        await page.locator('.site-nav a[href="' + href + '"]').first().click();
        await page.waitForURL(new RegExp(href.replace('../', '/').replace(/\//g, '\\/') + '$'));
        const title = await page.title();
        ok(title.length > 0, href + ' gave an empty title');
        results.push(href);
      }
      return results.join(' ');
    });

    /* ---------- D. jump links and deep links ---------- */

    await page.goto(BASE + '/creator-studio/', { waitUntil: 'load' });

    await check('a jump link moves to its section', async () => {
      await page.locator('.jump-list a[href="#standard"]').click();
      await page.waitForFunction(() => window.location.hash === '#standard');
      const visible = await page.locator('#standard').isVisible();
      ok(visible, '#standard is not visible after the jump');
      const rules = await page.locator('.standard-list .rule').count();
      ok(rules === 7, 'the section rendered ' + rules + ' principles');
      return '#standard, 7 principles visible';
    });

    await check('a deep link opens on its section', async () => {
      await page.goto(BASE + '/creator-studio/#review', { waitUntil: 'load' });
      const hash = await page.evaluate(() => window.location.hash);
      ok(hash === '#review', 'hash is "' + hash + '"');
      ok(await page.locator('#review').isVisible(), '#review is not visible');
      const stages = await page.locator('.process .stage').count();
      ok(stages === 5, 'the review route rendered ' + stages + ' stages');
      return '#review, 5 stages';
    });

    await check('an unknown fragment fails gracefully', async () => {
      await page.goto(BASE + '/creator-studio/#not-a-real-section', { waitUntil: 'load' });
      const h1 = await page.locator('h1').first().innerText();
      ok(h1.length > 0, 'the page did not render');
      const parts = await page.locator('.std-section').count();
      ok(parts === 5, 'expected 5 parts, found ' + parts);
      return 'page intact, 5 parts';
    });

    await check('no console, page or request errors while browsing the Studio', async () => {
      return sinkProblem(sink, 'studio browsing');
    });

    /* ---------- E. keyboard focus ---------- */

    await check('a keyboard visitor reaches the jump links with a visible ring', async () => {
      await page.goto(BASE + '/creator-studio/', { waitUntil: 'load' });
      let found = null;
      for (let i = 0; i < 40; i += 1) {
        await page.keyboard.press('Tab');
        found = await page.evaluate(() => {
          const active = document.activeElement;
          if (!active || !active.classList) return null;
          const inJump = active.closest('.jump-list');
          if (!inJump) return null;
          const style = getComputedStyle(active);
          return {
            text: active.textContent.trim(),
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
            shadow: style.boxShadow
          };
        });
        if (found) break;
      }
      ok(found, 'never reached a jump link by keyboard');
      const ringed = (found.outlineStyle !== 'none' && parseFloat(found.outlineWidth) > 0) ||
        (found.shadow && found.shadow !== 'none');
      ok(ringed, 'no visible focus ring on "' + found.text + '" (' + found.outlineStyle + ' ' + found.outlineWidth + ')');
      return found.text + ' -> ' + found.outlineStyle + ' ' + found.outlineWidth;
    });

    await context.close();

    /* ---------- F. small screen ---------- */

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });
    const small = await mobile.newPage();
    const mobileSink = newSink();
    watch(small, mobileSink);

    await small.goto(BASE + '/creator-studio/', { waitUntil: 'load' });

    await check('the small-screen menu opens, navigates and closes', async () => {
      const toggle = small.locator('#nav-toggle');
      await toggle.click();
      let expanded = await toggle.getAttribute('aria-expanded');
      ok(expanded === 'true', 'after opening, aria-expanded is "' + expanded + '"');
      ok(await small.locator('#site-nav').isVisible(), 'the nav is not visible when open');

      const size = await overflow(small);
      ok(size.over <= 1, 'the open menu overflows by ' + size.over + 'px');

      await small.locator('#site-nav a[href="../social-room/"]').first().click();
      await small.waitForURL(/\/social-room\/$/);
      return 'opened, navigated to /social-room/';
    });

    await check('Escape closes the small-screen menu', async () => {
      await small.goto(BASE + '/creator-studio/', { waitUntil: 'load' });
      const toggle = small.locator('#nav-toggle');
      await toggle.click();
      ok(await toggle.getAttribute('aria-expanded') === 'true', 'the menu did not open');
      await small.keyboard.press('Escape');
      const expanded = await toggle.getAttribute('aria-expanded');
      ok(expanded === 'false', 'after Escape, aria-expanded is "' + expanded + '"');
      return 'aria-expanded=false';
    });

    await check('touch targets are at least 44px on the small screen', async () => {
      const heights = await small.evaluate(() => {
        const nodes = Array.from(document.querySelectorAll('.jump-list a, .std-actions .btn'));
        return nodes.map((node) => Math.round(node.getBoundingClientRect().height));
      });
      ok(heights.length >= 12, 'only ' + heights.length + ' controls measured');
      const smallest = Math.min.apply(null, heights);
      ok(smallest >= 44, 'smallest control is ' + smallest + 'px');
      return heights.length + ' controls, smallest ' + smallest + 'px';
    });

    await check('no console, page or request errors on the small screen', async () => {
      return sinkProblem(mobileSink, '390px');
    });

    await mobile.close();

    /* ---------- G. reduced motion ---------- */

    const calm = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce'
    });
    const calmPage = await calm.newPage();
    await calmPage.goto(BASE + '/creator-studio/', { waitUntil: 'load' });

    await check('reduced motion removes transitions and animation', async () => {
      const values = await calmPage.evaluate(() => {
        const nodes = [document.querySelector('.jump-list a'), document.querySelector('.std-section')];
        return nodes.map((node) => {
          const style = getComputedStyle(node);
          return {
            transition: style.transitionDuration,
            animation: style.animationDuration
          };
        });
      });
      values.forEach((value) => {
        ok(/^0s/.test(value.transition), 'transition-duration is ' + value.transition);
        ok(/^0s/.test(value.animation), 'animation-duration is ' + value.animation);
      });
      return values.map((v) => v.transition + '/' + v.animation).join(' ');
    });

    await calm.close();

    /* ---------- H. storage isolation ---------- */

    const store = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const storePage = await store.newPage();
    const storeSink = newSink();
    watch(storePage, storeSink);

    await check('browsing the Studio leaves the three save keys byte-identical', async () => {
      await storePage.goto(BASE + '/creator-studio/', { waitUntil: 'load' });

      const seeded = {
        tws: '{"scene":"cast","v":1,"sentinel":"phase7-creator-studio"}',
        'wrong-script.story.the-ninth-bell.v1': '{"watch":2,"sentinel":"phase7-creator-studio"}',
        'wrong-script.arcade.signal-path.v1': '{"unlocked":3,"sentinel":"phase7-creator-studio"}'
      };

      await storePage.evaluate((values) => {
        Object.keys(values).forEach((key) => window.localStorage.setItem(key, values[key]));
      }, seeded);

      const before = await storePage.evaluate(() => {
        const out = {};
        Object.keys(window.localStorage).sort().forEach((key) => {
          out[key] = window.localStorage.getItem(key);
        });
        return out;
      });

      await storePage.locator('.jump-list a[href="#format"]').click();
      await storePage.locator('.jump-list a[href="#not-yet"]').click();
      await storePage.locator('.site-nav a[href="../archive/"]').first().click();
      await storePage.waitForURL(/\/archive\/$/);
      await storePage.goBack();
      await storePage.waitForURL(/\/creator-studio\//);

      const after = await storePage.evaluate(() => {
        const out = {};
        Object.keys(window.localStorage).sort().forEach((key) => {
          out[key] = window.localStorage.getItem(key);
        });
        return out;
      });

      SAVE_KEYS.forEach((key) => {
        ok(before[key] !== undefined, 'the seeded key ' + key + ' was not present');
        ok(after[key] === before[key], 'the value of ' + key + ' changed');
      });

      const keys = Object.keys(after);
      ok(keys.length === 3, 'expected 3 keys after browsing, found ' + keys.length + ': ' + keys.join(', '));

      return '3 keys identical, no fourth key';
    });

    await check('no console, page or request errors during the storage run', async () => {
      return sinkProblem(storeSink, 'storage run');
    });

    await store.close();
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }

  console.log('');
  if (failures.length) {
    console.log('RESULT ' + failures.length + ' failed, ' + passed + ' passed');
    failures.forEach((line) => console.log('  - ' + line));
    process.exit(1);
  }
  console.log('RESULT all checks passed (' + passed + ')');
}

main().catch((err) => {
  console.log('FAIL  the run itself failed: ' + err.message);
  process.exit(1);
});
