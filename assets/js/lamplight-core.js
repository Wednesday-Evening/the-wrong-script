/* =====================================================================
   LAMPLIGHT - rules engine
   ---------------------------------------------------------------------
   No DOM, no storage reads. The page controller in assets/js/lamplight.js
   owns the board, the buttons and the save; this file only answers
   questions about a room.

   A room is a rectangular grid of characters:
     .   empty floor (the beam crosses it)
     #   a wall (the beam stops)
     /   a mirror
     \   a mirror
     *   a window (the beam crosses it and lights it)
     S   where the lamp stands (treated as floor once parsed)

   A mirror has exactly two states and rotating it swaps them. That is the
   whole game: turn mirrors until the beam has crossed every window.

   A beam stops on a wall or at the edge of the grid. It does not stop on a
   window, which is why one path can light several. A beam that would
   re-enter the same mirror on the same heading is cut, so a room can never
   spin forever.
   ===================================================================== */

window.LAMPLIGHT = (function () {
  'use strict';

  var SAVE_KEY = 'wrong-script.arcade.lamplight.v1';
  var MAX_LEVELS = 6;

  /* Unit vectors, named so the reflector table below reads as English. */
  var STEP = {
    e: { x: 1, y: 0 },
    w: { x: -1, y: 0 },
    n: { x: 0, y: -1 },
    s: { x: 0, y: 1 }
  };

  /* '/' and '\' are two-state mirrors. Each entry says which heading comes
     out for each heading that goes in. */
  var FORWARD_SLASH = { e: 'n', n: 'e', w: 's', s: 'w' };
  var BACK_SLASH = { e: 's', s: 'e', w: 'n', n: 'w' };

  function other(mirror) {
    return mirror === '/' ? '\\' : '/';
  }

  function reflect(heading, mirror) {
    var table = mirror === '/' ? FORWARD_SLASH : BACK_SLASH;
    return table[heading] || heading;
  }

  function cellAt(room, x, y) {
    if (y < 0 || y >= room.h || x < 0 || x >= room.w) { return null; }
    return room.rows[y].charAt(x);
  }

  function isMirrorChar(ch) {
    return ch === '/' || ch === '\\';
  }

  /* Turns a level definition into the shape the tracer wants. */
  function parse(level) {
    var rows = level.grid.slice();
    var h = rows.length;
    var w = h ? rows[0].length : 0;
    var mirrors = [];
    var windows = [];
    var walls = [];
    var y, x, ch;

    for (y = 0; y < h; y += 1) {
      if (rows[y].length !== w) {
        throw new Error('level ' + level.id + ': row ' + y + ' is ' + rows[y].length + ' wide, expected ' + w);
      }
      for (x = 0; x < w; x += 1) {
        ch = rows[y].charAt(x);
        if (isMirrorChar(ch)) { mirrors.push({ x: x, y: y }); }
        else if (ch === '*') { windows.push({ x: x, y: y }); }
        else if (ch === '#') { walls.push({ x: x, y: y }); }
      }
    }

    return {
      id: level.id,
      name: level.name,
      w: w,
      h: h,
      rows: rows,
      mirrors: mirrors,
      windows: windows,
      walls: walls,
      source: { x: level.source.x, y: level.source.y, dir: level.source.dir }
    };
  }

  /* The orientations a room starts with: whatever the grid shows. */
  function initialOrientations(room) {
    var out = [];
    var i, m, ch;
    for (i = 0; i < room.mirrors.length; i += 1) {
      m = room.mirrors[i];
      ch = cellAt(room, m.x, m.y);
      out.push(isMirrorChar(ch) ? ch : '/');
    }
    return out;
  }

  function mirrorIndexAt(room, x, y) {
    var i;
    for (i = 0; i < room.mirrors.length; i += 1) {
      if (room.mirrors[i].x === x && room.mirrors[i].y === y) { return i; }
    }
    return -1;
  }

  /* Walks the beam. Returns the set of lit window keys plus a per-cell
     record of the path, which the board uses to draw the light. */
  function trace(room, orientations) {
    var lit = {};
    var path = {};
    var heading = room.source.dir;
    var x = room.source.x;
    var y = room.source.y;
    var guard = {};
    var steps = 0;
    var limit = (room.w + 1) * (room.h + 1) * 4;

    while (steps < limit) {
      steps += 1;
      x += STEP[heading].x;
      y += STEP[heading].y;

      var ch = cellAt(room, x, y);
      if (ch === null || ch === '#') { break; }

      path[y + ':' + x] = true;

      if (ch === '*') {
        lit[y + ':' + x] = true;
        continue;
      }

      if (isMirrorChar(ch)) {
        var index = mirrorIndexAt(room, x, y);
        var facing = orientations && orientations[index] ? orientations[index] : ch;
        var key = index + ':' + heading;
        if (guard[key]) { break; }
        guard[key] = true;
        heading = reflect(heading, facing);
        continue;
      }
    }

    return { lit: lit, path: path, steps: steps };
  }

  function litCount(room, orientations) {
    var result = trace(room, orientations);
    var n = 0;
    var i, w;
    for (i = 0; i < room.windows.length; i += 1) {
      w = room.windows[i];
      if (result.lit[w.y + ':' + w.x]) { n += 1; }
    }
    return n;
  }

  function solved(room, orientations) {
    return room.windows.length > 0 && litCount(room, orientations) === room.windows.length;
  }

  function rotate(orientations, index) {
    var out = orientations.slice();
    if (index >= 0 && index < out.length) { out[index] = other(out[index]); }
    return out;
  }

  /* ---------------------------------------------------------------------
     Progress. Only two facts are stored: how far the player has unlocked,
     and which rooms are finished. Nothing about a person, nothing about a
     session, and nothing shared with the other experiences in this project.
     --------------------------------------------------------------------- */

  function emptyProgress() {
    return { unlocked: 1, completed: [] };
  }

  /* Returns a progress object, or null when the stored value cannot be
     trusted. Never throws and never repairs: the caller decides. */
  function readProgress(raw) {
    if (typeof raw !== 'string' || !raw) { return null; }

    var data;
    try { data = JSON.parse(raw); } catch (e) { return null; }

    if (!data || typeof data !== 'object' || Array.isArray(data)) { return null; }
    if (data.v !== 1) { return null; }

    var unlocked = data.unlocked;
    if (typeof unlocked !== 'number' || !isFinite(unlocked)) { return null; }
    if (Math.floor(unlocked) !== unlocked) { return null; }
    if (unlocked < 1 || unlocked > MAX_LEVELS) { return null; }

    if (!Array.isArray(data.completed)) { return null; }

    var completed = [];
    var i, value;
    for (i = 0; i < data.completed.length; i += 1) {
      value = data.completed[i];
      if (typeof value !== 'number' || Math.floor(value) !== value) { return null; }
      if (value < 1 || value > MAX_LEVELS) { return null; }
      if (completed.indexOf(value) === -1) { completed.push(value); }
    }

    return { unlocked: unlocked, completed: completed };
  }

  function serialize(progress) {
    var completed = (progress.completed || []).slice().sort(function (a, b) { return a - b; });
    return JSON.stringify({ v: 1, unlocked: progress.unlocked, completed: completed });
  }

  /* Records a finished room and returns the new progress. Finishing room 6
     does not unlock a seventh. */
  function complete(progress, levelNumber) {
    var next = {
      unlocked: progress.unlocked,
      completed: progress.completed.slice()
    };
    if (next.completed.indexOf(levelNumber) === -1) { next.completed.push(levelNumber); }
    if (levelNumber + 1 <= MAX_LEVELS && next.unlocked < levelNumber + 1) {
      next.unlocked = levelNumber + 1;
    }
    return next;
  }

  /* Used by tools/verify-lamplight.js: tries every combination and returns
     the first set of orientations that lights every window, so a level can
     be proven solvable without trusting the solution stored beside it. */
  function bruteForce(room) {
    var count = room.mirrors.length;
    var total = Math.pow(2, count);
    var mask, bits, orientations, i;
    for (mask = 0; mask < total; mask += 1) {
      orientations = [];
      for (i = 0; i < count; i += 1) {
        bits = Math.floor(mask / Math.pow(2, i)) % 2;
        orientations.push(bits ? '/' : '\\');
      }
      if (solved(room, orientations)) {
        return { found: true, orientations: orientations, tried: mask + 1 };
      }
    }
    return { found: false, orientations: null, tried: total };
  }

  return {
    SAVE_KEY: SAVE_KEY,
    MAX_LEVELS: MAX_LEVELS,
    other: other,
    reflect: reflect,
    parse: parse,
    cellAt: cellAt,
    initialOrientations: initialOrientations,
    mirrorIndexAt: mirrorIndexAt,
    trace: trace,
    litCount: litCount,
    solved: solved,
    rotate: rotate,
    emptyProgress: emptyProgress,
    readProgress: readProgress,
    serialize: serialize,
    complete: complete,
    bruteForce: bruteForce
  };
}());
