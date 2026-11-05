# Round 029 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C1 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); `prototype.md` Phase 4
  ("Forced repetition | Pre-encounter vocabulary review (Spellbook drill before boss fights)"); `parallang.md`
  ("Also FORCE repetition according to optimal guidelines"); rounds [015](../015/architecture.md) (Errata reviews
  the market's words) and [017](../017/architecture.md) (no reviews during an encounter).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** both packs' `the_rift_errata.yaml`, `server/src/content-loader.js`, `server/src/learning-service.js`,
  `server/scripts/play-market.js`, `mobile/src/components/MapPanel.js`, `mobile/App.js`, tests.

## Goal (pre-run)

Before the player first fights Errata, the Spellbook makes them review the Rift's words that SM-2 says are due, at
most one card per answer slot. Deterministic; no LLM or prompt change.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC), as in rounds 027–028.
2. **One card per required target group** (critique 1.1, 1.7): the Rift has six groups (a coffee, a meat, stop,
   now, "my name is", Nobody), so a drill has at most six cards, not 15–17 interchangeable ones.
3. **Before the first fight only:** a completed Rift is not drilled again (its replays are optional).
4. **The server owns the drill**; the app shows what the server computed. The drill lives in the spellbook snapshot,
   which every review response returns, so the count is never stale (critique 1.1).
5. **No live LLM runs** in this round; the tour script gains a drill step, checked offline, and the live tour is
   queued with round 026's.

## Design (pre-run)

1. **Content.** `drill_before: true` on `the_rift_errata` in both packs. It is a strict optional literal and is
   refused on a party conversation.
2. **Drill set** (learning-service `drillFor(envelope, definition)`):
   - For each required target group of the encounter's objectives, take the cards that are in the Spellbook with a
     current content version. Stale cards never block (critique 1.5).
   - A group **blocks** when it has at least one such card and all of them are due.
   - Its **drill card** is the one with the earliest `dueAt`, tie broken by id.
   - Undiscovered words never block. Each review, passed, failed or revealed, schedules a card at least a day out,
     so the drill always ends.
