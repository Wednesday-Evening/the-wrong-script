/* =====================================================================
   THE WRONG SCRIPT - room audio
   ---------------------------------------------------------------------
   Original sound design, generated in the browser with Web Audio.

   Why generated: the three audio files supplied in Phase 10 have no
   established source, creator or licence. They are preserved on disk but
   are not played publicly. Instead every room gets an original atmosphere
   built from filtered noise and, in the Gallery, a sparse generated cue.
   Nothing here imitates an existing recording.

   The single stored key is the media-preference key
   "wrong-script.audio-settings.v1". This module never touches a story or
   game save.

   Public surface - window.TWSAudio

     state()              current room, channels, levels, choice
     present()            which channels this room actually has
     getLevel(id)         0..100 for 'music' | 'effects' | 'ambience'
     setLevel(id, pct)    independent channel volume
     setMaster(bool)      master switch; overrides every channel
     choose('sound'|'silent')
     unlock()             resume the context after a user gesture
     cue(name)            short interface cue, effects channel only
     videoPref()          stored background-video preference
     setVideoPref(bool)
     stop()               clean up when the page is left
   ===================================================================== */

(function () {
  'use strict';

  var KEY = 'wrong-script.audio-settings.v1';
  var VERSION = 1;
  var CHANNELS = ['music', 'effects', 'ambience'];

  var DEFAULTS = {
    v: VERSION,
    choice: '',
    master: true,
    music: 70,
    effects: 80,
    ambience: 60,
    video: true
  };

  /* One generated sound design per room. 'tint' is the noise colour, 'cut'
     the low-pass corner, 'gain' the bed level, 'rate'/'depth' the slow
     swell. 'music' and 'effects' mark the rooms that carry those channels. */
  var ROOM = {
    'lobby': { ambience: { tint: 'white', cut: 820, gain: 0.030, rate: 0.05, depth: 0.010 } },
    'stories': { ambience: { tint: 'pink', cut: 460, gain: 0.036, rate: 0.035, depth: 0.010 } },
    'ninth-bell': { ambience: { tint: 'brown', cut: 900, gain: 0.070, rate: 0.09, depth: 0.028 } },
    'returns-hatch': { ambience: { tint: 'brown', cut: 320, gain: 0.045, rate: 0.03, depth: 0.012 } },
    'arcade': { ambience: { tint: 'pink', cut: 260, gain: 0.030, rate: 0.06, depth: 0.010 }, effects: true },
    'signal-path': { ambience: { tint: 'white', cut: 1400, gain: 0.018, rate: 0.22, depth: 0.012 }, effects: true },
    'lamplight': { ambience: { tint: 'brown', cut: 520, gain: 0.036, rate: 0.05, depth: 0.013 }, effects: true },
    'gallery': { ambience: { tint: 'pink', cut: 700, gain: 0.026, rate: 0.03, depth: 0.008 }, music: true },
    'social-room': { ambience: { tint: 'pink', cut: 520, gain: 0.030, rate: 0.07, depth: 0.010 } },
    'archive': { ambience: { tint: 'pink', cut: 980, gain: 0.024, rate: 0.02, depth: 0.006 } },
    'creator-studio': { ambience: { tint: 'pink', cut: 640, gain: 0.028, rate: 0.04, depth: 0.009 } }
  };

  var room = (document.body && document.body.getAttribute('data-room')) || '';
  var design = ROOM[room] || null;

  var settings = clone(DEFAULTS);
  var firstRun = true;
  var storedRaw = null;
  var storedValid = false;

  var ctx = null;
  var masterGain = null;
  var channelGain = {};
  var bed = null;
  var musicTimer = null;
  var unlocked = false;
  var armed = false;
  var cueAt = 0;
  var failure = '';

  function clone(source) {
    var out = {};
    Object.keys(source).forEach(function (k) { out[k] = source[k]; });
    return out;
  }

  function clamp(n) {
    if (typeof n !== 'number' || !isFinite(n)) { return null; }
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  /* ------------------------------------------------------------------
     Preferences. A malformed value is never deleted: it is preserved and
     the module falls back to safe defaults, so a later fix can recover it.
     ------------------------------------------------------------------ */

  function readPrefs() {
    try {
      storedRaw = window.localStorage.getItem(KEY);
    } catch (e) {
      storedRaw = null;
    }

    if (typeof storedRaw !== 'string' || !storedRaw) {
      firstRun = true;
      return;
    }

    var data;
    try {
      data = JSON.parse(storedRaw);
    } catch (e) {
      firstRun = true;
      return;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      firstRun = true;
      return;
    }

    var found = false;
    var next = clone(DEFAULTS);

    if (data.choice === 'sound' || data.choice === 'silent') {
      next.choice = data.choice;
      found = true;
    }
    if (typeof data.master === 'boolean') {
      next.master = data.master;
      found = true;
    }
    CHANNELS.forEach(function (id) {
      var value = clamp(data[id]);
      if (value !== null) {
        next[id] = value;
        found = true;
      }
    });
    if (typeof data.video === 'boolean') {
      next.video = data.video;
      found = true;
    }

    if (!found) {
      firstRun = true;
      return;
    }

    settings = next;
    storedValid = true;
    firstRun = next.choice === '';
  }

  function writePrefs() {
    settings.v = VERSION;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings));
    } catch (e) {
      /* A blocked or full store must not break the room. */
    }
  }

  /* ------------------------------------------------------------------
     Audio graph
     ------------------------------------------------------------------ */

  function ensure() {
    if (ctx) { return ctx; }
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) { failure = 'unsupported'; return null; }
    try {
      ctx = new Ctor();
    } catch (e) {
      ctx = null;
      failure = 'unavailable';
      return null;
    }

    masterGain = ctx.createGain();
    masterGain.gain.value = settings.master ? 1 : 0;
    masterGain.connect(ctx.destination);

    CHANNELS.forEach(function (id) {
      var gain = ctx.createGain();
      gain.gain.value = settings[id] / 100;
      gain.connect(masterGain);
      channelGain[id] = gain;
    });

    return ctx;
  }

  function noiseBuffer(tint) {
    var rate = ctx.sampleRate;
    var length = Math.floor(rate * 2);
    var buffer = ctx.createBuffer(1, length, rate);
    var data = buffer.getChannelData(0);
    var brown = 0;
    var b0 = 0, b1 = 0, b2 = 0;

    for (var i = 0; i < length; i += 1) {
      var white = Math.random() * 2 - 1;
      if (tint === 'brown') {
        brown = (brown + 0.02 * white) / 1.02;
        data[i] = brown * 3.2;
      } else if (tint === 'pink') {
        /* Three-pole approximation, quiet and stable at these levels. */
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.16;
      } else {
        data[i] = white * 0.4;
      }
    }
    return buffer;
  }

  function startBed() {
    if (!ctx || !design || !design.ambience || bed) { return; }
    var spec = design.ambience;

    var source = ctx.createBufferSource();
    source.buffer = noiseBuffer(spec.tint);
    source.loop = true;

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = spec.cut;
    filter.Q.value = 0.5;

    var gain = ctx.createGain();
    gain.gain.value = 0.0001;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(channelGain.ambience);

    var lfo = ctx.createOscillator();
    lfo.frequency.value = spec.rate;
    var lfoGain = ctx.createGain();
    lfoGain.gain.value = spec.depth;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    var now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(spec.gain, now + 1.4);
    source.start(now);
    lfo.start(now);

    bed = { source: source, lfo: lfo, gain: gain };
  }

  function stopBed() {
    if (!bed) { return; }
    try {
      bed.gain.gain.cancelScheduledValues(ctx.currentTime);
      bed.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
      bed.source.stop(ctx.currentTime + 0.5);
      bed.lfo.stop(ctx.currentTime + 0.5);
    } catch (e) { /* already stopped */ }
    bed = null;
  }

  var SCALE = [0, 3, 7, 10, 12, 15, 19];

  function musicNote() {
    if (!ctx || !design || !design.music) { return; }
    var now = ctx.currentTime + 0.05;
    var step = SCALE[Math.floor(Math.random() * SCALE.length)];
    var freq = 196 * Math.pow(2, step / 12);

    var voice = ctx.createOscillator();
    voice.type = 'sine';
    voice.frequency.value = freq;

    var shade = ctx.createOscillator();
    shade.type = 'triangle';
    shade.frequency.value = freq * 2;

    var voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(0.10, now + 1.1);
    voiceGain.gain.linearRampToValueAtTime(0.0001, now + 6.2);

    var shadeGain = ctx.createGain();
    shadeGain.gain.value = 0.16;

    voice.connect(voiceGain);
    shade.connect(shadeGain);
    shadeGain.connect(voiceGain);
    voiceGain.connect(channelGain.music);

    voice.start(now);
    shade.start(now);
    voice.stop(now + 6.4);
    shade.stop(now + 6.4);
  }

  function startMusic() {
    if (!ctx || !design || !design.music || musicTimer) { return; }
    musicNote();
    musicTimer = window.setInterval(musicNote, 6400);
  }

  function stopMusic() {
    if (musicTimer) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  /* ------------------------------------------------------------------
     State, announcement and public API
     ------------------------------------------------------------------ */

  function present() {
    return {
      music: !!(design && design.music),
      effects: !!(design && design.effects),
      ambience: !!(design && design.ambience)
    };
  }

  function state() {
    var channels = present();
    return {
      room: room,
      known: !!design,
      supported: !failure,
      ready: !!ctx,
      unlocked: unlocked,
      suspended: !!ctx && ctx.state !== 'running',
      master: settings.master,
      choice: settings.choice,
      firstRun: firstRun,
      video: settings.video,
      levels: {
        music: settings.music,
        effects: settings.effects,
        ambience: settings.ambience
      },
      present: channels,
      storedValid: storedValid
    };
  }

  function announce() {
    try {
      window.dispatchEvent(new CustomEvent('tws:audio', { detail: state() }));
    } catch (e) { /* no CustomEvent: the controller also polls */ }
  }

  function applyMaster() {
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(settings.master ? 1 : 0, ctx.currentTime, 0.05);
    }
  }

  function setLevel(id, pct) {
    var value = clamp(pct);
    if (CHANNELS.indexOf(id) === -1 || value === null) { return; }
    settings[id] = value;
    if (ctx && channelGain[id]) {
      channelGain[id].gain.setTargetAtTime(value / 100, ctx.currentTime, 0.04);
    }
    writePrefs();
    announce();
  }

  function setMaster(on) {
    settings.master = !!on;
    applyMaster();
    if (settings.master && settings.choice === 'sound') {
      unlock();
    }
    writePrefs();
    announce();
  }

  function setVideoPref(on) {
    settings.video = !!on;
    writePrefs();
    announce();
  }

  function unlock() {
    var c = ensure();
    if (!c) {
      announce();
      return Promise.resolve(false);
    }
    var resumed;
    try {
      resumed = c.state === 'running' ? Promise.resolve() : c.resume();
    } catch (e) {
      resumed = Promise.resolve();
    }
    return Promise.resolve(resumed).then(function () {
      unlocked = c.state === 'running';
      if (unlocked) {
        startBed();
        startMusic();
      }
      announce();
      return unlocked;
    }).catch(function () {
      unlocked = false;
      announce();
      return false;
    });
  }

  function armGesture() {
    if (armed) { return; }
    armed = true;
    var fire = function () {
      window.removeEventListener('pointerdown', fire, true);
      window.removeEventListener('keydown', fire, true);
      window.removeEventListener('touchstart', fire, true);
      if (settings.choice === 'sound' && settings.master) { unlock(); }
    };
    window.addEventListener('pointerdown', fire, true);
    window.addEventListener('keydown', fire, true);
    window.addEventListener('touchstart', fire, true);
  }

  function choose(option) {
    if (option !== 'sound' && option !== 'silent') { return; }
    settings.choice = option;
    settings.master = option === 'sound';
    firstRun = false;
    applyMaster();
    writePrefs();
    if (option === 'sound') {
      unlock();
    } else {
      stopMusic();
      stopBed();
      if (ctx) { try { ctx.suspend(); } catch (e) { /* already suspended */ } }
    }
    announce();
  }

  function cue(name) {
    if (name !== 'clique' && name !== 'step') { return; }
    if (!ctx || !unlocked || !settings.master) { return; }
    if (!design || !design.effects) { return; }
    if (channelGain.effects && channelGain.effects.gain.value <= 0.001) { return; }

    var now = Date.now();
    if (now - cueAt < 90) { return; }
    cueAt = now;

    var t = ctx.currentTime;
    var start = name === 'step' ? 520 : 880;
    var end = name === 'step' ? 300 : 240;

    var osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(start, t);
    osc.frequency.exponentialRampToValueAtTime(end, t + 0.07);

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.11, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.connect(gain);
    gain.connect(channelGain.effects);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  function stop() {
    stopMusic();
    stopBed();
    if (ctx && ctx.state === 'running') {
      try { ctx.suspend(); } catch (e) { /* nothing to suspend */ }
    }
  }

  function videoPref() {
    return settings.video !== false;
  }

  readPrefs();

  window.TWSAudio = {
    key: KEY,
    rooms: Object.keys(ROOM),
    state: state,
    present: present,
    getLevel: function (id) {
      return CHANNELS.indexOf(id) === -1 ? null : settings[id];
    },
    setLevel: setLevel,
    setMaster: setMaster,
    choose: choose,
    unlock: unlock,
    cue: cue,
    videoPref: videoPref,
    setVideoPref: setVideoPref,
    stop: stop,
    stored: function () {
      return { raw: storedRaw, valid: storedValid };
    }
  };

  /* A returning visitor who already chose sound still needs a gesture before
     the browser will run audio, so arm one without starting anything yet. */
  if (settings.choice === 'sound' && settings.master) {
    armGesture();
  }

  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', function () {
    if (!ctx) { return; }
    if (document.hidden) {
      stopMusic();
      stopBed();
      try { ctx.suspend(); } catch (e) { /* nothing to suspend */ }
      unlocked = false;
      announce();
    } else if (settings.choice === 'sound' && settings.master) {
      unlock();
    }
  });

  announce();
})();
