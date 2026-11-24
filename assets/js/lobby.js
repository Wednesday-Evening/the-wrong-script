/* =====================================================================
   THE WRONG SCRIPT - Lobby behaviour (Phase 1)
   ---------------------------------------------------------------------
   Plain JavaScript, no framework, no dependencies.

   Three jobs only:
     1. open and close the small-screen navigation,
     2. read the original film's save (localStorage key "tws") and offer
        a way back to the scene the visitor left,
     3. add an edge to the header once the page is scrolled.

   The save is only ever read here. Nothing in this file writes to,
   resets or migrates stored progress.
   ===================================================================== */

(function () {
  'use strict';

  var SAVE_KEY = 'tws';

  /* Scene id -> a name a visitor recognises. Mirrors the film's node
     table; an unknown id falls back to a generic label. */
  var SCENE_NAMES = {
    cast: 'Casting',
    cast2: 'Casting',
    hub: 'The Doors',
    glitch: 'A film error',
    hotel: 'The Hotel',
    hp: 'The Hotel, front desk',
    hsolve: 'The Hotel, the safe',
    studio: 'The Art Studio',
    s2: 'The Art Studio',
    s3: 'The Art Studio',
    backstage: 'Backstage',
    bp: 'Backstage',
    bsolve: 'Backstage, the mirrors',
    crew: 'The Crew Lounge',
    crew2: 'The Crew Lounge',
    horror: 'Genre chaos',
    horror2: 'Genre chaos',
    action: 'Genre chaos',
    action2: 'Genre chaos',
    romance: 'Genre chaos',
    romance2: 'Genre chaos',
    fantasy: 'Genre chaos',
    fantasy2: 'Genre chaos',
    editing: 'The Editing Room',
    final: 'The last scene',
    endA: 'Ending: The Masterpiece',
    endB: 'Ending: The Chaos Cut',
    endC: 'Ending: The Exit',
    post: 'Post-credits',
    post2: 'Post-credits'
  };

  /* ---------- navigation ---------- */

  var toggle = document.querySelector('#nav-toggle');
  var nav = document.querySelector('#site-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      nav.classList.toggle('is-open', !open);
      if (!open) {
        var first = nav.querySelector('a');
        if (first) { first.focus({ preventScroll: true }); }
      }
    });

    nav.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest('a')) { close(); }
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { close(); }
    });

    document.addEventListener('click', function (ev) {
      if (!nav.classList.contains('is-open')) { return; }
      if (nav.contains(ev.target) || toggle.contains(ev.target)) { return; }
      close();
    });

    function close() {
      if (toggle.getAttribute('aria-expanded') !== 'true') { return; }
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
    }
  }

  /* ---------- the saved film ---------- */

  var slot = document.querySelector('#continue-slot');

  if (slot) {
    var save = readSave();
    if (save) { render(save); }
  }

  function readSave() {
    try {
      var raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) { return null; }
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') { return null; }
      if (typeof data.sc !== 'string' || !data.sc) { return null; }
      return data;
    } catch (err) {
      return null;
    }
  }

  function render(save) {
    var name = SCENE_NAMES[save.sc] || 'an unknown scene';
    var finished = save.sc === 'endA' || save.sc === 'endB' ||
                   save.sc === 'endC' || save.sc === 'post' || save.sc === 'post2';

    var card = document.createElement('div');
    card.className = 'continue-card';

    var text = document.createElement('div');

    var lab = document.createElement('span');
    lab.className = 'lab';
    lab.textContent = finished ? 'A finished film, still saved' : 'A saved film is waiting';

    var val = document.createElement('span');
    val.className = 'val';
    val.textContent = finished ? 'You reached the end: ' + name : 'You left in ' + name;

    text.appendChild(lab);
    text.appendChild(val);

    var link = document.createElement('a');
    link.className = 'btn btn-ghost';
    link.href = 'film/';
    link.textContent = 'Return to the film';

    card.appendChild(text);
    card.appendChild(link);
    slot.appendChild(card);
  }

  /* ---------- header edge ---------- */

  var header = document.querySelector('.site-header');
  var framed = false;

  if (header) {
    window.addEventListener('scroll', function () {
      var past = window.scrollY > 12;
      if (past === framed) { return; }
      framed = past;
      header.classList.toggle('is-scrolled', past);
    }, { passive: true });
  }
})();
