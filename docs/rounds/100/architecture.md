# Round 100 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** round 097's deferred review finding R1.5: the leak scan reads only the NPC line's `native`, while the
  app also shows the line's English `narrative` and, after each turn, the grader's overall and per-objective
  feedback (`DialoguePanel.js:57-58, 85`).
- **Offline round:** no LLM call; a measure over the committed live reports. Critic: a fresh read-only subagent
  (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/scripts/leak-scan.js`, `server/test/leak-scan.test.js`, `results/`.

## Goal (pre-run)

The leak scan also reports, as separate uncounted kinds, narratives and grader feedback that hold a whole target form
of an objective still open when the player reads them, split by report round before and from round 051; the four
existing kinds are unchanged over every committed report.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Two fields, not three (critique 1.1).** `narrative` and `feedback`. Footnotes are not scanned: reports record
   them before the server's filter (which drops any footnote holding a pack form), and no committed report has one.
2. **Exact hits only**, per (text, objective), never summed over surface forms (critique 1.4): word hits in English
   prose collide too often.
3. **English forms (critique 1.2, 1.8).** A hand set `ENGLISH_FORMS` of single-word pack forms that are also English
   words: es *once, kilo, kilos, cafe, chorizo, hola, amigo, amigos, yo, dos*; it *due, espresso, salami, salame,
   prosciutto, ciao, basta, otto, chilo*. A hit on one is marked `english` and the text is counted apart
   (`englishOnly`), not dropped: "Gerald pours an espresso" may still give an answer away. No reading by hand beyond
   the listed texts.
4. **Open objectives.** A narrative: those open at its line (it is shown with its own native). Feedback of the
   scene's turn j (shown with reply j+1, and provisionally before it): those still open after turn j
   (`openObjectives(..., j + 1)`, ordered or unordered as the encounter says; a held pass stays open).
5. **Echo (critique 1.3, Optional).** A narrative's hit is `echo` if one of the messages before its line holds the
   form; a feedback hit if one of the messages up to and including turn j does (the grader comments on message j).
   `quoted` only for narratives. A text is `fresh` if one of its hits is neither echo nor English.
6. **Gradings to steps (critique 1.6).** Per-objective feedback comes from the first unused scene grading, in scene
   order, whose `output.overall_feedback` equals the step's `feedback`; with none, the overall feedback alone is
   scanned and the turn counted in `feedbackUnmatched`. Gradings of failed attempts (shown provisionally, Optional)
   are not scanned; stated.
7. **Totals (critique 1.5):** per language and per era (`before 051`, `from 051`, by the report's round folder; a
   path outside `docs/rounds/NNN/` is `other`): narratives scanned and fresh, feedback turns scanned, fresh,
   English-only and unmatched. One printed line per language and era, and `extra` lines for each fresh or English
   text.
8. **No content or prompt change.** A fix, if the measure asks for one, is a later round.

## Design (pre-run)

`leak-scan.js`: `ENGLISH_FORMS`; `scenesOf` also returns the scene's `grading`; `playerTurns` keeps the step's
`feedback`; `scanExtras(scene, turns, definition, content)` returns `[{ field, line?, turn?, objectives, hits,
fresh, englishOnly, text }]`; `scanReport` adds `extras`, `feedbackUnmatched` per scene; `summarize` adds `extras`
totals by language and era (`eraOf(path)`); `main` prints them.

## Claim boundary (pre-run)

Committed reports only, read against today's content; exact forms only (no inflection); the provisional feedback of
failed attempts is not scanned.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 1117ea9a…; a fresh general-purpose subagent (claude-opus-5-5), read-only,
in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Footnotes are recorded before the filter, and none exist | + | Accept: not scanned | **Accepted** (autonomous decision, pending owner review) | Decision 1 |
| 1.2 | Error | The word-hit English set misses whole-form collisions | + | Accept: `ENGLISH_FORMS`, marked and counted apart | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.3 | Error | Feedback's echo window must include the graded message | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 5, Tests |
| 1.4 | Gap | Counting by surface form inflates | + | Accept: per (text, objective), texts counted | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.5 | Gap | Split before and from round 051 | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 7 |
| 1.6 | Gap | Pin grading matching; identical feedback | + | Accept: first unused in order | **Accepted** (autonomous, pending owner review) | Decision 6, Tests |
| 1.7 | Gap | Missing tests | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.8 | Cut | No reading by hand once English is marked | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |

**Optionals:** say that provisional feedback of failed attempts is not scanned: accepted (Decision 6, Claim
boundary); narrative timing: confirmed, no change; `quoted` only for narratives: accepted (Decision 5); the simpler
scope: taken (Decisions 1–3).

## Tests (pre-run)

`server/test/leak-scan.test.js`, with today's content:
- a narrative naming an open form is a fresh hit; naming a closed objective's form is not; a replay greeting adds no
  narrative text;
- turn j's feedback naming the objective passed in turn j: no hit; naming a later open one: fresh; naming the form
  the player wrote in turn j (a held pass): echo;
- an unordered encounter: a form of an objective passed in turn j is no hit, one still open is;
- feedback on the scene's last, resolving turn: no hit;
- an English form (*once*): `english`, counted in `englishOnly`, not fresh;
- per-objective feedback from the grading matching the step; two gradings with identical feedback: the first unused
  each time; no match: `feedbackUnmatched` 1;
- the four existing kinds: the printed kind lines over every committed report equal round 100's
  `results/scan-before.txt`.
- Mutations; full suites.
