# Codex critique 1: configurable target language, Italian default

- **Dispatched:** 2026-10-31T10:40:23Z
- **Returned:** 2026-10-31T10:46:39Z (output file modification time)
- **Model:** codex-companion 1.0.6, `task --effort high`, read-only (no `--write`); thread 01a1918c-08ba-7032-988c-504f07ff80fd, model name not printed
- **Prompt:** the codex-critique template, with plan path `docs/rounds/003/trail/plan-v1.md` and goal "change the default language to Italian, making the target language configurable with Italian as the default, Spanish kept as an option, Gerald's encounter in idiomatic Italian, and one Spellbook per language."
- **Reviewed input:** `plan-v1.md`, sha256 0c9b4c5cffb4c1b7ba04890ca37c99025d6052ec279eb5dafbfc277321cf8035, HEAD 39c78b9, working tree: `docs/rounds/003/` untracked
- **Findings:** 14

## Raw output (verbatim)

```text
[codex] Starting Codex task thread.
[codex] Thread ready (01a1918c-08ba-7032-988c-504f07ff80fd).
[codex] Turn started (01a1918c-0e79-7c23-9bfa-88223e72df18).
[codex] Assistant message captured: I’ll read the plan and current round records, then trace each proposed change and acceptance ...
[codex] Running command: /bin/zsh -lc "pwd; rg --files -g 'AGENTS.md' -g 'STATUS.md' -g 'docs/rounds/003/**' -g 'packa...
[codex] Command completed: /bin/zsh -lc "pwd; rg --files -g 'AGENTS.md' -g 'STATUS.md' -g 'docs/rounds/003/**' -g 'packa... (exit 0)
[codex] Running command: /bin/zsh -lc 'cat STATUS.md'
[codex] Command completed: /bin/zsh -lc 'cat STATUS.md' (exit 0)
[codex] Running command: /bin/zsh -lc 'cat /Users/bary/.agents/skills/codex-critique/SKILL.md; cat /Users/bary/.agents...
[codex] Command completed: /bin/zsh -lc 'cat /Users/bary/.agents/skills/codex-critique/SKILL.md; cat /Users/bary/.agents... (exit 0)
[codex] Running command: /bin/zsh -lc "cat AGENTS.md; cat docs/rounds/003/architecture.md; nl -ba docs/rounds/003/trai...
[codex] Command completed: /bin/zsh -lc "cat AGENTS.md; cat docs/rounds/003/architecture.md; nl -ba docs/rounds/003/trai... (exit 0)
[codex] Running command: /bin/zsh -lc 'nl -ba server/src/learning-service.js'
[codex] Command completed: /bin/zsh -lc 'nl -ba server/src/learning-service.js' (exit 0)
[codex] Running command: /bin/zsh -lc 'nl -ba server/src/language-engine.js; nl -ba server/src/learning-storage.js'
[codex] Command completed: /bin/zsh -lc 'nl -ba server/src/language-engine.js; nl -ba server/src/learning-storage.js' (exit 0)
[codex] Running command: /bin/zsh -lc 'nl -ba server/src/content-loader.js; nl -ba server/src/config.js; nl -ba server...
[codex] Command completed: /bin/zsh -lc 'nl -ba server/src/content-loader.js; nl -ba server/src/config.js; nl -ba server... (exit 0)
[codex] Running command: /bin/zsh -lc "nl -ba server/src/language-engine.js; nl -ba server/src/learning-storage.js; nl...
[codex] Command completed: /bin/zsh -lc "nl -ba server/src/language-engine.js; nl -ba server/src/learning-storage.js; nl... (exit 0)
[codex] Assistant message captured: I’ve checked the loader, grading, and save paths. Two areas need closer scrutiny: the loader ...
[codex] Running command: /bin/zsh -lc 'nl -ba client/src/stores/gameStore.js; nl -ba client/src/api/encounter.js; nl -...
[codex] Command completed: /bin/zsh -lc 'nl -ba client/src/stores/gameStore.js; nl -ba client/src/api/encounter.js; nl -... (exit 0)
[codex] Running command: /bin/zsh -lc 'nl -ba server/test/helpers.js; nl -ba server/test/fixtures/fake-cli.mjs; nl -ba...
[codex] Command completed: /bin/zsh -lc 'nl -ba server/test/helpers.js; nl -ba server/test/fixtures/fake-cli.mjs; nl -ba... (exit 0)
[codex] Running command: /bin/zsh -lc 'nl -ba content/language/vocabulary/gerald_coffee.yaml; nl -ba content/encounter...
[codex] Command completed: /bin/zsh -lc 'nl -ba content/language/vocabulary/gerald_coffee.yaml; nl -ba content/encounter... (exit 0)
[codex] Searching:
[codex] Running command: /bin/zsh -lc 'nl -ba server/test/learning-flow.test.js; nl -ba client/src/components/__tests_...
[codex] Command completed: /bin/zsh -lc 'nl -ba server/test/learning-flow.test.js; nl -ba client/src/components/__tests_... (exit 0)
[codex] Assistant message captured: The plan’s test command is invalid: neither workspace defines `npm test`. I also found Spanis...
[codex] Running command: /bin/zsh -lc "nl -ba server/test/learning-flow.test.js | sed -n '1,260p'; nl -ba server/test/...
[codex] Command completed: /bin/zsh -lc "nl -ba server/test/learning-flow.test.js | sed -n '1,260p'; nl -ba server/test/... (exit 0)
[codex] Searching:
[codex] Running command: /bin/zsh -lc "nl -ba client/src/components/__tests__/learning-flow.test.jsx | sed -n '1,145p'...
[codex] Command completed: /bin/zsh -lc "nl -ba client/src/components/__tests__/learning-flow.test.jsx | sed -n '1,145p'... (exit 0)
[codex] Running command: /bin/zsh -lc "node --input-type=module -e ' import { gradeVocabularyAnswer, matchCanonicalVoc...
[codex] Command completed: /bin/zsh -lc "node --input-type=module -e ' import { gradeVocabularyAnswer, matchCanonicalVoc... (exit 0)
[codex] Assistant message captured: The existing matcher already handles the proposed accents, longest-phrase matching, and `dell...
[codex] Assistant message captured: The plan needs revision. The main design is workable, but its verification steps contain erro...
[codex] Turn completed.
The plan needs revision. The main design is workable, but its verification steps contain errors, and several mechanisms can be removed.

