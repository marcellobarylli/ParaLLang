# Round 001 architecture

## Outcome

Complete **Phase 2 — Language Engine** around Gerald the Imp at The Coffee Cart in The Crumbling Market. A player can understand bilingual dialogue, request companion translation help, answer an authored conversational objective, receive meaningful feedback, collect trusted vocabulary in a Spellbook, and practise due words and phrases. Vocabulary and review progress survive a browser reload and server restart.

This is one implementation round with one owner gate after the finished result. The round includes the whole learning loop, basic word pronunciation, and the minimum persistence that review scheduling requires. It does not expand the world or implement the remainder of the game's save system.

## Design

### Baseline and constraints

The repository has a React 19/Vite client with Zustand, an Express server, YAML content, Zod response validation, and OpenAI/Ollama adapters. Gerald is the only implemented encounter. Current completion uses substring matching, state is a shared in-memory singleton, and translations come from generated responses. No test suite is present.

Keep ParaLLang, Gerald, The Crumbling Market, The Coffee Cart, Spellbook, and the Phase 2 — Language Engine milestone. Preserve conversational text input, absurdist character writing, English narration, beginner Spanish, and the design's allowance for mixed English/Spanish replies. Do not introduce multiple-choice dialogue, additional characters, compulsory boss reviews, or intermediate owner approvals.

Use the existing stack and provider interface. Extract testable server services and an app factory with injected provider, clock, and storage; production startup remains separate. Zustand holds presentation state and server snapshots, not a second scheduler or grading authority.

### Trusted content

Add a small, complete beginner vocabulary file under content/language/vocabulary/ for Gerald's coffee encounter. Each entry has a stable ID, word/phrase kind, Spanish form, part of speech where applicable, accepted English translations, permitted surface variants, and an authored example. Distinguish inflected forms and senses when their accepted answers differ: learning "quiero" must not silently become a test of the infinitive "querer". Support multiword phrases such as "sin leche" as independent entries.

Pre-validate the Spanish, translations, and assessment examples against reputable language references and record the references with the content. Generated per-turn metadata is not evidence that a translation is vetted. Content validation checks uniqueness, required fields, and all encounter references; a content review checks meaning and beginner suitability.

Encounter YAML names the vocabulary IDs and grammar constraints for its objectives. Canonical content supplies word meanings, accepted review answers, and Spellbook definitions. Match generated text to known forms deterministically, using word boundaries and longest phrase matches. Override generated meanings for known entries with canonical meanings. Unknown text may remain contextual dialogue but creates no review item, mastery credit, or grading reference. An LLM naming a valid ID is insufficient if the corresponding expression is absent.

Validate YAML at startup. Invalid IDs or incomplete assessment definitions cause an actionable configuration error rather than partially working teaching content. The authoritative objective and reference examples remain authored even when the surrounding conversation varies.

### Authored objectives and grading

Extend Gerald's encounter YAML with two ordered conversational objectives: request coffee, then specify it without milk. Each defines its intent, target vocabulary IDs, accepted example responses, reference meaning, contradictory/negative examples, hint policy, and next objective. A complete black-coffee order can satisfy both objectives in one turn. A contextual "sin leche" can satisfy the second objective after a coffee order is established.

Assessment concerns meaning in context. "Quiero un café sin leche" and a suitable order using "café solo" or "café negro" are positive cases. "No sin leche, con leche", quoted phrases, statements about someone else's order, and off-topic occurrences must not win merely by containing a phrase. Mixed English/Spanish is allowed when the intended task and required Spanish target are demonstrated; an entirely English answer receives help without earning the Spanish objective. Do not equate a substring or an accent omission with comprehension.

Use hybrid assessment:

- For an isolated vocabulary review, compare the complete normalized answer with authored accepted translations. Normalize case, whitespace, harmless punctuation, and configured accent variants. Permit one edit only for a single-word answer of at least five characters; shorter answers and phrases require a complete accepted variant. Preserve meaningful negation and reject added contradictory text. Exact accepted variants score 5; an accepted minor typo scores 3; a wrong answer scores 2.
- For conversational objectives and open-ended sentence responses, make a separate structured grading call through the existing provider abstraction. Supply the authored rubric, canonical target meanings, relevant dialogue context, and the player's answer as data. Request objective pass/fail results, feedback, correctly used vocabulary IDs with supporting excerpts, and an integer quality score from 0 to 5 for each assessed target. Scores mean: 0 no recall/revealed answer, 1 incorrect with little evidence, 2 incorrect or assisted, 3 correct with material difficulty, 4 correct with minor difficulty, 5 correct and unassisted. The server applies assistance caps regardless of the model's score.

