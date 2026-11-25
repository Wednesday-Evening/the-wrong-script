/* =====================================================================
   THE WRONG SCRIPT - The Arcade: the library page renderer
   ---------------------------------------------------------------------
   Draws the cabinet from window.ARCADE_GAMES and nothing else.

   Deliberately boring: it validates each entry before drawing it, so a
   half-finished game cannot appear as a playable card, and it states how
   many games are actually in the room. There are no placeholder cards,
   no scores, no player counts and no "coming soon" slots pretending to
   be games.
   ===================================================================== */

(function () {
  'use strict';

  var shelf = document.querySelector('[data-cabinet]');
  var countEl = document.querySelector('[data-cabinet-count]');
  var games = Array.isArray(window.ARCADE_GAMES) ? window.ARCADE_GAMES : [];

  function isRenderable(game) {
    return Boolean(
      game &&
      typeof game.id === 'string' && game.id &&
      typeof game.title === 'string' && game.title &&
      typeof game.path === 'string' && game.path &&
      typeof game.blurb === 'string' && game.blurb
    );
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function buildCard(game) {
    var article = el('article', 'machine');
    article.setAttribute('aria-labelledby', 'game-' + game.id);

    var top = el('div', 'machine-top');
    top.appendChild(el('span', 'lamp', 'Ready to play'));
    if (game.kicker) { top.appendChild(el('span', null, game.kicker)); }
    article.appendChild(top);

    var body = el('div', 'machine-body');

    var text = el('div', 'machine-copy');
    if (game.kicker) { text.appendChild(el('p', 'kicker', game.kicker)); }
    var title = el('h3', null, game.title);
    title.id = 'game-' + game.id;
    text.appendChild(title);
    text.appendChild(el('p', 'blurb', game.blurb));

    var actions = el('div', 'machine-actions');
    var play = el('a', 'btn btn-primary', 'Play ' + game.title);
    play.href = game.path;
    actions.appendChild(play);
    text.appendChild(actions);

    body.appendChild(text);

    if (Array.isArray(game.facts) && game.facts.length) {
      var facts = el('dl', 'machine-facts');
      game.facts.forEach(function (fact) {
        if (!fact || !fact.label || !fact.value) { return; }
        var row = el('div');
        row.appendChild(el('dt', null, fact.label));
        row.appendChild(el('dd', null, fact.value));
        facts.appendChild(row);
      });
      body.appendChild(facts);
    }

    article.appendChild(body);

    if (game.note) {
      article.appendChild(el('p', 'cabinet-note', game.note));
    }

    return article;
  }

  var playable = games.filter(isRenderable);

  if (shelf) {
    shelf.textContent = '';
    if (!playable.length) {
      shelf.appendChild(el('p', 'cabinet-note',
        'Nothing is plugged in yet. The cabinet is empty until a game is finished.'));
    } else {
      playable.forEach(function (game) {
        shelf.appendChild(buildCard(game));
      });
    }
  }

  if (countEl) {
    countEl.textContent = playable.length === 1
      ? 'One game in the cabinet'
      : playable.length + ' games in the cabinet';
  }
})();
