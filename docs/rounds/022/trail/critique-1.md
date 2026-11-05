# Codex critique 1: conversations with party members (A8b)

- **Dispatched:** 16:43:37
- **Returned:** 16:46:43
- **Model:** codex exec (model gpt-6.1-sol), `--skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, run from /tmp/r022 with the bundle on stdin; session id 01a1ac98-2f61-7672-9a75-988a130e891d
- **Prompt:** "You are an adversarial reviewer. Do NOT run any commands or read files: everything you need is on stdin, a bundle of cat -n copies of a plan (docs/rounds/022/trail/plan-v1.md) and the relevant source files of ParaLLang, a language-learning game (Node/Express server, Expo app, YAML content in Italian and Spanish packs). Critique the plan: find errors (things that would be wrong, break existing behaviour, or teach wrong language), risks, and missing tests. Check the proposed Italian and Spanish vocabulary for correctness and for collisions with English words (the matcher is language-blind and folds accents). Number each finding 1.1, 1.2, ... and label each Error, Risk or Suggestion, with a concrete fix. Put optional nice-to-haves under a final 'Optional' heading, unnumbered. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 a7ddd54d…, inside a bundle (sha256 e381a12e…, 1569 lines) of: plan-v1.md, server/src/content-loader.js, server/src/learning-service.js, server/src/learning-storage.js, server/src/llm/prompt-builder.js, prompts/encounter/greeting.txt, content/characters/enemies/imp_coffee.yaml, content/languages/it/encounters/imp_coffee_greeting.yaml, mobile/src/stores/gameStore.js, mobile/src/components/PartyPanel.js; HEAD a2c626e, working tree: `docs/rounds/022/` untracked (bundle taken before any code or content was drafted)
- **Findings:** 10

## Raw output (verbatim)

```text
1.1 **Error — Talk cannot reliably start a repeat conversation.** `startEncounter` returns the existing session even when resolved (`learning-service.js:230–231`), while `enterEncounter` passes `restart=false`. Subsequent taps can leave the count at one forever. Resume ongoing sessions, but start a fresh party conversation after resolution. Test two completions and reopening an ongoing conversation.

1.2 **Error — The English-collision claim is false.** Case folding makes `rico` match **RICO** and **Puerto Rico** in English text. Accent folding cannot distinguish language either. Test English-only inputs such as “Coffee from Puerto Rico is delicious.” Require a contextual phrase such as `está rico`, or remove the bare colliding form; test both grading evidence and narration chips. Also cover the English-used expression “no bueno.”

1.3 **Risk — Valid vocabulary forms can still teach incorrect agreement or degree.** All listed spellings are valid, including *buenísimo* and *riquísimo*, but Italian *caffè* and Spanish *café* are masculine. Reject “Il caffè è buona” and “El café está rica,” while allowing feminine agreement with an explicit feminine referent. Distinguish superlatives from ordinary “good” in meanings/examples, preferably with separate entries. Put grading rules in `grammar_constraints`: vocabulary notes do not reach the grader.

1.4 **Risk — The promised coffee-break scene is not supplied to narration.** The builder receives objectives and Gerald’s personality, but no party relationship or instruction that he has made coffee. Encounter template fields are currently ignored by `buildNarrationMessages`, which hardcodes template paths. Add explicit scene context for this conversation and test greeting and later-turn prompts while retaining the original golden prompts.

1.5 **Risk — A locationless definition still reaches location-dependent code.** Besides initial narration, later narration uses `locationName(definition)`, and serialization reads `definition.encounter.location` (`learning-service.js:186, 381`). Use the session’s captured location consistently. Test start, current-session retrieval, and subsequent turns after moving elsewhere; retain normal encounter location/gate checks.

1.6 **Risk — Loader validation leaves impossible references available.** A party conversation could become `default_encounter` or appear in `requires_completed`, although it must never enter completed IDs. Reject both. Validate `party_of` after loading all definitions: alphabetical order loads `gerald_coffee_break.yaml` before its referenced encounter. Test missing, chained, self, wrong-character, and non-saveable references.

1.7 **Risk — Talk can silently discard another ongoing encounter.** Party is accessible from dialogue, and starting a different definition replaces the server session; the shared mobile path then clears the draft. Define the switching policy explicitly, preserve progress or require deliberate abandonment, and test switching with an ongoing encounter and retained input.

1.8 **Risk — Recruitment-card identity differs from conversation identity.** Party members retain the original `encounterId`; the coffee-break session has a different one. Check membership by `characterId` when showing “Gerald is in your party,” and suppress recruitment for party conversations. Test that the resolved card never offers recruitment or submits the conversation ID to `recruit`.

1.9 **Suggestion — Expand persistence tests beyond a successful replay.** Verify missing `conversations` reads as zero, legacy saves still migrate, malformed values are rejected without overwriting saves, and provider/storage failures leave counts unchanged. Replay a committed final attempt after service recreation, then complete a fresh session. Assert ordinary encounter completion and Rift progress remain unchanged.

1.10 **Suggestion — Test objective and mobile failure paths.** Each adjective alternative should independently satisfy praise; praise alone must leave thanks open; combined praise and thanks should resolve. Test negation, quotations, wrong referents, and accent-folded evidence in both packs. Test party-refresh failure/retry and stale learner responses so the displayed count eventually recovers.

## Optional

- Support natural prenominal forms *buon caffè* and *buen café* if within the intended vocabulary scope.
- Replace “first by file order” with an explicit selection rule or uniqueness constraint; adding a filename should not silently change the Talk destination.
```