Validate grader output structurally and semantically: only active objective IDs and registered target IDs are allowed; evidence must occur in the answer; scores must be integers in range; contradictions between pass/fail and results are rejected. Treat model confidence as feedback, not proof of language accuracy. A grading outage, invalid response, or incomplete verdict is an operational error, never an incorrect learner answer.

The game service decides advancement and resolution from the validated verdict. Narrative generation receives that decision and expresses it in Gerald's voice. Ignore or replace any generator-supplied encounter_state, must_translate, hints_available, and difficulty values with authoritative service values. The final UI and stored encounter must agree. Replace the old substring victory path entirely.

Assessment results update only explicitly assessed vocabulary. Passing a phrase does not imply mastery of every word in it; recognizing a word in a generated response does not prove recall. Correct incidental usage may be recorded as evidence without advancing a review interval. An initial or due target can receive one scheduling update in its current due cycle; repeated conversation use or optional practice before its due time does not repeatedly advance the schedule.

### Companion help and test boundaries

Provide visible, keyboard-accessible "Translate Word" and "Translate Sentence" controls. Use canonical word meanings and the translation already generated for the dialogue or authored for the exercise. Revealing available data makes no new LLM call.

Ordinary reading and completed dialogue retain easy translation access. During a pending objective or review, direct full reveals and hover tooltips must pass through the same assistance policy; there is no unrestricted alternate reveal on the active message. The server withholds protected meanings/translations until a permitted help request. After assessment, reveal the reference answer and explain the result.

Default to two distinct translation reveals per conversational objective, configured in encounter YAML. Repeating an already revealed selection does not spend another hint. Assistance permits conversational advancement when the meaning is correct but caps the affected target's effective review quality at 2. When it is impractical to attribute help to one target, cap all targets of that objective. Exhausting hints still allows an answer, feedback, and retry.

For a due review, allow one "Show answer" action. It reveals the canonical answer and completes that attempt with quality 0; the UI offers continuation rather than pretending a subsequent copy is unaided recall. Speech of the Spanish prompt in a Spanish-to-English review is available without exposing the English answer. This prototype measures recorded in-app assistance, not cheating through external tools or prior knowledge.

must_translate reflects a pending authored objective/review, and hints_available reflects remaining server-owned assistance. The client consumes these fields to present the appropriate controls. Retire unused duplicate meanings of these flags.

### Spellbook and scheduling

The server owns Spellbook discovery, assessment evidence, due dates, and a single custom SM-2 implementation. The client renders cards showing the Spanish form, accepted meaning, part of speech, last outcome, a clearly labelled mastery indicator, and next review date. Display an empty state and due count; let the player enter and leave review without losing an active conversation.

Record canonical words/phrases when actually encountered or intentionally revealed, deduplicated by vocabulary ID. New entries are due immediately and are labelled discovered, not mastered. Default scheduled review is Spanish-to-English recall using authored accepted answers; conversational production is assessed by the encounter grader. Words and phrases both participate, with their own schedules.

Use a deterministic SM-2 baseline: initial ease 2.5 with a floor of 1.3; successful recall qualities 3–5 advance repetitions with intervals 1 day, 6 days, then the prior interval multiplied by the prior ease and rounded to whole days. Qualities 0–2 reset successful repetitions and schedule the next review in 1 day. After choosing the interval, adjust ease by 0.1 - (5-q) * (0.08 + (5-q) * 0.02), respecting the floor. Store UTC timestamps and derive due status from the injected server clock. Mastery labels must derive from scheduling evidence, not from the number of times a word was displayed.

Separate correctness feedback from the effective scheduling score. An assisted correct answer can succeed conversationally while remaining due for relearning. A reveal, retry, or repeated HTTP delivery cannot earn multiple interval increases. Practice of an item that is not yet due gives feedback without changing its schedule.

### Learner identity, persistence, and concurrency

Give each browser profile an opaque server-issued learner ID, retained locally. Validate it as an opaque identifier before resolving storage paths. A second browser profile receives a different ID. This is a local prototype identity, not login or a promise of hosted account security.

