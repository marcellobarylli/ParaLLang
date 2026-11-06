# Round 101 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** round 044's open item 2 (count Errata's frame words apart from leaks). Round 100's scan shows 98 it and
  29 es `leak` lines in NPC natives over the committed reports, 23 of them from round 051 on. Read by hand, most of
  these are optional words (Errata's *nome* / *nombre*) or Gerald's English "espresso shots".
- **Offline round:** no LLM call; a re-scan of the committed reports. Critic: a fresh read-only subagent (Codex
  limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/scripts/leak-scan.js`, `server/test/leak-scan.test.js`, `results/`.

## Goal (pre-run)

The leak scan counts, apart from `leak`, an NPC line whose only fresh whole-form hits are optional frame words or the
English word *espresso*, and prints the old count beside the new one so earlier rounds' numbers stay comparable.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Frame words, listed by entry id (critique 1.2, 1.5).** `FRAME_TARGETS`, per objective, with the reason. Each is
   outside every required group, and the objective's grammar constraints do not need it:
   - Gerald `order_coffee` and Errata `order`: *vorrei* / *quiero* ("Un caffè, per favore." passes);
   - Portia `introduce`: *io* / *yo* (*sono* / *soy* or *mi chiamo* / *me llamo* carry it);
   - Errata `nobody`: *nome* / *nombre* (the key is *nessuno* / *nadie* with an introduction).

   Mortimer's numbers (*tre, cento, mezzo*; *dos, tres, cien, medio*) are outside the groups too, but the quantity
   constraint needs "a number, un/una or a half", so they stay leaks. `formsFor` carries the entry `id`, and a hit is
   `frame` by id. A content test checks each listed id is a target of its objective, is outside every required
   group, and that no form of it folds to a form of a required entry of the same objective.
2. **English in NPC lines (critique 1.1, Optional).** Only `NPC_ENGLISH_FORMS = { it: ['espresso'] }`: Gerald's
   "five espresso shots". Round 100's `ENGLISH_FORMS` stays for English texts only. It would turn real leaks into
   soft ones (Errata's "Non basta", Portia's "Ciao!" and "¡Hola!"). A comment says which list covers what.
3. **A fifth kind, `soft` (critique 1.6).** A line is `leak` with a fresh exact hit that is neither frame nor
   English, and `near` with fresh word hits. It is `soft` when its only fresh exact hits are frame or English
   ones and it has no fresh word hit. Then come `quoted` and `echo` as before. Order: `leak` > `near` > `soft` >
   `quoted` > `echo`.
4. **Comparability (critique 1.4).** `softLines` in the totals; the printed line reads `leak N (+soft M = old leak
   N+M)`. Findings state that `leak` was redefined in round 101.
5. **Round 044's item is only half closed (critique 1.3).** *sono* / *soy* is in Errata's required group
   `[mi_chiamo, sono]` and stays a leak ("Sono Errata"); carried over as an open item (an owner question: is the
   frame of the introduction a give-away?).
6. **Homonyms stay leaks** (Flick's *ora* as "hour": it is the answer form).
7. **Measure:** before and after per kind, split by era (before and from round 051); the remaining `leak` lines
   from round 051 on are listed.

## Design (pre-run)

`leak-scan.js`: `FRAME_TARGETS`, `NPC_ENGLISH_FORMS`, `isFrame(encounterId, objective, id)`; `formsFor` adds `id`;
`scanReport` marks exact hits `frame` / `english` and adds the `soft` kind; `summarize` adds `softLines` and
`softLines` by era; `main` prints the comparable line.

## Claim boundary (pre-run)

Committed reports only, against today's content. `frame` is a judgement about give-aways, not about grading.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 2b273e00…; a fresh general-purpose subagent (claude-opus-5-5), read-only,
in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `ENGLISH_FORMS` would hide real *basta* / *ciao* / *hola* leaks | + | Accept: only *espresso* in NPC lines | **Accepted** (autonomous decision, pending owner review) | Decision 2, Tests |
| 1.2 | Error | Mortimer's numbers are needed by the grammar constraint | + | Accept: listed frame ids only | **Accepted** (autonomous, pending owner review) | Decision 1, Tests |
| 1.3 | Gap | *sono* stays a leak; the item is half closed | 0 | Accept: carried over | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.4 | Gap | `soft` redefines `leak` across rounds | + | Accept: print the old sum | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.5 | Gap | Frame by entry id; a content test | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 1, Tests |
| 1.6 | Gap | Kind order hides fresh word hits | + | Accept: `leak` > `near` > `soft` | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |

**Optionals:** skip English entirely: taken in part (only *espresso*, Decision 2); a comment on the two English
lists: accepted; check the remaining list against the replay: accepted (Decision 7).

## Tests (pre-run)

`server/test/leak-scan.test.js`:
- Errata es: *nombre* alone is `soft`; *nadie* beside it is `leak`; *nome* with a fresh "chiamo" word hit (it) is
  `near`;
- Gerald it: "five espresso shots" is `soft`; *vorrei* alone is `soft`; *caffè* is `leak`;
- Errata it "Non basta" stays `leak`; Portia it "Ciao!" while `greet` is open stays `leak`;
- Mortimer it: *tre* with `quantity` open stays `leak`;
- a soft form the player wrote earlier is `echo`;
- `summarize` counts `softLines`;
- content: every `FRAME_TARGETS` id is a target of its objective, is outside its required groups, and shares no
  folded form with a required entry of that objective (both packs);
- over every committed report, lines change only from `leak` to `soft` (a before/after diff by report, scene and
  line).
- Mutations; full suites.

## Outcome (2026-11-06)

Built as designed, no amendment. The scan moves 65 NPC lines from `leak` to `soft` and changes nothing else. These
are Gerald's "espresso shots" (32) and Errata's *nome* / *nombre* (33); no listed frame word other than *nome* /
*nombre* appears in the committed lines. Since round 051, 6 leak lines remain, all Italian: Flick's *ora* used as
"hour" (3) and Errata's *sono* (2) and *basta* (1). Spanish has none ([findings](findings.md)).