1. **Gap · high — The content cache ignores language.**

   **Evidence:** The plan introduces `loadGameContent({ language })` ([plan:94](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:94)), but the existing cache reads and writes using only `contentDir` ([content-loader.js:101](/Users/bary/LocalDocs/Code/ParaLLang/server/src/content-loader.js:101), [147](/Users/bary/LocalDocs/Code/ParaLLang/server/src/content-loader.js:147)).
   
   **Failure:** Load Italian, then Spanish from the same directory in one process—as the proposed two-pack tests require. Retaining this cache returns Italian content for the Spanish request.
   
   **Smallest fix (−):** Remove the content cache. Production already loads content once at startup; each service retains that object.

2. **Gap · medium — Template replacement needs explicit language plumbing.**

   **Evidence:** The plan replaces “Spanish” with `{{language.name}}` ([plan:99](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:99)). However, narration constructs its own `language` object without a name, the turn template receives only `turnData`, and grading receives only `rubric` ([prompt-builder.js:44](/Users/bary/LocalDocs/Code/ParaLLang/server/src/llm/prompt-builder.js:44), [55](/Users/bary/LocalDocs/Code/ParaLLang/server/src/llm/prompt-builder.js:55), [59](/Users/bary/LocalDocs/Code/ParaLLang/server/src/llm/prompt-builder.js:59)).
   
   **Failure:** Performing the specified replacements leaves literal `{{language.name}}` in all three prompts. `fillTemplate` silently preserves missing variables; I reproduced this in memory.
   
   **Smallest fix (+):** Explicitly pass the selected language into both prompt builders and every affected `fillTemplate` call, including the verifier’s direct grading call. Reuse the existing template function.

