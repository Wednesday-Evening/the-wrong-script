#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - LAMPLIGHT: room and rule verification
   ---------------------------------------------------------------------
   A development check, not part of the website. It loads the shipped
   rules (assets/js/lamplight-core.js) and the shipped room data
   (arcade/data/lamplight-levels.js) into a sandbox, then:

     1. parses every room and checks its shape,
     2. confirms no room starts already solved,
     3. solves every room by brute force over mirror orientations,
        using only the grid - the stored answer is not consulted,
     4. checks the stored `solution` agrees with the brute-forced one,
        so the fixture in the data file cannot rot silently,
     5. checks malformed room data is rejected rather than half-read,
     6. checks save validation and the unlock ladder,
     7. checks no LAMPLIGHT file touches another room's save key.

   Run from the repository root:

     node tools/verify-lamplight.js

   Exit code 0 means every check passed.
   ===================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const results = [];

function check(name, fn) {
  try {
    const detail = fn();
    results.push({ ok: true, name: name });
    console.log('PASS  ' + name + (detail ? '  [' + detail + ']' : ''));
  } catch (error) {
    results.push({ ok: false, name: name, detail: error.message });
    console.log('FAIL  ' + name + '  [' + error.message + ']');
  }
}

function load(rel) {
  const sandbox = { window: {}, console: console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  return sandbox.window;
}

const win = load('assets/js/lamplight-core.js');
const L = win.LAMPLIGHT;
if (!L) {
  console.log('FAIL  assets/js/lamplight-core.js did not define window.LAMPLIGHT');
  process.exit(1);
}
const levelWin = load('arcade/data/lamplight-levels.js');
const LEVELS = levelWin.LAMPLIGHT_LEVELS;

const VALID = /^[.S*\\/#]+$/;

/* --------------------------------------------------------------- rooms */

check('six rooms are shipped', function () {
  if (!Array.isArray(LEVELS)) { throw new Error('LAMPLIGHT_LEVELS is not an array'); }
  if (LEVELS.length !== L.MAX_LEVELS) {
    throw new Error(LEVELS.length + ' rooms, but MAX_LEVELS is ' + L.MAX_LEVELS);
  }
  return LEVELS.length + ' rooms';
});

check('every room has a unique id and a number in order', function () {
  const ids = new Set();
  LEVELS.forEach(function (level, i) {
    if (!level.id) { throw new Error('room ' + (i + 1) + ' has no id'); }
    if (ids.has(level.id)) { throw new Error('duplicate id ' + level.id); }
    ids.add(level.id);
    if (level.number !== i + 1) {
      throw new Error(level.id + ': number ' + level.number + ', expected ' + (i + 1));
    }
  });
  return Array.from(ids).join(', ');
});

check('every grid is rectangular and uses known characters', function () {
  LEVELS.forEach(function (level) {
    const w = level.grid[0].length;
    level.grid.forEach(function (row, y) {
      if (row.length !== w) {
        throw new Error(level.id + ': row ' + y + ' is ' + row.length + ' wide, expected ' + w);
      }
      if (!VALID.test(row)) { throw new Error(level.id + ': row ' + y + ' has an unknown character'); }
    });
  });
  return 'all rows rectangular';
});

check('every room has one lamp, at least one mirror and at least one window', function () {
  LEVELS.forEach(function (level) {
    const joined = level.grid.join('');
    const lamps = (joined.match(/S/g) || []).length;
    const mirrors = (joined.match(/[\\/]/g) || []).length;
    const windows = (joined.match(/\*/g) || []).length;
    if (lamps !== 1) { throw new Error(level.id + ': ' + lamps + ' lamps'); }
    if (mirrors < 1) { throw new Error(level.id + ': no mirrors'); }
    if (windows < 1) { throw new Error(level.id + ': no windows'); }
    if (mirrors !== level.solution.length) {
      throw new Error(level.id + ': ' + mirrors + ' mirrors but ' + level.solution.length + ' answers');
    }
  });
  return 'one lamp each';
});

check('the lamp stands on its declared source cell', function () {
  LEVELS.forEach(function (level) {
    const ch = level.grid[level.source.y].charAt(level.source.x);
    if (ch !== 'S') { throw new Error(level.id + ': source cell holds "' + ch + '"'); }
    if (!/^[nsew]$/.test(level.source.dir)) {
      throw new Error(level.id + ': direction "' + level.source.dir + '"');
    }
  });
  return 'all sources agree';
});

/* ---------------------------------------------------------------- rules */

check('every room parses into the tracer shape', function () {
  LEVELS.forEach(function (level) {
    const room = L.parse(level);
    if (room.w !== level.grid[0].length || room.h !== level.grid.length) {
      throw new Error(level.id + ': parsed ' + room.w + 'x' + room.h);
    }
    if (!room.mirrors.length) { throw new Error(level.id + ': parsed no mirrors'); }
    if (!room.windows.length) { throw new Error(level.id + ': parsed no windows'); }
  });
  return LEVELS.length + ' rooms';
});

check('no room starts already solved', function () {
  LEVELS.forEach(function (level) {
    const room = L.parse(level);
    const start = L.initialOrientations(room);
    if (L.solved(room, start)) {
      throw new Error(level.id + ' is finished before the player touches it');
    }
  });
  return 'all six need work';
});

check('every room is solvable from its grid alone', function () {
  const tried = [];
  LEVELS.forEach(function (level) {
    const room = L.parse(level);
    const answer = L.bruteForce(room);
    if (!answer.found) { throw new Error(level.id + ': no arrangement lights every window'); }
    if (!L.solved(room, answer.orientations)) {
      throw new Error(level.id + ': the solver returned an arrangement that does not solve it');
    }
    tried.push(level.number + ':' + answer.tried);
  });
  return 'orientations tried ' + tried.join(' ');
});

check('the stored solution agrees with the solved arrangement', function () {
  LEVELS.forEach(function (level) {
    const room = L.parse(level);
    if (!L.solved(room, level.solution)) {
      throw new Error(level.id + ': stored solution leaves a window dark');
    }
  });
  return 'all six fixtures valid';
});

check('rotating a mirror changes what the beam reaches', function () {
  /* Room 1 is deliberately a one-mirror room, so one turn is supposed to
     finish it. What must never happen is the room arriving already solved,
     or a turn that changes nothing. */
  const level = LEVELS[0];
  const room = L.parse(level);
  const start = L.initialOrientations(room);
  if (L.solved(room, start)) { throw new Error('room 1 is handed over already solved'); }
  const after = L.rotate(start, 0);
  if (after[0] === start[0]) { throw new Error('rotate() did not change the mirror'); }
  if (!L.solved(room, after)) { throw new Error('room 1 is a one-mirror room, so one turn should finish it'); }
  const back = L.rotate(after, 0);
  if (L.solved(room, back)) { throw new Error('turning the mirror back should darken the window again'); }
  return 'room 1 starts dark, one turn lights it, turning back darkens it';
});

check('a beam that leaves the grid stops instead of looping', function () {
  LEVELS.forEach(function (level) {
    const room = L.parse(level);
    const result = L.trace(room, L.initialOrientations(room));
    const limit = (room.w + 1) * (room.h + 1) * 4;
    if (result.steps > limit) { throw new Error(level.id + ': trace exceeded its guard'); }
  });
  return 'guarded on all six';
});

check('malformed room data is rejected, not half-read', function () {
  const ragged = { id: 'ragged', name: 'Ragged', source: { x: 0, y: 0, dir: 'e' }, grid: ['S..', '..'] };
  let threw = false;
  try { L.parse(ragged); } catch (e) { threw = true; }
  if (!threw) { throw new Error('ragged grid parsed without complaint'); }
  return 'ragged grid rejected';
});

/* ------------------------------------------------------------- progress */

check('a fresh save is level one with nothing finished', function () {
  const p = L.emptyProgress();
  if (p.unlocked !== 1 || p.completed.length !== 0) {
    throw new Error(JSON.stringify(p));
  }
  return 'unlocked 1, completed 0';
});

check('progress survives a serialise/read round trip', function () {
  const p = L.complete(L.complete(L.emptyProgress(), 1), 2);
  const raw = L.serialize(p);
  const back = L.readProgress(raw);
  if (!back) { throw new Error('readProgress rejected its own output: ' + raw); }
  if (back.unlocked !== p.unlocked) { throw new Error('unlocked ' + back.unlocked + ' vs ' + p.unlocked); }
  if (back.completed.join(',') !== p.completed.join(',')) {
    throw new Error('completed ' + back.completed + ' vs ' + p.completed);
  }
  return raw;
});

check('finishing a room unlocks the next one', function () {
  let p = L.emptyProgress();
  p = L.complete(p, 1);
  if (p.unlocked < 2) { throw new Error('still locked at ' + p.unlocked); }
  p = L.complete(p, 2);
  if (p.unlocked < 3) { throw new Error('still locked at ' + p.unlocked); }
  if (p.completed.indexOf(1) === -1 || p.completed.indexOf(2) === -1) {
    throw new Error('completed list ' + p.completed);
  }
  return 'unlocked ' + p.unlocked;
});

check('the unlock ladder stops at the last room', function () {
  let p = L.emptyProgress();
  for (let n = 1; n <= L.MAX_LEVELS; n += 1) { p = L.complete(p, n); }
  if (p.unlocked > L.MAX_LEVELS) {
    throw new Error('unlocked ' + p.unlocked + ' beyond ' + L.MAX_LEVELS);
  }
  return 'capped at ' + p.unlocked;
});

check('nonsense saves are refused without throwing', function () {
  const nasty = [
    '', '   ', 'null', 'undefined', '[]', '[1,2]', '{}', 'true', '42', '"a string"',
    '{', 'not json at all', '{"v":2,"unlocked":3,"completed":[1,2]}',
    '{"v":1}', '{"v":1,"unlocked":"three"}', '{"v":1,"unlocked":3,"completed":"none"}'
  ];
  const accepted = [];
  nasty.forEach(function (raw) {
    let out;
    try { out = L.readProgress(raw); } catch (e) {
      throw new Error('readProgress threw on ' + JSON.stringify(raw) + ': ' + e.message);
    }
    if (out) { accepted.push(JSON.stringify(raw) + ' -> ' + JSON.stringify(out)); }
  });
  if (accepted.length) { throw new Error('accepted ' + accepted.join('; ')); }
  return nasty.length + ' values refused';
});

/* ------------------------------------------------------- key isolation */

check('LAMPLIGHT touches only its own save key', function () {
  const files = [
    'assets/js/lamplight-core.js',
    'assets/js/lamplight.js',
    'arcade/data/lamplight-levels.js',
    'arcade/lamplight/index.html'
  ];
  const problems = [];
  let ownKey = false;
  files.forEach(function (rel) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (/\btws\b/.test(text)) { problems.push(rel + ': mentions tws'); }
    if (/wrong-script\.story\./.test(text)) { problems.push(rel + ': mentions a story key'); }
    if (/signal-path\.v1/.test(text)) { problems.push(rel + ': mentions the Signal Path key'); }
    if (text.indexOf('wrong-script.arcade.lamplight.v1') !== -1) { ownKey = true; }
  });
  if (problems.length) { throw new Error(problems.join('; ')); }
  if (!ownKey) { throw new Error('the Lamplight key is not declared anywhere'); }
  return 'no cross-room keys';
});

check('only the controller stores anything', function () {
  const core = fs.readFileSync(path.join(ROOT, 'assets/js/lamplight-core.js'), 'utf8');
  if (/localStorage|sessionStorage|document\.cookie/.test(core)) {
    throw new Error('the rules file reaches for storage');
  }
  return 'core is pure';
});

/* --------------------------------------------------------------- summary */

const failed = results.filter(function (r) { return !r.ok; });
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' Lamplight checks passed');
if (failed.length) {
  console.log('RESULT Lamplight verification FAILED');
  process.exit(1);
}
console.log('RESULT Lamplight verification passed');
