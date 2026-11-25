#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - The Gallery: static check
   ---------------------------------------------------------------------
   Run with:  node tools/verify-gallery.js

   This checks the parts of the Gallery that can be checked without a
   browser: that the collection is well formed, that every referenced
   artwork exists on disk, that the copy does not claim things that are
   not true, and that no Gallery file reaches for storage, the network or
   another room's save key.

   It does not test rendering, keyboard behaviour, layout or motion.
   Those need the browser run described in reports/PHASE-4-HANDOVER.txt,
   and this script does not pretend to replace it.
   ===================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

let failures = 0;

function check(label, pass, detail) {
  const mark = pass ? 'PASS ' : 'FAIL ';
  if (!pass) { failures += 1; }
  console.log(mark + ' ' + label + (detail ? '  [' + detail + ']' : ''));
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function exists(relative) {
  return fs.existsSync(path.join(root, relative));
}

/* ---------------------------------------------------------------------
   Load the collection the way the browser loads it: a window object, a
   script, no DOM.
   --------------------------------------------------------------------- */
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('assets/js/gallery-exhibits.js'), sandbox, { filename: 'gallery-exhibits.js' });

const categories = sandbox.window.GALLERY_CATEGORIES;
const exhibits = sandbox.window.GALLERY_EXHIBITS;

check('the collection file defines categories', Array.isArray(categories) && categories.length > 0,
  Array.isArray(categories) ? categories.length + ' categories' : 'missing');

check('the collection file defines exhibits', Array.isArray(exhibits) && exhibits.length > 0,
  Array.isArray(exhibits) ? exhibits.length + ' exhibits' : 'missing');

const wantedCategories = ['visual-art', 'photography', 'poetry', 'writing', 'illustration', 'music'];
const foundCategories = (categories || []).map(function (c) { return c && c.id; });

wantedCategories.forEach(function (id) {
  check('category present: ' + id, foundCategories.indexOf(id) !== -1);
});

check('no duplicate category ids', new Set(foundCategories).size === foundCategories.length);

const categoryIds = new Set(foundCategories);

const ids = [];
let everyExhibitComplete = true;
let everyCategoryUsed = new Set();
let allStudioCredited = true;
let mediaFilesExist = true;
let allAltTextPresent = true;
let noMarkupInContent = true;

(exhibits || []).forEach(function (exhibit) {
  ids.push(exhibit.id);

  const complete = Boolean(
    exhibit.id && exhibit.title && exhibit.category && exhibit.blurb &&
    Array.isArray(exhibit.body) && exhibit.body.length > 0 && exhibit.credit
  );
  if (!complete) {
    everyExhibitComplete = false;
    console.log('       incomplete exhibit: ' + (exhibit.id || '(no id)'));
  }

  if (!categoryIds.has(exhibit.category)) {
    everyExhibitComplete = false;
    console.log('       unknown category on ' + exhibit.id + ': ' + exhibit.category);
  } else {
    everyCategoryUsed.add(exhibit.category);
  }

  if (exhibit.credit !== 'The Wrong Script Studio') {
    allStudioCredited = false;
    console.log('       unexpected credit on ' + exhibit.id + ': ' + exhibit.credit);
  }

  if (exhibit.media) {
    const src = String(exhibit.media.src || '');
    if (!exists(path.join('gallery', src))) {
      mediaFilesExist = false;
      console.log('       missing artwork: ' + src + ' (from ' + exhibit.id + ')');
    }
    if (!exhibit.media.alt || exhibit.media.alt.length < 20) {
      allAltTextPresent = false;
      console.log('       thin or missing alt text on ' + exhibit.id);
    }
  }

  // Content is text, never markup. Anything that looks like a tag or an
  // inline handler is a mistake worth catching before it ships.
  const blob = [exhibit.title, exhibit.blurb, exhibit.credit, exhibit.note]
    .concat(exhibit.body || []).join(' ');
  if (/<\s*script|on\w+\s*=|javascript:/i.test(blob)) {
    noMarkupInContent = false;
    console.log('       markup-like text in ' + exhibit.id);
  }
});

