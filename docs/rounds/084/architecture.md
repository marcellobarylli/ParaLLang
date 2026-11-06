# Round 084 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** iteration 24's handoff ("other app state that goes stale after a move or a completion"). An audit of
  `mobile/src/stores/gameStore.js` found the party, world and Party hints refreshed where they change, but the
  Spellbook fetched only at startup and on a save switch. SM-2 intervals are in days, so cards fall due by the clock
  alone: an app left open or in the background overnight shows "0 due" in the header badge and the Saves screen,
  lists due cards as not due, and shows kept lines whose cards fell due with their translation (round 060 hides
  them), until some action returns a Spellbook.
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js`, `mobile/App.js`, `mobile/src/__tests__/spellbook-refresh.test.js`.

## Goal (pre-run)

The app shows the server's current Spellbook after opening the Spellbook, opening the map, and returning from the
background, without ever overwriting a newer Spellbook or showing meanings during an encounter.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Three triggers:** opening the Spellbook, opening the map, and the app's return to `active` from `background`
   (not from `inactive`: Control Center, Face ID and alerts; critique Optional 8, as `speech.js` decides). No timer
   while the app stays in the foreground.
2. **Behind the screen:** a refresh never sets `isLoading` or `error`; a failure leaves the Spellbook as it was (as
   the Party refresh of round 043).
3. **Latest call wins** (critique 1.2): every trigger sends; a reply applies only if it is the latest refresh. No
   in-flight lock, which a request hung across a suspension would hold forever.
4. **No meanings during an encounter** (critique 1.1, 1.3 in part): a reply is dropped while the app holds an
   ongoing encounter and the reply's `inEncounter` is not `true` (a restarted server forgets in-memory encounters;
   a read racing a start sees the old state). The server's `getSpellbook` stays outside `serialized()`: inside it,
   the GET would wait behind a turn's LLM calls (critique 1.3's server fix rejected).

## Design (pre-run)

1. **`refreshSpellbook()`** in the store. Returns at once without a `learnerId` (critique 1.5). Captures, in the
   same tick as the request: the learner, `requestEpoch`, `refreshSeq` (incremented) and `get().spellbook`. The
   reply applies only if all hold:
   - same learner and epoch: **load-bearing** for `_loadSave` and `switchLearnerForTest`, which may restore an older
     Spellbook object (critique 1.4: the reference check alone has an ABA case there);
   - same `refreshSeq` (Decision 3);
   - `get().spellbook` is still the captured object: no action wrote a newer one (every action writes a new
     object; a write that keeps the object is older than the reply, so applying is harmless; critique 1.4);
   - the reply is an object with a `cards` array;
   - Decision 4's encounter check.
   No `snapshots` update (critique 1.7: only `switchLearnerForTest` reads them; `_loadSave` refetches).
2. **Callers:** `openSpellbook` and `openMap` call it after their `set`.
3. **`App.js`:** one `AppState` `change` subscription in a `useEffect`; remembers the last state; on `active` after
   `background` it calls `refreshSpellbook()`; `remove()` on unmount.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 4e35b9c2…; a fresh general-purpose subagent (claude-opus-5-5),
read-only, in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A restarted server says `inEncounter: false` while the app holds an ongoing encounter: meanings leak | + | Accept: drop such a reply; test | **Accepted** (autonomous decision, pending owner review) | Decision 4, Design 1 |
| 1.2 | Gap | One-in-flight locks out later refreshes if a request hangs | + | Accept: latest call wins | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.3 | Gap | `getSpellbook` outside `serialized()` can read a save mid-start | 0 | In part: the client check of 1.1 covers it; serializing would make the GET wait behind LLM calls | **Accepted in part** (autonomous, pending owner review) | Decision 4 |
| 1.4 | Gap | The reference guard has an ABA case on the two restore paths; the epoch check carries it | 0 | Accept: document it as load-bearing, capture in the same tick | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.5 | Gap | `active` may fire before a learner exists | + | Accept: return; test | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.6 | Gap | Other `AppState` listeners in tests; the singleton store in App tests | 0 | Accept: collect handlers by type, check `remove()`, full suite | **Accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Cut | The `snapshots` update has no visible effect | − | Accept: dropped | **Accepted** (autonomous, pending owner review) | Design 1 |

**Deferred / taken Optionals:** 8 (refresh only after `background`) taken, Decision 1; 9 (keep the reply check,
no error) no change needed.

Net change: latest-call-wins instead of a lock, a client-side encounter check, a background-only foreground trigger,
no snapshot update.

## Tests (pre-run)

`mobile/src/__tests__/spellbook-refresh.test.js`:
- after `initialize`, the server gains a due card: `openSpellbook()` shows `dueCount` 1 and the `spellbook` view;
  `openMap()` likewise;
- a reply arriving after an action wrote a Spellbook is dropped; after a save switch (epoch) is dropped;
- of two refreshes, an older reply arriving last is dropped;
- a failed refresh leaves the Spellbook and `error` unchanged; a reply without `cards` is ignored;
- an ongoing encounter in the app and a reply with `inEncounter: false` is dropped; with `inEncounter: true` applied;
- no learner: no call;
- App: `background` → `active` calls `getSpellbook`, `inactive` → `active` does not; `remove()` on unmount.
Full suite (`npm test`).

## Claim boundary (pre-run)

Offline, jest only. Shows the store applies a fresh Spellbook on the three triggers under the guards above. Not
shown: the iOS `AppState` sequence on a device or Simulator (owner).
