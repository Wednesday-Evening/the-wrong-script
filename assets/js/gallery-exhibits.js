/* =====================================================================
   THE WRONG SCRIPT - The Gallery: the collection
   ---------------------------------------------------------------------
   Data only. No logic, no rendering, no storage.

   Rules this file follows, on purpose:

     - Every exhibit here was written or drawn for this project. Nothing
       is copied from an existing artist, book, poem, song, photograph or
       film, and nothing is hotlinked. The artwork lives in
       assets/img/gallery/ as hand-written SVG.
     - The credit on every exhibit is "The Wrong Script Studio", because
       that is who made it. There are no invented member names, no
       visitor counts, no ratings, no comments and no likes. None of
       those things exist yet, so none of them are shown.
     - Photography is filed as photography because that is the shelf the
       work belongs on. No camera was used for it, and the exhibit says
       so rather than implying otherwise.
     - Original Music contains a written cue, not a recording. The
       project has no original recording to offer in this phase, so the
       exhibit says that plainly instead of embedding somebody else's
       track or a fake player.
     - Nothing in this file is HTML. The renderer builds every node with
       textContent, so an exhibit cannot inject markup or script.

   To add an exhibit in a later phase, add one object below with a unique
   id. Approved member work would arrive through review first; this file
   is not a submission path and there is no upload or publish control
   anywhere in the Gallery.
   ===================================================================== */

window.GALLERY_CATEGORIES = [
  {
    id: 'visual-art',
    label: 'Visual Art',
    note: 'Drawn work: sets, props and rooms that only exist on a screen.'
  },
  {
    id: 'photography',
    label: 'Photography',
    note: 'Stills and frames. Every image here is constructed for this project, and each exhibit says how.'
  },
  {
    id: 'poetry',
    label: 'Poetry',
    note: 'Short work, set as it would be printed rather than as a paragraph.'
  },
  {
    id: 'writing',
    label: 'Writing',
    note: 'Prose too short for The Stories shelf, and too long for a caption.'
  },
  {
    id: 'illustration',
    label: 'Illustration',
    note: 'Line work: the places in the universe nobody has filmed.'
  },
  {
    id: 'music',
    label: 'Original Music',
    note: 'Cues written for the film that were never recorded. Text and score, no audio.'
  }
];

