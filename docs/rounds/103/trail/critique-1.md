# Critique 1: the round 103 plan

- **Dispatched:** 08:31:55 UTC 2026-11-06 (journal row 4)
- **Returned:** before 08:34:40 UTC (the agent reports 123.8 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC).
- **Prompt:** adversarial read-only critique of `plan-v1.md` against the client store and API module, the server's
  routes, token check and learning service, and the test scripts: will the steps work, is replacing fetch safe, is the
  import sound, are the mutations meaningful, which fields the components read would the test miss; numbered Error /
  Gap / Cut with file:line; Optional and a checked list; under 700 words.
- **Reviewed input:** `plan-v1.md`, sha256 e45fdb48…, HEAD 398831f, working tree: docs/rounds/103/ new
- **Findings:** 7

## Raw output (verbatim in wording; bullet layout condensed when saved)

```text
1. Error: decision 1 (plan-v1.md:11). The plan says adding the token is "the Vite dev proxy's job in the browser". It is not. client/vite.config.js:11-16 only proxies /api and adds no header, and the client sends no token anywhere. Under PARALLANG_TOKEN (server/server.js:25, server/src/app.js:27), which is how the sandbox requires servers to run, every web-client request gets a 401. If the wrapper adds the token, the test hides that. Pick one and record it: (a) run the contract test with token: null for the "no token" case, plus one test showing the frozen client fails with 401 under a token; or (b) add the header in the proxy config, which is a client change.

2. Gap: the Spellbook during an encounter (client/src/components/Spellbook.jsx:17,19). The Spellbook always shows card.meanings and a Review button for due cards. The server still sends meanings during an encounter (server/src/learning-service.js:292). It only sets inEncounter: true (:316), which mobile/src/components/Spellbook.js:11 honours and the web client ignores. So the frozen client shows meanings that can answer the protected line (the round 017 rule), and Review leads to a 409 IN_ENCOUNTER banner. A store-only test never sees this. At minimum, open the Spellbook before resolving and record the leak as a finding. Decision 4 ("no client change unless the test finds a break") should then say whether this counts as a break.

3. Gap: the fields the components read are not asserted. The store passes objects through unchanged, so "played without an error" proves little. Assert the fields the JSX actually reads:
- App.jsx:35-36: assessment.overallFeedback, objectiveResults[].objectiveId/passed/feedback.
- DialoguePanel.jsx:12-13,18,22: currentObjective.prompt, difficulty, hints.remaining/limit, hints_available, protected, message.text for player lines.
- BilingualText.jsx:7-18: words[].vocabularyId/canonicalTarget/meaning/partOfSpeech, dialogue.translation.
- ReviewPanel.jsx:7-9,19-20: result.feedback/canonicalAnswer/effectiveQuality/nextReviewAt, challenge.target/practice/id.
- Spellbook.jsx:7,17-20: cards[].meanings/partOfSpeech/mastery/due/nextReviewAt, dueCount.
- language.tag/name.
All of these exist today (learning-service.js:500-549, 970-981, 1320-1331), so the test would pass now and catch a future rename.

4. Gap: the review step "then a reveal on the next card" (plan-v1.md:15). This assumes at least 2 due cards after the resolve. Cards with evidence are rescheduled, and after a wrong answer the card is due again only after a day on the fixed clock. Assert dueCount >= 2 before the review, or use startReview(vocabularyId) on a named card. A non-due card comes back as practice: true, which leaves the schedule unchanged; assert that flag either way. Also assert that startReview before the resolve fails with the IN_ENCOUNTER text (:272-277).

5. Gap: the recovery step. The store does not keep recovered. Assert the same learnerId and the same encounter.id: the restarted encounter is resumed, not replaced (learning-service.js:645-646). Use a Map-backed {getItem, setItem} as the storage.

6. Cut / rework: the mutations.
- "Drop the token" tests the server's guard, which app.js tests already cover.
- "Rename a route in the wrapper" tests the wrapper, not the contract.
- "Send a stale version" has no natural way in, because the store always sends its current version.
More meaningful replacements:
- Stale version: a second store, or a direct api() call with the same learner, takes a help and bumps the version. The first store's send then shows STALE_VERSION, and the draft and pendingInput are kept (gameStore.js:84).
- Contract: a response filter in the fetch wrapper deletes one field the components read (e.g. hints, challenge.id). This shows the item 3 assertions catch it.

7. Error, minor (plan-v1.md:21). "zustand resolves from client/node_modules" is wrong: client/node_modules is empty. zustand 5.0.12 is hoisted to the root node_modules, so the import still resolves. The zustand entry imports react (esm/react.mjs:1), so the store is not React-free. It works only because root react 19.2.4 is installed. Say so, or the dependency is invisible.

Optional
- Record the responses from this run as fixtures for client/src/components/__tests__/learning-flow.test.jsx, so the components render real server shapes. That covers items 2 and 3 without jsdom in the server suite.
- The header and banners are hardcoded "Gerald / Coffee Cart" (App.jsx:16,37). They are correct for imp_coffee_greeting in both packs. Note the coupling.
- The server's default language is it (config.js:79), while FixtureProvider is Spanish-only. State that the Italian path stays untested.
- npm run build writes client/dist, which is gitignored. Fine.

Checked, no change needed
- Replacing globalThis.fetch: safe. node --test test/*.test.js (server/package.json) on Node 22 runs each file in its own process (helpers.js:12 relies on this), and tests within a file run one after another by default. The wrapper should prefix only paths starting with /, so the helper api() calls with absolute URLs still work, and it should be restored in finally/after.
- Module import: the store module calls createGameStore() when it loads, which is harmless. globalThis.localStorage is undefined on Node 22 and the access sits in a try/catch.
- New learner: gets imp_coffee_greeting from the start without an id. It is not a party conversation, it is not gated by NOT_HERE without an id, and it has no drill_before (learning-service.js:616-661).
- Word help: the chip's vocabularyId must come from the active NPC message (:843-850). hint_limit is 2, and hints.used becomes 1. Take the id from store.encounter, not a hardcoded one.
- Send: "Quiero un café negro." resolves both objectives with FixtureProvider (helpers.js:148-156). The narrator's 'failed' state is ignored.
- Restart: works on a resolved encounter, skips the drill check, and sets view: 'dialogue'.
- Shutdown: close() calls service.shutdown(), which clears the arrival prefetch timer started by createLearner. Call it in after.
```
