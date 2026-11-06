# Round 061 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C10 (new): the owner's note `parallang_obsidian/GAME MECHANICS.md` ("it is very
  important that everything is spoken by a quirky narrator (or neutral one)") and prototype.md Phase 4 (TTS, "provider
  TTS for narrator (if budget allows)"). The app spoke only target-language words (rounds 030, 055).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/speech.js`, `mobile/src/components/DialoguePanel.js`, tests.

## Goal (pre-run)

Each NPC message's English narration can be heard on demand through the device's speech voice. App-only, no live LLM
calls; the frozen web client is unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **On demand only.** A button per narration; reading each new narration automatically is left for the owner (it
   needs a switch and a rule for chip taps during it).
2. **A British voice first** (`en-GB`, the style guide's Pratchett register), else any English voice; the device's
   default rate and pitch (critique Optional: a narrator "quirk" is an owner question).
3. **Known limitation** (critique 1.4): target-language words or Errata's glitched letters in a narration are read by
   the English voice, mispronounced. Not a leak: the narration is on screen and read by VoiceOver already.

## Design (pre-run)

1. **`NARRATOR = { tag: 'en-GB', name: 'English' }`** in `speech.js`. The button always passes `hideWhenUnavailable`
   (critique 1.7), so no "English pronunciation unavailable" name ever shows.
2. **`findVoice`** (critique 1.5): voice languages are compared with `_` folded to `-` (`en_GB` matches `en-GB`), and
   Apple's novelty and Eloquence voices (identifiers starting `com.apple.speech.synthesis.voice.` or
   `com.apple.eloquence.`) are never picked. Quality preference is not added (owner Simulator check).
3. **Row** (critique 1.2): the narration and the button in a row (`alignItems: 'flex-start'`), the text `flexShrink: 1`
   and `flexGrow: 1`, the button not shrinking. A missing, empty or whitespace narration renders nothing (critique 1.3),
   neither text nor button.
4. **Speech:** `speak()` as it is. Pressing again restarts; a chip tap cuts the narration; only the latest utterance
   restores the ambience (critique 1.8).

## Tests (pre-run)

- A narration with an en-GB voice: "Hear the narrator" speaks the narration with `language: 'en-GB'` and that voice's
  identifier. With only an en-US voice and a novelty voice listed first, the en-US non-novelty voice is used. With no
  English voice, no button. `undefined`, `''` and `'  '` narrations render no text and no button. Two messages: two
  buttons (`getAllByRole`; critique 1.6).
- `findVoice`: `en_GB` matched as `en-GB`; novelty voices skipped.
- Narrator pressed, then a chip, then the narrator's late `onStopped`: the ambience stays ducked until the chip's
  utterance ends (critique 1.8).
- Changed existing test (critique 1.1): `encounter-words.test.js`'s one-lookup assertion counts the narrator's tag
  (one lookup per tag, as round 055 designed).
- All mobile, server and client tests; expo-doctor; iOS export.

## Live (pre-run)

None.

## Success (pre-run)

All tests pass; expo-doctor 20/20; iOS export builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 bf9c5e3c…; a Claude general-purpose subagent standing in for Codex (Codex
at its usage limit until 01:36 UTC), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | An existing test counts one voice lookup | 0 | In part: update the test (one lookup per tag, round 055's design); no list cache | **Accepted in part** (autonomous, pending owner review) | Tests |
| 1.2 | Risk | Row layout can squeeze or overflow | 0 | Accept: flex rules stated; Simulator open item | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.3 | Gap | Missing or whitespace narration | + | Accept: render nothing | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.4 | Risk | English voice reads target words | 0 | Accept: a known limitation, recorded | **Accepted** (autonomous, pending owner review) | Owner decision 3 |
| 1.5 | Risk | Novelty voices; `en_GB` strings | + | In part: fold `_`, skip novelty; no quality preference | **Accepted in part** (autonomous, pending owner review) | Design 2, Tests |
| 1.6 | Gap | Same name on every button | 0 | Accept: name kept, tests use `getAllByRole` | **Accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Risk | Unavailable name wrong for English | 0 | Accept: `hideWhenUnavailable` always | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.8 | Gap | Narration and chip interplay untested | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 4, Tests |

**Deferred** (Optional): narrator rate and pitch (owner decision 2); Android input-length guard (narrations are
short); Simulator checks (open items). Taken: decisions rows.

Net change: no empty buttons, novelty voices skipped, `_` folded, stated row layout, one test changed on purpose.
