# Codex critique 1: round 009 Market Entrance tutorial

- **Dispatched:** 2026-11-05T11:35:07Z
- **Returned:** 2026-11-05T11:42:00Z
- **Model:** codex-cli, `codex exec --sandbox read-only -c model_reasoning_effort=high`, model gpt-6.1-sol; session 01a1ab7d-d276-7501-80fc-53f31fa5b71a
- **Prompt:** the codex-critique template, preceded by "Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below", plus "Number your findings 1, 2, 3, ..."
- **Reviewed input:** `plan-v1.md`, sha256 df634e6f11f162e9e9ad0c33f4d6686d27dac4a6bfa2ca9366d2c51b8adeee83, HEAD 6d1c7ba, working tree untracked `docs/rounds/009/`. Stdin bundle sha256 e3cecfa498254e9d77ccb8cdf4012c338ad57dcf25d79c12ff8420fc21375bbf (1722 lines): `cat -n` of docs/rounds/009/trail/plan-v1.md, server/src/content-loader.js, server/src/learning-service.js, server/scripts/play-market.js, mobile/src/components/DialoguePanel.js, content/languages/it/encounters/imp_coffee_greeting.yaml, content/languages/it/vocabulary/gerald_coffee.yaml, content/world/locations/market_entrance.yaml, content/characters/enemies/imp_coffee.yaml, server/src/language-engine.js, server/test/encounters.test.js, server/test/helpers.js
- **Findings:** 9

## Raw output (verbatim)

