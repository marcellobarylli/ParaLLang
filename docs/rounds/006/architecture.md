# Round 006 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** [round 005](../005/architecture.md) (world content, world API, map); [round 003](../003/architecture.md)
  (language packs); [`prototype.md`](../../../prototype.md) §8.2 and Phase 3 ("All 6 encounters"); backlog A2 in
  [`docs/autonomy/STATE.md`](../../autonomy/STATE.md).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `server/src/content-loader.js`, `server/src/learning-service.js`, `server/src/llm/prompt-builder.js`,
  `prompts/encounter/`, `content/languages/*/`, `mobile/`, tests.

## Goal (pre-run)

The server and the app can run any number of encounters, one per location, each with its own character, objectives
and vocabulary from the language pack, so that later rounds add the remaining Crumbling Market encounters as content
only. Gerald at The Coffee Cart plays exactly as before, and the frozen web client keeps working.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **One vocabulary per pack, many files.** All `vocabulary/*.yaml` files merge; ids are unique across them; each
   card is validated against its own file's version.
2. **One active encounter per learner.** Entering a different encounter replaces the session (transcripts were
   never durable).
3. **Default encounter** in `language.yaml` for requests that name none (the frozen web client); no location check
   for those.
4. **Second opinion:** all 10 findings of critique 1 accepted.

## Claim boundary (pre-run)

The round can claim: a second encounter defined only as content (a test fixture) loads, starts only at its location,
greets, grades, discovers vocabulary and completes independently of Gerald; Gerald's prompts are byte-identical to
round 005; the tests, iOS bundle and one live playthrough as reported. It cannot claim anything about a real second
encounter's teaching quality (none is authored yet) or about the app in the Simulator.

## Deferred (pre-run)

New real encounters (A3–A7), the party (A8), the dictated-answer narration rule (B1), several simultaneous sessions,
the web client (frozen), Simulator checks. Codex listed no Optional items.

## Design (pre-run)

### Content

