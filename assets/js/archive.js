/* =====================================================================
   THE WRONG SCRIPT - The Archive: renderer
   ---------------------------------------------------------------------
   Reads window.ARCHIVE_CONTENT and builds the page.

   Deliberate limits, because this room is a catalogue:

     - Nothing here touches web storage, cookies, IndexedDB, the network
       or any visitor identity. There is no code path that could ask what
       a particular person has finished, and the page looks identical to
       every visitor.
     - Every node is created with createElement and filled with
       textContent. No innerHTML, so content cannot smuggle in markup.
     - Only native <details>/<summary> disclosures are used for spoilers.
       They start closed because the open attribute is never set, and the
       browser supplies the keyboard behaviour.
     - Deep links are resolved against ids that this file actually
       created. An unknown hash gets a written explanation instead of a
       silent no-op or a blank jump.

   The header navigation toggle is duplicated from the other pages on
   purpose: each room owns its shell, so no page depends on another
   page's script to open its own menu.
   ===================================================================== */

(function () {
  'use strict';

  var data = window.ARCHIVE_CONTENT;

  /* ---------- small helpers ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function link(href, className, text) {
    var a = el('a', className, text);
    a.setAttribute('href', href);
    return a;
  }

  function clear(node) {
    while (node && node.firstChild) { node.removeChild(node.firstChild); }
  }

  function section(id) {
    return document.getElementById(id);
  }

  /* ---------- the completed files ---------- */

  function renderFiles() {
    var host = section('files');
    if (!host || !data || !data.files) { return; }
    clear(host);

    data.files.forEach(function (file) {
      var article = el('article', 'file');
      article.id = 'file-' + file.id;

      var tab = el('p', 'file-tab');
      tab.appendChild(el('span', null, file.room));
      article.appendChild(tab);

      article.appendChild(el('h3', null, file.title));
      article.appendChild(el('p', 'file-shape', file.form + ' \u00b7 ' + file.shape));
      article.appendChild(el('p', 'file-summary', file.summary));

      if (file.facts && file.facts.length) {
        var list = el('ul', 'file-facts');
        file.facts.forEach(function (fact) {
          list.appendChild(el('li', null, fact));
        });
        article.appendChild(list);
      }

      article.appendChild(link(file.href, 'file-link', file.hrefLabel));
      host.appendChild(article);
    });
  }

  /* ---------- the collections ---------- */

  function renderCollections() {
    var host = section('collections-list');
    if (!host || !data || !data.collections) { return; }
    clear(host);

    data.collections.forEach(function (collection) {
      var box = el('article', 'collection');
      box.id = 'collection-' + collection.id;

      var head = el('div', 'collection-head');
      head.appendChild(el('span', 'collection-num', collection.number));
      head.appendChild(el('h3', null, collection.title));
      box.appendChild(head);

      box.appendChild(el('p', 'collection-lede', collection.lede));

      var list = el('ul', 'collection-list');
      collection.entries.forEach(function (entry, index) {
        var item = el('li', 'collection-item');
        item.id = 'collection-' + collection.id + '-' + (index + 1);
        item.appendChild(el('span', 'collection-kind', entry.kind));
        item.appendChild(link(entry.href, null, entry.title));
        item.appendChild(el('p', 'collection-note', entry.note));
        list.appendChild(item);
      });
      box.appendChild(list);

      host.appendChild(box);
    });
  }

  /* ---------- the discoveries ---------- */

  function renderDiscoveries() {
    var host = section('discoveries-list');
    if (!host || !data || !data.discoveries) { return; }
    clear(host);

    data.discoveries.forEach(function (discovery) {
      var item = el('li', 'discovery');
      item.id = 'discovery-' + discovery.id;

      var head = el('div', 'discovery-head');
      head.appendChild(el('h3', null, discovery.title));
      head.appendChild(el('span', 'discovery-room', discovery.room));
      item.appendChild(head);

      item.appendChild(el('p', 'discovery-note', discovery.note));

      if (discovery.href) {
        item.appendChild(link(discovery.href, 'discovery-link', 'Open ' + discovery.room));
      }

      if (discovery.spoiler) {
        var details = el('details');
        var summary = el('summary', null, discovery.spoiler.summary);
        details.appendChild(summary);
        discovery.spoiler.paragraphs.forEach(function (text) {
          details.appendChild(el('p', null, text));
        });
        item.appendChild(details);
      }

      host.appendChild(item);
    });
  }

  /* ---------- the record and the closing note ---------- */

  function renderRecord() {
    var host = section('record-body');
    if (!host || !data || !data.record) { return; }
    clear(host);
    data.record.paragraphs.forEach(function (text) {
      host.appendChild(el('p', null, text));
    });
  }

  function renderClosing() {
    if (!data || !data.closing) { return; }
    var heading = section('closing-title');
    var body = section('closing-text');
    if (heading) { heading.textContent = data.closing.title; }
    if (body) { body.textContent = data.closing.text; }
  }

  /* ---------- deep links ---------- */

  var SECTIONS = ['completed-files', 'collections', 'discoveries', 'record', 'closing'];

  function resolveHash() {
    var note = section('hash-note');
    var raw = (window.location.hash || '').replace(/^#/, '');
    var id;
    try {
      id = decodeURIComponent(raw);
    } catch (error) {
      id = raw;
    }

    if (note) {
      note.hidden = true;
      clear(note);
    }

    /* Phase 6A (F1): the marker belongs to whatever the fragment addresses, so
       any earlier target is unmarked before this one is resolved. An empty or
       unknown fragment therefore highlights nothing, exactly as a reload of the
       same URL would. */
    var marked = document.querySelectorAll('.is-target');
    for (var i = 0; i < marked.length; i += 1) {
      marked[i].classList.remove('is-target');
    }

    if (!id) { return; }

    var target = document.getElementById(id);
    var isSection = SECTIONS.indexOf(id) !== -1;

    if (target && (isSection || target.closest('.file, .collection, .discovery'))) {
      target.classList.add('is-target');
      return;
    }

    /* An unknown fragment is explained rather than ignored. Nothing is
       redirected, so the visitor keeps the page they asked for. */
    if (!note) { return; }
    note.hidden = false;
    note.appendChild(el('strong', null, 'No entry is filed under \u201c' + id + '\u201d. '));
    note.appendChild(document.createTextNode('The Archive has four parts \u2014 Completed Files, Collections, Discoveries and The Record \u2014 and every entry links from one of them. '));
    note.appendChild(link('#completed-files', null, 'Start at Completed Files'));
    note.appendChild(document.createTextNode(' or '));
    note.appendChild(link('../', null, 'return to the Lobby'));
    note.appendChild(document.createTextNode('.'));
  }

  /* ---------- header navigation ---------- */

  function wireNavigation() {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('site-nav');
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
      if (toggle.getAttribute('aria-expanded') !== 'true') { return; }
      setOpen(false);
      toggle.focus();
    });

    nav.addEventListener('click', function (event) {
      if (event.target && event.target.tagName === 'A') { setOpen(false); }
    });
  }

  /* ---------- boot ---------- */

  function boot() {
    renderFiles();
    renderCollections();
    renderDiscoveries();
    renderRecord();
    renderClosing();
    resolveHash();
    wireNavigation();
    window.addEventListener('hashchange', resolveHash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
