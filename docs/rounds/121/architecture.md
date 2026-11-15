# Round 121 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-15 from the owner's request in round 119, not
through the round pipeline. Sections marked *pre-run* must not be edited after the commit that holds them. Changes
go into dated Amendments; results go into the dated Outcome section, added later. The full record (the interview,
the draft as Codex read it, the raw critique, the timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** round 119's [interview](../119/trail/interview.md) (Q2, Q4, Q5) and
  [architecture](../119/architecture.md) (the map and its seal); `parallang.md`, "Leveling Up and World Scaling";
  `prototype.md` (`progression.js`: XP, level, unlocked areas); round [029](../029/architecture.md) (the forced
  review before the Rift, which the dungeon does not have); [`docs/handoff.md`](../../handoff.md).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `server/src/` (language engine, learning service, dungeon rules, storage), `content/world/dungeons/`,
  `client/src/` (store, screen), the tests and `docs/rounds/121/shots/`.

## Goal (pre-run)

The player earns experience and levels in the web client's dungeon. A level opens sealed places and raises how much
of the target language the characters speak.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md), which copies round 119's answers:

- **Leveling:** "Unlock places and raise difficulty" (round 119, Q2). Offered: levels unlock places; unlock places
  and raise difficulty; shown only. The chosen option's text: XP for each objective met, each encounter cleared and
  each Spellbook review. A level opens sealed sites, as in the owner's notes. Errata's seal becomes a level
  requirement plus the encounters before it. The top bar shows level and XP. Each level also raises how much of the
  target language the characters speak, so a replay at a higher level is harder.
- **The owner's note** (`parallang.md`): "In the beginning, the only unlocked levels are boulangerie, boutique, etc.
  As you level up, you gain access to places like bibliotheque, university".
- **Order:** one round per feature, each deployed (round 119, Q4).
- **Autonomy:** the owner is away and said to run on the most reasonable assumption (round 119, Q5). Every number
  below is Claude's, and so is every disposition of the critique.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 65b15faa…; Codex, effort high; raw text in
[`trail/critique-1.md`](trail/critique-1.md). The owner was away, so every disposition is Claude's.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error, critical | The client walks by its cached map. XP from a party conversation or a review would reach level 5 while the map still called the Sanctuary sealed, and an older map reply could put older XP back | 0 | Accept: a reply that raises the level reads the map again, and XP in the store never goes down within a session with one learner | **Accepted** by Claude; the owner was away | Client, store |
| 1.2 | Error, high | A complete run stays open for moves (round 119), but the map's gates are computed apart, so a finished run from before this round (0 XP) would show its open sites as sealed by level | 0 | Accept: in a complete run no gate is sealed, on the map as for moves | **Accepted** by Claude; the owner was away | Server, rules |
| 1.3 | Error, high | "Opens at level 6" on world places that stay closed in this round is a promise the round cannot keep | − | Accept, and cut further: the world file gets no levels. A place gets its level with its dungeon | **Accepted** by Claude; the owner was away | Deferred |
| 1.4 | Error, medium | The draft said the player sees the Library sealed until Flick is answered. By way of Mortimer the player is level 3 before Flick | 0 | Accept: the sentence is narrowed | **Accepted** by Claude; the owner was away | Levels open places |
| 1.5 | Cut, high | `progression` stored in a receipt would be replayed stale | − | Accept: receipts hold `xpGained` (what that attempt earned) and not `progression`, which a replay takes from the save as it does the Spellbook | **Accepted** by Claude; the owner was away | Server, XP |
| 1.6 | Cut, medium | A second cap on the ratio (0.85) beside the existing one (1), which would also lower today's late turns | − | Accept: the bonus is added to the base and the existing cap applies | **Accepted** by Claude; the owner was away | Levels raise difficulty |
| 1.7 | Cut, medium | A new module for two calculations | − | Accept: they go into `language-engine.js`, the award sizes beside the commits | **Accepted** by Claude; the owner was away | Server, XP |

**Deferred:** none (Codex listed no Optional items).

Net change against draft 1: three corrections, one narrowed sentence, three parts removed (levels on the world
map, the second cap, the new module) and progression out of the receipts.

## Design (pre-run)

### What exists

- No XP and no level anywhere in the code.
- **Difficulty:** `ratioFor(turns, definition)` in `server/src/learning-service.js` is
  `min(1, base_target_ratio + target_ratio_increase_per_turn × turns)` (`calculateTargetRatio`). It feeds the
  narration prompt and the encounter's `difficulty`, which the dialogue sheet shows as "Italian target: 25%".
- **A turn's commit** (`submitDialogue`): the objectives the turn closes (`closing`) and `resolved` are known, and
  one save writes the turn with its receipt. A replayed attempt returns the receipt; `forReceipt` leaves the
  Spellbook out and `replay` adds the current one.
- **A review's commit** (`submitReview`): `result.correct` and `scheduleChanged` (true for a due card outside
  practice) are known; one save with a receipt.
