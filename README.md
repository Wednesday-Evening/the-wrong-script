# THE WRONG SCRIPT

An evolving digital universe of stories, games, creative experiences and community.

Plain HTML, CSS and vanilla JavaScript. No framework, no bundler, no backend, no
external assets. The whole thing is a static site.

## What is in here

| Path | What it is |
| --- | --- |
| `index.html` | The Lobby. The platform home and the first thing a visitor sees. |
| `assets/css/lobby.css` | Lobby styling. Carries the film's palette so both feel like one place. |
| `assets/js/lobby.js` | Lobby behaviour: small-screen navigation, the saved-film strip, the header edge. |
| `film/index.html` | The original interactive film. Self-contained and preserved. |
| `stories/index.html` | The Stories: the library page. |
| `assets/css/stories.css` | The Stories' own identity, plus the reader layout. Loaded after `lobby.css`. |
| `assets/js/stories-index.js` | The catalogue: one record per published story. Data only. |
| `assets/js/stories-library.js` | Draws the shelf, and chooses Begin or Continue per story. |
| `assets/js/story-engine.js` | The reader: scenes, choices, saves, endings, browser history. |
| `stories/data/the-ninth-bell.js` | *The Ninth Bell*, written as data: scenes, lines, choices, endings. |
| `stories/the-ninth-bell/index.html` | The reading page for *The Ninth Bell*. |
| `stories/data/the-returns-hatch.js` | *The Returns Hatch*, written as data: three looks, five endings. |
| `stories/the-returns-hatch/index.html` | The reading page for *The Returns Hatch*. |
| `arcade/index.html` | The Arcade: the library page. |
| `assets/css/arcade.css` | The Arcade's identity, plus the SIGNAL PATH board, pad and side panel. Loaded after `lobby.css`. |
| `assets/js/arcade-shell.js` | The Arcade's small-screen navigation, wired like the Lobby's. |
| `assets/js/arcade-games.js` | The cabinet: one record per finished game. Data only. |
| `assets/js/arcade-library.js` | Draws the cabinet from that catalogue. |
| `assets/js/signal-path-core.js` | SIGNAL PATH's rules and save validation. No DOM, no storage, no timers. |
| `assets/js/signal-path.js` | SIGNAL PATH's page: board, controls, saves, reset. |
| `arcade/data/signal-path-levels.js` | The six SIGNAL PATH levels, written as data. |
| `arcade/signal-path/index.html` | The SIGNAL PATH page. |
| `arcade/data/lamplight-levels.js` | The six LAMPLIGHT rooms, written as data. |
| `arcade/lamplight/index.html` | The LAMPLIGHT page. |
| `gallery/index.html` | The Gallery: the exhibition page. |
| `assets/css/gallery.css` | The Gallery's own identity: the wall, the frames, the filters, the exhibit panel. Loaded after `lobby.css`. |
| `assets/js/gallery-exhibits.js` | The collection: six categories and eight exhibits. Data only. |
| `assets/js/gallery.js` | Draws the wall and the filters, and opens an exhibit from its link or the address bar. |
| `assets/img/gallery/*.svg` | The Gallery's artwork, drawn for this project. Local SVG, no external assets. |
| `social-room/index.html` | The Social Room: four curated boards, read-only. |
| `assets/css/social-room.css` | The Social Room's own identity: the boards, the jump list, the note. Loaded after `lobby.css`. |
| `assets/js/social-room-content.js` | The four boards, written as data. Data only. |
| `assets/js/social-room.js` | Draws the boards, the jump list and the deep links. No storage, no network. |
| `archive/index.html` | The Archive: completed files, collections, discoveries and the record. |
| `assets/css/archive.css` | The Archive's own identity: the file cards, the collection shelves, the record. Loaded after `lobby.css`. |
| `assets/js/archive-content.js` | The catalogue, written as data: three files, three collections, eight discoveries. Data only. |
| `assets/js/archive.js` | Draws the catalogue, the jump list, the closed spoiler disclosures and the deep links. No storage, no network. |
| `creator-studio/index.html` | The Creator Studio: the desk, the five formats, the standard, the review route and the honest list of what is not built. |
| `assets/css/creator-studio.css` | The Studio's own identity: numbered drawers, gold counters, the review line. Loaded after `lobby.css`. |
| `assets/js/creator-studio-content.js` | Every word the Studio says, written as data. Data only. |
| `assets/js/creator-studio.js` | Draws the five parts from that data. No storage, no network, no forms. |
| `tools/verify-signal-path.js` | Development check: solves every level, exercises the rules and the save reader. |
| `tools/verify-gallery.js` | Development check: validates the collection, the artwork on disk and the Gallery's isolation from other rooms' saves. |
| `tools/verify-social-room.js` | Development check: validates the boards, every destination link on disk, and the room's isolation from storage. |
| `tools/verify-archive.js` | Development check: validates the catalogue, every link and Gallery deep link, the spoiler containment, and the Archive's isolation from storage. |
| `tools/verify-archive-ui.cjs` | Development check: drives all nine routes in Chromium at 390px and 1280px, and checks the disclosures, deep links, focus, reduced motion and save isolation. |
| `tools/verify-creator-studio.js` | Development check: validates the Studio's content shape, every link on disk, and its isolation from storage and the three save keys. |
| `tools/verify-creator-studio-ui.cjs` | Development check: drives all ten routes in Chromium at 390px and 1280px, and checks the five parts, the jump links, focus, reduced motion and save isolation. |

