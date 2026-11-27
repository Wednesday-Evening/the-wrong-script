#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - static checks for the room atmosphere layer and the
   floating media controller
   ---------------------------------------------------------------------
   These are source checks, not browser tests. They prove that the wiring
   exists and that the rules the project cares about are encoded:

     - every room page carries the layer and the controller, and the film
       carries neither;
     - every data-room value is one the layer knows;
     - the wash is muted, looped, inline, poster-backed and cover-fitted;
     - it stops on hidden/pagehide and respects reduced motion;
     - the controller is a real disclosure with real switches;
     - neither new script touches storage, cookies or a save key.

   Run:  node tools/verify-ambience.js
   ===================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log('PASS  ' + name + (detail ? '  [' + detail + ']' : ''));
  } else {
    failed += 1;
    console.log('FAIL  ' + name + (detail ? '  [' + detail + ']' : ''));
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

/* Strip comments so a rule cannot be satisfied by prose describing it. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

const ambienceJs = read('assets/js/ambience.js');
const controllerJs = read('assets/js/media-controller.js');
const ambienceCss = read('assets/css/ambience.css');
const ambienceCode = code(ambienceJs);
const controllerCode = code(controllerJs);
const cssCode = code(ambienceCss);

/* ---------------- 1. the route inventory ---------------- */

const ROOMS = {
  'index.html': ['lobby', ''],
  'stories/index.html': ['stories', '../'],
  'stories/the-ninth-bell/index.html': ['ninth-bell', '../../'],
  'stories/the-returns-hatch/index.html': ['returns-hatch', '../../'],
  'arcade/index.html': ['arcade', '../'],
  'arcade/signal-path/index.html': ['signal-path', '../../'],
  'arcade/lamplight/index.html': ['lamplight', '../../'],
  'gallery/index.html': ['gallery', '../'],
  'social-room/index.html': ['social-room', '../'],
  'archive/index.html': ['archive', '../'],
  'creator-studio/index.html': ['creator-studio', '../']
};

Object.entries(ROOMS).forEach(function (entry) {
  const file = entry[0];
  const room = entry[1][0];
  const prefix = entry[1][1];

  if (!exists(file)) {
    check(file + ' exists', false);
    return;
  }

  const html = read(file);
  check(file + ' declares data-room="' + room + '"',
    new RegExp('<body[^>]*data-room="' + room + '"').test(html));
  check(file + ' loads ambience.css from the right depth',
    html.includes('href="' + prefix + 'assets/css/ambience.css"'));
  check(file + ' loads ambience.js before media-controller.js',
    html.indexOf(prefix + 'assets/js/ambience.js') !== -1 &&
    html.indexOf(prefix + 'assets/js/ambience.js') < html.indexOf(prefix + 'assets/js/media-controller.js'));
});

/* the film keeps exactly the page it had */
const film = read('film/index.html');
check('film/index.html has no data-room', !/data-room=/.test(film));
check('film/index.html loads no ambience layer', !film.includes('ambience'));
check('film/index.html loads no media controller', !film.includes('media-controller'));

/* ---------------- 2. every room is known to the layer ---------------- */

Object.values(ROOMS).forEach(function (entry) {
  check('ambience.js knows room "' + entry[0] + '"',
    new RegExp("'" + entry[0] + "':\\s*\\{").test(ambienceCode));
});

/* ---------------- 3. the wash ---------------- */

check('the layer is a single fixed, non-interactive layer',
  /\.ambience\{[^}]*position:fixed/.test(cssCode) &&
  /\.ambience\{[^}]*pointer-events:none/.test(cssCode));
check('the video is cover-fitted', /\.ambience__video\{[^}]*object-fit:cover/.test(cssCode));
check('a poster frame is painted under the video',
  /\.ambience__frame\{[^}]*background-size:cover/.test(cssCode));
check('a gradient scrim sits over the video',
  /\.ambience__scrim\{[^}]*linear-gradient/.test(cssCode));
check('a per-room tint sits over the video', /\.ambience__tint\{/.test(cssCode));
check('the room canvas steps aside for the wash',
  /body\[data-room\]\{[^}]*background-color:transparent/.test(cssCode));
check('the video is muted and inline in source',
  /video\.muted = true/.test(ambienceCode) &&
  /video\.playsInline = true/.test(ambienceCode));
check('the video loops', /video\.loop = true/.test(ambienceCode));
check('the wash never sets its own volume', !/\.volume\s*=/.test(ambienceCode));
check('no autoplay attribute anywhere in the new files',
  !/autoplay\s*=/i.test(ambienceJs) && !/autoplay\s*=/i.test(controllerJs));

/* ---------------- 4. performance and lifecycle ---------------- */

check('one layer is inserted per page', (ambienceCode.match(/insertBefore/g) || []).length === 1);
check('one video element is created per page',
  (ambienceCode.match(/createElement\('video'\)/g) || []).length === 1);
check('it pauses when the tab is hidden', /visibilitychange/.test(ambienceCode));
check('it pauses when the page is left', /pagehide/.test(ambienceCode));
check('it reports a blocked autoplay instead of failing silently',
  /status = 'blocked'/.test(ambienceCode));
check('reduced motion is read from the media query',
  /prefers-reduced-motion: reduce/.test(ambienceCode));
check('reduced motion disables transitions in CSS',
  /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*transition:none/.test(cssCode));
check('a room video pauses the wash so two never run at once',
  /pauseForOther/.test(ambienceCode) &&
  /addEventListener\('play'/.test(ambienceCode) &&
  /\}, true\)/.test(ambienceCode));

/* ---------------- 5. the controller ---------------- */

check('the pill is a disclosure with aria-expanded and aria-controls',
  /aria-expanded/.test(controllerCode) && /aria-controls/.test(controllerCode));
check('the expanded panel is a labelled group',
  /setAttribute\('role', 'group'\)/.test(controllerCode) &&
  /aria-label', 'Sound and video'/.test(controllerCode));
check('controls are real switches', /setAttribute\('role', 'switch'\)/.test(controllerCode));
check('audio levels are real range inputs',
  /\.type = 'range'/.test(controllerCode));
check('master audio, music, effects, ambience and video are all present',
  /All sound/.test(controllerCode) &&
  /id: 'music'/.test(controllerCode) &&
  /id: 'effects'/.test(controllerCode) &&
  /id: 'ambience'/.test(controllerCode) &&
  /Background video/.test(controllerCode));
check('a channel the room lacks is marked absent, not fake',
  /is-absent/.test(controllerCode) && /Not here/.test(controllerCode) &&
  /disabled = !/.test(controllerCode));
check('master audio is a mute, not a play control',
  /setMaster\(/.test(controllerCode) && !/audio\.play\(/.test(controllerCode));
check('Escape closes the panel and returns focus',
  /event\.key !== 'Escape'/.test(controllerCode) &&
  /collapse\(true\)/.test(controllerCode) && /compact\.focus\(\)/.test(controllerCode));
check('the pill has a visible focus ring',
  /\.mixer__compact:focus-visible[\s\S]*?outline:2px solid/.test(cssCode));
check('touch targets reach 44px',
  /min-height:44px/.test(cssCode));

/* ---------------- 6. isolation ---------------- */

const storagePattern = /localStorage|sessionStorage|indexedDB|document\.cookie/;
check('ambience.js touches no storage or cookies', !storagePattern.test(ambienceCode));
check('media-controller.js touches no storage or cookies', !storagePattern.test(controllerCode));
['tws', 'wrong-script.story.the-ninth-bell.v1', 'wrong-script.arcade.signal-path.v1']
  .forEach(function (key) {
    check('no save key "' + key + '" in the new scripts',
      !ambienceCode.includes("'" + key + "'") && !controllerCode.includes("'" + key + "'"));
  });
check('no innerHTML in the new scripts',
  !/innerHTML/.test(ambienceCode) && !/innerHTML/.test(controllerCode));
check('no external URLs in the new files',
  !/https?:\/\//.test(ambienceCode) && !/https?:\/\//.test(controllerCode) && !/https?:\/\//.test(cssCode));

/* ---------------- 7. the assets it points at ---------------- */

['abstract-motion', 'lighthouse', 'library'].forEach(function (name) {
  check('video exists: ' + name + '.mp4', exists('assets/media/video/' + name + '.mp4'));
  check('poster exists: ' + name + '.jpg', exists('assets/media/video/' + name + '.jpg'));
});

/* ---------------- summary ---------------- */

console.log('');
if (failed === 0) {
  console.log('RESULT all ' + passed + ' static checks passed');
  process.exit(0);
}
console.log('RESULT ' + passed + ' passed, ' + failed + ' failed');
process.exit(1);
