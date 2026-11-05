# Round 053 plan v1: an LLM atmosphere line for the current location (backlog A10)

Autonomous round (no owner present), Claude (claude-opus-5-5). Backlog A10, the last Phase 3 item: prototype.md §
Phase 3 "Location rendering: load location descriptions from YAML, LLM-enhanced atmosphere". The static YAML
descriptions exist since round 005 and are shown on the map card (`MapPanel.js`). Codex is at its usage limit
until 01:36 UTC, so this round is built and tested offline; its live check is queued.

## Goal

Under the static description of the current location, the map card shows one or two English sentences of
atmosphere written by the LLM from the location's description and its state (encounter open, complete, or sealed;
which party members walk with the player). The static description is always there; the atmosphere is an extra that
may be missing.

## Decisions

1. **English only, no target-language words.** The line is flavour, not teaching: it must hold no form of any
   vocabulary entry of the pack (checked with `matchCanonicalVocabulary` over all pack entries; a hit drops the
   line). This keeps answers and unreviewed language out of it.
2. **Lazy and separate:** `GET /api/world/atmosphere` (learner header) returns `{ atmosphere: { locationId, text } }`
   or `{ atmosphere: null }`. The map never waits for it; `GET /api/world` and `/api/world/move` are unchanged
   (pinned snapshots and tests stay as they are).
3. **Cache by state, not by learner:** the key is language, location id, encounter state (`none`, `open`,
   `complete`, `sealed`) and the sorted names of party members. Same key, same line for the server's lifetime
   (in memory); one in-flight call per key is shared. Failures are not cached (a later request retries).
4. **Never an error:** a provider failure, a schema failure, a too-long line (over 300 characters) or a vocabulary
   hit gives `atmosphere: null` with HTTP 200. Unknown learner still gives the usual 400/404.
5. **Switch:** on by default; `PARALLANG_ATMOSPHERE=off` turns it off (null without calls), for cost or tests.
6. **Prompt:** `prompts/world/atmosphere.txt`, with the style guide (tone, narrator voice, rules) but not the NPC
   system prompt. It gives the location name, the description, the state as plain facts ("The encounter here is
   complete: Flick is no longer here" / "sealed" / "open: Mortimer is here"), the party names, and rules: one or two
   sentences, at most 40 words, English only, no dialogue, no new places or characters, do not contradict the
   description, no hints about any answer. Schema `location_atmosphere`: `{ "atmosphere": string }`.
7. **App:** the store fetches the atmosphere after the world loads or changes location (not awaited by the map),
   keeps it only if the current location still matches and the learner/epoch did not change, and `MapPanel` shows
   it in italic muted text under the description. Nothing shows while it loads or when null.
8. **Web client** (frozen): unchanged.

## Tests

- Service: a fixture provider answers `location_atmosphere`; the first request calls it once, a second request for
  the same state does not; completing the encounter or recruiting changes the key (a new call); a line holding a
  pack form (e.g. "café") gives null; a provider error gives null and a retry calls again; over 300 chars gives
  null; `atmosphere: false` option gives null with no calls; concurrent requests share one call.
- HTTP through `api()`: 200 with the shape; the existing encounter tests' FixtureProvider is untouched (it never
  receives the new schema unless asked).
- Prompt: the filled template holds the description, the state line and the party names; no target-vocabulary
  learning data.
- Mobile: `MapPanel` renders the atmosphere when it matches the current location and not otherwise; the store drops
  a reply that arrives after a move to another location; api `getAtmosphere`.

## Live (queued)

After Codex's reset: start the server in-process (or a small script calling the service) with codex-cli and request
the atmosphere for each of the six locations in both states where reachable; record the lines, their length, any
vocabulary hit, and calls.

## Success

All tests pass (server, mobile, web unchanged). Offline only in this iteration; the live check is an open item.
