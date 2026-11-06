# Round 059 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05/06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C8 (new; the next candidate in `docs/autonomy/STATE.md`), following round 056 (word
  chips by class, the owner's note "R/G/B for noun/verb/adjective").
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/wordClass.js` (`wordClassText`), `Spellbook.js`, `ReviewPanel.js`, `BilingualText.js`,
  `App.js`, tests.

## Goal (pre-run)

The word class reads the same way wherever a word appears: on the encounter chips (round 056), on Spellbook cards
and on the review prompt. App-only: no server change (critique 1.1), no live LLM calls; the frozen web client is
unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The review prompt shows the class** (critique 1.8). It is a new cue on a recall prompt ("verb" points to
   "to …"), but the class is not the meaning (round 017's rule hides meanings, notes and English examples, never
   the class), and the due Spellbook card already prints it. Uncoloured classes show too, in muted text.
2. **Colour the class word only, no coloured card borders** (critique Optional 1–2). Every card keeps its 1-point
   `colors.border`; a list of red, blue and green frames would be busy and shift content by a point. The class word
   is the cue in colour and in text.

## Design (pre-run)

1. **`wordClassText(partOfSpeech)`** in `mobile/src/wordClass.js` returns `{ cls, text }` or null (missing or empty
   value). For a coloured class, `text` is `WORD_CLASS_NAME[cls]` (`noun`, `verb`, `adjective`); otherwise the part of
   speech with underscores as spaces (`prepositional phrase`). No new name table (critique 1.10); the chip keeps
   `WORD_CLASS_LABEL`.
2. **Spellbook card.** The line "noun · Mastery: discovered" puts the class text in a nested `Text` coloured by
   `wordClassStyle(cls).label` plus a `classWord` modifier (`fontWeight: '600'`, listed in the theme test's
   `MODIFIERS`, critique 1.3), inside the sized `small` Text. Uncoloured classes keep the muted text. Shown in every
   card state, as today. A card with no `partOfSpeech` shows only "Mastery: …". The card's `aria-label` is unchanged
   (critique 1.4: the label on a plain View is not what VoiceOver reads; the visible class text is).
3. **Review prompt.** `App.js` passes `partOfSpeech` from the Spellbook card with the challenge's `vocabularyId`
   (`state.spellbook.cards`, stored with the challenge; critique 1.1), or the challenge's own `partOfSpeech` if a
   server ever sends one. `ReviewPanel` shows it in its own `Text` (`classTag`, `fontSize: type.subhead`, weight 600,
   class colour or muted) below the prompt row, with no `accessibilityLanguage` (critique 1.5). No tag when unknown.
   The feedback screen is unchanged.
4. **Chip meaning note** in `BilingualText`: uses `wordClassText`, keeps "(adverb)" only for uncoloured classes, and
   renders nothing when the word has no `partOfSpeech` (today it would throw; critique 1.7).

## Tests (pre-run)

- `wordClassText`: noun_phrase → noun, verb_phrase → verb, adjective, prepositional_phrase → "prepositional phrase",
  undefined and "" → null.
- Spellbook: noun, verb and adverb cards; class text colours (`wordNoun`, `wordVerb`, muted) and weight; card borders
  stay 1-point `colors.border`; in the inEncounter and due states the class still shows while meanings, notes and
  English examples stay hidden (critique 1.6); a card without `partOfSpeech` renders.
- Review: a due challenge whose card is a verb shows "verb" in `wordVerb`, outside the heading (the heading's text is
  the target only); a practice challenge shows its tag too; no card and no field → no tag.
- Chip: a word without `partOfSpeech` with a meaning renders (no note); " (adverb)" kept.
- Theme: the three class colours on `background` at 4.5:1 or more (critique 1.2).
- All mobile, server and client tests pass; expo-doctor; iOS export.

## Live (pre-run)

None (no gameplay or content change).

## Success (pre-run)

All mobile, server and client tests pass; expo-doctor 20/20; the iOS export builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 de221856…; a Claude general-purpose subagent standing in for Codex (Codex
at its usage limit until 01:36 UTC), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | Server field not needed; the Spellbook card has the class | + | Accept: look up the card, no server change | **Accepted** (autonomous, pending owner review) | Goal, Design 3 |
| 1.2 | Gap | Contrast not tested on `background` | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.3 | Error | Unsized style entries fail the theme test | 0 | Accept: nested modifier in `MODIFIERS`, sized tag | **Accepted** (autonomous, pending owner review) | Design 2, 3 |
| 1.4 | Risk | Card `aria-label` does not reach VoiceOver | 0 | Accept: leave the label unchanged | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.5 | Risk | Tag read with the target-language voice | 0 | Accept: own Text, no language tag | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.6 | Gap | Hidden states untested with the class line | 0 | Accept (borders dropped, so only the class line) | **Accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Gap | Chip note refactor unspecified; crash without `partOfSpeech` | + | Accept | **Accepted** (autonomous, pending owner review) | Design 4, Tests |
| 1.8 | Risk | The review tag is a new hint | − | Accept: record as a decision | **Accepted** (autonomous, pending owner review) | Owner decision 1 |
| 1.9 | Gap | Server test target vague | 0 | Moot after 1.1 (no server change); web client ignores nothing new | **Accepted** (moot; autonomous, pending owner review) | — |
| 1.10 | Error | Design 1 wording contradicts itself | 0 | Accept: `WORD_CLASS_NAME`, no third table | **Accepted** (autonomous, pending owner review) | Design 1 |

**Deferred** (Optional): coloured borders and their width (dropped, owner decision 2); a drill-issued review case
(same code path as due, not added); Simulator look at the largest Dynamic Type (open item). Taken: practice review
case, extra `wordClassText` cases.

Net change: no server field, no coloured borders; the class word is coloured on cards and tagged on the review prompt.

## Outcome (2026-11-06)

Built as designed. Mobile 153/153, server 238/238, client 12/12, expo-doctor 20/20, iOS export built. No live runs.
See [findings.md](findings.md).
