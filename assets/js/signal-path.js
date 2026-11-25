/* =====================================================================
   THE WRONG SCRIPT - The Arcade: SIGNAL PATH, the page
   ---------------------------------------------------------------------
   The only file in the game that touches the document and localStorage.
   The rules live in assets/js/signal-path-core.js; the levels live in
   arcade/data/signal-path-levels.js. Nothing here invents a level, a
   score or a rank - it draws what the rules report.

   Storage: one key, wrong-script.arcade.signal-path.v1, holding only
   { v, unlocked, completed, best }. It never touches the film's save key
   or the story's save key - this file reads and writes nothing else, and
   tools/verify-signal-path.js fails the build if that ever changes.
   ===================================================================== */

(function () {
  'use strict';

  var Core = window.SignalPathCore;

  var boardEl = document.querySelector('[data-board]');
  var statusEl = document.querySelector('[data-status]');
  var levelIndexEl = document.querySelector('[data-level-index]');
  var levelNameEl = document.querySelector('[data-level-name]');
  var movesEl = document.querySelector('[data-moves]');
  var fragsEl = document.querySelector('[data-frags]');
  var railEl = document.querySelector('[data-rail]');
  var resultEl = document.querySelector('[data-result]');
  var resultKickerEl = document.querySelector('[data-result-kicker]');
  var resultTitleEl = document.querySelector('[data-result-title]');
  var resultBodyEl = document.querySelector('[data-result-body]');
  var nextBtn = document.querySelector('[data-next]');
  var replayBtn = document.querySelector('[data-replay]');
  var restartBtn = document.querySelector('[data-restart]');
  var undoBtn = document.querySelector('[data-undo]');
  var resetBtn = document.querySelector('[data-reset]');
  var resetPanel = document.querySelector('[data-reset-panel]');
  var resetConfirm = document.querySelector('[data-reset-confirm]');
  var resetCancel = document.querySelector('[data-reset-cancel]');
  var saveNoteEl = document.querySelector('[data-save-note]');

  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var KEYS = {
    arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right'
  };
  var DEFAULT_SAVE_NOTE = 'Progress is saved in this browser only, under its own key. It does not sync to other devices, and it is separate from the film and the stories.';

  var levels = [];
  var index = 0;
  var run = null;
  var finished = false;
  var progress = null;
  var saveBroken = false;

  /* ---------- small helpers ---------- */

  function setStatus(text, tone) {
    if (!statusEl) { return; }
    statusEl.textContent = text;
    statusEl.className = 'status' + (tone ? ' is-' + tone : '');
  }

  function setSaveNote(text, warning) {
    if (!saveNoteEl) { return; }
    saveNoteEl.textContent = text;
    saveNoteEl.className = 'save-note' + (warning ? ' is-warning' : '');
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function fatal(message) {
    if (boardEl) {
      boardEl.textContent = '';
      var p = document.createElement('p');
      p.className = 'status is-alert';
      p.textContent = message;
      boardEl.appendChild(p);
    }
    setStatus(message, 'alert');
  }

  /* ---------- save ---------- */

  function loadSave() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(Core.SAVE_KEY);
    } catch (err) {
      saveBroken = true;
      progress = Core.emptyProgress();
      setSaveNote('This browser is blocking local storage, so progress cannot be saved. The game still works for this visit.', true);
      return;
    }

    var result = Core.readSave(raw, levels.length);

    if (result.status === 'broken') {
      saveBroken = true;
      progress = Core.emptyProgress();
      var why = result.reason === 'version'
        ? 'it was written by a different version of the game'
        : result.reason === 'shape'
          ? 'it is not the shape the game expects'
          : 'the stored text is not readable';
      setSaveNote('The saved progress in this browser could not be read: ' + why + '. Nothing has been deleted - the old value is still stored. You are starting from level 1, and progress will not be written over it until you choose "Reset progress".', true);
      return;
    }

    progress = result.progress;
    setSaveNote(DEFAULT_SAVE_NOTE, false);
  }

  function persist() {
    if (saveBroken) { return false; }
    try {
      window.localStorage.setItem(Core.SAVE_KEY, Core.serialize(progress));
      return true;
    } catch (err) {
      saveBroken = true;
      setSaveNote('Progress could not be written to this browser\'s storage, so this sitting is not being saved. The game still works.', true);
      return false;
    }
  }

  /* ---------- drawing ---------- */

  function renderBoard() {
    if (!boardEl) { return; }
    var level = levels[index];
    var left = Core.remaining(level, run);
    var ready = left === 0;
    var frag = document.createDocumentFragment();

    boardEl.style.setProperty('--cols', String(level.cols));
    boardEl.textContent = '';

    for (var y = 0; y < level.rows; y++) {
      for (var x = 0; x < level.cols; x++) {
        var cell = document.createElement('div');

        if (Core.isWall(level, x, y)) {
          cell.className = 'cell cell--wall';
          frag.appendChild(cell);
          continue;
        }

        cell.className = 'cell cell--floor';

        if (x === run.x && y === run.y) {
          cell.className += ' cell--player';
          cell.textContent = '\u25B2';
        } else if (Core.hasFragment(level, x, y) && run.collected.indexOf(Core.keyOf(x, y)) < 0) {
          cell.className += ' cell--frag';
          cell.textContent = '\u25C6';
        } else if (x === level.beacon.x && y === level.beacon.y) {
          cell.className += ' cell--beacon' + (ready ? ' is-ready' : '');
          cell.textContent = ready ? '\u25C9' : '\u25CE';
        } else if (x === level.start.x && y === level.start.y) {
          cell.className += ' cell--start';
          cell.textContent = 'S';
        }

        frag.appendChild(cell);
      }
    }

    boardEl.appendChild(frag);
  }

  function renderHud() {
    var level = levels[index];
    if (levelIndexEl) { levelIndexEl.textContent = (index + 1) + ' of ' + levels.length; }
    if (levelNameEl) { levelNameEl.textContent = level.name; }
    if (movesEl) { movesEl.textContent = String(run.moves); }
    if (fragsEl) { fragsEl.textContent = Core.held(run) + ' / ' + level.required; }
  }

  function renderRail() {
    if (!railEl) { return; }
    railEl.textContent = '';

    levels.forEach(function (level, i) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'rail-item';

      var name = document.createElement('span');
      name.textContent = (i + 1) + '. ' + level.name;

      var state = document.createElement('span');
      state.className = 'rail-state';

      var unlocked = Core.isUnlocked(progress, level);
      if (!unlocked) {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.classList.add('is-locked');
        state.textContent = 'Sealed';
        button.title = 'Finish the level before this one to unlock it.';
      } else if (Core.isCompleted(progress, level)) {
        state.textContent = 'Done';
      } else {
        state.textContent = 'Open';
      }

      if (i === index) { button.setAttribute('aria-current', 'true'); }

      button.appendChild(name);
      button.appendChild(state);
      button.addEventListener('click', function () { startLevel(i); });
      railEl.appendChild(button);
    });
  }

  function renderResult() {
    if (!resultEl) { return; }
    var level = levels[index];
    var isFinal = index === levels.length - 1;
    var best = progress.best[level.id];

    if (resultKickerEl) { resultKickerEl.textContent = isFinal ? 'Final relay' : 'Level complete'; }
    if (resultTitleEl) { resultTitleEl.textContent = isFinal ? 'The whole path is live' : level.name + ' is live'; }
    if (resultBodyEl) {
      var text = 'Cleared in ' + plural(run.moves, 'move', 'moves') + ' with all ' +
        plural(level.required, 'fragment', 'fragments') + ' collected.';
      if (best) { text += ' Best so far: ' + plural(best, 'move', 'moves') + '.'; }
      if (isFinal) {
        text += ' All six relays are answering. You can replay any level from the list, or run the whole path again from the first.';
      }
      resultBodyEl.textContent = text;
    }
    if (nextBtn) {
      nextBtn.textContent = isFinal ? 'Play again from level 1' : 'Next level: ' + levels[index + 1].name;
    }
    if (replayBtn) { replayBtn.textContent = 'Replay ' + level.name; }

    resultEl.hidden = false;
  }

  function renderAll() {
    renderBoard();
    renderHud();
    renderRail();
  }

  /* ---------- play ---------- */

  function startLevel(i) {
    if (i < 0 || i >= levels.length) { return; }
    if (!Core.isUnlocked(progress, levels[i])) {
      setStatus('That relay is still sealed. Clear the level before it first.', 'alert');
      return;
    }

    index = i;
    run = Core.createRun(levels[i]);
    finished = false;
    if (resultEl) { resultEl.hidden = true; }

    renderAll();
    setStatus('Level ' + (i + 1) + ': ' + levels[i].name + '. ' + (levels[i].hint || ''));
  }

  function completeLevel() {
    var level = levels[index];
    if (progress.completed.indexOf(level.id) < 0) { progress.completed.push(level.id); }

    var best = progress.best[level.id];
    if (!best || run.moves < best) { progress.best[level.id] = run.moves; }

    var nextIndex = index + 1;
    if (nextIndex < levels.length) {
      progress.unlocked = Math.max(progress.unlocked, nextIndex + 1);
    }

    persist();
    renderRail();
    renderResult();
  }

  function doMove(dir) {
    if (!run) { return; }
    if (finished) {
      setStatus('This level is already complete. Continue to the next one, replay it, or pick another relay.', 'good');
      return;
    }

    var delta = DIRS[dir];
    if (!delta) { return; }

    var level = levels[index];
    var res = Core.move(run, level, delta[0], delta[1]);

    if (!res.ok) {
      if (res.reason === 'blocked') {
        setStatus('Blocked: that is a wall, or the edge of the grid. The move counter stays at ' + run.moves + '.', 'alert');
      }
      return;
    }

    renderBoard();
    renderHud();

    if (res.completed) {
      finished = true;
      completeLevel();
      setStatus('Beacon open. ' + level.name + ' complete in ' + plural(run.moves, 'move', 'moves') + '.', 'good');
    } else if (res.atBeacon) {
      setStatus('The beacon stays sealed: ' + plural(res.remaining, 'fragment', 'fragments') + ' still out there. The move counted.', 'alert');
    } else if (res.collected) {
      setStatus(res.remaining === 0
        ? 'That was the last fragment. The beacon is open - walk onto it.'
        : 'Fragment collected. ' + plural(res.remaining, 'fragment', 'fragments') + ' left.', 'good');
    } else {
      setStatus('Move ' + run.moves + '. ' + Core.held(run) + ' of ' + level.required + ' fragments collected.');
    }
  }

  /* ---------- controls ---------- */

  document.addEventListener('keydown', function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) { return; }

    var dir = KEYS[String(event.key).toLowerCase()];
    if (!dir) { return; }

    var tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { return; }

    event.preventDefault();
    doMove(dir);
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-move]'), function (button) {
    button.addEventListener('click', function () {
      doMove(button.getAttribute('data-move'));
    });
  });

  if (restartBtn) {
    restartBtn.addEventListener('click', function () {
      var level = levels[index];
      Core.restart(run, level);
      finished = false;
      if (resultEl) { resultEl.hidden = true; }
      renderAll();
      setStatus('Level restarted. Back at the start cell with 0 moves and no fragments.', 'good');
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener('click', function () {
      if (finished) {
        setStatus('This level is already complete. Restart it if you want to try a shorter route.', 'good');
        return;
      }
      var undone = Core.undo(run);
      if (!undone) {
        setStatus('Nothing to undo yet: you have not made a move on this level.', 'alert');
        return;
      }
      renderAll();
      setStatus('Last move undone. Back to ' + plural(run.moves, 'move', 'moves') + ' with ' + Core.held(run) + ' of ' + levels[index].required + ' fragments.', 'good');
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (index === levels.length - 1) { startLevel(0); return; }
      startLevel(index + 1);
    });
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', function () { startLevel(index); });
  }

  if (resetBtn && resetPanel) {
    resetBtn.addEventListener('click', function () {
      resetPanel.hidden = false;
      if (resetCancel) { resetCancel.focus(); }
    });
  }

  if (resetCancel && resetPanel) {
    resetCancel.addEventListener('click', function () {
      resetPanel.hidden = true;
      setStatus('Progress kept.', 'good');
      if (resetBtn) { resetBtn.focus(); }
    });
  }

  if (resetConfirm) {
    resetConfirm.addEventListener('click', function () {
      try {
        window.localStorage.removeItem(Core.SAVE_KEY);
      } catch (err) {
        /* storage unavailable: memory reset below still applies */
      }
      progress = Core.emptyProgress();
      saveBroken = false;
      setSaveNote(DEFAULT_SAVE_NOTE, false);
      if (resetPanel) { resetPanel.hidden = true; }
      startLevel(0);
      setStatus('Progress reset. Only the first relay is open again.', 'good');
    });
  }

  /* ---------- boot ---------- */

  if (!Core) {
    fatal('The game rules did not load, so SIGNAL PATH cannot start. Reload the page; if it persists, the file assets/js/signal-path-core.js is missing.');
    return;
  }

  if (!Array.isArray(window.SIGNAL_PATH_LEVELS)) {
    fatal('The levels did not load, so SIGNAL PATH cannot start. Reload the page; if it persists, the file arcade/data/signal-path-levels.js is missing.');
    return;
  }

  var parsed = Core.parseLevels(window.SIGNAL_PATH_LEVELS);
  levels = parsed.levels;

  if (!levels.length) {
    fatal('No level could be read from the level data' + (parsed.errors.length ? ' (' + parsed.errors[0] + ')' : '') + '.');
    return;
  }

  loadSave();

  var startAt = 0;
  if (progress.unlocked > 1) {
    startAt = Math.min(progress.unlocked, levels.length) - 1;
  }
  startLevel(startAt);
})();
