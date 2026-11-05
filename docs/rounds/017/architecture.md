# Round 017 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique-1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** round 001's audit ([audit-1](../001/audit-1.md), "Broken": the Spellbook shows meanings the
  hint budget protects); round 003 open item 5 (vocabulary notes); backlog D3 in
  [`docs/autonomy/STATE.md`](../../autonomy/STATE.md).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `server/src/learning-service.js`, `mobile/src/components/Spellbook.js`, tests.

## Goal (pre-run)

The app's Spellbook never shows the English meaning, or a note or example translation that gives it away, of a word
the game is asking for: words protected in the NPC's current line, and words due for review. Notes are shown where
they give nothing away. The review flow cannot be used to read an answer mid-encounter. The frozen web client keeps
working.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **During an encounter, the whole Spellbook is closed for answers** (critique 1.1, 1.2): no card shows meanings,
   a note or an example's English, and reviews are refused. Per-word protection is not enough, since another card's
   example ("Vorrei un caffè" / "I would like a coffee") or a phrase ("caffè nero", black coffee) answers a
   protected word. The companion's hints stay the way to get help mid-encounter.
2. **Between encounters, a due card hides its own meaning, note and example English** until its review; it shows
   the target word, the example's target sentence and the Review button. A not-due card is a full reference card
   (meanings, note, example with English). Cross-card leaks for due cards are accepted (critique 1.1 asked to hide
   everything while any card is due; every new word is due at once, so the Spellbook would almost never show a
   meaning).
3. **Due is checked against the clock in the app** (`nextReviewAt` ≤ now, or the server's `due`), so a card that
   falls due after the snapshot was taken is hidden when the Spellbook is drawn (critique 1.4). No timer: a
   Spellbook left open across the boundary keeps showing that card until the next render.

## Second opinion (pre-run)

Codex critique 1 on [plan-v1](trail/plan-v1.md): [critique-1](trail/critique-1.md) (Codex CLI, effort high, read-only,
files inlined on stdin). Dispositions are autonomous decisions, pending owner review.

| # | Type | Finding | Codex fix | Disposition | Owner disposition | Why |
|---|---|---|---|---|---|---|
| 1.1 | Error, high | Per-card hiding leaks through other cards (examples, phrases) | Hide meanings Spellbook-wide while any card is due or in play | Accepted in part | Autonomous: accepted for encounters, rejected for due cards (pending owner review) | Every new word is due at once; hiding all meanings while anything is due empties the reference (decision 2) |
| 1.2 | Error, high | Reviewing another card ("caffè nero") reveals a protected word's answer | Block all reviews during an encounter | Accepted | Autonomous: accepted (pending owner review) | Smaller than per-word tracking |
| 1.3 | Gap, high | Only challenge creation is guarded; an older challenge can be submitted mid-encounter | Guard `submitReview` too, before the cached replay | Accepted | Autonomous: accepted (pending owner review) | Same gate, one call |
| 1.4 | Gap, high | `due` is computed when the snapshot is built; a card can fall due while the app shows it as reference | Derive from `nextReviewAt` and the clock, with a timer | Accepted without the timer | Autonomous: accepted in part (pending owner review) | The Spellbook re-renders each time it opens; the timer only covers a screen left open across the boundary |
| 1.5 | Error, medium | The plan promises notes and examples in the review result, with no path for them | Drop the promise | Accepted | Autonomous: accepted (pending owner review) | Review shows the meaning only, as now |
| 1.6 | Cut, medium | `expo-doctor` is unrelated | Drop it | Accepted | Autonomous: accepted (pending owner review) | No dependency change |

## Design (pre-run)

Server (`server/src/learning-service.js`), additive:

- The Spellbook snapshot carries `inEncounter` (the learner's in-memory encounter is `ongoing`); snapshots built
  from a staged encounter pass it. Cards carry `note` (the entry's note or null).
- `createReviewChallenge` and `submitReview` refuse with 409 `IN_ENCOUNTER` ("Reviews wait until the encounter is
  over. Ask your companion for a hint instead.") while an encounter is under way, before any lookup or cached
  replay.

App (`mobile/src/components/Spellbook.js`): `cardState(card, { inEncounter, now })` gives `inEncounter`, `due` or
`reference`. `inEncounter`: target, part of speech and mastery only, one line above the cards explains why, no Review.
`due`: target, "Meaning hidden until you review it.", the example's target sentence, Review. `reference`: meanings,
example with English, note, next review time.

Web client: frozen and unchanged. It still shows meanings on cards; its Review during an encounter now gets 409
`IN_ENCOUNTER`, shown like other conflicts.

Not changed: prompts, content, grading, SM-2, the encounter payload, Gerald's golden prompts. No live LLM runs: no
prompt or content change, and the rules are deterministic and tested in process.

## Claim boundary (pre-run)

Hides answers in the app's Spellbook and closes reviews during encounters; the API still sends meanings
(single-player prototype), and the frozen web client still shows them. Not checked in the iOS Simulator.

## Tests (pre-run)

- Server (`server/test/spellbook-encounter.test.js`): `inEncounter` true at the start and false after resolution;
  review create (with and without an id, in process and over HTTP) and submit (answer and reveal, a challenge issued
  before the encounter) refused with `IN_ENCOUNTER`; reviews work after resolution; cards carry the content's note.
  Existing review tests resolve the encounter first.
- Mobile (`mobile/src/__tests__/spellbook.test.js`): `cardState` (encounter wins; due follows the clock); between
  encounters, due cards hide meaning, note and example English and offer Review, reference cards show all three;
  during an encounter, no card shows any of them and there is no Review.
- `node --test server/test/*.test.js`, `npm run test:mobile`, web client vitest and build,
  `npx expo export --platform ios`.

## Outcome (2026-11-05)

Built as designed, with no Amendment. No card shows a meaning, note or example English and reviews are refused
(409 `IN_ENCOUNTER`) while an encounter is under way; between encounters due cards hide theirs and the rest show
notes. Server 103/103, mobile 25/25, web client 12/12 and build, iOS export ok. No live runs (no prompt or content
change). Not checked in the iOS Simulator. See [findings](findings.md).
