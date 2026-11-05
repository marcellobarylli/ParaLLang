# Round 025 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog B3 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); the owner's notes
  `parallang_obsidian/LORE.md` ("Infohazards": they live in the foreign language and only harm someone who
  understands it; the Lethargers farm brainrot, low harm and very high virulence; the deadpan SCP-style containment
  file; the symptom "a catchphrase that attaches to the end of every sentence"); round [015](../015/architecture.md)
  (the Rift part of B3, Errata); round [011](../011/architecture.md) (Flick).
- **Findings:** [`findings.md`](findings.md), after the runs.
- **Artifact:** Flick's character file, both packs' Fountain encounter, the Fountain's location description,
  `server/test/fountain.test.js`, [`results/`](results/) (live reports, `measure.py`, `gen/apply.py`).

## Goal (pre-run)

The Cracked Fountain carries the infohazard idea: Flick's jingle is a named brainrot strain in the target language,
with a containment notice from the companion, and humming it back fails the last objective. Content only, Italian
and Spanish; no engine change; Gerald's pinned prompts unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The jingle is authored per pack** and made only of the Fountain's words for later and tomorrow: it *Dopo,
   dopo, domani!*, es *¡Después, después, mañana!* (later, later, tomorrow). It names none of the encounter's
   targets, and it is the very temptation the `now` objective already refuses.
2. **It lives in the last objective's intent**, the one content field that reaches every narration prompt (turns
   get the remaining objectives) and the grader; the shared character quirk names no language.
3. **The containment file stays in the companion briefing** (English, three lines). A Spellbook containment file
   per infohazard (LORE.md's gameplay hook) needs an app change: new backlog item B4.
4. **"Stop!" is not called English-only** (critique 1.4, Error): *Stop!* is also an Italian (and Spanish)
   interjection. The English-only negative example becomes "Stop moving!" in both packs. It still cannot pass:
   the required group is fermati / fermo / basta (quieto / basta).

## Claim boundary (pre-run)

One live run per script and language is a smoke check, not a rate. The round can claim the content loads, the
jingle reaches the prompts, the verdicts in the scripted runs, and what Flick said. It cannot claim that players
read the jingle as an infohazard, learning effects, or how the briefing card looks in the app (no Simulator); the
Italian and Spanish need a native speaker's review.

## Deferred (pre-run)

B4 (Spellbook containment files), the companion redacting a hazard, optional infohazard passages (A9), E1's share
work (the jingle is not a share fix; measured with and without it, critique 1.3).

## Design (pre-run)

Applied by [`results/gen/apply.py`](results/gen/apply.py) (exact string edits) after the baseline runs:

1. `content/characters/enemies/letharger_flick.yaml`: the quirk "Hums a jingle that sticks: brainrot it farms, low
   harm and very high virulence" becomes "Hums the Fountain jingle, a brainrot strain native to the other language
   (low harm, very high virulence): it tacks the jingle onto the end of its lines like a catchphrase; it only works
   on listeners who understand it, and the player is starting to".
2. `content/languages/<code>/encounters/cracked_fountain_letharger.yaml`, `now` objective intent (it; es likewise
   with "in Spanish" and its jingle): "The player refuses to put it off and says now, in Italian. Flick keeps
   humming its jingle, \"Dopo, dopo, domani!\" (later, later, tomorrow), a mild brainrot infohazard that makes
   listeners put things off. Repeating the jingle or agreeing to later does not pass; a refusal that names later or
   tomorrow and insists on now passes." (critique 1.2: the rejection is scoped to answers that agree to postpone;
   "Adesso, non domani." / "Ahora, no mañana." are already accepted examples).
3. Same file: a `now` negative example, the jingle itself, reason "Humming Flick's jingle back puts it off; it does
   not insist on now."; the `stop` negative example "Stop!" becomes "Stop moving!" (decision 4).
4. Same file: `companion_briefing`:
   - "Containment notice, the Cracked Fountain: one brainrot strain. Harm: low. Virulence: very high."
   - "Vector: a jingle. It only works on people who understand it. If you understood it, congratulations."
     (critique 1.5)
   - "Containment procedure: do not hum along."
