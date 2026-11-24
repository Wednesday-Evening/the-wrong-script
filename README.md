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

## Running it

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The Lobby is at `/`, the film at `/film/`.
Opening `film/index.html` directly from disk also works, because the film carries
its own styles and scripts inline.

## Phase status

- **Phase 1 (done):** the Lobby, and a working way into the original film.
- **Reserved:** The Stories, The Arcade, The Gallery, The Social Room, The Archive
  and The Creator Studio. Each has a card that states its state. None of them is a
  button that pretends to work.

## Adding a destination in a later phase

1. Build the experience in its own folder, for example `stories/index.html`.
2. In `index.html`, give that card a real `href` and change its status line.
3. In the navigation, drop the `Soon` badge and point the link at the new folder.

No part of the Lobby needs to be restructured to make room for it.

## The original film

Unchanged from the recovered source: same scenes, same dialogue, same three
puzzles, same three endings, same post-credits scene and replay.

Progress is saved in the browser under the `tws` key. The Lobby reads that key to
offer a way back and never writes to it, so existing saves keep working. Because
the film moved from `/index.html` to `/film/index.html` on the same origin, any
save made before the move is still found.

## Publishing

Static hosting only. On GitHub Pages: Settings, then Pages, and deploy from the
branch that holds these files (currently `appjet`).

No accounts, no personal data, no analytics and no third-party requests.
