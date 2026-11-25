/* =====================================================================
   THE WRONG SCRIPT - The Arcade: SIGNAL PATH, the six levels
   ---------------------------------------------------------------------
   Plain data, no logic. Each level is a layout of rows:

     #  wall        .  floor        S  start        B  beacon
     *  fragment

   Every level is hand-drawn, never generated. Each one has been solved
   from start to beacon with every fragment collected - see
   tools/verify-signal-path.js, which walks all six against the rules in
   assets/js/signal-path-core.js and fails if a route does not exist.

   Rules of thumb kept while drawing these:
     - one idea per level, introduced before it is combined with another,
     - the beacon is reachable before the fragments are, on purpose, so the
       sealed door teaches the rule instead of hiding it,
     - no cell that looks walkable but is not, and no dead end that cannot
       be walked back out of.
   ===================================================================== */

window.SIGNAL_PATH_LEVELS = [
  {
    id: 'relay-room',
    name: 'Relay Room',
    hint: 'One fragment, one beacon, and a wall with a gap in it.',
    layout: [
      '#####',
      '#S..#',
      '#.#.#',
      '#*B.#',
      '#####'
    ]
  },
  {
    id: 'twin-contacts',
    name: 'Twin Contacts',
    hint: 'Two fragments, one corridor, and the beacon between them.',
    layout: [
      '######',
      '#S...#',
      '#.##.#',
      '#*.*.#',
      '#.B..#',
      '######'
    ]
  },
  {
    id: 'switchback',
    name: 'Switchback',
    hint: 'The contact sits behind a wall. You will pass the same corner twice.',
    layout: [
      '#######',
      '#S....#',
      '#.##*.#',
      '#.#.#.#',
      '#.#.#.#',
      '#..B..#',
      '#######'
    ]
  },
  {
    id: 'dead-signal',
    name: 'Dead Signal',
    hint: 'Three contacts, and a spine you have to climb in both directions.',
    layout: [
      '########',
      '#S..#..#',
      '#.#.#*.#',
      '#.#.##.#',
      '#*..*..#',
      '#....B.#',
      '########'
    ]
  },
  {
    id: 'cold-relay',
    name: 'Cold Relay',
    hint: 'One contact waits in a pocket. Enter it, take it, walk back out.',
    layout: [
      '#########',
      '#S......#',
      '#.#####.#',
      '#.#*.#..#',
      '#.#.#.#.#',
      '#..*..*B#',
      '#########'
    ]
  },
  {
    id: 'the-beacon',
    name: 'The Beacon',
    hint: 'Four contacts. The beacon only answers a full count.',
    layout: [
      '#########',
      '#S..*...#',
      '#.###.#.#',
      '#...#.#.#',
      '#.#.#.#.#',
      '#.*...*.#',
      '#.#####.#',
      '#..*.B..#',
      '#########'
    ]
  }
];
