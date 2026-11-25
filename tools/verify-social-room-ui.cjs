'use strict';

/* =====================================================================
   THE WRONG SCRIPT - The Social Room: browser check
   ---------------------------------------------------------------------
   Serves the site on port 4173 and drives real Chromium.

     node tools/verify-social-room-ui.cjs

   Covers: all eight routes at 1280px and 390px, horizontal overflow,
   the four boards and their entry counts, the jump list and its
   aria-current state, board deep links, unknown-hash recovery, the
   Lobby and Gallery ways in, the way back, every destination link,
   44px targets, keyboard focus rings, reduced-motion emulation, and the
   three existing save keys staying byte-identical.
   ===================================================================== */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 4173;
const BASE = 'http://127.0.0.1:' + PORT;
const PLAYWRIGHT = '/opt/appjet/browser/node_modules/playwright';

const ROUTES = [
  '/',
  '/film/',
  '/stories/',
  '/stories/the-ninth-bell/',
  '/arcade/',
  '/arcade/signal-path/',
  '/gallery/',
  '/social-room/'
];

const VIEWPORTS = [
  { name: '1280px desktop', width: 1280, height: 900 },
  { name: '390px phone', width: 390, height: 844 }
];

const BOARDS = ['The Noticeboard', 'The Open Questions', 'The Gathering Board', "What's Happening"];
const STATUSES = ['Open now', 'In preparation', 'From the archive', 'Coming up', 'Completed'];

let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    passed += 1;
    console.log('PASS  ' + name + (detail ? '  [' + detail + ']' : ''));
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    failures.push(name + ': ' + message);
    console.log('FAIL  ' + name + '  -> ' + message);
  }
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

function status(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.setTimeout(2000, () => req.destroy(new Error('timeout')));
  });
}

