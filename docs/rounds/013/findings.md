# Round 013 findings

## Question

Does The Old Bookshop (Marginalia the Bookworm, who reads two passages of *The Journey* and asks where Journathan is
going and what name he gave the Cyclops) play to resolution in both packs, does she actually read the passages
before asking, and do the grader's verdicts follow the rubric on the negatives (a book, English, his real name) and
on a reported-speech answer?

## Finding

Yes, after one content fix. In every run she read each passage word for word before asking its question, but in the
first three runs not in her greeting: the greeting only introduced the shop, so the player's first turn came before
there was anything to answer (3/3). Telling her, in the first objective's intent, to read the passage in her greeting
fixed it (3/3 after). All six runs resolved and every scripted line was graded as intended (30/30 assessments): "Un
libro.", the English "Home." and "Journathan." failed; "A casa!", "Nessuno!" / "¡Nadie!" and the reported speech "Ha
detto «Nessuno»." passed (quality 5, 4 for the reported speech). The reading-context grammar constraint did its job:
the grader's general rule against third-person attribution did not reject the reported speech. No feedback string
named an answer, and no line offered a menu or dictated. Her lines carry more target language than requested once a
passage is read (up to 0.88 against 0.60), which suits a reading encounter.

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 (5 findings: 4 accepted, 1 rejected,
  autonomously), then the dated Amendment.
- Live: Codex CLI 0.166.0 (ChatGPT subscription, CLI default model), CPU, Linux compute node in Apptainer:
  `node server/scripts/play-market.js --provider codex-cli --location old_bookshop` (in-process; three moves from the
  start) in Italian, in Italian with `--lines 'Un libro.|Home.|A casa!|Journathan.|Ha detto «Nessuno».'`, and in
  Spanish; before and after the Amendment.
- Each NPC line read for: passage read verbatim, passage before its question, menu, dictation. Feedback: every
  failed objective's feedback searched for the answers' forms. Share is the script's rough `notInTranslation`.

## Results

| Check | Result |
|---|---|
| Server tests | 90/90 (+2 in `bookshop.test.js`, one playthrough per pack; route of three moves; passages in the prompt) |
| Mobile / web client | 20/20; 12/12 and build (no app changes) |
| Runs resolved | 3/3 before, 3/3 after |
| First passage read in the greeting | 0/3 before, 3/3 after |
| Each passage read before its question | 6/6 runs |
| Scripted verdicts as intended | 30/30 assessments |
| Reported speech "Ha detto «Nessuno»." | passed, nessuno, quality 5 before and 4 after |
| Feedback naming an answer | 0/36 failed-objective strings |
| Menus / dictation | 0 / 0 |
| Target-language share | 0.22–0.88 per line (mean 0.54, 36 lines) against 0.35–0.60 requested |

Representative lines (verbatim). Greeting after the fix, `results/after-bookshop-it-2.json`: "Sono Marginalia. Questa
è la storia di Journathan, l'uomo dalle molte lingue. Il suo viaggio verso casa dura vent'anni. / I sell books only to
people who understand them. No spoilers; it's about the journey, not the destination. Journathan hates that. / Dove va
Journathan?" After "Journathan.", `results/bookshop-es-1.json`: "Journathan es su nombre real, pero no es el nombre
que da al Cíclope. Reading comprehension: a true fact on the wrong shelf." Resolution, `results/bookshop-es-1.json`:
"¡Correcto! El nombre es Nadie. Entiendes el pasaje; el libro es tuyo. Reading comprehension: footnote-worthy. … No
spoilers; I have eaten the index."

## Decision

Ships. A6 is done and B2 has its first content (Journathan, *The Journey*, the Cyclops trick). Passages in an
objective's `intent` work as a content-only mechanism, but the greeting template's "concise" pulls against a passage
up front, so a passage that must open the scene needs to say so. Next: A7, the Rift (all five other encounters now
exist, so the gate and the review of all vocabulary can be built), or E1.

## Evidence

- Build commits: "round 013: The Old Bookshop with Marginalia the Bookworm and The Journey"
  (`content/characters/enemies/bookworm_marginalia.yaml`, `content/languages/{it,es}/encounters/old_bookshop_bookworm.yaml`,
  `content/languages/{it,es}/vocabulary/bookshop_journey.yaml`, `content/world/locations/old_bookshop.yaml`,
  `server/scripts/play-market.js`, `server/test/bookshop.test.js`) and "round 013: Marginalia reads the first passage
  in her greeting" (the two encounter files).
- Live before: [`results/bookshop-it-1.json`](results/bookshop-it-1.json), [`results/bookshop-it-2.json`](results/bookshop-it-2.json),
  [`results/bookshop-es-1.json`](results/bookshop-es-1.json). After: [`results/after-bookshop-it-1.json`](results/after-bookshop-it-1.json),
  [`results/after-bookshop-it-2.json`](results/after-bookshop-it-2.json), [`results/after-bookshop-es-1.json`](results/after-bookshop-es-1.json).
- Design and critique: [architecture.md](architecture.md) (Amendment), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

Shown: codex-cli, one scripted line sequence per language plus a reported-speech variant, three runs before and three
after the fix, the fixture grader in-process. Not shown: claude-cli, free-form answers, the app in the iOS Simulator
(long passages in the dialogue bubble), the reference URLs, the quality of the authored passages, or teaching
quality as a learner or the owner would judge it.

## Open items

1. Owner, content review: Marginalia's character sheet, both passages of *The Journey* (Italian and Spanish), the
   Journathan lore she states, both encounter and vocabulary files, the reference URLs; the dropped Spanish `años`.
2. Owner, Simulator: play the Bookshop in the app; the passages make her lines the longest in the game so far.
3. Engine note (critique 1.1): `matchCanonicalVocabulary` folds accents always and ignores `accent_insensitive`;
   harmless so far, but the flag is misleading in content.
