#!/usr/bin/env node
/* =====================================================================
   THE WRONG SCRIPT - SIGNAL PATH: level and rule verification
   ---------------------------------------------------------------------
   A development check, not part of the website. It loads the shipped
   rules (assets/js/signal-path-core.js) and the shipped level data
   (arcade/data/signal-path-levels.js) into a sandbox, then:

     1. parses every level and checks its shape,
     2. solves every level with a breadth-first search over
        (position, fragments collected) and fails if no route exists,
     3. replays that route through the real move() function, asserting
        the move counter, fragment collection and completion,
     4. checks that the beacon refuses an incomplete unit,
     5. checks blocked moves do not count, and that undo and restart
        restore position, fragments and move count,
     6. checks save validation, including malformed values,
     7. checks that no Arcade file mentions the film's "tws" key or the
        story save key.

   Run from the repository root:

     node tools/verify-signal-path.js

   Exit code 0 means every check passed.
   ===================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CORE = path.join(ROOT, 'assets/js/signal-path-core.js');
const LEVELS = path.join(ROOT, 'arcade/data/signal-path-levels.js');

const results = [];

function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, ok: true, detail: detail || '' });
  } catch (err) {
    results.push({ name, ok: false, detail: err && err.message ? err.message : String(err) });
  }
}

function assert(condition, message) {
  if (!condition) { throw new Error(message); }
}

/* ---------- load the shipped files exactly as a browser would ---------- */

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(CORE, 'utf8'), sandbox, { filename: CORE });
vm.runInContext(fs.readFileSync(LEVELS, 'utf8'), sandbox, { filename: LEVELS });

const Core = sandbox.window.SignalPathCore;
const rawLevels = sandbox.window.SIGNAL_PATH_LEVELS;

assert(Core, 'assets/js/signal-path-core.js did not expose SignalPathCore');
assert(Array.isArray(rawLevels), 'arcade/data/signal-path-levels.js did not expose an array');

/* ---------- breadth-first search over (position, mask) ---------- */

function solve(level, options) {
  const opts = options || {};
  const fragIndex = new Map();
  level.fragments.forEach((f, i) => fragIndex.set(f.x + ',' + f.y, i));
  const full = (1 << level.fragments.length) - 1;

  const startKey = level.start.x + ',' + level.start.y;
  const startMask = fragIndex.has(startKey) ? (1 << fragIndex.get(startKey)) : 0;

  const seen = new Set([startKey + '|' + startMask]);
  const queue = [{ x: level.start.x, y: level.start.y, mask: startMask, path: [] }];
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  while (queue.length) {
    const cur = queue.shift();
    const atGoal = cur.x === level.beacon.x && cur.y === level.beacon.y &&
      (opts.ignoreFragments ? true : cur.mask === full);
    if (atGoal) { return cur.path; }

    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (Core.isWall(level, nx, ny)) { continue; }
      if (opts.avoidFragments && fragIndex.has(nx + ',' + ny)) { continue; }

      let mask = cur.mask;
      const fi = fragIndex.get(nx + ',' + ny);
      if (fi !== undefined) { mask |= (1 << fi); }

      const stateKey = nx + ',' + ny + '|' + mask;
      if (seen.has(stateKey)) { continue; }
      seen.add(stateKey);
      queue.push({ x: nx, y: ny, mask, path: cur.path.concat([[dx, dy]]) });
    }
  }

  return null;
}

/* ---------- 1. level data ---------- */

const parsed = Core.parseLevels(rawLevels);

check('level data parses with no errors', () => {
  assert(parsed.errors.length === 0, 'parse errors: ' + parsed.errors.join(' | '));
  return parsed.levels.length + ' levels';
});

check('at least six levels are defined', () => {
  assert(parsed.levels.length >= 6, 'only ' + parsed.levels.length + ' levels');
  return parsed.levels.map((l) => l.name).join(', ');
});