```text
1. **Error — high: the briefing is read from the wrong object.**  
   Evidence: [plan:57](/work/ParaLLang/docs/rounds/009/trail/plan-v1.md:57) reads `encounter.companion_briefing`, but `serializeEncounter` receives the runtime session. That session contains no briefing field ([learning-service.js:231](/work/ParaLLang/server/src/learning-service.js:231)).  
   Failure: starting the tutorial returns `companionBriefing: null`; the companion never introduces the mechanics.  
   **Smallest fix (0):** read `definition.encounter.companion_briefing ?? null`.

2. **Error — high: the test updates miss assertions that the new vocabulary file breaks.**  
   Evidence: the loader joins all vocabulary-file versions but preserves each entry’s individual version ([content-loader.js:144](/work/ParaLLang/server/src/content-loader.js:144)). Existing tests equate an individual version with the aggregate ([encounters.test.js:117](/work/ParaLLang/server/test/encounters.test.js:117)) and expect the fixture aggregate to contain only the meat and coffee versions ([encounters.test.js:124](/work/ParaLLang/server/test/encounters.test.js:124)).  
   Failure: adding `entrance_greetings.yaml` makes both assertions fail. Changing the encounter-count assertion, as described in [plan:67](/work/ParaLLang/docs/rounds/009/trail/plan-v1.md:67), is insufficient.  
   **Smallest fix (0):** update both version assertions to distinguish individual file versions from the expanded aggregate.

3. **Error — high: unchanged golden prompts do not preserve Gerald’s behavior.**  
   Evidence: narration matching uses **all pack vocabulary**, irrespective of the encounter ([learning-service.js:122](/work/ParaLLang/server/src/learning-service.js:122)). Matched entries become word hints and Spellbook discoveries ([learning-service.js:391](/work/ParaLLang/server/src/learning-service.js:391)). The existing fixture produces “Bien. Tu café será tomado en serio.” ([helpers.js:68](/work/ParaLLang/server/test/helpers.js:68)); the tutorial adds Spanish `tú` ([plan:42](/work/ParaLLang/docs/rounds/009/trail/plan-v1.md:42)).  
   Failure: replaying that Gerald line now adds a `tu` chip and Spellbook entry. His golden prompt test still passes because it checks prompt text, not these response changes. Other newly added tutorial vocabulary can likewise appear in Gerald’s dialogue.  
   **Smallest fix (+):** restrict narration matching to the complete vocabulary files used by the played encounter’s targets. Reuse the existing per-entry versions to select those files, retaining the whole coffee file, including non-objective entries such as `con_latte`.

4. **Error — medium: Spanish possessive `tu` will be taught as pronoun `tú`.**  
   Evidence: canonical matching strips accents from both text and vocabulary unconditionally ([language-engine.js:51](/work/ParaLLang/server/src/language-engine.js:51), [language-engine.js:62](/work/ParaLLang/server/src/language-engine.js:62)). Setting `accent_insensitive: false` cannot prevent this.  
   Failure: a valid tutorial line such as “Tu nombre, please” gets a `tú` chip meaning “you,” although that occurrence means “your.” Encounter scoping from finding 3 does not fix this within the tutorial.  
   **Smallest fix (0):** use `usted` for the Spanish second-person target and change the corresponding examples and scripted answer to “¿Y usted?” This avoids changing the shared matcher.

5. **Gap — medium: rendering the briefing does not ensure the new player sees it.**  
   Evidence: the proposed card sits above the objective ([plan:58](/work/ParaLLang/docs/rounds/009/trail/plan-v1.md:58)), inside a list that unconditionally scrolls to its end on content-size changes ([DialoguePanel.js:39](/work/ParaLLang/mobile/src/components/DialoguePanel.js:39)).  
   Failure: when the briefing, objective and first NPC message exceed the viewport, initial layout scrolls past some or all of the introduction. The proposed render-only test can pass while this happens.  
   **Smallest fix (+):** skip automatic scrolling on the initial tutorial layout, retaining scrolling for subsequent turns. Check that initial behavior in the proposed mobile test.

6. **Error — medium: the Spellbook instruction promises behavior the server does not provide.**  
   Evidence: [plan:50](/work/ParaLLang/docs/rounds/009/trail/plan-v1.md:50) says every encountered word enters the Spellbook. The server discovers only canonical matches; unknown entries are ignored ([learning-service.js:75](/work/ParaLLang/server/src/learning-service.js:75), [learning-service.js:230](/work/ParaLLang/server/src/learning-service.js:230)).  
   Failure: Portia can say “Benvenuto,” which is absent from the supplied and proposed vocabulary, and the learner will find no corresponding card.  
   **Smallest fix (0):** say “The words and phrases shown beneath her lines go into your Spellbook, where you can review them later.”

7. **Cut — medium: remove the general briefing vocabulary prohibition.**  
   Evidence: [plan:54](/work/ParaLLang/docs/rounds/009/trail/plan-v1.md:54) adds a production validator, and [plan:71](/work/ParaLLang/docs/rounds/009/trail/plan-v1.md:71) adds its rejection test.  
   Unnecessary outcome: shipping three reviewed static paragraphs now requires a general lexical policy. That policy does not establish whether text dictates an answer: “Reply with the Italian equivalent of ‘hello’” contains none of the target surfaces but still dictates what to say.  
   **Smallest fix (−):** delete the validator and its rejection test; review the actual briefing text directly.

8. **Cut — medium: dependency diagnosis and rebuilding the frozen web client do not validate this change.**  
   Evidence: [plan:74](/work/ParaLLang/docs/rounds/009/trail/plan-v1.md:74) requires a web build, and the following line requires `expo-doctor`. The planned changes contain no web-source, dependency or Expo-configuration changes.  
   Unnecessary outcome: both checks inspect unchanged inputs without exercising tutorial loading, grading or briefing behavior.  
   **Smallest fix (−):** remove `expo-doctor` and the web build. Retain the existing web tests and the relevant mobile checks.

9. **Cut — medium: the live-run and reporting requirements exceed the stated acceptance boundary.**  
   Evidence: [plan:76](/work/ParaLLang/docs/rounds/009/trail/plan-v1.md:76) repeats the same Italian answers three times and requires full LLM outputs in `findings.md`. The existing runner already returns narration and grading outputs ([play-market.js:87](/work/ParaLLang/server/scripts/play-market.js:87), [play-market.js:105](/work/ParaLLang/server/scripts/play-market.js:105)).  
   Unnecessary outcome: two additional Italian runs exercise identical inputs without a stated sampling criterion, and copying raw outputs duplicates the runner’s report.  
   **Smallest fix (−):** run the tutorial once per language plus the Gerald regression; summarize results and observed failures in `findings.md`, reusing the runner’s output for detail.
```
