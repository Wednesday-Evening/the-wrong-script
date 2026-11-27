#!/usr/bin/env node
'use strict';

/* =====================================================================
   THE WRONG SCRIPT - The Creator Studio: static check
   ---------------------------------------------------------------------
   Reads the Studio's data and page as text. No browser, no server.

     node tools/verify-creator-studio.js

   What it proves: the content has the shape the renderer expects, every
   internal link resolves to a file that exists, the five parts and their
   counts are right, no content smuggles in HTML or an external request,
   the room's code never touches storage or the network, the three
   existing save keys are absent from it, and no page still advertises
   the Studio as a placeholder.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  if (!cond) throw new Error(msg);
}

/* ---- load the content ---------------------------------------------- */

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('assets/js/creator-studio-content.js'), sandbox, {
  filename: 'creator-studio-content.js'
});
const data = sandbox.window.CREATOR_STUDIO_CONTENT;

const page = read('creator-studio/index.html');
const renderer = read('assets/js/creator-studio.js');
const contentSource = read('assets/js/creator-studio-content.js');
const css = read('assets/css/creator-studio.css');

const SAVE_KEYS = [
  'tws',
  'wrong-script.story.the-ninth-bell.v1',
  'wrong-script.arcade.signal-path.v1'
];

/* ---- the data ------------------------------------------------------ */

check('the content object exists', () => {
  ok(data && typeof data === 'object', 'window.CREATOR_STUDIO_CONTENT is missing');
  return 'loaded';
});

check('The Desk has prose and one pull quote', () => {
  ok(data.desk && Array.isArray(data.desk.paragraphs), 'desk.paragraphs is missing');
  ok(data.desk.paragraphs.length >= 3, 'expected at least 3 desk paragraphs, found ' + data.desk.paragraphs.length);
  ok(typeof data.desk.pull === 'string' && data.desk.pull.length > 40, 'desk.pull is missing or too short');
  return data.desk.paragraphs.length + ' paragraphs + pull quote';
});

check('The Format publishes the five formats', () => {
  ok(Array.isArray(data.formats), 'formats is not an array');
  ok(data.formats.length === 5, 'expected 5 formats, found ' + data.formats.length);
  return data.formats.length + ' formats';
});

check('the formats are the five approved shapes, in order', () => {
  const expected = [
    'stories-and-writing',
    'games-and-interactive',
    'visual-art-and-design',
    'music-and-sound',
    'experiences-and-collaborations'
  ];
  const actual = data.formats.map((f) => f.id);
  expected.forEach((id, i) => {
    ok(actual[i] === id, 'format ' + (i + 1) + ' should be ' + id + ', found ' + actual[i]);
  });
  return actual.join(', ');
});

check('every format carries a number, a title, a lede and expectations', () => {
  data.formats.forEach((format) => {
    ok(/^\d\d$/.test(format.number), format.id + ': number should be two digits');
    ok(typeof format.title === 'string' && format.title.length > 3, format.id + ': title missing');
    ok(typeof format.lede === 'string' && format.lede.length > 40, format.id + ': lede missing');
    ok(Array.isArray(format.expects) && format.expects.length >= 3, format.id + ': expected at least 3 expectations');
    format.expects.forEach((line) => {
      ok(typeof line === 'string' && line.length > 10, format.id + ': empty expectation');
    });
  });
  return '5 formats complete';
});

check('The Standard publishes seven principles with unique ids', () => {
  ok(Array.isArray(data.standard), 'standard is not an array');
  ok(data.standard.length === 7, 'expected 7 principles, found ' + data.standard.length);
  const ids = data.standard.map((rule) => rule.id);
  ok(new Set(ids).size === ids.length, 'duplicate principle id');
  data.standard.forEach((rule) => {
    ok(typeof rule.title === 'string' && rule.title.length > 4, rule.id + ': title missing');
    ok(typeof rule.text === 'string' && rule.text.length > 40, rule.id + ': text missing');
  });
  return data.standard.length + ' principles: ' + ids.join(', ');
});

check('the standard covers the required ground', () => {
  const text = data.standard.map((rule) => (rule.title + ' ' + rule.text).toLowerCase()).join(' ');
  ['original', 'teenage audience', 'harassment', 'impersonat', 'privacy', 'review'].forEach((needle) => {
    ok(text.indexOf(needle) !== -1, 'the standard never mentions "' + needle + '"');
  });
  return 'originality, audience, harassment, impersonation, privacy, review';
});

