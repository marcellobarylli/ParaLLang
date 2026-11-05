# Round 007 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** `parallang_obsidian/GAME MECHANICS.md` ("Terry Pratchett × meme culture, absurd humour"; not
  edited); [round 005](../005/findings.md) and [round 006](../006/findings.md) findings (Gerald dictates the answer);
  backlog B1 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `content/narration/style_guide.yaml`, `content/characters/enemies/imp_coffee.yaml`,
  `prompts/system/base.txt`, `server/src/llm/prompt-builder.js`, `server/src/learning-service.js`, tests.

## Goal (pre-run)

The narration prompt carries the project's style guide, updated to the owner's newer tone notes (Pratchett structure
× meme-culture texture), and NPCs stop handing the player the exact phrase to type, so that a player's answer is
their own recall; measured live with codex-cli in Italian.

## Owner decisions (pre-run)

No owner was present. Autonomous decisions, pending owner review (also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md)):

1. **Fix the narration, not the grader.** The grader's quality-2 cap for a prompted echo is right; the prompt
   should stop prompting.
2. **Meme texture in English only.** Target-language dialogue stays beginner-level and correct; per-pack
   colloquial slang waits for authored, owner-reviewed content.
3. **Second opinion:** critique 1 findings 1–9 accepted, 10 rejected.

## Claim boundary (pre-run)

The round can claim: the style guide reaches the narration prompt (tests); and, for 3 baseline and 3 after
codex-cli runs in Italian, how often Gerald dictated an answer and how the echo was graded. Three runs per side show
whether a 3/3 pattern changes, not a rate. Nothing about claude-cli, Spanish, other encounters or the app.

## Deferred (pre-run)

Infohazards (B3), Journathan (B2), per-pack slang, narrator footnotes in the app, grading prompt changes; a
dictation detector in code (critique 1.2). Codex listed no Optional items.

## Design (pre-run)

1. **Style guide** (`style_guide.yaml`, schema unchanged):
   - `tone`: Pratchett structure (dry wit, footnote energy, satire of the mundane) with a contemporary meme-culture
     texture in how characters talk.
   - `rules`: keep "Never break character for the NPC", "Narrative text is always in English", "Target-language
     dialogue must be grammatically correct", "Humour should arise naturally …"; **drop** "Include word-level
     breakdowns …" (critique 1.7: the server builds breakdowns itself). Add: characters may use internet register in
     their English ("lowkey", "mid", "a whole vibe", rating things) while the narrator stays dry; evergreen formats
     and attitude over dated references; target-language dialogue stays beginner-level; and the no-dictation rule:
     **never tell the player what to say or how to phrase it — no "say", "try", "add" or "order" followed by a
     target-language answer, no quoted model answers, for any objective still open, now or later; target-language
     words may appear naturally in the character's own questions and remarks.**
2. **Gerald's sheet:** one quirk added, "Rates translations like a food critic (\"mid\", \"no notes\")" (it reaches
   the prompt through `quirks`); `humour_style` unchanged (critique 1.6: not in the prompt).
3. **Prompt:** `base.txt` gains a STYLE block: `{{style.tone}}`, `{{style.narratorVoice}}` and the rules as a
   bulleted list. The existing LANGUAGE RULES stay as they are (critique 1.8). `buildNarrationMessages` takes
   `styleGuide`; `LearningService` passes `this.content.styleGuide`; the two direct test callers pass the content's
   style guide (critique 1.5). Grading prompts unchanged.
4. **Golden fixture:** `server/test/fixtures/gerald-prompts-r005.json` is replaced by `gerald-prompts-r007.json`,
   regenerated after the change, and the golden test asserts it. One new assertion: the system prompt contains the
   no-dictation rule. The existing placeholder test covers the new placeholders (critique 1.9).
5. **Measurement** (critiques 1.2–1.4): no detector in code. Each of the 3 baseline and 3 after runs of
   `play-market.js --provider codex-cli` is classified by reading every saved line, dialogue and narrative: a line
   **dictates** when it instructs the player to say, add, try or order an expression that would satisfy an objective
   not yet passed (current or later), or quotes a model answer. Natural use of target words in Gerald's own
   questions or remarks ("Un caffè, senza latte?") does not count. Findings list every classified line.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 b256ac32…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The round can pass while Gerald still dictates | 0 | Accept: after runs must resolve without dictation | **Accepted** (autonomous, pending owner review) | Tests 3 |
| 1.2 | Error | The detector misses ordinary dictation ("You need to say …") | − | Accept: manual classification, no detector | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.3 | Error | A target-word hit is not a complete answer | − | Accept: judged against the objective | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.4 | Error | Current-objective-only check misses answers given early | 0 | Accept: every objective not yet passed | **Accepted** (autonomous, pending owner review) | Design 1, 5 |
| 1.5 | Gap | Direct prompt-builder test callers need `styleGuide` | + | Accept | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.6 | Cut | `humour_style` never reaches the prompt | − | Accept: drop that edit | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.7 | Cut | The word-breakdown rule asks for discarded output | − | Accept: drop the rule | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.8 | Error | False claim of two duplicated LANGUAGE RULES lines | 0 | Accept: they stay, no claim | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.9 | Cut | New placeholder assertion duplicates the existing test | − | Accept | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.10 | Cut | Mobile and client suites as gates | − | Reject: the run's quality bar requires every suite to pass before a non-wip commit | **Rejected** (autonomous, pending owner review) | Tests 2 |

Net change from plan v1: −1 detector, −1 character edit, −1 style rule, −1 assertion; +2 test-caller arguments; the
pass condition now requires no dictation.

## Tests (pre-run)

1. `node --test server/test/*.test.js` with the regenerated golden fixture and the no-dictation assertion.
2. `npm run test:mobile`, client vitest and build (unchanged code; run as the quality bar).
3. Live, codex-cli, Italian: 3 baseline runs on HEAD 83ec243 (already run while the critique ran:
   `results/baseline-{1,2,3}.json`) and 3 after runs (`results/after-{1,2,3}.json`). **Pass:** all 3 after runs
   resolve and no after line dictates. The no_milk echo quality and share estimates are reported either way.
4. `git diff --check`; `python3 tools/round_log_check.py 007`.

## Outcome (2026-11-05)

Built as designed with critique findings 1–9. All suites pass. Live codex-cli, Italian, 3 runs a side: runs with a
dictating Gerald line 3/3 → 0/3, echo quality 2 → 5; all 6 resolved, so the pass condition holds. The grader's
feedback still dictates the answer in 2/3 after runs: the next round. See [findings](findings.md).