- **The seal** (`server/src/dungeon.js`): `gateFor(site, run)` is sealed until every site in `requires` is cleared;
  `moveProblem` answers `SEALED` and lets a complete run through; the map view sends
  `gate: { sealed, required, completed }`.
- Objectives per site encounter in the Italian pack: Portia 3, Mortimer 2, Gerald 2, Flick 4, Marginalia 2,
  Bambieshart 2, Errata 3.

### Experience and levels (server)

- The save gains `progression: { xp }` (a whole number; 0 for a save without it or with an invalid one). The schema
  version stays 3.
- XP is awarded inside the commit that already exists, so a replayed attempt awards nothing twice:
  - 10 for each objective a turn closes (a held pass closes nothing and earns nothing);
  - 25 for a conversation that resolves (a site's or a party member's);
  - 5 for a correct review that changes the schedule (a due card, not practice, not a revealed answer).
- The level is derived, never stored: level L starts at `10 × (L − 1) × (L + 4)` XP. Levels 1 to 6 start at 0, 60,
  140, 240, 360, 500. `levelFor(xp)` and `progressionView(xp)` = `{ xp, level, levelStartsAt, nextLevelAt }` live in
  `language-engine.js` (finding 1.7).
- `progression` is sent with the dungeon map (the read, the move and the reset replies) and with the dialogue and
  review replies, which also carry `xpGained`. A receipt holds `xpGained` and not `progression`; a replay takes the
  progression from the save (finding 1.5).

### Levels open places

- A dungeon site may carry `requires_level`. The seal becomes: every site in `requires` is cleared and the player's
  level is at least `requires_level`. `gateFor(site, run, level)` returns
  `{ sealed, required, completed, level: { required, current } }` (the `level` part only when the site asks for
  one), and `moveProblem` and `siteStates` take the level. In a complete run no gate is sealed, on the map as for
  moves (finding 1.2).
- `ta_prohm.yaml`: The Library gets `requires_level: 3` (the owner's "bibliotheque"). The Sanctuary keeps its six
  sites and gets `requires_level: 5`.
- **What that asks of a player.** The six sites before the Sanctuary give 300 XP (15 objectives and 6 resolves),
  which is level 4. Level 5 needs 60 more. A conversation with two objectives gives 45, whether with a party member
  or again with a cleared site's character, and a correct due review gives 5. So the Sanctuary asks for one or two
  conversations more than the six, or one and a few reviews. This takes the place of the forced review before Errata
  that the market has (`drill_before`, round 029) and the dungeon does not (round 114).
- The Library's level 3 (140 XP) is met by the sites on any way to it. A player who comes by Gerald alone (Portia 55,
  Gerald 45) sees it sealed from the Sunlit Court and open once Flick is answered (65 more). A player who also
  answered Mortimer is level 3 before reaching Flick (finding 1.4).
- The `SEALED` message names what is missing: "The Sanctuary is sealed. It opens at level 5 (you are level 4)." when
  only the level is short, the existing sentence when sites are missing, both when both.

### Levels raise difficulty

- A conversation's base target ratio gains `0.03 × (level − 1)`, with the level taken when the conversation starts
  and kept for its length (the session records `ratioBonus`). The existing calculation and its cap of 1 apply to
  the sum (finding 1.6).
- A new run after "Play again" keeps XP and level, so the second run speaks more of the target language.
- Greetings prefetched for the market map (round 076, off by default) keep the base ratio.

### Client

- **Store:** `progression` from the map view and from each dialogue and review reply, and `xpGained` of the last
  reply. XP in the store never goes down while the learner and the server stay the same, so an older reply cannot
  put older XP back. A reply that raises the level reads the map again, because a seal may have opened
  (finding 1.1).
- **Top bar:** "Lv 3" and a thin bar from `levelStartsAt` to `nextLevelAt`. With a server that sends no
  `progression` (an older one) the top bar shows neither.
- **Assessment banner:** "+35 XP" after a turn that earned some, and "Level 4" when the reply's level is above the
  one before it. The review result shows "+5 XP".
- **Seals:** the map card, the ways on and the site card say "opens at level 5 (you are level 4)" for a site whose
  level is short, beside or in place of "sealed: n of 6 cleared".

## Claim boundary (pre-run)

Checked with a fixture provider and headless Chromium. The higher target ratio is a number in the narration prompt:
what the live model does with 0.34 in place of 0.25 is not measured in this round. Nothing runs on an iPhone. The
numbers (the awards, the level curve, levels 3 and 5, 0.03 per level) are Claude's first choice and are not tuned
by play.

## Deferred (pre-run)

- Levels on the world map's places. A place gets its level with its dungeon (finding 1.3).
- Levels in the iPhone app and on the market's map.
- XP for anything else (help not used, streaks, first-try passes).
- Real characters at the sites (the next round).

## Tests (pre-run)

- **Language engine** (`server`, pure): the level boundaries and `progressionView`.
- **Storage:** a save without `progression` and one with an invalid one read as 0 XP.
- **Rules** (`dungeon-rules.test.js`): the Library sealed at level 2 and open at level 3; the Sanctuary sealed with
  six sites and level 4, open with level 5; in a complete run no gate is sealed, also at level 1.
