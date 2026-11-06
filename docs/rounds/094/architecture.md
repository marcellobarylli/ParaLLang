# Round 094 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** backlog **F15** (round 093 open item): each card's `evidence` list grows by one entry per graded turn
  and review, never pruned.
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-storage.js`, tests, `results/measure.mjs`.

## Measurement before the change (pre-run)

`results/measure.mjs` (round 093's script plus evidence counts; fixture provider, Spanish Coffee Cart, no LLM): 200
cycles (1000 turns, 200 reviews): save 288 KB with receipts already bounded at 20; 4 cards, 800 evidence entries, 400
on the busiest card; about 208 bytes per turn on disk, nearly all evidence ([before](results/before.txt)).

## Goal (pre-run)

No card's `evidence` list in a save exceeds 20 entries after any save, the 20 written last are the ones kept, and
nothing the player sees or the scheduler uses changes.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Keep each card's 20 last-written entries** (`EVIDENCE_LIMIT = 20`), trimmed in `JsonLearningStorage.save` with
   round 093's receipt prune. Entries are appended in write order, so the tail is the newest written, whatever the
   clock said (critique 1.1); never sorted by `at`. Why 20: a cheap reserve of recent history, bounded at 20 × cards.
   No reader exists (checked: server, scripts, app, web client, design notes).
2. **When an old save shrinks (critique 1.2):** on its next write: starting an encounter, a move, a turn, a review,
   a help reveal or a recruit. Recovering a learner and read-only requests do not write, so until then it keeps its
   entries.
3. **Scheduling unchanged (critique 1.3):** SM-2 reads only `schedule` (`submitDialogue`, `submitReview`); argued
   from the code, no cap-off comparison run.
4. **Not trimmed on load** (Optional, accepted): nothing reads evidence in memory.

## Design (pre-run)

`learning-storage.js`: `export const EVIDENCE_LIMIT = 20;` `export function trimEvidence(spellbook, limit =
EVIDENCE_LIMIT)`: for each card of `words` and `phrases` whose `evidence.length > limit`, `evidence.splice(0,
length − limit)`. Called in `save` after validation, next to `pruneReceipts`.

## Claim boundary (pre-run)

Tests and a fixture measurement. After this the save's size is bounded by: the cards (every vocabulary id any
content version has shipped; stale cards stay, critique 1.4), 20 × 20 evidence-sized entries per card, 20 receipts
(each with its encounter's transcript, up to the encounter's `max_turns`), the 50 kept lines, and the world and party
records. Unknown keys in a save are kept untouched, so the bound covers only what this server writes.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 f9114a03…; a fresh general-purpose subagent (claude-opus-5-5), read-only,
in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | "Appended in time order" is not guaranteed (the clock can step back): keep the tail by write order | 0 | Accept | **Accepted** (autonomous decision, pending owner review) | Decision 1, Tests |
| 1.2 | Error | "Shrinks on a start" must name a writing operation; recovering a learner does not write | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 2, Tests |
| 1.3 | Gap | The cap-off schedule comparison has no switch | − | Accept: drop it, argue from the code | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.4 | Gap | The claim boundary is loose (stale cards, transcripts in receipts, unknown keys) | 0 | Accept | **Accepted** (autonomous, pending owner review) | Claim boundary |
| 1.5 | Gap | No test that a trimmed save loads, that a replay at the cap changes nothing, that the newest entry is kept | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |

**Optionals:** no trim on load: accepted (Decision 4); 20 trims nothing, 21 drops one: accepted (Tests); soften the
learner-model rationale: accepted (Decision 1).

## Tests (pre-run)

- Unit (`server/test/evidence-limit.test.js`): a card with 25 entries keeps entries 6–25 in order; exactly 20
  unchanged, 21 drops the first only; words and phrases both.
- Service (Spanish fixture): 25 graded turns on *cafe* across restarts: the saved card has 20 entries and the last
  is the last turn's (its `at` and `objectiveId`); with a clock stepping back each turn the last 20 written are kept.
- At the cap, the newest attempt replayed: the save's cards are unchanged.
- An old save with a card of 100 entries: still 100 after recovering the learner (no write), 20 after starting an
  encounter; the trimmed save loads again.
- Mutations: the call removed from `save`, `slice(0, 20)` (keeping the oldest) and an off-by-one each fail a test.
- Re-measure (share of receipts vs evidence in the save); full suites.
