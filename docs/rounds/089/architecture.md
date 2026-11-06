# Round 089 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review of the code of rounds 040–053 (app token, ambient audio, font, Party
  hints, unordered objectives, `folded`, relationship tiers, `held`, atmosphere), never reviewed after their builds
  except 053, [`trail/review-1.md`](trail/review-1.md): one Error, one Gap, two Minor, each checked by hand at HEAD.
  The Error: with `PARALLANG_ATMOSPHERE=on`, the atmosphere line's filter exempts "English" pack forms
  (`ATMOSPHERE_ENGLISH`) that are answers of open objectives: "Someone by the dry basin sighs "Basta!"" is kept at
  the open Fountain.
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Measure:** [`results/exempt.mjs`](results/exempt.mjs) → [`results/exempt.txt`](results/exempt.txt): every word of
  the list that is an entry of a pack is an objective target in that pack (it 11, es 10); none of the 72 kept live
  lines of rounds 053 and 068 used any word of the list.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js`, `server/src/llm/cli-adapter.js`, `mobile/src/speech.js`, tests.

## Goal (pre-run)

The atmosphere line never holds a pack form that is an answer; an atmosphere call never makes a player's encounter
call wait on a serial (CLI) provider beyond the child's exit; a fragment unlocked in a deeper tier is announced; a
failed `speak` restores the ambience.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No English exemptions in the atmosphere filter (R1.1).** `ATMOSPHERE_ENGLISH` goes, as round 081 Amendment 2 did
   for footnotes: every exempt word that is a pack entry is an answer. The location description's own words stay
   allowed (the map card shows them). An English *once*, *due* or *cafe* now drops a line (null for ten minutes, the
   description still shows); 0 of 72 live lines would have been dropped.
2. **A player's call aborts atmosphere calls on a serial provider (R1.2, critique 1.1, 1.5).** Each atmosphere call
   has an AbortController, passed as `structuredChat(…, { signal })`. `callProvider` aborts every atmosphere call in
   flight first, when the provider is serial (`provider.serial === true`, set on `BaseCLIAdapter`) and the call is not
   a background one. The greeting prefetch is a background call: it does not abort, and an atmosphere call in flight
   counts as busy in `fireArrival` (its existing retries). HTTP providers never abort.
3. **An aborted call is not a failure (critique 1.2, 1.3).** The shared atmosphere promise resolves to
   `{ text, aborted }`. A valid line is kept and cached even if the abort came late (critique 1.3). An aborted call
   with no line: drop reason `aborted`, `atmosphereStats.aborted` counted, no failure cached, and every request
   sharing it gets `{ atmosphere: null, retryAfterMs: 15000 }` as for `busy` (the app asks once more).
4. **Stated, not fixed (critique 1.4):** the CLI runner frees its slot when the aborted child exits (SIGTERM, then
   SIGKILL after 2 s), so the player's call can still wait up to that long.
5. **A conversation fragment's `encounterId` (R1.3, critique 1.7)** is the party conversation offered at
   `after_conversations − 1` conversations, the one whose resolution reached the count. With today's content (every
   fragment and deeper tier at 3) nothing changes.
6. **`speak` (R1.4, critique 1.8):** the `speech.speak` call, `voice.identifier` included, is in a try; a throw
   restores the duck and is swallowed (the button has no handler).

## Design (pre-run)

1. `learning-service.js`: remove `ATMOSPHERE_ENGLISH`; `atmosphereAborts` (Set of controllers in flight);
   `writeAtmosphere(location, state, character, party, signal)` (signal optional) returns `{ text, aborted }`, with
   `aborted = signal?.aborted` when the provider throws or the reply is not a valid line; `getAtmosphere` caches
   only a non-aborted result and replies `retryAfterMs` on an aborted one. `abortAtmosphere()` aborts and clears the
   set. `callProvider(…, { signal, background })` calls it when `this.provider.serial === true && !background`.
   `narrate(…, { signal, background })` passes it on; `fireArrival` passes `background: true` and treats
   `atmosphereAborts.size > 0` as busy.
2. `cli-adapter.js`: `BaseCLIAdapter` gets `get serial() { return true; }`.
3. `journeyFragments`: `conversationOf(homeId, unlockedAt) = partyConversationFor(homeId, unlockedAt - 1)`.
4. `mobile/src/speech.js` `speak`: try/catch around `speech.speak`, `restore()` in the catch.

## Claim boundary (pre-run)

Tests only, no live run (the atmosphere is off by default). The abort frees the CLI slot only when the child exits.
The atmosphere filter still allows the description's own words.

## Second opinion (pre-run)

Source review: [`trail/review-1.md`](trail/review-1.md) (4 findings). Critiqued draft: `trail/plan-v1.md`, sha256
edeb3999…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error | The atmosphere filter's English exemptions are open answers (*basta* kept at the Fountain) | + | Accept: drop the list (measured) | **Accepted** (autonomous decision, pending owner review) | Decision 1 |
| R1.2 | Gap | An atmosphere call holds the CLI slot untracked; encounter calls queue behind it | + | Accept: abortable, aborted by player calls | **Accepted** (autonomous, pending owner review) | Decisions 2–4 |
| R1.3 | Minor | A fragment unlocked during a deeper tier is never announced (latent) | 0 | Accept: the tier offered at N−1 | **Accepted** (autonomous, pending owner review) | Decision 5 |
| R1.4 | Minor | A throw in `speak` leaves the ambience ducked | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 6 |
| 1.1 | Error | The prefetch would abort nearly every atmosphere call at open places; the app retries once, not twice | + | Accept: the prefetch is background, counts atmosphere as busy | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.2 | Error | An abort is caught as a provider failure and cached; the shared promise cannot carry `retryAfterMs` | + | Accept: `{ text, aborted }` | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.3 | Gap | A valid line arriving after the abort | + | Accept: kept and cached | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.4 | Gap | The slot is held until the child exits (up to 2 s) | 0 | Accept: stated | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.5 | Gap | HTTP providers lose lines for nothing | + | Accept: serial providers only | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.6 | Gap | The signal must be optional (a test calls `writeAtmosphere` with four arguments) | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.7 | Gap | R1.3: add the contrast case (fragment and tier at 3 keep the first tier) | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.8 | Gap | R1.4: `voice.identifier` inside the try; test in `speech-stops.test.js` | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 6, Tests |
| 1.9 | Cut | R1.1 is safe; only `atmosphere.test.js:80` changes | − | Accept | **Accepted** (autonomous, pending owner review) | Tests |

**Optionals:** count aborts in `atmosphereStats` (accepted, Decision 3); stop tracking a controller once aborted
(accepted: the set is cleared on abort and an entry removed when its call settles).

Net change: the prefetch neither aborts nor is starved; aborts are not failures; serial providers only.

## Tests (pre-run)

- `server/test/atmosphere.test.js`: es "Once again…" drops (excerpt *once*; the old keep-test changes), an it
  "Basta!" line at the Fountain drops; with a serial fixture provider, an encounter call (`callProvider`) aborts an
  atmosphere call in flight: three requests sharing it all get `{ atmosphere: null, retryAfterMs: 15000 }`, drop
  `aborted`, `atmosphereStats.aborted` 1, and the next request makes a new call; a valid line returned after the
  abort is kept and cached; a non-serial provider does not abort; `callProvider(…, { background: true })` does not
  abort; `fireArrival` with an atmosphere call in flight counts busy and does not abort it.
- `server/test/party-tiers.test.js`: edited content, a fragment at 4 and a tier at 3 → `encounterId` is the deeper
  tier's; at 3 and 3 it stays the first tier's.
- `mobile/src/__tests__/speech-stops.test.js`: `speak` with a null voice or a throwing `speech.speak` restores the
  duck.
- Full suites; each fix removed in turn fails a test.

## Outcome (2026-11-06)

Built as designed, no amendment. Every fix has a test that fails without it; full suites pass
([findings](findings.md)).
