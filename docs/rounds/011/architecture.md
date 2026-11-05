# Round 011 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** [`prototype.md`](../../../prototype.md) §8.2 node 4 ("A Letharger trying to distract you with
  riddles", time, directions, commands); the Lethargers in `parallang_obsidian/CHARACTERS.md` and brainrot as a mild
  infohazard they farm (`LORE.md` Infohazards, `GAME MECHANICS.md`); backlog A5 in
  [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); rounds [006](../006/architecture.md),
  [009](../009/architecture.md), [010](../010/architecture.md).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `content/` (character, two encounters, two vocabulary files, the location),
  `server/scripts/play-market.js` (route and script), tests.

## Goal (pre-run)

The Cracked Fountain gets its encounter, a Letharger who distracts the player with riddles, in the Italian and Spanish
packs, as content only. Gerald, Portia and Mortimer play as before; the frozen web client is unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Flick the Letharger:** a teacup-sized, gnome-like creature that dances in the corner of your vision, throws tiny
   firecrackers, and is never where you look. It poses everything as a riddle and drops each halfway; it wants
   everything done later ("just one more", "five more minutes"), gets lost following whatever moved last, and hums a
   jingle that sticks: brainrot, which it farms (low harm, very high virulence). Infohazard flavour stays in the
   character sheet; mechanics and containment files are B3. Difficulty 2, `base_target_ratio` 0.3, +0.05 per turn,
   saveable.
2. **Three objectives, one per vocabulary focus:** `stop` (commands): tell it to stop or keep still (it fermati,
   fermo, basta; es quieto, basta); "look" (guarda / mira) is authored and does not pass. `direction`: it is lost;
   any of left, right, straight on passes (it destra, sinistra, dritto; es derecha, izquierda). `now` (time): insist
   on now (it adesso, ora; es ahora); later and tomorrow (dopo, domani; después, mañana) are authored and are
   negative examples.
3. **No telling the time** (numbers would need their own objective); left for later.
4. **English collisions** (round 010 trap, critique 1.1): not authored es `detente` (English détente), es `recto`
   (English recto, so Spanish has no "straight on"), es `para` (also "for"), es `ya`, es `derecho`.
5. **No companion briefing**, no gate (as round 010).
6. **Reference URLs** as rounds 009–010 (Treccani, RAE; not opened from the container).
7. **Second opinion:** see the table.

## Claim boundary (pre-run)

The round can claim: the encounter loads and plays in both packs in-process (fixture grader) and live as reported,
including the live verdicts on the scripted negatives. It cannot claim teaching quality as judged by a learner or the
owner, that the reference URLs resolve, that the brainrot flavour lands, or anything in the iOS Simulator.

## Deferred (pre-run)

Telling the time, infohazard mechanics (B3), the party (A8, Flick is saveable), a gate, Simulator checks.

## Design (pre-run)

- `content/characters/enemies/letharger_flick.yaml`; `content/world/locations/cracked_fountain.yaml`
  `encounter: cracked_fountain_letharger`.
- Per pack `encounters/cracked_fountain_letharger.yaml` and `vocabulary/fountain_riddles.yaml`
  (`fountain-riddles-it-v1`, `fountain-riddles-es-v1`). it (11 entries): fermati, fermo (fermo, ferma, fermi),
  basta, guarda, destra, sinistra, dritto (dritto, diritto), adesso, ora, dopo, domani. es (8 entries, critique 1.2):
  quieto (quieto, quieta, quietos), basta, mira, derecha, izquierda, ahora, despues (después, despues), manana
  (mañana, manana).
- `resolved_message`: "Flick holds still for almost a whole second, points the way you told it, and is gone before
  you can look straight at it. The fountain is quieter."
- `play-market.js`: an exported `route(world, from, to)` (shortest path over `world.neighbours`) replaces the single
  direct move, because the fountain is two moves from the start (critique 1.3 rejected: A6 and A7 are three and four
  moves away). A `cracked_fountain` script, negatives first: it "Guarda!", "Fermati!", "Left.", "A sinistra!",
  "Domani.", "No, adesso!"; es "¡Mira!", "¡Quieto!", "Left.", "¡A la izquierda!", "Mañana.", "¡No, ahora!".
- No engine or app changes.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 2cd897ec…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Spanish `detente` and `recto` are English words (détente, recto) and would be chipped | − | Accept | **Accepted** (autonomous, pending owner review) | Decision 4, Design |
| 1.2 | Error | The Spanish entry count (11) contradicts its list (10) | 0 | Accept: count corrected after 1.1 (8) | **Accepted** (autonomous, pending owner review) | Design |
| 1.3 | Cut | A general BFS route exceeds the need; hard-code the coffee cart hop | − | Reject: 13 lines, tested; the Bookshop and the Rift (A6, A7) need three and four moves | **Rejected** (autonomous, pending owner review) | Design |
| 1.4 | Cut | Mobile and web suites and build for a content-only change | − | Reject: the run brief requires every suite before a non-wip commit | **Rejected** (autonomous, pending owner review) | Tests |

Net change from plan v1: −2 Spanish entries (stop and direction groups narrower), the Spanish stop line "¡Quieto!".

## Tests (pre-run)

1. `node --test server/test/*.test.js`: existing tests updated for four encounters per pack and the combined version
   with `fountain-riddles-<code>-v1`. New `server/test/fountain.test.js`: `route` gives two moves to the fountain; in
   both packs a player walks there and plays with a test grader (look fails stop; stop passes; English direction
   fails; left passes; tomorrow fails now; now passes) to resolution; the map marks it complete; Flick's line gets
   chips only from its own file.
2. `npm run test:mobile`; web client tests and build (unchanged code).
3. Live, codex-cli: `play-market.js --location cracked_fountain` twice in Italian and once in Spanish. Findings: the
   verdict on each scripted line, resolution, share, dictation and answer listing (backlog E3), feedback leaks,
   representative lines.

## Amendment 2026-11-05: a surface-variant run (autonomous, after the first live runs)

**Why.** The three planned runs scripted only canonical forms (fermati, sinistra, adesso; quieto, izquierda, ahora),
which is the gap that hid round 010's rubric bug for nine rounds (STATE.md trap).

**Change.** `play-market.js` takes `--lines 'a|b|c'`, a one-off replacement for the scripted player lines, and one
more Italian run plays "Sempre diritto!" (the authored variant of `dritto`) in place of "A sinistra!". No content
change.

**Decision.** Autonomous, pending owner review: a flag rather than a second script table entry, so later rounds can
probe variants without editing the script.

## Outcome (2026-11-05)

Built as designed, plus the Amendment. Flick resolved in 4/4 live codex-cli runs (three Italian, one Spanish), and
every scripted line was graded as intended (24/24 assessments): "look", the English "Left." and "tomorrow" failed;
stop, a direction (including the variant "diritto") and now passed with evidence at quality 5. No feedback string
named a target form. Tests: server 88/88, mobile 20/20, web client 12/12 and build. Found: Flick offered both
directions as a choice once in Spanish (1/4), the answer-listing pattern of backlog E3. See [findings](findings.md).
