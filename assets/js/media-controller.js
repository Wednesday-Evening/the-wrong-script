/* =====================================================================
   THE WRONG SCRIPT - floating media controller
   ---------------------------------------------------------------------
   One pill, every room. It is the only place a visitor meets sound and
   background video, so it has to be honest: a slider that moves must move
   something, a switch that says off must be off, and a channel a room does
   not have must say so rather than pretend.

   Collapsed  : room, playback state, audio indicator, mute badge, expander.
   Expanded   : master switch, music, effects, ambience, background video,
                a recovery control when the browser has blocked playback,
                and the first-visit sound choice.

   Everything it changes is stored by assets/js/audio-engine.js under the
   single media-preference key. This file reads and writes no storage of
   its own.
   ===================================================================== */

(function () {
  'use strict';

  var audio = window.TWSAudio || null;
  var scene = window.TWSAmbience || null;

  if (!audio && !scene) { return; }

  var CHANNELS = [
    { id: 'music', name: 'Music' },
    { id: 'effects', name: 'Effects' },
    { id: 'ambience', name: 'Ambience' }
  ];

  var root = null;
  var compact = null;
  var panel = null;
  var roomEl = null;
  var statusEl = null;
  var muteEl = null;
  var liveEl = null;
  var masterSwitch = null;
  var videoSwitch = null;
  var askBlock = null;
  var recoverBlock = null;
  var recoverText = null;
  var recoverButton = null;
  var sliderEls = {};
  var valueEls = {};
  var rowEls = {};
  var asked = false;
  var panelId = 'mixer-panel';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text) { node.textContent = text; }
    return node;
  }

  function audioState() {
    return audio ? audio.state() : null;
  }

  function ambienceState() {
    return scene ? scene.state() : { status: 'none', label: '', room: '' };
  }

  function running() {
    var a = audioState();
    return !!(a && a.unlocked && a.master);
  }

  function anyChannel() {
    var a = audioState();
    if (!a) { return false; }
    var present = a.present || {};
    return CHANNELS.some(function (c) {
      return present[c.id] && a.levels[c.id] > 0;
    });
  }

  function statusText() {
    var a = audioState();
    var s = ambienceState();
    var video = s.status;
    var parts = [];

    if (a) {
      if (!a.master) {
        parts.push('Muted');
      } else if (a.firstRun) {
        parts.push('Sound not chosen');
      } else if (a.choice === 'silent') {
        parts.push('Silent');
      } else if (a.suspended) {
        parts.push('Sound waiting for a tap');
      } else if (a.unlocked && anyChannel()) {
        parts.push('Sound on');
      } else {
        parts.push('Sound on, this room is quiet');
      }
    }

    if (video === 'playing') { parts.push('video playing'); }
    else if (video === 'blocked') { parts.push('video blocked'); }
    else if (video === 'off') { parts.push('video off'); }
    else if (video === 'still') { parts.push('still background'); }
    else if (video === 'unavailable') { parts.push('video unavailable'); }

    return parts.join(' - ') || 'Room media';
  }

  function buildPanel() {
    panel = el('div', 'mixer__panel');
    panel.id = panelId;
    panel.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Sound and video');

    var head = el('div', 'mixer__head');
    head.appendChild(el('h2', 'mixer__title', 'Room media'));
    var close = el('button', 'mixer__close', '\u00d7');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close room media controls');
    close.addEventListener('click', function () { collapse(true); });
    head.appendChild(close);
    panel.appendChild(head);

    /* First-visit choice. Nothing plays before this is answered. */
    askBlock = el('div', 'mixer__ask');
    askBlock.hidden = true;
    askBlock.appendChild(el('p', 'mixer__ask-title', 'Sound in this room'));
    askBlock.appendChild(el('p', 'mixer__ask-text',
      'Every room has its own quiet atmosphere, generated in the browser. ' +
      'You can change or silence it at any time from this panel.'));

    var askButtons = el('div', 'mixer__ask-actions');
    var withSound = el('button', 'mixer__action', 'Enter with sound');
    withSound.type = 'button';
    withSound.setAttribute('data-choose', 'sound');
    var silently = el('button', 'mixer__action mixer__action--quiet', 'Continue silently');
    silently.type = 'button';
    silently.setAttribute('data-choose', 'silent');
    askButtons.appendChild(withSound);
    askButtons.appendChild(silently);
    askBlock.appendChild(askButtons);
    panel.appendChild(askBlock);

    [withSound, silently].forEach(function (button) {
      button.addEventListener('click', function () {
        var option = button.getAttribute('data-choose');
        if (audio) { audio.choose(option); }
        asked = true;
        askBlock.hidden = true;
        announce(option === 'sound'
          ? 'Sound on. Every room has its own atmosphere.'
          : 'Continuing silently. You can turn sound on from this panel.');
        render();
      });
    });

    /* Master */
    var masterRow = el('div', 'mixer__row');
    var masterName = el('span', 'mixer__name', 'All sound');
    masterName.id = 'mixer-master-label';
    masterRow.appendChild(masterName);
    masterSwitch = el('button', 'mixer__switch');
    masterSwitch.type = 'button';
    masterSwitch.setAttribute('role', 'switch');
    masterSwitch.setAttribute('aria-checked', 'true');
    masterSwitch.setAttribute('aria-labelledby', 'mixer-master-label');
    masterSwitch.addEventListener('click', function () {
      if (!audio) { return; }
      var next = !audio.state().master;
      if (next && audio.state().choice === '') {
        audio.choose('sound');
        asked = true;
        askBlock.hidden = true;
      }
      audio.setMaster(next);
      announce(next ? 'All sound on.' : 'All sound muted.');
      render();
    });
    masterRow.appendChild(masterSwitch);
    panel.appendChild(masterRow);

    /* Channels */
    CHANNELS.forEach(function (channel) {
      var row = el('div', 'mixer__row mixer__row--slider');
      row.setAttribute('data-channel', channel.id);

      var head2 = el('div', 'mixer__rowhead');
      var name = el('span', 'mixer__name', channel.name);
      name.id = 'mixer-' + channel.id + '-label';
      var value = el('span', 'mixer__val', '0');
      head2.appendChild(name);
      head2.appendChild(value);
      row.appendChild(head2);

      var slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'mixer__range';
      slider.min = '0';
      slider.max = '100';
      slider.step = '5';
      slider.value = '0';
      slider.setAttribute('aria-labelledby', name.id);
      slider.addEventListener('input', function () {
        if (!audio) { return; }
        audio.setLevel(channel.id, Number(slider.value));
        value.textContent = slider.value;
        render();
      });
      slider.addEventListener('change', function () {
        announce(channel.name + ' ' + slider.value + ' percent.');
      });
      row.appendChild(slider);

      sliderEls[channel.id] = slider;
      valueEls[channel.id] = value;
      rowEls[channel.id] = row;
      panel.appendChild(row);
    });

    /* Background video */
    var videoRow = el('div', 'mixer__row');
    var videoName = el('span', 'mixer__name', 'Background video');
    videoName.id = 'mixer-video-label';
    videoRow.appendChild(videoName);
    videoSwitch = el('button', 'mixer__switch');
    videoSwitch.type = 'button';
    videoSwitch.setAttribute('role', 'switch');
    videoSwitch.setAttribute('aria-checked', 'true');
    videoSwitch.setAttribute('aria-labelledby', 'mixer-video-label');
    videoSwitch.addEventListener('click', function () {
      if (!scene) { return; }
      var state = scene.state();
      var on = state.status !== 'playing';
      scene.setPlaying(on);
      announce(on ? 'Background video on.' : 'Background video off.');
      render();
    });
    videoRow.appendChild(videoSwitch);
    panel.appendChild(videoRow);

    /* Recovery: shown only when the browser has actually held playback back. */
    recoverBlock = el('div', 'mixer__recover');
    recoverBlock.hidden = true;
    recoverText = el('p', 'mixer__recover-text',
      'The browser has not started playback yet.');
    recoverButton = el('button', 'mixer__action', 'Start playback');
    recoverButton.type = 'button';
    recoverButton.addEventListener('click', function () {
      if (audio && audio.unlock) { audio.unlock(); }
      if (scene) { scene.setPlaying(true); }
      announce('Starting playback.');
      render();
    });
    recoverBlock.appendChild(recoverText);
    recoverBlock.appendChild(recoverButton);
    panel.appendChild(recoverBlock);

    panel.appendChild(el('p', 'mixer__note',
      'Sound and video are decorative. Every story, game and exhibit works ' +
      'without them. Nothing here is stored outside this browser.'));

    liveEl = el('p', 'mixer__live');
    liveEl.setAttribute('role', 'status');
    liveEl.setAttribute('aria-live', 'polite');
    panel.appendChild(liveEl);

    return panel;
  }

  function buildCompact() {
    compact = el('button', 'mixer__compact');
    compact.type = 'button';
    compact.setAttribute('aria-expanded', 'false');
    compact.setAttribute('aria-controls', panelId);

    compact.appendChild(el('span', 'mixer__pulse'));

    var text = el('span', 'mixer__text');
    roomEl = el('span', 'mixer__room', 'Room');
    statusEl = el('span', 'mixer__status', 'Room media');
    text.appendChild(roomEl);
    text.appendChild(statusEl);
    compact.appendChild(text);

    muteEl = el('span', 'mixer__mute', 'Muted');
    muteEl.hidden = true;
    compact.appendChild(muteEl);

    var wave = el('span', 'mixer__wave');
    wave.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 3; i += 1) { wave.appendChild(el('i')); }
    compact.appendChild(wave);

    var chev = el('span', 'mixer__chev');
    chev.setAttribute('aria-hidden', 'true');
    compact.appendChild(chev);

    compact.addEventListener('click', function () {
      if (panel.hidden) { expand(); } else { collapse(true); }
    });

    return compact;
  }

  function announce(message) {
    if (liveEl) { liveEl.textContent = message; }
  }

  function expand() {
    if (!panel || !compact) { return; }
    panel.hidden = false;
    compact.setAttribute('aria-expanded', 'true');
    render();
    announce('Room media controls open. ' + statusText() + '.');
  }

  function collapse(returnFocus) {
    if (!panel || !compact) { return; }
    panel.hidden = true;
    compact.setAttribute('aria-expanded', 'false');
    if (returnFocus) { compact.focus(); }
  }

  function render() {
    if (!root) { return; }

    var a = audioState();
    var s = ambienceState();
    var label = s.label || 'Room';

    if (roomEl) { roomEl.textContent = label; }
    if (statusEl) { statusEl.textContent = statusText(); }

    var muted = !!(a && !a.master);
    if (muteEl) { muteEl.hidden = !muted; }

    root.classList.toggle('is-audio', running() && anyChannel());
    root.classList.toggle('is-playing', running() && anyChannel());
    root.classList.toggle('is-muted', muted);

    if (masterSwitch && a) {
      masterSwitch.setAttribute('aria-checked', a.master ? 'true' : 'false');
      masterSwitch.setAttribute('aria-label',
        a.master ? 'All sound on' : 'All sound muted');
    }

    if (videoSwitch) {
      var on = s.status === 'playing' || s.status === 'blocked' || s.status === 'still';
      videoSwitch.setAttribute('aria-checked', on ? 'true' : 'false');
      videoSwitch.setAttribute('aria-label',
        on ? 'Background video on' : 'Background video off');
    }

    CHANNELS.forEach(function (channel) {
      var present = a ? !!a.present[channel.id] : false;
      var row = rowEls[channel.id];
      var slider = sliderEls[channel.id];
      var value = valueEls[channel.id];
      if (!row || !slider || !value) { return; }

      row.classList.toggle('is-absent', !present);

      if (present && a) {
        var level = a.levels[channel.id];
        if (document.activeElement !== slider) { slider.value = String(level); }
        slider.disabled = !a.master;
        value.textContent = level + '%';
      } else {
        slider.disabled = true;
        slider.value = '0';
        value.textContent = 'Not here';
      }
    });

    var needsRecovery = false;
    var recoveryLabel = '';
    if (a && a.choice === 'sound' && a.master && a.suspended && !a.unlocked) {
      needsRecovery = true;
      recoveryLabel = 'Sound is waiting for a tap before it can start.';
    } else if (s.status === 'blocked') {
      needsRecovery = true;
      recoveryLabel = 'The browser paused the background video.';
    }

    if (recoverBlock) {
      recoverBlock.hidden = !needsRecovery;
      if (needsRecovery && recoverText) { recoverText.textContent = recoveryLabel; }
    }

    if (askBlock && a) {
      var showAsk = a.firstRun && !asked;
      askBlock.hidden = !showAsk;
    }
  }

  function mount() {
    root = el('div', 'mixer');
    root.setAttribute('data-mixer', '');
    root.appendChild(buildPanel());
    root.appendChild(buildCompact());
    document.body.appendChild(root);

    render();

    /* A first-time visitor is asked once, in the panel, before anything
       plays. Returning visitors who already chose are not asked again. */
    var a = audioState();
    if (a && a.firstRun) {
      expand();
      announce('Choose whether this room plays sound.');
    }

    window.addEventListener('tws:audio', render);
    window.addEventListener('tws:ambience', render);

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') { return; }
      if (panel && !panel.hidden) {
        event.preventDefault();
        collapse(true);
      }
    });

    /* Video state can settle without an event (a rejected autoplay, a
       resumed tab), so the readout is refreshed rather than trusted. */
    window.setInterval(function () {
      if (!panel || panel.hidden) { render(); }
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
