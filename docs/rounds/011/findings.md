# Round 011 findings

## Question

Does The Cracked Fountain (Flick the Letharger, who distracts with riddles: tell it to stop, tell it which way to go,
insist on now rather than later) play to resolution in both packs, live as well as in-process, with the grader's
verdicts following the rubric on the negative cases (a different command, an English direction, agreeing to
tomorrow) and on a surface variant?

## Finding

Yes. All four live codex-cli runs resolved and marked the fountain complete on the map, and each of the 24 scripted
assessments went as intended: "Guarda!" / "¡Mira!" (look) failed `stop`, "Left." failed `direction`, "Domani." /
"Mañana." failed `now`; "Fermati!" / "¡Quieto!", "A sinistra!" / "¡A la izquierda!", the variant "Sempre diritto!"
and "No, adesso!" / "¡No, ahora!" passed with the right vocabulary evidence at quality 5. No feedback string gave a
target form away (0/60). Flick's voice held its character in every run: riddles dropped halfway for a leaf or a moth,
"just five more minutes", ratings of the player's attention span, all in its English; the target-language lines
stayed at beginner level. The answer-listing pattern from round 010 appeared once: after "Fermati!" Flick asked
"¿A la izquierda o a la derecha?" in Spanish (1/4 runs); in Italian it asked "Dove vado? Quale direzione?" without
listing them (3/3).

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 (4 findings: 2 Errors accepted, 2 Cuts
  rejected, autonomously), then the dated Amendment (one variant run).
- Live: Codex CLI 0.166.0 (ChatGPT subscription, CLI default model), CPU, Linux compute node in Apptainer:
  `node server/scripts/play-market.js --provider codex-cli --location cracked_fountain` (in-process, no port) twice in
  Italian and once in Spanish, then once in Italian with `--lines` and "Sempre diritto!". The script walks the
  shortest route (entrance → butcher's stall → fountain). 13 generation calls per run, ~1.5 min.
- Language share is the script's rough `notInTranslation` estimate; answer listing and feedback leaks were
  classified by reading every NPC line and by searching every feedback string (overall and failed objectives) for
  the targets' forms.

## Results

| Check | Result |
|---|---|
| Server tests | 88/88 (+3 in `fountain.test.js`: route, one playthrough per pack) |
| Mobile / web client | 20/20; 12/12 and build (no app changes) |
| Live runs resolved | 4/4 (it 3, es 1), map marked complete 4/4 |
| Scripted verdicts as intended | 24/24 assessments (negatives failed 12/12, positives passed 12/12) |
| Variant form | "Sempre diritto!" → `dritto`, evidence "diritto", quality 5 |
| Feedback strings naming a target form | 0/60 |
| NPC lists an open objective's answers | 1/4 (es: both directions) |
| Target-language share | 0.23–0.68 per line (mean 0.45, 28 lines) against 0.30–0.60 requested; openers 0.28–0.50 against 0.30 |

Representative lines (verbatim). Opening, `results/fountain-it-1.json`: "Ciao! Sono Flick. Hai tempo? A riddle: what
has—ooh, a leaf. Just one more minute. Come ti chiami?". After "Guarda!", `results/fountain-it-2.json`: "Guarda? Sì,
guardo! Oh, una foglia! You got me looking, not stopping. Attention span: leaf out of ten." After "Mañana.",
`results/fountain-es-1.json`: "¡Mañana, perfecto! Hoy no. Tenemos tiempo. You agreed to tomorrow—procrastination gets
a gold star." Resolution, `results/fountain-it-1.json`: "Adesso? Sì, hai ragione! Non domani. Andiamo a sinistra,
adesso! You win. A riddle: what finally moves when—oh, that's me. This is so random."

## Decision

Ships. Unlike Portia's (round 009), Flick's opening lines sit near the requested share, as Mortimer's did. The one
answer list strengthens the case for backlog E3 (a narration rule against listing an open objective's answers),
now seen with two NPCs. Two small content notes: Flick says "Mi fermo!" (I'm stopping), which gets the `fermo`
(still) chip, close enough in meaning; and Italian `ora` is matched in Flick's lines as "now" even where it means
"hour" (not seen in these runs). Next: E3 is the smaller round; A6 (the Old Bookshop) is the next encounter.

## Evidence

- Build commit: "round 011: The Cracked Fountain with Flick the Letharger" (`content/characters/enemies/letharger_flick.yaml`,
  `content/languages/{it,es}/encounters/cracked_fountain_letharger.yaml`,
  `content/languages/{it,es}/vocabulary/fountain_riddles.yaml`, `content/world/locations/cracked_fountain.yaml`,
  `server/scripts/play-market.js`, `server/test/fountain.test.js`); the `--lines` flag in the close commit.
- Live: [`results/fountain-it-1.json`](results/fountain-it-1.json), [`results/fountain-it-2.json`](results/fountain-it-2.json),
  [`results/fountain-es-1.json`](results/fountain-es-1.json), [`results/variant-it-1.json`](results/variant-it-1.json).
- Design and critique: [architecture.md](architecture.md) (Amendment), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

Shown: codex-cli, one scripted line sequence per language plus one variant run, the fixture grader in-process. Not
shown: claude-cli, free-form answers, Spanish variants (the Spanish targets used have only gender and number
variants), the app in the iOS Simulator, the reference URLs, whether the brainrot flavour reads as intended, or
teaching quality as a learner or the owner would judge it.

## Open items

1. Owner, content review: Flick's character sheet (Letharger, brainrot flavour), both fountain encounters and
   vocabulary files, the reference URLs; the dropped Spanish `detente` and `recto` (English *détente*, *recto*), so
   Spanish has no "straight on".
2. Owner, teaching choice: NPCs listing an open objective's answers (now Mortimer 3/3, Flick 1/4); backlog E3.
3. Owner, Simulator: play Flick in the app (no app changes in this round); the fountain is two moves from the start.
