#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - navigation and truthfulness check
   ---------------------------------------------------------------------
   A development check, not part of the website. It reads the shipped
   HTML and data files and asserts, for every route:

     1. the route's index.html exists,
     2. its shared navigation lists every open room and no others,
     3. every navigation href resolves to a file that exists,
     4. exactly one navigation link is marked as the current page,
     5. every navigation link has readable text,
     6. every local link on the page resolves,
     7. no page still claims a room is unbuilt, since all of them are open,
     8. the film is still standalone: it carries no platform navigation,
     9. the two catalogues (stories, arcade) point at real pages.

   This is a static check. It proves that links resolve on disk; it does
   not prove that a browser renders them, which the browser suites do.

   Run from the repository root:

     node tools/verify-nav.js

   Exit code 0 means every check passed.
   ===================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const results = [];

function check(name, fn) {
  try {
    const detail = fn();
    results.push({ ok: true, name: name, detail: detail || '' });
    console.log('PASS  ' + name + (detail ? '  [' + detail + ']' : ''));
  } catch (error) {
    results.push({ ok: false, name: name, detail: error.message });
    console.log('FAIL  ' + name + '  [' + error.message + ']');
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

/* The eight platform destinations, in the order the shared navigation uses. */
const ROOMS = [
  { route: '/', file: 'index.html', label: 'Lobby' },
  { route: '/stories/', file: 'stories/index.html', label: 'The Stories' },
  { route: '/arcade/', file: 'arcade/index.html', label: 'The Arcade' },
  { route: '/gallery/', file: 'gallery/index.html', label: 'The Gallery' },
  { route: '/social-room/', file: 'social-room/index.html', label: 'The Social Room' },
  { route: '/archive/', file: 'archive/index.html', label: 'The Archive' },
  { route: '/creator-studio/', file: 'creator-studio/index.html', label: 'The Creator Studio' },
  { route: '/film/', file: 'film/index.html', label: 'Original Production' }
];

/* Experiences: pages that are reached from a room but are not in the nav. */
const EXPERIENCES = [
  { route: '/stories/the-ninth-bell/', file: 'stories/the-ninth-bell/index.html' },
  { route: '/stories/the-returns-hatch/', file: 'stories/the-returns-hatch/index.html' },
  { route: '/arcade/signal-path/', file: 'arcade/signal-path/index.html' },
  { route: '/arcade/lamplight/', file: 'arcade/lamplight/index.html' }
];

/* Pages that must carry the shared platform navigation. The film is
   deliberately not in this list: it is a standalone production. */
const NAV_PAGES = ROOMS.filter(function (room) {
  return room.route !== '/film/';
});

function navBlock(html) {
  const match = /<nav\b[^>]*id="site-nav"[^>]*>([\s\S]*?)<\/nav>/i.exec(html);
  if (!match) { return null; }
  return match[1];
}

function hrefs(fragment) {
  const out = [];
  const re = /href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(fragment)) !== null) { out.push(m[1]); }
  return out;
}

function stripTags(fragment) {
  return fragment.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/* Resolve an href from a page's directory to a repository-relative path. */
function resolve(pageFile, href) {
  if (/^(?:[a-z]+:|\/\/|#|mailto:|tel:)/i.test(href)) { return null; }
  const dir = path.posix.dirname(pageFile);
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) { return null; }
  let target = path.posix.normalize(path.posix.join(dir, clean));
  if (target.startsWith('../')) { return target; }
  if (target.endsWith('/')) { target += 'index.html'; }
  return target;
}

/* ---------------------------------------------------------------- routes */

check('every route has a page on disk', function () {
  const all = ROOMS.concat(EXPERIENCES);
  const missing = all.filter(function (item) { return !exists(item.file); });
  if (missing.length) {
    throw new Error('missing ' + missing.map(function (m) { return m.file; }).join(', '));
  }
  return all.length + ' pages';
});

check('every page is non-trivial', function () {
  const all = ROOMS.concat(EXPERIENCES);
  const thin = all.filter(function (item) {
    return fs.statSync(path.join(ROOT, item.file)).size < 800;
  });
  if (thin.length) {
    throw new Error('suspiciously small ' + thin.map(function (m) { return m.file; }).join(', '));
  }
  return 'all over 800 bytes';
});

/* ------------------------------------------------------------------- nav */

check('every platform page carries the shared navigation', function () {
  const missing = NAV_PAGES.filter(function (room) { return !navBlock(read(room.file)); });
  if (missing.length) {
    throw new Error('no #site-nav in ' + missing.map(function (m) { return m.file; }).join(', '));
  }
  return NAV_PAGES.length + ' pages';
});

check('the navigation lists every room and nothing else', function () {
  const problems = [];
  NAV_PAGES.forEach(function (room) {
    const block = navBlock(read(room.file));
    if (!block) { problems.push(room.file + ': no nav'); return; }
    const targets = hrefs(block).map(function (href) { return resolve(room.file, href); });
    ROOMS.forEach(function (dest) {
      if (targets.indexOf(dest.file) === -1) {
        problems.push(room.file + ' -> missing ' + dest.file);
      }
    });
    if (targets.length !== ROOMS.length) {
      problems.push(room.file + ': ' + targets.length + ' links, expected ' + ROOMS.length);
    }
  });
  if (problems.length) { throw new Error(problems.slice(0, 4).join('; ')); }
  return NAV_PAGES.length + ' pages x ' + ROOMS.length + ' destinations';
});

check('every navigation href resolves to a file', function () {
  const problems = [];
  NAV_PAGES.forEach(function (room) {
    hrefs(navBlock(read(room.file))).forEach(function (href) {
      const target = resolve(room.file, href);
      if (target === null) { return; }
      if (!exists(target)) { problems.push(room.file + ' -> ' + href); }
    });
  });
  if (problems.length) { throw new Error(problems.join('; ')); }
  return 'all navigation links resolve';
});

check('each page marks exactly one current link', function () {
  const problems = [];
  NAV_PAGES.forEach(function (room) {
    const block = navBlock(read(room.file));
    const count = (block.match(/aria-current=/g) || []).length;
    if (count !== 1) { problems.push(room.file + ': ' + count); }
    const self = hrefs(block).map(function (href) { return resolve(room.file, href); });
    if (self.indexOf(room.file) === -1) { problems.push(room.file + ': nav omits itself'); }
  });
  if (problems.length) { throw new Error(problems.join('; ')); }
  return 'one per page';
});

check('every navigation link has readable text', function () {
  const problems = [];
  NAV_PAGES.forEach(function (room) {
    const block = navBlock(read(room.file));
    const links = block.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];
    links.forEach(function (link) {
      const text = stripTags(link);
      const hasLabel = /aria-label="[^"]+"/i.test(link);
      if (!text && !hasLabel) { problems.push(room.file + ': ' + link.slice(0, 60)); }
    });
  });
  if (problems.length) { throw new Error(problems.slice(0, 3).join('; ')); }
  return 'no unlabelled links';
});

