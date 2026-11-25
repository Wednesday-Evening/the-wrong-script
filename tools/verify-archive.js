#!/usr/bin/env node
'use strict';

/* =====================================================================
   THE WRONG SCRIPT - The Archive: static check
   ---------------------------------------------------------------------
   Reads the catalogue, the renderer and the page as text. No browser,
   no server, no network.

     node tools/verify-archive.js

   What it proves: the catalogue has the shape the renderer expects, the
   counts match the authorised scope, every id is unique, every
   destination link resolves to a file that exists, every Gallery deep
   link names an exhibit that really exists, spoilers sit only inside a
   closed disclosure, and the Archive code cannot touch storage, cookies,
   the network or another room's save.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

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
  if (!cond) { throw new Error(msg); }
}

/* ---- load the catalogue -------------------------------------------- */

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('assets/js/archive-content.js'), sandbox, { filename: 'archive-content.js' });

const data = sandbox.window.ARCHIVE_CONTENT;
const page = read('archive/index.html');
const renderer = read('assets/js/archive.js');
const styles = read('assets/css/archive.css');

/* ---- the catalogue's shape ----------------------------------------- */

check('the catalogue loads and exposes its four parts', () => {
  ok(data && typeof data === 'object', 'ARCHIVE_CONTENT missing');
  ok(Array.isArray(data.files), 'files missing');
  ok(Array.isArray(data.collections), 'collections missing');
  ok(Array.isArray(data.discoveries), 'discoveries missing');
  ok(data.record && Array.isArray(data.record.paragraphs), 'record missing');
  ok(data.closing && data.closing.text, 'closing missing');
  return 'files, collections, discoveries, record, closing';
});

check('Completed Files holds exactly three experiences', () => {
  ok(data.files.length === 3, 'expected 3, found ' + data.files.length);
  return data.files.map((f) => f.title).join(', ');
});

check('the three completed files are the authorised three', () => {
  const ids = data.files.map((f) => f.id).sort().join('|');
  ok(ids === 'signal-path|the-ninth-bell|the-wrong-script-original-production', 'unexpected set: ' + ids);
  return 'Ninth Bell, Original Production, SIGNAL PATH';
});

check('Collections holds exactly three collections', () => {
  ok(data.collections.length === 3, 'expected 3, found ' + data.collections.length);
  return data.collections.map((c) => c.title).join(', ');
});

check('Discoveries holds exactly eight discoveries', () => {
  ok(data.discoveries.length === 8, 'expected 8, found ' + data.discoveries.length);
  return '8';
});

check('every entry id is unique across the catalogue', () => {
  const ids = [];
  data.files.forEach((f) => ids.push(f.id));
  data.collections.forEach((c) => ids.push(c.id));
  data.discoveries.forEach((d) => ids.push(d.id));
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  ok(dupes.length === 0, 'duplicate ids: ' + dupes.join(', '));
  return ids.length + ' ids';
});

check('every collection has a lede and at least three entries', () => {
  data.collections.forEach((c) => {
    ok(c.lede && c.lede.length > 40, c.id + ' has no lede');
    ok(c.entries.length >= 3, c.id + ' has ' + c.entries.length + ' entries');
    c.entries.forEach((e) => {
      ok(e.title && e.kind && e.note, c.id + ' entry incomplete: ' + e.title);
    });
  });
  return '3 collections complete';
});

/* ---- links --------------------------------------------------------- */

function targets(href) {
  const clean = href.split('#')[0];
  if (!clean) { return path.join('archive', 'index.html'); }
  return path.normalize(path.join('archive', clean, clean.endsWith('/') ? 'index.html' : ''));
}

check('every destination link resolves to a file that exists', () => {
  const links = [];
  data.files.forEach((f) => links.push(f.href));
  data.collections.forEach((c) => c.entries.forEach((e) => links.push(e.href)));
  data.discoveries.forEach((d) => { if (d.href) { links.push(d.href); } });

  links.forEach((href) => {
    ok(!/^[a-z]+:/i.test(href), 'external link not allowed: ' + href);
    ok(exists(targets(href)), 'missing target for ' + href + ' -> ' + targets(href));
  });
  return links.length + ' links, all local and present';
});

