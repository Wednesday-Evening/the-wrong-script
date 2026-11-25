/* =====================================================================
   THE WRONG SCRIPT - The Archive: the catalogue
   ---------------------------------------------------------------------
   Data only. No logic, no rendering, no storage, no network.

   Rules this file follows, on purpose:

     - The Archive is a catalogue, not a progress tracker. Nothing here
       describes what a particular visitor has done, found or finished,
       and nothing reads a saved run to work it out. Every entry is
       true for someone opening the page for the first time.
     - Only work that actually exists is listed, and every destination
       is a real route inside this project. No invented exhibits, no
       fabricated dates, no awards, no visitor counts, no ratings.
     - Spoilers live inside a closed disclosure and nowhere else. The
       visible title and note of a spoiler entry must not give the
       answer away, because those are what a visitor reads first.
     - The credit is "The Wrong Script Studio", because that is who
       made the work. No individual authors are invented.
     - Nothing in this file is HTML. The renderer builds every node
       with textContent, so an entry cannot inject markup or script.

   To add an entry in a later phase, add one object with a unique id.
   The id becomes the deep link: /archive/#discovery-<id>.
   ===================================================================== */

window.ARCHIVE_CONTENT = {

  /* ------------------------------------------------------------------
     A. THE COMPLETED FILES
     Three experiences that have a genuine conclusion. The original
     production is one of them, and it is deliberately not filed under
     The Stories: it is its own room and stays that way.
     ------------------------------------------------------------------ */
  files: [
    {
      id: 'the-ninth-bell',
      title: 'The Ninth Bell',
      room: 'The Stories',
      href: '../stories/the-ninth-bell/',
      hrefLabel: 'Read The Ninth Bell',
      form: 'Interactive fiction',
      shape: 'Four watches, five endings',
      summary: 'A relief keeper takes one night on a lighthouse rock where the bell rings when nobody is in the tower. You keep the light, write the log, and decide what the ninth stroke is for.',
      facts: [
        'Four watches, and a night that can end five different ways.',
        'Choices are gated by what you have already found, not by a score.',
        'About forty minutes for a single run; the endings do not repeat each other.',
        'Progress is kept in this browser, in the story\u2019s own save.'
      ]
    },
    {
      id: 'the-wrong-script-original-production',
      title: 'The Wrong Script: Original Production',
      room: 'The Original Production',
      href: '../film/',
      hrefLabel: 'Enter the Film',
      form: 'Interactive film',
      shape: 'Three routes, three endings, one post-credits scene',
      summary: 'The film this universe started as. A production has lost its script, and you arrive on set with three doors and a crew who have stopped asking where it went.',
      facts: [
        'Three routes through the building, plus a fourth door that only opens once all three script fragments are found.',
        'Three endings, a post-credits scene, and a replay that starts clean.',
        'About fifteen minutes for one route, longer if you keep poking at the props.',
        'It remains a separate experience and is not part of The Stories shelf.'
      ]
    },
    {
      id: 'signal-path',
      title: 'SIGNAL PATH',
      room: 'The Arcade',
      href: '../arcade/signal-path/',
      hrefLabel: 'Play SIGNAL PATH',
      form: 'Grid puzzle',
      shape: 'Six handcrafted levels, one finish',
      summary: 'A small signal unit has to cross a grid to a beacon, and the beacon will not open until every fragment on the level has been collected. Six levels, hand-drawn, with a last one.',
      facts: [
        'Six levels of increasing size and obstruction, designed by hand rather than generated.',
        'Arrow keys, WASD, or an on-screen pad for touch.',
        'Restart the level or undo a move at any time. Nothing is timed.',
        'It ends. There is a final level, a completion state and a replay.'
      ]
    }
  ],

  /* ------------------------------------------------------------------
     B. THE COLLECTIONS
     Three editorial groupings of work that already exists. A collection
     is an argument about the work, not a new room: every entry points at
     something a visitor can open.
     ------------------------------------------------------------------ */
  collections: [
    {
      id: 'choices-and-consequences',
      number: '01',
      title: 'Choices and Consequences',
      lede: 'Three different machines for the same question: what does it cost to choose something, and who finds out afterwards? One hides the consequence in a later scene, one hides it behind a door, and one makes the choice a single step on a grid.',
      entries: [
        {
          title: 'The Ninth Bell',
          kind: 'The Stories',
          href: '../stories/the-ninth-bell/',
          note: 'The ending is decided in the last watch, but the choices that unlock it were made hours earlier. Find the wrong things and the kindest option never appears.'
        },
        {
          title: 'The Wrong Script: Original Production',
          kind: 'The Original Production',
          href: '../film/',
          note: 'Three routes, each with its own ending, and a fourth door that stays shut until all three script fragments have been recovered.'
        },
        {
          title: 'SIGNAL PATH',
          kind: 'The Arcade',
          href: '../arcade/signal-path/',
          note: 'Choice as movement. Every step is counted, undo is allowed, and nothing punishes you for thinking. The constraint is the walls, not a clock.'
        }
      ]
    },
    {
      id: 'close-observation',
      number: '02',
      title: 'Close Observation',
      lede: 'Work that only pays out if you stop and look properly: counted twice, read to the end, or noticed in a room you were about to leave.',
      entries: [
        {
          title: 'Ledger of Small Hours',
          kind: 'The Gallery \u00b7 Poetry',
          href: '../gallery/#ledger-of-small-hours',
          note: 'An inventory of a night shift, written as the list of things that get counted twice. The second count is the one the ledger trusts.'
        },
        {
          title: 'Instructions for a Door That Will Not Open',
          kind: 'The Gallery \u00b7 Poetry',
          href: '../gallery/#instructions-for-a-door',
          note: 'Four lines of advice, none of which is about the lock. The useful instruction is the one that asks you to stand still.'
        },
        {
          title: 'The Understudy\u2019s Note',
          kind: 'The Gallery \u00b7 Writing',
          href: '../gallery/#the-understudy-note',
          note: 'A pencilled note left in a dressing room, and the small detail at the end that tells you how recently it was written.'
        },
        {
          title: 'The crew lounge',
          kind: 'The Original Production',
          href: '../film/',
          note: 'A room in the film that only reaches its completed state once all four crew members have been met. Meet three and it stays half-furnished, and you may never notice why.'
        }
      ]
    },
    {
      id: 'rooms-and-doors',
      number: '03',
      title: 'Rooms and Doors',
      lede: 'The universe is mostly rooms with something wrong behind the door. This collection gathers the ones that are about the space itself: a set, a booth, a hub of rooms, and a number that keeps coming back.',
      entries: [
        {
          title: 'Red Room, No Take',
          kind: 'The Gallery \u00b7 Visual Art',
          href: '../gallery/#red-room-no-take',
          note: 'A set after the take was abandoned: one practical lamp, a red wall, and a chair nobody has moved since.'
        },
        {
          title: 'Set Dressing (Study III)',
          kind: 'The Gallery \u00b7 Visual Art',
          href: '../gallery/#set-dressing-study-iii',
          note: 'Nine props from a film that does not exist, ordered by how often a hand touches them.'
        },
        {
          title: 'The Booth',
          kind: 'The Gallery \u00b7 Illustration',
          href: '../gallery/#the-booth',
          note: 'A projection booth drawn in one continuous line, with the projector running to nobody.'
        },
        {
          title: 'The hub of investigation rooms',
          kind: 'The Original Production',
          href: '../film/',
          note: 'The centre of the film is a corridor of rooms rather than a scene. Which room you can enter depends on what you have already picked up elsewhere.'
        },
        {
          title: 'Room 13',
          kind: 'The Original Production',
          href: '../film/',
          note: 'A room number that appears more than once, and the painting that hangs behind it. It is the same painting each time, and it is worth a second look.'
        }
      ]
    }
  ],

  /* ------------------------------------------------------------------
     C. THE DISCOVERIES
     Details that are already in the work and easy to walk past. Each one
     is true of the shipped content. Spoilers carry a closed disclosure
     and are named nowhere else.
     ------------------------------------------------------------------ */
  discoveries: [
    {
      id: 'three-ways-out',
      title: 'Three Ways Out',
      room: 'The Original Production',
      href: '../film/',
      note: 'The film does not have one ending with variations. It has three, and they disagree with each other about what happened in the building.'
    },
    {
      id: 'one-more-scene',
      title: 'One More Scene',
      room: 'The Original Production',
      href: '../film/',
      note: 'After the decision to leave the production, there is one more scene. It is not an ending, it unlocks nothing, and it is there if you stay for it.'
    },
    {
      id: 'the-crew-lounge',
      title: 'The Crew Lounge',
      room: 'The Original Production',
      href: '../film/',
      note: 'The lounge only reaches its completed state once all four crew members have been met. Meet three and it stays half-furnished, with no message telling you what is missing.'
    },
    {
      id: 'room-thirteen',
      title: 'Room 13',
      room: 'The Original Production',
      href: '../film/',
      note: 'The number turns up more than once, and the painting behind it is the same painting every time. It is a callback, not a puzzle, and nothing is unlocked by noticing it.'
    },
    {
      id: 'five-hours-five-endings',
      title: 'Five Hours, Five Endings',
      room: 'The Ninth Bell',
      href: '../stories/the-ninth-bell/',
      note: 'The story has five endings, and one of them is harder to reach than the other four. The condition is behind the disclosure below, because reading it is the difference between finding it and being told.',
      spoiler: {
        summary: 'Spoiler \u2014 The Ninth Bell',
        paragraphs: [
          'The hopeful ending, The Ledger, is not offered to everyone who reaches the last watch. The choice only appears if two earlier discoveries have been made: what the bell\u2019s rule actually is, and how the ledger is meant to be closed.',
          'Miss either one and the option is never shown at all. The night simply ends another way, and the log records it without comment.'
        ]
      }
    },
    {
      id: 'an-early-ending',
      title: 'An Early Ending Is Still an Ending',
      room: 'The Ninth Bell',
      href: '../stories/the-ninth-bell/',
      note: 'You are not required to use the whole night. The Ninth Bell will let you turn in early and still call that an ending, which is not the same thing as failing.'
    },
    {
      id: 'the-closed-beacon',
      title: 'The Closed Beacon',
      room: 'SIGNAL PATH',
      href: '../arcade/signal-path/',
      note: 'In SIGNAL PATH the beacon refuses to open while fragments are still on the grid, and it says so instead of failing silently. Stepping onto it early is a legal move that does nothing but count.'
    },
    {
      id: 'not-what-it-appears',
      title: 'Not Everything Is What It Appears',
      room: 'The Gallery',
      href: '../gallery/',
      note: 'The photography shelf holds a still that no camera took, and the music shelf holds a cue that makes no sound. Both exhibits say so in their own captions rather than leaving you to guess.'
    }
  ],

  /* ------------------------------------------------------------------
     D. THE RECORD
     ------------------------------------------------------------------ */
  record: {
    title: 'What the Archive keeps',
    paragraphs: [
      'The Archive is a catalogue of work, not a record of visitors. An experience is filed here because it has a real conclusion or because it holds a permanent place in the universe, not because it is new, popular or recently updated.',
      'The collections are arguments rather than lists. Each one groups work from different rooms around a single idea, and each entry links to the thing itself so the argument can be checked.',
      'The discoveries are details that are already in the work: a state that only appears under a condition, a callback that repeats, a caption that admits what an exhibit really is. Nothing in this section adds a puzzle to an experience or changes how it plays.',
      'Everything is credited to The Wrong Script Studio. There are no individual authors listed, no awards, no achievements, no attendance figures and no ranking, because none of those things exist to be recorded.'
    ]
  },

  closing: {
    title: 'Alongside the other rooms',
    text: 'The Archive exists alongside the other rooms rather than above them. It is where completed experiences, selected collections and easily missed details can be found again in one place. It does not record personal progress, it does not know who has been here, and it keeps nothing about a visit. It simply preserves and connects the work that makes up the universe.'
  }
};