3. **Spellbook snapshot.** It gains `drill: { encounterId, characterName, vocabularyIds }`, but only while the
   player stands at a `drill_before` encounter's location, that encounter is not completed, and the drill set is
   non-empty. Otherwise it is `null`.
   - `createReviewChallenge(null)` (the Review screen's Continue) serves the first drill card before any other due
     card while a drill is pending (critique 1.1).
4. **Start.** `startEncounter` checks the drill after the resume branch (critique 1.2). Resuming an active session
   of the same encounter is never blocked; a restart is.
   - A pending drill refuses with 409 `DRILL_REQUIRED`: "Errata reviews everything you have learned. Review your N
     due words in the Spellbook first."
   - If another encounter is ongoing, reviews are refused (round 017), so the message adds "Finish your
     conversation with X first." (critique 1.3).
5. **App.** On the map, if `spellbook.drill` names this location's encounter:
   - Talk is disabled, and a line says "Errata reviews everything you have learned. Review N due words first."
   - A primary button, "Review N due words", starts the review with the first drill card (`startReview(id)`).
   - If an encounter is ongoing elsewhere, the line says to finish that conversation first and the button is
     hidden. The Review screen's Continue then follows the server's drill-first order.
6. **Tour script.** Before the Rift, `play-market.js` reviews each drill card with its canonical target as the
   answer (critique 1.4). It records the reviews as steps, adds no LLM calls, and reports `drillCards`.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 1867107f…; a Claude subagent (decision 1); raw text in
`trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Ids are interchangeable alternatives; Continue serves non-drill cards; app count drifts | 0 | Accept: one card per group, server-owned drill in the spellbook, drill-first Continue | **Accepted** (autonomous, pending owner review) | Decisions 2, 4; Design 2–3, 5 |
| 1.2 | Error | Drill check before the resume branch blocks old sessions | 0 | Accept: check after it; restart blocked; tested | **Accepted** (autonomous) | Design 4 |
| 1.3 | Error | An ongoing encounter elsewhere makes the drill impossible, silently | 0 | Accept: the message and the map name it | **Accepted** (autonomous) | Design 4–5 |
| 1.4 | Risk | The tour and `--location the_rift` will 409 | 0 | Accept: drill step with correct answers; offline fixture check | **Accepted** (autonomous) | Design 6, Tests |
| 1.5 | Risk | Stale cards must not block | 0 | Accept | **Accepted** (autonomous) | Design 2, Tests |
| 1.6 | Risk | Vacuous tests on the fixed clock | 0 | Accept: seed due cards explicitly; the 409's N equals the snapshot's count | **Accepted** (autonomous) | Tests |
| 1.7 | Suggestion | Cap at one card per group | 0 | Accept | **Accepted** (autonomous) | Decision 2 |
| 1.8 | Suggestion | deepEqual updates | 0 | Moot: the drill lives in the spellbook, the world snapshot is unchanged | **Accepted** (autonomous) | Design 3 |

Net change: drill per group, owned by the server in the spellbook snapshot; checked after the resume branch; the
ongoing-elsewhere case is named; the tour script reviews before the Rift.

## Tests (pre-run)

- Server (`server/test/drill.test.js`):
  - Loader: the flag is on the Rift in both packs; it is refused on a party conversation.
  - With seeded due cards in three groups (one group with a due and a not-due card, plus one stale card), the drill
    is exactly two cards, both at the Rift.
  - Elsewhere, and at a completed Rift, the drill is `null`.
  - Start is 409 `DRILL_REQUIRED` with N = 2, in-process and over HTTP via `api()`.
  - `createReviewChallenge(null)` serves drill cards first, even with an older non-drill due card. After one reveal
    and one correct answer the start succeeds.
  - An ongoing session elsewhere adds the "Finish your conversation" sentence.
  - An ongoing Rift session resumes despite due cards; a restart is refused.
- `play-market.js`: an exported `clearDrill(service, learnerId)` reviews a seeded drill to empty, offline.
- Mobile: the map line and button at the Rift with a drill; Talk disabled; the button starts the review with the
  first id; no drill → Talk enabled; an ongoing encounter elsewhere → finish-first line, no button.
- Full suites, expo-doctor, iOS export.

## Amendment 1 (2026-11-05): critique 2, a second report from the same reviewer

After the freeze, the same subagent returned a second, different report on plan-v1 ([critique 2](trail/critique-2.md),
11 findings). Dispositions (autonomous, pending owner review) and the changes they make to the frozen design:

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 2.1 | Error | An ongoing encounter elsewhere deadlocks the drill | 0 | Accept in part: keep `DRILL_REQUIRED` with the finish-first sentence (Design 4); the map adds "Return to X" (`returnToDialogue`) instead of the review button | **Accepted in part** (autonomous) | Change 1 |
| 2.2 | Error | Restart of an active Rift session hits the drill and deadlocks | 0 | Accept: skip the drill whenever an active session of the same encounter exists, restart or not | **Accepted** (autonomous) | Change 2 |
| 2.3 | Error | deepEqual of the Rift's world block | 0 | Moot: the world snapshot is unchanged (drill in the spellbook) | **Accepted** (autonomous) | — |
| 2.4 | Risk | Continue leaves the drill; stale due card breaks no-id reviews | 0 | Accept: drill-first is in Design 3; also skip stale cards in the no-id pick | **Accepted** (autonomous) | Change 3 |
| 2.5 | Risk | Device clock vs server due | 0 | Moot: the app shows the server's drill, it does not count | **Accepted** (autonomous) | Decision 4 |
| 2.6 | Risk | Tour check could pass without a drill | 0 | Accept: the report gains `drillCards`; the offline test asserts N > 0 before and 0 after | **Accepted** (autonomous) | Change 4 |
| 2.7 | Risk | Fixed clock hides the rule | 0 | Accept: a test advances the clock a day before completion and sees the drill again | **Accepted** (autonomous) | Change 4 |
| 2.8 | Suggestion | Reveal clicks through | 0 | Accept as is: a reveal is still a forced exposure and is scheduled as a failure; stated in the claim boundary | **Accepted** (autonomous) | Findings |
| 2.9 | Suggestion | Name the words on the map | 0 | Reject: the Spellbook shows them; the line keeps N | **Rejected** (autonomous) | — |
| 2.10 | Suggestion | MapPanel needs the drill | 0 | Accept: App passes `spellbook.drill`, `ongoing` and handlers to MapPanel | **Accepted** (autonomous) | Change 1 |
| 2.11 | Suggestion | Loader: reject a non-boolean | 0 | Accept | **Accepted** (autonomous) | Change 4 |

Changes:

1. The map at a drill location shows the drill line. If an encounter is ongoing elsewhere, it shows "Finish your
   conversation with X first." and a "Return to X" button. Otherwise it shows "Review N due words".
2. `startEncounter` skips the drill whenever an active session of this encounter exists, with or without restart.
3. `createReviewChallenge(null)` picks only cards with a current content version.
4. Tests: a restart of an active Rift session with due cards succeeds; the clock-advance case; a stale due card
   beside a due target; `drill_before: "yes"` is refused; `clearDrill` reports the cards it reviewed.

## Outcome (2026-11-05)

Built as designed, with Amendment 1. The Rift now runs a drill before the first fight against Errata, for every
Spellbook card that is due in one of its six answer slots. The drill takes at most one card per slot, chosen and
counted by the server, and every review response carries the updated drill. The map shows the drill with a review
button, or names the encounter that must be finished first. A review started without an id serves the drill's cards
first. An active Rift session resumes and restarts as before. `play-market.js --tour` clears the drill before the
Rift and reports `drillCards`. Server 148/148 (6 new), mobile 51/51 (4 new), web client 12/12 and build, expo-doctor
20/20, iOS export ok. Not yet seen in the Simulator or in a live tour. See [findings](findings.md).
