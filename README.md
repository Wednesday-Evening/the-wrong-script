# THE WRONG SCRIPT
An interactive motion picture. Single self-contained file: `index.html` (no build step, no external assets, no accounts).

## Run locally
Double-click `index.html`, or serve the folder: `python3 -m http.server` then open http://localhost:8000

## Publish on GitHub Pages
1. Create a new GitHub repository and upload `index.html` (and this README).
2. Repo Settings -> Pages -> Source: "Deploy from a branch" -> Branch: main, folder: / (root) -> Save.
3. After a minute the game is live at https://YOUR-USERNAME.github.io/REPO-NAME/

## Notes
- Progress saves in the browser (localStorage); the game still works if storage is blocked.
- Sound is off by default and uses a small generated tone only (no audio files).
- Scene art is CSS gradients plus emoji, so it looks slightly different per device. Replace with SVG/images if desired.
