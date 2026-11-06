# Round 088 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review of the code of rounds 054–064 (word chips and spans, kept lines,
  narrator speech), never reviewed after their builds, [`trail/review-1.md`](trail/review-1.md): one Error, two
  Minor, checked by hand at HEAD. The Error: a kept line (round 060) hides its translation only while one of its
  **stored** chip ids is due, and those are matched against the current encounter's words only, non-overlapping.
  "Grazie, il caffè è ottimo." kept in Gerald's coffee break (chips *grazie*, *ottimo*) shows "Thanks, the coffee is
  great" while the *caffe* card is due; "caffè nero" stored as `caffe_nero` does not hide for a due *caffe*.
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js`, `mobile/src/components/Spellbook.js`, `mobile/src/wordClass.js`,
  tests.

## Goal (pre-run)

A kept line's translation is withheld while any of the learner's cards whose form (or an inflection of it) stands in
the line is due, whatever encounter the line came from.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **`cardIds` per line, computed at snapshot time (R1.1).** The stored ids plus every card of the learner whose
   entry is found in `line.native` **alone** (`matchCanonicalVocabulary(native, [entry])`: overlapping entries do not
   exclude each other, so *caffe* is found inside "caffè nero") **or by an inflection** of one of its single-word
   forms of 4+ letters (round 086's rule, critique 1.2: a due *ottimo* hides "ottima"). Hidden while any of
   `cardIds` is due. Nothing changes in the save; old saves work as they are.
2. **False hides are accepted (critique 1.1).** Lines are mixed-language, so an English word that is a card form
   (*due*, *sei*, *ora*, *piano*, *media*; es *once*, *soy*) also hides the line while that card is due. That errs on
   the side of the rule (the translation waits for a review), so no homograph exemptions: an exemption would also
   unhide real uses (it *tre*, *sei*).
3. **The cache (critique 1.3):** one bounded map (500 natives, oldest out) from a native to the set of pack entry
   ids found in it; the service's content is fixed for its life, so the native is the whole key. It is then
   intersected with the learner's card ids per snapshot.
4. **The app** uses `line.cardIds ?? line.vocabularyIds` (older servers) for its clock check of a stale snapshot.
5. **Not covered, by decision:** a card's English meaning in the translation without its form in the native
   (critique 1.7: the review asks for the meaning of the target form, which the line does not show); cards dropped
   from the snapshot because their content version is stale (existing behaviour, critique 1.4); Rift lines whose
   glitch inserts characters inside a word (zero-width marks defeat the word boundaries; critique 1.4), named in the
   claim boundary.
6. **R1.2 (cosmetic, critique 1.8):** `segmentLine` sorts same-start spans longest first, as the server matches; the
   server never sends overlaps, so nothing visible changes.
7. **R1.3 in part:** `keepLine`'s cap drops a trailing lone high surrogate after `slice(0, 500)`; the native and the
   translation still cut at different points (round 060 decision 4; NPC lines are far shorter).

## Design (pre-run)

1. `server/src/learning-service.js`: `inflectsAnswer` is split into `inflectsForms(text, forms)` (forms already
   folded) and the objectives wrapper. `lineEntryIds(native)` with the bounded map. `keptLines` builds `cardIds`
   (stored ids first, then found card ids in card order, no duplicates) and `hidden` from it; the snapshot line
   gains `cardIds`.
2. `mobile/src/components/Spellbook.js` `lineHiddenBy`: `const ids = new Set(line.cardIds ?? line.vocabularyIds ??
   [])`.
3. `mobile/src/wordClass.js`: `.sort((a, b) => a.start - b.start || b.end - a.end)`.
4. `keepLine`'s `cap`: after the slice, drop a final `\uD800–\uDBFF` unit.

## Claim boundary (pre-run)

Tests only. A line is not hidden by: words that are no card yet, inflections of forms under 4 letters or of
multi-word forms, a card's meaning in English, glitch characters inside a word. It may be hidden by an English
homograph of a due card.

## Second opinion (pre-run)

Source review: [`trail/review-1.md`](trail/review-1.md) (3 findings). Critiqued draft: `trail/plan-v1.md`, sha256
25c01947…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error | A kept line shows its translation while another encounter's card in it (or a word inside a longer chip) is due | + | Accept: `cardIds` at snapshot time | **Accepted** (autonomous decision, pending owner review) | Decision 1 |
| R1.2 | Minor | `segmentLine` keeps the shorter of two same-start spans | 0 | Accept as cosmetic | **Accepted** (autonomous, pending owner review) | Decision 6 |
| R1.3 | Minor | The 500-character cap can split a surrogate pair and cuts native and translation apart | 0 | In part: no lone surrogate; cap kept | **Accepted in part** (autonomous, pending owner review) | Decision 7 |
| 1.1 | Error | English homographs among card forms hide lines | 0 | Accept: state it, keep the safe side, no exemptions | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.2 | Gap | Inflections do not hide | + | Accept: round 086's rule | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.3 | Error | The cache key, size and grain | + | Accept: per native, bounded, all entries | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.4 | Gap | Stale-version cards and glitched Rift lines unspecified | 0 | Accept: named as limits | **Accepted** (autonomous, pending owner review) | Decision 5, Claim boundary |
| 1.5 | Gap | The line-shape `deepEqual` breaks | 0 | Accept: update it | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Gap | Tests: stale snapshot via `cardIds`, older-server fallback, both directions of a multiword match, Italian fixture | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Cut | The synonym worry | − | Accept: excluded, with the reason | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.8 | Cut | R1.2 is cosmetic | − | Accept: say so | **Accepted** (autonomous, pending owner review) | Decision 6 |

**Optionals:** `cardIds` only when different, rejected (one shape is simpler for the app); computing at `keepLine`
and storing it, rejected (a save field and a backfill; the snapshot can compute it for old saves); the frozen web
client does not read `lines`, noted.

Net change: inflections and a per-native bounded cache; homograph false hides accepted and stated; limits named.

## Tests (pre-run)

- `server/test/kept-lines.test.js` (Italian): a line kept with chips *grazie*, *ottimo* and native "Grazie, il caffè
  è ottimo." hides while *caffe* is due, `cardIds` includes `caffe`; shows when nothing is due; "caffè nero" (stored
  `caffe_nero`) hides for a due *caffe*, and "caffè" alone with a due `caffe_nero` does not; "ottima" hides for a due
  *ottimo*; an English *due* in the native hides while the *due* card is due (stated false hide, if the pack has it);
  the existing line-shape check gains `cardIds`; a cap ending in an emoji leaves no lone surrogate.
- `mobile/src/__tests__/kept-lines.test.js`: `lineHiddenBy` hides for a card due by the clock that is only in
  `cardIds`; without `cardIds` it falls back to `vocabularyIds`. `word-class` test: two same-start spans keep the
  longer.
- Full suite.
