# Round 050 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog G5; prototype.md §8.2 (the Fountain teaches "time, directions, commands"); round 011
  deferred telling the time ([architecture](../011/architecture.md), "No telling the time").
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** a fourth objective `time` in `content/languages/{it,es}/encounters/cracked_fountain_letharger.yaml`,
  five entries in each `fountain_riddles.yaml` (`-v2`), `server/test/fountain.test.js`, the `cracked_fountain`
  script in `server/scripts/play-market.js`.

## Goal (pre-run)

The player tells Flick the time in the target language, as a fourth objective of the Fountain encounter in both
packs, and live runs show that the grader accepts the authored time constructions and rejects non-times, including
non-times that hold a time word.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Four authored constructions, not "any time"** (critique 1.1). A passing answer states the current time with one
   of: it *sono le* + hour, *è l'una*, *mezzogiorno*, *mezzanotte*; es *son las* + hour, *es la una*, *mediodía*,
   *medianoche*. Other valid Italian or Spanish ("sono quasi le tre") holds no required evidence and fails; this is a
   known limit, stated in the prompt's examples and an open item.
2. **No number vocabulary** (critique 1.3, 1.13). Hour numbers are not authored (English collisions such as it *due*,
   es *once*; twelve entries per pack; the Rift would review them). The hour must be a target-language number or
   digits; an English number ("Sono le three") fails. Midday and midnight are complete answers without a number, so a
   beginner has a route through the chips and hints. A numbers lesson is an open item.
3. **Agreement slips pass** (critique 1.4). A clear hour with an agreement slip ("Son las una") passes; the bare
   starter ("Sono le.") and an impossible hour ("Sono le venticinque") fail. Feedback may name the slip in English.
4. **Zero tolerance for Flick saying a time** while `time` is open (critique 1.9): any line that states a time, gives
   an example answer or echoes a failed time attempt counts as a failure of the round.
5. **A verdict that differs from the script is a failure** (critique 1.10): it is fixed and re-run, or recorded as an
   unresolved failure. An explanation alone does not pass it.
6. **Flick's character file**: only `defeat_condition.description` changes (it reaches no prompt, so party
   conversations are unaffected).

## Design (pre-run)

1. **Objective `time`**, between `direction` and `now` (the encounter stays ordered; `now` stays last because its
   intent carries the jingle to every line, round 025). `direction.next_objective` is `time`; `time.next_objective`
   is `now`. Intent: the fountain's clock stopped long ago and Flick says it is always far too early; the player tells
   Flick the time; Flick may ask the time but never says one. The intent reaches the greeting and every turn while
   `time` is open (narration gets the remaining objectives).
2. **Grammar constraints** (Decisions 1–3): the player's own statement of the current time with an authored
   construction; now without a time fails (the next objective); questions, scheduling an action ("Lo faccio a
   mezzogiorno"), quotations, English numbers and English-only times fail.
3. **Negative examples** (critique 1.5): it *Adesso!*, *Che ore sono?*, *Sono le tre?*, *Lo faccio a mezzogiorno.*,
   *Sono le three.*, *Sono le.*, English; es the same in Spanish (*¿Son las tres?*, *Lo haré a mediodía.*, …).
4. **Vocabulary** in `fountain_riddles.yaml` (`-v2`; no new file, so the Rift still covers the Fountain with one
   file). it targets `sono_le` (*sono le*), `luna` (*è l'una*, surfaces with straight and typographic apostrophes:
   *è l'una*, *l'una*, *è l’una*, *l’una*; critique 1.2), `mezzogiorno`, `mezzanotte`; non-target `che_ore_sono`
   (*che ore sono*, *che ora è*) for Flick's question. es targets `son_las`, `es_la_una` (*es la una*, *la una*),
   `mediodia` (*mediodía*), `medianoche`; non-target `que_hora_es`. Required group: the four targets.
5. **`ora` in "Che ora è?"** (critique 1.7): the longer `che_ore_sono` wins in matching; the `now` objective gets a
   negative example *Che ora è?* (asks the hour, does not insist on now).

## Tests (pre-run)

- `fountain.test.js`: the scripted walk becomes eight answers (a now-only answer fails `time` while `now` passes
  without closing, then *È l'una* / *Es la una* passes); a new case where one answer (*Adesso, sono le tre!* /
  *¡Ahora, son las tres!*) closes `time` and `now` together (critique 1.6); a matcher case through the real
  vocabulary index: *È l’una* (typographic), *e l'una* (no accent), *sono le tre*, *son las tres y media*,
  *Es mediodía* / *mediodia* map to the time entries, and *Che ora è?* to `che_ore_sono`, not `ora` (critiques 1.2,
  1.7, 1.11). Evidence passes through `validateAssessment` with the full index (the service path).
- Version pins in `encounters.test.js`, `language-engine.test.js` move to `fountain-riddles-*-v2`. Lore-fragment,
  containment, party-overlap and stem tests must pass unchanged.

## Live runs (pre-run)

codex-cli, `play-market.js --location cracked_fountain`, a fixed matrix (critique 1.12):

| Run | it lines for `time` | es lines for `time` | Covers |
|---|---|---|---|
| 1 (script) | *Adesso!* (fail), *È l'una, Flick.* (pass) | *¡Ahora!* (fail), *Es la una, Flick.* (pass) | now ≠ time, singular |
| 2 | *Sono le tre?* (fail), *Sono le tre e mezza.* (pass) | *¿Son las tres?* (fail), *Son las tres y media.* (pass) | target-bearing rejection, plural + minutes |
| 3 | *Lo faccio a mezzogiorno.* (fail), *È mezzanotte!* (pass) | *Lo haré a mediodía.* (fail), *¡Es medianoche!* (pass) | scheduling rejection, midnight |

The other lines are run 1's. Six runs, about 18 calls each. A `--tour` is not planned (it would repeat the other
encounters); it is run if Codex has budget left. Each report: verdicts against the script, every Flick line read
for a stated time (Decision 4), the jingle, the language share, and `leak-scan.js`.