window.GALLERY_EXHIBITS = [
  {
    id: 'red-room-no-take',
    title: 'Red Room, No Take',
    category: 'visual-art',
    kind: 'image',
    medium: 'Vector drawing',
    collection: 'Opening set',
    blurb: 'The set after the take was abandoned: one practical lamp, a red wall, and a chair nobody has moved since.',
    body: [
      'The red is the same value the film uses in the corridor behind the doors, which is why this room looks like it belongs to the building even though it was drawn after the film was finished. Flat shapes, no texture, no perspective correction. The wall is a rectangle because the wall was a rectangle on the day.',
      'The lamp is doing all the work. It is the only thing in the frame with a shadow, and the shadow falls away from the chair rather than towards it, which is wrong in a way that took three attempts to keep. The doorway on the right is the colour of a room with the light still on in it, and nobody is standing in it.',
      'Drawn as vector paths at 800 by 560, with no imported assets. The original file is the one on this page.'
    ],
    credit: 'The Wrong Script Studio',
    media: {
      src: '../assets/img/gallery/red-room.svg',
      alt: 'A red-walled room drawn in flat shapes: a single hanging lamp throwing a cone of pale light over an empty chair, with a dark doorway at the right.',
      width: 800,
      height: 560
    },
    note: 'Demonstration work made for this project. Not a member submission.'
  },
  {
    id: 'set-dressing-study-iii',
    title: 'Set Dressing (Study III)',
    category: 'visual-art',
    kind: 'image',
    medium: 'Vector drawing',
    collection: 'Opening set',
    blurb: 'Nine props from a film that does not exist, arranged by how often they were handled.',
    body: [
      'A study in props rather than scenes. Nine objects, each drawn in outline on its own dark square: a bell, a key, a script page, a lens, a chair, a lamp, a cup, a door handle and a coil of cable.',
      'They are ordered left to right, top to bottom, by how often a hand touches them during a shoot. The bell is first because it is handled constantly and never used. The cable is last because it is handled once and then sworn at.',
      'The grid is deliberate: nine equal squares, one hairline between them, so the objects can be compared as objects. Nothing here is a puzzle and nothing is hidden in it.'
    ],
    credit: 'The Wrong Script Studio',
    media: {
      src: '../assets/img/gallery/set-dressing.svg',
      alt: 'A three-by-three grid of nine small objects drawn in pale outline on dark squares: a bell, a key, a script page, a lens, a chair, a lamp, a cup, a door handle and a coil of cable.',
      width: 780,
      height: 780
    },
    note: 'Demonstration work made for this project. Not a member submission.'
  },
  {
    id: 'low-water-halversen-light',
    title: 'Low Water, Halversen Light',
    category: 'photography',
    kind: 'image',
    medium: 'Constructed digital still (vector, no camera)',
    collection: 'Opening set',
    blurb: 'The causeway at low water: the tower, the black rock, and a line of wet stone going out.',
    body: [
      'No camera was used for this still. It is a constructed image, drawn as vector shapes: the tower, the rock under it, the pale band of sky, the one warm lamp and the stepping stones that only appear when the tide is out. It is filed under Photography because that is the shelf it belongs on, not because a shutter was involved, and this caption is here so nobody has to guess.',
      'The horizon sits high on purpose. Most pictures of a lighthouse put the tower in the middle of the frame and the sea underneath it, which makes the building look like an ornament. Here the water takes two thirds of the image and the tower is small in it, which is closer to how the place behaves.',
      'The lamp is the only saturated colour in the frame. Everything else is grey, brown or black, because at low water in winter everything else is.'
    ],
    credit: 'The Wrong Script Studio',
    media: {
      src: '../assets/img/gallery/low-water.svg',
      alt: 'A lighthouse on a black rock at low tide, with a pale sky, a red lamp at the top of the tower and a line of wet stepping stones leading away across dark water.',
      width: 800,
      height: 520
    },
    note: 'A constructed still, not a photograph taken with a camera. Demonstration work made for this project.'
  },
  {
    id: 'ledger-of-small-hours',
    title: 'Ledger of Small Hours',
    category: 'poetry',
    kind: 'text',
    medium: 'Poem',
    collection: 'Opening set',
    blurb: 'A night-shift inventory, written as a list of things that get counted twice.',
    body: [
      "The bell is counted once at dusk\nand once again at three,\nbecause the second count is the one\nthe ledger trusts.",
      "Two chairs. One coat.\nA lamp that keeps its own opinion\nabout which hour it is.",
      "I write the numbers down in pencil\nso the night can correct me.\nIt always does.",
      "By morning the page is a grey field,\nand the bell has been counted\none time too many\nto be sure of."
    ],
    credit: 'The Wrong Script Studio',
    media: null,
    note: 'Original poem written for this project. Demonstration work, not a submission.'
  },
  {
    id: 'instructions-for-a-door',
    title: 'Instructions for a Door That Will Not Open',
    category: 'poetry',
    kind: 'text',
    medium: 'Poem',
    collection: 'Opening set',
    blurb: 'Four lines of advice, none of which is about the lock.',
    body: [
      "Do not lean on it.\nDo not knock in threes; it has heard threes.\nLeave the handle alone and stand\nwhere the light can find you.",
      "Some doors are not locked.\nThey are simply finished\nwith being looked at.",
      "If it opens while you are turned away,\nthat is between the two of you.\nDo not mention it."
    ],
    credit: 'The Wrong Script Studio',
    media: null,
    note: 'Original poem written for this project. Demonstration work, not a submission.'
  },
  {
    id: 'the-understudy-note',
    title: "The Understudy's Note",
    category: 'writing',
    kind: 'text',
    medium: 'Short prose',
    collection: 'Opening set',
    blurb: 'A note left in a dressing room for whoever plays the part next.',
    body: [
      "The dressing room smells of cold bulb and hairspray. There is a mirror with a strip of tape across one corner, and under the tape a note in pencil, folded twice.",
      "\"Whoever you are: the second act is not the problem. The second act is fine. It is the walk from the wings to the mark that gets people. Count four, not three. Three is the version where the audience can hear you thinking.",
      "The coat is heavier than it looks. Wear it for an hour before the house opens, or you will spend the whole scene apologising to your own shoulders.",
      "And when the light goes blue, that is not a cue, it is a mistake in the board. Keep going. Nobody has ever noticed, and I have been doing this for eleven years.",
      "If you find the ring, it is not mine. Leave it where it is.\"",
      "There is no signature. The pencil has been sharpened recently."
    ],
    credit: 'The Wrong Script Studio',
    media: null,
    note: 'Original short fiction written for this project. Demonstration work, not a submission.'
  },
  {
    id: 'the-booth',
    title: 'The Booth',
    category: 'illustration',
    kind: 'image',
    medium: 'Line illustration',
    collection: 'Opening set',
    blurb: 'A projection booth drawn in one continuous line, with the projector running to nobody.',
    body: [
      'One line, drawn without lifting the pen, which is why the cable loops the way it does. The booth has a projector, two reels, a small square window onto the auditorium, a stool and a coil of cable that goes nowhere because the line had to end somewhere.',
      'The window is the only bright shape. Everything else is outline on black, so the room reads as dark before it reads as a room, which is the correct order.',
      'Drawn for this project as a vector path at 800 by 560. No imported brushes, no scanned textures.'
    ],
    credit: 'The Wrong Script Studio',
    media: {
      src: '../assets/img/gallery/the-booth.svg',
      alt: 'A single-line drawing of a projection booth: a projector on a bench with two reels, a small bright square window, a stool, and a loose coil of cable trailing to the floor.',
      width: 800,
      height: 560
    },
    note: 'Demonstration work made for this project. Not a member submission.'
  },
  {
    id: 'cue-07-the-door-opens-twice',
    title: 'Cue 07: The Door Opens Twice',
    category: 'music',
    kind: 'score',
    medium: 'Written cue and score sketch, with supplied piano atmosphere',
    collection: 'Opening set',
    blurb: 'A two-minute cue described rather than recorded: three instruments, one repeated figure, and a door that opens twice.',
    body: [
      'There is still no recording of this cue. A supplied piano can be started below, but it is atmosphere for the room, not this piece. The project has no original recording of the cue yet, and a stock track with this project\u2019s name on it would be somebody else\u2019s work wearing the wrong label. What exists is the writing and the score sketch above.',
      'The cue is for the moment a door opens, closes, and opens again. Tempo 52, quietly, in A minor. Three instruments: a single sustained cello note held through all of it, a piano playing the same four-note figure fourteen times, and one struck bell at the two moments the door moves.',
      'The figure is D, E, F, E. It rises by a step, falls back, and never resolves, which is the point: the cue is not allowed to finish the thought. On the second opening the piano drops out entirely and only the cello and the bell remain, so the room sounds emptier after the door has been used than before it was.',
      'A recording would need three players and a quiet room. Until that exists, this is the honest version: the intention, written down.'
    ],
    credit: 'The Wrong Script Studio',
    media: {
      src: '../assets/img/gallery/cue-07.svg',
      alt: 'A hand-drawn score sketch: a five-line staff carrying a repeated four-note figure, with the marking pp and a tempo of 52 above it, and a bell cue marked at the right.',
      width: 800,
      height: 420
    },
    audio: {
      src: '../assets/media/audio/cinematic-piano.mp3',
      label: 'Play the piano',
      labelOn: 'Pause the piano',
      note: 'Supplied piano, 2 min 15 s, loops. Owner-uploaded; licence not yet verified (see assets/media/ASSET-CREDITS.txt). Atmosphere for the room, not a recording of Cue 07.'
    },
    note: 'Score sketch for the cue itself. The piano below is a separate supplied recording, not a recording of Cue 07. Nothing autoplays anywhere in the Gallery.'
  }
];
