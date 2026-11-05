# Round 027 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C2 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); `parallang.md` (Hub: "The
  players should be greeted by the game's philosophy", the statement, and the sub-note "Repetition should still be
  a structured element"); `prototype.md` Phase 4 ("Onboarding | Philosophy statement, tutorial encounter at Market
  Entrance"). The tutorial exists since round [009](../009/architecture.md).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `content/narration/onboarding.yaml`, `server/src/content-loader.js`, `server/src/learning-service.js`,
  `server/src/app.js`, `mobile/src/components/OnboardingPanel.js`, `mobile/src/stores/gameStore.js`,
  `mobile/src/components/Header.js`, `mobile/App.js`, `mobile/src/api/learning.js`, tests.

## Goal (pre-run)

A first-time player of the app sees the game's philosophy statement once, before the map, and enters the market
from it with one button. No LLM, prompt or encounter change; the web client is frozen and unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Critique by a Claude subagent instead of Codex**, which is at its usage limit until 20:35 UTC. A fresh
   general-purpose agent with read access to the repo and no access to my conclusions beyond the plan.
2. **The text is content**, `content/narration/onboarding.yaml`, shared by all packs, in English: the owner's
   statement verbatim as `statement`, and two authored `notes` kept apart from it (critique 5): one on the Spellbook's
   repetition (the owner's sub-note), one handing over to the archway in the words of the Market Entrance's own
   description.
3. **Seen once per device** (AsyncStorage `parallang.onboardingSeen`), not in the server save: no save-schema change.
   A reinstall shows it again. There is no way to reopen it yet (deferred).
4. **No live LLM runs:** no gameplay, prompt or content the LLM sees changes.

## Design (pre-run)

1. **Content.** `onboarding.yaml`: `title` ("Before you enter"), `statement` (owner, verbatim), `notes` (1–4
   authored strings), `begin_label` ("Enter the market"). Strict Zod schema; a missing or malformed file stops the
   content load, like the style guide. `loadGameContent` returns `onboarding: { title, statement, notes, beginLabel }`.
   - Notes: "One thing stays structured: repetition. The words you meet in conversation are written into your
     Spellbook, which brings them back for review when they are due." and "The Crumbling Market is through the
     archway, which has not decided which language it is in."
2. **Server.** `GET /api/onboarding` → `{ onboarding: { title, statement, notes, beginLabel } }`, no learner header.
   PARALLANG_TOKEN applies as to every `/api` route. The mobile client sends no token (true of every route today).
3. **Store** (`initialize`):
   - Read `parallang.onboardingSeen` before `createLearner` (critique 1).
   - If unseen, start `getOnboarding()` as its own promise with `.catch(() => null)`, never inside the
     `Promise.all`; await it after the `Promise.all` under the same epoch guard.
   - Apply world, spellbook, party and onboarding in one `set()`. Show `view: 'onboarding'` only if the statement
     arrived and the view is still `'map'` (critique 2: a player who opened the Spellbook during startup is not
     moved; the flag stays unset, so the next launch shows it).
   - `finishOnboarding()`: sets `view: 'map'` and clears `onboarding` first, then writes the flag, catching a
     failed write (critique 4). `returnView` stays `'map'`: the statement never leads into a dialogue (critique 9).
4. **App.** `OnboardingPanel` (heading with `role="heading"`, the statement, the notes, one primary button) when
   `view === 'onboarding'`; Header gets a `hideNav` prop that hides all its actions on that view (critique 7).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 86b4b39d…; a Claude subagent (decision 1); raw text in
`trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1 | Error | Ordering and failure handling contradict; a failing fetch inside `Promise.all` blocks startup | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 3 |
| 2 | Error | The onboarding view can replace a screen the player opened during startup | 0 | Accept in part: switch only from `'map'`; no new `'loading'` view (it would change every screen's start state) | **Accepted in part** (autonomous) | Design 3 |
| 3 | Error | Existing fakes would test only the swallowed failure path | 0 | Accept: fakes gain `getOnboarding` / the route; existing tests seed the flag; resets add `onboarding: null`; an App-level test | **Accepted** (autonomous) | Tests |
| 4 | Risk | A failed flag write could strand the player | 0 | Accept: view first, write after, caught; tested | **Accepted** (autonomous) | Design 3, Tests |
| 5 | Risk | Authored lines read as the owner's; "has opinions" is not in the location text | 0 | Accept: `statement` vs `notes`; note wording from the code and the location description; verbatim test | **Accepted** (autonomous) | Decision 2, Design 1, Tests |
| 6 | Risk | Token test only meaningful with `token: null`; mobile has no token support | 0 | Accept: explicit `token: null`; stated in Design 2 | **Accepted** (autonomous) | Design 2, Tests |
| 7 | Risk | Making Spellbook conditional changes every screen | 0 | Accept: explicit `hideNav` | **Accepted** (autonomous) | Design 4, Tests |
| 8 | Suggestion | Heading role, accessible button name, focus on mount, Dynamic Type | 0 | Accept in part: heading role and button name; focus and Dynamic Type go to the owner's Simulator check | **Accepted in part** (autonomous) | Design 4, Open items |
| 9 | Suggestion | Onboarding must never lead into a dialogue | 0 | Accept: comment and test on `returnView` | **Accepted** (autonomous) | Design 3, Tests |
| 10 | Suggestion | Missing tests: epoch, dedupe, missing file, strict keys, both packs | 0 | Accept | **Accepted** (autonomous) | Tests |

Net change: the onboarding fetch is isolated from startup, the view switch is guarded, the owner's text and the
authored notes are separate fields, the header hides its nav explicitly, and the tests cover the success path.

## Tests (pre-run)

- Server (`server/test/onboarding.test.js`): loads in `it` and `es`; `statement` equals the `parallang.md` quote
  byte for byte; the loader rejects a missing file, empty notes, an empty title, an unknown key, a missing label;
  `GET /api/onboarding` returns the content; with `token: null` it is 401.
- Mobile store: first launch shows `'onboarding'` and calls `getOnboarding` once across duplicate `initialize`
  calls; the flag set → straight to the map, `getOnboarding` not called; a failing `getOnboarding` → map, no error;
  view moved during startup → not replaced; `finishOnboarding` writes the flag, `returnView` stays `'map'`; a
  rejecting `setItem` still reaches the map; a superseded `initialize` does not set `onboarding`.
- Mobile App: the panel renders the statement, the header's Spellbook button is absent, the button shows the map.
- Existing fakes seed the flag or serve the route. Full suites: server, mobile, web client and build; expo-doctor;
  iOS export.
- Not here: the screen in the iOS Simulator (layout, scrolling, VoiceOver focus, Dynamic Type) → owner.

## Amendment 1 (2026-11-05): Second opinion rows renumbered for the log check

The pre-run table numbers critique 1's findings 1–10; `tools/round_log_check.py` expects `1.n`. The same rows with
the check's ids, unchanged in substance (dispositions are autonomous, pending owner review):

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Startup ordering and failure handling | 0 | Accept | **Accepted** (autonomous) | Design 3 |
| 1.2 | Error | Onboarding view replaces a screen opened during startup | 0 | Accept in part | **Accepted in part** (autonomous) | Design 3 |
| 1.3 | Error | Fakes test only the swallowed failure path | 0 | Accept | **Accepted** (autonomous) | Tests |
| 1.4 | Risk | Failed flag write strands the player | 0 | Accept | **Accepted** (autonomous) | Design 3 |
| 1.5 | Risk | Authored lines read as the owner's | 0 | Accept | **Accepted** (autonomous) | Design 1 |
| 1.6 | Risk | Token test; mobile sends no token | 0 | Accept | **Accepted** (autonomous) | Design 2 |
| 1.7 | Risk | Header change affects every screen | 0 | Accept | **Accepted** (autonomous) | Design 4 |
| 1.8 | Suggestion | Accessibility | 0 | Accept in part | **Accepted in part** (autonomous) | Design 4, Open items |
| 1.9 | Suggestion | Never into a dialogue | 0 | Accept | **Accepted** (autonomous) | Design 3 |
| 1.10 | Suggestion | Missing tests | 0 | Accept | **Accepted** (autonomous) | Tests |

## Outcome (2026-11-05)

Built as designed. A first launch of the app shows "Before you enter" (the owner's statement verbatim, two authored
notes, "Enter the market"); the button opens the map and the flag keeps it from showing again on that device. A
failed fetch or flag write never blocks play. Server 138/138 (3 new), mobile 45/45 (8 new), web client 12/12 and
build, expo-doctor 20/20, iOS export ok. Not checked in the iOS Simulator. See [findings](findings.md).
