# Round 007 findings

## Question

Once the style guide (updated to the owner's Pratchett × meme-culture notes) reaches the narration prompt with a rule
against telling the player what to say, does Gerald stop dictating the answer, and is the player's answer then
graded as their own recall?

## Finding

Yes, for Gerald. In 3 baseline runs on the old prompt Gerald dictated the answer in 3/3 runs ("Try adding senza
latte", "Say 'senza latte'", "Add «senza latte, per favore»"), and the echoed "Senza latte" was graded quality 2 each
time. In 3 runs on the new prompt he dictated in 0/3: he asks instead ("Come lo vuoi?", "Vuoi latte nel caffè?",
"Vuoi il latte?"), and the same answer was graded quality 5, "unassisted", each time. The tone shows the new layer
lightly ("Your Italian: no notes", "The milk remains unemployed").

The dictation moved to the grader: its feedback after the first turn, which the app shows the player, said "Add
“senza latte” to specify no milk." in 2/3 after runs (1/3 in the baseline: "Add “senza latte” to specify no milk."). It is not clear the change caused this; three runs cannot tell. The grading prompt was
out of scope here; it is the next fix.

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 (10 findings: 1–9 accepted, 10 rejected,
  autonomously).
- Live: Codex CLI 0.166.0 (ChatGPT subscription), CPU, Linux compute node in Apptainer, Italian;
  `node server/scripts/play-market.js --provider codex-cli`, in-process, 3 runs on HEAD 83ec243 (baseline) and 3 on
  the build commit (after), each with the same scripted answers ("Vorrei un caffè, per favore.", then "Senza latte,
  per favore.").
- Classification by reading every saved dialogue and narrative line (Design 5): a line dictates when it instructs
  the player to say, add, try or order an expression that would satisfy an objective not yet passed, or quotes a
  model answer.
- Automated: server, mobile, client suites and build, `git diff --check`.

## Results

| Check | Result |
|---|---|
| Server tests | 77/77 (golden fixture regenerated as `gerald-prompts-r007.json`; style assertions added) |
| Mobile / web client | 19/19; 12/12 and build |
| Resolved | baseline 3/3, after 3/3 |
| Runs with a dictating NPC line | baseline **3/3** (4 lines), after **0/3** (0 lines) |
| no_milk echo quality | baseline 2, 2, 2; after **5, 5, 5** |
| Grader feedback dictating after turn 1 | baseline 1/3, after 2/3 |
| Share estimate (not in translation), turns 0 / 1 / 2, mean | baseline 0.19 / 0.17 / 0.36; after 0.19 / 0.20 / 0.33 (requested 0.25 / 0.30 / 0.35) |
| Narration call time, mean | after 7.0 s |

Dictating lines, baseline (none after):

| Run | Turn | Line |
|---|---|---|
| 1 | 0 | "… Order un caffè, senza latte. Milk is a war crime." |
| 1 | 1 | "… Try adding senza latte—without milk—to your order. Civilization hangs by a teaspoon." |
| 2 | 1 | "… Say ‘senza latte’—without milk—or order a ‘caffè nero’: black coffee. Your cup needs principles." |
| 3 | 1 | "… Add «senza latte, per favore» to your order. I refuse to supervise a dairy incident." |

Gerald's turn-1 lines after the change: "Un caffè, certo. … But the milk question remains. Come lo vuoi? Milk in
coffee is a war crime; I require your position, not your lawyer’s." / "… Vuoi latte nel caffè? I consider it a war
crime, but apparently we must ask." / "… Vuoi il latte? I consider milk in coffee a war crime, but the form insists
I ask." Run 3's greeting had little Italian (estimate 0.12: "Buongiorno! Sono Gerald." and English).

## Decision

Ships. Next work from the data: stop the grader's feedback from dictating the answer to an open objective (a
grading-prompt round, re-checked with `verify:cli`, since grading verdicts must not change), then A3.

## Evidence

- Build commit: "round 007: style guide in the narration prompt, no dictated answers". Main paths:
  `content/narration/style_guide.yaml`, `content/characters/enemies/imp_coffee.yaml`, `prompts/system/base.txt`,
  `server/src/llm/prompt-builder.js`, `server/src/learning-service.js`,
  `server/test/fixtures/gerald-prompts-r007.json`, `server/test/encounters.test.js`.
- Live: [`results/baseline-1.json`](results/baseline-1.json), [`results/baseline-2.json`](results/baseline-2.json),
  [`results/baseline-3.json`](results/baseline-3.json), [`results/after-1.json`](results/after-1.json),
  [`results/after-2.json`](results/after-2.json), [`results/after-3.json`](results/after-3.json) (every raw LLM
  output).
- Design and critique: [architecture.md](architecture.md), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

Shown: for codex-cli in Italian with one scripted answer sequence, 3/3 → 0/3 runs with a dictating Gerald line and
quality 2 → 5 on the echo. Three runs a side show the pattern changed, not a rate. Not shown: claude-cli, Spanish,
free-form player answers, other encounters, how the tone reads to a player, the app.

## Open items

1. The grader's feedback dictates the answer (next round).
2. **Owner:** read the new style guide and Gerald's lines (the meme layer is kept light and English-only; per-pack
   slang waits for authored content).
3. Gerald's greeting sometimes carries little Italian (0.12 in one run); watch the share in later runs.