Replace the global encounter singleton with state scoped to that learner and an encounter instance ID. Serialize mutations for each learner. Duplicate React mount effects or start requests return the existing encounter; only an explicit restart starts over. Refresh can recover an active in-memory encounter. After a server restart, the conversation can start again while the Spellbook remains intact. Separate browser tabs for the same learner must detect stale encounter/objective versions rather than submitting against a silently replaced prompt.

Persist each learner to a JSON document with schemaVersion, learnerId, and a spellbook object containing words, sentences/phrases, review state, and processed assessment IDs/results. Keep definitions in the canonical content file and persist their IDs/content version with learning evidence. Use a configurable save directory, defaulting to an ignored server/data/saves directory resolved independently of the process working directory. No worldState, party, save slots, or conversation transcript persistence is required. Later phases can extend the envelope.

Use atomic replacement of the save file and serialize writes per learner. A malformed, unreadable, or unsupported-version existing save reports a recoverable error and is preserved; do not silently replace it with an empty Spellbook. A missing file for a newly created learner is the normal initialization case. Disk failure must not produce a success response or a success banner.

Every submission has a stable attempt ID and the active encounter/challenge version. Keep a durable receipt of committed learning updates so retrying after a lost response cannot double-score. Reusing an attempt ID with different input is a conflict. Stage mutations, grading, narration, and Spellbook changes before committing: on provider/schema/storage failure, do not advance the turn, consume a review, resolve an encounter, or penalize recall. Explicit help requests are separately recorded actions; their assistance remains attached to that attempt if an answer is retried. Use bounded provider timeouts and surface retryable failures.

A committed review receipt remains replayable across restart. An old uncommitted review challenge becomes stale after restart and must be fetched again. A completed conversational assessment can be acknowledged from its receipt without restoring the old dialogue. Keep the player’s unsent/failed input available for retry.

### Interfaces and data flow

Keep the existing encounter start/dialogue routes and extend their envelopes. Add learner, assistance, and Spellbook routes. Concrete route names may follow existing conventions, but implement this contract:

- Create or recover learner identity; return a server-owned learner ID. Carry it on subsequent API requests.
- Start/read the current encounter; return encounter ID, version, current objective, transcript, authoritative flags, and difficulty. An explicit restart affects the encounter only.
- Submit dialogue with encounter ID/version and attempt ID; return structured assessment, the next NPC response, updated objective/encounter state, and the changed Spellbook snapshot.
- Reveal help for a specific encounter message/objective or review challenge; return only authorized existing translation data and updated assistance state.
- Read the Spellbook and fetch a due review challenge; issue an opaque challenge ID bound to learner, vocabulary ID, and content version. The pending review response contains no accepted answer.
- Submit a review answer or show-answer action with challenge/attempt IDs; return feedback, effective quality, canonical answer, next due date, and the updated Spellbook.

Return actionable validation errors for empty/invalid input, conflicts for stale versions, and retryable errors for provider/storage failures. The server determines scoring and due dates; ignore client-supplied quality, mastery, timestamps, resolution, and arbitrary vocabulary additions. Responses and logs must not include provider credentials.

Typical flow is: canonical content plus learner state -> active objective and language constraints -> narrative -> tracked help and player response -> validated grading -> authoritative outcome -> atomic learning update -> client feedback/Spellbook -> due recall practice.

### Difficulty and provider integration

Keep Gerald's base_spanish_ratio at 0.25 and the encounter's spanish_ratio_increase_per_turn at 0.05. One server function computes min(1, base + increment * committedPlayerTurns). The greeting uses turn 0; the response to the first successfully processed player turn uses turn 1. Rejected input, failed calls, help, and reviews do not increment encounter turns. Remove the unused character escalation_rate and the prompt builder's history-length calculation.

Feed that single value into prompt construction and any displayed difficulty. Pass canonical target vocabulary/forms and authored grammar constraints for the active objective, rather than relying only on broad labels such as "food". Keep narration English. The ratio is a generation target, not a mathematically guaranteed fraction of every short reply; automatic language detection and rejection of every off-ratio sentence are outside this round.

Retain both OpenAI and Ollama. Grading and narration use explicit schemas, with the schema/shape included in Ollama instructions as needed. Repair strict-schema compatibility, malformed JSON handling, bounded retries/timeouts, or model selection defaults only as needed for these two flows. Do not add a provider or replace the integration stack. Avoid duplicating the player's message in the assembled conversation. Cache only exact repeated grading inputs including rubric/content version and relevant context; attempt receipts provide the required retry reuse without a general semantic cache.

