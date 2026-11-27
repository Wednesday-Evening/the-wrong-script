/* =====================================================================
   THE WRONG SCRIPT - the floating media controller
   ---------------------------------------------------------------------
   One pill, every room. Collapsed it reads the room and whether its
   atmosphere is moving; expanded it holds master audio, the three audio
   levels and the background video.

   What it guarantees:

     1. It never invents a control. A channel the room does not have is
        shown as absent and disabled, never as a switch that does nothing.
     2. Levels are read from the room's own elements on load, so opening
        the pill does not change how loud anything is. Only a deliberate
        drag or toggle changes a level.
     3. Master audio is a mute, not a play button: switching it off
        silences everything, and switching it back on restores levels
        without starting a single sound on its own.
     4. Background video is independent of the audio controls.
     5. Keyboard: the pill is a disclosure. Enter or Space opens it, Tab
        moves through the controls, Escape closes it and returns focus.
     6. Nothing is stored. The levels last for the page and no longer, so
        this file introduces no storage key and touches none.
   ===================================================================== */

(function () {
  'use strict';

  var CHANNELS = [
    { id: 'music', label: 'Music' },
    { id: 'effects', label: 'Effects' },
    { id: 'ambience', label: 'Ambience' }
  ];

  var ambience = window.TWSAmbience || null;
  var roomLabel = (ambience && ambience.label) || document.title || 'This room';

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text) { node.textContent = text; }
    return node;
  }

  function audiosFor(channel) {
    return Array.prototype.slice.call(
      document.querySelectorAll('audio[data-audio-channel="' + channel + '"]')
    );
  }

  function adaptersFor(channel) {
    var list = window.TWSMixerAdapters || [];
    return list.filter(function (item) { return item && item.channel === channel; });
  }

  function hasChannel(channel) {
    return audiosFor(channel).length > 0 || adaptersFor(channel).length > 0;
  }

  /* ---------------- levels, read before anything is written ---------------- */

  var levels = { music: 70, effects: 80, ambience: 60 };
  var present = { music: false, effects: false, ambience: false };

  CHANNELS.forEach(function (channel) {
    var audio = audiosFor(channel.id)[0];
    var adapter = adaptersFor(channel.id)[0];
    present[channel.id] = hasChannel(channel.id);

    var current = null;
    if (audio && typeof audio.volume === 'number') {
      current = audio.volume;
    } else if (adapter && typeof adapter.getVolume === 'function') {
      try { current = adapter.getVolume(); } catch (error) { current = null; }
    }
    if (typeof current === 'number' && isFinite(current)) {
      levels[channel.id] = Math.max(0, Math.min(100, Math.round(current * 100)));
    }
  });

  var master = true;

  function setLevel(channel, value) {
    var volume = master ? Math.max(0, Math.min(1, value / 100)) : 0;
    audiosFor(channel).forEach(function (audio) {
      try { audio.volume = volume; } catch (error) { /* detached element */ }
    });
    adaptersFor(channel).forEach(function (adapter) {
      if (typeof adapter.setVolume === 'function') {
        try { adapter.setVolume(volume); } catch (error) { /* adapter gone */ }
      }
    });
  }

  /* ---------------- the pill ---------------- */

  var root = make('div', 'mixer');

  var toggle = make('button', 'mixer__compact');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'mixer-panel');

  var pulse = make('span', 'mixer__pulse');
  pulse.setAttribute('aria-hidden', 'true');

  var text = make('span', 'mixer__text');
  var roomNode = make('span', 'mixer__room', roomLabel);
  var statusNode = make('span', 'mixer__status', 'Room atmosphere');
  text.appendChild(roomNode);
  text.appendChild(statusNode);

  var wave = make('span', 'mixer__wave');
  wave.setAttribute('aria-hidden', 'true');
  for (var i = 0; i < 3; i += 1) { wave.appendChild(make('i')); }

  var chev = make('span', 'mixer__chev');
  chev.setAttribute('aria-hidden', 'true');

  toggle.appendChild(pulse);
  toggle.appendChild(text);
  toggle.appendChild(wave);
  toggle.appendChild(chev);

  var panel = make('div', 'mixer__panel');
  panel.id = 'mixer-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Sound and video');

  var head = make('div', 'mixer__head');
  var title = make('p', 'mixer__title', 'Sound & video');
  var close = make('button', 'mixer__close', '\u00d7');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close sound and video');
  head.appendChild(title);
  head.appendChild(close);
  panel.appendChild(head);

  /* master audio */

  var masterRow = make('div', 'mixer__row');
  var masterName = make('span', 'mixer__name', 'Master audio');
  var masterSwitch = make('button', 'mixer__switch');
  masterSwitch.type = 'button';
  masterSwitch.setAttribute('role', 'switch');
  masterSwitch.setAttribute('aria-checked', 'true');
  masterSwitch.setAttribute('aria-label', 'Master audio');
  masterRow.appendChild(masterName);
  masterRow.appendChild(masterSwitch);
  panel.appendChild(masterRow);

  /* one row per audio channel */

  var controls = {};

  CHANNELS.forEach(function (channel) {
    var row = make('div', 'mixer__row mixer__row--slider');
    var rowHead = make('div', 'mixer__rowhead');
    var name = make('span', 'mixer__name', channel.label);
    var value = make('output', 'mixer__val');
    rowHead.appendChild(name);
    rowHead.appendChild(value);

    var range = make('input', 'mixer__range');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.step = '1';
    range.value = String(levels[channel.id]);
    range.setAttribute('aria-label', channel.label + ' volume');
    range.setAttribute('aria-valuetext', levels[channel.id] + ' per cent');

    if (!present[channel.id]) {
      row.className += ' is-absent';
      range.disabled = true;
      value.textContent = '\u2014';
      range.setAttribute('aria-valuetext', channel.label + ' is not present in this room');
    } else {
      value.textContent = levels[channel.id] + '%';
    }

    range.addEventListener('input', function () {
      var next = parseInt(range.value, 10);
      if (!isFinite(next)) { next = 0; }
      levels[channel.id] = next;
      value.textContent = next + '%';
      range.setAttribute('aria-valuetext', next + ' per cent');
      setLevel(channel.id, next);
      update();
    });

    row.appendChild(rowHead);
    row.appendChild(range);
    panel.appendChild(row);

    controls[channel.id] = { row: row, range: range, value: value };
  });

  /* background video */

  var videoRow = make('div', 'mixer__row');
  var videoName = make('span', 'mixer__name', 'Background video');
  var videoSwitch = make('button', 'mixer__switch');
  videoSwitch.type = 'button';
  videoSwitch.setAttribute('role', 'switch');
  videoSwitch.setAttribute('aria-checked', 'false');
  videoSwitch.setAttribute('aria-label', 'Background video');
  videoRow.appendChild(videoName);
  videoRow.appendChild(videoSwitch);
  panel.appendChild(videoRow);

  var note = make('p', 'mixer__note',
    'The background is always silent. Sound stays off until you switch it on, and these levels last for this page only.');
  panel.appendChild(note);

  root.appendChild(toggle);
  root.appendChild(panel);
  document.body.appendChild(root);

  /* ---------------- wiring ---------------- */

  function anyAudioPresent() {
    return present.music || present.effects || present.ambience;
  }

  function statusText() {
    var state = ambience ? ambience.state() : 'none';
    var text;
    if (state === 'playing') { text = 'Atmosphere \u00b7 playing'; }
    else if (state === 'blocked') { text = 'Atmosphere \u00b7 tap to start'; }
    else if (state === 'still') { text = 'Atmosphere \u00b7 still'; }
    else if (state === 'unavailable') { text = 'Atmosphere \u00b7 poster only'; }
    else if (state === 'none') { text = 'No background here'; }
    else { text = 'Atmosphere \u00b7 paused'; }

    if (anyAudioPresent() && !master) { text += ' \u00b7 audio off'; }
    return text;
  }

  function update() {
    var state = ambience ? ambience.state() : 'none';
    var playing = !!(ambience && ambience.isPlaying());

    statusNode.textContent = statusText();
    root.classList.toggle('is-playing', playing);
    toggle.setAttribute('aria-label', roomLabel + '. ' + statusText() + '. Open sound and video controls.');

    masterSwitch.setAttribute('aria-checked', master ? 'true' : 'false');
    masterSwitch.setAttribute('aria-label', 'Master audio, ' + (master ? 'on' : 'off'));

    videoSwitch.setAttribute('aria-checked', playing ? 'true' : 'false');
    videoSwitch.setAttribute('aria-label', 'Background video, ' + (playing ? 'on' : 'off'));
    videoSwitch.disabled = state === 'unavailable' || state === 'none';

    CHANNELS.forEach(function (channel) {
      var control = controls[channel.id];
      if (!control) { return; }
      control.range.disabled = !present[channel.id];
    });

    if (state === 'blocked') {
      note.textContent = 'The browser has not started the background yet. The poster is showing instead.';
    } else if (!anyAudioPresent()) {
      note.textContent = 'This room has no audio of its own. The background is silent.';
    } else {
      note.textContent = 'The background is always silent. Sound stays off until you switch it on, and these levels last for this page only.';
    }
  }

  function openPanel() {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    var first = panel.querySelector('button:not([disabled]), input:not([disabled])');
    if (first) { first.focus(); }
  }

  function closePanel(returnFocus) {
    if (panel.hidden) { return; }
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) { toggle.focus(); }
  }

  toggle.addEventListener('click', function () {
    if (panel.hidden) { openPanel(); } else { closePanel(false); }
  });

  close.addEventListener('click', function () { closePanel(true); });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !panel.hidden) {
      event.stopPropagation();
      closePanel(true);
    }
  });

  document.addEventListener('click', function (event) {
    if (panel.hidden) { return; }
    if (!root.contains(event.target)) { closePanel(false); }
  });

  masterSwitch.addEventListener('click', function () {
    master = !master;
    CHANNELS.forEach(function (channel) {
      if (present[channel.id]) { setLevel(channel.id, levels[channel.id]); }
    });
    update();
  });

  videoSwitch.addEventListener('click', function () {
    if (!ambience) { return; }
    ambience.setPlaying(!ambience.isPlaying());
    update();
  });

  /* Keep the readout honest when the room changes its own media. */
  document.addEventListener('tws:ambience', update);

  ['play', 'pause', 'volumechange', 'ended'].forEach(function (name) {
    document.addEventListener(name, function (event) {
      var target = event.target;
      if (!target || !target.tagName) { return; }
      var tag = target.tagName.toLowerCase();
      if (tag !== 'audio' && tag !== 'video') { return; }
      update();
    }, true);
  });

  /* One moving video at a time: if the visitor starts a room's own video,
     the wash steps aside. The wash never starts a room's video. */
  document.addEventListener('play', function (event) {
    var target = event.target;
    if (!target || target.tagName !== 'VIDEO') { return; }
    if (!ambience || !ambience.video) { return; }
    if (target === ambience.video) { return; }
    ambience.pauseForOther();
    update();
  }, true);

  update();
})();
