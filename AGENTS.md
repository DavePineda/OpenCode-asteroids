# AGENTS.md

Vanilla JS Asteroids clone. No framework, no bundler, no package.json, no tests, no lint — do not add any.

## Run / verify

- Open `index.html` directly in a browser, or `npx serve .` then visit `http://localhost:3000`.
- There is no build/test/lint step. Verify changes by loading the page in a browser (check DevTools console for syntax errors).

## Structure

- `game.js` — all game logic and rendering in one file, loaded via `<script src="game.js">` in `index.html`. Top-level code at the bottom boots the game (`initGame(); requestAnimationFrame(loop);`).
- `index.html` — canvas is hardcoded to `800x600`; `W`/`H` constants in `game.js` must stay in sync with it.
- `favicon.svg` — favicon only.

## Conventions

- Everything lives in module-level globals (classes + `let` state vars); there is no `import`/`export`.
- Use `'use strict'` and ES6+ (`class`, arrow functions, template literals) like the existing code.
- Input uses `e.code` values (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`).
- `update(dt)` is time-based; `dt` is clamped to `0.05` in the loop — keep gameplay tuned to real seconds.
- User-facing strings (HUD, overlays) are in Spanish (`SCORE`, `NIVEL`, `GAME OVER`); README is Spanish. Match that.
- Code is organized with section comments like `// ── Input ──...` — follow the existing style.
