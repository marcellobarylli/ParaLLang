# Review 1: code of rounds 040–053 (the round's source)

- **Dispatched:** 2026-11-06 about 05:53:35 UTC
- **Returned:** about 05:56:55 UTC (exact time unknown; 199 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an independent, adversarial, read-only code reviewer (do NOT edit files, do NOT start servers or bind ports, do NOT make network or LLM calls). Repo: /work/ParaLLang (a language-learning game: Node server in server/, Expo/React Native app in mobile/, YAML packs in content/languages/{it,es}/). Review the code changes in `git diff b0a87e9 8b87bde -- server/src mobile/src mobile/App.js` (excluding tests) for correctness bugs: wrong behaviour, crashes on edge inputs or missing fields from older servers or saves, answers or meanings leaking to the player during an encounter or on due cards (core rule: neither NPCs, the grader feedback, nor the Spellbook give an open objective's answer; the Spellbook hides meanings during encounters and on due cards), objective/ordering logic (unordered objectives, `held` early passes in ordered encounters), relationship tiers chosen by `conversations` count and party story hints, the time objective, the atmosphere feature (cache, concurrency, off by default, per learner), ambient audio and font loading (races, unmount, Sounds switch), the server token sent by the app, save-schema compatibility (learning-storage.js), and server/app inconsistencies. Design records: docs/rounds/040..053/architecture.md (intent only: 040 app token, 041 ambient audio, 042 font, 043 party hints, 044 leak scan (script), 045 unordered objectives, 046 folded share estimate, 047–048 relationship tiers, 049 leak scan foreign, 050 time objective, 051 held early pass, 052 numbers, 053 atmosphere). Current code may have changed since; check that a bug still exists at HEAD before reporting it, and cite HEAD file:line. Tests: server/test (single files only, e.g. `cd server && node --test test/<file>.test.js`; never bare `node --test` in server/), mobile `cd mobile && npx jest src/__tests__/<file>`. Report at most 8 findings, most severe first: severity (Error = a bug a player can hit / Gap / Minor), file:line at HEAD, a concrete failure scenario, a suggested fix. Only what you verified; mark uncertain items. End with a short \"checked and fine\" list. Under 600 words."
- **Reviewed input:** `git diff b0a87e9 8b87bde` (code paths above), checked at HEAD 8adf0b9, working tree: docs/rounds/089/ new
- **Findings:** 4

## Raw output (verbatim)

```text
I found 4 issues: one confirmed by running the code, one known trade-off that is still only partly fixed, and two minor ones (one of them latent). I edited no files.

**1. Error (when atmosphere is on): the atmosphere line can show an open objective's answer.** `server/src/learning-service.js:45` (`ATMOSPHERE_ENGLISH`), applied at `:1091-1093`.
- The exemption list treats these as English words and lets them through: `basta`, `pollo`, `cento`, `mezzo`, `io`, `soy`, `sola`, `sei`, `otto`, `nove`, `once`, `kilo`. Many of them are answers of open objectives:
  - `basta` for the Fountain and the Rift (`cracked_fountain_letharger.yaml:40`, `the_rift_errata.yaml:68`).
  - `pollo`, `cento` and `mezzo` at the butcher's stall.
  - `io` in the entrance tutorial; `soy` in the Spanish one.
  - `sei`, `otto`, `nove` and es `once` in the Flick party conversation.
- I checked it by calling `writeAtmosphere` with a stub provider (no network). `Someone by the dry basin sighs "Basta!" at the stopped clock.` at `cracked_fountain` with state `open` was kept, and nothing was dropped.
- The map card shows the line even while an encounter is under way, so it breaks the core no-answer rule.
- Round 081 already removed these exemptions for footnotes because they hold answers. The atmosphere filter still has them.
- Fix: drop words that are targets of any objective from the exemption, or at least the open objectives at this location and the Rift's. Simplest is to drop the list, as 081 did.

**2. Gap: an atmosphere call holds the single CLI slot, and the service doesn't track it.** `learning-service.js:1082`.
- `writeAtmosphere` calls `provider.structuredChat` directly, without `callProvider` and without an AbortSignal. So `providerCallsInFlight` stays 0.
- That means the arrival prefetch (`:708`) and encounter calls go ahead and queue behind it. The queue deadline in `cli-runner.js:56` starts at enqueue, so an encounter turn can time out because of a cosmetic line.
- Scenario: move to a place (the app asks for the line at once), then tap the encounter. The greeting waits behind the atmosphere call.
- Round 053 critique 1.2 accepted this cost. The guard only works one way, though: atmosphere waits for encounter calls, but encounter calls don't wait for atmosphere.
- Fix: count the call, give it an AbortController, and abort it in `startEncounter`, `submitDialogue` and `fireArrival`.

**3. Minor (latent): a story unlocked during a deeper conversation is never announced.** `learning-service.js:383` (`conversationOf` uses the first tier) together with `mobile/src/components/DialoguePanel.js:127-129`.
- A conversation fragment's `encounterId` is always the first-tier conversation's id. If a fragment's threshold is reached while a deeper conversation is resolving, `fragmentNote` finds no match and says nothing.
- Current content can't hit this, because all thresholds are 3 and the deeper tiers also open at 3. A future pack with a fragment at 5 would.
- Fix: return the tier that was offered at `unlockedAt - 1` conversations, or match on `party_of`.

**4. Minor: a synchronous throw inside `speak` leaves the ambience turned down.** `mobile/src/speech.js` (the `speak` function).
- `duck(true)` runs before `speech.speak(...)`. If `speak` throws synchronously (for example `voice` is null), the ambience stays lowered until the app comes back to the foreground.
- Fix: wrap the call in try/catch and call `restore()` in the catch.

**Checked and fine:**
- **Ordering:** unordered objectives (`activeObjectives`, `currentObjective`, `remaining`, the hint cap with `anyReveal`); ordered `held` early passes (not banked, `HELD_NOTE` and the grader's order line, `resultMark` and the suffix in the app).
- **Matching:** the per-cluster folding in `matchCanonicalVocabulary`.
- **Relationship tiers:**
  - The loader requires a first tier and distinct thresholds.
  - `partyConversationFor` picks by count, and the `NOT_YET` check is in place.
  - `conversationOffer` resumes a party conversation already under way.
  - `isHomeMember` is used the same way by the member count, the fragments and the story hints.
  - `storyHint` and `tierNote` show nothing when an older server leaves the fields out.
- **Saves:** encounter sessions live in memory only, so `passedObjectiveIds ?? []` is enough; no save-schema change.
- **Atmosphere:** off by default; the cache is keyed by state (party included); `busy` is not cached; the app keys by learner, place, completion and party, and drops replies that come back late or for another state; a 404 from an older server is swallowed.
- **App token:** trimmed the same way on both sides, header names match, and the 401 messages never show the value.
- **Ambience and font:** ambience handles the generation race, follows the Sounds switch (`soundsKnown`), stays silent on onboarding, and the ducking ignores a stale `onStopped`; the font never blocks, and a load failure keeps the system font.
- **Time objective:** content only (round 050); no server logic changed.
```