- `loadGameContent` loads every `languages/<code>/vocabulary/*.yaml` and merges them into the existing
  `vocabulary` object: `entries` (all files), `references` (all files), `version` (the files' versions, sorted,
  joined with `+`; still reported as the Spellbook's `contentVersion`). Entry and reference ids must be unique across
  files. `entryVersion(id)` gives an entry's file version; card validity, discovery and review challenges use it
  instead of `vocabulary.version` (critique 1.1). Gerald's cards keep matching: his file and version are unchanged.
- Every `languages/<code>/encounters/*.yaml` loads, each with its `character:` file (shared, validated as now).
  `content.encounters: Map<id, { encounter, character }>`. Objectives may target any entry of the merged pack.
- `language.yaml` adds `default_encounter` (both packs: `imp_coffee_greeting`); it must exist.
  `content.encounter` and `content.character` stay as the default encounter's (critique 1.7), so
  `loadEncounter()` / `loadCharacter()` and default-only callers keep working.
- Optional encounter field `resolved_message`; both Gerald packs set "Gerald grudgingly approves. The coffee order
  is complete."
- `loadWorld(contentDir, encounters)` checks: every non-null location `encounter` is a pack encounter **whose
  `location` equals that location's id** (critique 1.4); every pack encounter's `location` names a location whose
  `encounter` is it. So each encounter sits at exactly one place.

### Server

- The session records `definitionId`; `definition(session)` returns `{ encounter, character }`.
  `ratioFor(turns, definition = default)` (critique 1.8: `play-market.js` passes the default definition explicitly).
  All former single-encounter reads go through the definition; `canonicalizeNarration` and evidence validation keep
  using the merged `vocabulary.entries`.
- `POST /api/encounter/start { restart, encounterId? }`: no `encounterId` → default encounter, no location check;
  with one → unknown is 400, not the encounter of the player's current location is 409 `NOT_HERE`. The active session
  is returned when it has the same definition and `restart` is false; otherwise a new session replaces it.
- Serialized encounter adds `encounterId`, `location`, `character: { name }`, `resolvedMessage` (null when unset).
- Server texts: "Help is only available for the current <name> message."; the resolved-session error becomes
  "This encounter is already complete. Restart to play again." (critique 1.6); provider labels use the name.
- Prompts (critiques 1.2, 1.3): the greeting and turn templates are filled with `enemy.name` and `location.name`
  as well as `language`; "Gerald" → `{{enemy.name}}`, "The Coffee Cart" → `{{location.name}}`. The greeting scene
  is built as "The player approaches <name> at <location> in The Crumbling Market." A test asserts Gerald's rendered
  greeting and turn prompts equal the round 005 text.
- Completion records `definitionId`. The world snapshot's `encounter` adds `characterName`.

### App

- `api.startEncounter(learnerId, restart, encounterId)`. `enterEncounter` sends the current location's encounter
  id; when the returned session id differs from the one held, it clears `assessment`, `draft` and `pendingInput`
  (critique 1.5). `restartEncounter` sends the session's `encounterId`.
- Names from the server: "Talk to <name>" / "Talk to <name> again", "Conversation with <name>",
  "<name> is considering the linguistic implications…", "Reply to <name>…", "Return to <name>"; the resolved banner
  is `resolvedMessage` (fallback "<name> is satisfied. Encounter complete."); "Order complete" becomes "Encounter
  complete"; the resolved input placeholder "Encounter complete. Restart to play again." (critique 1.6).

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 797ee09f…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Removing `content.vocabulary` breaks narration matching, evidence checks and play-market | − | Accept: keep a merged `vocabulary`, add `entryVersion` | **Accepted** (autonomous, pending owner review) | Design: Content |
| 1.2 | Error | `{{enemy.name}}` is not bound in the encounter templates | + | Accept | **Accepted** (autonomous, pending owner review) | Design: Server, prompts |
| 1.3 | Error | The greeting template still says The Coffee Cart | + | Accept: `{{location.name}}` | **Accepted** (autonomous, pending owner review) | Design: Server, prompts |
| 1.4 | Error | World checks allow two locations to hold one encounter | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design: Content |
| 1.5 | Gap | Entering another encounter keeps the old assessment and draft | + | Accept | **Accepted** (autonomous, pending owner review) | Design: App |
| 1.6 | Gap | Coffee-specific texts remain ("Reply to Gerald", "Order complete", "accepted this order") | + | Accept | **Accepted** (autonomous, pending owner review) | Design: Server, App |
| 1.7 | Error | Removing the aliases breaks `loadCharacter`/`loadEncounter` | − | Accept: keep default aliases | **Accepted** (autonomous, pending owner review) | Design: Content |
| 1.8 | Error | `play-market.js` calls `ratioFor` without a definition | + | Accept | **Accepted** (autonomous, pending owner review) | Design: Server |
| 1.9 | Error | Acceptance wants Gerald's session kept across a switch, contradicting replacement | − | Accept: drop that requirement | **Accepted** (autonomous, pending owner review) | Tests |
| 1.10 | Cut | Two live scripts both replay Gerald | − | Accept: `play-market.js` is the live acceptance run | **Accepted** (autonomous, pending owner review) | Tests |

Net change from plan v1: +2 template bindings, +1 store reset, +3 text changes; −1 live run, −1 acceptance
requirement, aliases kept instead of removed.

## Tests (pre-run)

1. `node --test server/test/*.test.js`: all existing tests, plus a new `encounters.test.js` on a temporary content
   copy with a fixture second encounter at `butchers_stall` (own character file, own vocabulary file): it loads;
   start with its id at the entrance is 409 `NOT_HERE`, at the stall it greets with the fixture character's name in
   the prompt and the location "The Butcher's Stall"; it grades against its own objectives, discovers its vocabulary
   with its file version, resolves and marks only its id complete; switching back to Gerald replaces the session;
   Gerald's cards stay valid. Loader rejections: a duplicate entry id across files, an encounter at no location, a
   location naming another location's encounter, an unknown `default_encounter`. Gerald's rendered greeting and turn
   prompts equal the round 005 text.
2. `npm run test:mobile`: existing tests updated for the new texts; entering sends the location's encounter id;
   entering a different encounter clears the assessment and draft.
3. Frozen web client: vitest and build.
4. `npx expo export --platform ios`.
5. Live (codex-cli, Italian): `node server/scripts/play-market.js --provider codex-cli`, saved under `results/`.
6. `git diff --check`; `python3 tools/round_log_check.py 006`.
