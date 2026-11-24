/* =====================================================================
   THE WRONG SCRIPT - The Stories: library page
   ---------------------------------------------------------------------
   Renders the shelf from window.TWS_STORIES (assets/js/stories-index.js).

   Three jobs:
     1. small-screen navigation, same behaviour as the Lobby,
     2. draw one entry per story, with a Begin button, or Continue if a
        readable run is already saved in this browser,
     3. refuse to draw an entry that has no working destination.

   This file never touches the original film's "tws" key. It only reads a
   story's own namespaced key ("wrong-script.story.<slug>.v1"), and only
   to decide whether the button says Begin or Continue.
   ===================================================================== */

(function () {
  'use strict';

  var catalogue = Array.isArray(window.TWS_STORIES) ? window.TWS_STORIES : [];
  var list = document.querySelector('[data-shelf]');
  var count = document.querySelector('[data-shelf-count]');

  /* ---------- navigation (mirrors the Lobby) ---------- */

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

  /* ---------- the shelf ---------- */

  if (list) {
    var live = catalogue.filter(isRenderable);

    live.forEach(function (story) {
      list.appendChild(entry(story));
    });

    if (count) {
      count.textContent = live.length === 1 ? 'One story on the shelf' : live.length + ' stories on the shelf';
    }

    if (!live.length) {
      var empty = document.createElement('p');
      empty.className = 'shelf-note';
      empty.textContent = 'The shelf is empty. Nothing is listed here that cannot be opened.';
      list.appendChild(empty);
    }
  }

  /* A story is only drawn if it has a slug, a title and a real page. */
  function isRenderable(story) {
    return !!story &&
      typeof story.slug === 'string' && /^[a-z0-9-]+$/.test(story.slug) &&
      typeof story.title === 'string' && story.title.length > 0 &&
      story.status === 'live';
  }

  function entry(story) {
    var article = document.createElement('article');
    article.className = 'entry';

    var head = document.createElement('div');
    head.className = 'entry-head';
    head.appendChild(span('entry-no', story.number || 'Story'));
    head.appendChild(span('entry-state', story.statusLabel || 'Open'));
    article.appendChild(head);

    var h3 = document.createElement('h3');
    h3.textContent = story.title;
    article.appendChild(h3);

    if (story.subtitle) {
      var sub = document.createElement('p');
      sub.className = 'entry-sub';
      sub.textContent = story.subtitle;
      article.appendChild(sub);
    }

    if (story.blurb) {
      var blurb = document.createElement('p');
      blurb.className = 'entry-desc';
      blurb.textContent = story.blurb;
      article.appendChild(blurb);
    }

    if (Array.isArray(story.labels) && story.labels.length) {
      var ul = document.createElement('ul');
      ul.className = 'labels';
      story.labels.forEach(function (label) {
        if (typeof label !== 'string' || !label) { return; }
        var li = document.createElement('li');
        li.textContent = label;
        ul.appendChild(li);
      });
      article.appendChild(ul);
    }

    var foot = document.createElement('div');
    foot.className = 'entry-foot';

    var saved = readRun(story);
    var link = document.createElement('a');
    link.className = 'btn btn-primary';
    link.href = encodeURIComponent(story.slug) + '/';
    link.textContent = saved ? 'Continue' : 'Begin';

    if (saved) {
      link.setAttribute('aria-label', 'Continue ' + story.title);
    } else {
      link.setAttribute('aria-label', 'Begin ' + story.title);
    }

    foot.appendChild(link);

    var note = document.createElement('p');
    note.className = 'entry-note';
    note.textContent = saved
      ? 'A run is saved in this browser. Continue picks it up where you stopped.'
      : (story.note || '');
    foot.appendChild(note);

    article.appendChild(foot);
    return article;
  }

  function span(className, text) {
    var el = document.createElement('span');
    el.className = className;
    el.textContent = text;
    return el;
  }

  /* Read only, validate, and never write. An unreadable run simply means
     the button says Begin. */
  function readRun(story) {
    if (!story.saveKey) { return null; }
    try {
      var raw = window.localStorage.getItem(story.saveKey);
      if (!raw) { return null; }
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) { return null; }
      if (data.slug !== story.slug) { return null; }
      if (typeof data.scene !== 'string' || !data.scene) { return null; }
      if (data.ended === true) { return null; }
      return data;
    } catch (err) {
      return null;
    }
  }
})();