3. **Error · medium — The Italian no-milk rule contradicts the proposed meanings.**

   **Evidence:** The plan says an ordinary *un caffè* is already black but requires the player to make that explicit ([plan:126](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:126)). It then treats `caffe` as “an espresso,” while allowing `espresso` alone to satisfy `no_milk` ([plan:132](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:132), [145](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:145)). The server enforces those vocabulary groups ([learning-service.js:287](/Users/bary/LocalDocs/Code/ParaLLang/server/src/learning-service.js:287)).
   
   **Failure:** “Vorrei un caffè” cannot satisfy `no_milk`, while “Un espresso, per favore” can, despite the plan assigning them the same drink and requiring explicit clarification. “Coffee with no milk by definition” also overstates what *espresso* means: Treccani defines its preparation, not an unconditional exclusion of milk. [Treccani: espresso](https://www.treccani.it/vocabolario/espresso/)
   
   **Smallest fix (−):** Keep `espresso` for ordering coffee, remove it from the no-milk targets/group/example, and remove the “by definition” claim. Use `senza_latte` or `caffe_nero` for the explicit second objective.

4. **Error · medium — The proposed recall answers reject ordinary correct translations.**

   **Evidence:** The table accepts “an espresso” for `caffe` but omits “espresso”; `vorrei` accepts only “I would like” ([plan:132](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:132)). Recall grading compares complete normalized strings and only permits a limited single-word typo ([language-engine.js:28](/Users/bary/LocalDocs/Code/ParaLLang/server/src/language-engine.js:28)).
   
   **Failure:** Using the proposed entries, I confirmed that “espresso” and “I’d like” are marked incorrect with quality 2, while “an espresso” and “I would like” receive quality 5. A due review then records the incorrect result and resets repetitions ([learning-service.js:445](/Users/bary/LocalDocs/Code/ParaLLang/server/src/learning-service.js:445)).
   
   **Smallest fix (+):** Add these two aliases to the authored translations. Do not broaden the grading algorithm.

5. **Error · medium — Vocabulary notes do not teach anything in the current app.**

   **Evidence:** The plan says the note teaches the *latte* distinction ([plan:126](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:126)). Notes are omitted from prompt learning data ([prompt-builder.js:19](/Users/bary/LocalDocs/Code/ParaLLang/server/src/llm/prompt-builder.js:19)), Spellbook responses ([learning-service.js:90](/Users/bary/LocalDocs/Code/ParaLLang/server/src/learning-service.js:90)), and card rendering ([Spellbook.jsx:15](/Users/bary/LocalDocs/Code/ParaLLang/client/src/components/Spellbook.jsx:15)).
   
   **Failure:** Discovering and reviewing `con_latte` never exposes its cultural note. Writing the note cannot deliver the teaching behavior claimed.
   
   **Smallest fix (−):** Remove that claim; retain notes as author documentation. The stated goal does not require adding a note display.

6. **Error · medium — Neither proposed `npm test` command exists.**

   **Evidence:** The test instructions specify `npm test` in both workspaces ([plan:168](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:168)). Neither package defines a test script ([server/package.json:6](/Users/bary/LocalDocs/Code/ParaLLang/server/package.json:6), [client/package.json:6](/Users/bary/LocalDocs/Code/ParaLLang/client/package.json:6)).
   
   **Failure:** Both commands fail with a missing-script error; no acceptance tests run.
   
   **Smallest fix (0):** Specify the existing Node test runner and workspace Vitest commands documented in [README.md:80](/Users/bary/LocalDocs/Code/ParaLLang/README.md:80). No new npm scripts are necessary.

7. **Error · medium — Replacing fixture regexes is insufficient to run the existing suites under Italian.**

   **Evidence:** The proposed fixture change covers patterns ([plan:173](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:173)). Both fake narrators also emit Spanish ([helpers.js:67](/Users/bary/LocalDocs/Code/ParaLLang/server/test/helpers.js:67), [fake-cli.mjs:117](/Users/bary/LocalDocs/Code/ParaLLang/server/test/fixtures/fake-cli.mjs:117)). Tests submit Spanish answers and request Spanish vocabulary IDs ([learning-flow.test.js:17](/Users/bary/LocalDocs/Code/ParaLLang/server/test/learning-flow.test.js:17), [120](/Users/bary/LocalDocs/Code/ParaLLang/server/test/learning-flow.test.js:120), [cli-learning-flow.test.js:80](/Users/bary/LocalDocs/Code/ParaLLang/server/test/cli-learning-flow.test.js:80)).
   
   **Failure:** Under Italian, the unchanged fake greeting discovers no proposed Italian vocabulary—I confirmed this with the matcher. Word-help requests for `cafe` fail, and unchanged Spanish submissions cannot pass the Italian rubric. Other suites also load the new default while assuming Spanish IDs ([language-engine.test.js:9](/Users/bary/LocalDocs/Code/ParaLLang/server/test/language-engine.test.js:9), [learning-storage.test.js:15](/Users/bary/LocalDocs/Code/ParaLLang/server/test/learning-storage.test.js:15)).
   
   **Smallest fix (−):** Narrow the duplication: explicitly retain existing Spanish regression suites under `es`, then reuse their helpers for a focused Italian encounter/help/review flow. Its fixture must include narration, submissions, and vocabulary IDs—not just regexes.

8. **Error · medium — The live verifier has Spanish inputs outside its case table.**

   **Evidence:** The plan calls for an Italian case table ([plan:185](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:185)), but the subsequent HTTP encounter independently submits `"Quiero un café."` and `"Sin leche, por favor."` ([verify-cli.js:102](/Users/bary/LocalDocs/Code/ParaLLang/server/scripts/verify-cli.js:102), [113](/Users/bary/LocalDocs/Code/ParaLLang/server/scripts/verify-cli.js:113)).
   
   **Failure:** Translating only the case table leaves the live Italian encounter attempting Spanish answers. Correct Italian grading leaves it unresolved.
   
   **Smallest fix (0):** Reuse the selected table’s initial-order and contextual-follow-up answers in those HTTP requests.

9. **Gap · medium — Live verification lacks a success criterion.**

   **Evidence:** The verifier records `matched: false` without throwing ([verify-cli.js:71](/Users/bary/LocalDocs/Code/ParaLLang/server/scripts/verify-cli.js:71)). It also reports `finalState` without checking for resolution, and `main()` exits successfully whenever the function returns ([134](/Users/bary/LocalDocs/Code/ParaLLang/server/scripts/verify-cli.js:134), [164](/Users/bary/LocalDocs/Code/ParaLLang/server/scripts/verify-cli.js:164)).
   
   **Failure:** A grader can accept an English-only answer or reject the valid Italian order, and `npm run verify:cli` still exits zero. Merely completing the planned command does not establish a working encounter.
   
   **Smallest fix (0):** Define acceptance as every reported grading case matching and the HTTP encounter ending `resolved`. Inspect the existing output; additional reporting machinery is unnecessary.

10. **Gap · medium — Switching languages also requires reloading the browser.**

    **Evidence:** The plan specifies a server restart and obtains language metadata only through learner initialization ([plan:90](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:90), [116](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:116)). The client initializes once; “Restart encounter” calls only the encounter endpoint ([gameStore.js:34](/Users/bary/LocalDocs/Code/ParaLLang/client/src/stores/gameStore.js:34), [56](/Users/bary/LocalDocs/Code/ParaLLang/client/src/stores/gameStore.js:56)).
    
    **Failure:** Leave a Spanish tab open, restart the backend in Italian, then click “Restart encounter.” If no Italian save exists, the server rejects the unknown learner ([learning-service.js:49](/Users/bary/LocalDocs/Code/ParaLLang/server/src/learning-service.js:49)). If it exists, the new encounter can arrive while the client retains Spanish language metadata.
    
    **Smallest fix (0):** Document the switching procedure as “restart the server, then reload the page.” No synchronization feature is needed.

11. **Cut · medium — Cross-pack identity validation is unnecessary coupling.**

    **Evidence:** The plan requires matching encounter and objective IDs across packs and adds a rejection test ([plan:63](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:63), [170](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:170)). Runtime progression uses the selected pack’s ordered objectives; the loader already validates each pack’s references and next-objective chain ([content-loader.js:126](/Users/bary/LocalDocs/Code/ParaLLang/server/src/content-loader.js:126)).
    
    **Concrete effect:** A valid Italian pack with a renamed objective would be rejected solely because Spanish uses another ID. Matching IDs also does not guarantee equal escalation or assessment behavior.
    
    **Smallest fix (−):** Remove cross-pack comparison and its rejection test. Validate each pack independently.

12. **Cut · medium — Moving Spanish saves creates an avoidable migration.**

    **Evidence:** The plan introduces `es/`, root-file fallback, duplicate retained files, and migration tests ([plan:105](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:105)). Storage already accepts a directory ([learning-storage.js:54](/Users/bary/LocalDocs/Code/ParaLLang/server/src/learning-storage.js:54)).
    
    **Concrete effect:** The first Spanish save duplicates existing progress into another location and requires permanent fallback behavior. Separate Spellbooks do not require symmetrical directory names.
    
    **Smallest fix (−):** Keep Spanish at `<saveDir>/<learnerId>.json`; use `<saveDir>/it/<learnerId>.json` for Italian. Select the storage directory at startup. Remove the migration and fallback tests; retain language-isolation coverage.

13. **Cut · medium — Shared content does not need another interpolation mechanism.**

    **Evidence:** The plan adds `{language}` substitution to character/style YAML and tests it ([plan:68](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:68)). Actual language naming already belongs in the prompt templates. The prompt builder consumes character quirks but does not consume `styleGuide` ([prompt-builder.js:35](/Users/bary/LocalDocs/Code/ParaLLang/server/src/llm/prompt-builder.js:35)).
    
    **Concrete effect:** Every load gains substitution work, including substitution into style data that never reaches the model.
    
    **Smallest fix (−):** Write “the target language” directly in shared character/style text. Remove loader substitution and its dedicated test.

14. **Cut · medium — A separate `locale` field is unnecessary for these two packs.**

    **Evidence:** Metadata already includes a valid language tag, but the plan adds a second locale identifier and propagates it through folding ([plan:56](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:56), [95](/Users/bary/LocalDocs/Code/ParaLLang/docs/rounds/003/trail/plan-v1.md:95)).
    
    **Concrete effect:** Matching ordinary Italian and Spanish vocabulary gains another configuration value and parameter path without changing the required case-folding behavior.
    
    **Smallest fix (−):** Remove `locale` and use ordinary `.toLowerCase()` for these two languages. Keep English recall normalization unchanged.

No files were changed. Verification used source inspection and in-memory probes; I did not run suites that create temporary saves or CLI files.
```
