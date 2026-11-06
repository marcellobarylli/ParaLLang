# Round 086 plan v1: three fixes from a review of rounds 081–085

**Source:** a read-only review of the code of rounds 081–085 (`trail/review-1.md`): no Errors, two Gaps, one Minor.
Each was checked against the code by hand. **Offline:** no LLM call.

## Goal

Close the three: no answers in a Spellbook taken from a move during an encounter the server forgot; no footnote
holding a close form of the current encounter's answers; the refresh after a return from the background also when
`inactive` comes between.

## Design

1. **Move (review 1), `mobile/src/stores/gameStore.js` `moveTo`:** the world is applied as today; the move's
   Spellbook (and its snapshot) only if not (`get().encounter?.state === 'ongoing'` and `spellbook.inEncounter !==
   true`), the same check as `refreshSpellbook`. Shared as a small helper `meaningsWhileOngoing(state, spellbook)`.
2. **Footnote (review 2), `server/src/learning-service.js` `keptFootnote(generated, previousNpc, definition)`:**
   besides the pack-form check, drop the footnote if any of its folded words (4+ letters) shares its first four
   letters with a folded word (4+ letters) of a surface form of any target of the current encounter's objectives
   (open or met). English words that share a stem (e.g. "center" for *cento*) drop a footnote too: a dropped
   footnote costs nothing, a kept close form gives an answer away. Only the current encounter's targets: a stem
   check over the whole pack would drop most English footnotes. `foldWords` from `content-loader.js`.
3. **Background (review 3), `mobile/App.js`:** a `wasBackground` flag set on `background`, cleared on refresh at
   the next `active`; `inactive` → `active` alone still does not refresh (round 084 Decision 1).

## Tests

- mobile: a move during an ongoing encounter whose Spellbook has `inEncounter: false` keeps the old Spellbook and
  applies the world; with `inEncounter: true` applies it; App: `background` → `inactive` → `active` refreshes once.
- server (`test/footnotes.test.js`): it, Gerald: "everything is buoni" style footnote with an unlisted inflection of
  a target (pick one from the pack) is dropped; an English footnote with no shared stem is kept.
- Full suite.

## Claim boundary

Jest and node tests only; the footnote rule is not measured live (Codex limited); the iOS AppState sequence is not
observed (owner).
