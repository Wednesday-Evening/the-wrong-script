/* =====================================================================
   THE WRONG SCRIPT - room atmosphere
   ---------------------------------------------------------------------
   Builds one full-viewport, silent video wash behind the page and hands it
   to the floating controller. Nothing else on the page changes.

   What it guarantees:

     1. One layer, one video. The layer is built once per page, and it is
        pointer-events: none, so it can never swallow a click meant for
        navigation, a story choice or a game control.
     2. A poster first. The still is painted before any video is requested,
        so a blocked, slow or absent file still leaves a room with an image.
     3. Nothing is fetched on entry. The source is attached after the page
        has settled, and only when the visitor has not switched video off.
     4. Video is muted, looped and inline. It never plays sound, and it never
        competes with a story cinematic or a game sequence.
     5. Reduced motion means a still room. The video is not started; the
        poster carries the room, and the controller can still start it.
     6. Leaving or hiding the page pauses it.

   Public surface - window.TWSAmbience

     state()             { room, label, video, poster, status }
     setPlaying(bool)    start or stop, and remember the preference
     pauseForOther(el)   let another video have the room
   ===================================================================== */

(function () {
  'use strict';

  /* One entry per room. The video is the shared wash; the room's own
     character comes from the grading and composition set in ambience.css.
     Only three clips exist, so rooms that share a clip are graded and
     composed differently rather than pretending to have unique footage. */
  var ROOMS = {
    'lobby': {
      label: 'Lobby',
      video: 'abstract-motion.mp4',
      poster: 'abstract-motion.jpg'
    },
    'stories': {
      label: 'The Stories',
      video: 'library.mp4',
      poster: 'library.jpg'
    },
    'ninth-bell': {
      label: 'The Ninth Bell',
      video: 'lighthouse.mp4',
      poster: 'lighthouse.jpg'
    },
    'returns-hatch': {
      label: 'The Returns Hatch',
      video: 'library.mp4',
      poster: 'library.jpg'
    },
    'arcade': {
      label: 'The Arcade',
      video: 'abstract-motion.mp4',
      poster: 'abstract-motion.jpg'
    },
    'signal-path': {
      label: 'Signal Path',
      video: 'abstract-motion.mp4',
      poster: 'abstract-motion.jpg'
    },
    'lamplight': {
      label: 'Lamplight',
      video: 'lighthouse.mp4',
      poster: 'lighthouse.jpg'
    },
    'gallery': {
      label: 'The Gallery',
      video: 'abstract-motion.mp4',
      poster: 'abstract-motion.jpg'
    },
    'social-room': {
      label: 'The Social Room',
      video: 'library.mp4',
      poster: 'library.jpg'
    },
    'archive': {
      label: 'The Archive',
      video: 'library.mp4',
      poster: 'library.jpg'
    },
    'creator-studio': {
      label: 'The Creator Studio',
      video: 'abstract-motion.mp4',
      poster: 'abstract-motion.jpg'
    }
  };

  var room = (document.body && document.body.getAttribute('data-room')) || '';
  var config = ROOMS[room] || null;

  var layer = null;
  var video = null;
  var status = 'none';
  var userPaused = false;
  var attached = false;
  var starting = false;

  function base() {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i += 1) {
      var src = scripts[i].getAttribute('src') || '';
      var match = src.match(/^(.*)assets\/js\/ambience\.js$/);
      if (match) { return match[1]; }
    }
    return '';
  }

  function reduced() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function wanted() {
    if (userPaused) { return false; }
    if (window.TWSAudio && window.TWSAudio.videoPref) {
      return window.TWSAudio.videoPref() !== false;
    }
    return true;
  }

  function notify() {
    try {
      window.dispatchEvent(new CustomEvent('tws:ambience', {
        detail: state()
      }));
    } catch (e) { /* older browser: the controller polls */ }
  }

  function state() {
    return {
      room: room,
      label: config ? config.label : '',
      video: config ? config.video : '',
      poster: config ? config.poster : '',
      status: status,
      attached: attached
    };
  }

  function build() {
    if (!config) { return; }
    if (document.querySelector('.ambience')) {
      layer = document.querySelector('.ambience');
      return;
    }

    var prefix = base();

    layer = document.createElement('div');
    layer.className = 'ambience';
    layer.setAttribute('data-room', room);
    layer.setAttribute('aria-hidden', 'true');

    var frame = document.createElement('div');
    frame.className = 'ambience__frame';
    frame.style.backgroundImage = 'url("' + prefix + 'assets/media/video/' + config.poster + '")';

    video = document.createElement('video');
    video.className = 'ambience__video';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'none');
    video.setAttribute('tabindex', '-1');
    video.setAttribute('poster', prefix + 'assets/media/video/' + config.poster);
    video.setAttribute('aria-hidden', 'true');

    var ident = document.createElement('div');
    ident.className = 'ambience__ident';

    var tint = document.createElement('div');
    tint.className = 'ambience__tint';

    var scrim = document.createElement('div');
    scrim.className = 'ambience__scrim';

    layer.appendChild(frame);
    layer.appendChild(video);
    layer.appendChild(ident);
    layer.appendChild(tint);
    layer.appendChild(scrim);
    document.body.insertBefore(layer, document.body.firstChild);

    video.addEventListener('playing', function () {
      status = 'playing';
      video.classList.add('is-live');
      notify();
    });
    video.addEventListener('pause', function () {
      if (status === 'playing') { status = 'paused'; }
      video.classList.remove('is-live');
      notify();
    });
    video.addEventListener('error', function () {
      status = 'unavailable';
      video.classList.remove('is-live');
      notify();
    });
  }

  function attempt(explicit) {
    if (!video || !config) { return; }
    if (!explicit && reduced()) {
      status = 'still';
      notify();
      return;
    }
    if (!explicit && !wanted()) {
      status = 'off';
      notify();
      return;
    }

    if (!attached) {
      var prefix = base();
      video.src = prefix + 'assets/media/video/' + config.video;
      attached = true;
    }

    starting = true;
    var played;
    try {
      played = video.play();
    } catch (e) {
      played = null;
    }

    if (played && typeof played.then === 'function') {
      played.then(function () {
        starting = false;
      }).catch(function () {
        starting = false;
        status = 'blocked';
        video.classList.remove('is-live');
        notify();
      });
    } else if (!played) {
      starting = false;
      status = 'blocked';
      notify();
    }
  }

  function schedule() {
    if (!video) { return; }
    if (!wanted()) {
      status = 'off';
      notify();
      return;
    }
    if (reduced()) {
      status = 'still';
      notify();
      return;
    }

    var start = function () {
      if (document.hidden) {
        status = 'paused';
        notify();
        return;
      }
      attempt(false);
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(start, { timeout: 1500 });
    } else {
      window.setTimeout(start, 900);
    }
  }

  function setPlaying(on) {
    userPaused = !on;
    if (window.TWSAudio && window.TWSAudio.setVideoPref) {
      window.TWSAudio.setVideoPref(!!on);
    }
    if (on) {
      attempt(true);
    } else if (video) {
      try { video.pause(); } catch (e) { /* nothing to pause */ }
      status = 'off';
      video.classList.remove('is-live');
      notify();
    }
  }

  /* Only one decorative background video may run at a time. Story cinematics
     and gallery recordings call this so the wash steps aside. */
  function pauseForOther(keep) {
    var videos = document.querySelectorAll('.ambience__video');
    for (var i = 0; i < videos.length; i += 1) {
      if (videos[i] === keep) { continue; }
      if (!videos[i].paused) {
        try { videos[i].pause(); } catch (e) { /* already stopped */ }
      }
    }
    if (video && keep !== video) {
      status = 'paused';
      video.classList.remove('is-live');
      notify();
    }
  }

  /* A page video that starts on its own - a story cinematic, a gallery
     recording, the lobby reel - takes the room from the wash. Listening in
     the capture phase means every video on the page yields the room without
     each page having to remember to call pauseForOther itself. */
  document.addEventListener('play', function (event) {
    var node = event.target;
    if (!node || node === video) { return; }
    if (node.tagName !== 'VIDEO') { return; }
    pauseForOther(node);
  }, true);

  if (!config) {
    window.TWSAmbience = {
      state: function () {
        return { room: room, label: '', video: '', poster: '', status: 'none', attached: false };
      },
      setPlaying: function () {},
      pauseForOther: pauseForOther,
      rooms: Object.keys(ROOMS)
    };
  } else {
    build();

    window.TWSAmbience = {
      state: state,
      setPlaying: setPlaying,
      pauseForOther: pauseForOther,
      rooms: Object.keys(ROOMS)
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', schedule);
    } else {
      schedule();
    }

    document.addEventListener('visibilitychange', function () {
      if (!video) { return; }
      if (document.hidden) {
        if (!video.paused) {
          try { video.pause(); } catch (e) { /* already stopped */ }
          status = 'paused';
          notify();
        }
      } else if (!userPaused && wanted() && !reduced()) {
        attempt(false);
      }
    });

    window.addEventListener('pagehide', function () {
      if (video && !video.paused) {
        try { video.pause(); } catch (e) { /* already stopped */ }
      }
    });
  }
})();
