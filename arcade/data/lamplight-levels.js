/* =====================================================================
   LAMPLIGHT - the six rooms
   ---------------------------------------------------------------------
   Data only. Each room lists its grid, where the lamp stands and which way
   it points, and the orientation of every mirror in the solved state.

   `solution` is documentation and a test fixture, not a hint the page
   shows: tools/verify-lamplight.js ignores it while searching, brute-forces
   each room from the grid alone, and then checks the stored answer really
   does light every window. If the two ever disagree the suite fails.

   Mirror order is reading order: sorted by row, then by column. Every grid
   starts unsolved - the beam leaves the room without lighting everything -
   so no room is handed to the player already finished.

   Cell key:  .  empty      #  wall      *  window
              S  the lamp   /  \  mirror (two states)
   ===================================================================== */

window.LAMPLIGHT_LEVELS = [
  {
    id: 'reading-room',
    number: 1,
    name: 'The Reading Room',
    idea: 'One mirror, one window. The beam has to come down.',
    source: { x: 0, y: 1, dir: 'e' },
    grid: [
      '..*..',
      'S.\\..',
      '.....',
      '.....'
    ],
    solution: ['/']
  },
  {
    id: 'long-corridor',
    number: 2,
    name: 'The Long Corridor',
    idea: 'Two mirrors in a line. The second one sends the beam along the shelf.',
    source: { x: 0, y: 1, dir: 'e' },
    grid: [
      '.......',
      'S..\\...',
      '...*...',
      '.../..*',
      '.......'
    ],
    solution: ['\\', '\\']
  },
  {
    id: 'the-stacks',
    number: 3,
    name: 'The Stacks',
    idea: 'The beam turns twice and climbs a wall to reach the far window.',
    source: { x: 0, y: 2, dir: 'e' },
    grid: [
      '../..//.',
      '..*....',
      'S.\\....',
      '.....*.',
      '.......',
      '.......'
    ],
    solution: ['/', '\\', '/']
  },
  {
    id: 'the-annex',
    number: 4,
    name: 'The Annex',
    idea: 'Four mirrors, three windows, one long way round.',
    source: { x: 0, y: 0, dir: 'e' },
    grid: [
      'S*./...',
      '.......',
      '...\\.*/',
      '.......',
      '....*.\\'
    ],
    solution: ['\\', '\\', '\\', '/']
  },
  {
    id: 'the-lamp-room',
    number: 5,
    name: 'The Lamp Room',
    idea: 'Five mirrors. The beam crosses the same row twice without meeting itself.',
    source: { x: 0, y: 0, dir: 'e' },
    grid: [
      'S*/...',
      '.....*',
      '..\\*/..'.slice(0, 6),
      '......',
      '..../\\',
      '......'
    ],
    solution: ['\\', '\\', '\\', '\\', '/']
  },
  {
    id: 'the-signal-room',
    number: 6,
    name: 'The Signal Room',
    idea: 'Six mirrors and five windows. The last stretch runs back across the room.',
    source: { x: 0, y: 0, dir: 'e' },
    grid: [
      'S*/...',
      '.\\..*.',
      '../*/.',
      '.*..*.',
      './../.',
      '......'
    ],
    solution: ['\\', '/', '\\', '\\', '\\', '\\']
  }
];
