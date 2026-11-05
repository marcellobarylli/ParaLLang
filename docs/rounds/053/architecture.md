# Round 053 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog A10; prototype.md Phase 3, "Location rendering: load location descriptions from YAML,
  LLM-enhanced atmosphere".
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `getAtmosphere` in `server/src/learning-service.js`, `GET /api/world/atmosphere` (`server/src/app.js`),
  `prompts/world/atmosphere.txt`, `buildAtmosphereMessages`, `locationAtmosphereSchema`; `atmosphere` in
  `mobile/src/stores/gameStore.js`, `MapPanel.js`; tests.

## Goal (pre-run)

When switched on, the map card shows, under the static description of the current location, one or two English
sentences of atmosphere written by the LLM from the description and the location's state (its encounter open or
complete; who walks with the player). The static description is always there; the atmosphere may be missing.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Off by default** (critique 1.2). The CLI providers run one process at a time (`CLIProcessRunner`), so an
   atmosphere call delays the next encounter call by its own length (about 5–15 s with codex-cli). It is switched on
   with `PARALLANG_ATMOSPHERE=on`. While an encounter call is in flight the service asks for no atmosphere (null, not
   cached). The delay after it has started is the stated cost of switching it on.
2. **English only, no answers.** The line must hold no form of a pack entry, except forms that are also English words
   (a fixed list: *once*, *kilo*, *cafe*, *sola*, *pollo*, *basta*, *io*, *due*, *otto*, *nove*, *sei*, *salami*,
   *chorizo*, *mezzo*, *cento*, *soy*, *media*, *piano*, *chili* and their plurals where authored) and words that
   appear in the location's own static description (MERCATO; critique 1.1). Any other hit drops the line.
3. **Cache by state**, not by learner: language, location, encounter state (`open`, `complete`; `none` for a location
   without an encounter, defensive: every location has one today; critique 1.10) and the party's names. A failure
   (provider, schema, length over 300 characters, vocabulary hit) is cached as null for 10 minutes (critique 1.3).
   Concurrent requests for a key share one call.
4. **Never an error** for the provider's sake: HTTP 200 with `atmosphere: null`. An unknown learner is refused as
   elsewhere. The GET may take as long as one provider call; the app never waits on it (critique 1.13).
5. **Web client** (frozen): unchanged.

## Design (pre-run)

1. **Prompt** `prompts/world/atmosphere.txt`: the style guide's tone and narrator voice (not the NPC system prompt),
   PLACE (name and description), NOW (the encounter fact, with the character's species: "Mortimer, a charcutier, is
   here and has not been won over yet" / "The player has already won over …"), WITH THE PLAYER (names with species, or
   "nobody; the player walks alone"; critique 1.6). Rules: one or two sentences, at most 40 words, English only, not
   even a greeting, and no non-English word from the description; narration only; a passing detail; no new
   characters; nothing about what the player should say. Schema `location_atmosphere`, `{ atmosphere: string }`, no
   length in the schema (critique 1.9). The text is trimmed and its whitespace collapsed (critique 1.12).
   Temperature is passed as 0.7; the CLI providers ignore it (critique 1.11).
2. **Trace** (critique 1.5): `service.atmosphereStats` counts calls and keeps the last 50 drops with their reason
   (`provider`, `schema`, `length`, `vocabulary` with the excerpt, `busy`).
3. **App** (critiques 1.4, 1.7): one store subscription keys the line by learner, current location, that location's
   encounter completion and the party's ids. Any key change clears `atmosphere` and asks again; a reply is kept only
   if the key is unchanged. It never sets `isLoading` or `error`. `MapPanel` shows it in italic muted text under the
   description when its `locationId` is the current one.
4. **FixtureProvider** gets a `location_atmosphere` branch (critique 1.8).

## Tests (pre-run)

- Server: one call per state, served from the cache to another learner; completion, a move and a party member
  change the key and the prompt facts (with species); a pack form drops the line, *once* and MERCATO do not; too long,
  schema and provider failures give null and are not retried within 10 minutes, then are; concurrent requests share
  one call; off gives null without a call; an encounter call in flight gives null without a call; unknown learner
  refused; `schemaForCLI(locationAtmosphereSchema)` is strict with no `maxLength`; every location description of both
  packs passes the filter.
- Mobile: `MapPanel` shows the line for the current location only; the store clears it on a move and drops a late
  reply after a move or a learner switch, and never sets `error` on a failed fetch.

## Live (pre-run, queued)

After Codex's reset (01:36 UTC): a small script calling the service with codex-cli and atmosphere on, for the six
locations (open; complete where the tour reaches it), both packs. Record each line, its length, drops and their
reasons, and calls.

## Success (pre-run)

All tests pass; the web client unchanged. Live: at least five of six lines per pack kept, every kept line English,
at most 40 words and consistent with the description.

## Claim boundary (pre-run)

- Built and tested offline in this iteration; the live check is queued.
- Off by default: players see no atmosphere unless the server is started with it on.
- No Simulator: the italic line on the map card is not seen on a phone.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 ae26a787…; a fresh Claude general-purpose subagent with repo read access
(Codex at its usage limit); raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The vocabulary check drops normal English (once, kilo, cafe; MERCATO) | + | Accept: English-word allowlist and the description's own words | **Accepted** (autonomous, pending owner review) | Decision 2, Tests |
| 1.2 | Error | An atmosphere call blocks the next encounter call on the CLI runner | + | Accept: off by default, skipped while an encounter call is in flight, cost stated | **Accepted** (autonomous, pending owner review) | Decision 1, Tests |
| 1.3 | Error | Failures are never cached | + | Accept: null cached for 10 minutes | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| 1.4 | Risk | The app's stale-reply guard is on location only | + | Accept in part: the store's key covers completion and party, any change refetches; no server state key | **Accepted in part** (autonomous, pending owner review) | Design 3, Tests |
| 1.5 | Risk | Errors leave no trace | + | Accept: `atmosphereStats` with drop reasons | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.6 | Risk | Names without roles | + | Accept: species with each name | **Accepted** (autonomous, pending owner review) | Design 1, Tests |
| 1.7 | Risk | Atmosphere must stay out of isLoading, error and learner switching | + | Accept | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.8 | Risk | FixtureProvider sends any schema to narrate | + | Accept: an atmosphere branch | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.9 | Risk | No maxLength in the schema | + | Accept: test on `schemaForCLI` | **Accepted** (autonomous, pending owner review) | Tests |
| 1.10 | Question | `sealed` and `none` never happen | + | Drop `sealed`; keep `none` as documented defensive | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.11 | Question | Temperature is ignored by the CLI providers | 0 | Accept: stated | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.12 | Question | Plan and code differ (facts, whitespace) | + | Accept: this record follows the code | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.13 | Question | The request can hang for a provider call | 0 | Decide: acceptable, the app does not wait and drops stale replies; no abort | **Accepted in part** (autonomous, pending owner review) | Decision 4 |

**Deferred:** a template hash in the cache key (content is not hot-reloaded); an accessibility-label test (the line
is a separate Text, not part of the title). Accepted Optional items: the MERCATO rule in the prompt (Design 1) and
every description through the filter (Tests).

Net change from plan-v1: off by default and skipped during encounter calls, an English-word allowlist, cached
failures, drop reasons, species in the facts, a store key covering completion and party.
