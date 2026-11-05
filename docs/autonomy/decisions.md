# Autonomous decisions

Decisions taken during the autonomous run where the project protocol would ask the owner. Each is an autonomous
decision by Claude (claude-opus-5-5), pending owner review. Newest last.

| Date | Round | Decision | Alternatives | Why | Pending owner review |
|---|---|---|---|---|---|
| 2026-11-05 | — | Backlog order: Phase 3 world first (map, then multi-encounter engine, then one encounter per round), then lore-tone content, then Phase 4, then open items | Content tone first; one big Phase 3 round | Order given in the run brief; small rounds keep every commit green | Yes |
| 2026-11-05 | 005 | Map first with Gerald as the only encounter; other five locations explorable but empty | Generalise the encounter engine first | The map is the visible Phase 3 step and needs no engine change | Yes |
| 2026-11-05 | 005 | World content (locations, paths) shared by all language packs, in English | Per-pack locations | Narration is English; signs in the target language can come later | Yes |
| 2026-11-05 | 005 | Server does not check location on encounter start | Enforce it | Would break the frozen web client | Yes |
| 2026-11-05 | 005 | Optional PARALLANG_TOKEN; test servers and verify:cli use a random token | No token (Codex cut 2.7) | Sandbox rule for servers bound in this run | Yes |
| 2026-11-05 | 005 | Codex critique 2 dispositions: 2.1–2.5 accepted (2.4 narrower, 2.5 keeps completion), 2.6 in part, 2.7–2.9 rejected | Accept all | See round 005 Second opinion table | Yes |
| 2026-11-05 | 005 | Codex runs without its shell sandbox: code inlined on stdin | Run with sandbox bypass | bwrap cannot mount in Apptainer; read-only is required | Yes |
| 2026-11-05 | 006 | Merge all pack vocabulary files; cards validated against their own file's version | One vocabulary file per encounter | Words are shared across encounters; the Spellbook is per pack | Yes |
| 2026-11-05 | 006 | One active encounter per learner; entering another replaces the session | Several sessions | The app shows one encounter at a time; transcripts were never durable | Yes |
| 2026-11-05 | 006 | `default_encounter` in language.yaml for requests without an encounter id (web client), no location check for those | Enforce location for all | Keeps the frozen web client working | Yes |
| 2026-11-05 | 006 | Codex critique 1: all 10 findings accepted | — | See round 006 Second opinion table | Yes |
| 2026-11-05 | 007 | Fix dictated answers in the narration prompt, not the grader | Remove the grader's cap for prompted echoes | The cap is correct; prompting the answer defeats recall | Yes |
| 2026-11-05 | 007 | Meme-culture texture in English only; target-language dialogue stays beginner-level | Italian internet slang now | Needs authored, owner-reviewed colloquial content | Yes |
| 2026-11-05 | 007 | Codex critique 1: 1–9 accepted, 10 rejected | Accept all | See round 007 Second opinion table | Yes |
| 2026-11-05 | 008 | Stop grader feedback leaking answers with a prompt rule | Server-side filter on feedback text | One line; a filter would rewrite free text | Yes |
| 2026-11-05 | 008 | Codex critique 1: 1–7 accepted, 8–9 rejected | Accept all | See round 008 Second opinion table | Yes |
| 2026-11-05 | 009 | Tutorial NPC is Portia, the Market Entrance archway; the companion introduces the mechanics in a static briefing | The companion as the encounter's LLM character | The notes define the companion as the translator, not an opponent; static text cannot dictate answers by accident | Yes |
| 2026-11-05 | 009 | No gating: the Coffee Cart stays open before the tutorial; Gerald stays the default encounter | Gate the market on the tutorial | The map has been open since round 005; gating belongs to the Rift (A7); the web client is unchanged | Yes |
| 2026-11-05 | 009 | Narration word matching scoped to the played encounter's vocabulary files | Pack-wide matching (round 006) | New greetings and pronouns would otherwise appear in Gerald's lines and Spellbook | Yes |
| 2026-11-05 | 009 | Spanish ask-back target is the phrase `y tú`, not bare `tú` or `usted` | Bare `tú`; formal `usted` (Codex) | Accent folding would gloss possessive tu as "you"; informal you in both packs | Yes |
| 2026-11-05 | 009 | Codex critique 1: 1.1–1.3, 1.6, 1.7 accepted; 1.4, 1.5 with other fixes; 1.8, 1.9 in part | Accept all | See round 009 Second opinion table | Yes |
| 2026-11-05 | 010 | Butcher's Stall NPC is Mortimer the Charcutier; objectives: name a meat that is not ham, then a quantity with a unit | Bernard (the round 006 test fixture's name); a price objective | prototype.md §8.2; prices left for a later round | Yes |
| 2026-11-05 | 010 | No Italian `due` entry and no `chili` variant | Author them | Both are English words that narration matching would chip in Mortimer's English | Yes |
| 2026-11-05 | 010 | Codex critique 1: 1.1–1.5 accepted; 1.6, 1.7 in part | Accept all | See round 010 Second opinion table | Yes |
| 2026-11-05 | 010 | Grading rubric lists each target's surface forms (`forms`); grading rule names them (Amendment) | Make plurals the canonical target in content | Live: "Due etti" passed without evidence and the server rejected it; the gap affected every variant in every pack | Yes |
| 2026-11-05 | 011 | Fountain NPC is Flick the Letharger; objectives: tell it to stop, give it a direction, insist on now | Telling the time; a single riddle objective | One objective per vocabulary focus in prototype.md §8.2; numbers live in the butcher's file | Yes |
| 2026-11-05 | 011 | Brainrot / infohazard flavour only in the character sheet; no mechanics | Containment files now | Mechanics belong to B3 | Yes |
| 2026-11-05 | 011 | No Spanish detente, recto, para, ya, derecho | Author them | English collisions (détente, recto) or ambiguity; Spanish has no "straight on" target | Yes |
| 2026-11-05 | 011 | Codex critique 1: 1.1, 1.2 accepted; 1.3, 1.4 rejected | Accept all | See round 011 Second opinion table | Yes |
| 2026-11-05 | 012 | Narration rule: never offer an open objective's target words as a list or either/or choice | Allow menus; ban target words in NPC lines altogether | Menus turn recall into recognition (Mortimer 3/3); a full ban would remove natural exposure (Gerald's caffè) | Yes |
| 2026-11-05 | 012 | Portia may still ask "Come ti chiami?" before the ask-back objective | Ban it too | Modelled input in the gentlest encounter, not a menu; round 009 open item stays with the owner | Yes |
| 2026-11-05 | 012 | Codex critique 1: 1.1 rejected | Accept | Run brief's quality bar | Yes |
| 2026-11-05 | 013 | Bookshop NPC is Marginalia the Bookworm; two comprehension questions on authored passages of The Journey (home; the Cyclops name trick, Nessuno / Nadie) | Generated passages; an English comprehension answer | Authored text keeps the reading level and lore fixed; answers stay in the target language | Yes |
| 2026-11-05 | 013 | Passages live in each objective's `intent`, with an instruction to read them first | A new passage field in the engine | Content only; the intent already reaches the narration prompt | Yes |
| 2026-11-05 | 013 | Reading-context exception to the grader's third-person rule, in the encounter's constraints | Change grading.txt for all encounters | Only reading comprehension needs it | Yes |
| 2026-11-05 | 013 | Codex critique 1: 1.1–1.4 accepted, 1.5 rejected | Accept all | See round 013 Second opinion table | Yes |
| 2026-11-05 | 014 | Split A7: the Rift gate and a live full-market tour first, the boss next (A7b) | One round for gate and boss | Gate needs engine and app changes; the boss needs content and a review design; small rounds stay green | Yes |
| 2026-11-05 | 014 | The gate lists the five encounter ids explicitly (`requires_completed`) | A keyword "all other encounters" | A later encounter (party, lore fragments) would silently tighten the gate | Yes |
| 2026-11-05 | 014 | A save already standing in the Rift (allowed in rounds 005–013) is not thrown out; only moves in are refused | Move such players back to the Old Bookshop | It holds nothing yet; A7b's encounter start checks the gate | Yes |
| 2026-11-05 | 014 | Codex critique 1: 1.1, 1.2, 1.3, 1.5 accepted, 1.4 rejected | Accept all | See round 014 Second opinion table | Yes |
| 2026-11-05 | 015 | The Rift boss is Errata, a Rift-born infohazard made of mistranslations: glitched English, clean target-language words, a deadpan containment-file voice; not saveable | A corrupted market NPC; a saveable boss | Fits LORE.md (rifts mix both languages; infohazards harm whoever understands them); a corruption is not a party member | Yes |
| 2026-11-05 | 015 | Review without new vocabulary: a coffee and a meat, stop now, and "my name is Nobody" (the Cyclops trick), one required group per earlier file | A new Rift vocabulary file; one objective per earlier encounter | Every file is reviewed in three turns; Spellbook versions unchanged | Yes |
| 2026-11-05 | 015 | "Il mio nome è Nessuno." / "Mi nombre es Nadie." fail at the Rift (the review asks for mi chiamo / sono, me llamo / soy) | Accept them | Otherwise a run can skip the entrance's words (critique 1.2) | Yes |
| 2026-11-05 | 015 | The Rift's target-language ratio is fixed at 0.5 (no escalation) | 0.05 per turn as elsewhere | Escalation reaches 100% after ten turns and removes the corrupted mix (critique 1.4) | Yes |
| 2026-11-05 | 015 | Codex critique 1: 1.1–1.5 accepted, 1.6–1.7 rejected | Accept all | See round 015 Second opinion table | Yes |
| 2026-11-05 | 016 | Fix expo-doctor 19/20 with `npx expo install --fix` (expo 58.0.23, jest-expo 58.0.14, safe-area-context 5.11.x) | Pin by hand; exclude the packages from the check | The SDK's own expected versions; least surprise | Yes |
| 2026-11-05 | 016 | No Codex critique for the dependency update | Wait for the usage limit and critique | No design choice to test; Codex quota kept for round 015's live runs | Yes |
| 2026-11-05 | 017 | While an encounter is under way the Spellbook shows no meanings, notes or example English on any card, and reviews are refused (409 `IN_ENCOUNTER`) | Hide only the words in the NPC's current line | Other cards' examples and phrases answer a protected word (critique 1.1, 1.2) | Yes |
| 2026-11-05 | 017 | Between encounters a due card hides its own meaning, note and example English until reviewed; cross-card leaks for due cards accepted | Hide all meanings while any card is due (critique 1.1) | Every new word is due at once; the Spellbook would almost never show a meaning | Yes |
| 2026-11-05 | 017 | Due is checked against the clock when the Spellbook is drawn; no re-render timer | A timer at the next due boundary (critique 1.4) | The Spellbook re-renders when opened; a timer only covers a screen left open | Yes |
| 2026-11-05 | 017 | Codex critique 1: 1.2, 1.3, 1.5, 1.6 accepted; 1.1 and 1.4 accepted in part | Accept all | See round 017 Second opinion table | Yes |
| 2026-11-05 | 018 | The claude-cli preflight also accepts a subscription OAuth token from `CLAUDE_CODE_OAUTH_TOKEN` (allow-listed status shapes, firstParty only), passed to claude-cli children only | Keep native `claude.ai` sign-in only | Supervisor note of 2026-11-05: lets live runs use Claude while Codex is at its limit; API keys and third-party providers stay rejected on both routes | Yes |
| 2026-11-05 | 018 | Do not read the token out of the agent's parent process; no live claude-cli check this iteration | Copy it from `/proc/$PPID/environ` into the shell | The harness keeps it out of the shell on purpose; harvesting a credential from another process is not the agent's call | Yes |
| 2026-11-05 | 018 | Codex critique 1: all 7 findings accepted | Reject 1.3 (status exit behaviour unknown with a token) | See round 018 Second opinion table | Yes |
| 2026-11-05 | 019 | Portia gets ambient vocabulary (benvenuto, piacere, mercato; bienvenido, mucho gusto, mercado): a new encounter field listing authored words the NPC may use freely, never objective answers | Clarify in the prompt that objective words may be spoken naturally (critique 1.1) | The clarification invites modelling answers (rounds 007, 012) and costs an extra A/B arm | Yes |
| 2026-11-05 | 019 | Ambient words do not pass objectives (*Piacere!* alone is not a greeting) | Accept them for the greet objective | The greet objective teaches ciao/buongiorno; the rubric stays as authored | Yes |
| 2026-11-05 | 019 | Tapping an ambient word spends a hint, as other NPCs' scene words do | Exempt ambient words from the allowance (critique 1.10) | Same rule as every encounter; the owner's Simulator check can revisit | Yes |
| 2026-11-05 | 019 | Portia's sign quirk becomes language-neutral (no *MERCATO*) | Keep it | It is wrong in the Spanish pack (critique 1.6) | Yes |
| 2026-11-05 | 019 | Codex critique 1: 8 accepted, 2 in part, 2 rejected (1.3, 1.10) | Accept all | See round 019 Second opinion table | Yes |
| 2026-11-05 | 019 | Correction to the row above: critique 1 was 7 accepted, 3 in part (1.1, 1.9, 1.12), 2 rejected (1.3, 1.10) | — | Miscounted | Yes |
| 2026-11-05 | 019 | Keep the ambient vocabulary although the share did not rise (lines 0.17 → 0.16); E1 stays open with a content hypothesis (her English paperwork jokes) | Revert it | It fixes E2 (her real words are chipped), is inert elsewhere and leaves gameplay unchanged | Yes |
| 2026-11-05 | 020 | Second E1 try through Portia's sheet: a quirk puts her short formalities in the target language using free vocabulary, never the visitor's words; revert if it fails | Change the shared language rules or greeting template | Content first: a template change moves every NPC and Gerald's pinned prompts | Yes |
| 2026-11-05 | 020 | Round 019's after-runs serve as the baseline | Fresh baseline runs (critique 1.7) | Same model, script and settings ten minutes earlier; saves 28 calls | Yes |
| 2026-11-05 | 020 | Codex critique 1: 4 accepted (1.1, 1.2, 1.4, 1.9), 5 in part | Accept all | See round 020 Second opinion table | Yes |
| 2026-11-05 | 020 | Quirk reverted after missing the success criterion (lines 0.17, greeting 0.13); E1 becomes a template question for its own round | Keep the harmless quirk | Pre-run decision 2; it adds prompt text with no measured effect | Yes |
| 2026-11-05 | 021 | Split A8: party recruitment (A8a: SAVE / LEAVE, party in the save, Party screen) now; revisit conversations (A8b) next | One round for both | Recruitment is deterministic; conversations need a prompt template and live runs | Yes |
| 2026-11-05 | 021 | Leave is not final: a defeated saveable NPC can be invited later from the map | A final refusal | A missed tap should not cost content A8b builds on | Yes |
| 2026-11-05 | 021 | Party membership is per character; recruiting is allowed during another encounter | Per encounter; refuse during encounters | One character, one member; recruiting reveals nothing an encounter protects | Yes |
| 2026-11-05 | 021 | Fix the start route dropping `encounterId` (found while planning) | Leave for a later round | The app over HTTP started Gerald at every location | Yes |
| 2026-11-05 | 021 | Codex critique 1: 1.1, 1.2, 1.3, 1.6, 1.8 accepted; 1.4, 1.5, 1.7 in part | Accept all | See round 021 Second opinion table | Yes |
| 2026-11-05 | 022 | A party conversation is an authored, graded encounter (`party_of`), not free chat | Ungraded free conversation | Keeps "translation generates power"; reuses objectives, hints, Spellbook | Yes |
| 2026-11-05 | 022 | Party conversations start anywhere, at the player's location; off the map, outside the Rift gate and the Rift's review | Only at the member's home location | Members travel with the player; recruiting is optional, so the Rift cannot depend on it | Yes |
| 2026-11-05 | 022 | Resolved conversations count per member and can be replayed (fresh session); tiers deferred | Count only once; unlock tiers now | One authored conversation per member so far | Yes |
| 2026-11-05 | 022 | Spanish praise: bueno or delicioso, not rico | rico in a phrase ("está rico") | English collisions Puerto Rico, RICO, Costa Rica (critique 1.2) | Yes |
| 2026-11-05 | 022 | Gerald's coffee break grades adjective agreement with the coffee | Accept any form | Beginners should not be taught "il caffè è buona" | Yes |
| 2026-11-05 | 022 | Talk is disabled in the app while another encounter is under way | Let it replace the session | A tap should not throw away an ongoing encounter | Yes |
| 2026-11-05 | 022 | Codex critique 1: 1.1, 1.2, 1.5, 1.6, 1.8 accepted; 1.3, 1.4, 1.7, 1.9, 1.10 in part | Accept all | See round 022 Second opinion table | Yes |
| 2026-11-05 | 023 | Party conversations for Mortimer (tasting: like it, ask for more), Flick (slow walk: let's go, together), Marginalia (fragment: praise the story, read again) | Other scenes; no conversations for them | Each fits the character and teaches everyday phrases | Yes |
| 2026-11-05 | 023 | Spanish "more" is the phrase un poco más; "together" is juntos only; Italian ancora and insieme stay bare | Bare más; juntas; phrases in Italian too | más folds to English "mas", juntas is English; ancora and insieme are not English words | Yes |
| 2026-11-05 | 023 | Each conversation's intent tells the NPC not to say the pending answers | Rely on the global style rule | The natural questions ("Vuoi ancora?") would give the answer | Yes |
| 2026-11-05 | 023 | Codex critique 1: 1.1, 1.2, 1.4–1.7, 1.10 accepted; 1.8, 1.9, 1.11 in part; 1.3 rejected | Accept all | See round 023 Second opinion table | Yes |
| 2026-11-05 | 024 | Test temp dirs are removed when the test process exits, not when a runtime closes | Remove on `close()`; per-file teardown hook | Tests reopen a runtime's save dir to simulate a restart; an exit hook needs no change in the test files | Yes |
| 2026-11-05 | 024 | Codex critique 1: 1.1, 1.4, 1.6 accepted; 1.2, 1.5 in part; 1.3 rejected | Accept all | See round 024 Second opinion table | Yes |
