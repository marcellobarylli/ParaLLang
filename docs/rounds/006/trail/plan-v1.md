# Round 006 plan v1: the multi-encounter engine

**Goal:** the server and the app can run any number of encounters, one per location, each with its own character,
objectives and vocabulary from the language pack, so that later rounds add the five remaining Crumbling Market
encounters as content only; Gerald at The Coffee Cart plays exactly as before, and the frozen web client keeps
working (prototype.md Phase 3, "All 6 encounters", engine part; backlog A2).

## Problem

One encounter is hard-wired:

- `content-loader.js` loads `vocabulary/gerald_coffee.yaml`, `encounters/imp_coffee_greeting.yaml` and
  `characters/enemies/imp_coffee.yaml` by name, and returns single `encounter`, `character`, `vocabulary`;
  `loadWorld` requires exactly one location to hold that encounter.
- `LearningService` reads `this.content.encounter`, `this.content.character` and `this.content.vocabulary.version`
  throughout (ratio, objectives, discovery, Spellbook card validity, narration, grading, completion), and some
  messages name Gerald.
- `prompt-builder.js` hard-codes the scene "The player approaches Gerald at The Coffee Cart";
  `prompts/encounter/greeting.txt` and `dialogue_turn.txt` name Gerald.
- The app's texts name Gerald ("Talk to Gerald", "Conversation with Gerald", "Gerald is considering…", "Gerald
  grudgingly approves…", "Return to Gerald"), and `startEncounter` takes no encounter id.

## Proposed change

### Content

- A pack's `vocabulary/*.yaml` files are all loaded and merged. Each file keeps its own `version` and
  `references`; entry ids and reference ids must be unique across the pack's files. Each entry records its file's
  version (`entryVersion(id)`); a Spellbook card is valid when its saved `contentVersion` equals its entry's file
  version (today's Gerald cards keep matching: the file and its version are unchanged).
- A pack's `encounters/*.yaml` files are all loaded; each names its shared character file (`character:` path,
  loaded and validated as now). Objectives may only target vocabulary from the merged pack.
- New optional encounter field `resolved_message` (shown when the encounter is won). Gerald's packs set the
  current text "Gerald grudgingly approves. The coffee order is complete." (and the Spanish equivalent stays
  English, as the UI is English).
- `language.yaml` gains `default_encounter: imp_coffee_greeting`: the encounter started when a request names none
  (the frozen web client).
- `loadWorld` check becomes: every non-null location `encounter` exists in the pack; every pack encounter's
  `location` names a location whose `encounter` is that encounter (so each encounter sits at exactly one place, and
  no encounter is unreachable).
- The content object exposes `encounters: Map<id, { encounter, character }>`, `defaultEncounterId`,
  `vocabularyById` (merged), `entryVersion(id)` and `contentVersion` (the pack's file versions, sorted, joined with
  `+`, reported as the Spellbook's `contentVersion`). `content.encounter`, `content.character` and
  `content.vocabulary` are removed; `verify-cli.js` and the tests move to the default encounter via
  `content.encounters.get(content.defaultEncounterId)`.

### Server

- The per-learner session (`this.encounters`) records `definitionId`. A helper `definition(session)` returns its
  `{ encounter, character }`; every former `this.content.encounter` / `character` use goes through it.
- `POST /api/encounter/start { restart, encounterId? }`:
  - no `encounterId`: the default encounter, with no location check (web client, unchanged behaviour);
  - an `encounterId`: unknown is 400; it must be the encounter of the player's current world location, else 409
    `NOT_HERE`.
  - An active session for the same definition is returned unless `restart`; a session for a different definition
    is replaced by a fresh one (one active encounter per learner, as now).
- The serialized encounter adds `encounterId` (content id), `character: { name }`, `location` (location id) and
  `resolvedMessage`. Error messages use the character's name instead of "Gerald".
- Narration prompts: `buildNarrationMessages` takes `scene` (built from the character and location names); the
  greeting and turn templates use `{{enemy.name}}` instead of "Gerald". Prompt text for Gerald is otherwise
  byte-identical.
- Completion records the session's `definitionId`.
- The world snapshot's `encounter` adds `characterName` for the location card.

### App

- `api.startEncounter(learnerId, restart, encounterId)`. `enterEncounter` sends the current location's encounter
  id; `restartEncounter` sends the active session's `encounterId`.
- Texts use the names from the server: "Talk to <name>", "Conversation with <name>", "<name> is considering…",
  `resolvedMessage` (fallback "<name> is satisfied. Encounter complete."), "Return to <name>". The resolved input
  placeholder becomes "Encounter complete. Restart to play again."

## Assumptions

- No save migration is needed: saves hold vocabulary ids and per-card `contentVersion`, which stay valid.
- The frozen web client sends `{ restart }` only and reads no field this round removes.

## Risks

- Removing `content.encounter` breaks every test and script that reads it; they are updated in the same commit.
- Prompt changes could shift Gerald's live behaviour; templates stay byte-identical for Gerald except the name
  substitution, which yields the same text.

## Alternatives considered

- Keep `content.encounter` as an alias for the default: less churn, but leaves two ways to reach the definition.
- One vocabulary file per encounter, linked from the encounter: rejected; words are shared across encounters
  (`un`, numbers, greetings) and the Spellbook is per pack.
- Several simultaneous sessions per learner: not needed while the app shows one encounter at a time.

## Out of scope

Any new real encounter content (A3–A7), the party (A8), the dictated-answer narration rule (B1), the web client
(frozen), Simulator checks.

## Acceptance criteria

1. Server tests: a temporary content copy with a second encounter (a fixture at `butchers_stall` with its own
   vocabulary file and character) loads; starting it away from its location is 409 `NOT_HERE`; at its location it
   greets with the fixture character, grades against its objectives, discovers its vocabulary, resolves and marks
   its own id complete, while Gerald's session state and cards are unaffected; switching encounters replaces the
   session. Loader rejects: duplicate entry ids across files, an encounter at no location, a location naming a
   missing encounter. All existing server tests pass, updated for the removed aliases.
2. Mobile tests: names come from the server; `enterEncounter` sends the location's encounter id; all existing tests
   pass.
3. Web client: vitest and build pass unchanged.
4. `expo export --platform ios` bundles.
5. Live (codex-cli, Italian): `verify:cli` passes and `play-market.js` resolves Gerald and marks it complete; the
   narration prompt for Gerald is unchanged (a test compares it with the round 005 text).
6. `python3 tools/round_log_check.py 006` passes.
