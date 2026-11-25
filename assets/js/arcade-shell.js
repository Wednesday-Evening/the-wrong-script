/* =====================================================================
   THE WRONG SCRIPT - The Arcade: shell behaviour
   ---------------------------------------------------------------------
   One small job: the mobile menu, wired exactly as the Lobby and the
   Stories pages wire it (#nav-toggle / #site-nav / .is-open), so the
   Arcade feels like another room in the same building rather than a
   separate site.
   ===================================================================== */

(function () {
  'use strict';

  var toggle = document.querySelector('#nav-toggle');
  var nav = document.querySelector('#site-nav');
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
    if (!nav.classList.contains('is-open')) { return; }
    setOpen(false);
    toggle.focus();
  });

  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) { setOpen(false); }
  });
})();
