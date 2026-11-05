# Round 013 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** [`prototype.md`](../../../prototype.md) §8.2 node 5 ("Lore-heavy NPC, advanced text passages",
  abstract nouns, reading comprehension); Journathan and *The Journey* in `parallang_obsidian/CHARACTERS.md`;
  backlog A6 and B2 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); rounds [006](../006/architecture.md),
  [010](../010/architecture.md), [011](../011/architecture.md), [012](../012/architecture.md).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `content/` (character, two encounters, two vocabulary files, the location),
  `server/scripts/play-market.js` (a script entry), tests.

## Goal (pre-run)

The Old Bookshop gets its encounter, a lore-heavy NPC with reading passages, in the Italian and Spanish packs, as
content only, and the passages are the first in-game fragments of *The Journey* and its hero Journathan. The other
four encounters play as before; the frozen web client is unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Marginalia the Bookworm:** a sofa-sized, bespectacled bookworm who has eaten most of the stock, annotates
   everything, and sells a book only to someone who understood a passage of it. Lore in her quirks: *The Journey* is
   named after Journathan or he after it (nobody remembers; the story may have written the hero); he is the man of
   many tongues, one of the first bilinguals; he cannot stand "it's about the journey, not the destination". Meme
   layer in her English: no spoilers, tl;dr, reading-comprehension ratings. Difficulty 3, `base_target_ratio` 0.35,
   +0.05 per turn, saveable.
2. **Two reading-comprehension objectives**, each passage authored in the objective's `intent`, which tells her to
   read it aloud word for word before asking (critique 1.3):
   - `home`: it "Questa è la storia di Journathan, l'uomo dalle molte lingue. Il suo viaggio verso casa dura
     vent'anni."; es "Esta es la historia de Journathan, el hombre de muchas lenguas. Su viaje a casa dura veinte
     años." Where is he going? Required [casa].
   - `name` (the Cyclops, the first recorded translation trick): it "Il Ciclope chiede il suo nome. Journathan
     risponde: «Il mio nome è Nessuno.»"; es "El Cíclope le pregunta su nombre. Journathan responde: «Mi nombre es
     Nadie.»" What name did he give? Required it [nessuno], es [nadie].
3. **Grading in a reading context** (critiques 1.2, 1.4): a grammar constraint says an answer about Journathan in the
   third person or as reported speech, reusing the passage's words or quoting the relevant part, is the player's own
   answer; another detail, an unrelated quotation, English-only answers and questions do not pass. "Ha detto
   «Nessuno»." / "Dijo «Nadie»." are accepted examples. No blanket rule against reciting a sentence.
4. **Vocabulary:** it storia, viaggio, casa, lingua, anni, nome, nessuno (7); es historia, viaje, casa, lengua,
   nombre, nadie (6). Not authored: es `años` (the matcher folds accents unconditionally, so "anos" would match it;
   critique 1.1), it `venti` (English "venti").
5. **No companion briefing**, no gate (the Rift gate is A7).
6. **Reference URLs** as rounds 009–011 (Treccani, RAE; not opened from the container).
7. **Second opinion:** see the table.

## Claim boundary (pre-run)

The round can claim the encounter loads and plays in both packs in-process (fixture grader) and live as reported,
including whether she read the passages and the live verdicts on the scripted negatives and the reported-speech
answer. It cannot claim teaching quality as judged by a learner or the owner, the quality of the authored passages,
that the reference URLs resolve, or anything in the iOS Simulator.

## Deferred (pre-run)

Lore fragments as optional discoverable items (A9), the party (A8), infohazard passages (B3), Simulator checks.

## Design (pre-run)

- `content/characters/enemies/bookworm_marginalia.yaml`; `content/world/locations/old_bookshop.yaml`
  `encounter: old_bookshop_bookworm`; per pack `encounters/old_bookshop_bookworm.yaml` and
  `vocabulary/bookshop_journey.yaml` (`bookshop-journey-<code>-v1`).
- `resolved_message`: "Marginalia annotates you as 'promising', sells you a battered copy of The Journey, and goes
  back to eating the poetry section."
- `play-market.js`: an `old_bookshop` script, negatives first: it "Un libro.", "Home.", "A casa!", "Journathan.",
  "Nessuno!"; es the same with "¡A casa!", "¡Nadie!". The second Italian run uses `--lines` with "Ha detto
  «Nessuno»." as the last line (critique 1.2).

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 5603360c…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `accent_insensitive: false` is ignored: the matcher folds accents always, so es `años` would match "anos" | − | Accept: drop es `años` | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.2 | Error | The grader rejects third-person attribution; "Ha detto «Nessuno»." would fail | 0 | Accept: reading-context exception; a reported-speech live line | **Accepted** (autonomous, pending owner review) | Decision 3, Design |
| 1.3 | Error | The passage in the prompt does not mean she reads it | 0 | Accept: intents say read first, then ask; the live check looks for it | **Accepted** (autonomous, pending owner review) | Decision 2, Tests |
| 1.4 | Cut | A blanket ban on reciting a sentence rejects a relevant quoted answer | − | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.5 | Cut | Mobile and web suites and build for a content-only change | − | Reject: the run brief requires every suite before a non-wip commit | **Rejected** (autonomous, pending owner review) | Tests |

Net change from plan v1: −1 Spanish entry, −1 constraint (blanket recitation ban), the grading constraint reworded,
+1 accepted example per pack, the reading instruction in each intent, one Italian line changed in run 2.

## Tests (pre-run)

1. `node --test server/test/*.test.js`: existing tests updated for five encounters per pack and the combined version
   with `bookshop-journey-<code>-v1`. New `server/test/bookshop.test.js`: in both packs a player walks there (three
   moves) and plays with a test grader (a book, English and the real name fail; home and Nobody pass) to resolution;
   the map marks it complete; her line gets chips only from her own file; both passages reach the narration prompt.
2. `npm run test:mobile`; web client tests and build.
3. Live, codex-cli: `play-market.js --location old_bookshop` in Italian (scripted), in Italian with `--lines` ending
   "Ha detto «Nessuno»." and once in Spanish. Findings: whether she reads each passage before asking (required),
   the verdict on each line, resolution, share, menus and dictation, feedback leaks.

## Amendment 2026-11-05: she reads the first passage in her greeting (autonomous, after the first live runs)

**Why.** In 3/3 first runs Marginalia's greeting only introduced the shop ("I sell books to people who understand
them. No spoilers: there will be a reading check.") and read the first passage only after the player's first
answer, so the first turn had nothing to answer and the app's objective ("Marginalia reads you the opening…") was
untrue at that point. The greeting template asks for a concise introduction, which outweighed the intent.

**Change.** Content only: the `home` intent now says she reads the passage "in her greeting, right after introducing
herself". The greeting template is unchanged (it would change Gerald's pinned prompts and every encounter). Re-run
the three live runs.

**Decision.** Autonomous, pending owner review: content rather than the shared template, because only this
encounter needs a passage up front.

## Outcome (2026-11-05)

Built as designed, plus the Amendment. In the first three live runs Marginalia read each passage before its question
and every line was graded as intended, but her greeting never read the first passage (3/3). With the reading moved
into the greeting by content, the after runs read it up front 3/3 and resolved 3/3, with 15/15 lines graded as
intended, the reported-speech answer "Ha detto «Nessuno»." included. Tests: server 90/90, mobile 20/20, web client
12/12 and build. Journathan, *The Journey* and the Cyclops trick are now in the game (backlog B2). See
[findings](findings.md).