/* ------------------------------------------------------------ local links */

check('every local link on every page resolves', function () {
  const all = ROOMS.concat(EXPERIENCES);
  const problems = [];
  all.forEach(function (item) {
    const html = read(item.file);
    hrefs(html).forEach(function (href) {
      const target = resolve(item.file, href);
      if (target === null) { return; }
      if (target.startsWith('../')) { problems.push(item.file + ' -> escapes root: ' + href); return; }
      if (!exists(target)) { problems.push(item.file + ' -> ' + href); }
    });
  });
  if (problems.length) { throw new Error(problems.slice(0, 5).join('; ')); }
  return all.length + ' pages checked';
});

check('no page still calls a room unbuilt', function () {
  const all = NAV_PAGES;
  const stale = [
    /under construction/i,
    /coming in a later phase/i,
    /still being built/i,
    /is being built/i
  ];
  const problems = [];
  all.forEach(function (room) {
    const html = read(room.file);
    stale.forEach(function (re) {
      if (re.test(html)) { problems.push(room.file + ': ' + re); }
    });
  });
  if (problems.length) { throw new Error(problems.join('; ')); }
  return 'all rooms described as open';
});

/* -------------------------------------------------------------- the film */

check('the film carries no platform navigation', function () {
  const html = read('film/index.html');
  if (/id="site-nav"/i.test(html)) { throw new Error('film has #site-nav'); }
  if (/social-room|creator-studio|the-returns-hatch|lamplight/i.test(html)) {
    throw new Error('film references a platform room');
  }
  return 'standalone';
});

check('the film is not listed as a story or a game', function () {
  const stories = read('assets/js/stories-index.js');
  const games = read('assets/js/arcade-games.js');
  if (/film\//.test(stories)) { throw new Error('stories catalogue links the film'); }
  if (/'film'|film\//.test(games)) { throw new Error('arcade catalogue links the film'); }
  return 'kept separate';
});

/* ----------------------------------------------------------- catalogues */

check('the stories catalogue points at real pages', function () {
  const source = read('assets/js/stories-index.js');
  const slugs = [];
  const re = /slug:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(source)) !== null) { slugs.push(m[1]); }
  if (slugs.length < 2) { throw new Error('expected at least two stories, found ' + slugs.length); }
  const problems = slugs.filter(function (slug) {
    return !exists('stories/' + slug + '/index.html') ||
           !exists('stories/data/' + slug + '.js');
  });
  if (problems.length) { throw new Error('no page or data for ' + problems.join(', ')); }
  return slugs.join(', ');
});

check('the arcade catalogue points at real pages', function () {
  const source = read('assets/js/arcade-games.js');
  const paths = [];
  const re = /path:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(source)) !== null) { paths.push(m[1]); }
  if (paths.length < 2) { throw new Error('expected at least two games, found ' + paths.length); }
  const problems = paths.filter(function (p) {
    return !exists('arcade/' + p + 'index.html');
  });
  if (problems.length) { throw new Error('no page for ' + problems.join(', ')); }
  return paths.join(', ');
});

/* ------------------------------------------------------------ save keys */

check('no page mentions another room\'s save key', function () {
  const all = NAV_PAGES.concat(EXPERIENCES);
  const problems = [];
  all.forEach(function (item) {
    const html = read(item.file);
    if (/localStorage/i.test(html)) { problems.push(item.file + ': inline localStorage'); }
  });
  if (problems.length) { throw new Error(problems.join('; ')); }
  return 'storage stays in the scripts that own it';
});

/* --------------------------------------------------------------- summary */

const failed = results.filter(function (r) { return !r.ok; });
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' navigation checks passed');
if (failed.length) {
  console.log('RESULT navigation check FAILED');
  process.exit(1);
}
console.log('RESULT navigation check passed');
