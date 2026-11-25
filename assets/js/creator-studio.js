/* =====================================================================
   THE WRONG SCRIPT - The Creator Studio: renderer
   ---------------------------------------------------------------------
   Reads window.CREATOR_STUDIO_CONTENT and fills the page.

   Deliberate limits, because this room describes work rather than
   accepting it:

     - No web storage, cookies, IndexedDB, network or visitor identity.
       There is nothing here to remember, and no code path that could
       start remembering something.
     - Every node is built with createElement and filled with
       textContent. No innerHTML, so the content cannot smuggle markup in.
     - No forms, no inputs, no buttons that are not real. The only
       interactive controls on the page are links and the header menu
       toggle, which is duplicated from the other rooms so this page
       opens its own menu without depending on another page's script.
     - Section jumps are native anchors. No hash router, no history
       entries invented, nothing to restore.

   If a host element or a field is missing, that piece is skipped rather
   than rendered as an empty shell.
   ===================================================================== */

(function () {
  'use strict';

  var data = window.CREATOR_STUDIO_CONTENT;

  /* ---------- small helpers ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) { node.removeChild(node.firstChild); }
  }

  function host(id) {
    return document.getElementById(id);
  }

  function paragraph(text, className) {
    return el('p', className || null, text);
  }

  /* ---------- The Desk ---------- */

  function renderDesk() {
    var box = host('desk-body');
    if (!box || !data || !data.desk) { return; }
    clear(box);

    (data.desk.paragraphs || []).forEach(function (text) {
      box.appendChild(paragraph(text, 'desk-line'));
    });

    if (data.desk.pull) {
      var quote = el('blockquote', 'desk-pull');
      quote.appendChild(paragraph(data.desk.pull));
      box.appendChild(quote);
    }
  }

  /* ---------- The Format ---------- */

  function renderFormats() {
    var intro = host('format-intro');
    if (intro && data && data.formatIntro) { intro.textContent = data.formatIntro; }

    var box = host('formats');
    if (!box || !data || !data.formats) { return; }
    clear(box);

    data.formats.forEach(function (format) {
      var article = el('article', 'format');
      article.id = 'format-' + format.id;

      var head = el('div', 'format-head');
      head.appendChild(el('span', 'format-num', format.number));
      head.appendChild(el('h3', null, format.title));
      article.appendChild(head);

      article.appendChild(paragraph(format.lede, 'format-lede'));

      if (format.expects && format.expects.length) {
        article.appendChild(el('p', 'format-label', 'What the format asks for'));
        var list = el('ul', 'format-expects');
        format.expects.forEach(function (line) {
          list.appendChild(el('li', null, line));
        });
        article.appendChild(list);
      }

      box.appendChild(article);
    });
  }

  /* ---------- The Standard ---------- */

  function renderStandard() {
    var intro = host('standard-intro');
    if (intro && data && data.standardIntro) { intro.textContent = data.standardIntro; }

    var box = host('standard-list');
    if (box && data && data.standard) {
      clear(box);
      data.standard.forEach(function (rule) {
        var item = el('li', 'rule');
        item.id = 'rule-' + rule.id;
        item.appendChild(el('h3', null, rule.title));
        item.appendChild(paragraph(rule.text));
        box.appendChild(item);
      });
    }

    var note = host('standard-footnote');
    if (note && data && data.standardFootnote) { note.textContent = data.standardFootnote; }
  }

  /* ---------- The Review Process ---------- */

  function renderProcess() {
    var intro = host('review-intro');
    if (intro && data && data.reviewIntro) { intro.textContent = data.reviewIntro; }

    var stages = host('process-list');
    if (stages && data && data.stages) {
      clear(stages);
      data.stages.forEach(function (stage) {
        var item = el('li', 'stage');
        item.appendChild(el('span', 'stage-name', stage.name));
        item.appendChild(paragraph(stage.text, 'stage-text'));
        stages.appendChild(item);
      });
    }

    var outcomes = host('process-outcomes');
    if (outcomes && data && data.outcomes) {
      clear(outcomes);
      data.outcomes.forEach(function (outcome) {
        var item = el('li', 'outcome');
        item.appendChild(el('span', 'outcome-name', outcome.name));
        item.appendChild(paragraph(outcome.text, 'outcome-text'));
        outcomes.appendChild(item);
      });
    }

    var notes = host('process-notes');
    if (notes && data && data.processNotes) {
      clear(notes);
      data.processNotes.forEach(function (text) {
        notes.appendChild(el('li', null, text));
      });
    }
  }

  /* ---------- Not Yet ---------- */

  function renderNotYet() {
    var intro = host('not-yet-intro');
    if (intro && data && data.notYetIntro) { intro.textContent = data.notYetIntro; }

    var box = host('not-yet-list');
    if (box && data && data.notYet) {
      clear(box);
      data.notYet.forEach(function (item) {
        var li = el('li', 'absent');
        li.appendChild(el('h3', null, item.title));
        li.appendChild(paragraph(item.text));
        box.appendChild(li);
      });
    }

    var closing = host('not-yet-closing');
    if (closing && data && data.notYetClosing) { closing.textContent = data.notYetClosing; }
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
    renderDesk();
    renderFormats();
    renderStandard();
    renderProcess();
    renderNotYet();
    wireNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
