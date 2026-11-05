# Round 009 findings

## Question

Does the Market Entrance tutorial (Portia the Archway: greet her, say who you are, ask her name back, with a static
companion briefing on the mechanics) load and play to resolution in both packs, through a live LLM as well as the
fixtures, with Gerald unchanged?

## Finding

Yes. In four live codex-cli playthroughs (three Italian, one Spanish) Portia's tutorial resolved every time, and each
of the three objectives passed on its first scripted attempt (12 of 12 verdicts, evidence quality 5), after which the
map marked Market Entrance complete. Gerald's regression run resolved as in rounds 007–008 (`[true, false]` then
`[true]`). Portia never told the player what to say, but in 3 of 4 runs she asked "Come ti chiami?" / "¿Cómo te
llamas?" herself before the player reached the ask-back objective, which models its answer. Her lines carried less
target language than requested: 0.04–0.28 of tokens (mean 0.18) against 0.20–0.35 (mean 0.28), and the opening line
only 0.05–0.24 (0.06 or less in 3 of 4 runs).

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 (9 findings: 5 accepted, 2 with other fixes,
  2 in part, autonomously).
- Live: Codex CLI 0.166.0 (ChatGPT subscription, CLI default model), CPU, Linux compute node in Apptainer, in-process
  (no port): `node server/scripts/play-market.js --provider codex-cli --location market_entrance` with
  `TARGET_LANGUAGE=it` three times and `es` once; scripted answers "Ciao!", "Mi chiamo Sam.", "E tu?" and "¡Hola!",
  "Me llamo Sam.", "¿Y tú?"; then the default (Gerald) once in Italian. 7 LLM calls per tutorial run, 5 for Gerald.
- Language share is the script's `notInTranslation` estimate (tokens of the NPC line absent from its English
  translation; rough). Dictation was classified by reading every NPC line and feedback string.

## Results

| Check | Result |
|---|---|
| Server tests | 82/82 (+4 in `tutorial.test.js`; 4 assertions updated for the new vocabulary file and location) |
| Mobile tests | 20/20 (+1: briefing card, no briefing for Gerald, no auto-scroll on the first message) |
| Web client | 12/12 and build (code unchanged) |
| iOS export | `npx expo export --platform ios` succeeded |
| Tutorial, live | 4/4 resolved and complete on the map; verdicts 12/12 passed, each on the first attempt |
| Gerald, live | resolved; `[true, false]` then `[true]`; feedback "Add an Italian expression specifying no milk or black coffee." (no answer given) |
| Dictation by Portia | 0/4 runs told the player what to say; 3/4 runs had her ask the player's name with the ask-back phrase |
| Feedback leaks | 0 of 31 feedback strings (overall and per objective, in the 9 assessments with a failed objective) contained a target-language answer; the grader names what is missing in English ("ask “and you?” using the Italian informal pronoun") |
| Target-language share | per line 0.04–0.28 (mean 0.18) vs requested 0.20–0.35 (mean 0.28) |

Representative lines (verbatim, `results/tutorial-it-2.json`): opening "Buongiorno. I am Portia. A greeting and your
name, please. Entry requires manners; structural integrity is optional."; after "Ciao!": "Ciao! Greeting accepted.
Now, come ti chiami? Your name, please; an exclamation mark is not a legal identity."; resolution "Io? Mi chiamo
Portia. Piacere, Sam! You asked me back. Excellent manners. Slightly overwhelming. Benvenuto! You may enter; I shall
record this as a good day." Spanish resolution: "¡Me llamo Portia! Mucho gusto, Sam. You asked. How perfectly civil.
Puedes entrar." The narration kept the visitors'-book quirk in every line. Words she used that the pack does not
author (piacere, benvenuto, bene, tutto in ordine; muy bien, mucho gusto, puedes entrar) get no chips or Spellbook
cards.

## Decision

Ships: the first real second encounter is content plus a briefing field, as round 006 intended. Two follow-ups for
later rounds rather than this one: the low opening-line share (also seen with Gerald) is a prompt question shared by
every encounter, and whether Portia may model "come ti chiami" is a teaching choice for the owner. Next: A4, the
Butcher's Stall.

## Evidence

- Build commit: "round 009: Market Entrance tutorial with Portia and the companion briefing". Main paths:
  `content/characters/enemies/archway_portia.yaml`, `content/languages/{it,es}/encounters/market_entrance_tutorial.yaml`,
  `content/languages/{it,es}/vocabulary/entrance_greetings.yaml`, `server/src/content-loader.js`,
  `server/src/learning-service.js`, `server/scripts/play-market.js`, `mobile/src/components/DialoguePanel.js`,
  `server/test/tutorial.test.js`.
- Live: [`results/tutorial-it-1.json`](results/tutorial-it-1.json), [`results/tutorial-it-2.json`](results/tutorial-it-2.json),
  [`results/tutorial-it-3.json`](results/tutorial-it-3.json), [`results/tutorial-es-1.json`](results/tutorial-es-1.json),
  [`results/gerald-it-1.json`](results/gerald-it-1.json) (each holds every raw LLM output).
- Design and critique: [architecture.md](architecture.md), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

Shown: codex-cli, one scripted correct answer sequence per language (4 tutorial runs, 1 Gerald run), the fixture
grader in-process, and jest rendering. Not shown: wrong or free-form learner answers to Portia live, claude-cli, the
app in the iOS Simulator (the briefing's layout, the scroll rule, taps), that the reference URLs resolve, or teaching
quality as a learner or the owner would judge it.

## Open items

1. Owner, Simulator: enter Market Entrance on a fresh save; check the "Your companion" card, that the first screen
   opens at the top, and that later turns still scroll down.
2. Owner, content review: Portia's character sheet, both tutorial encounters and vocabulary files, the briefing text,
   and the reference URLs (not opened from the container).
3. Owner, teaching choice: Portia asks "Come ti chiami?" before the ask-back objective in 3/4 runs, which models the
   answer. Allowed by the style rule (her own question); change the objective or the character sheet if unwanted.
4. Later round: the opening line carries 0.05–0.24 target language against 0.20 requested (Gerald 0.19 against
   0.25). A shared prompt question for all encounters.
5. Later round: author piacere / benvenuto and mucho gusto / bienvenido (Portia uses them unprompted), so they become
   chips and Spellbook cards.
