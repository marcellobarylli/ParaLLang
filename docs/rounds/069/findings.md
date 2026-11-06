# Round 069 findings

## Question

Do round 060's kept lines hold up with real provider output? A paid "Translate sentence" reveal of a real NPC line
should reach the save and the Spellbook unchanged. It should be hidden during encounters and while any of its cards
is due, open after review, and survive a service restart. Round 060 had checked this with fixture tests only.

## Finding

**Yes. Both packs passed every check (it 30/30, es 28/28) with codex-cli, at Gerald's and Mortimer's encounters in
one save per pack.**

- **Text.** All ten kept lines match the provider's raw output exactly, native and translation. They are 95–140
  characters long (translations 96–146), far under the 500 cap. Before the plan, 1,170 recorded live lines from
  earlier rounds were all at most 377 characters, so the cap has never been reached (it is not tested here, see
  Claim boundary).
- **Hidden at the right moments.** Lines kept at the Coffee Cart were hidden again as soon as Mortimer's encounter
  started. After each resolve, a line was hidden exactly when one of its cards in the Spellbook was due. Reviewing
  those cards (*espresso*, *prosciutto*; es *jamón*) opened 5 lines in it and 3 in es.
- **Lines that open at once.** A card learned by passing an objective is not due, so a line can open as soon as its
  encounter ends. In es, both Gerald lines were readable right away: the greeting chipped no word at all ("Hola.
  Buenos días. I'm Gerald. ¿Qué necesitas?…", vocabularyIds empty), and *café* had been passed. That is the rule
  working as designed, but it differs from round 060's fixture, where every kept line first waited for a review.
- **Hint allowance.** A sentence reveal and a word reveal on the greeting use two of an objective's hints. One
  later reveal per pack at Mortimer was refused (`HINTS_EXHAUSTED`), and the save was unchanged, as it should be.
- **Restart.** A new `LearningService` on the same storage returned the same lines in both packs.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md): Codex, effort high, bundle
  on stdin, 9 findings, 7 accepted, 1 in part, 1 deferred.
- `results/kept-lines-live.mjs`, in-process with no port, `--provider codex-cli`. For each pack it walks to the
  Coffee Cart and then the Butcher's Stall and plays play-market.js's scripted lines. It reveals the greeting and
  each later NPC line by sentence while the encounter is ongoing, and the greeting's first chip by word. It reads
  the raw save file after each step, reviews the due cards the lines name with their first accepted translation,
  then restarts the service.
- Pass criteria were fixed before the run: every check holds, all four encounters resolve, and each pack keeps at
  least one later line and opens at least one hidden line by review.

## Results

| Run | Calls | Checks | Encounters resolved | Lines kept (later) | Refused reveals | Hidden → shown by review | Lines with no card |
|---|---|---|---|---|---|---|---|
| it attempt 1 | 1 | — | — | — | — | — | — |
| it attempt 2 | 14 | 30/30 | 2/2 | 5 (3) | 1 | 5 | 0 |
| es | 14 | 28/28 | 2/2 | 5 (3) | 1 | 3 | 1 |

The first Italian attempt was a bug in the script, not in the game. The script read the translation from the
serialized transcript, which withholds it until a reveal. It stopped after the greeting call. The fixed script takes
the translation from the reveal and from the provider's raw output.

Verdicts matched play-market.js's script in both packs: Gerald passed the coffee and then no milk; Mortimer failed
ham and the bare unit, passed salami / chorizo and then the quantity.

## Decision

C9 is confirmed live, and there is no code change. The live script stays in the round as a regression check
(`TARGET_LANGUAGE=<it|es> node docs/rounds/069/results/kept-lines-live.mjs --provider codex-cli`, about 2 minutes
and 14 calls).

## Evidence

- Reports: [`results/live-it-2.json`](results/live-it-2.json), [`results/live-es-1.json`](results/live-es-1.json);
  the void attempt [`results/live-it-1.json`](results/live-it-1.json). Each has the checks, the hidden states at
  start, after the resolve and after review, the reveals refused, and the kept lines with their lengths.
- The offline length count is in journal row 1 (all `*.json` reports under `docs/rounds/*/results/`).

## Claim boundary

Server behaviour with real codex-cli text, at two of the six encounters, in both packs. Not covered: the app (no
Simulator here), claude-cli, the 500-character cap (it is fixture-tested; no live line came near it), dedupe of two
different messages with the same text (fixture-tested), and a reviewed card falling due again (deferred, critique
1.8).

## Open items

- Owner (Simulator): a kept line that opens right after its encounter, with no review waiting (es Gerald). Is the
  "Lines you translated" section clear in that case?
- Owner, carried from round 060: whether lines from free translations should be kept too.
