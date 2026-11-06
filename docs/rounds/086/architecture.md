# Round 086 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review of the code of rounds 081–085 (built while Codex was limited, each
  only plan-critiqued), [`trail/review-1.md`](trail/review-1.md): no Errors; two Gaps and one Minor, each checked by
  hand against the code:
  1. `moveTo` (round 082) applies the move's Spellbook without round 084's encounter guard: after a server restart
     mid-encounter, a move returns a Spellbook with meanings while the app still holds the encounter.
  2. `keptFootnote` (round 081) drops a footnote only for listed pack forms; an unlisted inflection of an answer
     (it *buoni*: `buono` lists buono, buona, buon, buonissimo, buonissima) is kept and shown during the encounter.
  3. `App.js` refreshes only on a direct `background` → `active`; a `background` → `inactive` → `active` sequence
     (uncertain on iOS) would miss it.
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js`, `mobile/App.js`, `server/src/learning-service.js`, tests;
  `results/` (the stem-rule measurement).

## Goal (pre-run)

No meanings in a Spellbook taken from a move during an encounter the server forgot; no footnote holding an
inflection of an open objective's single-word answer; the foreground refresh also when `inactive` comes between.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The footnote's inflection rule** (critique 1.1 in part, 1.2; measured, [`results/rule.txt`](results/rule.txt)):
   a footnote is dropped if a folded word of it is not itself a form but starts with a single-word form *t* (4+
   letters) of an open objective's target minus its last letter, and is 0 to 2 letters longer than *t*. Measured
   over 47,361 English tokens of narration, translations and footnotes in every live report (`docs/rounds/*/results`)
   and over synthetic inflections of every target (final vowel swapped, -s, -es, -as, -os):

   | Rule | it: English tokens dropped per encounter (worst) | it: inflections caught | es: dropped (worst) | es: caught |
   |---|---|---|---|---|
   | plan v1: 4-letter prefix | 13.4 (77) | 506/555 | 16.3 (77) | 446/522 |
   | 5-letter prefix | 0.3 (2) | 411/555 | 6.6 (26) | 323/522 |
   | **inflection rule** | **2.9 (14)** | **555/555** | **6.9 (21)** | **522/522** |

   The English drops are counted over the whole corpus (47k tokens), so a 15-word footnote is dropped by an English
   collision well under 1% of the time; a dropped footnote is optional flavour. Examples kept by the rule: it
   *translation* (tranquillo), *children*; dropped: *century*, *settled* (it), *quietly*, *solid* (es).
2. **Only single-word forms** of the targets (critique 1.2: *come ti chiami* would make *come* a stem), and only the
   **open objectives'** targets (critique Optional: passed answers need no hiding): at the greeting, every
   objective; on a turn, `remaining`.
3. **No check for targets under 4 letters** beyond the pack forms (critique 1.3 rejected): their unlisted forms are
   rare (numbers and particles do not inflect: tre, sei, dos, vez, más), and a 3-letter rule would drop common English
   words (*sold*, *son*, *ore*).
4. **The move's Spellbook takes the refresh's encounter guard**, and its snapshot too (critique Optional: a switch
   back would restore it). The world is applied either way.
5. **The foreground flag** starts from `AppState.currentState === 'background'` (critique 1.7), is set on
   `background`, and is cleared when the next `active` refreshes; `inactive` alone still does not refresh.

## Design (pre-run)

1. `mobile/src/stores/gameStore.js`: a helper `leaksMeanings(state, spellbook)` (`state.encounter?.state ===
   'ongoing' && spellbook.inEncounter !== true`), used by `refreshSpellbook` and `moveTo` (Spellbook and snapshot
   skipped). A comment at the review actions: they apply Spellbooks unguarded, reachable only through the Spellbook
   screen during an encounter, which the guards keep free of meanings.
2. `server/src/learning-service.js`: `canonicalizeNarration(generated, definition, previousNpc, open =
   definition.encounter.objectives)`; the turn passes `remaining`; `keptFootnote(generated, previousNpc, open)` adds
   the inflection rule with `foldWords`.
3. `mobile/App.js`: `let fromBackground = AppState.currentState === 'background'`; on `background` set it; on
   `active` with it set, refresh and clear.

## Claim boundary (pre-run)

Jest and node tests only; the footnote rule is not measured live (Codex limited), and footnotes are inert live so
far (round 081: 0 of 21). It does not catch target-language words outside the open objectives' targets (other
encounters' words, words outside the pack; critique 1.4): the style rule "never a target-language word" stays the
model's. Not observed: the iOS `AppState` sequence (owner).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 fb9061e7…; a fresh general-purpose subagent (claude-opus-5-5),
read-only, in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The 4-letter stem drops common English words (translation, children, quiet) | + | In part: measured; the inflection rule instead (full recall, fewer drops) | **Accepted in part** (autonomous decision, pending owner review) | Decision 1 |
| 1.2 | Error | Multi-word forms make function words stems (*come*, *much*) | + | Accept: single-word forms only | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.3 | Gap | Targets under 4 letters get no check | − | Reject: they rarely inflect; a 3-letter rule drops common English | **Rejected** (autonomous, pending owner review) | Decision 3 |
| 1.4 | Gap | The claim boundary overstates coverage | 0 | Accept: state what passes | **Accepted** (autonomous, pending owner review) | Claim boundary |
| 1.5 | Gap | No test for a party conversation, the Rift, the greeting path | 0 | Accept: direct calls for a party definition and the Rift; greeting through `play` | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Gap | Gerald's party conversation needs setup | 0 | Accept: call `keptFootnote` directly | **Accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Gap | A flag set only by an event regresses a launch in the background | + | Accept: start from `currentState` | **Accepted** (autonomous, pending owner review) | Decision 5 |

**Optionals:** the move's snapshot untouched, taken (Decision 4); a comment at the review actions, taken (Design 1);
open objectives only, taken (Decision 2); a shared helper with `test/answer-check.js` rejected: that check is for
authored text over every target with allowlists, a different trade-off.

Net change: a measured inflection rule on single-word forms of open targets instead of a 4-letter stem; the
foreground flag starts from the current state; the move's snapshot guarded.

## Tests (pre-run)

- server `test/footnotes.test.js`: through `play` (greeting, the tutorial): a footnote with an unlisted inflection of
  an open single-word target is dropped, an English footnote kept; direct `keptFootnote` calls with a party
  conversation's and the Rift's objectives (it *buoni* for a `buono` target, es likewise), with the English list
  (translation, children, grammar-free examples) kept; a passed objective's inflection is kept on a turn.
- mobile: a move during an ongoing encounter with `inEncounter: false` applies the world, keeps the Spellbook and the
  snapshot; with `inEncounter: true` applies it; App: `background` → `inactive` → `active` refreshes once, mounted
  in `background` → `active` refreshes.
- Full suite.