check('Gallery deep links name exhibits that really exist', () => {
  const source = read('assets/js/gallery-exhibits.js');
  const ids = new Set();
  const re = /id:\s*'([a-z0-9-]+)'/g;
  let m;
  while ((m = re.exec(source)) !== null) { ids.add(m[1]); }

  const used = [];
  data.collections.forEach((c) => c.entries.forEach((e) => {
    if (e.href.indexOf('#') !== -1 && e.href.indexOf('gallery') !== -1) {
      used.push(e.href.split('#')[1]);
    }
  }));

  ok(used.length === 6, 'expected 6 gallery deep links, found ' + used.length);
  used.forEach((id) => ok(ids.has(id), 'no such exhibit: ' + id));
  return used.join(', ');
});

check('the original production is not filed under The Stories', () => {
  const film = data.files.find((f) => f.id === 'the-wrong-script-original-production');
  ok(film, 'film missing from completed files');
  ok(film.room === 'The Original Production', 'film room is ' + film.room);
  const storiesShelf = data.files.filter((f) => f.room === 'The Stories');
  ok(storiesShelf.length === 1 && storiesShelf[0].id === 'the-ninth-bell', 'The Stories shelf holds the wrong work');
  return 'film is its own room';
});

/* ---- spoilers ------------------------------------------------------ */

check('exactly one discovery carries a spoiler', () => {
  const withSpoiler = data.discoveries.filter((d) => d.spoiler);
  ok(withSpoiler.length === 1, 'found ' + withSpoiler.length);
  ok(withSpoiler[0].id === 'five-hours-five-endings', 'wrong discovery: ' + withSpoiler[0].id);
  return withSpoiler[0].id;
});

check('the spoiler summary is labelled with the word Spoiler', () => {
  const spoiler = data.discoveries.find((d) => d.spoiler);
  ok(/spoiler/i.test(spoiler.spoiler.summary), 'summary does not say Spoiler: ' + spoiler.spoiler.summary);
  return spoiler.spoiler.summary;
});

check('the spoiler is not leaked in its own visible title, note or room', () => {
  const spoiler = data.discoveries.find((d) => d.spoiler);
  const visible = [spoiler.title, spoiler.note, spoiler.room].join(' ').toLowerCase();
  ['ledger', 'rule', 'close', 'chapel', 'rope', 'two discoveries'].forEach((word) => {
    ok(visible.indexOf(word) === -1, 'visible text leaks "' + word + '"');
  });
  return 'title, note and room are clean';
});

check('no other discovery, collection or file leaks the spoiler', () => {
  const others = [];
  data.discoveries.forEach((d) => {
    if (d.id === 'five-hours-five-endings') { return; }
    others.push(d.title, d.note);
  });
  data.collections.forEach((c) => {
    others.push(c.lede);
    c.entries.forEach((e) => {
      /* The Gallery's "Ledger of Small Hours" is an approved public exhibit and
         may name itself. The story ending of that name is a different thing and
         must not appear outside the closed disclosure. */
      if (e.href.indexOf('ledger-of-small-hours') !== -1) { return; }
      others.push(e.title, e.note);
    });
  });
  data.files.forEach((f) => {
    others.push(f.summary);
    (f.facts || []).forEach((fact) => others.push(fact));
  });
  const blob = others.join(' ').toLowerCase();
  ok(blob.indexOf('ledger') === -1, 'the ending The Ledger is named outside the disclosure');
  ok(blob.indexOf('two discoveries') === -1, 'the condition is described outside the disclosure');
  ok(blob.indexOf('hopeful ending') === -1, 'the hopeful ending is discussed outside the disclosure');
  return 'no leak outside the disclosure';
});

