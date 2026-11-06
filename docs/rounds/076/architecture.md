# Round 076 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Design source:** STATE.md's next candidate "the greeting wait itself"; [round 073](../073/architecture.md) (the
  waiting line), [round 053](../053/architecture.md) (the atmosphere flag and the serial CLI runner), greeting
  timings from rounds [067](../067/findings.md) and [072](../072/findings.md) (median 8.6 s, up to about 15 s).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js`, `server/server.js`, `server/test/greeting-prefetch.test.js`,
  `docs/rounds/076/results/` (the live measurement script and its report).

## Goal (pre-run)

Starting an encounter waits for the NPC's greeting, one LLM call. Its prompt depends only on content (the encounter,
the scene, the turn-0 ratio), not on the save. Write it while the player reads the map card after arriving, so Talk
answers sooner. Off by default.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The cost of a prefetch.** One call per arrival where the player stays 1.5 s at an open encounter. A greeting
   not used stays for the next Talk there, until the server restarts. **Off by default** (`PARALLANG_PREFETCH=on`),
   like the atmosphere line; the owner decides whether to turn it on. Alternative: on by default.
2. **Other players wait behind a prefetch** (critique 1.1). The CLI runner is serial, and a prefetch admitted while
   idle can delay another learner's call by up to one greeting. Accepted for a local, single-player server and
   recorded; no preemption. Alternative: a priority queue with cancellation in the runner (larger change).
3. **One greeting cache per learner** (critique 1.12 rejected). A shared cache by prompt would let two learners
   share a call, but it makes deletion and eligibility harder to reason about, and the server has one player.

## Design (pre-run)

1. **Flag.** `PARALLANG_PREFETCH=on` in `server.js` → `new LearningService({ prefetch: true })`. Off: no timer, no
   call, no state; existing behaviour byte for byte. Options for tests: `prefetchDwellMs` (default 1500),
   `prefetchRetries` (default 3).
2. **One prompt builder** (critique 1.6). `greetingMessages(definition, locationId)` builds the greeting messages;
   `startEncounter` and the prefetch both use it. Content and configuration are immutable for the service's
   lifetime (loaded once at startup), so a prefetched greeting is the one the start would have asked for. A test
   checks that the prefetch's messages equal those of a start without prefetch.
3. **Arrivals** (critiques 1.3, 1.7). Each learner has at most one arrival `{ seq, locationId, timer }`. A committed
   move (changed) replaces it: the old timer is cleared and a new one scheduled after the dwell. Recovering or
   creating a learner (app launch) also schedules one for the current location. A move that changes nothing does
   not.
4. **When the timer fires** (critiques 1.2, 1.5). The arrival must still be the learner's latest (same `seq`), and
   the service not stopping. It re-reads the save (read-only, not serialized) and checks, as `startEncounter`
   would: the current location is the arrival's, it has an encounter, not completed, not sealed, no drill pending
   for it; no session of that definition is active; no start is running for this learner (`starting` set, held from
   the start's entry to its end, so a start that has generated but not yet saved is not duplicated); no greeting is
   cached or in flight for (learner, definition). If the provider is busy (`providerCallsInFlight > 0`), it tries
   again after the dwell, at most `prefetchRetries` times for this arrival (critique 1.7). Any other failed check
   ends the arrival. Each outcome is counted in `prefetchStats` (counters only, bounded; critique 1.10).
5. **The call.** Through `callProvider` (so it counts as in flight). The promise goes into
   `greetings: Map<learnerId\u0000definitionId, Promise<generated|null>>` at once; a failure resolves to null and is
   counted, never an unhandled rejection. At most 100 entries in all (the oldest evicted).
6. **Use.** In `startEncounter`, at the generation step (after every existing check): if `greetings` holds an entry
   for (learner, definition), delete it and await it; a greeting is used as the provider's reply (then
   `canonicalizeNarration` as now); null falls back to a provider call as now. Restart consumes an entry too. Party
   conversations are never prefetched. Counted as `used` (ready or awaited in flight) or `fallback`.
7. **Deletion and shutdown** (critique 1.4). `deleteLearner` clears the learner's arrival and timer and drops their
   greetings; a call already running is not cancelled (at most one, it completes into a promise no one holds).
   `shutdown` sets `stopping`, clears every timer, and schedules no more.
8. **App.** No change: the start returns sooner, and round 073's waiting line still covers a wait.

## Second opinion (pre-run)

Critique 1 (Codex, effort high, bundle on stdin): [raw](trail/critique-1.md), plan as sent
[plan-v1.md](trail/plan-v1.md).

| # | Severity | Finding | Round | Disposition | Owner disposition | Where |
|---|---|---|---|---|---|---|
| 1.1 | Error | An idle check does not stop a prefetch delaying another learner's call | 0 | Accept in part: accepted and recorded for a local single-player server, off by default; no preemption | **Accepted in part** (autonomous, pending owner review) | Owner decision 2 |
| 1.2 | Risk | A start that generated but has not saved is not in the dedupe | 0 | Accept: a `starting` set from the start's entry to its end | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.3 | Risk | A → B → A lets an old timer pass the location check | 0 | Accept: one arrival per learner with a sequence number, timer replaced on every move | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.4 | Risk | Deletion and shutdown leave running work | 0 | Accept in part: stopping flag, timers and arrivals cleared, greetings dropped; a running call is not cancelled | **Accepted in part** (autonomous, pending owner review) | Design 7 |
| 1.5 | Risk | Eligibility checked only when scheduling | 0 | Accept: re-read the save when the timer fires; drill and gate included; start keeps all its checks | **Accepted** (autonomous, pending owner review) | Design 4, 6 |
| 1.6 | Gap | Prompt identity needs a contract | 0 | Accept: one builder, content immutable for the service's lifetime, a parity test | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.7 | Gap | Recovery at a location and a busy runner miss useful arrivals | 0 | Accept in part: recovery schedules an arrival; busy retries up to 3 times; unchanged moves do not | **Accepted in part** (autonomous, pending owner review) | Design 3, 4 |
| 1.8 | Error | The live success threshold contradicts the timing budget | 0 | Accept: residual wait judged against max(0, generation − time available); calls counted correctly | **Accepted** (autonomous, pending owner review) | Live run |
| 1.9 | Gap | The experiment cannot show the benefit | 0 | Accept in part: two pairs per location, alternating order, stats recorded; no concurrent-traffic arm (one player) | **Accepted in part** (autonomous, pending owner review) | Live run |
| 1.10 | Risk | Cost and resource bounds incomplete | 0 | Accept: one arrival per learner, counters only, cap of 100; used and unused counts measured | **Accepted** (autonomous, pending owner review) | Design 3–5, Live run |
| 1.11 | Gap | Tests omit decisive interleavings | 0 | Accept in part: start commit, A → B → A, restart, deletion during generation, shutdown, eviction, both flags | **Accepted in part** (autonomous, pending owner review) | Tests |
| 1.12 | Risk | A shared cache by prompt would avoid duplication | 0 | Reject: per learner is simpler for deletion and eligibility; one player | **Rejected** (autonomous, pending owner review) | Owner decision 3 |

## Tests (pre-run)

`server/test/greeting-prefetch.test.js`, with a gated fixture provider and a short dwell:

- off: a move schedules nothing and calls nothing; the start calls once.
- on: move, past the dwell, start: one greeting call in all, the start makes none; its messages equal a plain
  start's (parity); the greeting is the prefetched one.
- a start while the prefetch is in flight awaits it: one call.
- a timer that fires while a start is generating (or saving) does not call.
- A → B → A within the dwell: one call at most, for A, after the second arrival's dwell.
- moving away before the dwell: no call. Busy at the dwell: retried, and given up after the retries.
- a failed prefetch: the start calls the provider and succeeds.
- no prefetch for a completed encounter, a sealed location, a place without an encounter, an active session of it,
  a pending drill.
- recovery at a location schedules one; restart consumes a cached greeting.
- deletion during a prefetch drops it; shutdown clears timers (the test process exits).
- eviction past the cap; both flags on (atmosphere and prefetch) behave independently.

`npm test` all green; `python3 tools/round_log_check.py 076`.

## Live run (pre-run)

`docs/rounds/076/results/prefetch-live.mjs`, in-process, codex-cli, `TARGET_LANGUAGE=it`. For each arm (off, on), a
fresh learner walks entrance → coffee cart → cracked fountain → butcher's stall, staying 10 s at each (reading the
card), then starts the encounter and times the start; it leaves the encounter unplayed. Two pairs, in the order
off, on, on, off. About 12 greeting calls (24 at most if retries or fallbacks occur).

Success:
1. Every start succeeds, and every greeting passes the schema and canonicalization.
2. With prefetch on, each start's residual wait is at most max(0, g − 8.5 s) + 1 s, where g is that prefetch's
   generation time and 8.5 s the time available (10 s minus the 1.5 s dwell).
3. With prefetch on, no greeting is fetched twice for one arrival, and every prefetch is used (no unused call in
   this script).
4. Off, the start times stay in the range seen before (about 5–15 s).

The report records each start's time, each prefetch's generation time, and the stats counters.

## Claim boundary (pre-run)

One provider, one pack, a scripted walk with a fixed dwell. Real reading times, concurrent learners and the app's
own timings are not measured.
