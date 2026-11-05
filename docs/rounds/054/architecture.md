# Round 054 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog F2 (new); the round 050 trap "Typographic apostrophes are not folded".
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `foldApostrophes` and `matchCanonicalVocabulary` in `server/src/language-engine.js`, the evidence
  check in `server/src/learning-service.js`, `server/test/apostrophes.test.js`.

## Goal (pre-run)

A player who types a typographic apostrophe (’, the iPhone default with Smart Punctuation) gets the same chips,
evidence checks and verdicts as one who types a straight one ('), and a correct answer is never `INVALID_GRADING`
only because the grader quoted it with the other apostrophe. No live LLM calls (Codex at its usage limit; the change
is deterministic).

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Fold on the server, not the app.** React Native has no TextInput switch for Smart Punctuation, and the web
   client and scripts reach the same server.
2. **Content unchanged.** The `’` variants of *l'una* stay (redundant now, harmless); no vocabulary version moves.
3. **No `ancora un po` variant** (critique 1.5): a grader or player dropping the final apostrophe still matches
   Mortimer's `ancora` (the bare word is a variant of the same entry), so no turn is stuck; a test pins it.

## Design (pre-run)

1. **`foldApostrophes(text)`** in `language-engine.js` maps U+2019 ’, U+2018 ‘, U+02BC ʼ, U+0060 \`, U+00B4 ´ and
   U+2032 ′ to U+0027 ', one UTF-16 unit for one, so offsets do not move.
2. **One definition everywhere** (critique 1.2): `normalizeAnswer` calls it first (before NFKC, which would turn ´
   into a space and a combining accent), so reviews (`gradeVocabularyAnswer`) and the loader's ambient-overlap check
   fold the same set as the matcher.
3. **Matcher**: `matchCanonicalVocabulary` folds each cluster piece and every variant form with it. Excerpts and
   offsets index the source (an excerpt keeps the typed apostrophe). Folding ʼ (a letter, Lm) into ' makes it a word
   boundary (critique 1.4): `lʼuna` now matches like `l'una`, at all three call sites (narration chips, the
   grader-evidence check, the atmosphere filter, which may now drop a line holding a pack form written with ʼ).
4. **Evidence presence check** (critique 1.3): `validateAssessment` compares `foldEvidenceText(x)` on both sides:
   `foldApostrophes`, NFC, every whitespace run (no-break space included) to one space, lowercase. The stored
   `vocabularyEvidence.evidence` keeps the grader's own text (critique 1.8); nothing reads its characters today, and
   a future highlight must fold. `grading.txt` ("Evidence must be an exact excerpt") is unchanged: the server is now
   lenient on punctuation and form only, so no golden prompt moves.
5. **Unchanged on purpose** (critique 1.8): `foldWords` (`content-loader.js`), `fold` in `leak-scan.js`,
   `foldForAtmosphere` and test-local folds already turn every non-letter into a space.

## Tests (pre-run)

`server/test/apostrophes.test.js`, through `submitDialogue` with a Fountain grader that quotes its evidence with the
other apostrophe (critique 1.6; the time objective targets `luna`):

- Behaviour (fail on HEAD): matcher with ’, ‘, ʼ on a synthetic `ancora un po'`; a ’-only variant against a ' text;
  NFD È before ’ on a synthetic entry with ' only (offsets); the real it pack with ʼ; a review answer with ʼ and ´;
  player ’ / grader ' and player ' / grader ’ resolve the Fountain; player NFD and double spaces / grader NFC passes.
- Guards (pass on both): `foldApostrophes` one-for-one; review answers with ’; word boundaries (`poi` vs `po'`);
  evidence not in the answer is refused; `ancora un po` without the apostrophe still matches `ancora`; an atmosphere
  line with a pack form written with ’ is dropped and an English line kept (critique 1.4).

## Live (pre-run)

None: the change is deterministic and Codex is at its usage limit. The queued live runs of rounds 052–053 are not
affected by it (their scripted lines use straight apostrophes).

## Success (pre-run)

All server, mobile and client tests pass; every behaviour test above fails on HEAD (recorded in `results/`), the
guards pass on both; Gerald's golden prompts unchanged.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 daee3cd5…; a Claude general-purpose subagent standing in for Codex (at
its usage limit), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Some planned tests pass on HEAD (review, l'una, NFD on the real entry) | 0 | Accept: synthetic entries; behaviour tests vs guards in the criterion | **Accepted** (autonomous, pending owner review) | Tests, Success |
| 1.2 | Error | Reviews and the loader fold only ' ‘ ’; ´ breaks under NFKC | + | Accept: `normalizeAnswer` calls `foldApostrophes` first | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.3 | Risk | Evidence check exact on NFD/NFC and whitespace | + | Accept: fold both sides (apostrophes, NFC, spaces, case) | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.4 | Risk | ʼ becomes a boundary at all three matcher sites, atmosphere included | 0 | Accept: name the sites, atmosphere test | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.5 | Risk | Dropped trailing apostrophe of `ancora un po'` | 0 | In part: no residual for this entry (bare `ancora` matches); pin with a test, no content change | **Accepted in part** (autonomous, pending owner review) | Owner decision 3, Tests |
| 1.6 | Gap | Service tests' path and fixture | 0 | Accept: through `submitDialogue`, Fountain `luna` (already drafted so) | **Accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Gap | No iPhone-side check | 0 | In part: Simulator check as an owner open item; no mobile test (the app sends text unchanged, the server path is tested) | **Accepted in part** (autonomous, pending owner review) | findings.md open items |
| 1.8 | Gap | Record what does not change; stored evidence form | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 4, 5 |

**Deferred** (Optional): a comment on the redundant `l’una` variants (a YAML comment moves no version, done in the
build); Italian ASCII `e'` for `è` (backlog line); `po‘` test (in the behaviour tests).

Net change: one apostrophe definition through `normalizeAnswer`, a fuller evidence fold, atmosphere and residual
tests.

## Outcome (2026-11-05)

Built as designed. Server 228/228, mobile 131/131, client 12/12 and build. On HEAD the 10 behaviour tests fail and
the guards pass. No live runs. See [findings.md](findings.md).
