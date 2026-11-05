# Round 010 findings

## Question

Does The Butcher's Stall (Mortimer the Charcutier, who calls everything ham: name a different meat, then a quantity
with a unit) play to resolution in both packs, live as well as in-process, and do the grader's verdicts follow the
rubric on the negative cases (ham, a bare unit)?

## Finding

Yes, after one fix the live runs found. In the first Italian runs (2 of 2) the grader passed "Due etti, per favore."
but gave no vocabulary evidence, so the server rejected the verdict and the encounter could not resolve. The cause was
older than this round: since round 001 the grading rubric has shown each target's canonical form ("etto") but never
its authored surface variants ("etti"), while the grader is told to report only forms it sees authored. With the
forms in the rubric (Amendment), all three butcher runs resolved, and every scripted line was graded as intended: ham
failed, salame / chorizo passed, a bare "Chilo." / "Kilo." failed, "Due etti" / "Medio kilo" passed (quality 5).
Gerald's `verify:cli` still passed 9/9. New in the after runs: when the player asked for ham, Mortimer offered the
three passing meats as a menu ("Vuoi salame, salsiccia o pollo?") in 3 of 3 runs (0 of 3 before), which gives the
first objective's answer away for recognition.

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 (7 findings: 5 accepted, 2 in part,
  autonomously), then the dated Amendment.
- Live: Codex CLI 0.166.0 (ChatGPT subscription, CLI default model), CPU, Linux compute node in Apptainer:
  `node server/scripts/play-market.js --provider codex-cli --location butchers_stall` (in-process) twice in Italian
  and once in Spanish, before and after the Amendment; after it, `npm run verify:cli -- --provider codex-cli` in
  Italian (ephemeral 127.0.0.1 server with a random token). Scripted lines: ham, a real meat, a bare unit, a quantity.
- Language share is the script's rough `notInTranslation` estimate; dictation and feedback leaks were classified by
  reading every NPC line and every feedback string of assessments with a failed objective.

## Results

| Check | Result |
|---|---|
| Server tests | 85/85 (+3 in `butcher.test.js`: one playthrough per pack, one rubric-forms test) |
| Mobile / web client | 20/20; 12/12 and build (no app changes) |
| Butcher, before the Amendment | Spanish 1/1 resolved; Italian 0/2 (`INVALID_GRADING` on "Due etti", empty evidence) |
| Butcher, after | 3/3 resolved; verdicts per line as scripted in every run (12/12 assessments) |
| `verify:cli` after (Gerald, it) | passed, 9/9, resolved, 14 calls |
| Feedback leaks | 0 of 48 strings (all six runs) |
| Menu of answers after the ham request | 3/3 after runs, 0/3 before |
| Target-language share | 0.22–0.58 per line (mean 0.40) against 0.30–0.50 requested |

Representative lines (verbatim, `results/after-butcher-it-2.json`): opening "Buongiorno! Tutto è prosciutto!
Certified ham—even the hat. Che cosa desidera?"; after "Chilo.": "Un chilo di cosa? No, aspetti! Il salame, certo. Ma
quanto? “Chilo” è solo l’unità. My scales need a number with that weight unit. Certified ham, uncertified
quantity."; Spanish resolution: "¡Medio kilo de chorizo! ¡Perfecto! Aquí tienes. My honest scales approve. Correct
meat, correct quantity. Certified ham-tier shopping. ¡Gracias!" The meme layer ("ham-tier", "not a vibe") stayed in
his English, as the style guide asks.

## Decision

Ships, with the rubric fix, which also covers every plural and alternative spelling in Gerald's and Portia's
packs. Unlike Portia (round 009), Mortimer's share is close to the request, so a low share is not shared by every
encounter; it may come from Portia's lower base ratio or her character. The answer menu is a narration question
like Portia's modelled "come ti chiami": open for the owner, and the next narration rule round if unwanted. Next: A5,
the Cracked Fountain.

## Evidence

- Build commits: "round 010: The Butcher's Stall with Mortimer the Charcutier" (`content/characters/enemies/charcutier_mortimer.yaml`,
  `content/languages/{it,es}/encounters/butchers_stall_charcutier.yaml`, `content/languages/{it,es}/vocabulary/butcher_meats.yaml`,
  `server/scripts/play-market.js`, `server/test/butcher.test.js`) and "round 010: grading rubric lists each target's
  surface forms" (`server/src/llm/prompt-builder.js`, `prompts/language/grading.txt`).
- Live before: [`results/butcher-it-1.json`](results/butcher-it-1.json), [`results/butcher-it-2.json`](results/butcher-it-2.json),
  [`results/butcher-es-1.json`](results/butcher-es-1.json). After: [`results/verify-cli-it-after.json`](results/verify-cli-it-after.json),
  [`results/after-butcher-it-1.json`](results/after-butcher-it-1.json), [`results/after-butcher-it-2.json`](results/after-butcher-it-2.json),
  [`results/after-butcher-es-1.json`](results/after-butcher-es-1.json).
- Design and critique: [architecture.md](architecture.md) (Amendment), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

Shown: codex-cli, one scripted line sequence per language (3 runs before and 3 after the fix), Gerald's authored
verify cases in Italian, the fixture grader in-process. Not shown: claude-cli, free-form answers, Spanish
`verify:cli` after the rubric change, the app in the iOS Simulator, the reference URLs, or teaching quality as a
learner or the owner would judge it.

## Open items

1. Owner, content review: Mortimer's character sheet, both butcher encounters and vocabulary files, the reference
   URLs; the dropped Italian `due` entry (an English word; "due etti" passes through *etti*).
2. Owner, teaching choice: after a wrong request Mortimer lists the passing meats ("Vuoi salame, salsiccia o
   pollo?"), 3/3 after runs. Allowed by the current style rule (his own question); a narration rule could forbid
   listing an open objective's answers.
3. Owner, Simulator: play Mortimer in the app (no app changes in this round).
4. Optional: `verify:cli` in Spanish and with claude-cli after the rubric change (backlog D1).
