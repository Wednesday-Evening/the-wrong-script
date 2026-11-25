/* =====================================================================
   THE WRONG SCRIPT - The Arcade: the catalogue
   ---------------------------------------------------------------------
   Data only. No logic, no rendering.

   One entry, because one game is finished. Adding a second game later
   means adding an object here and a page next to signal-path/ - the
   library page draws whatever it finds and invents nothing, so a game
   that is not listed cannot appear as a card by accident.
   ===================================================================== */

window.ARCADE_GAMES = [
  {
    id: 'signal-path',
    title: 'Signal Path',
    path: 'signal-path/',
    kicker: 'Grid puzzle',
    blurb: 'Guide a small signal unit across a dark grid to its beacon. Every fragment on the level has to be picked up before the beacon will open, and the walls do not negotiate.',
    facts: [
      { label: 'Form', value: 'Single-player grid puzzle' },
      { label: 'Levels', value: 'Six, hand-drawn' },
      { label: 'A sitting', value: '10 to 15 minutes' },
      { label: 'Controls', value: 'Arrow keys, W A S D or on-screen pad' },
      { label: 'Failure', value: 'None: no timer, no lives, no score' }
    ],
    note: 'Progress is saved in this browser under its own key, separate from the film and the stories.'
  }
];
