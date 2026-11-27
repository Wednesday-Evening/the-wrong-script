#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - Phase 10 media integration checks
   ---------------------------------------------------------------------
   Static checks for the six owner-supplied media files and the way the
   five rooms reference them. No browser, no network, no build.

   What this proves, and what it does not:

     It proves the files are where the pages expect them, that they are
     the formats they claim to be, that the copies are bit-identical to
     the owner's original uploads, that every reference resolves on disk,
     and that the markup carries the inert-by-default attributes.

     It does NOT prove playback, layout or audio behaviour in a browser.
     Those are covered by the browser run recorded in the Phase 10
     handover, not by this file.

     node tools/verify-media.js
   ===================================================================== */

'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var root = path.resolve(__dirname, '..');
var passed = 0;
var failed = 0;

function check(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log('  PASS  ' + name + (detail ? '  [' + detail + ']' : ''));
  } else {
    failed += 1;
    console.log('  FAIL  ' + name + (detail ? '  [' + detail + ']' : ''));
  }
}

function abs(rel) { return path.join(root, rel); }
function exists(rel) {
  try { return fs.statSync(abs(rel)).isFile(); } catch (e) { return false; }
}
function bytes(rel) { return fs.readFileSync(abs(rel)); }
function text(rel) { return fs.readFileSync(abs(rel), 'utf8'); }
function sha(rel) {
  return crypto.createHash('sha256').update(bytes(rel)).digest('hex');
}

var VIDEO = {
  'assets/media/video/lighthouse.mp4': 'video-01-lighthouse-720p.mp4',
  'assets/media/video/abstract-motion.mp4': 'video-02-abstract-motion-720p.mp4',
  'assets/media/video/library.mp4': 'video-03-library-720p.mp4'
};

var AUDIO = {
  'assets/media/audio/cinematic-piano.mp3':
    'sigmamusicart-cinematic-documentary-piano-162733',
  'assets/media/audio/ocean-waves.mp3':
    'audiovisuaiseu-ocean-waves-sound-02-321572',
  'assets/media/audio/interface-click.mp3':
    'universfield-soft-interface-click-126517'
};

var POSTERS = [
  'assets/media/video/lighthouse.jpg',
  'assets/media/video/abstract-motion.jpg',
  'assets/media/video/library.jpg'
];

/* Every page that carries a media reference added in Phase 10. */
var PAGES = [
  'index.html',
  'stories/the-ninth-bell/index.html',
  'stories/the-returns-hatch/index.html',
  'gallery/index.html',
  'arcade/index.html',
  'arcade/signal-path/index.html',
  'arcade/lamplight/index.html'
];

var VIDEO_PAGES = [
  'index.html',
  'stories/the-ninth-bell/index.html',
  'stories/the-returns-hatch/index.html'
];

var SCRIPTS = ['assets/js/media-player.js', 'assets/js/arcade-sound.js'];

function isMp4(buf) { return buf.slice(4, 8).toString('latin1') === 'ftyp'; }
function isMp3(buf) {
  return (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
         (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
}
function isJpeg(buf) {
  return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

console.log('\n1. ORGANISED MEDIA FILES');

Object.keys(VIDEO).forEach(function (rel) {
  var ok = exists(rel) && isMp4(bytes(rel)) && bytes(rel).length > 100000;
  check(rel + ' is a non-empty MP4', ok,
    ok ? bytes(rel).length + ' bytes' : 'missing or not an MP4');
});

Object.keys(AUDIO).forEach(function (rel) {
  var ok = exists(rel) && isMp3(bytes(rel)) && bytes(rel).length > 10000;
  check(rel + ' is a non-empty MP3', ok,
    ok ? bytes(rel).length + ' bytes' : 'missing or not an MP3');
});

POSTERS.forEach(function (rel) {
  var ok = exists(rel) && isJpeg(bytes(rel)) && bytes(rel).length > 5000;
  check(rel + ' is a real JPEG poster', ok,
    ok ? bytes(rel).length + ' bytes' : 'missing or not a JPEG');
});

console.log('\n2. ORIGINAL UPLOADS PRESERVED');

var copies = Object.assign({}, VIDEO, AUDIO);
Object.keys(copies).forEach(function (copy) {
  var original = copies[copy];
  var ok = exists(original) && exists(copy) && sha(original) === sha(copy);
  check(original + ' preserved byte-identical to ' + copy, ok,
    ok ? 'sha256 matches' : 'original missing or content differs');
});

console.log('\n3. REFERENCES RESOLVE ON DISK');

PAGES.forEach(function (page) {
  var html = text(page);
  var dir = path.dirname(page);
  var refs = [];
  var re = /(?:src|poster)\s*=\s*"([^"]+)"/g;
  var m;
  while ((m = re.exec(html))) {
    if (m[1].indexOf('assets/media') !== -1) { refs.push(m[1]); }
  }
  var click = html.match(/data-click-src="([^"]+)"/);
  if (click) { refs.push(click[1]); }

  if (page === 'gallery/index.html') {
    /* The Gallery's supplied recording is no longer played: its licence is
       unresolved, so the exhibit carries writing and a score sketch instead. */
    check(page + ' carries no recorded-audio block',
      !/data-media-audio-block/.test(html));
    check(page + ' loads the generated room audio instead',
      /assets\/js\/audio-engine\.js/.test(html));
  } else if (/<video\b/i.test(html)) {
    check(page + ' references at least one media file', refs.length > 0,
      refs.length + ' reference(s)');
    check(page + ' names no recorded audio file', !/\.mp3/.test(html));
  } else {
    check(page + ' embeds no recorded media file',
      refs.length === 0 && !/\.mp3/.test(html), refs.length + ' reference(s)');
  }

  refs.forEach(function (ref) {
    var resolved = path.normalize(path.join(dir, ref));
    check(page + ' -> ' + ref + ' exists', exists(resolved), resolved);
  });
});