### Client experience and basic pronunciation

Extend the existing layout with a Spellbook panel, due-review flow, companion controls, objective/assessment feedback, and explicit encounter restart. Keep the dialogue accessible while opening the Spellbook. Distinguish loading, retryable error, ongoing conversation, and resolution; the input must not say "Encounter resolved" merely because a request is in flight.

Use browser speech synthesis on an explicit pronunciation button for Spanish vocabulary when supported. Select a Spanish voice when available, handle delayed voice availability, and present an unavailable state when no appropriate voice exists. Do not make network TTS requests, autoplay audio, or gate progress on audio. This completes Phase 2's tap-to-hear requirement; narrated audio, sound design, and speech recognition remain later work.

### Second opinion

The owner requested the consultation and then the draft; its compatible recommendations are incorporated into this round.

1. **Vetted vocabulary: adopted.** Add authored, referenced content before learning features depend on it. Spellbook entries and grading references come only from this registry, because generated translations must not become repeated teaching errors.
2. **One owner and durable Spellbook: adopted.** The server owns scheduling and writes the Spellbook portion of the planned JSON save envelope. Learner separation prevents the current singleton from mixing progress. This is the minimum persistence for Phase 2, with full game saves remaining in Phase 3.
3. **Authored criteria and structured grading: adopted.** Content defines objectives/references; a separate dialogue grading call returns pass/fail, correct vocabulary evidence, and 0–5 scores. The verdict drives encounter completion and eligible per-item learning updates. Assistance caps and per-item scores prevent one successful reply from awarding blanket mastery. Mixed-language replies remain valid under the established game design; phrase presence alone is never enough.
4. **Reuse translations and limit help during assessment: adopted.** No LLM call is made merely to reveal data already available. Active objectives have a hint budget, pending reviews withhold their answer, and all active-message reveal paths follow the policy. Free reading help remains available outside pending assessment, preserving the design's one-click translation experience. A review answer reveal is recorded as a failed recall attempt.
5. **One difficulty source: adopted.** Retain the encounter escalation field and use one function/turn counter. The duplicate calculations normally agree on successful alternating turns, but that does not justify keeping two implementations.

No substantive recommendation is set aside. Full save/load and narrated audio are deferred by roadmap scope, not rejected consultation points. The architect's earlier suggestion that a hint budget might be optional is superseded by the owner's adoption of the consultation. The historical ahead-of-origin count is incidental; the drafting baseline is clean and aligned with the local origin/main reference.

### Setup and implementation touchpoints

The committed root package-lock.json covers both npm workspaces. Add only the missing top-level setup = "npm ci" to .philharmonica/orchestrator.toml, preserving all existing bytes otherwise. Setup installs dependencies; it does not start services, create credentials, or run tests/builds. Node and npm are prerequisites; implementation should document a supported Node version compatible with import.meta.dirname and any added test tooling.

Implementation will touch the encounter/content/LLM services, new server language and persistence modules, client state/components/API, authored YAML/prompts, focused test files, and package manifests/lockfile for the chosen test tools. Add only necessary save-directory ignore rules and concise README instructions for startup, root .env handling, local storage, providers, and the selected checks. Resolve root .env consistently when launched through npm workspaces. Do not redesign unrelated application areas or rewrite the vision documents.

## Test plan

This is a feature round, not a release round. Only the checks below are selected. There are no existing automated tests or simulations to rerun or retire. The existing client build is selected because client components and dependencies change. No broad project check is configured or implied.

### New server tests and simulations

Use Node's built-in test runner, dependency injection, an injected clock, deterministic provider fixtures, and temporary save directories. Implement and run these exact focused files:

