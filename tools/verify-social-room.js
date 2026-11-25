#!/usr/bin/env node
'use strict';

/* =====================================================================
   THE WRONG SCRIPT - The Social Room: static check
   ---------------------------------------------------------------------
   Reads the boards and the page as text. No browser, no server.

     node tools/verify-social-room.js

   What it proves: the data has the shape the renderer expects, every id
   is unique, every destination link points at a file that exists, no
   content smuggles in HTML or an external request, the page carries the
   furniture it needs, and the room's code never touches storage.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
const failures = [];

function check(name, fn) {
  try {
    const detail = fn();
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

/* ---- the boards ---------------------------------------------------- */

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('assets/js/social-room-content.js'), sandbox, {
  filename: 'social-room-content.js'
});
const data = sandbox.window.SOCIAL_ROOM;

const AREA_IDS = ['noticeboard', 'open-questions', 'gathering-board', 'whats-happening'];
const AREA_LABELS = [
  'The Noticeboard',
  'The Open Questions',
  'The Gathering Board',
  "What's Happening"
];
const STATUSES = [
  'Open now',
  'In preparation',
  'From the archive',
  'Coming up',
  'Completed'
];

check('the content file publishes four areas', () => {
  ok(data && Array.isArray(data.areas), 'window.SOCIAL_ROOM.areas is missing');
  ok(data.areas.length === 4, 'expected 4 areas, found ' + data.areas.length);
  return data.areas.length + ' areas';
});

check('the areas are in reading order with their labels', () => {
  data.areas.forEach((area, i) => {
    ok(area.id === AREA_IDS[i], 'area ' + i + ' should be ' + AREA_IDS[i] + ', is ' + area.id);
    ok(area.label === AREA_LABELS[i], 'area ' + area.id + ' label is ' + JSON.stringify(area.label));
  });
  return AREA_IDS.join(', ');
});

check('each area introduces itself', () => {
  data.areas.forEach((area) => {
    ok(typeof area.eyebrow === 'string' && area.eyebrow.trim().length > 2, area.id + ': no eyebrow');
    ok(typeof area.lede === 'string' && area.lede.trim().length > 40, area.id + ': no lede');
    ok(typeof area.footnote === 'string' && area.footnote.trim().length > 20, area.id + ': no footnote');
  });
  return 'eyebrow, lede and footnote on all four';
});

check('every area carries entries', () => {
  const counts = data.areas.map((area) => {
    ok(Array.isArray(area.entries), area.id + ': entries is not an array');
    ok(area.entries.length >= 3, area.id + ': only ' + area.entries.length + ' entries');
    return area.id + '=' + area.entries.length;
  });
  return counts.join(' ');
});

check('every entry is complete', () => {
  let total = 0;
  data.areas.forEach((area) => {
    area.entries.forEach((entry) => {
      total += 1;
      const where = area.id + '/' + (entry.id || '(no id)');
      ok(typeof entry.id === 'string' && /^[a-z0-9-]{3,60}$/.test(entry.id), where + ': bad id');
      ok(typeof entry.title === 'string' && entry.title.trim().length > 3, where + ': no title');
      ok(typeof entry.kind === 'string' && entry.kind.trim().length > 2, where + ': no kind label');
      ok(Array.isArray(entry.body) && entry.body.length > 0, where + ': no body');
      entry.body.forEach((line) => {
        ok(typeof line === 'string' && line.trim().length > 10, where + ': empty body line');
      });
      if (entry.note !== undefined) {
        ok(typeof entry.note === 'string' && entry.note.trim().length > 10, where + ': empty note');
      }
    });
  });
  return total + ' entries';
});

check('ids are unique across the room', () => {
  const seen = new Map();
  data.areas.forEach((area) => {
    ok(!seen.has(area.id), 'duplicate area id ' + area.id);
    seen.set(area.id, 'area');
    area.entries.forEach((entry) => {
      ok(!seen.has(entry.id), 'duplicate id ' + entry.id + ' in ' + area.id);
      seen.set(entry.id, area.id);
    });
  });
  return seen.size + ' unique ids';
});

check("What's Happening uses only editorial status labels", () => {
  const board = data.areas.find((area) => area.id === 'whats-happening');
  const used = new Set();
  board.entries.forEach((entry) => {
    ok(typeof entry.status === 'string' && entry.status.length > 2, entry.id + ': no status label');
    ok(STATUSES.indexOf(entry.status) !== -1, entry.id + ': unexpected status ' + JSON.stringify(entry.status));
    used.add(entry.status);
  });
  return Array.from(used).join(', ');
});

