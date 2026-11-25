/* =====================================================================
   LAMPLIGHT - page controller
   ---------------------------------------------------------------------
   Owns the DOM, the room rail and the save. All the rules live in
   assets/js/lamplight-core.js; this file asks it questions and draws the
   answers.

   Storage contract: exactly one key, L.SAVE_KEY. Nothing else is read,
   written or removed here, and the film's key and the stories' keys are
   not named anywhere in this file.
   ===================================================================== */

(function () {
  'use strict';

  var L = window.LAMPLIGHT;
  var LEVELS = window.LAMPLIGHT_LEVELS;

  if (!L || !LEVELS || !LEVELS.length) { return; }

  var board = document.querySelector('[data-board]');
  var elIndex = document.querySelector('[data-level-index]');
  var elLit = document.querySelector('[data-lit]');
  var elTurns = document.querySelector('[data-turns]');
  var elName = document.querySelector('[data-level-name]');
  var elIdea = document.querySelector('[data-level-idea]');
  var elStatus = document.querySelector('[data-status]');
  var elRail = document.querySelector('[data-rail]');
  var elResult = document.querySelector('[data-result]');
  var elResultKicker = document.querySelector('[data-result-kicker]');
  var elResultTitle = document.querySelector('[data-result-title]');
  var elResultBody = document.querySelector('[data-result-body]');
  var elNext = document.querySelector('[data-next]');
  var elReplay = document.querySelector('[data-replay]');
  var elRestart = document.querySelector('[data-restart]');
  var elSaveNote = document.querySelector('[data-save-note]');
  var elReset = document.querySelector('[data-reset]');
  var elResetPanel = document.querySelector('[data-reset-panel]');
  var elResetConfirm = document.querySelector('[data-reset-confirm]');
  var elResetCancel = document.querySelector('[data-reset-cancel]');

  if (!board || !elIndex || !elRail) { return; }

  var rooms = LEVELS.map(function (level) { return L.parse(level); });

  var progress = L.emptyProgress();
  var saveBroken = false;
  var state = {
    index: 0,
    orientations: [],
    turns: 0,
    done: false
  };

  /* ---------------- storage ---------------- */

  function readSave() {
    var raw = null;
    try { raw = window.localStorage.getItem(L.SAVE_KEY); } catch (e) { return; }

    if (raw === null) { return; }

    var parsed = L.readProgress(raw);
    if (parsed) {
      progress = parsed;
      return;
    }

    /* Something is stored and it is not readable. Say so, keep it, and play
       from the first room in memory. Nothing is deleted here. */
    saveBroken = true;
    elSaveNote.textContent = 'There is saved progress in this browser that this version cannot read. It has not been deleted. You can play from the first room, or use Reset progress to clear it.';
  }

  function writeSave() {
    try { window.localStorage.setItem(L.SAVE_KEY, L.serialize(progress)); } catch (e) { /* private mode, full quota */ }
  }

  /* ---------------- drawing ---------------- */

  function buildBoard(focusMirror) {
    var room = rooms[state.index];
    var trail = L.trace(room, state.orientations);
    var frag = document.createDocumentFragment();
    var mirrorNodes = [];
    var x, y, ch, cell, key;

    board.textContent = '';
    board.style.setProperty('--lp-cols', String(room.w));

    for (y = 0; y < room.h; y += 1) {
      for (x = 0; x < room.w; x += 1) {
        ch = room.rows[y].charAt(x);
        key = y + ':' + x;

        if (ch === '/' || ch === '\\') {
          cell = document.createElement('button');
          cell.type = 'button';
          cell.className = 'lp-cell lp-mirror';
          cell.setAttribute('data-mirror', String(L.mirrorIndexAt(room, x, y)));
          cell.setAttribute('aria-label', 'Mirror, row ' + (y + 1) + ' column ' + (x + 1) + '. Turn it.');
          cell.textContent = state.orientations[L.mirrorIndexAt(room, x, y)];
          if (trail.path[key]) { cell.className += ' is-lit'; }
          mirrorNodes.push(cell);
          frag.appendChild(cell);
          continue;
        }

        cell = document.createElement('div');
        cell.className = 'lp-cell';
        cell.setAttribute('aria-hidden', 'true');

        if (ch === '#') {
          cell.className += ' lp-wall';
        } else if (ch === '*') {
          cell.className += ' lp-window';
          if (trail.lit[key]) { cell.className += ' is-lit'; }
          cell.textContent = '\u25A1';
        } else if (ch === 'S' || (x === room.source.x && y === room.source.y)) {
          cell.className += ' lp-lamp';
          cell.textContent = '\u25CF';
        } else if (trail.path[key]) {
          cell.className += ' lp-trail';
        }

        frag.appendChild(cell);
      }
    }

    board.appendChild(frag);

    if (typeof focusMirror === 'number' && mirrorNodes[focusMirror]) {
      mirrorNodes[focusMirror].focus();
    }
  }

  function buildRail() {
    var frag = document.createDocumentFragment();
    var i, b, level;

    elRail.textContent = '';

    for (i = 0; i < rooms.length; i += 1) {
      level = rooms[i];
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'rail-btn';
      b.setAttribute('data-level', String(i));

      if (i + 1 > progress.unlocked) {
        b.disabled = true;
        b.setAttribute('aria-label', 'Room ' + (i + 1) + ', ' + level.name + '. Locked until the room before it is lit.');
        b.textContent = String(i + 1);
      } else {
        b.setAttribute('aria-label', 'Room ' + (i + 1) + ', ' + level.name + (progress.completed.indexOf(i + 1) !== -1 ? ', lit' : ''));
        b.textContent = String(i + 1);
        if (progress.completed.indexOf(i + 1) !== -1) { b.className += ' is-done'; }
      }

      if (i === state.index) {
        b.className += ' is-current';
        b.setAttribute('aria-current', 'true');
      }

      frag.appendChild(b);
    }

    elRail.appendChild(frag);
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  function render() {
    var room = rooms[state.index];
    var lit = L.litCount(room, state.orientations);

    elIndex.textContent = (state.index + 1) + ' of ' + rooms.length;
    elLit.textContent = lit + ' / ' + room.windows.length;
    elTurns.textContent = String(state.turns);
    elName.textContent = room.name;
    elIdea.textContent = room.idea || '';

    buildBoard();
    buildRail();

    if (state.done) {
      elResult.hidden = false;
      elResultKicker.textContent = state.index + 1 === rooms.length ? 'The last room' : 'Room lit';
      elResultTitle.textContent = state.index + 1 === rooms.length ? 'Every window in the building' : 'Every window lit';
      elResultBody.textContent = state.index + 1 === rooms.length
        ? 'That is all ' + rooms.length + ' rooms. The mirrors will keep their new positions until you turn them back, and you can start again from the first room whenever you want.'
        : 'Room ' + (state.index + 1) + ' is finished in ' + plural(state.turns, 'turn', 'turns') + '. Room ' + (state.index + 2) + ' is unlocked.';
      elNext.textContent = state.index + 1 === rooms.length ? 'Start again from the first room' : 'Next room';
      elNext.hidden = false;
      elStatus.textContent = 'Every window in ' + room.name + ' is lit.';
    } else {
      elResult.hidden = true;
      elStatus.textContent = lit === 0
        ? 'No window is lit yet. Turn a mirror to send the beam towards one.'
        : plural(lit, 'window is', 'windows are') + ' lit, ' + plural(room.windows.length - lit, 'window still dark', 'windows still dark') + '.';
    }
  }

  /* ---------------- play ---------------- */

  function startRoom(index, message) {
    var room = rooms[index];
    state.index = index;
    state.orientations = L.initialOrientations(room);
    state.turns = 0;
    state.done = false;
    render();
    if (message) { elStatus.textContent = message; }
    board.scrollIntoView({ block: 'nearest' });
  }

  function turnMirror(index) {
    if (state.done) { return; }

    state.orientations = L.rotate(state.orientations, index);
    state.turns += 1;

    var room = rooms[state.index];
    if (L.solved(room, state.orientations)) {
      state.done = true;
      progress = L.complete(progress, state.index + 1);
      writeSave();
      render();
      var nextBtn = elNext;
      if (nextBtn && !nextBtn.hidden) { nextBtn.focus(); }
      return;
    }

    render();
    buildBoard(index);
  }

  board.addEventListener('click', function (event) {
    var button = event.target.closest('[data-mirror]');
    if (!button || !board.contains(button)) { return; }
    turnMirror(Number(button.getAttribute('data-mirror')));
  });

  elRail.addEventListener('click', function (event) {
    var button = event.target.closest('[data-level]');
    if (!button || button.disabled) { return; }
    startRoom(Number(button.getAttribute('data-level')));
  });

  elRestart.addEventListener('click', function () {
    startRoom(state.index, 'The mirrors are back where they started.');
  });

  elNext.addEventListener('click', function () {
    var last = state.index + 1 === rooms.length;
    startRoom(last ? 0 : state.index + 1);
  });

  elReplay.addEventListener('click', function () {
    startRoom(state.index, 'The mirrors are back where they started.');
  });

  elReset.addEventListener('click', function () {
    elResetPanel.hidden = false;
    elResetConfirm.focus();
  });

  elResetCancel.addEventListener('click', function () {
    elResetPanel.hidden = true;
    elReset.focus();
  });

  elResetConfirm.addEventListener('click', function () {
    try { window.localStorage.removeItem(L.SAVE_KEY); } catch (e) { /* nothing stored to remove */ }
    progress = L.emptyProgress();
    saveBroken = false;
    elSaveNote.textContent = 'Progress is saved in this browser only, under its own key.';
    elResetPanel.hidden = true;
    startRoom(0, 'Progress reset. Every room is back to the first.');
    elReset.focus();
  });

  /* ---------------- boot ---------------- */

  readSave();

  var startAt = Math.min(Math.max(progress.unlocked, 1), rooms.length) - 1;
  startRoom(startAt);

  if (saveBroken) {
    elStatus.textContent = 'Saved progress could not be read, so this is the first room. Nothing stored has been deleted.';
  }
}());
