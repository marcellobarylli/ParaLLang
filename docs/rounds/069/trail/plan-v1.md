# Round 069 plan v1: kept lines, live

## Goal
Round 060 (backlog C9) keeps a paid "Translate sentence" reveal in the save (`lines`) and shows it in the Spellbook,
withheld during encounters and while any card in the line is due. It was checked by fixture tests only. This round
checks it end to end with real provider output (codex-cli), in-process, no port: does a real NPC line survive into
the save and the Spellbook unchanged, hidden and opened at the right moments, and across a server restart?

## Offline check (done before the plan)
1,170 NPC lines recorded in earlier rounds' live reports: longest native 377 characters, translation 355 (median
142 / 147). The 500-character cap (`LINE_TEXT_LIMIT`) never cut a recorded line.

## Script: `docs/rounds/069/results/kept-lines-live.mjs`
In-process like round 068's `atmosphere-live.mjs`: real `LearningService`, `JsonLearningStorage` in a temp dir
(`makeTempDir`, removed at the end), `--provider codex-cli`, JSON report on stdout. Per pack (it, es), for two
encounters, Gerald (coffee_cart) and Mortimer (butchers_stall, walked to by `route()` from play-market.js):

1. Start the encounter (greeting call).
2. Reveal the greeting by sentence. Check: `charged` true; the response's `spellbook.lines[0]` has the greeting's
   id, speaker, native, `translation: null`, `hidden: true`, the location's name, and vocabularyIds equal to the
   greeting's chipped words in order.
3. Read the save file: the kept line's native and translation equal the provider's dialogue fields byte for byte
   (or their first 500 characters), and `locationId` is the scene's place.
4. Reveal the same sentence again: `charged` false, still one line in the save.
5. Reveal one chipped word of the line, if any: no new line.
6. Play play-market.js's scripted lines for the encounter until it resolves. After each new NPC line, try a
   sentence reveal: either kept (newest first) or `HINTS_EXHAUSTED` (recorded, not a failure).
7. After the resolve: `inEncounter` false; every kept line whose vocabularyIds include a due card is hidden with
   `translation: null`; a line with no vocabularyIds is shown.
8. Review every due card named by a kept line with its first accepted translation (local grading, no call). Then
   `getSpellbook`: every kept line whose cards are all reviewed shows its translation, equal to the save's.
9. Restart: a new `LearningService` on the same storage; `getSpellbook` returns the same lines.

Across both encounters of a pack the lines accumulate in one save (newest first, deduped).

## Pass criteria (fixed before the run)
- Pass: every check in steps 2–5, 7–9 holds in all four encounter runs, and every encounter resolves.
- Expected count of calls: about 2 × (3 + 5) = 16, within Codex's window.
- A provider failure or a non-resolving encounter is recorded and re-run once; it is not a kept-lines failure.
- Report per run: the kept lines (native, translation, vocabularyIds, lengths), the hidden states at each step, the
  reveals refused for hints, and the calls.

## Not in scope
No code change unless a check fails (then a fix with a test, by Amendment). No app (Simulator) check.