check('The Review Process has the five stages in order', () => {
  ok(Array.isArray(data.stages), 'stages is not an array');
  const names = data.stages.map((stage) => stage.name);
  ok(names.length === 5, 'expected 5 stages, found ' + names.length);
  ok(names[0] === 'Draft', 'first stage should be Draft, found ' + names[0]);
  ok(names[1] === 'Submitted', 'second stage should be Submitted, found ' + names[1]);
  ok(names[2] === 'Under Review', 'third stage should be Under Review, found ' + names[2]);
  ok(/Changes Requested/.test(names[3]) && /Approved/.test(names[3]), 'fourth stage should be Changes Requested or Approved, found ' + names[3]);
  ok(names[4] === 'Published', 'last stage should be Published, found ' + names[4]);
  data.stages.forEach((stage) => {
    ok(typeof stage.text === 'string' && stage.text.length > 30, stage.name + ': text missing');
  });
  return names.join(' -> ');
});

check('the two other outcomes are recorded', () => {
  ok(Array.isArray(data.outcomes) && data.outcomes.length === 2, 'expected 2 outcomes');
  const names = data.outcomes.map((outcome) => outcome.name);
  ok(names.indexOf('Rejected') !== -1, 'Rejected is missing');
  ok(names.indexOf('Unpublished') !== -1, 'Unpublished is missing');
  return names.join(', ');
});

check('the review notes cover ownership, time and scope', () => {
  ok(Array.isArray(data.processNotes) && data.processNotes.length >= 3, 'expected at least 3 process notes');
  const text = data.processNotes.join(' ').toLowerCase();
  ok(text.indexOf('retain') !== -1 || text.indexOf('rights') !== -1, 'no note about contributors keeping their work');
  ok(text.indexOf('date') !== -1, 'no note about publication dates');
  return data.processNotes.length + ' notes';
});

check('Not Yet lists the five absent things', () => {
  ok(Array.isArray(data.notYet), 'notYet is not an array');
  ok(data.notYet.length === 5, 'expected 5 absent items, found ' + data.notYet.length);
  const text = data.notYet.map((item) => item.title).join(' | ').toLowerCase();
  ['account', 'upload', 'submission', 'collaborat', 'date'].forEach((needle) => {
    ok(text.indexOf(needle) !== -1, 'Not Yet never names "' + needle + '"');
  });
  data.notYet.forEach((item) => {
    ok(typeof item.text === 'string' && item.text.length > 40, item.title + ': text missing');
  });
  return data.notYet.map((item) => item.title).join(', ');
});

check('the copy never claims submissions are open', () => {
  const all = JSON.stringify(data).toLowerCase();
  ok(all.indexOf('submissions are not open') !== -1 || all.indexOf('submissions not open') !== -1,
    'the page never says submissions are not open');
  ['sign up now', 'submit your work now', 'upload your', 'create your account', 'log in'].forEach((phrase) => {
    ok(all.indexOf(phrase) === -1, 'the copy contains "' + phrase + '"');
  });
  return 'states that submissions are closed';
});