console.log('\n3b. GALLERY EXHIBIT AUDIO REFERENCE');

var galleryData = text('assets/js/gallery-exhibits.js');
check('gallery-exhibits.js names no recorded audio file',
  !/\.mp3/.test(galleryData));
check('the music exhibit is described, not played',
  /No recording of Cue 07 exists/.test(galleryData) &&
  /not played while its licence is unresolved/.test(galleryData));

console.log('\n4. INERT BY DEFAULT');

PAGES.forEach(function (page) {
  var html = text(page);
  check(page + ' has no autoplay attribute', !/autoplay\s*=/i.test(html));
});

VIDEO_PAGES.forEach(function (page) {
  var tags = text(page).match(/<video\b[^>]*>/gi) || [];
  check(page + ' carries exactly one video element', tags.length === 1,
    tags.length + ' found');

  if (tags.length === 1) {
    var tag = tags[0];
    check(page + ' video has a poster', /\bposter="/.test(tag));
    check(page + ' video is muted', /\bmuted\b/.test(tag));
    check(page + ' video is playsinline', /\bplaysinline\b/.test(tag));
    check(page + ' video does not preload', /preload="none"/.test(tag));
  }
});

['stories/the-ninth-bell/index.html', 'gallery/index.html'].forEach(function (page) {
  var html = text(page);
  var tags = html.match(/<audio\b[^>]*>/gi) || [];
  check(page + ' carries no recorded audio element', tags.length === 0,
    tags.length + ' found');
  check(page + ' loads the generated room audio instead',
    /assets\/js\/audio-engine\.js/.test(html));
});

console.log('\n5. SCRIPT HYGIENE');

SCRIPTS.forEach(function (rel) {
  var src = text(rel);
  check(rel + ' touches no storage', !/localStorage|sessionStorage|indexedDB|document\.cookie/.test(src));
  check(rel + ' names no save key', !/['"]tws['"]|wrong-script\./.test(src));
});

/* The Arcade click is the one script allowed to build a player, because it
   needs a single tiny sound that is not in the page markup. Its limits are
   asserted directly rather than banning the constructor. */
var sound = text('assets/js/arcade-sound.js');
check('arcade-sound.js starts disabled', /var enabled = false;/.test(sound));
check('arcade-sound.js refuses to fire while disabled', /if \(!enabled\) \{ return; \}/.test(sound));
check('arcade-sound.js plays a generated cue, not a recording',
  /audio\.cue\('clique'\)/.test(sound) && !/new Audio/.test(sound) &&
  !/\.mp3['"]/.test(sound));
check('arcade-sound.js reads the Effects channel',
  /audio\.getLevel\('effects'\)/.test(sound));
check('arcade-sound.js moves the Effects channel, not a private volume',
  /audio\.setLevel\('effects'/.test(sound) && !/\.volume\s*=/.test(sound));
check('arcade-sound.js stops when the page is left', /pagehide/.test(sound));

var mediaScript = text('assets/js/media-player.js');
check('media-player.js builds no hidden player', !/new\s+Audio\s*\(/.test(mediaScript));
check('media-player.js keeps one stream at a time', /function pauseAudios/.test(mediaScript));
check('media-player.js stops playback when the page is left',
  /pagehide/.test(mediaScript) && /pauseAudios\(null\)/.test(mediaScript));

console.log('\n6. ARCADE SOUND WIRING');

['arcade/index.html', 'arcade/signal-path/index.html', 'arcade/lamplight/index.html']
  .forEach(function (page) {
    var html = text(page);
    check(page + ' loads the interface-sound module',
      /arcade-sound\.js/.test(html));
    check(page + ' names no recorded click file',
      !/interface-click\.mp3/.test(html));
    check(page + ' loads the generated audio engine',
      /assets\/js\/audio-engine\.js/.test(html));
    check(page + ' offers a sound slot for the toggle',
      /data-sound-slot/.test(html));
  });

console.log('\n7. FILM IS UNTOUCHED BY MEDIA');

check('no media reference inside film/',
  !/assets\/media/.test(text('film/index.html')));

console.log('\n8. CREDITS RECORD');

check('ASSET-CREDITS.txt exists', exists('assets/media/ASSET-CREDITS.txt'));

if (exists('assets/media/ASSET-CREDITS.txt')) {
  var credits = text('assets/media/ASSET-CREDITS.txt');
  Object.keys(VIDEO).concat(Object.keys(AUDIO)).forEach(function (rel) {
    check('credits name ' + path.basename(rel),
      credits.indexOf(path.basename(rel)) !== -1);
  });
  check('credits state that licences are unverified', /NOT VERIFIED/.test(credits));
  check('credits record the original upload filenames',
    Object.keys(copies).every(function (k) { return credits.indexOf(copies[k]) !== -1; }));
}

console.log('\nRESULT ' +
  (failed ? failed + ' check(s) failed' : 'all checks passed (' + passed + ')'));
process.exit(failed ? 1 : 0);