## Running it

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The Lobby is at `/` and the film at `/film/`.
The rooms are `/stories/`, with *The Ninth Bell* at `/stories/the-ninth-bell/` and
*The Returns Hatch* at `/stories/the-returns-hatch/`; `/arcade/`, with SIGNAL PATH
at `/arcade/signal-path/` and LAMPLIGHT at `/arcade/lamplight/`; then `/gallery/`,
`/social-room/`, `/archive/` and `/creator-studio/`.
Opening `film/index.html` directly from disk also works, because the film carries
its own styles and scripts inline. The Stories pages need to be served over HTTP
(they load shared CSS and JavaScript by relative path, which is also how they
deploy).

## Phase status

- **Phase 1 (done):** the Lobby, and a working way into the original film.
- **Phase 2 (done):** The Stories. A library at `/stories/` and one complete
  original story, *The Ninth Bell*. The film is untouched in content, and gained
  Back/Forward support plus defensive save reading.
- **Phase 3 (done):** The Arcade. A library at `/arcade/` and one complete game,
  SIGNAL PATH, with six handcrafted levels and its own save key.
- **Phase 4 (done):** The Gallery. An exhibition at `/gallery/` with six
  categories and eight demonstration exhibits, all made for this project and
  credited to The Wrong Script Studio. Browsing only: no accounts, no uploads,
  no submissions.
- **Phase 5 (done):** The Social Room. A read-only room at `/social-room/` with
  four boards: the Noticeboard, the Open Questions, the Gathering Board and
  What's Happening. Curated studio writing only. No accounts, no posting, no
  comments, no reactions, no storage.
- **Phase 6 (done):** The Archive. A catalogue at `/archive/` with three completed
  experiences, three curated collections, eight verified discoveries and a short
  record of what the Archive keeps. Read-only, curated, and it does not read
  anyone's saved progress.
- **Phase 7 (done):** The Creator Studio. A read-only desk at `/creator-studio/`
  with five parts: the Desk, the five Formats, the Standard, the Review Process
  and Not Yet. No accounts, no uploads, no submissions, no forms and no storage;
  the page says so rather than implying otherwise.
- **Phase 8 (verification only):** a Chromium pass over every route at 390px and
  1280px, keyboard focus, Archive Back/Forward, reduced motion and storage
  isolation. Firefox, WebKit, physical phones and assistive technology could not
  run in that environment and are recorded as gaps, not as passes, in
  `reports/PHASE-8-VERIFICATION-HANDOVER.txt`.
- **Phase 9 (done):** depth, added through the patterns that already existed. A
  second story, *The Returns Hatch* (three looks, five endings, its own save key),
  and a second game, LAMPLIGHT (six mirror rooms, its own save key). No story or
  arcade engine was rewritten: both are new data plus a new page. DEF-01 and
  DEF-03 touch-target findings are fixed, and four verification tools are under
  `tools/`.

## The Stories

The library is a shelf, not a shop window. `assets/js/stories-index.js` holds one
record per story, and a record only appears if `status` is `live`, which is
reserved for stories that can be read from beginning to end. There are no ratings,
reviews, reader counts or member activity, because none of those things exist.

