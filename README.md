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

## Running it

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The Lobby is at `/`, the film at `/film/`, the
library at `/stories/` and the first story at `/stories/the-ninth-bell/`.
Opening `film/index.html` directly from disk also works, because the film carries
its own styles and scripts inline. The Stories pages need to be served over HTTP
(they load shared CSS and JavaScript by relative path, which is also how they
deploy).

## Phase status

- **Phase 1 (done):** the Lobby, and a working way into the original film.
- **Phase 2 (done):** The Stories. A library at `/stories/` and one complete
  original story, *The Ninth Bell*. The film is untouched in content, and gained
  Back/Forward support plus defensive save reading.
- **Reserved:** The Arcade, The Gallery, The Social Room, The Archive and The
  Creator Studio. Each has a card that states its state. None of them is a button
  that pretends to work.

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
