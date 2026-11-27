/* =====================================================================
   THE WRONG SCRIPT - shared media controller
   ---------------------------------------------------------------------
   One small file that drives every video and audio element added in
   Phase 10, so the behaviour is identical in each room.

   What it guarantees:

     1. No autoplay. Every element is built with preload="none" and no
        autoplay attribute; nothing moves or sounds until a visitor
        presses a control.
     2. One audio stream at a time. Starting one recording pauses any
        other, so two pieces of music can never play over each other.
     3. Playback stops when the page is left, and when a room asks it to
        stop (the Gallery closes its exhibit panel that way).
     4. A failed file disables its own control and says so, rather than
        leaving a button that does nothing.

   It touches no storage, makes no network request of its own and knows
   nothing about any room's save key.
   ===================================================================== */

(function () {
  'use strict';

  var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-media-video]'));
  var audios = Array.prototype.slice.call(document.querySelectorAll('audio[data-media-audio]'));

  function labelFor(button, playing, offText, onText) {
    return playing ? (button.getAttribute('data-label-on') || onText)
                   : (button.getAttribute('data-label-off') || offText);
  }

  function syncAudio(audio) {
    var block = audio.closest('[data-media-audio-block]');
    var button = block ? block.querySelector('[data-audio-toggle]') : null;
    if (!button || button.disabled) { return; }
    var playing = !audio.paused && !audio.ended;
    button.setAttribute('aria-pressed', playing ? 'true' : 'false');
    button.textContent = labelFor(button, playing, 'Sound: off', 'Sound: on');
  }

  function pauseAudios(except) {
    audios.forEach(function (audio) {
      if (audio === except) { return; }
      if (!audio.paused) { audio.pause(); }
      syncAudio(audio);
    });
  }

  function pauseVideos() {
    videos.forEach(function (video) {
      if (!video.paused) { video.pause(); }
    });
  }

  /* ---------------- videos ---------------- */

  videos.forEach(function (video) {
    var figure = video.closest('[data-media]');
    var button = figure ? figure.querySelector('[data-media-toggle]') : null;
    if (!button) { return; }

    function sync() {
      if (button.disabled) { return; }
      var playing = !video.paused && !video.ended;
      button.setAttribute('aria-pressed', playing ? 'true' : 'false');
      button.textContent = labelFor(button, playing, 'Play the motion', 'Pause the motion');
    }

    button.addEventListener('click', function () {
      if (!video.paused) {
        video.pause();
        return;
      }
      var attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function () { sync(); });
      }
    });

    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('ended', sync);
    video.addEventListener('error', function () {
      button.disabled = true;
      button.textContent = 'Motion unavailable';
    });

    sync();
  });

  /* ---------------- audio ---------------- */

  audios.forEach(function (audio) {
    var block = audio.closest('[data-media-audio-block]');
    var button = block ? block.querySelector('[data-audio-toggle]') : null;
    if (!button) { return; }

    button.addEventListener('click', function () {
      if (!audio.paused) {
        audio.pause();
        return;
      }
      pauseAudios(audio);
      var attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function () { syncAudio(audio); });
      }
    });

    audio.addEventListener('play', function () {
      pauseAudios(audio);
      syncAudio(audio);
    });
    audio.addEventListener('pause', function () { syncAudio(audio); });
    audio.addEventListener('ended', function () { syncAudio(audio); });
    audio.addEventListener('error', function () {
      button.disabled = true;
      button.textContent = 'Audio unavailable';
    });

    syncAudio(audio);
  });

  /* ---------------- leaving, or being told to stop ---------------- */

  window.TWSMedia = {
    pauseAll: function () {
      pauseAudios(null);
      pauseVideos();
    },
    pauseAudio: function () {
      pauseAudios(null);
    }
  };

  window.addEventListener('pagehide', function () {
    pauseAudios(null);
  });
})();