Adding a story in a later phase:

1. Write the story as a data file under `stories/data/`, following the shape of
   `the-ninth-bell.js`: `slug`, `title`, `start`, `budget`, `endings`, `scenes`.
2. Add a record to `assets/js/stories-index.js` with `status: 'live'` and the
   story's own `saveKey`.
3. Add `stories/<slug>/index.html`, copying the reading page and swapping the two
   script tags.
4. Add its own CSS only if the identity needs it; the reader styles are shared.

### The reader contract

Each scene has `chapter`, `title`, `lines`, optional `choices`, and optionally
`ending: { name, kind }`. A line is either a string (narration) or `[speaker,
text]` (dialogue). A choice has `label`, optional `note`, `to`, optional `set`
(flags to raise), optional `requires` (flags that must be raised for it to appear),
and optional `visit` (a counter to increment). The engine resolves everything, so
story files contain no HTML and no DOM code.

### Saves

Each story saves under its own namespaced key, for example
`wrong-script.story.the-ninth-bell.v1`, plus a separate key for the endings that
have been found. **No story code reads, writes or clears `tws`.** Every save is
validated when read: wrong shape, unknown scene or a mismatched slug is treated as
"no save" rather than being half-applied, and an invalid value is never written
over a valid one.

## The Arcade

One room, one cabinet, one finished game. `assets/js/arcade-games.js` holds one
record per game and a record is only drawn when it is marked `live`, so the
library cannot show a game that does not work. There are no scores, no player
counts, no leaderboards and no placeholder cards.

**SIGNAL PATH** is a grid puzzle: walk a signal unit from its start cell to the
beacon, collecting every fragment first. Six handcrafted levels, arrow keys or
WASD, an on-screen pad for touch, restart and undo. No timer, no lives, no
failure state.

### Adding a game in a later phase

1. Put the levels in a data file under `arcade/data/`.
2. Add the rules as a DOM-free module under `assets/js/`, so it can be checked
   without a browser.
3. Add `arcade/<slug>/index.html` and a page script that draws it.
4. Add a record to `assets/js/arcade-games.js` with its own `saveKey`.

The level format for SIGNAL PATH is a list of rows: `#` wall, `.` floor, `S`
start, `B` beacon, `*` fragment. Levels are drawn by hand, never generated.

### Saves

SIGNAL PATH saves under `wrong-script.arcade.signal-path.v1`, and stores only
`{ v, unlocked, completed, best }`. It does not read, write or clear `tws` or
`wrong-script.story.the-ninth-bell.v1`. A save is validated on read: an unknown
version, a wrong shape or out-of-range numbers are treated as "no save" in
memory, and the stored value is left exactly as it was until the player chooses
"Reset progress". Progress never leaves the browser and does not sync.

## The Social Room

The Social Room is a reading room, not a feed. `assets/js/social-room-content.js`
holds four boards as data and `assets/js/social-room.js` draws them; the page has
no forms, no buttons beyond the small-screen nav toggle, and no way to write
anything. Everything on the boards is written by The Wrong Script Studio, and
every entry says what kind of writing it is.

What the boards are:

- **The Noticeboard** - studio notices and universe updates.
- **The Open Questions** - prompts to carry around, each tied to a room.
- **The Gathering Board** - invitations and ideas, labelled as such. Nothing is
  running and nobody has joined anything.
- **What's Happening** - a short listing. The labels (`Open now`,
  `In preparation`) are editorial states, not live event data, and there are no
  dates, deadlines or attendance figures.

### Adding a board entry

Add an object to the relevant area's `entries` in
`assets/js/social-room-content.js`: `id`, `kind`, `title`, `body` (an array of
paragraphs), optional `note`, and an optional `link: { label, href }` pointing at
a real destination. Ids double as deep links (`/social-room/#<id>`), so keep them
unique. `node tools/verify-social-room.js` checks the shape, the ids and that
every link exists on disk.

### No storage

The room has no save key and needs none. Nothing here reads, writes or clears
`tws`, `wrong-script.story.the-ninth-bell.v1` or
`wrong-script.arcade.signal-path.v1`, and there is no member account, post,
comment, reaction, message or upload to persist. Community participation is not
available yet, and the room says so instead of implying otherwise.

## The Archive

