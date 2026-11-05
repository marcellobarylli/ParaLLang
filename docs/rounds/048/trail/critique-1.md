# Codex critique 1: deeper tiers for Mortimer, Flick and Marginalia

- **Dispatched:** 2026-11-05T21:25:59Z
- **Returned:** 2026-11-05T21:27:04Z
- **Model:** codex exec (codex-cli), `--sandbox read-only -c model_reasoning_effort=high`, no file access (bundle on stdin)
- **Prompt:** verbatim in `../results/critique-prompt.txt`
- **Reviewed input:** `plan-v1.md`, sha256 5536f8bb09634299fb5fd139b1043083e0154ff58fd75616cf8567d9836f09a4, HEAD f8259c4, working tree docs/rounds/048/ only; bundle `../results/critique-bundle.txt` (396 lines, sha256 4edfffe3…)
- **Findings:** 6 (all Risks)

## Raw output (verbatim)

```text
1. **Risk — `sola` practically invites a leak (lines 28–36).** Marginalia can naturally say “Sono sola” / “Estoy sola” while explaining her loneliness. Specify an English opening such as “I’ve waited so long for someone to read with me,” and explicitly prohibit target forms in dialogue **and narration**, including the transition after `here_i_am`.

2. **Risk — negation presence does not establish the intended meaning (lines 29–30).** “Non so perché sei sola” / “No sé por qué estás sola” contain negation but still assert that she is alone. Require the player to deny **Marginalia’s being alone**. Add those negatives, wrong-speaker negatives (“Non sono sola” / “No estoy sola”), and wrong-gender negatives alongside the positive examples.

3. **Risk — the oath needs careful negation and commitment grading (lines 16–17).** “Prometto di non toccare…” / “Prometo no tocar…” must pass; “Non prometto…” / “No prometo…” and promises **to touch** the herds must fail. Explicitly permit a bare “Prometto” / “Prometo” as an answer to Mortimer’s request, while requiring any expanded promise to preserve that commitment.

4. **Risk — Mortimer’s registered variants include inappropriate answers (lines 14–15).** `tranquilla` / `tranquila` address a female; the plurals change the addressee. The plan acknowledges this, but vocabulary recognition alone will still find them. Remove unsupported forms or make them explicit grading negatives. The proposed “Tranquillo, Mortimer” live input exercises the canonical form, so it cannot demonstrate alternate-form acceptance.

5. **Risk — leaks can come from earlier objectives (lines 35–36, 62–63).** Flick may encourage itself with `coraggio` / `ánimo` before the second objective; Mortimer may say `prometto` / `prometo` while discussing his oath. Each intent should prohibit **all still-unmet targets**, not merely its own. Inspect greetings, failure replies, and objective-transition replies.

6. **Risk — the tests can pass while semantic grading fails (lines 45–63).** Fixture graders prove progression wiring; the live scripts test an English rejection only before the first target. Add live probes at the second objective: affirmative “Sei sola” / “Estás sola,” misplaced negation, wrong speaker/gender, and an inverted oath. Verify each fails **without advancing**, then submit the valid answer. Test accented and unaccented Spanish forms explicitly.

The supplied base translations are otherwise natural; the bundle demonstrates no actual whole-form collision among these new targets.
```