check('the renderer never opens a disclosure on load', () => {
  ok(renderer.indexOf("setAttribute('open'") === -1, 'renderer sets the open attribute');
  ok(!/\.open\s*=\s*true/.test(renderer), 'renderer sets .open = true');
  ok(!/<details[^>]*\sopen/.test(page), 'page ships an open disclosure');
  return 'details start closed';
});

check('the renderer uses native details and summary', () => {
  ok(renderer.indexOf("el('details'") !== -1, 'no details element built');
  ok(renderer.indexOf("el('summary'") !== -1, 'no summary element built');
  return 'native disclosure';
});

/* ---- storage and network isolation --------------------------------- */

const FORBIDDEN = [
  'localStorage', 'sessionStorage', 'indexedDB', 'indexedDB',
  'document.cookie', 'fetch(', 'XMLHttpRequest', 'sendBeacon',
  'WebSocket', 'navigator.sendBeacon'
];

check('Archive scripts contain no storage, cookie or network API', () => {
  const scripts = renderer + '\n' + read('assets/js/archive-content.js');
  FORBIDDEN.forEach((token) => {
    ok(scripts.indexOf(token) === -1, 'found ' + token);
  });
  return 'clean of ' + FORBIDDEN.length + ' APIs';
});

check('Archive scripts contain none of the three save keys', () => {
  const scripts = renderer + '\n' + read('assets/js/archive-content.js') + '\n' + page;
  ['wrong-script.story.the-ninth-bell.v1', 'wrong-script.arcade.signal-path.v1'].forEach((key) => {
    ok(scripts.indexOf(key) === -1, 'found key ' + key);
  });
  ok(!/['"]tws['"]/.test(scripts), 'found the film save key');
  return 'no save keys present';
});

check('the Archive page loads no external resource', () => {
  const external = page.match(/(?:src|href)="(https?:)?\/\/[^"]+"/g) || [];
  ok(external.length === 0, 'external references: ' + external.join(', '));
  return 'all assets local';
});

check('the Archive page has no inline script and no inline style', () => {
  ok(!/<script(?![^>]*src=)/.test(page), 'inline script found');
  ok(!/\sstyle="/.test(page), 'inline style found');
  return 'no inline code';
});

/* ---- the page ------------------------------------------------------ */

check('the page carries the platform navigation with Archive current', () => {
  ok(page.indexOf('id="site-nav"') !== -1, 'no nav');
  ok(/href="\.\/" class="is-live" aria-current="page">The Archive/.test(page), 'Archive is not marked current');
  ok(page.indexOf('id="nav-toggle"') !== -1, 'no mobile toggle');
  return 'nav + toggle';
});

check('the page links back to the Lobby and every other room', () => {
  ['../', '../film/', '../stories/', '../arcade/', '../gallery/', '../social-room/'].forEach((href) => {
    ok(page.indexOf('href="' + href + '"') !== -1, 'missing link to ' + href);
  });
  return '6 room links';
});

check('the four sections and the closing note are present with ids', () => {
  ['completed-files', 'collections', 'discoveries', 'record', 'closing'].forEach((id) => {
    ok(page.indexOf('id="' + id + '"') !== -1, 'missing section #' + id);
  });
  return '4 sections + closing';
});

check('the jump list points at the four sections', () => {
  ['#completed-files', '#collections', '#discoveries', '#record'].forEach((href) => {
    ok(page.indexOf('href="' + href + '"') !== -1, 'jump link missing ' + href);
  });
  return '4 jump links';
});

check('the page provides a recovery note for an unknown hash', () => {
  ok(page.indexOf('id="hash-note"') !== -1, 'no recovery note element');
  ok(renderer.indexOf('hash-note') !== -1, 'renderer never fills it');
  ok(/No entry is filed under/.test(renderer), 'no explanatory copy');
  return 'unknown hash explained';
});

check('the page explains itself without JavaScript', () => {
  ok(page.indexOf('<noscript>') !== -1, 'no noscript block');
  ok(page.indexOf('../stories/the-ninth-bell/') !== -1, 'noscript does not point at a story');
  return 'noscript present';
});

check('the renderer never injects markup', () => {
  const code = renderer.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(!/\.innerHTML\s*=/.test(code), 'innerHTML assignment found');
  ok(code.indexOf('insertAdjacentHTML') === -1, 'insertAdjacentHTML found');
  ok(code.indexOf('outerHTML') === -1, 'outerHTML found');
  ok(code.indexOf('textContent') !== -1, 'textContent not used');
  return 'DOM built with elements and text nodes';
});

check('the page credits only The Wrong Script Studio', () => {
  const blob = JSON.stringify(data);
  ok(blob.indexOf('The Wrong Script Studio') !== -1, 'no studio credit');
  ['Author:', 'Written by', 'Editor:', 'Curated by'].forEach((phrase) => {
    ok(blob.indexOf(phrase) === -1, 'invented byline: ' + phrase);
  });
  return 'studio credit only';
});

check('no fabricated counts, ratings, awards or dates in the catalogue', () => {
  const blob = JSON.stringify(data).toLowerCase();
  /* Prose may honestly say the Archive keeps no visitor counts; what must not
     exist is an actual number attached to a popularity or attendance metric. */
  const counts = blob.match(/\d+\s*(views?|visitors?|likes?|followers?|players?|reads?|plays?|ratings?|stars?)/g);
  ok(!counts, 'numeric metric found: ' + (counts || []).join(', '));
  /* The Record may honestly state that no awards or attendance exist; what must
     not appear is a claim that something was won, ranked or attended. */
  ['award-winning', 'won an award', 'prize', 'winner', 'attended', 'trending', 'most popular', '2026-', 'january', 'february', '★', '★★★★★'].forEach((word) => {
    ok(blob.indexOf(word) === -1, 'found "' + word + '"');
  });
  return 'no invented metrics';
});

check('the catalogue contains no HTML markup', () => {
  const blob = JSON.stringify(data);
  ok(!/<[a-z][^>]*>/i.test(blob), 'markup found in content');
  return 'plain text only';
});

check('styles are mobile-first and honour reduced motion', () => {
  ok(styles.indexOf('prefers-reduced-motion') !== -1, 'no reduced-motion block');
  ok(styles.indexOf('grid-template-columns:repeat(3') !== -1, 'no wide layout');
  const fixed = styles.match(/(?:^|[;{\s])width:\s*(\d+)px/g) || [];
  fixed.forEach((declaration) => {
    const px = Number(declaration.match(/(\d+)px/)[1]);
    ok(px <= 480, 'a fixed ' + px + 'px width would overflow a phone');
  });
  return 'reduced motion + responsive grid';
});

/* ---- preservation -------------------------------------------------- */

check('the film is untouched by this phase', () => {
  const diff = execSync('git diff --name-only HEAD -- film/', { cwd: ROOT, encoding: 'utf8' }).trim();
  ok(diff === '', 'film/ has changes: ' + diff);
  return 'no diff under film/';
});

check('the existing room scripts are not modified by this phase', () => {
  const diff = execSync('git diff --name-only HEAD -- assets/js/gallery.js assets/js/social-room.js assets/js/story-engine.js assets/js/arcade-game.js', { cwd: ROOT, encoding: 'utf8' }).trim();
  ok(diff === '', 'unexpected changes: ' + diff);
  return 'room logic untouched';
});

check('the Archive ships no dependency manifest of its own', () => {
  ok(!exists('archive/package.json'), 'archive/ has a manifest');
  ok(!exists('package.json'), 'a root manifest was introduced');
  return 'still dependency-free';
});

/* ---- result -------------------------------------------------------- */

console.log('');
if (failures.length) {
  console.log(failures.length + ' of ' + (passed + failures.length) + ' checks failed');
  failures.forEach((failure) => console.log('  - ' + failure));
  process.exit(1);
}
console.log('all ' + passed + ' static checks passed');