check('every level has a start, a beacon and at least one fragment', () => {
  parsed.levels.forEach((level) => {
    assert(level.start, level.id + ': no start');
    assert(level.beacon, level.id + ': no beacon');
    assert(level.required >= 1, level.id + ': no fragments');
    assert(!Core.isWall(level, level.start.x, level.start.y), level.id + ': start inside a wall');
    assert(!Core.isWall(level, level.beacon.x, level.beacon.y), level.id + ': beacon inside a wall');
    assert(!Core.hasFragment(level, level.start.x, level.start.y), level.id + ': fragment on the start');
    assert(!Core.hasFragment(level, level.beacon.x, level.beacon.y), level.id + ': fragment on the beacon');
  });
  return 'all levels well formed';
});

check('level ids are unique', () => {
  const seen = new Set();
  parsed.levels.forEach((level) => {
    assert(!seen.has(level.id), 'duplicate id ' + level.id);
    seen.add(level.id);
  });
  return seen.size + ' unique ids';
});

check('every level is enclosed by walls (no walkable edge)', () => {
  parsed.levels.forEach((level) => {
    for (let x = 0; x < level.cols; x++) {
      assert(Core.isWall(level, x, 0), level.id + ': opening on the top edge');
      assert(Core.isWall(level, x, level.rows - 1), level.id + ': opening on the bottom edge');
    }
    for (let y = 0; y < level.rows; y++) {
      assert(Core.isWall(level, 0, y), level.id + ': opening on the left edge');
      assert(Core.isWall(level, level.cols - 1, y), level.id + ': opening on the right edge');
    }
  });
  return 'all edges sealed';
});

/* ---------- 2. solvability ---------- */

const routes = new Map();

check('every level is solvable: start -> all fragments -> beacon', () => {
  const report = [];
  parsed.levels.forEach((level) => {
    const route = solve(level);
    assert(route, level.id + ': no route collects every fragment and reaches the beacon');
    routes.set(level.id, route);
    report.push(level.name + ' ' + route.length);
  });
  return report.join(' | ');
});

/* ---------- 3. replay the solved routes through the real rules ---------- */

check('replaying each solved route completes the level with the right move count', () => {
  parsed.levels.forEach((level) => {
    const route = routes.get(level.id);
    const run = Core.createRun(level);

    route.forEach(([dx, dy], i) => {
      const step = Core.move(run, level, dx, dy);
      assert(step.ok, level.id + ': move ' + (i + 1) + ' was rejected (' + step.reason + ')');
    });

    assert(run.moves === route.length, level.id + ': moves ' + run.moves + ' expected ' + route.length);
    assert(run.collected.length === level.required, level.id + ': collected ' + run.collected.length + ' of ' + level.required);
    assert(run.x === level.beacon.x && run.y === level.beacon.y, level.id + ': unit is not on the beacon');
    assert(Core.remaining(level, run) === 0, level.id + ': fragments still missing at the end');
  });
  return 'all routes replay cleanly';
});

check('the final move of each route reports completion', () => {
  parsed.levels.forEach((level) => {
    const route = routes.get(level.id);
    const run = Core.createRun(level);
    let last = null;
    route.forEach(([dx, dy]) => { last = Core.move(run, level, dx, dy); });
    assert(last && last.completed === true, level.id + ': final move did not report completion');
  });
  return 'completion reported on the last move of every level';
});

/* ---------- 4. the beacon refuses an incomplete unit ---------- */

check('the beacon does not complete a level with fragments outstanding', () => {
  const tested = [];
  parsed.levels.forEach((level) => {
    const route = solve(level, { avoidFragments: true });
    if (!route) { return; } // no fragment-free route on this level; nothing to prove here

    const run = Core.createRun(level);
    let last = null;
    route.forEach(([dx, dy]) => { last = Core.move(run, level, dx, dy); });

    assert(run.collected.length === 0, level.id + ': the fragment-free route collected a fragment');
    assert(last && last.atBeacon === true, level.id + ': unit did not reach the beacon');
    assert(last.completed === false, level.id + ': beacon completed a level with no fragments');
    assert(last.remaining === level.required, level.id + ': remaining count wrong at the beacon');
    tested.push(level.name);
  });
  assert(tested.length >= 3, 'only ' + tested.length + ' levels could test the sealed beacon');
  return 'sealed beacon confirmed on ' + tested.join(', ');
});

