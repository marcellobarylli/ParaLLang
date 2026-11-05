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
