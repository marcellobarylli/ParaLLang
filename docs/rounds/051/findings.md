# Round 051 findings

## Question

In an ordered encounter, can an objective that passes before an earlier one stop being reported as a success
(grader feedback, app, narrator), now that it is not banked and the player must say it again (backlog H1, round 050
open item 2)?

## Finding

**Yes, though not by the route planned. With the ORDER line, the grader itself now fails the early objective rather
than passing it**, so the server's `held` mark did not occur in the live runs. After *Adesso!* / *¡Ahora!* at the
time objective, `now` was graded `passed: false` in both languages, where round 050's runs had it `passed: true`.
Its feedback was "You must say that again once the earlier time objective is met." The overall feedback was "First
tell Flick what time it is in Italian. Then insist on doing it now again." Flick did not celebrate ("Adesso? Ma che
ore sono? That means now, not a time."). No feedback gave the answer. A combined answer (*Sono le tre, adesso!* /
*Son las tres, ¡ahora!*) still closed both objectives in one turn, and Gerald's `verify:cli` still passes. `held`
remains as the deterministic backstop for when a grader passes the later objective anyway: it is tested offline and
shown in the app as "…".

## Method

- Server: `held: true` on results that pass but do not close (ordered only), in the response and the narration
  decision, with a `held_note` for the narrator. An ORDER bullet in the grading prompt for two or more ordered
  objectives ([architecture.md](architecture.md), Amendment 1 for its position). App: "…" and "(say it again after
  the earlier objective)".
- Tests: `fountain.test.js` (held in response and decision, the replay keeps the marks and records nothing, no
  banking, [pass, fail, pass]), `unordered-objectives.test.js` (unordered never holds; ordered thanks-first is held),
  `order-line.test.js` (byte identity), `mobile/src/__tests__/held.test.js`.
- Live (codex-cli): `play-market.js --location cracked_fountain` 1 × it, 1 × es (script); `--lines` with a combined
  answer, 1 × it, 1 × es; `npm run verify:cli -- --provider codex-cli`.

## Results

| Run | Resolved | Calls | Early "now" verdict | Feedback for it | Flick's next line |
|---|---|---|---|---|---|
| Fountain it | yes | 17 | failed (050: passed) | "You must say that again once the earlier time objective is met." | "Adesso? Ma che ore sono? That means now, not a time." |
| Fountain es | yes | 17 | failed (050: passed) | "You must say that again once you have stated the current time in Spanish." | "¡Eso no me dice la hora! ¿Qué hora es?" |
| Combined it | yes, on the time turn | 11 | time ✓, now ✓ | "Both objectives passed" | — |
| Combined es | yes, on the time turn | 11 | time ✓, now ✓ | "Both objectives passed" | — |
| verify:cli (Gerald, it) | passed | 14 | — | — | — |
| es `--tour` (all six encounters) | all, gate held and opened | 64 | no result passed after a failed one in any encounter | — | — |

All other verdicts in the two Fountain runs were as in round 050's script. Tests: server 198/198, mobile 126/126,
web 12/12. Gerald's pinned narration prompts are unchanged.

## Decision

Ships (autonomous decision, pending owner review). The grading line does the work, and `held` stays as the backstop.
Backlog H1 is closed. A failed early objective records no Spellbook evidence for the correct word. Under round 050's
behaviour it recorded a pass. This is accepted: the player says the word again, and that use is recorded.

## Evidence

- Reports: [`results/fountain-it.json`](results/fountain-it.json), [`results/fountain-es.json`](results/fountain-es.json),
  [`results/combined-it.json`](results/combined-it.json), [`results/combined-es.json`](results/combined-es.json),
  [`results/verify-cli.log`](results/verify-cli.log), [`results/tour-es.json`](results/tour-es.json); round 050's baseline in
  [`../050/results/run1-it.json`](../050/results/run1-it.json).
- Critique: [trail/critique-1.md](trail/critique-1.md) (9 findings), dispositions in [architecture.md](architecture.md).
  Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

- One run per language and case, one provider. The grader's switch from pass to fail is one observation per
  language. It is not a measured rate, and a grader may still pass the later objective (then `held` applies, tested
  offline only).
- The other ordered encounters were run once, in the Spanish tour. Party conversations get the ORDER line too and
  were not re-run.
- The frozen web client still shows ✓ for a held result (Decision 2). No Simulator.

## Open items

1. Owner: should an early correct use be recorded in the Spellbook (as round 050's behaviour did) even though it does
   not close? The ORDER line now makes the grader fail it.
2. Party conversations with two ordered objectives (for example Gerald's coffee break) were not re-run with the ORDER
   line.
3. Simulator: the "…" mark and the suffix in the Assessment panel.
