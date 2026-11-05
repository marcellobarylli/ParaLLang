# Round 056 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C6 (new), from the owner's note `parallang_obsidian/GAME MECHANICS.md` (Main Gameplay
  Loop, Option A: "words colored R/G/B for noun/verb/adjective").
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/wordClass.js`, `ui.js` (tokens, `Button` `suffix`), `BilingualText.js`, tests.

## Goal (pre-run)

The word chips under an NPC line show their word class: nouns, verbs and adjectives each get a colour and a
short text label, so colour is never the only cue. The chips work as before. The change is app-only, with no
server change and no live LLM calls; the frozen web client is unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The class shows on the active (protected) line too** (critique 1.4). The owner's note colours the words
   *before* they are tapped. The class narrows a guess but never gives the meaning: a noun chip at the butcher's
   is still one of several nouns, and the NPCs do not list the answers (round 012). This is an owner question: the
   Butcher's `name_meat` and `quantity` and Flick's verbs are the closest cases. A test pins the behaviour.
2. **Red, green and blue, as the note says** (critique 1.3, in part). Two cues besides colour cover colour-blind
   players: the text label on every coloured chip, and a dashed border on verbs. The hues are kept apart from
   `danger` and `success`: noun `#1f5a96`, verb `#b3261e`, adjective `#1d6e4e`.
3. **Five classes stay uncoloured** (critique 1.5): adverbs, numerals, interjections, pronouns and questions.
   Phrases, prepositional and adverbial phrases stay uncoloured as well; *senza latte* is one of them. Only
   `noun`/`noun_phrase`, `verb`/`verb_phrase` and `adjective` are coloured.

## Design (pre-run)

1. **`wordClass(partOfSpeech)`** in `mobile/src/wordClass.js` returns `noun`, `verb`, `adjective` or null, and
   null for a missing value. It also exports `WORD_CLASS_LABEL` (`noun`, `verb`, `adj.`) and `WORD_CLASS_NAME`
   (`noun`, `verb`, `adjective`).
2. **Tokens in `ui.js`:** `colors.wordNoun`, `wordVerb` and `wordAdjective`, plus a `wordClassStyle(cls)` helper
   in `ui.js` that returns the border and label colours from `colors` (critique 1.8e: no hex outside `ui.js`). All
   three tokens are at least 4.5:1 on `surface`, where every chip sits (critique 1.9; text contrast covers the
   3:1 non-text rule).
3. **`Button` gets `suffix`** (critique 1.1): a second sized `Text` after the label (`type.caption1`, weight 600),
   coloured by a `suffixStyle` from the caller.
4. **Chip:** every word chip has a 2-point border (critique 1.7). It is `colors.border` when uncoloured, the class
   colour otherwise, and dashed for verbs. Word chips pass `dim={false}` (critique 1.2), so revealed and
   disabled chips keep full colour and label; their state shows through the meaning below and the disabled
   press. The 🔊 from round 055 stays beside the chip.
5. **Name:** a coloured chip is "Translate word: caffè, noun"; an uncoloured one keeps today's name. After a reveal
   the meaning line drops "(noun)" when the chip carries a class label (critique 1.6). Uncoloured classes keep
   their "(adverb)" etc.

## Tests (pre-run)

- `wordClass` covers every `part_of_speech` value in both packs, read by regex over the YAMLs (critique 1.8f, as
  in `ambience.test.js`). Unknown and missing values give null.
- A protected line with a noun, a verb, an adjective and an adverb. The three coloured chips have their label and
  name and the adverb chip has neither (decision 1). Border colours (flattened style) are the tokens, and the
  verb's border is dashed.
- A revealed chip is not dimmed (no 0.45 opacity) and has no duplicate "(noun)". An adverb keeps "(adverb)".
- Theme test: the three tokens on `surface` at 4.5:1 or more, and no literal colours outside `ui.js`.
- Renamed queries: `encounter-words.test.js` (the `caffè` name queries) and `learning-flow.test.js:125,128`. The
  `senza latte` query keeps its name (critique 1.8b).

## Live (pre-run)

None.

## Success (pre-run)

All mobile, server and client tests pass. expo-doctor reports 20/20, and the iOS export builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`; a Claude general-purpose subagent standing in for Codex (Codex at its usage
limit), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `Button` cannot take a label after the word without losing its style | 0 | Accept: a `suffix` prop | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.2 | Error | Revealed chips are dimmed to 0.45 | + | Accept: `dim={false}` on word chips | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.3 | Risk | Red/green for colour-blind players; clashes with danger and success | 0 | In part: keep R/G/B (the owner's note), label and dashed verb border, distinct hues | **Accepted in part** (autonomous, pending owner review) | Owner decision 2 |
| 1.4 | Risk | A free class on the active line narrows answers | − | In part: keep it (the note), state the cases, pin by test, owner question | **Accepted in part** (autonomous, pending owner review) | Owner decision 1, Tests |
| 1.5 | Error | Wrong content counts | 0 | Accept: corrected counts, uncoloured classes named | **Accepted** (autonomous, pending owner review) | Owner decision 3 |
| 1.6 | Gap | "(noun)" duplicated after a reveal | 0 | Accept: drop it when the chip has a label | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.7 | Gap | Layout and border widths | 0 | Accept: a 2-point border on every chip; Simulator check | **Accepted** (autonomous, pending owner review) | Design 4, open items |
| 1.8 | Gap | Missing tests (null, renamed queries, protected, dim, tokens, YAML by regex) | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests, Design 2 |
| 1.9 | Risk | Border contrast on the chip fill | 0 | Accept: tokens on `surface` | **Accepted** (autonomous, pending owner review) | Design 2, Tests |

**Deferred** (Optional): exact-name assertion (done in the tests); flattened style instead of a function style
(done); `wordClass` in the Spellbook and reviews (later); verb-like `phrase` entries (owner open item).

Corrected counts: noun 43, noun_phrase 3, verb 13, verb_phrase 6, adjective 14 (79 coloured). Uncoloured: adverb
12, adverbial_phrase 2, interjection 14, numeral 24, phrase 4, prepositional_phrase 4, pronoun 5, question 5 (70).

Net change: a `suffix` on `Button`, undimmed chips with uniform borders, a dashed verb border, no duplicate class,
and pinned protected-line behaviour.
