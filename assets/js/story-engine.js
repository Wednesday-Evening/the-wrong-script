/* =====================================================================
   THE WRONG SCRIPT - story engine
   ---------------------------------------------------------------------
   A small renderer for data-driven stories. It knows how to draw a scene,
   offer choices, keep a run in localStorage, follow browser history and
   finish on an ending. It knows nothing about any particular story: all
   writing lives in stories/data/<slug>.js.

   DATA CONTRACT (window.TWS_STORY):
     slug, title, subtitle, start, budget, endings
     scenes: { <id>: { chapter, title, lines, choices, set, build, ending } }
       lines   : array of strings, or {who:'NAME', text:'...'}
       choices : array of {label, note, to, set, requires, visit, quiet}
                 requires: {flag:true} - choice hidden when unmet
                 visit   : true - counts as one hour of the night
       set     : flags applied once, when the scene is first entered
       build   : function(state) -> {lines, choices, title} override
       ending  : {name, kind} - terminal scene, engine draws ending panel

   PERSISTENCE
     Key: "wrong-script.story.<slug>.v1"
     The original film's key is "tws" and this engine never reads, writes
     or clears it. Every load is validated; a malformed run is ignored
     rather than trusted, and nothing is written until the reader acts.
   ===================================================================== */

(function () {
  'use strict';

  var STORY = window.TWS_STORY;
  var root = document.querySelector('[data-story]');
  if (!root) { return; }

  /* ---------- data sanity ---------- */

  function validStory(s) {
    return !!s &&
      typeof s.slug === 'string' && /^[a-z0-9-]+$/.test(s.slug) &&
      typeof s.title === 'string' &&
      s.scenes && typeof s.scenes === 'object' && !Array.isArray(s.scenes) &&
      typeof s.start === 'string' && !!s.scenes[s.start];
  }

  if (!validStory(STORY)) {
    root.innerHTML = '';
    var broken = document.createElement('div');
    broken.className = 'broken';
    var h = document.createElement('h2');
    h.textContent = 'This story could not be opened';
    var p = document.createElement('p');
    p.textContent = 'The story file is missing or incomplete, so nothing has been loaded. The rest of The Stories is unaffected.';
    var a = document.createElement('a');
    a.className = 'btn btn-ghost';
    a.href = '../';
    a.textContent = 'Back to The Stories';
    broken.appendChild(h);
    broken.appendChild(p);
    broken.appendChild(a);
    root.appendChild(broken);
    return;
  }

  var SAVE_KEY = 'wrong-script.story.' + STORY.slug + '.v1';
  var FOUND_KEY = 'wrong-script.story.' + STORY.slug + '.endings.v1';
  var BUDGET = (typeof STORY.budget === 'number' && STORY.budget > 0) ? STORY.budget : 4;

  var els = {
    chapter: root.querySelector('[data-chapter]'),
    title: root.querySelector('[data-title]'),
    lines: root.querySelector('[data-lines]'),
    choices: root.querySelector('[data-choices]'),
    status: root.querySelector('[data-status]'),
    notice: root.querySelector('[data-notice]'),
    barTitle: document.querySelector('[data-bar-title]'),
    restart: document.querySelector('[data-restart]')
  };

  var state = fresh();
  var pushing = false;

  function fresh() {
    return { scene: STORY.start, flags: {}, visits: 0, seen: [], ended: false };
  }

  /* ---------- persistence ---------- */

  function readSave() {
    var raw;
    try {
      raw = window.localStorage.getItem(SAVE_KEY);
    } catch (err) {
      return { save: null, unreadable: false };
    }
    if (!raw) { return { save: null, unreadable: false }; }

    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return { save: null, unreadable: true };
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { save: null, unreadable: true };
    }
    if (data.slug !== STORY.slug) { return { save: null, unreadable: true }; }
    if (typeof data.scene !== 'string' || !STORY.scenes[data.scene]) {
      return { save: null, unreadable: true };
    }

    var out = fresh();
    out.scene = data.scene;
    out.ended = data.ended === true;

    if (data.flags && typeof data.flags === 'object' && !Array.isArray(data.flags)) {
      Object.keys(data.flags).forEach(function (k) {
        if (/^[a-z0-9_]{1,40}$/i.test(k) && data.flags[k] === 1) { out.flags[k] = 1; }
      });
    }
    if (typeof data.visits === 'number' && isFinite(data.visits) && data.visits >= 0) {
      out.visits = Math.min(Math.floor(data.visits), 99);
    }
    if (Array.isArray(data.seen)) {
      out.seen = data.seen.filter(function (id) {
        return typeof id === 'string' && !!STORY.scenes[id];
      }).slice(0, 200);
    }
    return { save: out, unreadable: false };
  }

  function writeSave() {
    if (state.ended) {
      try { window.localStorage.removeItem(SAVE_KEY); } catch (err) { /* storage off */ }
      return;
    }
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1,
        slug: STORY.slug,
        scene: state.scene,
        flags: state.flags,
        visits: state.visits,
        seen: state.seen,
        ended: false,
        at: new Date().toISOString()
      }));
    } catch (err) { /* storage off: the run simply will not resume */ }
  }

  function foundEndings() {
    try {
      var raw = window.localStorage.getItem(FOUND_KEY);
      var list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) { return []; }
      return list.filter(function (n) { return typeof n === 'string' && n.length < 60; });
    } catch (err) {
      return [];
    }
  }

  function recordEnding(name) {
    var list = foundEndings();
    if (list.indexOf(name) !== -1) { return list; }
    list.push(name);
    try {
      window.localStorage.setItem(FOUND_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (err) { /* storage off */ }
    return list;
  }

  /* ---------- navigation ---------- */

  function go(id, opts) {
    if (!STORY.scenes[id]) { return; }
    var scene = STORY.scenes[id];

    if (scene.set && typeof scene.set === 'object') {
      Object.keys(scene.set).forEach(function (k) { state.flags[k] = scene.set[k]; });
    }

    state.scene = id;
    if (state.seen.indexOf(id) === -1) { state.seen.push(id); }
    if (scene.ending) { state.ended = true; }

    writeSave();
    render();

    if (!(opts && opts.fromHistory)) {
      var hash = '#' + id;
      if (window.location.hash !== hash) {
        try {
          window.history.pushState({ scene: id }, '', hash);
        } catch (err) {
          window.location.hash = hash;
        }
      }
    }
    if (state.ended) {
      try { window.history.replaceState({ scene: id }, '', '#' + id); } catch (err) { /* noop */ }
    }
  }

  function fromHash() {
    var id = (window.location.hash || '').replace(/^#\/?/, '');
    return STORY.scenes[id] ? id : null;
  }

  window.addEventListener('popstate', function () {
    var id = fromHash();
    if (!id || id === state.scene) { return; }
    state.ended = false;
    go(id, { fromHistory: true });
  });

  /* ---------- rendering ---------- */

  function render() {
    var scene = STORY.scenes[state.scene];
    if (!scene) { return; }

    var view = scene;
    if (typeof scene.build === 'function') {
      var built = scene.build(state) || {};
      view = {
        chapter: built.chapter || scene.chapter,
        title: built.title || scene.title,
        lines: built.lines || scene.lines || [],
        choices: built.choices || scene.choices || [],
        ending: scene.ending
      };
    }

    if (els.chapter) { els.chapter.textContent = view.chapter || ''; }
    if (els.title) { els.title.textContent = view.title || ''; }

    if (els.lines) {
      els.lines.innerHTML = '';
      (view.lines || []).forEach(function (line) {
        var p = document.createElement('p');
        if (line && typeof line === 'object') {
          p.className = 'say';
          var who = document.createElement('b');
          who.textContent = line.who || '';
          p.appendChild(who);
          p.appendChild(document.createTextNode(line.text || ''));
        } else {
          p.className = 'nar';
          p.textContent = String(line);
        }
        els.lines.appendChild(p);
      });
    }

    drawChoices(view);
    drawStatus();

    if (els.barTitle) { els.barTitle.textContent = STORY.title; }
    document.title = (view.title ? view.title + ' - ' : '') + STORY.title + ' - THE WRONG SCRIPT';

    if (els.title) {
      els.title.setAttribute('tabindex', '-1');
      try { els.title.focus({ preventScroll: false }); } catch (err) { /* older browsers */ }
    }
  }

  function drawChoices(view) {
    if (!els.choices) { return; }
    els.choices.innerHTML = '';

    if (view.ending) {
      drawEnding(view);
      return;
    }

    var choices = (view.choices || []).filter(function (c) {
      return c && typeof c.label === 'string' && c.to && STORY.scenes[c.to] && allows(c);
    });

    if (!choices.length) {
      var stuck = document.createElement('p');
      stuck.className = 'notice';
      stuck.textContent = 'There is nothing further along this path. Use Restart in the bar above to begin again.';
      els.choices.appendChild(stuck);
      return;
    }

    var lab = document.createElement('p');
    lab.className = 'choices-lab';
    lab.textContent = 'What you do';
    els.choices.appendChild(lab);

    choices.forEach(function (choice, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice' + (choice.quiet ? ' quiet' : '');

      var idx = document.createElement('span');
      idx.className = 'idx';
      idx.setAttribute('aria-hidden', 'true');
      idx.textContent = String(i + 1).padStart(2, '0');

      var body = document.createElement('span');
      body.className = 'cl';
      var b = document.createElement('b');
      b.textContent = choice.label;
      body.appendChild(b);
      if (choice.note) {
        var note = document.createElement('span');
        note.textContent = choice.note;
        body.appendChild(note);
      }

      btn.appendChild(idx);
      btn.appendChild(body);
      btn.addEventListener('click', function () { choose(choice); });
      els.choices.appendChild(btn);
    });
  }

  function allows(choice) {
    if (!choice.requires) { return true; }
    return Object.keys(choice.requires).every(function (flag) {
      var want = choice.requires[flag];
      var has = state.flags[flag] === 1;
      return want ? has : !has;
    });
  }

  function choose(choice) {
    if (choice.set && typeof choice.set === 'object') {
      Object.keys(choice.set).forEach(function (k) { state.flags[k] = choice.set[k]; });
    }
    if (choice.visit) { state.visits += 1; }

    if (els.notice) { els.notice.hidden = true; }

    /* The night runs out: the tower sends you to the water instead. */
    if (state.visits >= BUDGET && choice.to === 'tower' && STORY.scenes.bell) {
      go('bell');
      return;
    }
    go(choice.to);
  }

  function drawStatus() {
    if (!els.status) { return; }
    els.status.innerHTML = '';
    if (state.ended) { return; }

    var left = Math.max(0, BUDGET - state.visits);
    var item = document.createElement('span');
    item.textContent = left === 0
      ? 'Low water'
      : (left === 1 ? 'One hour of night left' : left + ' hours of night left');
    els.status.appendChild(item);

    if (STORY.endings) {
      var found = document.createElement('span');
      found.textContent = 'Endings found: ' + foundEndings().length + ' of ' + STORY.endings;
      els.status.appendChild(found);
    }
  }

  function drawEnding(view) {
    var panel = document.createElement('div');
    panel.className = 'ending';

    var seal = document.createElement('span');
    seal.className = 'seal';
    seal.textContent = view.ending.kind ? 'Ending - ' + view.ending.kind : 'Ending';
    panel.appendChild(seal);

    var h = document.createElement('h3');
    h.textContent = view.ending.name || 'An ending';
    panel.appendChild(h);

    var note = document.createElement('p');
    note.textContent = 'That is one way the night could have gone. The story keeps four others, and the record of what you found is kept in this browser.';
    panel.appendChild(note);

    var actions = document.createElement('div');
    actions.className = 'ending-actions';

    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn btn-primary';
    again.textContent = 'Read it again';
    again.addEventListener('click', function () { restart(); });
    actions.appendChild(again);

    var lib = document.createElement('a');
    lib.className = 'btn btn-ghost';
    lib.href = '../';
    lib.textContent = 'Back to The Stories';
    actions.appendChild(lib);

    var lobby = document.createElement('a');
    lobby.className = 'btn btn-ghost';
    lobby.href = '../../';
    lobby.textContent = 'The Lobby';
    actions.appendChild(lobby);

    panel.appendChild(actions);

    var found = document.createElement('p');
    found.className = 'found';
    var list = recordEnding(view.ending.name || 'An ending');
    found.textContent = 'Endings found in this browser: ' + list.length + ' of ' + (STORY.endings || '?');
    panel.appendChild(found);

    els.choices.appendChild(panel);

    if (els.status) { els.status.innerHTML = ''; }
  }

  /* ---------- restart ---------- */

  function restart() {
    state = fresh();
    try { window.localStorage.removeItem(SAVE_KEY); } catch (err) { /* storage off */ }
    if (els.notice) { els.notice.hidden = true; }
    try {
      window.history.replaceState({ scene: STORY.start }, '', '#' + STORY.start);
    } catch (err) { /* noop */ }
    go(STORY.start, { fromHistory: true });
  }

  if (els.restart) {
    els.restart.addEventListener('click', function () {
      restart();
    });
  }

  /* ---------- start ---------- */

  (function start() {
    var loaded = readSave();

    if (loaded.unreadable && els.notice) {
      els.notice.hidden = false;
      els.notice.textContent = 'A saved run in this browser could not be read, so this is a fresh start. Nothing else was touched.';
    }

    var hashScene = fromHash();
    if (hashScene) {
      state = loaded.save && !loaded.save.ended ? loaded.save : fresh();
      state.ended = false;
      go(hashScene, { fromHistory: true });
      try { window.history.replaceState({ scene: hashScene }, '', '#' + hashScene); } catch (err) { /* noop */ }
      return;
    }

    if (loaded.save && !loaded.save.ended) {
      state = loaded.save;
      if (els.notice) {
        els.notice.hidden = false;
        els.notice.textContent = 'Resumed where you stopped last time. Restart in the bar above begins the night again.';
      }
      go(state.scene, { fromHistory: true });
      try { window.history.replaceState({ scene: state.scene }, '', '#' + state.scene); } catch (err) { /* noop */ }
      return;
    }

    state = fresh();
    go(STORY.start, { fromHistory: true });
    try { window.history.replaceState({ scene: STORY.start }, '', '#' + STORY.start); } catch (err) { /* noop */ }
  })();
})();