The Archive is the universe keeping its records: a curated, read-only catalogue at
`/archive/`, not a progress tracker. `assets/js/archive-content.js` holds the whole
catalogue as data and `assets/js/archive.js` draws it; the page has no forms and no
way to write anything.

Four parts, each doing a different job:

- **Completed Files** - the three experiences with a real conclusion: *The Ninth
  Bell*, *The Wrong Script: Original Production* and SIGNAL PATH. The film is
  filed as its own room, not as a Stories entry.
- **Collections** - three editorial groupings of existing work: Choices and
  Consequences, Close Observation, and Rooms and Doors. Every entry links to the
  room and exhibit it names.
- **Discoveries** - eight details worth walking back for, each grounded in the
  implementation. Anything that would give away an ending sits inside a closed
  `<details>` disclosure whose summary begins with the word "Spoiler".
- **The Record** - a short explanation of what the Archive keeps and why.

### No storage, no progress tracking

The Archive has no save key and needs none. It does not read, write or clear
`tws`, `wrong-script.story.the-ninth-bell.v1` or
`wrong-script.arcade.signal-path.v1`, and it does not work out what a particular
visitor has finished. Every entry is useful on a first visit.

### Adding an entry

Add an object to `files`, `collections` or `discoveries` in
`assets/js/archive-content.js`. Ids double as deep links (`/archive/#<id>`), so keep
them unique; collections use `collections/#<collection-id>`. A discovery that gives
anything away takes a `spoiler: { summary, body }` and is then rendered closed.
`node tools/verify-archive.js` checks the shape, the counts, that every link exists
on disk and that every Gallery deep link names a real exhibit.

## The Creator Studio

The Studio is the room that faces the other way: instead of holding finished work,
it describes how work would be made here. It is at `/creator-studio/` and it is
read-only. `assets/js/creator-studio-content.js` holds every word as data and
`assets/js/creator-studio.js` draws it.

Five parts, each doing a different job:

- **The Desk** - why the room exists, and the rule it is built on: people should be
  able to help build this world, and the standard should be visible before the
  invitation is.
- **The Format** - the five shapes work arrives in (stories and writing, games and
  interactive experiences, visual art and design, music and sound, experiences and
  collaborations), each with what that format asks of a contribution.
- **The Standard** - seven principles a piece would be measured against, from
  originality and a teenage audience through to privacy and review before
  publication.
- **The Review Process** - Draft, Submitted, Under Review, Changes Requested or
  Approved, Published, plus the two other outcomes: Rejected and Unpublished.
- **Not Yet** - accounts, uploads, submissions, collaborative tools and any
  publication date, stated plainly as absent.

### No storage, no forms, nothing to submit

The Studio has no save key and needs none. It does not read, write or clear `tws`,
`wrong-script.story.the-ninth-bell.v1` or
`wrong-script.arcade.signal-path.v1`. The page has no form, no input, no upload
control and no button other than the small-screen navigation toggle, and nothing on
it pretends to accept work. `node tools/verify-creator-studio.js` checks the content
shape, every link on disk, and that the room's code contains no storage, cookie or
network call.

### When contributions open

Nothing here needs redesigning for that. Add the account and submission layer
behind it, keep the standard and the review route as written, and replace the Not
Yet list with the real state of each item.

## The original film

Unchanged in content from the recovered source: same scenes, same dialogue, same
three puzzles, same three endings, same post-credits scene and replay.

Two small additions in Phase 2, both non-visual:

- **Back/Forward.** The current scene is mirrored in the URL hash, with one history
  entry per scene transition. Going back returns to the previous scene instead of
  leaving the film. Story and puzzle state are untouched.
- **Defensive save reading.** `tws` is validated before use. A save from an earlier
  build loads normally (no version field is required). Unreadable data is copied to
  `tws.corrupt` and then ignored, and the title card says so, so a broken save is
  never silently destroyed.

Progress is saved in the browser under the `tws` key. The Lobby reads that key to
offer a way back and never writes to it, so existing saves keep working. Because
the film moved from `/index.html` to `/film/index.html` on the same origin, any
save made before the move is still found.

## Publishing

Static hosting only. On GitHub Pages: Settings, then Pages, and deploy from the
branch that holds these files (currently `appjet`).

No accounts, no personal data, no analytics and no third-party requests.
