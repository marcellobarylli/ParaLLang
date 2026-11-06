# Round 076 plan v1: the greeting written while the player reads the map card

## Why
Starting an encounter waits for one LLM call, the NPC's greeting: median 8.6 s, up to ~15 s with codex-cli (rounds
067, 072). Round 073 only shows a waiting line. The greeting prompt (`startEncounter`, learning-service.js ~461)
depends only on content: the definition, the scene name, the turn-0 ratio, the ambient entries. Nothing from the
learner's save. So it can be written before the player presses Talk.

## Design
1. **Flag.** `PARALLANG_PREFETCH=on` (server.js, like `PARALLANG_ATMOSPHERE`), `new LearningService({ prefetch })`,
   default off. Off: no behaviour change, byte for byte (no timer, no call).
2. **Trigger.** After `moveTo` commits a move (changed) to a location whose encounter is not completed in the save
   and not sealed, and has no cached or in-flight greeting for (learner, encounter): schedule a prefetch after
   `PREFETCH_DWELL_MS` = 1500 (passing through a location on the way elsewhere does not spend a call). When the
   timer fires, it re-reads nothing from disk; it checks the service's in-memory state: the learner's last move
   target is still that location (a per-learner `arrivals` map set by each move), the learner has no active session
   of that definition, and `providerCallsInFlight === 0` (the CLI runner is serial: a prefetch must never queue
   ahead of a call the player is waiting on). Otherwise it does nothing (a skip reason is counted in
   `prefetchStats`).
3. **The call.** The same `buildNarrationMessages(...)` as `startEncounter` (factored into one method
   `greetingMessages(definition, locationId)`), through `callProvider`, so it counts as in flight. The promise is
   stored in `greetings: Map<learnerId|definitionId, Promise<generated|null>>`; a failure resolves to null (logged
   in stats), never an unhandled rejection.
4. **Use.** In `startEncounter`, where the greeting is generated: if `greetings` holds an entry for (learner,
   definition), delete it and await it; if it gives a greeting, use it (then `canonicalizeNarration` as now); if
   null, call the provider as now. Party conversations (`party_of`) are never prefetched (no arrival).
   Restart also consumes an entry if one exists.
5. **Bounds.** At most one entry per (learner, encounter); at most 100 entries in all (oldest evicted).
   `deleteLearner` drops the learner's entries and timer. `shutdown` clears every timer.
6. **App.** No change: the Talk button and round 073's waiting line stay; the start just returns sooner.

## Cost (autonomous decision on an owner question)
One extra call per arrival at an open encounter where the player stays 1.5 s and then never talks there before the
server restarts. A greeting that is not used stays cached for the next talk there, so most prefetches are used.
Default off, as the atmosphere line; the owner decides whether to turn it on.

## Tests (server)
- off: a move schedules nothing, a start calls the provider once (existing tests unchanged).
- on: move, wait past the dwell (fake timer or a short dwell option), start: one narration call in all, the start
  makes none; the greeting equals the prefetched one.
- start during an in-flight prefetch awaits it: one call.
- move away before the dwell: no call. Move during another provider call: skipped (busy).
- a failed prefetch: start calls the provider and succeeds.
- completed encounter, sealed location, location without an encounter, an active session of it: no prefetch.
- deleteLearner drops entries; shutdown clears timers (no open handle).

## Live (codex-cli, it)
A script in `docs/rounds/076/results/`: in-process service, a fresh learner, three moves to open encounters
(entrance → coffee cart → fountain → butcher), each with a 6 s dwell (the time to read the card), then start, and
time the start. Once off, once on (about 6 + 6 calls). Success: with prefetch on, the median start time is under
1 s, off it stays in the 6–15 s range, and the greetings pass the same schema and canonicalization (no error).

## Out of scope
Prefetching the first reply, prefetching party conversations, persisting greetings across restarts.
