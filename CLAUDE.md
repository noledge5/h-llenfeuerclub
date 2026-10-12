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
- Beamer: see `docs/roadmap.md` for how the second window connects. `evFogApply`/`evBuildFog`/`evDrawMap` are copied into the beamer as text with `toString()`: they must not use anything from the surrounding scope.

## Rules
- Do not change the look: colour roles (forest green primary, wine red only danger/enemies, ember orange only light/fire/lantern, gold ornament, **no blue**), the font stack and the leather-and-parchment ornament style.
- Everything works offline from `file://`: no network requests, no external fonts, no CDN. Console must stay free of errors.
- Nothing from the DM layer (`.dm` groups, hidden figures, traps, hidden enemies) may ever reach the beamer. Check with a beamer screenshot after touching maps, figures or state.
- Do not rely on property access between the DM window and the beamer window (`window.__x`): after a reload the two pages are different origins. Messages (`postMessage`) only.
- Destructive buttons ask by tapping twice, no confirm dialogs. Touch and pen work through pointer events.
- Keys (tokens, AI keys etc.) do not exist here; the project data stays on the device.

## Commands
- `python3 build.py` builds `Eulenbach_DM-Helfer_2.0.html`.
- `npm run check` builds and runs `node --check` on the script (about a second).
- `npm test` runs the Playwright suite in `tests/` against the built file (Chromium at `/opt/pw-browsers` in the cloud; `npm ci` first). It is the regression test for the requirements in the handoff.
- Visible changes: build, open with Playwright, look at the screenshot (scratchpad, never in the repo). The beamer is a second page: `ctx.waitForEvent('page')` on click.

## How we work here
- Standard flow for anything beyond a one-line fix: plan with success criteria → branch → test first (`/tdd`, bugs through `/diagnose`) → `npm run check` and `npm test` → `reviewer` agent and `/ponytail-review` → commit and push.
- Branch: work on the branch the session names, else `claude/<topic>`. Never commit to `main`; pull requests only when the user asks.
- Commit trailer: `Co-Authored-By:` names the model that wrote the commit; the `Claude-Session:` line stays. No other commit text names a model.
- Decisions made with the user and the reasons go to `docs/roadmap.md`; new structure and conventions into this file.

<!-- how-we-work:start -->
## How we work

Source: `noledge5/based` (`templates/how-we-work.md`). Set up or refresh a repo with the skill `setup-our-workflow`. Change this text there, not per repo; project-specific rules go in the repo's own CLAUDE.md.

The user decides and reviews; Claude does the work like a team of fast developers. The user is a teacher, not a professional developer: talk plainly and briefly, no jargon without a word of explanation. Tokens cost the user money: work in this one session; no parallel subagents or workflows unless the user asks for them.

### Missing tools? Set them up yourself
The skills and the `reviewer` agent named below come from `noledge5/based`. If any of them is missing in this session, don't work around it and don't ask; fetch them:
1. Get `noledge5/based`: in a cloud session `add_repo` (owner `noledge5`, repo `based`, access `read`), otherwise `git clone https://github.com/noledge5/based`. Clone it outside the project, e.g. `/home/user/based`.
2. Follow `skills/setup-our-workflow/SKILL.md` from that clone for the current repository, on the task branch.
3. Copied skills load from the next session on. Until then, read a skill's `SKILL.md` from the clone when it is needed, and run the reviewer as a subagent with `templates/agents/reviewer.md` as its instructions.

If writing `.claude/` is blocked (Auto mode), say so in one line and ask the user to switch to "Accept edits".

### Principles
1. **Understand, then align.** Read the code and docs the task touches before deciding anything. Goal unclear or big → `/grill-me` (or `/grill-with-docs` where the repo keeps `CONTEXT.md`). Decisions that are the user's (what they will see or notice, scope, money, data): ask once, with a recommendation. Everything else: decide and move on.
2. **Plan with success criteria.** Before code: which files, what stays out, and criteria that can be checked (a test passes, a screen looks like X). Larger work: `/to-prd`, then `/to-issues` in vertical slices.
3. **Lazy senior developer (`/ponytail`, level full).** Simplest thing that works: does it need to exist → already in the repo → standard library → platform feature → installed dependency → one line → only then the minimum code. No abstractions, config or scaffolding nobody asked for; deletion over addition. Never simplify away input validation, protection against data loss, security, accessibility or anything the user asked for. Deliberate shortcuts get a `ponytail: <limit>, <when to upgrade>` comment.
4. **One task, one branch.** Never commit to `main`. Pull requests only when the user asks; the user merges.
5. **Feedback loops.** Logic test-first (`/tdd`, red → green → refactor). Bugs through `/diagnose` (reproduce, root cause, regression test). Run the repo's checks (typecheck, tests, build) before calling anything done; anything visible gets a real screenshot (Playwright, Chromium in `/opt/pw-browsers` in the cloud).
6. **Review before every push.** The `reviewer` agent for bugs and the project's rules, `/ponytail-review` for needless code. Fix what traces to a real failure or a real cut; say why the rest stays.
7. **Memory.** The repo's CLAUDE.md is living: add what a task taught (a rule, a pitfall, a correction from the user) in the same commit, delete what is no longer true, keep it short. Decisions and their reasons go to `docs/adr/` or the repo's decision log; shared terms to `CONTEXT.md`. When Claude notices something repeating (the same explanation, steps or check), it says so and suggests a skill, an integration or an automatic check, in one line with what it would save; the user decides, nothing is built unasked.
8. **Report.** A few plain sentences: what changed, how it was checked, what the user should look at.

### Which skill when
| Situation | Skill |
|---|---|
| Unclear idea, plan to stress-test | `/grill-me`, `/grill-with-docs` |
| Big feature to break down | `/to-prd` → `/to-issues`, incoming issues: `/triage` |
| Any coding | `/ponytail` (always on, level full) |
| New logic, bug fix with a test | `/tdd` |
| Something broken or slow | `/diagnose` |
| Unfamiliar code | `/zoom-out` |
| Before pushing | `reviewer` agent + `/ponytail-review` |
| Every few weeks | `/improve-codebase-architecture`, `/ponytail-audit`, `/ponytail-debt` |
| Something repeats | suggest it first; on a yes `/write-a-skill` |
| User wants it shorter | `/caveman` |

In the cloud there is no `gh` CLI: skills that use the issue tracker work through the GitHub MCP tools instead.
<!-- how-we-work:end -->