## Success (pre-run)

All server, mobile and client tests pass; every live verdict matches the matrix (Decision 5); no Flick line states a
time while `time` is open (Decision 4).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 328382f0…; Codex, effort high (a bundle on stdin, no file access); raw
text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Valid times can lack required evidence | + | Accept: the promise is narrowed to four authored constructions | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.2 | Error | Typographic apostrophes miss *l'una* | + | Accept: `’` variants and a matcher test | **Accepted** (autonomous, pending owner review) | Design 4, Tests |
| 1.3 | Risk | English hour numbers with target evidence | + | Accept: target-language numbers or digits only; a negative example | **Accepted** (autonomous, pending owner review) | Decision 2, Design 3 |
| 1.4 | Risk | A starter is not a valid time | + | Accept: bare starter and impossible hour fail; agreement slips pass | **Accepted** (autonomous, pending owner review) | Decision 3, Design 3 |
| 1.5 | Risk | Negatives barely test semantics | + | Accept: target-bearing negatives (question, scheduling) | **Accepted** (autonomous, pending owner review) | Design 3, Live run 2–3 |
| 1.6 | Risk | Combined answers in ordered closure | + | Accept: a test where one answer closes time and now | **Accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Risk | Italian *ora* in "Che ora è?" | + | Accept in part: matcher test and a negative example on `now`; the LLM's judgement is not testable offline | **Accepted in part** (autonomous, pending owner review) | Design 5, Tests |
| 1.8 | Risk | The narration restriction's scope | 0 | Accept as a live check: the intent reaches greeting and turns while open; the character's defeat condition reaches no prompt (checked: `prompt-builder.js` sends name, species, tone, quirks) | **Accepted in part** (autonomous, pending owner review) | Design 1, Decision 6 |
| 1.9 | Error | The leak threshold contradicts the rule | + | Accept: zero | **Accepted** (autonomous, pending owner review) | Decision 4, Success |
| 1.10 | Error | An explained mismatch still passes | + | Accept: fix and re-run or an unresolved failure | **Accepted** (autonomous, pending owner review) | Decision 5, Success |
| 1.11 | Risk | The evidence contract is untested | + | Accept: matcher cases through the real index | **Accepted** (autonomous, pending owner review) | Tests |
| 1.12 | Risk | Four runs leave paths untested | + | Accept: a fixed six-run matrix; the tour stays optional | **Accepted in part** (autonomous, pending owner review) | Live runs |
| 1.13 | Risk | The hint teaches an incomplete construction | 0 | Accept in part: examples hold complete answers, and midday / midnight are complete; numbers stay an open item | **Accepted in part** (autonomous, pending owner review) | Decision 2 |

**Deferred (Optional):** time-expression references are added (Treccani *mezzogiorno*, *mezzanotte*; RAE *hora*,
*mediodía*, *medianoche*); no fragment needed a rewrite, so the second optional item does not arise.

Net change from plan-v1: four authored constructions instead of "any hour", typographic apostrophes, target-bearing
negatives, zero leaks, a six-run matrix and two more tests.