5. Same file: resolved message ends "The fountain is quieter, and the jingle has almost left your head."
6. `content/world/locations/cracked_fountain.yaml`: description gains "A brass plaque, newer than the fountain,
   reads: PLEASE DO NOT HUM." (narration prompts carry the location name only; this is map text).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 9706ed2d…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | A safe jingle does not make Flick's lines safe ("Say adesso, not domani") | 0 | Accept: the leak check covers every line and every open target's forms; read the lines for answer-bearing phrases | **Accepted** (autonomous, pending owner review) | Live runs |
| 1.2 | Risk | "Humming it back is giving in" in the grader's intent may reject "No, adesso! Non domani!" | − | Accept in part: scope the rejection to agreeing to postpone and say a refusal naming later passes; one live line tests it (no new fixture grader test: the fixture grader does not read intents) | **Accepted in part** (autonomous) | Design 2, Live runs |
| 1.3 | Risk | A repeated jingle can meet the ratio mechanically | 0 | Accept: report the share with and without the jingle's words | **Accepted** (autonomous) | Live runs |
| 1.4 | Error | "Stop!" is Italian too; calling it English-only mislabels it | 0 | Accept: "Stop moving!" in both packs | **Accepted** (autonomous) | Decision 4, Design 3 |
| 1.5 | Risk | "Which now includes you" asserts comprehension | + | Accept: "If you understood it, congratulations." | **Accepted** (autonomous) | Design 4 |
| 1.6 | Suggestion | Check the catchphrase itself: exact refrain at the end of the dialogue, narration English, feed voice, repeated runs | 0 | Accept in part: count exact refrain and refrain-at-end in `native`; read narration and voice; no extra repeated runs (budget) | **Accepted in part** (autonomous) | Live runs |
| 1.7 | Suggestion | Keep authored spellings (accents, ¡) distinct from ids | 0 | Accept: authored text keeps them; ids appear in tests only | **Accepted** (autonomous) | Design 2 |

Net change: the intent scopes rejection to postponing, the briefing's second line is conditional, "Stop!" becomes
"Stop moving!", and the live measures add refrain counts and the share without the jingle.

## Tests (pre-run)

- `server/test/fountain.test.js`, per pack: the `now` intent quotes the jingle; the jingle is a `now` negative
  example; the jingle's words are exactly the folded forms of `dopo`/`domani` (`despues`/`manana`) and contain no
  target form of any objective; the quirk, plaque and resolved message are in place; "Stop!" is no longer a negative
  example; the start snapshot carries the three-line briefing; the existing scripted verdicts are unchanged.
- Gerald's golden prompts unchanged; full server, mobile and web client suites.

## Live runs (pre-run)

codex-cli, in-process, sequential. Baseline on HEAD 3acbc61 before the change (it, es; default script). After:
1. it, default script;
2. it, `--lines 'Guarda!|Fermati!|Left.|A sinistra!|Dopo, dopo, domani!|No, adesso, non domani!'`;
3. es, `--lines '¡Mira!|¡Quieto!|Left.|¡A la izquierda!|¡Después, después, mañana!|¡Ahora, no mañana!'`.

Measures (`results/measure.py`): resolved; verdicts as scripted (the hum fails `now`, the refusal naming tomorrow
passes); lines with both jingle words, the exact refrain, the refrain at the end; share with and without the jingle
words against requested; open targets in Flick's lines. Pass bar: all resolved, verdicts as scripted, the refrain in
at least half the lines, no open target used by Flick.

## Outcome (2026-11-05)

Built as designed, with no amendment. Server 133/133, mobile 37/37, web client 12/12 and build; Gerald's pinned
prompts unchanged. Live codex-cli, 3 runs after the change and 2 baseline runs, all resolved with every verdict as
scripted. The refrain ended 21/21 of Flick's lines (0/14 before), humming it back failed `now`, and no open target
leaked. The jingle takes up part of the target-language share: 0.39 without it, against 0.53 on the baseline.
That is evidence for E1. Backlog B3 is done; B4 (Spellbook containment files) is new. See [findings](findings.md).
