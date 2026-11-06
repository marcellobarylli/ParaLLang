# Review 1: code of rounds 017–028 (the round's source)

- **Dispatched:** 2026-11-06 about 06:28:00 UTC
- **Returned:** about 06:32:40 UTC (exact time unknown; 279 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an independent, adversarial, read-only code reviewer (do NOT edit files, do NOT start servers or bind ports, do NOT make network or LLM calls). Repo: /work/ParaLLang (a language-learning game: Node server in server/, Expo/React Native app in mobile/, YAML packs in content/languages/{it,es}/). Review the code changes in `git diff f264de7 4e6f153 -- server/src mobile/src mobile/App.js` (excluding tests) for correctness bugs: wrong behaviour, crashes on edge inputs or missing fields from older servers or saves, answers or meanings leaking to the player during an encounter or on due cards (core rule: the Spellbook hides meanings during encounters and on due cards; nothing gives an open objective's answer — check also containment files and any English shown during encounters), the Rift gate and boss (sealed until five encounters are complete, old saves standing in the Rift, `requires_completed`), party recruitment (SAVE / LEAVE, schema 3 migration, duplicate recruits, recruiting a non-saveable NPC), party conversations started anywhere (`party_of`, counting `conversations`, replays of a resolved conversation), ambient vocabulary, the onboarding screen (once per device, races with startup), the resolving turn recording progress before its response (round 028), and server/app inconsistencies. Design records: docs/rounds/017..028/architecture.md (intent only: 017 Spellbook hiding, 018 claude-cli OAuth preflight, 019 ambient vocabulary, 021 party recruitment, 022–023 party conversations, 024 test temp dirs, 025 Fountain infohazard, 026 opening-line share, 027 onboarding, 028 containment files). Rounds 029–064 and 076–090 were already reviewed; current code may have changed since, so check that a bug still exists at HEAD before reporting it, and cite HEAD file:line. Do not re-report: kept lines or card examples showing due answers (fixed in 088 and 090), startup not knowing the server's encounter (fixed in 090). Tests: server/test (single files only, e.g. `cd server && node --test test/<file>.test.js`; never bare `node --test` in server/), mobile `cd mobile && npx jest src/__tests__/<file>`. Report at most 8 findings, most severe first: severity (Error = a bug a player can hit / Gap / Minor), file:line at HEAD, a concrete failure scenario, a suggested fix. Only what you verified; mark uncertain items. End with a short \"checked and fine\" list. Under 600 words."
- **Reviewed input:** `git diff f264de7 4e6f153` (code paths above), checked at HEAD 192780b, working tree: docs/rounds/091/ new
- **Findings:** 2

## Raw output (verbatim)

```text
I found two real problems at HEAD and nothing at Error level. Neither breaks the core rule: I found nothing that shows an open objective's answer or a due card's meaning during an encounter in `mobile/`. I read the code only and ran three small scripts that load the content packs. I ran no tests, because the server tests create a runtime and I did not check whether that binds a port.

### Findings

**1. Gap: the map's Talk button throws away a party conversation that is still going.** `mobile/src/components/MapPanel.js:89-92`; server side `server/src/learning-service.js:619-624`.
- The Party screen disables Talk for other members while a conversation is under way and says "Finish your conversation with X first" (`mobile/src/components/PartyPanel.js` Talk button). The map's "Talk to <NPC>" button has no such check: it is disabled only by `isLoading || drillHere`.
- The server never refuses a start while a different encounter is ongoing. It just replaces the one it holds in memory.
- Scenario: the player is at the Butcher's stall, which is not yet completed. They start a conversation with Flick from the Party screen, answer two objectives, tap Map, then tap "Talk to <butcher>". The Flick conversation is gone with no warning and must start again from the greeting.
- Moving between locations during an ongoing location encounter loses it the same way, but that is older behaviour. What is new is that Party guards against this and Map does not.
- Fix: pass `ongoing` into the Talk button's `disabled` and show the same "finish first" note (MapPanel already receives `ongoing`). Optionally the server could return a 409 when a different encounter is ongoing and `restart` is false.

**2. Minor: the app cannot start against a server older than round 021.** `mobile/src/stores/gameStore.js:109-111` (startup) and `:525-527` (`_loadSave`).
- Both put `api.getParty` inside a `Promise.all` with no fallback. A server without `/api/party` answers 404, and the whole startup fails with an error banner, so the map never loads.
- The rest of the store expects older servers: `refreshParty` checks `!api.getParty`, and the code notes servers that lack `spellbook` and `saveable`.
- Fix: `api.getParty(id).catch(() => ({ party: [] }))` in both places.

### Checked and fine
- **Already known, not a finding:** the server sends meanings, example English and notes in every Spellbook snapshot, and only the app hides them. The frozen web client (`client/src/components/Spellbook.jsx:17`) still shows meanings during encounters. Round 017 recorded this as accepted (architecture.md lines 68 and 77).
- **Containment files:** filed only on completion and taken only from location encounters. Their text holds no objective target form in either pack; I re-checked by script. The English words that match a target's meaning ("now", "three") are harmless, because every objective asks the player to produce the target language.
- **Ambient vocabulary:** the loader check works in both directions (an ambient form inside a target form and the reverse). The content has no ambient entry whose meaning gives away a target. Ambient words are in both the greeting and the turn prompts.
- **Party recruitment:**
  - A non-saveable character is refused (`NOT_SAVEABLE`) and an encounter that is not completed is refused (`NOT_DEFEATED`).
  - Recruiting with a party conversation's id is refused, because party conversations never enter `completedEncounterIds`.
  - A duplicate recruit returns `joined: false` with no write, and recruits run one at a time per learner.
- **Saves:** the schema 1 to 3 and 2 to 3 migrations are correct, and the party is validated on load.
- **Party conversations:**
  - The `party_of` member match (`isHomeMember`) works.
  - The `after_conversations` gate works.
  - A conversation that has been replayed adds one to `conversations` each time it resolves. A resent receipt does not add another.
  - A resolved conversation starts fresh when replayed.
  - Talk resumes the member's own conversation if it is still going.
- **Rift gate:** it requires the five location encounters. Party conversations can never count towards it, and the loader rejects them in `requires_completed`. An old save standing in the Rift still gets `SEALED`.
- **Round 028:** progress (the completed encounter, or the member's count) is recorded before the response and its Spellbook are built. The resolving turn's Spellbook uses the staged encounter.
- **Onboarding:**
  - The device flag is read before fetching. A failed fetch only skips the screen.
  - It is shown only if the player is still on the map when startup finishes.
  - Begin changes the view before writing the flag, and a save switch clears it.
- **claude-cli OAuth preflight:** the token goes only to claude-cli child processes. The token route accepts only a first-party provider, and API-key sign-ins are refused.
- **Token check:** `/api/onboarding` is covered by the optional `PARALLANG_TOKEN` check.
```