check('no content carries markup or a URL', () => {
  [['content', contentSource], ['renderer', renderer]].forEach(([label, source]) => {
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    ok(!/<\/?[a-z][a-z0-9-]*[\s>]/i.test(stripped), label + ' contains what looks like an HTML tag');
  });
  const all = JSON.stringify(data);
  ok(!/https?:\/\//i.test(all), 'the content contains an absolute URL');
  return 'no tags, no absolute URLs';
});

/* ---- the page ------------------------------------------------------ */

check('the page is a complete document with the shared shell', () => {
  ok(/^<!DOCTYPE html>/i.test(page), 'no doctype');
  ok(page.indexOf('id="main"') !== -1, 'no main landmark id');
  ok(page.indexOf('class="skip"') !== -1, 'no skip link');
  ok(page.indexOf('id="nav-toggle"') !== -1, 'no small-screen toggle');
  ok(page.indexOf('id="site-nav"') !== -1, 'no platform nav');
  ok(/<h1[^>]*>/.test(page), 'no h1');
  return 'shell complete';
});

check('the platform nav lists all eight destinations with the Studio current', () => {
  const nav = page.slice(page.indexOf('id="site-nav"'), page.indexOf('</nav>', page.indexOf('id="site-nav"')));
  const links = nav.match(/<a\s/g) || [];
  ok(links.length === 8, 'expected 8 nav links, found ' + links.length);
  ok(/aria-current="page"[^>]*>The Creator Studio|href="\.\/"[^>]*aria-current="page"/.test(nav),
    'the Creator Studio link is not marked as the current page');
  ['../film/', '../stories/', '../arcade/', '../gallery/', '../social-room/', '../archive/'].forEach((href) => {
    ok(nav.indexOf('href="' + href + '"') !== -1, 'nav is missing ' + href);
  });
  return links.length + ' links';
});

check('the five parts are present as real sections', () => {
  ['desk', 'format', 'standard', 'review', 'not-yet'].forEach((id) => {
    ok(page.indexOf('id="' + id + '"') !== -1, 'no section #' + id);
  });
  return 'desk, format, standard, review, not-yet';
});

check('every jump link points at a section that exists', () => {
  const ids = new Set((page.match(/id="([^"]+)"/g) || []).map((hit) => hit.slice(4, -1)));
  const jumps = (page.match(/href="#[^"]+"/g) || []).map((hit) => hit.slice(7, -1));
  ok(jumps.length >= 5, 'expected at least 5 jump links, found ' + jumps.length);
  jumps.forEach((target) => {
    ok(ids.has(target), 'jump link #' + target + ' has no matching id');
  });
  return jumps.join(', ');
});

check('every internal link resolves to a file on disk', () => {
  const hrefs = (page.match(/href="([^"]+)"/g) || []).map((hit) => hit.slice(6, -1));
  let counted = 0;
  hrefs.forEach((href) => {
    if (href.charAt(0) === '#') return;
    ok(!/^https?:/i.test(href), 'external link found: ' + href);
    const clean = href.split('#')[0];
    if (!clean) return;
    const target = path.join(ROOT, 'creator-studio', clean);
    const resolved = clean.endsWith('/') ? path.join(target, 'index.html') : target;
    ok(exists(path.relative(ROOT, resolved)), 'link ' + href + ' does not resolve');
    counted += 1;
  });
  ok(counted >= 14, 'expected at least 14 internal links, found ' + counted);
  return counted + ' links resolved';
});

check('the page offers a way back to the Lobby and to every open room', () => {
  ['href="../"', 'href="../film/"', 'href="../stories/"', 'href="../arcade/"', 'href="../gallery/"', 'href="../social-room/"', 'href="../archive/"'].forEach((needle) => {
    ok(page.indexOf(needle) !== -1, 'page never links ' + needle);
  });
  return '7 destinations';
});

check('there is no form, input or upload control', () => {
  ok(!/<form[\s>]/i.test(page), 'the page contains a form');
  ok(!/<input[\s>]/i.test(page), 'the page contains an input');
  ok(!/<textarea[\s>]/i.test(page), 'the page contains a textarea');
  ok(!/<select[\s>]/i.test(page), 'the page contains a select');
  ok(!/type="file"/i.test(page), 'the page contains a file control');
  const buttons = page.match(/<button\s/g) || [];
  ok(buttons.length === 1, 'expected exactly one button (the nav toggle), found ' + buttons.length);
  return 'no form controls; 1 button (nav toggle)';
});

check('no page still advertises the Studio as a placeholder', () => {
  const pages = [
    'index.html',
    'stories/index.html',
    'stories/the-ninth-bell/index.html',
    'arcade/index.html',
    'arcade/signal-path/index.html',
    'gallery/index.html',
    'social-room/index.html',
    'archive/index.html',
    'creator-studio/index.html'
  ];
  pages.forEach((file) => {
    const source = read(file);
    ok(source.indexOf('href="#creator-studio"') === -1, file + ': still links to the old in-page placeholder');
    ok(source.indexOf('#creator-studio"') === -1, file + ': still links to the old placeholder');
    ok(!/>Soon</.test(source), file + ': still carries the "Soon" badge');
  });
  return pages.length + ' pages clean';
});

check('every room links to the Studio at a path that resolves', () => {
  const rooms = [
    ['index.html', 'creator-studio/'],
    ['stories/index.html', '../creator-studio/'],
    ['stories/the-ninth-bell/index.html', '../../creator-studio/'],
    ['arcade/index.html', '../creator-studio/'],
    ['arcade/signal-path/index.html', '../../creator-studio/'],
    ['gallery/index.html', '../creator-studio/'],
    ['social-room/index.html', '../creator-studio/'],
    ['archive/index.html', '../creator-studio/']
  ];
  rooms.forEach(([file, href]) => {
    const source = read(file);
    ok(source.indexOf('href="' + href + '"') !== -1, file + ': no link to ' + href);
    const resolved = path.resolve(ROOT, path.dirname(file), href, 'index.html');
    ok(fs.existsSync(resolved), file + ': ' + href + ' does not resolve to a page');
  });
  return rooms.length + ' rooms wired';
});

check('the Lobby card for the Studio is open and leads somewhere', () => {
  const lobby = read('index.html');
  const start = lobby.indexOf('id="creator-studio"');
  ok(start !== -1, 'the Lobby has no Creator Studio card');
  const card = lobby.slice(lobby.lastIndexOf('<article', start), lobby.indexOf('</article>', start));
  ok(/class="card is-open"/.test(card), 'the card is not marked open');
  ok(card.indexOf('href="creator-studio/"') !== -1, 'the card does not link to the Studio');
  ok(card.indexOf('Under construction') === -1, 'the card still says "Under construction"');
  return 'open card with a working link';
});

check('the Social Room lists the Studio as open with a working link', () => {
  const socialSandbox = { window: {} };
  vm.createContext(socialSandbox);
  vm.runInContext(read('assets/js/social-room-content.js'), socialSandbox, {
    filename: 'social-room-content.js'
  });
  const social = socialSandbox.window.SOCIAL_ROOM;
  ok(social && Array.isArray(social.areas), 'window.SOCIAL_ROOM.areas is missing');
  const room = social.areas.filter((area) => area.id === 'whats-happening')[0];
  ok(room, 'What\'s Happening area is missing');
  const entry = room.entries.filter((item) => item.id === 'happening-creator-studio')[0];
  ok(entry, 'the Creator Studio listing is missing');
  ok(entry.status === 'Open now', 'the listing says "' + entry.status + '"');
  ok(entry.link && entry.link.href === '../creator-studio/', 'the listing has no link to ../creator-studio/');
  const resolved = path.resolve(ROOT, 'social-room', entry.link.href, 'index.html');
  ok(fs.existsSync(resolved), 'the listing link does not resolve');
  return entry.status + ' -> ' + entry.link.href;
});

/* ---- isolation ----------------------------------------------------- */

check('the Studio code touches no storage, cookie or network API', () => {
  const forbidden = [
    'localStorage', 'sessionStorage', 'document.cookie', 'indexedDB',
    'fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'navigator.'
  ];
  [['renderer', renderer], ['content', contentSource]].forEach(([label, source]) => {
    forbidden.forEach((needle) => {
      ok(source.indexOf(needle) === -1, label + ' contains ' + needle);
    });
  });
  return 'no storage, cookie or network call';
});

check('the Studio code contains none of the three existing save keys', () => {
  SAVE_KEYS.forEach((key) => {
    ok(contentSource.indexOf(key) === -1, 'content contains the key ' + key);
    ok(renderer.indexOf(key) === -1, 'renderer contains the key ' + key);
    ok(page.indexOf(key) === -1, 'page contains the key ' + key);
  });
  return SAVE_KEYS.length + ' keys absent';
});

check('the renderer builds nodes without innerHTML', () => {
  const code = renderer
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write'].forEach((needle) => {
    ok(code.indexOf(needle) === -1, 'renderer contains ' + needle);
  });
  ok(code.indexOf('textContent') !== -1, 'renderer never uses textContent');
  ok(code.indexOf('createElement') !== -1, 'renderer never uses createElement');
  return 'createElement + textContent only';
});

/* ---- style --------------------------------------------------------- */

check('the stylesheet respects reduced motion and loads nothing remote', () => {
  ok(/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css), 'no reduced-motion block');
  ok(!/@import/i.test(css), 'the stylesheet imports something');
  ok(!/url\(\s*['"]?https?:/i.test(css), 'the stylesheet loads a remote asset');
  ok(!/@keyframes/i.test(css), 'the stylesheet animates; this room should not');
  return 'reduced-motion block, no remote assets, no keyframes';
});

check('the page loads only its own assets and the shared shell', () => {
  const refs = (page.match(/(?:src|href)="([^"]+\.(?:css|js))"/g) || []).map((hit) => hit.split('"')[1]);
  /* The room's own stylesheet and renderer, the shared palette sheet, and
     the shared room shell added by the visual-direction pass: the
     atmosphere layer and the floating media controller. Nothing else is
     allowed, and nothing may be remote. */
  const allowed = /^(?:\.\.\/)?assets\/(?:css|js)\/(?:creator-studio|lobby|ambience|media-controller)[a-z-]*\.(?:css|js)$/;
  ok(refs.length >= 4, 'the page has lost its own stylesheet or renderer');
  refs.forEach((ref) => {
    ok(!/^https?:/i.test(ref), 'remote asset: ' + ref);
    ok(allowed.test(ref), 'unexpected asset: ' + ref);
    ok(exists(path.relative(ROOT, path.resolve(ROOT, 'creator-studio', ref))), 'missing asset: ' + ref);
  });
  return refs.join(', ');
});

/* ---- preservation -------------------------------------------------- */

check('the original film was not given the platform nav', () => {
  const film = read('film/index.html');
  ok(film.indexOf('id="site-nav"') === -1, 'film/index.html now carries the platform nav');
  ok(film.indexOf('creator-studio') === -1, 'film/index.html now references the Studio');
  return 'film untouched by this phase';
});

/* ---- summary ------------------------------------------------------- */

console.log('');
if (failures.length) {
  console.log('RESULT ' + failures.length + ' failed, ' + passed + ' passed');
  failures.forEach((line) => console.log('  - ' + line));
  process.exit(1);
}
console.log('RESULT all ' + passed + ' checks passed');