check('status labels are never presented as live event data', () => {
  const board = data.areas.find((area) => area.id === 'whats-happening');
  const text = JSON.stringify(board).toLowerCase();
  ['attendee', 'registered', 'spots left', 'going', 'rsvp', 'tickets'].forEach((word) => {
    ok(text.indexOf(word) === -1, 'the board mentions "' + word + '"');
  });
  ok(/editorial/i.test(board.footnote), 'the board does not say the labels are editorial');
  return 'no attendance vocabulary; footnote is explicit';
});

/* ---- links --------------------------------------------------------- */

function resolveHref(href) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.indexOf('//') === 0) return null;
  const clean = href.split('#')[0].split('?')[0];
  let target = path.resolve(ROOT, 'social-room', clean);
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }
  return target;
}

check('every entry link resolves to a page on disk', () => {
  const seen = [];
  data.areas.forEach((area) => {
    area.entries.forEach((entry) => {
      if (!entry.link) return;
      ok(typeof entry.link.label === 'string' && entry.link.label.length > 2, entry.id + ': link has no label');
      const target = resolveHref(entry.link.href);
      ok(target !== null, entry.id + ': link is not a local path (' + entry.link.href + ')');
      ok(fs.existsSync(target), entry.id + ': ' + entry.link.href + ' does not exist');
      if (seen.indexOf(entry.link.href) === -1) seen.push(entry.link.href);
    });
  });
  return seen.join(' ');
});

check('the room links to the five real destinations', () => {
  const hrefs = [];
  data.areas.forEach((area) => {
    area.entries.forEach((entry) => {
      if (entry.link) hrefs.push(entry.link.href);
    });
  });
  ['../film/', '../stories/', '../stories/the-ninth-bell/', '../arcade/', '../arcade/signal-path/', '../gallery/'].forEach((href) => {
    ok(hrefs.indexOf(href) !== -1, 'no entry links to ' + href);
  });
  return 'film, stories, the ninth bell, arcade, signal path, gallery';
});

check('nothing in the content is external or executable', () => {
  const text = JSON.stringify(data);
  ok(!/https?:\/\//i.test(text), 'the content contains an absolute URL');
  ok(!/mailto:|tel:|javascript:/i.test(text), 'the content contains a protocol link');
  ok(text.indexOf('<') === -1, 'the content contains an angle bracket');
  return 'no URLs, no protocols, no markup';
});

/* ---- the page ------------------------------------------------------ */

const page = read('social-room/index.html');
const renderer = read('assets/js/social-room.js');

check('the page is a real document with one h1', () => {
  ok(/^<!DOCTYPE html>/i.test(page.trim()), 'no doctype');
  ok(/<html lang="en">/.test(page), 'no lang attribute');
  const h1 = page.match(/<h1[\s>]/g) || [];
  ok(h1.length === 1, 'expected one h1, found ' + h1.length);
  ok(/<meta name="viewport"/.test(page), 'no viewport meta');
  return 'one h1, lang, viewport';
});

check('the page has a skip link and landmarks', () => {
  ok(/class="skip"[^>]*href="#boards"/.test(page), 'no skip link to the boards');
  ok(/<main id="main"/.test(page), 'no main landmark');
  ok(/<footer class="site-footer"/.test(page), 'no footer');
  ok(/<nav class="site-nav"/.test(page), 'no platform nav');
  return 'skip link, main, nav, footer';
});

check('the platform nav marks this room as the current page', () => {
  const nav = page.slice(page.indexOf('class="site-nav"'), page.indexOf('</nav>'));
  ok(/href="\.\.\/social-room\/"[^>]*aria-current="page"/.test(nav) || /aria-current="page"[^>]*href="\.\.\/social-room\/"/.test(nav), 'the Social Room link is not marked current');
  ['href="../"', 'href="../film/"', 'href="../stories/"', 'href="../arcade/"', 'href="../gallery/"'].forEach((href) => {
    ok(nav.indexOf(href) !== -1, 'the nav is missing ' + href);
  });
  return 'five destinations plus itself';
});

check('styles and scripts load in the right order', () => {
  const lobby = page.indexOf('assets/css/lobby.css');
  const room = page.indexOf('assets/css/social-room.css');
  const content = page.indexOf('assets/js/social-room-content.js');
  const render = page.indexOf('assets/js/social-room.js');
  ok(lobby !== -1 && room !== -1, 'a stylesheet is missing');
  ok(lobby < room, 'lobby.css must load before social-room.css');
  ok(content !== -1 && render !== -1, 'a script is missing');
  ok(content < render, 'the content must load before the renderer');
  ok(/defer/.test(page.slice(render, render + 120)), 'the renderer should defer');
  return 'lobby.css, social-room.css, content, renderer';
});

check('the page carries no controls that imply unavailable features', () => {
  ok(!/<form[\s>]/i.test(page), 'the page contains a form');
  ok(!/<input[\s>]/i.test(page), 'the page contains an input');
  ok(!/<textarea[\s>]/i.test(page), 'the page contains a textarea');
  const buttons = page.match(/<button[\s>]/g) || [];
  ok(buttons.length === 1, 'expected only the nav toggle button, found ' + buttons.length);
  ok(/class="nav-toggle"/.test(page), 'the one button is not the nav toggle');
  return 'no form, no input, only the nav toggle';
});

check('the renderer builds text, not markup', () => {
  ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function'].forEach((bad) => {
    ok(renderer.indexOf(bad) === -1, 'the renderer uses ' + bad);
  });
  return 'textContent and createElement only';
});

