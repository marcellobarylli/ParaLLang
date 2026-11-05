# Round 014 findings

## Question

Does The Rift stay sealed until all five other encounters are complete, on the server and on the app's map, and
does a live playthrough of the whole Crumbling Market, all five encounters in one save, resolve every encounter and
open the Rift only at the end?

## Finding

Yes. In-process and over HTTP the Rift refuses a move with `SEALED` until every one of the five encounters is
complete (leaving out any single one keeps it sealed), the map carries its progress (`gate: { sealed, required,
completed }`, visible through the fog), and the app shows a disabled, labelled sealed node. The first live tour of
the whole market (Italian, codex-cli, one save) resolved all five encounters, graded all 20 scripted lines as
intended, was refused at the Rift with "4 of 5 done" before Marginalia and walked in after her. It took 45 provider
calls and 6 min 50 s. Across the tour the target-language share follows each encounter's requested ratio except
Portia's tutorial, which stays far below it (mean 0.11 against 0.28; greeting 0.07 against 0.20): backlog E1 is a
Portia problem, not a general one.

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 (5 findings: 4 accepted, 1 rejected,
  autonomously).
- Live: Codex CLI (ChatGPT subscription, CLI default model), CPU, Linux compute node in Apptainer:
  `TARGET_LANGUAGE=it node server/scripts/play-market.js --provider codex-cli --tour` (in-process, no port), 13:38:38
  to 13:45:28 UTC. Scripted lines as in rounds 009–013, negatives included (ham, a bare unit, a wrong command,
  English, "later", an off-topic answer, the hero's real name).
- Each NPC line read for menus and dictation; every failed objective's feedback read for the answer's forms. Share is
  the script's rough `notInTranslation`.

## Results

| Check | Result |
|---|---|
| Server tests | 96/96 (+5 in `rift-gate.test.js`, +1 in `play-market.test.js`); Gerald's golden prompts unchanged |
| Mobile | 22/22 (+2 in `map-gate.test.js`); iOS export ok; expo-doctor fails only its dependency-version check (D4, now 3 packages) |
| Web client | 12/12 and build (unchanged) |
| Rift before Marginalia | refused, `SEALED`, "The Rift is sealed. Finish the other encounters first (4 of 5 done)." |
| Rift after all five | entered, `gate: { sealed: false, required: 5, completed: 5 }` |
| Encounters resolved and complete on the map | 5/5 |
| Scripted verdicts as intended | 20/20 assessments |
| Feedback naming an answer | 0/23 failed-objective strings, 0/15 overall strings with an open objective |
| Menus / dictation | 0 / 0 |
| Provider calls / time | 45 (5 greetings + 20 × grading and narration) / 6 min 50 s; median call 8.4 s, slowest 23.7 s |
| Share per encounter (mean, against mean requested) | Portia 0.11 / 0.28; Gerald 0.26 / 0.30; Mortimer 0.47 / 0.40; Flick 0.46 / 0.45; Marginalia 0.63 / 0.47 |
| Greeting share (against requested) | Portia 0.07 / 0.20; Gerald 0.24 / 0.25; Mortimer 0.60 / 0.30; Flick 0.39 / 0.30; Marginalia 0.53 / 0.35 |

Representative lines (verbatim, `results/tour-it.json`). Portia's greeting: "Buongiorno! A greeting and your name,
please. I am an archway, not a loophole." Flick after "Left.": "In inglese? Capisco, ma serve l’italiano! Dove devo
andare? Riddle me—oh, una formica!" Marginalia after "Un libro.": "Un libro? No. Un libro è una cosa. La domanda è:
dove va Journathan? … Rileggi: «Il suo viaggio verso casa dura vent'anni.»" (she re-reads the passage, which contains
the answer; it is the reading context, not dictation).

## Decision

Ships. The first half of A7 is done: the gate holds, the map shows it, and the whole market plays end to end in one
save. Next: A7b, the Rift boss (its encounter start must also check the gate, since saves from rounds 005–013 may
stand in the Rift), or E1 narrowed to Portia's tutorial.

## Evidence

- Build commit: "round 014: The Rift is sealed until the other five encounters are complete"
  (`server/src/world.js`, `server/src/content-loader.js`, `content/world/locations/the_rift.yaml`,
  `mobile/src/components/MapPanel.js`, `server/scripts/play-market.js`, `server/test/rift-gate.test.js`,
  `server/test/play-market.test.js`, `server/test/encounters.test.js`, `mobile/src/__tests__/map-gate.test.js`).
- Live: [`results/tour-it.json`](results/tour-it.json).
- Design and critique: [architecture.md](architecture.md), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

Shown: the gate in-process and over HTTP (127.0.0.1, token), the sealed node under jest, one live Italian tour with
codex-cli and scripted lines. Not shown: a Spanish or claude-cli tour, free-form play, how the sealed node looks on
an iPhone (no Simulator), or learning quality.

## Open items

1. Owner, Simulator: the sealed Rift on the map (lock mark, "Sealed 4/5" caption under the node, disabled tap,
   VoiceOver label), and walking in once all five are done.
2. Owner, review: the explicit five-id gate and the choice not to move old saves out of the Rift
   ([decisions](../../autonomy/decisions.md)).
3. A7b must check the gate when the Rift encounter starts, not only on moves.
4. E1: Portia's tutorial lines carry about a third of the requested target language; the other encounters do not.
