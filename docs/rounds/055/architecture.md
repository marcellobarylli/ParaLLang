# Round 055 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog C5 (new); prototype.md Phase 4, "TTS integration … for words".
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/speech.js` (`voiceFor`, `speak`, `stopSpeech`), `PronounceButton.js`,
  `BilingualText.js`, `DialoguePanel.js`, `mobile/jest.after-env.js`, tests.

## Goal (pre-run)

In an encounter, each word chip under an NPC line can be heard in the target-language voice, as Spellbook cards and
reviews already can, without spending a hint or revealing a meaning. No server change, no live LLM calls.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Hearing is free.** It costs no hint, reveals no meaning and stays enabled when the chip is disabled. The
   chip's word is already on screen, and the in-encounter Spellbook already pronounces its cards.
2. **The chip's form is spoken** (`canonicalTarget`), not the inflected form in the line (critique 1.10). It
   matches the label beside the button. A later round that wants `target` must decide so on purpose.
3. **No voice, no button** in chip rows (critique 1.4). Spellbook and reviews keep their disabled 🔇.

## Design (pre-run)

1. **`voiceFor(tag)`** in `speech.js` (critiques 1.1, 1.2) caches the in-flight `findVoice` promise per tag. A
   null result is removed, so the next mount looks again. `findVoice` stays pure. `resetVoiceCacheForTests()` runs
   before every test from a new `setupFilesAfterEnv` file, `mobile/jest.after-env.js` (critique 1.3).
   `PronounceButton` uses `voiceFor`.
2. **Late voices** (critique 1.5, in part): a miss is not cached, so the next mount retries. There is no timer or
   AppState retry. The Simulator check of the cold-start case is an owner open item.
3. **`PronounceButton` gets `hideWhenUnavailable`.** With it set, the button renders nothing when no voice exists.
4. **Layout** (critique 1.6): inside each `word` column, a row holds the chip and its 🔊 (`alignItems: 'center'`),
   with the meaning below. The button sits outside the chip, so the chip's `dim` never dims it (critique 1.9). The
   row's label becomes "Words".
5. **`speak` generations** (critique 1.7): each call takes a generation number. Only the latest utterance's
   `onDone`, `onStopped` or `onError` restores the ambience, so a late `onStopped` from the previous word leaves it
   ducked.
6. **`stopSpeech()`** (critique 1.8) is called when `DialoguePanel` unmounts. It stops `Speech` and restores the
   ambience.

## Tests (pre-run)

- A line with two chips: both have "Hear X in Italian". Pressing one speaks the canonical form with the Italian
  voice, and `onHelp` is not called.
- The 🔊 stays enabled while the chip is disabled, on three paths: loading, the meaning already shown, and a
  protected line with no hints left (critique 1.9).
- With no voice, the chip rows have no pronounce button and the chips still work.
- Cache: two buttons rendered in one `render` make one `getAvailableVoicesAsync` call, and a miss is looked up
  again on the next mount. `findVoice`'s existing test is unchanged.
- `speak`: A then B, then A's late `onStopped`, and the ambience stays ducked. B's `onDone` restores it.
- `DialoguePanel` unmount calls `Speech.stop`.
- The whole mobile suite passes, the theme test included.

## Live (pre-run)

None. The app has no live LLM path that changes. Simulator checks go to the owner.

## Success (pre-run)

All mobile, server and client tests pass, `npx expo-doctor` gives the same result as before, and
`npx expo export --platform ios` builds.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 e2bb2b8c…; a Claude general-purpose subagent standing in for Codex
(Codex at its usage limit), read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A cache in `findVoice` breaks its test | 0 | Accept: separate `voiceFor` | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.2 | Error | Caching results only does not stop the first-render burst | + | Accept: cache the in-flight promise, drop nulls | **Accepted** (autonomous, pending owner review) | Design 1, Tests |
| 1.3 | Error | The cache leaks across tests | + | Accept: reset in a `setupFilesAfterEnv` file | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.4 | Risk | Rows of dimmed 🔇 with no voice | + | Accept: hide in chip rows | **Accepted** (autonomous, pending owner review) | Owner decision 3, Design 3 |
| 1.5 | Risk | Voices arrive late on iOS | 0 | In part: misses not cached; no timer retry; Simulator check for the owner | **Accepted in part** (autonomous, pending owner review) | Design 2, open items |
| 1.6 | Gap | Button placement | 0 | Accept: chip and 🔊 in a row, meaning below | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.7 | Risk | A late `onStopped` restores the ambience mid-word | + | Accept: generations in `speak` | **Accepted** (autonomous, pending owner review) | Design 5, Tests |
| 1.8 | Gap | Speech outlives the screen | 0 | Accept: `stopSpeech` on `DialoguePanel` unmount | **Accepted** (autonomous, pending owner review) | Design 6 |
| 1.9 | Gap | Only one of three disable paths tested | 0 | Accept: test all three | **Accepted** (autonomous, pending owner review) | Tests |
| 1.10 | Risk | The lemma is spoken, not the inflected form | 0 | Accept: state it as a decision | **Accepted** (autonomous, pending owner review) | Owner decision 2 |

**Deferred** (Optional): `accessibilityLanguage` on the mixed-language line (the line is mostly English);
duplicate names across lines (an existing pattern; tests use `within`); act() warnings (watched in the run).

Net change: a promise cache with a test reset, hidden buttons with no voice, a chip row layout, speech generations
and a stop on unmount.

## Outcome (2026-11-05)

Built as designed. Mobile 139/139, server 228/228, client 12/12, expo-doctor 20/20, iOS export built. No live runs.
See [findings.md](findings.md).
