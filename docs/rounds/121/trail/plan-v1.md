# Round 121 plan, draft 1: levels in the dungeon

For a Codex critique before the build. The repository is ParaLLang, with rounds 119 (the dungeon's map) and 120 (the
party) merged. Read `docs/rounds/119/architecture.md` for the map and its seal, and `docs/handoff.md`.

## Goal

The player earns experience and levels in the web client's dungeon. A level opens sealed places and raises how much
of the target language the characters speak.

## Owner decisions

- Round 119, Q2: "Unlock places and raise difficulty". The option's text: XP for each objective met, each encounter
  cleared and each Spellbook review. A level opens sealed sites, as in the owner's notes. Errata's seal becomes a
  level requirement plus the encounters before it. The top bar shows level and XP. Each level also raises how much
  of the target language the characters speak, so a replay at a higher level is harder (the owner's NG+ note).
- The owner's note (`parallang.md`, "Leveling Up and World Scaling"): "In the beginning, the only unlocked levels
  are boulangerie, boutique, etc. As you level up, you gain access to places like bibliotheque, university".
- One round per feature, each deployed (round 119, Q4). The owner is away and said to run on the most reasonable
  assumption (round 119, Q5): Claude decides this round's numbers and the critique's findings, and reports them.

Every number below is Claude's.

## What exists

- No XP and no level anywhere in the code. `prototype.md` names `progression.js` ("XP, level, unlocked areas").
- **Difficulty:** `ratioFor(turns, definition)` in `server/src/learning-service.js` is
  `min(1, base_target_ratio + target_ratio_increase_per_turn × turns)`. It feeds the narration prompt
  (`targetRatio`) and the encounter's `difficulty`, which the dialogue sheet shows as "Italian target: 25%".
- **A turn's commit** (`submitDialogue`): the passed objectives of the turn are known (`nextPassedIds`), `resolved`
  is known, and one save writes the turn with its receipt. A replayed attempt returns the receipt.
- **A review's commit** (`submitReview`): `result.correct` and `scheduleChanged` (true for a due card outside
  practice) are known; one save with a receipt.
- **The seal** (`server/src/dungeon.js`): `gateFor(site, run)` is sealed until every site in `requires` is cleared;
  `moveProblem` answers `SEALED`; the map view sends `gate: { sealed, required, completed }`.
- **The world file** (`content/world/atlas.yaml`, client only): three places are closed with a line each.
- Objectives per site encounter in the Italian pack: Portia 3, Mortimer 2, Gerald 2, Flick 4, Marginalia 2,
  Bambieshart 2, Errata 3.

## Design

### Experience and levels (server)

- The save gains `progression: { xp }` (a whole number, 0 for a save without it; the schema version stays 3).
- XP is awarded inside the commit that already exists, so a replayed attempt awards nothing twice:
  - 10 for each objective the turn passes (a held pass earns nothing until it counts);
  - 25 for a conversation that resolves (a site's or a party member's);
  - 5 for a correct review that changes the schedule (a due card, not practice, not a revealed answer).
- The level is derived, never stored: level L starts at `10 × (L − 1) × (L + 4)` XP. Levels 1 to 6 start at 0, 60,
  140, 240, 360, 500.
- A pure module `server/src/progression.js`: `levelFor(xp)`, `progressionView(xp)` =
  `{ xp, level, levelStartsAt, nextLevelAt }`, and the three award sizes.
- `progression` is sent with the dungeon map (`GET /api/dungeons/:id/map`, and the move and reset replies), and with
  the dialogue and review replies, which also carry `xpGained` (0 on a replay's receipt as stored).

### Levels open places

- A dungeon site may carry `requires_level`. The seal becomes: every site in `requires` is cleared and the player's
  level is at least `requires_level`. `gateFor(site, run, level)` returns
  `{ sealed, required, completed, level: { required, current } }` (the `level` part only when the site asks for
  one), and `moveProblem` takes the level.
- `ta_prohm.yaml`: The Library gets `requires_level: 3` (the owner's "bibliotheque"). The Sanctuary keeps its six
  sites and gets `requires_level: 5`.
- What that asks of a player. The six sites before the Sanctuary give 300 XP (15 objectives and 6 resolves), which
  is level 4. Level 5 needs 60 more: twelve correct due reviews, or a party conversation and a few reviews. This
  takes the place of the forced review before Errata that the market has (`drill_before`, round 029) and the
  dungeon does not (round 114).
  The Library's level 3 (140 XP) is met by the sites on any way to it (Portia 55, Gerald 45, Flick 65): the player
  sees it sealed from the Sunlit Court and sees it open when Flick is answered.
- The `SEALED` message names what is missing: "The Sanctuary is sealed. It opens at level 5 (you are level 4)." when
  only the level is short, the existing sentence when sites are missing, both when both.
- The world file: each closed place gets `level` (Angkor Wat 6, Micromort Mountain 8, The Bone Dome 10), shown on
  the world map as "Opens at level 6" beside its closed line. The places stay closed in this round: none has a
  dungeon.

### Levels raise difficulty

- A conversation's target ratio gains `0.03 × (level − 1)`, with the level taken when the conversation starts and
  kept for its length (the session records `ratioBonus`). The sum is capped at 0.85.
  `ratioFor(turns, definition, bonus)`.
- A new run after "Play again" keeps XP and level, so the second run speaks more of the target language.
- Greetings prefetched for the market map (round 076, off by default) keep the base ratio.

### Client

- **Store:** `progression` from the map view and from each dialogue and review reply; `xpGained` of the last reply
  for the screen.
- **Top bar:** "Lv 3" and a thin bar from `levelStartsAt` to `nextLevelAt`, beside the pips. With a server that
  sends no `progression` (an older one) the top bar shows neither.
- **Assessment banner:** "+35 XP" after a turn that earned some; "Level 4" when the reply's level is above the one
  before it. The review result shows "+5 XP".
- **Seals:** the map card, the ways on and the site card say "opens at level 5 (you are level 4)" for a site whose
  level is short, beside or in place of "sealed: n of 6 cleared".
- **World map:** "Opens at level N" on a closed place.

## Tests

- **Progression** (`server`, pure): the level boundaries, `progressionView`, a save without `progression`, an
  invalid one.
- **Rules** (`dungeon-rules.test.js`): the Library sealed at level 2 and open at level 3; the Sanctuary sealed with
  six sites and level 4, open with level 5; a complete run stays open.
- **Server:** XP for an objective, a resolve, a held pass (none), a replayed attempt (none again), a due correct
  review, a wrong one, a revealed one and a practice one (none); a party conversation earns; the ratio bonus at
  levels 1, 3 and at the cap, fixed for a conversation that crosses a level; the `SEALED` message.
- **Store, screen** (mocked): the level and bar, "+N XP", "Level N", the level seal's wording, an older server.
- **Contract** (`web-client.test.js`): the store's progression follows the real server through a site and a review.
- **Playthrough:** the script answers the six sites, sees the Sanctuary sealed for its level, reviews due cards
  until level 5, and enters. Pictures of the top bar, a level-up and the level seal.
- Every existing suite passes.

## Claim boundary

Checked with a fixture provider and headless Chromium. The higher target ratio is a number in the narration prompt:
what the live model does with 0.34 in place of 0.25 is not measured in this round. Nothing runs on an iPhone.

## Deferred

- Levels in the iPhone app and on the market's map.
- Places that open at their level (they need dungeons).
- XP for anything else (help not used, streaks, first-try passes).

## Ship

The work is on the branch `round-121-levels`. The round ends with a merge to `main`, which deploys the client and
the server. The Render deploy wipes every save on the free plan.