/* ---------- 5. movement, undo, restart ---------- */

check('walls and the grid edge reject a move without counting it', () => {
  const level = parsed.levels[0];
  const run = Core.createRun(level);

  const out = Core.move(run, level, 0, -1);   // start is one row below the top wall
  assert(out.ok === false && out.reason === 'blocked', 'edge move was not rejected');
  assert(run.moves === 0, 'a rejected move incremented the counter');

  const wall = Core.move(run, level, -1, 0);
  assert(wall.ok === false && wall.reason === 'blocked', 'wall move was not rejected');
  assert(run.moves === 0, 'a wall move incremented the counter');
  return 'invalid moves leave the counter at 0';
});

check('a valid move increments the counter once', () => {
  const level = parsed.levels[0];
  const run = Core.createRun(level);
  const step = Core.move(run, level, 0, 1);
  assert(step.ok === true, 'valid move rejected');
  assert(run.moves === 1, 'counter is ' + run.moves + ' after one move');
  return 'counter 1 after one move';
});

check('undo restores position, fragments and move count', () => {
  const level = parsed.levels[0];
  const run = Core.createRun(level);

  Core.move(run, level, 0, 1);           // step off the start
  Core.move(run, level, 0, 1);           // onto the fragment
  assert(run.collected.length === 1, 'fragment was not collected');
  assert(run.moves === 2, 'expected 2 moves, got ' + run.moves);

  const ok = Core.undo(run);
  assert(ok === true, 'undo returned false');
  assert(run.moves === 1, 'undo left moves at ' + run.moves);
  assert(run.collected.length === 0, 'undo left the fragment collected');
  assert(run.x === level.start.x && run.y === level.start.y + 1, 'undo did not restore position');

  Core.undo(run);
  assert(run.moves === 0, 'second undo left moves at ' + run.moves);
  assert(run.x === level.start.x && run.y === level.start.y, 'second undo did not return to the start');
  assert(Core.undo(run) === false, 'undo succeeded with no history');
  return 'undo restores all three, and refuses when there is nothing to undo';
});

check('restart returns the level to its opening state', () => {
  const level = parsed.levels[1];
  const run = Core.createRun(level);
  Core.move(run, level, 0, 1);
  Core.move(run, level, 0, 1);
  Core.restart(run, level);
  assert(run.moves === 0, 'restart left moves at ' + run.moves);
  assert(run.collected.length === 0, 'restart left fragments collected');
  assert(run.history.length === 0, 'restart left history behind');
  assert(run.x === level.start.x && run.y === level.start.y, 'restart did not return to the start');
  return 'restart clears moves, fragments, history and position';
});

/* ---------- 6. saves ---------- */

check('the save key is namespaced and is not the film or story key', () => {
  assert(Core.SAVE_KEY === 'wrong-script.arcade.signal-path.v1', 'unexpected save key: ' + Core.SAVE_KEY);
  assert(Core.SAVE_KEY !== 'tws', 'the Arcade is using the film key');
  assert(Core.SAVE_KEY.indexOf('wrong-script.story.') !== 0, 'the Arcade is using a story key');
  return Core.SAVE_KEY;
});

check('an absent save reads as empty, not broken', () => {
  [null, undefined, ''].forEach((raw) => {
    const read = Core.readSave(raw, parsed.levels.length);
    assert(read.status === 'empty', 'raw ' + JSON.stringify(raw) + ' read as ' + read.status);
    assert(read.progress.unlocked === 1, 'empty save did not start at level 1');
  });
  return 'empty for null, undefined and empty string';
});