- server/test/language-engine.test.js: validate the real Gerald vocabulary/objectives and references; normalization, synonyms, accents, short-word/phrase false positives, and negation; canonical IDs versus hallucinated words/meanings; SM-2 success/failure intervals, ease floor, due boundaries, assisted score caps, phrase independence, and no repeated advancement before due; one difficulty calculation on greeting, committed turn, failed turn, and cap.
- server/test/learning-flow.test.js: exercise the real HTTP/service flow with a fake structured provider. Cover staged and one-turn coffee orders, contextual mixed-language success, English-only non-completion, negation/quotation/off-topic non-completion, authoritative resolution despite generator disagreement, invalid grader IDs/evidence, and a retryable grading error. Check protected answers are absent before authorized help, budgets cannot be bypassed through tooltips/alternate routes, repeated reveals do not double-charge, and review reveal records quality 0. Check actual application of fixture verdicts; fixtures are not evidence of real-model grading accuracy.
- server/test/learning-storage.test.js: discovery without mastery, duplicate discoveries, two learners' isolation, same-learner serialization/stale versions, duplicate attempt delivery, replay after restart, unchanged schedules on premature practice, atomic save failure, corrupt/unsupported save preservation, and Spellbook recovery after a new service instance. Use real temporary filesystem persistence, never the developer's saves.
- server/test/llm-contracts.test.js: mock provider HTTP/SDK transport while exercising each adapter's actual structured-output path for narration and grading. Assert compatible schemas/instructions, provider-specific model defaults, timeout/non-2xx/malformed JSON/schema failures, bounded retries, and a single copy of each player message. Neither adapter may require live credentials in these tests.

Selected command: node --test server/test/language-engine.test.js server/test/learning-flow.test.js server/test/learning-storage.test.js server/test/llm-contracts.test.js.

### New client tests and simulations

Use Vitest, jsdom, and React Testing Library as client development dependencies, with the lockfile updated. Mock fetch at the API boundary and speech synthesis at the browser boundary; do not mock away the components or store behavior under test.

- client/src/components/__tests__/learning-flow.test.jsx: render the actual learning UI; exercise accessible word/sentence help, exhausted hints, feedback, Spellbook discovery/due cards, review answer and reveal, return to dialogue, loading/error/retry, and resolved state. Verify mouse, touch/click, and keyboard do not create an unrestricted active-answer reveal. Test pronunciation with a Spanish voice, delayed voice availability, and unsupported/no-Spanish-voice fallback.
- client/src/stores/__tests__/learning-state.test.js: recover learner identity, deduplicate StrictMode startup, preserve pending input on failure, reject stale responses, synchronize server results into encounter/Spellbook views, and keep per-learner snapshots separate.

Selected command: npm exec --workspace client -- vitest run src/components/__tests__/learning-flow.test.jsx src/stores/__tests__/learning-state.test.js.

Run npm run build -w client once after the focused tests pass. Rerun only checks affected by subsequent fixes.

### Content and integration review

Review every authored target and rubric example against its recorded references, including accents, inflection meanings, synonyms, and contradictory milk orders. Use the simulated full flow to demonstrate: discover an item, get help, pass Gerald's objectives, answer a due review, reload/recreate the service, and recover the exact resulting schedule. Record the fixtures and the expected versus observed result in the implementation report.

Live provider evaluation is conditional on credentials or an already reachable local model being supplied in the implementation environment. For each available configured provider, run a bounded set of the authored positive, mixed-language, negated, quoted, and off-topic examples through real grading plus one complete encounter. Make no model download or account change. Report unavailable providers as unverified, and distinguish deterministic passing tests from observed live grading quality; do not claim pedagogical correctness based solely on mocks.

### Deliberately not run or added

Do not run an unselected whole-repository suite, an automatic broad check, deployment, benchmarks, load tests, a browser/device matrix, external playtesting, account flows, speech recognition, narrated audio, or Phase 3 map/party/save-slot simulations. Real speaker output and device-specific voice quality require owner/device checking; mocked speech tests establish UI behavior only. No test retirement is necessary. No implementation tests, build, install, or live provider calls are run during this document-only drafting turn.

## Questions for the owner

No blocking question remains. Implementation proceeds through the whole round using these explicit defaults; the owner reviews the finished result once.

- **Audio boundary:** include browser-based word pronunciation with graceful unavailability; defer narrator audio and speech input.
- **Identity/storage:** use an opaque browser learner ID and server JSON Spellbook saves. No account system, cloud sync, or persisted encounter transcript.
- **Help limits:** two distinct reveals per conversational objective; one answer reveal ends a review with quality 0. Normal reading keeps easy translation access.
- **Review policy:** begin with Spanish-to-English word/phrase recall and the specified SM-2 schedule. Contextual Spanish production is assessed during Gerald's encounter.
- **Mixed-language answers:** permit them when they communicate the required intent and Spanish target. A phrase appearing in a contradiction or quotation cannot resolve the encounter.
- **Provider verification:** use available configured providers without provisioning accounts or models, and state any live-validation gap honestly.
