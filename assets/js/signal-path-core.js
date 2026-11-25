/* =====================================================================
   THE WRONG SCRIPT - The Arcade: SIGNAL PATH, the rules
   ---------------------------------------------------------------------
   Pure logic. No DOM, no timers, no network, no storage access.

   It lives in its own file, separate from assets/js/signal-path.js (which
   draws the board and owns localStorage) for one reason: the rules can
   then be exercised directly against the shipped level data, in Node, by
   tools/verify-signal-path.js - no browser and no test framework needed.

   Tiles in a layout row:
     #  wall (cannot be entered)
     .  floor
     S  the unit's start
     B  the beacon
     *  a signal fragment

   Save data is validated here too, so a malformed value is rejected by
   the same code that the page uses, and can be tested the same way.
   ===================================================================== */

(function (root) {
  'use strict';

  var SAVE_KEY = 'wrong-script.arcade.signal-path.v1';
  var VERSION = 1;
  var MAX_HISTORY = 400;

  function keyOf(x, y) { return x + ',' + y; }

  /* ---------- level parsing ---------- */

  function isWall(level, x, y) {
    if (!level || x < 0 || y < 0 || x >= level.cols || y >= level.rows) { return true; }
    return level.cells[y * level.cols + x] === '#';
  }

  function hasFragment(level, x, y) {
    if (!level) { return false; }
    for (var i = 0; i < level.fragments.length; i++) {
      if (level.fragments[i].x === x && level.fragments[i].y === y) { return true; }
    }
    return false;
  }

  function parseLevel(raw, index) {
    var errors = [];

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, errors: ['level ' + (index + 1) + ' is not an object'] };
    }

    if (typeof raw.id !== 'string' || !/^[a-z0-9-]+$/.test(raw.id)) { errors.push('missing or invalid id'); }
    if (typeof raw.name !== 'string' || !raw.name) { errors.push('missing name'); }

    if (!Array.isArray(raw.layout) || raw.layout.length < 3) {
      return { ok: false, errors: errors.concat('layout missing or too small') };
    }

    var width = typeof raw.layout[0] === 'string' ? raw.layout[0].length : 0;
    if (width < 3) { return { ok: false, errors: errors.concat('layout too narrow') }; }

    var cells = [];
    var start = null;
    var beacon = null;
    var fragments = [];

    for (var y = 0; y < raw.layout.length; y++) {
      var row = raw.layout[y];
      if (typeof row !== 'string' || row.length !== width) {
        errors.push('row ' + (y + 1) + ' is not ' + width + ' characters wide');
        break;
      }
      for (var x = 0; x < width; x++) {
        var ch = row.charAt(x);
        if (ch === '#') { cells.push('#'); continue; }
        if (ch === '.') { cells.push('.'); continue; }
        if (ch === 'S') {
          if (start) { errors.push('more than one start'); }
          start = { x: x, y: y };
          cells.push('.');
          continue;
        }
        if (ch === 'B') {
          if (beacon) { errors.push('more than one beacon'); }
          beacon = { x: x, y: y };
          cells.push('.');
          continue;
        }
        if (ch === '*') {
          fragments.push({ x: x, y: y });
          cells.push('.');
          continue;
        }
        errors.push('unknown tile "' + ch + '" at ' + (x + 1) + ',' + (y + 1));
      }
    }

    if (!start) { errors.push('no start'); }
    if (!beacon) { errors.push('no beacon'); }
    if (!fragments.length) { errors.push('no fragments'); }
    if (errors.length) { return { ok: false, errors: errors }; }

    return {
      ok: true,
      level: {
        id: raw.id,
        name: raw.name,
        hint: typeof raw.hint === 'string' ? raw.hint : '',
        index: index,
        cols: width,
        rows: raw.layout.length,
        cells: cells,
        start: start,
        beacon: beacon,
        fragments: fragments,
        required: fragments.length
      }
    };
  }

  function parseLevels(list) {
    var levels = [];
    var errors = [];

    if (!Array.isArray(list)) { return { levels: [], errors: ['level list is not an array'] }; }

    for (var i = 0; i < list.length; i++) {
      var result = parseLevel(list[i], i);
      if (result.ok) {
        result.level.index = levels.length;
        levels.push(result.level);
      } else {
        errors.push('level ' + (i + 1) + ': ' + result.errors.join('; '));
      }
    }

    return { levels: levels, errors: errors };
  }

  /* ---------- a run through one level ---------- */

  function createRun(level) {
    return {
      id: level.id,
      x: level.start.x,
      y: level.start.y,
      collected: [],
      moves: 0,
      history: []
    };
  }

  function held(run) { return run.collected.length; }

  function remaining(level, run) { return level.required - run.collected.length; }

  function atBeacon(level, run) {
    return run.x === level.beacon.x && run.y === level.beacon.y;
  }

  /* One cell per move. Returns what happened so the page can say it
     honestly; nothing is thrown and nothing is guessed. */
  function move(run, level, dx, dy) {
    if (!run || !level) { return { ok: false, reason: 'nostate' }; }
    if (dx === 0 && dy === 0) { return { ok: false, reason: 'noop' }; }

    var nx = run.x + dx;
    var ny = run.y + dy;

    if (isWall(level, nx, ny)) { return { ok: false, reason: 'blocked' }; }

    run.history.push({
      x: run.x,
      y: run.y,
      moves: run.moves,
      collected: run.collected.slice()
    });
    if (run.history.length > MAX_HISTORY) { run.history.shift(); }

    run.x = nx;
    run.y = ny;
    run.moves += 1;

    var collectedNow = false;
    if (hasFragment(level, nx, ny)) {
      var k = keyOf(nx, ny);
      if (run.collected.indexOf(k) < 0) {
        run.collected.push(k);
        collectedNow = true;
      }
    }

    var left = remaining(level, run);
    var onBeacon = atBeacon(level, run);

    if (onBeacon && left === 0) {
      return { ok: true, completed: true, atBeacon: true, collected: collectedNow, remaining: 0, moves: run.moves };
    }
    if (onBeacon) {
      return { ok: true, completed: false, atBeacon: true, collected: collectedNow, remaining: left, moves: run.moves };
    }
    return { ok: true, completed: false, atBeacon: false, collected: collectedNow, remaining: left, moves: run.moves };
  }

  function undo(run) {
    if (!run || !run.history.length) { return false; }
    var prev = run.history.pop();
    run.x = prev.x;
    run.y = prev.y;
    run.moves = prev.moves;
    run.collected = prev.collected;
    return true;
  }

  function restart(run, level) {
    run.x = level.start.x;
    run.y = level.start.y;
    run.collected = [];
    run.moves = 0;
    run.history = [];
    return run;
  }

  /* ---------- progress and saves ---------- */

  function emptyProgress() {
    return { v: VERSION, unlocked: 1, completed: [], best: {} };
  }

  /* Lenient on purpose: a save missing a version field, or carrying an
     unlocked level that no longer exists, is repaired rather than
     discarded. Only a value that cannot be understood at all is called
     broken - and a broken value is never written over. */
  function normalizeProgress(data, levelCount) {
    var total = (typeof levelCount === 'number' && levelCount > 0) ? levelCount : Infinity;
    var out = emptyProgress();
    var repaired = false;

    if (typeof data.unlocked === 'number' && isFinite(data.unlocked)) {
      var u = Math.floor(data.unlocked);
      if (u < 1) { u = 1; repaired = true; }
      if (u > total) { u = total; repaired = true; }
      if (u !== data.unlocked) { repaired = true; }
      out.unlocked = u;
    } else if (data.unlocked !== undefined) {
      repaired = true;
    }

    if (Array.isArray(data.completed)) {
      for (var i = 0; i < data.completed.length; i++) {
        var id = data.completed[i];
        if (typeof id === 'string' && id && out.completed.indexOf(id) < 0) { out.completed.push(id); }
        else if (typeof id !== 'string') { repaired = true; }
      }
    } else if (data.completed !== undefined) {
      repaired = true;
    }

    if (data.best && typeof data.best === 'object' && !Array.isArray(data.best)) {
      var keys = Object.keys(data.best);
      for (var j = 0; j < keys.length; j++) {
        var n = data.best[keys[j]];
        if (typeof n === 'number' && isFinite(n) && n > 0) { out.best[keys[j]] = Math.floor(n); }
        else { repaired = true; }
      }
    } else if (data.best !== undefined) {
      repaired = true;
    }

    return { progress: out, repaired: repaired };
  }

  /* status: 'empty' | 'valid' | 'broken'. The raw value is handed back on
     a broken read so the page can leave it exactly where it is. */
  function readSave(raw, levelCount) {
    if (raw === null || raw === undefined || raw === '') {
      return { status: 'empty', progress: emptyProgress() };
    }

    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return { status: 'broken', reason: 'unreadable', raw: raw };
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { status: 'broken', reason: 'shape', raw: raw };
    }

    if (data.v !== undefined && data.v !== VERSION) {
      return { status: 'broken', reason: 'version', raw: raw };
    }

    var norm = normalizeProgress(data, levelCount);
    return { status: 'valid', progress: norm.progress, repaired: norm.repaired };
  }

  function serialize(progress) {
    var p = progress || emptyProgress();
    return JSON.stringify({
      v: VERSION,
      unlocked: p.unlocked,
      completed: p.completed.slice(),
      best: p.best
    });
  }

  function isUnlocked(progress, level) {
    return !!progress && (level.index + 1) <= progress.unlocked;
  }

  function isCompleted(progress, level) {
    return !!progress && progress.completed.indexOf(level.id) >= 0;
  }

  root.SignalPathCore = {
    SAVE_KEY: SAVE_KEY,
    VERSION: VERSION,
    keyOf: keyOf,
    parseLevel: parseLevel,
    parseLevels: parseLevels,
    isWall: isWall,
    hasFragment: hasFragment,
    createRun: createRun,
    move: move,
    undo: undo,
    restart: restart,
    held: held,
    remaining: remaining,
    atBeacon: atBeacon,
    emptyProgress: emptyProgress,
    normalizeProgress: normalizeProgress,
    readSave: readSave,
    serialize: serialize,
    isUnlocked: isUnlocked,
    isCompleted: isCompleted
  };
})(typeof window !== 'undefined' ? window : globalThis);