check('a legacy save without a version field still loads', () => {
  const read = Core.readSave(JSON.stringify({ unlocked: 3, completed: ['relay-room', 'twin-contacts'] }), parsed.levels.length);
  assert(read.status === 'valid', 'legacy save read as ' + read.status);
  assert(read.progress.unlocked === 3, 'unlocked is ' + read.progress.unlocked);
  assert(read.progress.completed.length === 2, 'completed length is ' + read.progress.completed.length);
  assert(read.repaired === false, 'a valid legacy save was flagged as repaired');
  return 'legacy save accepted unchanged';
});

check('a written save round-trips', () => {
  const progress = Core.emptyProgress();
  progress.unlocked = 4;
  progress.completed = ['relay-room', 'twin-contacts', 'switchback'];
  progress.best = { 'relay-room': 3 };
  const read = Core.readSave(Core.serialize(progress), parsed.levels.length);
  assert(read.status === 'valid', 'round-trip read as ' + read.status);
  assert(read.progress.unlocked === 4, 'unlocked lost in round-trip');
  assert(read.progress.best['relay-room'] === 3, 'best move count lost in round-trip');
  assert(read.progress.completed.length === 3, 'completed list lost in round-trip');
  return 'serialize -> readSave keeps every field';
});

check('malformed saves are reported broken and their raw value is preserved', () => {
  const broken = [
    'not json at all',
    '{"unlocked":',
    '[]',
    '"a string"',
    '42',
    'null',
    '{"v":99,"unlocked":2}',
    '{"v":"one","unlocked":2}'
  ];
  broken.forEach((raw) => {
    const read = Core.readSave(raw, parsed.levels.length);
    assert(read.status === 'broken', JSON.stringify(raw) + ' read as ' + read.status);
    assert(read.raw === raw, 'the raw value was not handed back for ' + raw);
  });
  return broken.length + ' malformed values rejected, each with its raw value intact';
});

check('an unexpected but readable save is repaired instead of discarded', () => {
  const read = Core.readSave(JSON.stringify({ v: 1, unlocked: 99, completed: ['relay-room', 7, 'relay-room'], best: { 'relay-room': 'x' } }), parsed.levels.length);
  assert(read.status === 'valid', 'readable save read as ' + read.status);
  assert(read.progress.unlocked === parsed.levels.length, 'unlocked was not clamped, got ' + read.progress.unlocked);
  assert(read.progress.completed.length === 1, 'completed list was not cleaned: ' + JSON.stringify(read.progress.completed));
  assert(!('relay-room' in read.progress.best), 'a non-numeric best time was kept');
  assert(read.repaired === true, 'repairs were not reported');
  return 'clamped to ' + read.progress.unlocked + ', duplicates and junk dropped';
});

/* ---------- 7. isolation from the other saves ---------- */

check('no Arcade file references the film or story save keys', () => {
  const files = [
    'assets/js/signal-path-core.js',
    'assets/js/signal-path.js',
    'assets/js/arcade-library.js',
    'assets/js/arcade-games.js',
    'arcade/signal-path/index.html',
    'arcade/index.html'
  ].filter((rel) => fs.existsSync(path.join(ROOT, rel)));

  assert(files.length >= 4, 'expected the Arcade files to exist, found ' + files.length);

  files.forEach((rel) => {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert(!/["']tws["']/.test(text), rel + ' mentions the film save key "tws"');
    assert(!/wrong-script\.story\./.test(text), rel + ' mentions a story save key');
  });
  return files.length + ' files clean';
});

/* ---------- report ---------- */

let failed = 0;
results.forEach((r) => {
  if (!r.ok) { failed += 1; }
  console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.name + (r.detail ? '  [' + r.detail + ']' : ''));
});

console.log('');
console.log(failed === 0
  ? 'SIGNAL PATH: ' + results.length + ' checks passed.'
  : 'SIGNAL PATH: ' + failed + ' of ' + results.length + ' checks FAILED.');

process.exit(failed === 0 ? 0 : 1);
