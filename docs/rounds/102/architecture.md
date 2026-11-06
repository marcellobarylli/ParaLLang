# Round 102 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** round 099's deferred critique 1.3 (decision 12). Encounters live only in the server's memory
  (`this.encounters` in `learning-service.js`); receipts persist in the save. After a server restart, a resent answer
  whose first reply was lost replays its receipt (the receipt is checked before `validateVersion`), so the app shows
  the replayed encounter, ongoing, at v+1. The follow-up `currentEncounter` read in `sendMessage` (round 071) returns
  `encounter: null`; its id check skips it, and a conversation the server no longer holds stays on screen until the
  next Send gets `STALE_ENCOUNTER` and goes to the map (that answer stays in the box; the conversation is what is
  lost, critique 1.2).
- **Offline round:** no LLM call; store code and jest tests. Critic: a fresh read-only subagent (Codex limited until
  2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js`, `mobile/src/__tests__/send-retry.test.js`.

## Goal (pre-run)

After a replayed send whose replayed encounter is ongoing, a read that shows the server holds no conversation, or
another one, leads to the map or to that conversation at once, without wiping anything the player started meanwhile.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **When (critique 1.1).** After a replay (`result.replayed`) whose `result.encounter.state` is `ongoing`, the read
   answered, and the existing guard holds (same send, epoch, learner, not loading), **and** the store still shows the
   replayed encounter (`get().encounter` has `result.encounter`'s id and version). `latest` is compared with
   `result.encounter`. A start, help reload or another send during the read therefore wins.
2. **A resolved replay stands (critique 1.7).** The verdict and the resolve are real: the resolve's world and party
   reads run (`getWorld` has the completion, persisted with the receipt), Return goes to the map, a restart of the
   place starts fresh (nothing held), recruit reads the save.
3. **What (critique 1.4, 1.5, 1.8).** `_applyLatest(learnerId, latest, { message, keep = {}, leaveView })` is
   factored out of `_reloadStale` (both branches, snapshot written once) and used by both:
   - no encounter → the closed branch: encounter null, `STALE_CLOSED`; on the replay path `view` becomes `'map'` only
     if it is `'dialogue'` (a screen the player opened meanwhile stays; Return from it falls back to the map since
     the encounter is null). `_reloadStale` keeps its unconditional map (it runs under loading).
   - another id → that conversation shown, with a new line `STALE_REPLAY_OTHER`: "Your answer was graded, but the
     server now holds another conversation, shown here." (covers an ongoing or resolved other; `STALE_RELOADED`
     would say the answer was not sent).
   - Both clear the replayed verdict (it belongs to a conversation no longer shown); the draft is left as it is.
4. **A read failure keeps the replayed state** (as now).
5. **The help path (critique 1.6), checked:** after a replay, `pendingInput` and the retry ids are cleared, so a
   later help reveal that is stale reloads through `_reloadStale` as before.
6. **No server change.** Keeping encounters across a restart means persisting in-memory state: out of scope.
7. **`STALE_CLOSED`'s wording stays** (Optional 1: "Return to it on the map" does not fit a party conversation; not
   new, and shared with `_reloadStale`; carried as an open item).

## Claim boundary (pre-run)

Store behaviour under jest mocks of the API; no live server restart and no Simulator.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 09bcb28e…; a fresh general-purpose subagent (claude-opus-5-5), read-only,
in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A start or help during the read would be wiped | + | Accept: the store must still show the replayed encounter | **Accepted** (autonomous decision, pending owner review) | Decision 1, Tests |
| 1.2 | Error | The next Send's answer is not lost | 0 | Accept: Source corrected | **Accepted** (autonomous, pending owner review) | Source |
| 1.3 | Error | The listed "existing" tests do not exist | + | Accept: write them (call count, read failure) | **Accepted** (autonomous, pending owner review) | Tests |
| 1.4 | Gap | The closed branch forces the map over an opened screen | + | Accept: map only from the dialogue on the replay path | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| 1.5 | Gap | The other conversation may be resolved | + | Accept: wording covers both; a test | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| 1.6 | Gap | The help path after the fix | 0 | Accept: checked and recorded | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.7 | Gap | Why a resolved replay may stand | 0 | Accept: written down | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.8 | Cut | `keep` as a parameter; assert the draft untouched | + | Accept: optional `keep` | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| 1.9 | Cut | The ongoing-condition mutation needs assertions | + | Accept: the resolved test asserts encounter and view | **Accepted** (autonomous, pending owner review) | Tests |

**Optionals:** `STALE_CLOSED` wording for party conversations: deferred (Decision 7, open item); the snapshot update
written once: accepted (Decision 3).

## Tests (pre-run)

`mobile/src/__tests__/send-retry.test.js` (a lost send, then the resend replays v2):
- ongoing replay, read `encounter: null` → view `'map'`, encounter null, `STALE_CLOSED`, assessment null, draft as it
  was;
- ongoing replay, read null while the player opened the Spellbook during the read → view stays `'spellbook'`,
  encounter null;
- ongoing replay, read another id (ongoing) → that encounter, `STALE_REPLAY_OTHER`, assessment null; the same with a
  resolved other;
- resolved replay, read null → the resolved encounter stays, view `'dialogue'`, assessment kept, `getWorld` called;
- a start during the read (held read; `talkTo` starts C) → C stays, no error; help reload during the read → its own
  line stays;
- the read throws → the replayed state stands;
- a send that is not replayed does not change `currentEncounter`'s call count.
- Mutations: drop the null branch; drop the ongoing condition; drop the still-shown check; force the map view.
- Full suites (server, client, mobile).
