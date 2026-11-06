# Round 099 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (reviews, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** two independent read-only reviews, at HEAD 6cc3a5f, of the code changed in rounds 093–098:
  the server ([`trail/review-1.md`](trail/review-1.md): 3 Minor, 1 Gap) and the mobile store
  ([`trail/review-2.md`](trail/review-2.md): 1 Error, 4 Minor, 1 Gap).
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js`, `mobile/src/components/ReviewPanel.js`,
  `server/src/llm/cli-runner.js`, `server/src/llm/adapters/codex-cli.js`, tests.

## Goal (pre-run)

Help asked after a lost send never makes the next Send grade the same answer twice; a lost save is announced even
after a failed load; world and party reads are dropped only by writes to the same thing; a review reply never lands
on another screen, and its screen always offers a way on; a runner failure after an exit keeps the exit's category;
the most specific Codex failure event wins.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **R2.1 (critique 1.1–1.5): help after a lost send does not reload.** In `revealHelp`'s stale branch, when
   `pendingInput` is set and `retryIds` holds the key `[learnerId, encounterId, version, pendingInput]` (an answer
   sent at this very version whose fate is unknown), the store keeps the encounter, version, `pendingInput` and
   draft, clears `isLoading` and says `STALE_HELP_PENDING` ("Your last answer may have reached the server. Send it
   again to see its verdict."). The next Send uses the same version and attempt id, so the server replays a
   committed turn (it checks receipts before the version) or answers STALE and the send's own reload runs, both
   existing, tested paths. No automatic resend (critique 1.4: the player did not press Send; it needed an outcome
   from `sendMessage`, a per-state line and a phantom check, 1.1–1.3). Without a pending answer at this version the
   reload stands as in round 096.
2. **R2.2 (critique Optional): SAVE_LOST survives a failed load.** A closure `Set` `lostSaves`: an id is added when
   `createLearner` for a stored or target id answers `recovered === false`; init and `_loadSave` show the notice
   when the id is in the set and remove it inside the guarded `set` that shows it. `removeSave` removes it too.
3. **R2.3: two write counters.** `worldWrites` (move, init load, `_loadSave`, resolve) and `partyWrites` (recruit,
   init load, `_loadSave`, resolve). `openMap`'s world read checks `worldWrites`, `openParty`'s read `partyWrites`;
   the post-resolve read applies world and party each under its own counter.
4. **R2.4 (critique 1.6): the review screen after any dismissed error** (a failed start or a stale card; a null
   challenge goes to the Spellbook view instead) says "No review is loaded." with "Try again" (onContinue) and
   Return.
5. **R2.5 (critique 1.7): a review reply after leaving the screen.** Guard: `get().reviewChallenge?.id ===
   reviewChallenge.id` (every way off the review screen clears it; `isLoading` blocks a way back meanwhile). If it
   no longer holds: success applies the Spellbook and clears `reviewRetryIds`, STALE_CHALLENGE deletes the card's
   keys, and every reply clears `isLoading`; no error, no result, no cue.
6. **R2.6:** the tests below.
7. **R1.1 (critique 1.8): any exit is final** for `failAndTerminate` (`if (failure || closed || exited) return;`).
   After a non-zero exit the grace timer still force-kills a held group; a timeout or cancel in the grace leaves the
   `process` failure (the adapter then maps the stated events).
8. **R1.2 (critique 1.9): the most specific Codex failure.** `pickFailure(events)`: of the `error` / `turn.failed`
   events, the first whose `providerErrorFromMachineCode(...)` category is not `provider`, else the first. Used by
   `parseCodexEvents` and `codexFailure`. Confidence limit: real Codex may carry a code only in message text; not
   checkable offline.
9. **R1.3: rejected.** Linux keeps a PID allocated while it is a process-group id in use, so while a member holds
   the pipes the group kill is safe; with no member left `kill(-pid)` reaches only a process that both took the PID
   and made itself a group leader within `killGraceMs`. A `kill(-pid, 0)` probe has the same race. A comment says
   so.
10. **R1.4: deferred** to the next live round, with a note at `narrationLines` (per-step matching; only
    `durationMs` / `retried` of an uncommitted line with the same text as the next committed one can be wrong).
11. **Not new:** `openParty`'s first `.then` callback reads `data?.party`.
12. **Deferred (critique 1.3):** a replayed send after a server restart (receipt persisted, encounter gone) shows an
    ongoing phantom until the next send; this is round 071's send path, not this round's change.

## Design (pre-run)

As in the decisions. Store: `STALE_HELP_PENDING`, `lostSaves`, `worldWrites` / `partyWrites` (replacing
`placeWrites`), `_sendReview`'s challenge guard; ReviewPanel's last branch; runner guard and comment; Codex
`pickFailure`.

## Claim boundary (pre-run)

Jest and node tests with mocks and fake CLIs; no Simulator, no live run. The receipt-before-version order is the
server's (checked in `learning-service.js`), not modelled by the store mocks; the store tests assert the resend's
version and attempt id instead.

## Second opinion (pre-run)

Source reviews: [`trail/review-1.md`](trail/review-1.md), [`trail/review-2.md`](trail/review-2.md). Critiqued draft:
`trail/plan-v1.md`, sha256 9bde3010…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of
Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Minor | A timeout or abort in the exit grace replaces a non-zero exit's category | + | Accept | **Accepted** (autonomous decision, pending owner review) | Decision 7 |
| R1.2 | Minor | Codex's first failure event wins over a coded later one | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 8 |
| R1.3 | Minor | Group kill after the child is reaped | − | Reject: the kernel keeps the pgid; a probe races the same | **Rejected** (autonomous, pending owner review) | Decision 9 |
| R1.4 | Gap | play-market matches narration groups by text only | 0 | Defer: live round | **Deferred** (autonomous, pending owner review) | Decision 10 |
| R2.1 | Error | Help after a lost send reloads; the next Send grades the answer twice | + | Accept: no reload, a line | **Accepted** (autonomous, pending owner review) | Decision 1 |
| R2.2 | Minor | SAVE_LOST lost after a failed load | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 2 |
| R2.3 | Minor | One counter for world and party writes | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| R2.4 | Minor | Review screen without a way on after a dismissed error | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 4 |
| R2.5 | Minor | A review reply lands on another screen | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 5 |
| R2.6 | Gap | Untested sequences | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.1 | Gap | The auto-resend has no outcome | 0 | Accept by dropping the auto-resend | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.2 | Error | The line after an auto-resend is wrong when resolved or moved on | 0 | Accept by dropping the auto-resend | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.3 | Error | A replay after a server restart shows a phantom | 0 | Defer: round 071's send path | **Deferred** (autonomous, pending owner review) | Decision 12 |
| 1.4 | Cut | Skip the automatic resend | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.5 | Gap | Assert the resend's version and attempt id | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Error | The last ReviewPanel branch follows any dismissed error | 0 | Accept: reworded; store-level test | **Accepted** (autonomous, pending owner review) | Decision 4, Tests |
| 1.7 | Gap | The off-screen review reply: clear keys; challenge guard | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 5, Tests |
| 1.8 | Gap | Cancel in the grace; the group still killed | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.9 | Gap | How "known category" is decided | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 8 |

**Optionals:** remove the id in `removeSave`: accepted (Decision 2); `data?.party`: accepted (Decision 11); retry the
help reveal automatically: rejected (no automatic resend); a note at `narrationLines`: accepted (Decision 10).

## Tests (pre-run)

- Store (jest), a new `mobile/src/__tests__/store-help-pending.test.js`:
  - a send fails (network), help answers STALE_VERSION: no `currentEncounter` call, version and draft kept,
    `STALE_HELP_PENDING`; the next Send's payload has the same version and attempt id as the first; `revealHelp`
    called once, `sendDialogue` twice; with an edited draft, the edited draft is kept;
  - the pending key at another version (or no pending answer): the 096 reload runs;
  - help's reload when `currentEncounter` rejects: error shown, loading cleared;
  - SAVE_LOST: lost → `getWorld` fails → retry: the notice once, also for `_loadSave`;
  - a recruit during the post-resolve read keeps the resolve's world; a move during `openParty` keeps its party;
  - a review reply after Return: success (Spellbook applied, no cue, no result), STALE_CHALLENGE (no error, keys
    deleted), network error (no error); STALE_CHALLENGE → `clearError` → the panel's "Try again" calls
    `createReview`.
- `review-loading.test.js`: the last branch's text and button.
- Server: a runner test where the child exits non-zero holding its pipes and the timeout fires in the grace, and one
  where a cancel lands in the grace: `process`, the held grandchild killed, one SIGTERM; Codex events `error` (no
  code) then `turn.failed` (`usage_limit_reached`): the quota category on both parse paths.
- Mutations; full suites (server, client, mobile).
