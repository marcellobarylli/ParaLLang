# Round 044 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog G2. Round 023 found that its checks missed a near-leak. In Spanish, Mortimer asked
  "¿Quieres más?" before the player had asked for *un poco más*. Earlier leak checks (rounds 020, 022 and 026)
  match only a whole authored form.
- **Findings:** [`findings.md`](findings.md), after the run.
- **Artifact:** `server/scripts/leak-scan.js` and `server/test/leak-scan.test.js`; `results/scan.txt` and
  `results/scan.json`, from a run over every live report in the repo. No game code, content or prompt change.

## Goal (pre-run)

Build one reusable scanner that flags NPC lines giving away an open objective's answer, including words inside
multi-word answers. Run it over the live reports already in the repo (rounds 005–026), to measure the historical
rate with no new LLM calls (Codex at its usage limit).

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Hits and kinds.**
   - An **exact** hit is a whole surface form of an open objective's target.
   - A **word** hit is a content word from inside a multi-word form (folded, 3+ letters, not a function word),
     where the whole form is absent.
   - Each hit is also marked **echo** (the player said it earlier in the scene) or **quoted** (it sits inside a
     passage of five or more words that the objective's intent quotes for the NPC to read).
   - A line is **leak** (a fresh exact hit), **near** (fresh word hits only), **quoted** or **echo**.
   - Hits are flags for reading. Nothing fails on them.
2. **Open objectives are replayed as the server advances** (critique 1.1). After each successful player turn, the
   index moves over the leading passes of that turn's validated verdicts and stops at the first fail. The greeting
   has every objective open.
3. **Read against today's content.** A scene whose encounter or verdict objectives are gone is skipped and counted.
   The word scan is a lower bound: there is no inflection, so "chiamo" never hits "chiami" (critique 1.9).
4. **What to do about near-leaks is decided from the data**, in the findings.
5. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC).

## Design (pre-run)

1. **Turns.** `playerTurns` takes the successful `say "…"` steps with their validated `verdicts`, not
   `grading[].output`. Gradings from failed steps moved nothing and got no reply (critique 1.2). Scenes take
   `lines − 1` turns each, in order. A report whose turn count does not add up is skipped with its reason.
2. **Scenes** (`scenesOf`).
   - Objects with `lines` and `grading`: with an `encounterId`, or at the top level without one. The second shape is
     the default encounter, rounds 005–008, marked `inferred` (critique 1.3).
   - Round 026's greeting replays (`results[]`), as one-line scenes (critique 1.4).
   - `steps` are never searched for scenes.
3. **Matching.**
   - The game's folding (NFD, marks stripped, lowercase), then all but letters and digits to spaces. "po’" and
     "po'" fold alike (critique 1.8, 1.12).
   - Targets come from `content.vocabularyById` (critique 1.11).
   - A word that is a whole form of a closed objective's target is not a hit (critique 1.5).
   - One word hit per objective and word.
   - In Errata's lines, a short list of English words is not a word hit (critique 1.6).
4. **CLI.** It prints one row per hit and per skipped scene, the files by reason (not JSON, no language, no scenes,
   scanned), and the totals per language. `--json` writes everything.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 1fbb4788…; Claude subagent (general-purpose, claude-opus-5-5), read-only;
raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | "Closed once any grading passed" is not how the server advances | + | Accept: leading passes only | **Accepted** (autonomous, pending owner review) | Decision 2, Tests |
| 1.2 | Error | Gradings of failed steps shift the alignment | + | Accept: validated verdicts of successful says; counts must add up | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.3 | Error | Rounds 005–008 scenes have no `encounterId` | + | Accept: top-level scenes are the default encounter, marked inferred | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.4 | Error | Some files are not scenes; replays are | + | Accept: files counted by reason; replays read as greetings | **Accepted** (autonomous, pending owner review) | Design 2, 4 |
| 1.5 | Risk | Common words flood the results | + | In part: words that are whole forms of closed targets are dropped; the control rate is deferred (the near count is small: 6 lines) | **Accepted in part** (autonomous, pending owner review) | Design 3 |
| 1.6 | Risk | Errata's English | + | Accept: English collision list for Errata | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.7 | Risk | The NPC repeating the player | + | Accept: echo | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.8 | Risk | Apostrophes and elision | + | Accept: one folding, curly apostrophe tested | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.9 | Risk | Inflection is missed | + | Accept: recorded as a lower bound | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.10 | Error | The planned test form does not exist | + | Accept: tests use real pack forms ("ancora un po'", "un poco más") | **Accepted** (autonomous, pending owner review) | Tests |
| 1.11 | Suggestion | `vocabularyById`; stale objective ids | + | Accept: both | **Accepted** (autonomous, pending owner review) | Design 3, Decision 3 |
| 1.12 | Suggestion | Match as `matchCanonicalVocabulary` does | 0 | In part: the same folding; whole words by padding after mapping non-letters to spaces (equivalent boundaries); the function is not shared, since it returns spans for chips | **Accepted in part** (autonomous, pending owner review) | Design 3 |
| 1.13 | Suggestion | Tests for alignment, order, the old shape, Errata, echo | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.14 | Suggestion | List skipped files and scenes by reason | + | Accept | **Accepted** (autonomous, pending owner review) | Design 4 |

**Deferred / optional:** hits are labelled by line index ("line"), not turn (done); Spanish "y tú" yields no content
words (noted); `steps` and the HTTP check's `party` are never taken as scenes (done).

Added after the critique, from the draft's first run: "quoted" needs a passage of five or more words. Intents also
quote short forms as prohibitions ("He does not say "me gusta""), and those must not hide a leak.

Net change from plan-v1: progress replayed as the server does it, turns from validated verdicts, old and replay
shapes, files by reason, echo and quoted kinds, closed-form and English filters, and real-form tests.

## Tests (pre-run)

`server/test/leak-scan.test.js`:
- a word inside "un poco más" is a near hit; the whole form is exact and not double counted; whole words only;
  "ancora un po’" with a curly apostrophe;
- Errata's English "come" is not a hit, while an Italian "Come stai?" is;
- leading-pass progress, including a later pass alone and verdicts that list only open objectives;
- failed says are not turns;
- the round 023 scene gives two near lines and no leak, and a closed objective's words stop counting;
- an echo of the player's failed "Chilo." is an echo, and a passage quoted from the intent is quoted;
- the shapes: tour, party, top-level (inferred), replays, a misaligned report and an unknown encounter (skipped
  with reasons), and the file summary.

Run: every `docs/rounds/*/results/*.json` (89 files).
