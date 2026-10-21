# Eulenbach DM-Helfer

Single-file HTML tool (offline, double-click `file://` in Chrome or Edge, no server, no account) for the adventure „Die Laterne von Eulenbach“ (D&D 2024, level 1, five players aged 13–15; Lu is the game master, Realschule BW). It is DM helper, virtual tabletop (VTT), soundboard and beamer window in one. UI language: German, informal („Du“, „Heldinnen“). Code, identifiers and comments: English.

## Read first
- `HANDOFF_ClaudeCode.md`: the job description with requirements A to G (each with an acceptance check) and the known risks. Tick them off with a test.
- `docs/roadmap.md`: decisions made with the user and what was fixed when. Stay within the handoff unless asked.
- `ref/`: `eulenbach_dm_helfer_v5.html` is the original (adventure texts and combat logic, **never change the texts or rule values**), `Design-Handoff_original.md`, `movement-and-scale.md`, `scenes-and-media.md`.

## Structure
- `src/` holds the sources, `build.py` joins `ref/eulenbach_dm_helfer_v5.html` + `src/` + `assets/` into `Eulenbach_DM-Helfer_2.0.html` (the file Lu opens). Edit `src/`, then `python3 build.py`; commit the built file too.
- One IIFE: the v5 code (scenes, combat `C`, `HEROES`, `MON`, `ENC`, inventory, dice) plus the modules `m1_store.js` (state, IndexedDB, map models, built-in maps), `m2_audio.js` (Web Audio), `m3_render.js` (drawing code shared with the beamer), `m4_player.js` (beamer window and sync), `m5_vtt.js` (Spieltisch), `m6_glue.js` (scene bar, sound view, preparation, export/import, keys, boot). `EV` holds the hooks into v5; `build.py` patches six places of the v5 script (see its `patch()` calls).
- Storage: localStorage `eulenbach3-*` (`v2` settings and scene setup, `maps` grid/fog/figures, v5 keys), IndexedDB `eulenbach-v2` store `blobs` (images and sounds).
- Beamer: the same file opened with `#beamer`. `build.py` patches an early `return` into the v5 script (nothing of the DM runs there); on `load` the page replaces itself with `playerDoc()`. DM and beamer talk only by `postMessage` (`app: 'eulenbach-dm' | 'eulenbach-beamer'`; the beamer sends `alive` every 2 s with the `sid` of the DM page it last heard; a different `sid` makes the DM resend everything). `evFogApply`/`evBuildFog`/`evDrawMap` are copied into the beamer as text with `toString()`: they must not use anything from the surrounding scope. `playerCss()`/`lampSvg()` are functions, not `var`s, because the `#beamer` branch returns before later `var` lines run.
- Maps: built-in sketches are SVGs rastered with the grid and the DM layer removed (`builtinRaster`); markers of the sketch are tagged `dm`. A map without grid still gets figures (`ras.cell`, a virtual square). Fog is an op list per map (`all`, rectangle, brush); every change is an op so it can be undone.
- Sound: buses music/atmo/fx → master → soft limiter → destination. Music beds (`MOODS`, `musicBed`) are synthesised; atmosphere slots keep empty entries (`''`) so a slot does not move.
- Tests: `tests/cases/NN-*.cjs`, helpers in `tests/helpers.cjs`, generated files in `tests/fixtures.cjs`, pixel contrast in `tests/contrast.cjs` (axe cannot judge gradients). Test names start with the requirement id (A1, B5 …).

## Rules
- Do not change the look: colour roles (forest green primary, wine red only danger/enemies, ember orange only light/fire/lantern, gold ornament, **no blue**), the font stack and the leather-and-parchment ornament style.
- Everything works offline from `file://`: no network requests, no external fonts, no CDN. Console must stay free of errors.
- Nothing from the DM layer (`.dm` groups, hidden figures, traps, hidden enemies) may ever reach the beamer. Check with a beamer screenshot after touching maps, figures or state.
- Do not rely on property access between the DM window and the beamer window (`window.__x`): after a reload the two pages are different origins. Messages (`postMessage`) only.
- Text colours must stay WCAG AA on the real picture (`tests/contrast.cjs` is part of `npm test`). Change the tokens in `assets/tokens.css`, not single rules.
- Destructive buttons ask by tapping twice, no confirm dialogs. Touch and pen work through pointer events.
- Keys (tokens, AI keys etc.) do not exist here; the project data stays on the device.

## Commands
- `python3 build.py` builds `Eulenbach_DM-Helfer_2.0.html`.
- `npm run check` builds and runs `node --check` on the script (about a second).
- `npm test` runs the Playwright suite in `tests/` against the built file (Chromium at `/opt/pw-browsers` in the cloud; `npm ci` first). It is the regression test for the requirements in the handoff.
- Visible changes: build, open with Playwright, look at the screenshot (scratchpad, never in the repo). The beamer is a second page: `ctx.waitForEvent('page')` on click.

## How we work here
- Work on the branch the session names, else `claude/<topic>`. Never commit to `main`; pull requests only when the user asks.
  The repository's default branch is `claude/gifted-dirac-u824z0`, not `main`.
- Check with `npm run check` and `npm test`; bugs get a test that fails before the fix.
- The `Co-Authored-By:` trailer names the model that wrote the commit; no other commit text names a model.
- Decisions made with the user and the reasons go to `docs/roadmap.md`.
