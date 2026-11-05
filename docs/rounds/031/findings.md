# Round 031 findings

## Question

Can the app keep more than one journey on a device (backlog A11, prototype.md "save slots") without a server
change, and without one save's state leaking into another?

## Finding

Yes, in tests. A save slot is a learner id: the server already keeps one save per learner.
- The device keeps up to three slots in `parallang.saveSlots`. An older install's learner becomes "Save 1".
- The Saves screen (from the map's header) continues another save or starts a new one.
- A switch reloads the save from the server, including the encounter the server holds for it, and resets every
  per-save field.
- Every store action now drops a reply or failure that lands after a switch. Before this round, the review actions
  had no such guard at all.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 10 findings (6 Errors), 9 accepted and 1 in part. The Errors changed the
  design:
  - the encounter comes from the server, not the in-app snapshot;
  - the whole state is reset;
  - stale guards on the review actions and failure paths;
  - `createLearner` on every switch;
  - a busy guard.
- Tests on the Linux compute node. The stale-reply test was checked to fail with the `startReview` guard removed.
  No live LLM runs: nothing reaches a prompt.

## Results

| Check | Before | After |
|---|---|---|
| server `node --test` | 154/154 | 154/154 (no server change) |
| mobile jest | 56/56 | 67/67 (`saves.test.js` ×11: record parse and labels, migration, active slot, new save with full reset and switch back, limit and refusals, failed switch and failed new save, stale replies and failures, a lost save recreated, the screen, the header) |
| web client vitest, build | 12/12, ok | 12/12, ok |
| `npx expo-doctor`, iOS export | 20/20, ok | 20/20, ok |

## Decision

Keep it. Backlog A11 is done apart from deleting and renaming saves.

## Evidence

The round's build commit; journal rows 4–8; `mobile/src/stores/saveSlots.js`, `mobile/src/__tests__/saves.test.js`.

## Claim boundary

Jest with a fake API and storage. The Saves screen has not been seen in the Simulator, and no switch has run
against the real server over HTTP. The routes it uses (`/api/learner`, `/api/world`, `/api/encounter/current`,
`/api/party`) are the ones the app already calls. Onboarding stays per device: a new save does not show the
statement again. An encounter left under way in another save is resumed only while the server process lives,
because encounters are in memory (round 001).

## Open items

1. Owner, Simulator: the Saves button on the map header (does it fit beside Spellbook and Party?), the Saves screen,
   a switch and the "Now playing" notice, VoiceOver on the selected card.
2. Owner: decide whether saves may be deleted (the server file would stay) or renamed, and whether a new save should
   show the philosophy statement again.