check('at least six exhibits are published', (exhibits || []).length >= 6, (exhibits || []).length + ' exhibits');
check('exhibit ids are unique', new Set(ids).size === ids.length, ids.length + ' unique ids');
check('every exhibit has the required fields', everyExhibitComplete);
check('every category has at least one exhibit', everyCategoryUsed.size === wantedCategories.length,
  everyCategoryUsed.size + ' of ' + wantedCategories.length + ' shelves stocked');
check('every exhibit is credited to The Wrong Script Studio', allStudioCredited);
check('every referenced artwork exists on disk', mediaFilesExist);
check('every image has meaningful alt text', allAltTextPresent);
check('no exhibit content contains markup or inline handlers', noMarkupInContent);

/* ---------------------------------------------------------------------
   The artwork itself: original local SVG, no remote references.
   --------------------------------------------------------------------- */
const artwork = ['red-room.svg', 'set-dressing.svg', 'low-water.svg', 'the-booth.svg', 'cue-07.svg'];

artwork.forEach(function (file) {
  const relative = 'assets/img/gallery/' + file;
  if (!exists(relative)) {
    check('artwork present: ' + file, false, 'missing');
    return;
  }
  const svg = read(relative);
  const wellFormed = /^<svg[\s>]/.test(svg.trim()) && /<\/svg>\s*$/.test(svg.trim());
  const hasLabel = /role="img"/.test(svg) && /<title/.test(svg) && /<desc/.test(svg);
  const remote = /(?:href|src)\s*=\s*"(?:https?:)?\/\//i.test(svg);
  check('artwork is well-formed and labelled: ' + file, wellFormed && hasLabel && !remote,
    [wellFormed ? 'svg' : 'malformed', hasLabel ? 'titled' : 'unlabelled', remote ? 'remote reference' : 'local only'].join(', '));
});

/* ---------------------------------------------------------------------
   Gallery source isolation. The film's key, the story's key and the
   arcade's key belong to their own rooms and must not appear here.
   --------------------------------------------------------------------- */
const gallerySources = [
  'gallery/index.html',
  'assets/js/gallery.js',
  'assets/js/gallery-exhibits.js',
  'assets/css/gallery.css'
];

const joined = gallerySources.map(read).join('\n');

check('no Gallery file uses browser storage',
  !/localStorage|sessionStorage|indexedDB/i.test(joined));

check('no Gallery file names the film, story or arcade save keys',
  !/\btws\b|wrong-script\.story\.|wrong-script\.arcade\./.test(joined));

check('no Gallery file fetches or opens a network request',
  !/\bfetch\s*\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon/.test(joined));

check('no Gallery file references an external host',
  !/(?:src|href)\s*=\s*"https?:\/\//i.test(joined));

check('the Gallery ships no audio element and nothing autoplays',
  !/<audio|autoplay/i.test(joined));

check('the Gallery has no upload, account or publish control',
  !/<input[^>]+type="file"|type="password"|contenteditable/i.test(joined));

/* ---------------------------------------------------------------------
   Page furniture that the accessibility checks depend on.
   --------------------------------------------------------------------- */
const page = read('gallery/index.html');

check('the page marks itself as the current destination', /aria-current="page"/.test(page));
check('the page offers a skip link', /class="skip"\s+href="#collection"/.test(page));
check('the page has one h1', (page.match(/<h1\b/g) || []).length === 1);
check('the page loads the shared stylesheet before its own',
  page.indexOf('lobby.css') < page.indexOf('gallery.css'));
check('the page loads the collection before the renderer',
  page.indexOf('gallery-exhibits.js') < page.indexOf('gallery.js'));
check('the page links back to the Lobby', /href="\.\.\/"/.test(page));

/* ---------------------------------------------------------------------
   Earlier rooms untouched by this phase: the film is the protected one.
   --------------------------------------------------------------------- */
const film = read('film/index.html');
check('the film still saves under its own key', /localStorage/.test(film) && /\btws\b/.test(film));

console.log('');
console.log(failures === 0
  ? 'RESULT  all ' + 'checks passed'
  : 'RESULT  ' + failures + ' check(s) failed');

process.exit(failures === 0 ? 0 : 1);
