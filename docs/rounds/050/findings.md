# Round 050 findings

## Question

Can the player tell Flick the time at the Cracked Fountain (backlog G5, deferred by round 011) as a fourth objective,
so that the grader accepts the authored time constructions and rejects non-times, including non-times that hold a
time word, and Flick never says the time itself?

## Finding

**Yes. In six live runs (3 Italian, 3 Spanish, codex-cli), all 48 verdicts matched the matrix, and no Flick line
stated, suggested or echoed a time while the objective was open.** The grader rejected "now" without a time, a
question that holds a time (*Sono le tre?* / *¿Son las tres?*) and scheduling an action for midday (*Lo faccio a
mezzogiorno.* / *Lo haré a mediodía.*), and it passed the singular hour (*È l'una* / *Es la una*), the plural with
minutes (*Sono le tre e mezza* / *Son las tres y media*) and midnight. Its evidence named the right entry at
quality 5 each time. Flick asked the time in every run (*Che ore sono? È troppo presto!*, *¿Qué hora es? El reloj no
funciona.*), and on a rejected answer it named the problem in English ("You scheduled it; you haven't told me the
current time", "That was a question, not a statement"). The jingle stayed on all 54 lines.

Found while building: Mortimer's quantity objective already teaches *tre* / *tres* (and *cento*, *dos*, *cien*), so a
player who has done the Butcher has met one number before the Fountain.

## Method

- Content: a `time` objective between `direction` and `now` in both packs. Five entries per `fountain_riddles.yaml`
  (`-v2`): four targets and Flick's question as a non-target. Flick's `defeat_condition` text. Design and decisions
  in [architecture.md](architecture.md).
- Tests: `server/test/fountain.test.js` has the eight-answer walk, an answer that closes `time` and `now` together,
  and matcher cases through the real index (typographic apostrophe, no accents, *Che ora è?* → `che_ore_sono`).
- Live: `node server/scripts/play-market.js --provider codex-cli --location cracked_fountain [--lines …]` with
  `TARGET_LANGUAGE` it / es, the pre-run matrix (run 1 the script, run 2 a question back then plural + minutes, run
  3 scheduling then midnight). Measured with [`results/measure.py`](results/measure.py) (round 025's script, plus the
  time objective and closure in order) and `server/scripts/leak-scan.js`. Every Flick line around the time objective
  was also read by hand.

## Results

| Run | it verdicts | es verdicts | Calls (it / es) | Flick states a time while open |
|---|---|---|---|---|
| 1 (script: *Adesso!* ✗, *È l'una, Flick.* ✓) | 8/8 | 8/8 | 17 / 17 | 0 / 0 |
| 2 (*Sono le tre?* ✗, *Sono le tre e mezza.* ✓) | 8/8 | 8/8 | 17 / 17 | 0 / 0 |
| 3 (*Lo faccio a mezzogiorno.* ✗, *È mezzanotte!* ✓) | 8/8 | 8/8 | 17 / 17 | 0 / 0 |

- **Language share** (estimate `notInTranslation`, 54 lines): 0.52 against 0.50 requested (0.44 without the jingle's
  words), close to round 025's 0.46 against 0.45. Jingle on 54/54 lines, at the end of 53.
- **Leak scan:** 3 Italian `leak` lines, all *l'ora* ("the hour") matched as the `now` target *ora* ("Non hai detto
  l'ora!", "L'ora è giusta!", "Non è l'ora."). The time objective is what makes Flick say it, and round 011 foresaw
  this false positive. 1 `echo` (es), 2 `foreign` lines (it: *mi piace*, *ancora*, *andiamo*, everyday words as in
  round 049). [`results/leak-scan.txt`](results/leak-scan.txt).
- **Grader feedback** after "now" with no time: "You successfully insist on now. You still need to tell Flick what time
  it is." The objective is not closed, though. In an ordered encounter a later pass does not close while an earlier
  objective is open, so the player says "now" again two turns later. The rest of the feedback named what was missing
  in English and never gave the target-language answer.
- **Evidence for the time passes:** `luna` "È l'una", `es_la_una` "Es la una", `sono_le` "Sono le tre e mezza.",
  `son_las` "Son las", `mezzanotte`, `medianoche`, all at quality 5.
- **Tour** (it, `--tour`, the optional end-to-end run): all six encounters resolved, the Rift gate held and opened, 64
  calls (60 before this round). The Fountain's 8 verdicts were as scripted. Scan hits were only the known noise:
  Gerald's English "espresso", Errata's *nome*. [`results/tour-it.json`](results/tour-it.json).
- Tests: server 192/192, mobile 124/124, web 12/12.

## Decision

Ships (autonomous decision, pending owner review). Telling the time is now part of the Fountain, and backlog G5 is
closed. The *l'ora* scan hits are left as known noise; leak-scan rows are flags for reading, not verdicts. The
feedback on a premature "now" pass is an open item, not fixed here: it touches the shared grading template.

## Evidence

- Reports: [`results/run1-it.json`](results/run1-it.json), [`results/run1-es.json`](results/run1-es.json),
  [`results/run2-it.json`](results/run2-it.json), [`results/run2-es.json`](results/run2-es.json),
  [`results/run3-it.json`](results/run3-it.json), [`results/run3-es.json`](results/run3-es.json),
  [`results/tour-it.json`](results/tour-it.json); measures in
  [`results/measure.txt`](results/measure.txt).
- Critique: [trail/critique-1.md](trail/critique-1.md) (13 findings), dispositions in the Second opinion table of
  [architecture.md](architecture.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

- One provider (codex-cli), three runs per language, scripted lines. Each pass and rejection path was run once per
  language. Midday as a *passing* answer, agreement slips ("Son las una"), digits ("Sono le 3"), English numbers and
  the bare starter were not run live; they rest on the authored rubric.
- Valid times outside the four constructions ("sono quasi le tre") fail by design (Decision 1). This was not
  measured.
- No Simulator: the new objective's prompt, chips and hints were not seen in the app.

## Open items

1. Owner: review the time objective and its ten entries (it, es), and the choice of four constructions with no
   number lesson (Decisions 1–3). Should the Fountain or a later conversation teach hours 1–12?
2. Grader feedback says "You successfully insist on now" when `now` passes before `time` and does not close. Either
   the grading template should say a later objective's pass waits for the earlier ones, or ordered encounters should
   grade only the current objective. Either way the shared template changes, and so do Gerald's pinned prompts.
3. Simulator: play the Fountain with four objectives (prompt text, the *che ore sono* chip, hints on *sono le*).
4. The leak scan reads *l'ora* (hour) as the target *ora* (now). Telling the time makes Flick say it.