- **Server:** XP for a closed objective, a resolve, a held pass (none), a replayed attempt (none again, and the
  replay carries the current progression), a due correct review, a wrong one, a revealed one and a practice one
  (none); a party conversation earns; the ratio at levels 1 and 3, fixed for a conversation that crosses a level;
  the `SEALED` message for a short level.
- **Store, screen** (mocked): the level and bar, "+N XP", "Level N", the level seal's wording, the map read again
  when a party conversation or a review raises the level, an older map reply that does not lower XP, an older
  server.
- **Contract** (`web-client.test.js`): the store's progression follows the real server through a site and a review.
- **Playthrough** (`client/scripts/dungeon-shots.mjs`, in a Slurm job): the script answers the six sites, sees the
  Sanctuary sealed for its level, earns the rest by a party conversation and reviews, and enters. Pictures of the
  top bar, a level-up and the level seal.
- Every existing suite passes: root `npm test` (in a Slurm job) and `npm run build -w client`.

## Ship (pre-run)

The work is on the branch `round-121-levels`. The round ends with a merge to `main`, which deploys the client and
the server (round 119, Q4). The Render deploy wipes every save on the free plan.

## Amendment 2026-11-15: fixes from Codex review 1 (Claude, after the build)

A post-build review by Codex read `git diff 29f7271..d95b03d -- client server content` and returned six findings;
the raw text is in [`trail/review-1.md`](trail/review-1.md). All six were real and are fixed. The owner was away, so
every disposition is Claude's. Each fix has a test that fails on the code as reviewed, except R1.4, which the
playthrough checks.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error, high | The ratio bonus was applied in the shared session start, so the iPhone app's market conversations also grew harder with XP the app does not show | − | Accept, more narrowly than Codex's fix: the bonus applies to a dungeon site's conversation only. A party member's conversation has no dungeon mark and keeps the content's ratio | **Accepted** by Claude; the owner was away | `learning-service.js` (`openSession`); `progression.test.js` |
| R1.2 | Error, high | A page of rounds 119 or 120 kept open across the deploy shows "sealed: 6 of 6 cleared" with no reason, and its cached map never opens the Sanctuary | + | Accept the error with another fix. Codex's keeps site-only seals for old pages for good. Instead the dungeon's routes ask for the client's contract (`client=121` on the map read, a move, a reset and a site start), and an older page is told to reload, the answer round 119 gave pages before it | **Accepted in part** by Claude; the owner was away | `server/src/errors.js`, `app.js`, `routes/encounter.js`, `client/src/api/encounter.js`; `dungeon.test.js` |
| R1.3 | Error, medium | A review's reply that arrived after new settings had loaded another learner put the old learner's XP into the store, where the never-goes-down rule then kept it | 0 | Accept: a review's reply is dropped after new settings or another learner | **Accepted** by Claude; the owner was away | `gameStore.js` (`submitReview`, `revealReviewAnswer`); `dungeon-flow.test.js` |
| R1.4 | Error, medium | Between 561 and about 700 px the level chip joined the one-row top bar and the title's text ran over it | 0 | Accept: the compact top bar holds up to 720 px, and the playthrough measures the title's text at 600, 720, 760 and 1024 px | **Accepted** by Claude; the owner was away | `index.css`; `dungeon-shots.mjs` |
| R1.5 | Error, low | A save edited to hold 1e308 XP passed as an integer and sent `levelFor` into an endless loop, which would stop the server for every learner | 0 | Accept: only a safe integer is XP, and the level is solved in closed form | **Accepted** by Claude; the owner was away | `learning-storage.js`, `language-engine.js`; `progression.test.js` |
| R1.6 | Error, low | The ratio test read the greeting's prompt and then only the shown difficulty, so a bonus missing from later prompts would pass | 0 | Accept: the test reads the prompt of a later turn, and of a turn in a conversation that crosses a level | **Accepted** by Claude; the owner was away | `progression.test.js` |

**Deferred:** none. Codex found no defect in the XP commits, the receipts and replays, help reveals, the seal's
message, the gates, moves and old saves, or the new client against round 120's server, and no state in which the
player is sealed out of the Sanctuary with no way to earn the rest.

R1.1 changes the Design's "Levels raise difficulty": the bonus is a dungeon site conversation's. R1.2 adds to the
Design's Server part: the client contract.

## Outcome (2026-11-15)

Built as designed, with the Amendment above. The player earns XP for objectives, finished conversations and due
reviews; the level is derived; The Library opens at level 3 and The Sanctuary at level 5 besides its six sites; a
dungeon site's conversation gains 0.03 of target ratio per level above the first. Against the Design, the bonus is
the dungeon sites' alone (review R1.1) and the dungeon's routes ask for the client's contract (review R1.2). Every
suite passes (server 436, client 119, aesthetic 20, mobile 320), and the built client plays the seven sites, meets
the level seal and passes it in headless Chromium at 390×844 and 1440×900 with a fixture provider. The claim
boundary held: nothing was played against the live model, and no phone was used. See
[`findings.md`](findings.md) and [`shots/`](shots/).
