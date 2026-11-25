/* =====================================================================
   THE WRONG SCRIPT - The Social Room: renderer
   ---------------------------------------------------------------------
   Reads the boards from social-room-content.js and builds the page.

   Three things this file deliberately does not do:

     1. It does not touch localStorage. There is no save key for this
        room: a reading room has nothing to remember, and the film, story
        and arcade keys belong to their own rooms.
     2. It does not build markup from strings. Every node is created and
        filled with textContent, so a board entry can never become HTML,
        a script tag or an event handler.
     3. It does not fetch anything, and it offers no control that would
        post, submit, react, vote or upload. The only interactive things
        here are links to real local routes.
   ===================================================================== */

(function () {
  'use strict';

  /* -------------------------------------------------------------------
     The mobile menu, wired exactly as the Lobby, the Stories, the
     Arcade and the Gallery pages wire it, so the header behaves the
     same everywhere.
     ------------------------------------------------------------------- */
  (function shell() {
    var toggle = document.querySelector('#nav-toggle');
    var nav = document.querySelector('#site-nav');
    if (!toggle || !nav) { return; }

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('is-open', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') { return; }
      if (!nav.classList.contains('is-open')) { return; }
      setOpen(false);
      toggle.focus();
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) { setOpen(false); }
    });
  })();

  /* -------------------------------------------------------------------
     Data, read defensively. An entry missing its id or title is skipped
     rather than drawn half-built, which is the same rule the Stories,
     Arcade and Gallery catalogues follow.
     ------------------------------------------------------------------- */
  var source = window.SOCIAL_ROOM && Array.isArray(window.SOCIAL_ROOM.areas)
    ? window.SOCIAL_ROOM.areas
    : [];

  function text(value) {
    return typeof value === 'string' ? value : '';
  }

  function paragraphs(value) {
    return Array.isArray(value)
      ? value.filter(function (line) { return typeof line === 'string' && line.trim().length; })
      : [];
  }

  var areas = [];
  var areaById = {};
  var headingById = {};

  source.forEach(function (area) {
    if (!area || typeof area !== 'object') { return; }
    var id = text(area.id).trim();
    var label = text(area.label).trim();
    if (!id || !label || areaById[id]) { return; }

    var entries = [];
    var seen = {};
    paragraphs([]);
    (Array.isArray(area.entries) ? area.entries : []).forEach(function (entry) {
      if (!entry || typeof entry !== 'object') { return; }
      var entryId = text(entry.id).trim();
      var title = text(entry.title).trim();
      if (!entryId || !title || seen[entryId]) { return; }
      seen[entryId] = true;

      var link = null;
      if (entry.link && typeof entry.link === 'object' && text(entry.link.href).trim()) {
        link = {
          label: text(entry.link.label).trim() || 'Open',
          href: text(entry.link.href).trim()
        };
      }

      entries.push({
        id: entryId,
        kind: text(entry.kind).trim(),
        status: text(entry.status).trim(),
        title: title,
        body: paragraphs(entry.body),
        note: text(entry.note).trim(),
        link: link
      });
    });

    if (entries.length === 0) { return; }

    var record = {
      id: id,
      label: label,
      eyebrow: text(area.eyebrow).trim() || label,
      lede: text(area.lede).trim(),
      footnote: text(area.footnote).trim(),
      entries: entries
    };

    areas.push(record);
    areaById[id] = record;
  });

  /* -------------------------------------------------------------------
     Elements
     ------------------------------------------------------------------- */
  var boardsEl = document.querySelector('#boards');
  var jumpEl = document.querySelector('#jump');
  var hashNoteEl = document.querySelector('#hash-note');

  if (!boardsEl) { return; }

  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function scrollTo(el) {
    if (!el || !el.scrollIntoView) { return; }
    var reduced = reduceMotion && reduceMotion.matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  /* -------------------------------------------------------------------
     The boards
     ------------------------------------------------------------------- */
  function buildEntry(entry, area) {
    var article = document.createElement('article');
    article.className = 'sr-entry';
    article.id = entry.id;

    var top = document.createElement('div');
    top.className = 'sr-entry-top';

    var kind = document.createElement('p');
    kind.className = 'sr-kind';
    kind.textContent = entry.kind || area.label;
    top.appendChild(kind);

    if (entry.status) {
      var status = document.createElement('p');
      status.className = 'sr-status';
      status.setAttribute('data-status', entry.status.toLowerCase().replace(/[^a-z]+/g, '-'));
      status.textContent = entry.status;
      top.appendChild(status);
    }

    article.appendChild(top);

    var title = document.createElement('h3');
    title.className = 'sr-entry-title';
    title.id = entry.id + '-title';
    title.tabIndex = -1;
    title.textContent = entry.title;
    article.appendChild(title);

    entry.body.forEach(function (line) {
      var p = document.createElement('p');
      p.className = 'sr-entry-text';
      p.textContent = line;
      article.appendChild(p);
    });

    if (entry.note) {
      var note = document.createElement('p');
      note.className = 'sr-entry-note';
      note.textContent = entry.note;
      article.appendChild(note);
    }

    if (entry.link) {
      var link = document.createElement('a');
      link.className = 'sr-link';
      link.href = entry.link.href;
      link.textContent = entry.link.label;
      article.appendChild(link);
    }

    headingById[entry.id] = title;
    return article;
  }

  function buildArea(area) {
    var section = document.createElement('section');
    section.className = 'sr-area';
    section.id = area.id;
    section.setAttribute('aria-labelledby', area.id + '-title');

    var head = document.createElement('div');
    head.className = 'area-head';

    var eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = area.eyebrow;
    head.appendChild(eyebrow);

    var title = document.createElement('h2');
    title.className = 'area-title';
    title.id = area.id + '-title';
    title.tabIndex = -1;
    title.textContent = area.label;
    head.appendChild(title);

    var count = document.createElement('p');
    count.className = 'area-count';
    count.textContent = area.entries.length + (area.entries.length === 1 ? ' entry' : ' entries');
    head.appendChild(count);

    section.appendChild(head);

    if (area.lede) {
      var lede = document.createElement('p');
      lede.className = 'area-lede';
      lede.textContent = area.lede;
      section.appendChild(lede);
    }

    var grid = document.createElement('div');
    grid.className = 'sr-grid';
    area.entries.forEach(function (entry) {
      grid.appendChild(buildEntry(entry, area));
    });
    section.appendChild(grid);

    if (area.footnote) {
      var footnote = document.createElement('p');
      footnote.className = 'sr-footnote';
      footnote.textContent = area.footnote;
      section.appendChild(footnote);
    }

    headingById[area.id] = title;
    return section;
  }

  if (areas.length === 0) {
    var problem = document.createElement('p');
    problem.className = 'sr-empty';
    problem.textContent = 'The boards could not be loaded, so there is nothing to show here yet. The rest of the building is unaffected: return to the Lobby to find the other rooms.';
    var problemLink = document.createElement('a');
    problemLink.className = 'sr-link';
    problemLink.href = '../';
    problemLink.textContent = 'Return to the Lobby';
    boardsEl.appendChild(problem);
    boardsEl.appendChild(problemLink);
    return;
  }

  areas.forEach(function (area) {
    boardsEl.appendChild(buildArea(area));
  });

  /* -------------------------------------------------------------------
     The jump list. Real anchors, one per board, with aria-current
     marking the board the reader is looking at.
     ------------------------------------------------------------------- */
  var jumpLinks = [];

  function setCurrent(id) {
    jumpLinks.forEach(function (link) {
      if (link.getAttribute('data-area') === id) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  if (jumpEl) {
    areas.forEach(function (area) {
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = '#' + area.id;
      link.textContent = area.label;
      link.setAttribute('data-area', area.id);
      link.addEventListener('click', function () { setCurrent(area.id); });
      item.appendChild(link);
      jumpEl.appendChild(item);
      jumpLinks.push(link);
    });

    setCurrent(areas[0].id);

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (records) {
        records.forEach(function (record) {
          if (record.isIntersecting) { setCurrent(record.target.id); }
        });
      }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

      areas.forEach(function (area) {
        var section = document.getElementById(area.id);
        if (section) { observer.observe(section); }
      });
    }
  }

  /* -------------------------------------------------------------------
     Deep links. A board or an entry can be linked to by id. An id that
     does not exist is explained rather than silently ignored, and the
     reader is given a way back into the room.
     ------------------------------------------------------------------- */
  function showHashNote(rawId) {
    if (!hashNoteEl) { return; }
    hashNoteEl.textContent = '';

    hashNoteEl.appendChild(document.createTextNode(
      'There is no board or entry called "' + rawId + '" in this room. It may have been renamed or never existed. '
    ));

    var back = document.createElement('a');
    back.href = '#' + areas[0].id;
    back.textContent = 'Start at ' + areas[0].label;
    hashNoteEl.appendChild(back);

    hashNoteEl.hidden = false;
  }

  function hideHashNote() {
    if (!hashNoteEl) { return; }
    hashNoteEl.hidden = true;
    hashNoteEl.textContent = '';
  }

  function focusTarget(id) {
    var target = document.getElementById(id);
    var heading = headingById[id] || target;
    if (target) { scrollTo(target); }
    if (heading && heading.focus) { heading.focus({ preventScroll: true }); }

    if (areaById[id]) { setCurrent(id); return; }
    areas.some(function (area) {
      var owns = area.entries.some(function (entry) { return entry.id === id; });
      if (owns) { setCurrent(area.id); }
      return owns;
    });
  }

  function readHash() {
    var raw = window.location.hash.replace(/^#/, '');
    if (!raw) { return ''; }
    try { return decodeURIComponent(raw); } catch (error) { return raw; }
  }

  function syncFromHash() {
    var id = readHash();

    if (!id) { hideHashNote(); return; }

    if (areaById[id] || headingById[id]) {
      hideHashNote();
      focusTarget(id);
      return;
    }

    showHashNote(id);
  }

  window.addEventListener('hashchange', syncFromHash);

  syncFromHash();
})();
