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
