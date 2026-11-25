/* =====================================================================
   THE WRONG SCRIPT - The Gallery: renderer
   ---------------------------------------------------------------------
   Reads the collection from gallery-exhibits.js and builds the wall, the
   shelf filters and the exhibit panel.

   Three things this file deliberately does not do:

     1. It does not touch localStorage. There is no save key for the
        Gallery: browsing a room does not need one, and the film, story
        and arcade keys belong to their own rooms. A search for the word
        "storage" in this file should come back empty.
     2. It does not build markup from strings. Every node is created and
        filled with textContent, so an exhibit's text can never become
        HTML, a script tag or an event handler.
     3. It does not fetch anything. There is no backend, no upload, no
        publish control and no third-party request anywhere in here.
   ===================================================================== */

(function () {
  'use strict';

  /* -------------------------------------------------------------------
     The mobile menu, wired exactly as the Lobby, the Stories and the
     Arcade pages wire it, so the header behaves the same everywhere.
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
     Data, read defensively. Anything incomplete is skipped rather than
     rendered half-built, which is the same rule the Stories and Arcade
     catalogues follow.
     ------------------------------------------------------------------- */
  var categories = Array.isArray(window.GALLERY_CATEGORIES) ? window.GALLERY_CATEGORIES : [];
  var rawExhibits = Array.isArray(window.GALLERY_EXHIBITS) ? window.GALLERY_EXHIBITS : [];

  var byCategory = {};
  categories.forEach(function (category) {
    if (category && category.id && category.label) { byCategory[category.id] = category; }
  });

  function text(value) {
    return typeof value === 'string' ? value : '';
  }

  var exhibits = [];
  var byId = {};

  rawExhibits.forEach(function (exhibit) {
    if (!exhibit || typeof exhibit !== 'object') { return; }
    var id = text(exhibit.id).trim();
    var title = text(exhibit.title).trim();
    var category = text(exhibit.category).trim();
    if (!id || !title || !byCategory[category]) { return; }
    if (byId[id]) { return; }

    var media = null;
    if (exhibit.media && typeof exhibit.media === 'object' && text(exhibit.media.src).trim()) {
      media = {
        src: text(exhibit.media.src).trim(),
        alt: text(exhibit.media.alt).trim(),
        width: Number(exhibit.media.width) || 0,
        height: Number(exhibit.media.height) || 0
      };
    }

    var entry = {
      id: id,
      title: title,
      category: category,
      categoryLabel: byCategory[category].label,
      kind: text(exhibit.kind) || (media ? 'image' : 'text'),
      medium: text(exhibit.medium),
      collection: text(exhibit.collection),
      blurb: text(exhibit.blurb),
      body: Array.isArray(exhibit.body) ? exhibit.body.filter(function (line) { return typeof line === 'string' && line.length; }) : [],
      credit: text(exhibit.credit),
      note: text(exhibit.note),
      media: media
    };

    exhibits.push(entry);
    byId[entry.id] = entry;
  });

  /* -------------------------------------------------------------------
     Elements
     ------------------------------------------------------------------- */
  var filtersEl = document.querySelector('#filters');
  var collectionEl = document.querySelector('#collection');
  var statusEl = document.querySelector('#status');
  var emptyEl = document.querySelector('#empty');
  var emptyResetEl = document.querySelector('#empty-reset');
  var hashNoteEl = document.querySelector('#hash-note');
  var panelEl = document.querySelector('#exhibit-panel');
  var panelCatEl = document.querySelector('#exhibit-cat');
  var panelTitleEl = document.querySelector('#exhibit-title');
  var panelMetaEl = document.querySelector('#exhibit-meta');
  var panelFigureEl = document.querySelector('#exhibit-figure');
  var panelImgEl = document.querySelector('#exhibit-img');
  var panelCaptionEl = document.querySelector('#exhibit-caption');
  var panelBodyEl = document.querySelector('#exhibit-body');
  var panelCreditEl = document.querySelector('#exhibit-credit');
  var panelNoteEl = document.querySelector('#exhibit-note');
  var panelCloseEl = document.querySelector('#exhibit-close');
  var panelInnerEl = panelEl ? panelEl.querySelector('.panel-inner') : null;

  if (!filtersEl || !collectionEl || !panelEl) { return; }

  var activeCategory = 'all';
  var openId = null;
  var lastFocusedId = null;

  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function scrollTo(el) {
    if (!el || !el.scrollIntoView) { return; }
    var reduced = reduceMotion && reduceMotion.matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  /* -------------------------------------------------------------------
     Filters: one button per shelf, plus "Everything". aria-pressed is
     the only state, so the current shelf is announced correctly.
     ------------------------------------------------------------------- */
  var filterButtons = [];

  function makeFilter(id, label, count) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-btn';
    button.setAttribute('data-category', id);
    button.setAttribute('aria-pressed', 'false');
    button.textContent = count === null ? label : label + ' (' + count + ')';
    button.addEventListener('click', function () {
      setCategory(id);
    });
    filterButtons.push(button);
    filtersEl.appendChild(button);
  }

  makeFilter('all', 'Everything', exhibits.length);
  categories.forEach(function (category) {
    var count = exhibits.filter(function (exhibit) { return exhibit.category === category.id; }).length;
    if (count > 0) { makeFilter(category.id, category.label, count); }
  });

  function setCategory(id) {
    activeCategory = id;
    filterButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-category') === id ? 'true' : 'false');
    });
    if (openId) { closeExhibit(false); }
    renderCollection();
  }

  /* -------------------------------------------------------------------
     The wall
     ------------------------------------------------------------------- */
  function visibleExhibits() {
    if (activeCategory === 'all') { return exhibits; }
    return exhibits.filter(function (exhibit) { return exhibit.category === activeCategory; });
  }

  function buildMedia(exhibit) {
    var wrap = document.createElement('div');
    wrap.className = 'frame-media';

    if (exhibit.media) {
      var img = document.createElement('img');
      img.src = exhibit.media.src;
      img.alt = exhibit.media.alt;
      img.loading = 'lazy';
      img.decoding = 'async';
      if (exhibit.media.width) { img.width = exhibit.media.width; }
      if (exhibit.media.height) { img.height = exhibit.media.height; }
      wrap.appendChild(img);
      return wrap;
    }

    var plate = document.createElement('div');
    plate.className = 'plate';

    var label = document.createElement('span');
    label.className = 'plate-label';
    label.textContent = exhibit.medium || exhibit.categoryLabel;
    plate.appendChild(label);

    var line = document.createElement('p');
    line.className = 'plate-line';
    line.textContent = exhibit.body.length ? exhibit.body[0].split('\n')[0] : exhibit.blurb;
    plate.appendChild(line);

    wrap.appendChild(plate);
    return wrap;
  }

  function buildCard(exhibit) {
    var frame = document.createElement('article');
    frame.className = 'frame';
    frame.id = 'card-' + exhibit.id;
    frame.setAttribute('data-category', exhibit.category);

    var link = document.createElement('a');
    link.className = 'frame-link';
    link.href = '#' + exhibit.id;

    link.appendChild(buildMedia(exhibit));

    var body = document.createElement('div');
    body.className = 'frame-body';

    var cat = document.createElement('p');
    cat.className = 'frame-cat';
    cat.textContent = exhibit.categoryLabel + (exhibit.medium ? ' \u00b7 ' + exhibit.medium : '');
    body.appendChild(cat);

    var title = document.createElement('h3');
    title.className = 'frame-title';
    title.textContent = exhibit.title;
    body.appendChild(title);

    var blurb = document.createElement('p');
    blurb.className = 'frame-blurb';
    blurb.textContent = exhibit.blurb;
    body.appendChild(blurb);

    var open = document.createElement('p');
    open.className = 'frame-open';
    open.textContent = 'Open exhibit';
    body.appendChild(open);

    link.appendChild(body);
    frame.appendChild(link);
    return frame;
  }

  function renderCollection() {
    var visible = visibleExhibits();

    collectionEl.textContent = '';
    visible.forEach(function (exhibit) {
      collectionEl.appendChild(buildCard(exhibit));
    });

    var label = activeCategory === 'all'
      ? 'all shelves'
      : byCategory[activeCategory].label;

    statusEl.textContent = visible.length === 0
      ? 'Nothing on this shelf'
      : 'Showing ' + visible.length + (visible.length === 1 ? ' exhibit' : ' exhibits') + ' in ' + label;

    collectionEl.hidden = visible.length === 0;
    emptyEl.hidden = visible.length !== 0;
  }

  emptyResetEl.addEventListener('click', function () {
    setCategory('all');
  });

  /* -------------------------------------------------------------------
     The exhibit panel. Opening is driven by the URL hash, so an exhibit
     can be linked to and Back works. Closing clears the hash without
     adding a history entry, and puts focus back on the card.
     ------------------------------------------------------------------- */
  function showHashNote(rawId) {
    if (!hashNoteEl) { return; }
    hashNoteEl.textContent = '';
    var message = document.createTextNode('There is no exhibit called "' + rawId + '" in this collection. It may have been renamed or never existed. ');
    hashNoteEl.appendChild(message);
    var back = document.createElement('a');
    back.href = './';
    back.textContent = 'Show the whole Gallery';
    hashNoteEl.appendChild(back);
    hashNoteEl.hidden = false;
  }

  function hideHashNote() {
    if (!hashNoteEl) { return; }
    hashNoteEl.hidden = true;
    hashNoteEl.textContent = '';
  }

  function openExhibit(exhibit, focusHeading) {
    hideHashNote();
    openId = exhibit.id;

    panelCatEl.textContent = exhibit.categoryLabel + (exhibit.collection ? ' \u00b7 ' + exhibit.collection : '');
    panelTitleEl.textContent = exhibit.title;

    var metaParts = [];
    if (exhibit.medium) { metaParts.push(exhibit.medium); }
    if (exhibit.media && exhibit.media.width && exhibit.media.height) {
      metaParts.push(exhibit.media.width + ' \u00d7 ' + exhibit.media.height);
    }
    panelMetaEl.textContent = metaParts.join(' \u00b7 ');

    if (exhibit.media) {
      panelImgEl.src = exhibit.media.src;
      panelImgEl.alt = exhibit.media.alt;
      panelCaptionEl.textContent = exhibit.medium
        ? exhibit.medium + '. ' + exhibit.blurb
        : exhibit.blurb;
      panelFigureEl.hidden = false;
    } else {
      panelImgEl.removeAttribute('src');
      panelImgEl.alt = '';
      panelCaptionEl.textContent = '';
      panelFigureEl.hidden = true;
    }

    panelBodyEl.textContent = '';
    exhibit.body.forEach(function (paragraph) {
      var p = document.createElement('p');
      p.textContent = paragraph;
      if (exhibit.category === 'poetry') { p.className = 'is-verse'; }
      panelBodyEl.appendChild(p);
    });

    panelCreditEl.textContent = exhibit.credit ? 'Made by ' + exhibit.credit : '';
    panelCreditEl.hidden = !exhibit.credit;
    panelNoteEl.textContent = exhibit.note;
    panelNoteEl.hidden = !exhibit.note;

    panelEl.hidden = false;

    if (focusHeading) {
      panelTitleEl.focus({ preventScroll: true });
      scrollTo(panelInnerEl || panelEl);
    }
  }

  function closeExhibit(returnFocus) {
    var wasOpen = openId;
    openId = null;
    panelEl.hidden = true;

    if (wasOpen) {
      lastFocusedId = wasOpen;
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = '';
      }
    }

    if (returnFocus && lastFocusedId) {
      var card = document.querySelector('#card-' + lastFocusedId + ' .frame-link');
      if (card) { card.focus({ preventScroll: true }); }
      lastFocusedId = null;
    }
  }

  panelCloseEl.addEventListener('click', function () {
    closeExhibit(true);
    scrollTo(collectionEl);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') { return; }
    if (panelEl.hidden) { return; }
    closeExhibit(true);
  });

  function readHash() {
    var raw = window.location.hash.replace(/^#/, '');
    if (!raw) { return ''; }
    try { return decodeURIComponent(raw); } catch (error) { return raw; }
  }

  function syncFromHash() {
    var id = readHash();

    if (!id) {
      if (openId) { closeExhibit(false); }
      return;
    }

    if (byId[id]) {
      openExhibit(byId[id], true);
      return;
    }

    // A category name in the hash is a reasonable thing to try, so it is
    // treated as a filter rather than as an error.
    if (byCategory[id]) {
      hideHashNote();
      setCategory(id);
      return;
    }

    if (openId) { closeExhibit(false); }
    showHashNote(id);
  }

  window.addEventListener('hashchange', syncFromHash);

  renderCollection();
  syncFromHash();
})();
