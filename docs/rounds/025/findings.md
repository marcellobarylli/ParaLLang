# Round 025 findings

## Question

Does an authored brainrot jingle for Flick (backlog B3, Fountain part) reach Flick's lines in both packs, without
giving answers away? Does humming it back fail while a refusal that names "tomorrow" passes?

## Finding

**Yes, in 3 live runs after the change (2 Italian, 1 Spanish).** Flick ended **every one of its 21 lines** with
the exact refrain (*Dopo, dopo, domani!* / *♪ ¡Después, después, mañana! ♪*). It did so in none of the 14 baseline
lines, which only had the loose "later / tomorrow" stalling. All three runs resolved with every verdict as scripted:

- Humming the jingle back failed `now` in both languages. The grader's feedback named it ("You repeated Flick's
  delay jingle. Refuse to wait and insist on doing it now in Italian.") and gave no target-language answer.
- "No, adesso, non domani!" and "¡Ahora, no mañana!" passed (critique 1.2's worry did not occur).
- No line used an open objective's answer.
- Flick kept its feed voice ("Your delay game: immaculate."). The narration picked up the joke: "Flick's jingle
  acquires a second voice. This is how procrastination forms a committee."

**Two side effects.**

1. The refrain is on every line, not on some of them. That fits LORE.md's symptom (a catchphrase "that attaches to
   the end of every sentence"), but over a long encounter it may read as repetitive. That is a judgement for the
   owner.
2. **The jingle fills part of the target-language share** (critique 1.3 confirmed). Mean share was 0.46 with the
   jingle against 0.45 requested. Without the jingle's words it was 0.39, down from 0.53 on the baseline (0.52
   without those words). The model counts the refrain toward its quota and writes less other Italian or Spanish.
   This is evidence for E1 (the ratio rule is loose); the content is not tuned here.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md) (7 findings: 5 accepted,
  2 in part; the one Error, "Stop!" is Italian too, accepted). Content applied by
  [`results/gen/apply.py`](results/gen/apply.py).
- Tests: `node --test server/test/*.test.js`, `npm run test:mobile`, web client vitest and build.
- Live: `TARGET_LANGUAGE=<it|es> node server/scripts/play-market.js --provider codex-cli --location
  cracked_fountain [--lines ...]`, in-process, sequential. Baseline on HEAD 3acbc61 (it, es; default script),
  17:32–17:36 UTC. After the change (it default; it and es with the hum and a refusal naming tomorrow), 17:38–17:43
  UTC. 13 calls per run, 65 in all, no usage limit.
- Measures by [`results/measure.py`](results/measure.py): verdicts, open targets in Flick's lines, both jingle
  words, the exact refrain and the refrain at the end of the line, the share estimate (`notInTranslation`), and the
  same share with the jingle's tokens removed.

## Results

| Check | Result |
|---|---|
| Server tests | 133/133 (131 before; 2 new; one assertion changed: the Fountain now has a briefing) |
| Mobile / web client | 37/37 / 12/12 and build (unchanged) |
| Gerald's pinned prompts | unchanged |

| Run | Resolved | Verdicts as scripted | Refrain at end | Open-target leaks | Share (without jingle) | Requested |
|---|---|---|---|---|---|---|
| Baseline it | yes | 6/6 | 0/7 | 0 | 0.57 (0.56) | 0.45 |
| Baseline es | yes | 6/6 | 0/7 | 0 | 0.50 (0.49) | 0.45 |
| After it | yes | 6/6 | 7/7 | 0 | 0.45 (0.37) | 0.45 |
| After it, hum | yes | 6/6 (hum fails) | 7/7 | 0 | 0.45 (0.38) | 0.45 |
| After es, hum | yes | 6/6 (hum fails) | 7/7 | 0 | 0.48 (0.41) | 0.45 |

The baseline's "without jingle" removes *domani* / *mañana* tokens where they occur. All figures are estimates.

LLM outputs:

- it greeting: "Ciao! Sono Flick. What's a fountain without—ooh, a leaf. Just one more minute. Come ti chiami?
  Dopo, dopo, domani!"
- it, after the hum: "Sì! Canti con me! Ma così aspettiamo ancora. Vuoi aspettare? Riddle me—oh, another spark.
  Your delay game: immaculate. Dopo, dopo, domani!"
- es, after "¡Ahora, no mañana!": "¡Ahora! Sí, muy bien. No mañana. Tú vas ahora; yo voy… después. Your attention
  span: deeply inconvenient. ¿Qué tiene dos pies y—ooh, a leaf. ♪ ¡Después, después, mañana! ♪"

## Decision

Keep the content. B3 is done: the Rift since round 015, the Fountain now. New backlog B4 covers Spellbook
containment files, which need an app change. The share displacement goes to E1 as evidence: a template round
should say whether recurring refrains or formulas count toward the ratio. The refrain on every line is left as
authored, pending the owner's view. If it should be rarer, the quirk can say "on some of its lines".

## Evidence

- [`results/`](results/): five reports with raw outputs, grading and timings
  ([`after-fountain-it-hum.json`](results/after-fountain-it-hum.json),
  [`after-fountain-es-hum.json`](results/after-fountain-es-hum.json),
  [`after-fountain-it.json`](results/after-fountain-it.json),
  [`baseline-fountain-it.json`](results/baseline-fountain-it.json),
  [`baseline-fountain-es.json`](results/baseline-fountain-es.json)), [`measure.py`](results/measure.py),
  [`gen/apply.py`](results/gen/apply.py).
- [critique 1](trail/critique-1.md), [plan-v1](trail/plan-v1.md), [journal](trail/journal.md).

## Claim boundary

One run per script and language is a smoke check, not a rate. Share figures are the script's estimate. Nothing was
checked in the iOS Simulator (the briefing card, the plaque on the map). The Italian and Spanish content has had no
native-speaker review. Flick's party conversation also receives the changed quirk but was not re-run.

## Open items

- Owner: review the jingle, the containment notice and the plaque, and whether the refrain should be on every line
  or on some of them.
- Owner (Simulator): check the Fountain's companion card (three lines) and the plaque in the map's location text.
- Next rounds: E1 (counting refrains toward the ratio), B4 (Spellbook containment files), a re-run of Flick's party
  conversation with the new quirk.
