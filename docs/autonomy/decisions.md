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
