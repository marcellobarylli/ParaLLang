# Round 007 plan v1: the tone layer reaches the prompt, and Gerald stops dictating answers

**Goal:** the narration prompt carries the project's style guide, updated to the owner's newer tone notes
(Pratchett structure × meme-culture texture, `parallang_obsidian/GAME MECHANICS.md`), and NPCs stop handing the
player the exact phrase to type, so that a player's answer is their own recall; measured live with codex-cli in
Italian (backlog B1; round 005 and 006 findings).

## Problem

- `content/narration/style_guide.yaml` is loaded and validated (`content-loader.js`) but never used:
  `prompts/system/base.txt` has no style placeholders and `buildNarrationMessages` receives no style guide. Its text
  is the Pratchett-only tone of round 001; the owner's 2026-10-31 notes add a meme-culture layer ("Pratchett gives
  the structure, memes give the texture"; characters "talk like the internet"; evergreen formats over this month's
  reference; memes are diegetic).
- Gerald's sheet (`content/characters/enemies/imp_coffee.yaml`) has the Pratchett-only `humour_style`.
- Live data, 2/2 runs (rounds 005, 006): after a partial order Gerald says "Say: 'Senza latte, per favore.'" /
  "But specify: senza latte, per favore." The player's next answer echoes it and the grader scores quality 2
  ("using the prompted Italian expression"), which shortens the SM-2 schedule. The prompt has no rule against it.

## Proposed change

1. **Style guide content** (`style_guide.yaml`, schema unchanged: `tone`, `narrator_voice`, `rules`):
   - `tone`: Pratchett structure (dry wit, footnote energy, satire of the mundane) with a contemporary meme-culture
     texture in how characters talk.
   - `rules` keep the five current rules and add: characters may use internet register in their English ("lowkey",
     "mid", "a whole vibe", rating things) while the narrator stays dry; lean on evergreen formats and attitude, not
     dated references; target-language dialogue stays beginner-level and correct (no target-language slang until a
     pack authors it); **never tell the player what to say: no "Say: …", no quoted model answers, no complete answer
     to the current objective; target-language words may appear naturally in the character's own speech**.
2. **Gerald's sheet:** `humour_style` becomes "dry, Pratchett-esque, fourth-wall-adjacent, with the attitude of
   someone lowkey judging your order"; one quirk added: "Rates translations like a food critic (\"mid\", \"no
   notes\")". Spanish and Italian share the sheet.
3. **Prompt:** `base.txt` gains a STYLE block filled from the style guide (`{{style.tone}}`,
   `{{style.narratorVoice}}`, `{{style.rules}}` as a bulleted list). `buildNarrationMessages` takes `styleGuide`;
   `LearningService` passes `this.content.styleGuide`. The two current LANGUAGE RULES lines that duplicate style
   rules stay (no removal in this round). Grading prompts are unchanged.
4. **Golden fixture:** `server/test/fixtures/gerald-prompts-r005.json` is replaced by
   `gerald-prompts-r007.json`, regenerated after the change; the golden test asserts the new text, and a new
   assertion checks that the system prompt contains the style guide's no-dictation rule and no unfilled
   placeholder.
5. **Measurement:** `play-market.js` reports, per NPC line, `dictates`: true when the line contains a complete
   accepted answer of the current objective's remaining targets in a "say/specify/try" instruction or in quotes
   — implemented as: the line contains a quoted span (straight or curly quotes) with a target-language surface
   form of the current objective's targets, or the words "say:"/"specify:"/"try:" followed by such a form. Run it
   3 times before the change (baseline, on HEAD) and 3 times after, codex-cli, Italian; report dictation counts,
   the `no_milk` echo quality, pass/fail, and the share estimates.

## Assumptions

- The CLI's structured output keeps the same schema; only instructions change.
- Three runs per side is enough to see a 2/2-style pattern change, not to estimate a rate.

## Risks

- A longer system prompt may slow calls; timings are reported.
- The rule may make Gerald stop using the target words at all, lowering the language share; the share estimates
  would show it.

## Alternatives considered

- Change the grader to stop capping echoed phrases: hides the teaching problem rather than fixing it.
- Per-language meme slang now: needs authored, owner-reviewed colloquial content; deferred.

## Out of scope

Infohazards (B3), Journathan (B2), per-pack slang, narrator footnotes in the app UI, grading prompt changes.

## Acceptance criteria

1. Server tests pass, with the regenerated golden fixture and the style assertions; mobile and client tests
   unchanged and passing.
2. Live: 3 baseline + 3 after runs complete; findings report dictation counts and echo qualities before and after,
   with every LLM line saved under `results/`. The round passes if all 6 runs resolve the encounter; the dictation
   result is reported either way.
3. `python3 tools/round_log_check.py 007` passes.