async function waitForServer(deadlineMs) {
  const end = Date.now() + deadlineMs;
  while (Date.now() < end) {
    try {
      if ((await status(BASE + '/')) === 200) return true;
    } catch (err) {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

(async () => {
  let playwright;
  try {
    playwright = require(PLAYWRIGHT);
  } catch (err) {
    console.log('FAIL  Playwright is not available at ' + PLAYWRIGHT);
    process.exit(1);
  }

  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT,
    stdio: 'ignore'
  });
  const stop = () => {
    try {
      server.kill('SIGTERM');
    } catch (err) {
      /* already gone */
    }
  };
  process.on('exit', stop);

  if (!(await waitForServer(15000))) {
    console.log('FAIL  the local server did not start on port ' + PORT);
    stop();
    process.exit(1);
  }

  const browser = await playwright.chromium.launch();
  const settle = (page, ms) => page.waitForTimeout(ms || 300);

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    const noise = { console: [], pageerror: [], failed: [], external: [] };

    page.on('console', (m) => {
      if (m.type() === 'error') noise.console.push(m.text());
    });
    page.on('pageerror', (e) => noise.pageerror.push(e.message));
    page.on('requestfailed', (r) => {
      const failure = r.failure();
      noise.failed.push(r.url() + ' ' + (failure ? failure.errorText : ''));
    });
    page.on('request', (r) => {
      const host = new URL(r.url()).hostname;
      if (host !== '127.0.0.1' && host !== 'localhost') noise.external.push(r.url());
    });

    /* ---- A. routes ------------------------------------------------ */

    await check('all eight routes load at ' + vp.name, async () => {
      const problems = [];
      for (const route of ROUTES) {
        const res = await page.goto(BASE + route, { waitUntil: 'load' });
        const code = res ? res.status() : 0;
        const chars = await page.evaluate(() =>
          document.body ? document.body.textContent.trim().length : 0
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        if (code !== 200) problems.push(route + ' status ' + code);
        if (chars < 200) problems.push(route + ' body ' + chars + ' chars');
        if (overflow > 1) problems.push(route + ' overflows by ' + overflow + 'px');
      }
      ok(problems.length === 0, problems.join('; '));
      return ROUTES.length + ' routes, 200, no overflow';
    });

    /* ---- B. the four boards --------------------------------------- */

    await check('the four boards render at ' + vp.name, async () => {
      await page.goto(BASE + '/social-room/', { waitUntil: 'load' });
      const labels = await page.$$eval('.area-title', (els) => els.map((e) => e.textContent.trim()));
      ok(labels.length === 4, 'expected 4 board headings, found ' + labels.length);
      BOARDS.forEach((board, i) => {
        ok(labels[i].toLowerCase() === board.toLowerCase(), 'board ' + i + ' reads ' + labels[i]);
      });
      const h1 = await page.$$eval('h1', (els) => els.length);
      ok(h1 === 1, 'expected one h1, found ' + h1);
      return labels.join(' | ');
    });

    await check('each board carries its entries at ' + vp.name, async () => {
      const counts = await page.evaluate(() => {
        const out = {};
        document.querySelectorAll('.sr-area').forEach((area) => {
          out[area.id] = area.querySelectorAll('.sr-entry').length;
        });
        return out;
      });
      ok(counts['noticeboard'] === 4, 'noticeboard has ' + counts['noticeboard']);
      ok(counts['open-questions'] === 4, 'open questions has ' + counts['open-questions']);
      ok(counts['gathering-board'] === 4, 'gathering board has ' + counts['gathering-board']);
      ok(counts['whats-happening'] === 6, "what's happening has " + counts['whats-happening']);
      return JSON.stringify(counts);
    });

    await check('every entry says what kind of writing it is at ' + vp.name, async () => {
      const bad = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('.sr-entry').forEach((entry) => {
          const kind = entry.querySelector('.sr-kind');
          if (!kind || kind.textContent.trim().length < 3) out.push(entry.id + ': no kind label');
          const title = entry.querySelector('h3');
          if (!title || title.textContent.trim().length < 3) out.push(entry.id + ': no title');
        });
        return out;
      });
      ok(bad.length === 0, bad.join('; '));
      const total = await page.$$eval('.sr-entry', (els) => els.length);
      return total + ' entries, all labelled';
    });

    await check("What's Happening uses editorial labels at " + vp.name, async () => {
      const labels = await page.$$eval('#whats-happening .sr-status', (els) =>
        els.map((e) => e.textContent.trim())
      );
      ok(labels.length === 6, 'expected 6 status labels, found ' + labels.length);
      labels.forEach((label) => ok(STATUSES.indexOf(label) !== -1, 'unexpected status ' + label));
      const footnote = await page.textContent('#whats-happening .sr-footnote');
      ok(/editorial/i.test(footnote), 'the board does not call its labels editorial');
      return labels.join(', ');
    });

    await check('no entry claims members or live activity at ' + vp.name, async () => {
      const text = await page.evaluate(() => document.getElementById('boards').textContent.toLowerCase());
      const banned = ['followers', 'likes', 'upvotes', 'trending', 'members online', 'joined by', 'comments ('];
      const found = banned.filter((word) => text.indexOf(word) !== -1);
      ok(found.length === 0, 'the room claims ' + found.join(', '));
      const forms = await page.$$eval('form, input, textarea, select', (els) => els.length);
      ok(forms === 0, forms + ' form controls present');
      const buttons = await page.$$eval('button', (els) => els.map((e) => e.id));
      ok(buttons.length === 1 && buttons[0] === 'nav-toggle', 'unexpected buttons: ' + buttons.join(', '));
      return 'no social proof, no form controls, only the nav toggle';
    });

    /* ---- C. jump list, deep links, recovery ----------------------- */

    await check('the jump list moves between boards at ' + vp.name, async () => {
      await page.goto(BASE + '/social-room/', { waitUntil: 'load' });
      const count = await page.$$eval('#jump .jump-list a', (els) => els.length);
      ok(count === 4, 'expected 4 jump links, found ' + count);
      await page.click('#jump .jump-list a[data-area="gathering-board"]');
      await settle(page, 500);
      const state = await page.evaluate(() => ({
        hash: location.hash,
        current: Array.from(document.querySelectorAll('#jump .jump-list a'))
          .filter((a) => a.getAttribute('aria-current') === 'location')
          .map((a) => a.getAttribute('data-area'))
      }));
      ok(state.hash === '#gathering-board', 'hash is ' + state.hash);
      ok(
        state.current.length === 1 && state.current[0] === 'gathering-board',
        'aria-current sits on ' + JSON.stringify(state.current)
      );
      return 'hash ' + state.hash + ', one aria-current';
    });

    await check('a board deep link opens and focuses that board at ' + vp.name, async () => {
      await page.goto(BASE + '/social-room/#whats-happening', { waitUntil: 'load' });
      await settle(page, 500);
      const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
      ok(focused === 'whats-happening-title', 'focus went to ' + focused);
      const noteShowing = await page.evaluate(() => {
        const note = document.getElementById('hash-note');
        return !!note && !note.hidden && note.offsetParent !== null;
      });
      ok(!noteShowing, 'the unknown-link note shows for a valid board');
      return 'focused #whats-happening-title';
    });

    await check('an unknown deep link explains itself at ' + vp.name, async () => {
      await page.goto(BASE + '/social-room/#no-such-board', { waitUntil: 'load' });
      await settle(page, 500);
      const note = await page.evaluate(() => {
        const el = document.getElementById('hash-note');
        if (!el || el.hidden || el.offsetParent === null) return '';
        return el.textContent.trim();
      });
      ok(note.length > 40, 'the note is not visible');
      ok(/no board/i.test(note), 'the note does not say what went wrong: ' + note);
      await page.click('#hash-note a');
      await settle(page, 500);
      const hash = await page.evaluate(() => location.hash);
      ok(hash === '#noticeboard', 'the recovery link went to ' + hash);
      return 'note shown, recovery to ' + hash;
    });

    /* ---- D. navigation -------------------------------------------- */

    await check('the Lobby card opens the room at ' + vp.name, async () => {
      await page.goto(BASE + '/', { waitUntil: 'load' });
      await page.click('#social-room a[href="social-room/"]');
      await page.waitForURL('**/social-room/');
      const heading = await page.textContent('h1');
      ok(/social room/i.test(heading), 'the room heading reads ' + heading);
      return 'reached /social-room/';
    });

    await check('the room returns to the Lobby at ' + vp.name, async () => {
      await page.goto(BASE + '/social-room/', { waitUntil: 'load' });
      await page.click('main a[href="../"]');
      await page.waitForURL(BASE + '/');
      return 'back at /';
    });

    await check('the platform nav reaches the room from another page at ' + vp.name, async () => {
      await page.goto(BASE + '/gallery/', { waitUntil: 'load' });
      if (vp.width < 700) await page.click('#nav-toggle');
      await page.click('.site-nav a[href="../social-room/"]');
      await page.waitForURL('**/social-room/');
      return 'Gallery nav link works';
    });

    await check('every entry link reaches a real page at ' + vp.name, async () => {
      await page.goto(BASE + '/social-room/', { waitUntil: 'load' });
      const hrefs = await page.$$eval('.sr-link', (els) => els.map((e) => e.getAttribute('href')));
      const unique = Array.from(new Set(hrefs));
      ok(unique.length >= 6, 'only ' + unique.length + ' destination links');
      const bad = [];
      for (const href of unique) {
        const res = await page.goto(new URL(href, BASE + '/social-room/').href, {
          waitUntil: 'domcontentloaded'
        });
        if (!res || res.status() !== 200) bad.push(href + ' -> ' + (res ? res.status() : 'none'));
      }
      ok(bad.length === 0, bad.join('; '));
      return unique.length + ' destinations, all 200';
    });

    /* ---- E. targets, keyboard, motion ----------------------------- */

    if (vp.width === 390) {
      await check('controls are at least 44px tall at 390px', async () => {
        await page.goto(BASE + '/social-room/', { waitUntil: 'load' });
        const sizes = await page.evaluate(() => {
          const pick = (sel) => {
            const el = document.querySelector(sel);
            return el ? Math.round(el.getBoundingClientRect().height) : -1;
          };
          return {
            jump: pick('#jump .jump-list a'),
            entryLink: pick('.sr-link'),
            toggle: pick('#nav-toggle'),
            footerLink: pick('.footer-links a')
          };
        });
        const small = Object.keys(sizes).filter((key) => sizes[key] !== -1 && sizes[key] < 44);
        ok(small.length === 0, 'under 44px: ' + small.map((k) => k + '=' + sizes[k]).join(', '));
        return JSON.stringify(sizes);
      });
    }

    await check('keyboard focus is visible in the room at ' + vp.name, async () => {
      await page.goto(BASE + '/social-room/', { waitUntil: 'load' });
      await page.evaluate(() => document.body.focus());
      const stops = [];
      for (let i = 0; i < 12; i += 1) {
        await page.keyboard.press('Tab');
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const ring =
            (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
          return { tag: el.tagName.toLowerCase(), ring: ring };
        });
        if (stop) stops.push(stop);
      }
      ok(stops.length >= 8, 'only ' + stops.length + ' focus stops');
      const bare = stops.filter((s) => !s.ring).map((s) => s.tag);
      ok(bare.length === 0, 'no visible ring on: ' + bare.join(', '));
      return stops.length + ' stops, each with a ring';
    });

    await check('reduced motion removes the transitions at ' + vp.name, async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(BASE + '/social-room/', { waitUntil: 'load' });
      const durations = await page.evaluate(() => {
        const read = (sel) => {
          const el = document.querySelector(sel);
          return el ? getComputedStyle(el).transitionDuration : '0s';
        };
        return { jump: read('#jump .jump-list a'), entry: read('.sr-entry'), link: read('.sr-link') };
      });
      const running = Object.keys(durations).filter((key) =>
        durations[key].split(',').some((part) => parseFloat(part) > 0)
      );
      ok(running.length === 0, 'transitions still run: ' + JSON.stringify(durations));
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      return 'all transition durations 0s';
    });

    /* ---- F. storage ------------------------------------------------ */

    await check('the room leaves every save key untouched at ' + vp.name, async () => {
      const TW = '{"scene":"title","probe":"phase5"}';
      const STORY = '{"v":1,"scene":"watch-1"}';
      const ARCADE = '{"v":1,"unlocked":3,"completed":[1,2],"best":{"1":9}}';
      await page.goto(BASE + '/', { waitUntil: 'load' });
      await page.evaluate(
        ([tw, story, arcade]) => {
          localStorage.clear();
          localStorage.setItem('tws', tw);
          localStorage.setItem('wrong-script.story.the-ninth-bell.v1', story);
          localStorage.setItem('wrong-script.arcade.signal-path.v1', arcade);
        },
        [TW, STORY, ARCADE]
      );
      await page.goto(BASE + '/social-room/', { waitUntil: 'load' });
      await settle(page, 600);
      await page.click('#jump .jump-list a[data-area="noticeboard"]');
      await settle(page, 300);
      const after = await page.evaluate(() => ({
        keys: Object.keys(localStorage).sort(),
        tws: localStorage.getItem('tws'),
        story: localStorage.getItem('wrong-script.story.the-ninth-bell.v1'),
        arcade: localStorage.getItem('wrong-script.arcade.signal-path.v1')
      }));
      ok(after.keys.length === 3, 'expected 3 keys, found ' + after.keys.join(', '));
      ok(after.tws === TW, 'tws was changed');
      ok(after.story === STORY, 'the story key was changed');
      ok(after.arcade === ARCADE, 'the arcade key was changed');
      return '3 keys, byte-identical, no fourth key';
    });

    /* ---- G. console, requests ------------------------------------- */

    await check('no console errors, page errors or failed requests at ' + vp.name, async () => {
      const problems = []
        .concat(noise.console.map((t) => 'console: ' + t))
        .concat(noise.pageerror.map((t) => 'pageerror: ' + t))
        .concat(noise.failed.map((t) => 'request failed: ' + t))
        .concat(noise.external.map((t) => 'external request: ' + t));
      ok(problems.length === 0, problems.slice(0, 6).join('; '));
      return 'clean over ' + ROUTES.length + ' routes and every interaction';
    });

    await context.close();
  }

  await browser.close();
  stop();

  console.log('');
  if (failures.length) {
    console.log(failures.length + ' of ' + (passed + failures.length) + ' browser checks failed');
    failures.forEach((failure) => console.log('  - ' + failure));
    process.exit(1);
  }
  console.log('all ' + passed + ' browser checks passed');
})().catch((err) => {
  console.log('FAIL  the check stopped early: ' + (err && err.message ? err.message : err));
  process.exit(1);
});