check('the room reads and writes no storage', () => {
  const files = [
    ['assets/js/social-room.js', renderer],
    ['assets/js/social-room-content.js', read('assets/js/social-room-content.js')],
    ['social-room/index.html', page]
  ];
  files.forEach(([name, text]) => {
    ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie'].forEach((bad) => {
      ok(text.indexOf(bad) === -1, name + ' mentions ' + bad);
    });
  });
  return 'no storage API in any Social Room file';
});

check("the room never mentions another room's save key", () => {
  const files = [
    read('assets/js/social-room.js'),
    read('assets/js/social-room-content.js'),
    page,
    read('assets/css/social-room.css')
  ].join('\n');
  ['tws', 'wrong-script.story.the-ninth-bell.v1', 'wrong-script.arcade.signal-path.v1'].forEach((key) => {
    ok(files.indexOf(key) === -1, 'a Social Room file mentions ' + key);
  });
  return 'tws, story key and arcade key all absent';
});

check('the room makes no network request of its own', () => {
  [renderer, read('assets/js/social-room-content.js')].forEach((text) => {
    ['fetch(', 'XMLHttpRequest', 'navigator.sendBeacon', 'WebSocket', 'EventSource'].forEach((bad) => {
      ok(text.indexOf(bad) === -1, 'the room code uses ' + bad);
    });
  });
  return 'no fetch, XHR, beacon, socket';
});

check('the stylesheet respects reduced motion', () => {
  const css = read('assets/css/social-room.css');
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(css), 'no reduced-motion block');
  ok(/scroll-behavior:\s*auto/.test(css), 'reduced motion does not reset scroll behaviour');
  return 'reduced-motion block present';
});

/* ---- the rest of the building -------------------------------------- */

const PAGES = [
  ['index.html', 'social-room/'],
  ['film/index.html', '../social-room/'],
  ['stories/index.html', '../social-room/'],
  ['stories/the-ninth-bell/index.html', '../../social-room/'],
  ['arcade/index.html', '../social-room/'],
  ['arcade/signal-path/index.html', '../../social-room/'],
  ['gallery/index.html', '../social-room/']
];

check('every existing page links to the Social Room', () => {
  PAGES.forEach(([file, href]) => {
    const text = read(file);
    ok(text.indexOf('href="' + href + '"') !== -1, file + ' has no link to ' + href);
  });
  return PAGES.length + ' pages';
});

check('the Lobby card is open and points somewhere real', () => {
  const lobby = read('index.html');
  const card = lobby.slice(lobby.indexOf('id="social-room"'));
  const block = card.slice(0, card.indexOf('</article>'));
  ok(/class="card is-open"/.test(lobby.slice(lobby.indexOf('<article', lobby.indexOf('id="social-room"') - 200))), 'the card is not marked open');
  ok(block.indexOf('href="social-room/"') !== -1, 'the card does not link to the room');
  ok(block.indexOf('class="soon"') === -1, 'the card still says Soon');
  return 'card is-open with a working link';
});

check('no page still advertises the Social Room as upcoming', () => {
  PAGES.forEach(([file]) => {
    const text = read(file);
    ok(!/Social Room[^<]*<span class="soon">/.test(text), file + ' still labels the Social Room as soon');
  });
  ok(read('index.html').indexOf('The Social Room, The Archive and The Creator Studio are still being built') === -1, 'the Lobby still says the room is being built');
  return 'no stale "soon" label';
});

check('the film file is untouched by this phase', () => {
  const film = read('film/index.html');
  ok(film.indexOf('social-room') !== -1, 'the film nav does not mention the room');
  ok(film.indexOf('window.SOCIAL_ROOM') === -1, 'the film loads Social Room data');
  ok(/localStorage/.test(film), 'the film no longer touches its own save');
  return 'nav link only';
});

/* ---- result -------------------------------------------------------- */

console.log('');
if (failures.length) {
  console.log(failures.length + ' of ' + (passed + failures.length) + ' checks failed');
  failures.forEach((failure) => console.log('  - ' + failure));
  process.exit(1);
}
console.log('all ' + passed + ' static checks passed');
