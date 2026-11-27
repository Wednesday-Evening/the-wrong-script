/* =====================================================================
   THE WRONG SCRIPT - The Arcade: interface sound
   ---------------------------------------------------------------------
   A single, quiet click on a deliberate press, and nothing else.

   Deliberate limits:

     1. It starts OFF. The first press of a control makes no sound, so a
        visitor is never surprised by audio.
     2. One shared player, preloaded on demand, throttled to one tick per
        ninety milliseconds, so holding a direction pad or clicking fast
        does not turn into a rattle.
     3. It only fires for controls inside <main>, so the platform
        navigation and the footer stay silent.
     4. It writes nothing. The choice lives in memory for the page only,
        which is why this file introduces no storage key.
   ===================================================================== */

(function () {
  'use strict';

  var script = document.currentScript;
  var source = script ? script.getAttribute('data-click-src') : '';
  var slot = document.querySelector('[data-sound-slot]');

  if (!source || !slot) { return; }

  var enabled = false;
  var lastTick = 0;
  var audio = new Audio(source);
  audio.preload = 'none';
  audio.volume = 0.22;

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-ghost btn-small sound-toggle';
  button.setAttribute('aria-pressed', 'false');
  button.textContent = 'Interface sounds: off';
  slot.appendChild(button);

  function tick(force) {
    if (!enabled) { return; }
    var now = Date.now();
    if (!force && now - lastTick < 90) { return; }
    lastTick = now;
    try {
      audio.currentTime = 0;
      var attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function () {});
      }
    } catch (error) {
      /* a blocked or missing file must never break the game */
    }
  }

  button.addEventListener('click', function () {
    enabled = !enabled;
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    button.textContent = enabled ? 'Interface sounds: on' : 'Interface sounds: off';
    if (enabled) { tick(true); }
  });

  document.addEventListener('click', function (event) {
    if (!enabled) { return; }
    var target = event.target.closest ? event.target.closest('button, a, [data-move], .lp-cell') : null;
    if (!target || target === button) { return; }
    if (!target.closest('main')) { return; }
    tick(false);
  }, true);

  window.addEventListener('pagehide', function () {
    try { audio.pause(); } catch (error) { /* nothing to stop */ }
  });

  /* Hand this channel to the floating media controller so its Effects
     slider reads the real click level (0.22) and can lower or mute it.
     The toggle above stays the room's own switch: the controller never
     turns the clicks on. */
  window.TWSMixerAdapters = (window.TWSMixerAdapters || []).concat([{
    channel: 'effects',
    getVolume: function () { return audio.volume; },
    setVolume: function (value) {
      var next = Number(value);
      if (!isFinite(next)) { return; }
      audio.volume = Math.max(0, Math.min(1, next));
    }
  }]);
})();
