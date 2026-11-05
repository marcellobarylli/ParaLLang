# Round 058 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog F3 (new; round 057 critique, Optional).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `matchCanonicalVocabulary` (`server/src/language-engine.js`), `vocabularyFormConflicts` (same
  file), `server/test/vocabulary-forms.test.js`.

## Goal (pre-run)

Every surface form in a pack, read on its own, is matched as its own entry and no other. That rules out two
entries with the same folded form (the later entry in load order never gets a chip, since `sort` is stable;
critique 1.3). It also rules out a longer form being taken by a shorter one. The matcher is fixed so this holds by
construction, not by luck of lengths. No content change and no live calls.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Fix the matcher, longest form first across all entries** (critique 1.2). Today the matcher sorts entries by
   their longest variant, and each entry then tries all its variants. An entry with one long variant can
   therefore claim another entry's phrase with a short variant: a `buono` with a 12-letter variant takes
   `buon giorno`. Today's packs pass only because of their lengths. The matcher now sorts (entry, variant) pairs
   by folded variant length, longest first, with ties in load order. On today's content it gives the same matches
   (checked by the existing suite and the new test).
2. **Crossing overlaps are out of scope.** Where neither form is inside the other ("Che ore sono le tre"), the
   longer match wins, as before.

## Design (pre-run)

1. **Matcher.** It builds `pairs = entries.flatMap(entry => variants.map(variant => ({ entry, variant, form })))`,
   where `form` is the variant folded as today (NFD, marks stripped, lowercase, `foldApostrophes`; no whitespace
   step, critique 1.4). It sorts the pairs by `form.length` descending, a stable sort, and matches them in that
   order. Text folding, offsets and the occupied-span rule are unchanged.
2. **`vocabularyFormConflicts(entries)`** is exported (critique 1.6). For each entry and each variant `v`,
   `matchCanonicalVocabulary(v, entries)` must give exactly one match, of that entry, covering `[0, v.length)`
   (critique 1.2). The function returns the failures as `{ id, variant, got }`.
3. **Form hygiene** (critique 1.5): every variant is trimmed and has no run of two or more whitespace characters.
   This is asserted in the test, since no variant breaks it today.
4. **The three folds differ** (critique 1.1), on purpose: the party overlap test checks party forms by whole words,
   and the ambient check in the loader uses `normalizeAnswer`. The new test is the pack-wide check with the
   matcher's own behaviour. The others stay.

## Tests (pre-run)

- `vocabularyFormConflicts` returns `[]` for both real packs, and every variant passes the hygiene check.
- Fixtures: es `año` and `ano` as two entries give a conflict. The stealing case (`buono` with a 12-letter variant
  next to `buongiorno` / `buon giorno`) gives none after the fix and fails on HEAD (recorded in `results/`). A
  same-entry duplicate (`è l'una`, `è l’una`) is no conflict.
- The existing matcher, Fountain, apostrophe and span tests pass unchanged.

## Live (pre-run)

None.

## Success (pre-run)

All server, mobile and client tests pass. The stealing fixture fails on HEAD and passes after the fix.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`; a Claude general-purpose subagent standing in for Codex (Codex at its usage
limit), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Gap | The party overlap test and the ambient check already cover parts, with other folds | 0 | Accept: state what the new test adds; keep the others on purpose | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.2 | Error | Equal folds are the wrong invariant; containment stealing is the real risk | + | Accept: a behavioural check, and fix the matcher's sort (Optional) | **Accepted** (autonomous, pending owner review) | Decision 1, Design 1–2 |
| 1.3 | Error | "Arbitrary" is wrong: the sort is stable | 0 | Accept: wording | **Accepted** (autonomous, pending owner review) | Goal |
| 1.4 | Risk | A `foldForm` that trims would break the offsets | 0 | Accept: no new fold export; variants fold as today | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.5 | Gap | Trimming and whitespace in variants | 0 | Accept: hygiene asserted in the test | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.6 | Gap | Fixture test needs a callable check | 0 | Accept: `vocabularyFormConflicts` | **Accepted** (autonomous, pending owner review) | Design 2, Tests |

**Deferred** (Optional): crossing overlaps (stated out of scope, Decision 2); folded-length sort (taken, Design 1).

Net change: a matcher sort by variant over all entries, a behavioural pack-wide check, and a hygiene assertion
instead of a folded-form equality lint.

## Outcome (2026-11-05)

Built as designed. Server 238/238, mobile 146/146, client 12/12. The stealing fixture fails on HEAD and passes
after the fix. The old and new matcher agree on all 1,021 saved NPC lines in both packs. See
[findings.md](findings.md).
