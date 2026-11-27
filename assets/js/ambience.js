/* =====================================================================
   THE WRONG SCRIPT - room atmosphere
   ---------------------------------------------------------------------
   Builds one full-viewport, silent video wash behind the page and hands
   it to the floating controller. Nothing else on the page changes.

   What it guarantees:

     1. One layer, one video. The layer is built once per page, and it is
        pointer-events: none, so it can never swallow a click meant for
        navigation, a story choice or a game control.
     2. Silent, always. The video element is created muted and is never
        given a volume, so the wash can never make a sound. Sound lives in
        the rooms' own audio elements and in the controller.
     3. A poster underneath. The poster image is painted on the frame
        element, so a slow, blocked or failed video still shows an image
        instead of a black rectangle.
     4. It stops when it should: when the tab is hidden, when the page is
        being left, when the visitor asks it to stop, and when a room's own
        video starts playing (so two decorative videos never run at once).
     5. prefers-reduced-motion is honoured: the wash starts as a still
        poster and only moves if the visitor explicitly asks for it.

   It reads no storage, writes no storage and knows nothing about any
   room's save key. The room comes from a data-room attribute on <body>;
   a page without one (the original film) gets no layer at all.
   ===================================================================== */

(function () {
  'use strict';

  /* Room identities. The video is chosen to suit the room's content, and
     the tint that finishes the atmosphere lives in ambience.css. */
  var ROOMS = {
    'lobby': { label: 'Lobby', video: 'abstract-motion', poster: 'abstract-motion' },
    'stories': { label: 'The Stories', video: 'library', poster: 'library' },
    'ninth-bell': { label: 'The Ninth Bell', video: 'lighthouse', poster: 'lighthouse' },
    'returns-hatch': { label: 'The Returns Hatch', video: 'library', poster: 'library' },
    'arcade': { label: 'The Arcade', video: 'abstract-motion', poster: 'abstract-motion' },
    'signal-path': { label: 'Signal Path', video: 'abstract-motion', poster: 'abstract-motion' },
    'lamplight': { label: 'Lamplight', video: 'lighthouse', poster: 'lighthouse' },
    'gallery': { label: 'The Gallery', video: 'abstract-motion', poster: 'abstract-motion' },
    'social-room': { label: 'The Social Room', video: 'library', poster: 'library' },
    'archive': { label: 'The Archive', video: 'library', poster: 'library' },
    'creator-studio': { label: 'The Creator Studio', video: 'abstract-motion', poster: 'abstract-motion' }
  };

  var body = document.body;
  if (!body) { return; }

  var roomId = body.getAttribute('data-room') || '';
  var room = ROOMS[roomId];

  /* The film, and any page without a known room, keeps exactly the page it
     had: no layer, no controller video switch, no network cost. */
  if (!room) {
    window.TWSAmbience = {
      room: roomId,
      label: '',
      video: null,
      hasVideo: function () { return false; },
      state: function () { return 'none'; },
      isPlaying: function () { return false; },
      setPlaying: function () {},
      pauseForOther: function () {}
    };
    return;
  }

  /* Resolve asset paths from this script's own URL, so a page at any depth
     needs nothing but data-room. */
  var base = 'assets/media/video/';
  var script = document.currentScript;
  if (script && script.src) {
    try {
      base = new URL('../media/video/', script.src).href;
    } catch (error) {
      /* keep the relative default */
    }
  }

  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() {
    return !!(reduceQuery && reduceQuery.matches);
  }

  var userPaused = false;
  var blocked = false;
  var failed = false;
  var lastState = '';

  /* ---------------- the layer ---------------- */

  var layer = document.createElement('div');
  layer.className = 'ambience';
  layer.setAttribute('aria-hidden', 'true');

  var frame = document.createElement('div');
  frame.className = 'ambience__frame';
  frame.style.backgroundImage = 'url("' + base + room.poster + '.jpg")';

  var video = document.createElement('video');
  video.className = 'ambience__video';
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  video.setAttribute('disablepictureinpicture', '');
  video.poster = base + room.poster + '.jpg';

  var source = document.createElement('source');
  source.src = base + room.video + '.mp4';
  source.type = 'video/mp4';
  video.appendChild(source);

  var tint = document.createElement('div');
  tint.className = 'ambience__tint';

  var scrim = document.createElement('div');
  scrim.className = 'ambience__scrim';

  layer.appendChild(frame);
  layer.appendChild(video);
  layer.appendChild(tint);
  layer.appendChild(scrim);
  body.insertBefore(layer, body.firstChild);

  /* ---------------- state ---------------- */

  function computeState() {
    if (failed) { return 'unavailable'; }
    if (blocked) { return 'blocked'; }
    if (userPaused) { return 'paused'; }
    if (reduced()) { return 'still'; }
    if (document.hidden) { return 'paused'; }
    return video.paused ? 'paused' : 'playing';
  }

  function settle() {
    var state = computeState();
    layer.setAttribute('data-state', state);
    video.classList.toggle('is-live', state === 'playing');
    if (state === lastState) { return; }
    lastState = state;
    document.dispatchEvent(new CustomEvent('tws:ambience', {
      detail: { room: roomId, label: room.label, state: state }
    }));
  }

  function attempt(force) {
    if (failed) { settle(); return; }
    if (document.hidden) { settle(); return; }
    if (!force && (userPaused || reduced())) { settle(); return; }

    var play;
    try {
      play = video.play();
    } catch (error) {
      failed = true;
      settle();
      return;
    }

    if (play && typeof play.then === 'function') {
      play.then(function () {
        blocked = false;
        settle();
      }).catch(function () {
        /* Autoplay was refused (a browser policy, a battery saver, an
           embedded view). The poster stays and the controller says so. */
        blocked = true;
        settle();
      });
    } else {
      settle();
    }
  }

  video.addEventListener('playing', function () {
    blocked = false;
    settle();
  });
  video.addEventListener('pause', settle);
  video.addEventListener('error', function () {
    failed = true;
    settle();
  });

  /* ---------------- lifecycle ---------------- */

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (!video.paused) { video.pause(); }
      settle();
      return;
    }
    if (!userPaused && !reduced()) { attempt(false); }
  });

  window.addEventListener('pagehide', function () {
    try { video.pause(); } catch (error) { /* already stopped */ }
  });

  if (reduceQuery) {
    var onPreference = function () {
      if (reduced()) {
        if (!video.paused) { video.pause(); }
        settle();
      } else if (!userPaused) {
        attempt(false);
      }
    };
    if (typeof reduceQuery.addEventListener === 'function') {
      reduceQuery.addEventListener('change', onPreference);
    } else if (typeof reduceQuery.addListener === 'function') {
      reduceQuery.addListener(onPreference);
    }
  }

  /* ---------------- public surface ---------------- */

  window.TWSAmbience = {
    room: roomId,
    label: room.label,
    video: video,
    hasVideo: function () { return !failed; },
    state: computeState,
    isPlaying: function () { return !video.paused; },
    setPlaying: function (on) {
      if (on) {
        userPaused = false;
        blocked = false;
        attempt(true);
      } else {
        userPaused = true;
        if (!video.paused) { video.pause(); }
        settle();
      }
    },
    /* Used when the visitor starts a room's own video: the wash steps
       aside without remembering it as their choice. */
    pauseForOther: function () {
      if (!video.paused) { video.pause(); }
      settle();
    }
  };

  settle();
  attempt(false);
})();
