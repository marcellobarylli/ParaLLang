# Autonomous run state

The 72-hour autonomous run on branch `autonomous` (started 2026-11-05). Each iteration reads this file after
[STATUS.md](../../STATUS.md), takes the next unfinished item, runs it as a round (`docs/rounds/NNN/`, round-log
skill), and updates this file before stopping. Decisions an owner would normally make are logged in
[decisions.md](decisions.md) as autonomous decisions pending owner review.

## In progress

- Nothing. Next: **A4** (The Butcher's Stall, content only; see the "Adding an encounter" note below), or the
  small **E1** if a round needs a warm-up.

## Backlog

Priority order. Each item is sized for one round; tick it when its round closes.

### A. prototype.md Phase 3: World & Navigation (app-first, with the server)

- [x] **A1. Map and navigation.** (round 005, closed 2026-11-05) Crumbling Market locations and connections in YAML (6 nodes, prototype.md §8.2),
  a world API (current location, move to an adjacent node, fog of war over unvisited nodes), world progress in the
  learner save, and a Map screen in `mobile/` from which the Coffee Cart opens Gerald's encounter.
- [x] **A2. Multi-encounter engine.** (round 006, closed 2026-11-05) Generalise `LearningService` from one hard-wired encounter to encounters keyed
  by location (per-encounter vocabulary, character, objectives), with Gerald unchanged in behaviour.
- [x] **A3. Market Entrance tutorial.** (round 009, closed 2026-11-05) Portia the Archway (greet, introduce,
  ask back), companion briefing card, Italian and Spanish packs.
- [ ] **A4. The Butcher's Stall.** The Charcutier (meats, quantities, numbers).
- [ ] **A5. The Cracked Fountain.** A Letharger with riddles (time, directions, commands). Tie in the notes'
  Lethargers (attention, brainrot as a mild infohazard).
- [ ] **A6. The Old Bookshop.** Lore-heavy NPC with advanced passages (abstract nouns, reading).
- [ ] **A7. The Rift.** Mini-boss in corrupted mixed language, reviewing all learned vocabulary; gated on the
  other encounters.
- [ ] **A8. Party system.** Save defeated (saveable) enemies, revisit conversations with party members.
- [ ] **A9. Lore fragments.** Optional hidden passages with advanced vocabulary (e.g. fragments of *The Journey*).
- [ ] **A10. LLM-enhanced location atmosphere** (optional; static YAML descriptions first).
- [ ] **A11. Save slots** (if still wanted after A1's save format).

### B. Content in line with the newer lore notes (do not edit `parallang_obsidian/`)

- [x] **B1. Tone layer.** (round 007, closed 2026-11-05) Update `content/narration/style_guide.yaml` and Gerald's character sheet with the
  Pratchett × meme-culture layer (GAME MECHANICS.md), and make sure the style guide actually reaches the prompt
  (`prompts/system/base.txt` does not use `styleGuide` today). Add the narration rule "never give the player the
  exact phrase to type": round 005 live data shows Gerald saying "Say: 'Senza latte, per favore.'", and the echo
  then scores quality 2 (also D2). Re-measure with `play-market.js`.
- [ ] **B2. Journathan.** Content presence for Journathan and *The Journey* (a lore fragment or a Bookshop tie-in).
- [ ] **B3. Infohazards.** Infohazard flavour in the Rift and Fountain content (LORE.md).

### C. prototype.md Phase 4: Polish & Audio

- [ ] **C1. Forced repetition.** Pre-encounter Spellbook drill before the Rift boss.
- [ ] **C2. Onboarding.** Philosophy statement screen before the tutorial.
- [ ] **C3. Visual polish.** Typography, palette, transitions in the app.
- [ ] **C4. Sound design.** Ambient and UI sounds (needs assets; check licensing).

### D. Open items from rounds 003 and 004 doable without the Simulator or the owner

- [ ] **D1.** `verify:cli` for `claude-cli` in Italian and for either provider in Spanish (round 003 item 3).
- [x] **D2.** Grader caps echoed phrases at quality 2 (round 003 item 4): explained by rounds 007–008 (the echoes
  were prompted; unprompted, the same answer scores 5).
- [ ] **D3.** Show vocabulary notes; the Spellbook meaning leak from round 001 (round 003 item 5).
- [x] **D5. Grader feedback dictates the answer** (round 008, closed 2026-11-05) (round 007 findings): after a partial order, `overall_feedback`
  (shown in the app's Assessment panel) said "Add “senza latte” to specify no milk." in 2/3 runs (1/3 baseline).
  Add a rule to `prompts/language/grading.txt` (feedback may name what is missing in English, never the
  target-language answer to an open objective); re-run `verify:cli` (verdicts must stay 9/9) and `play-market.js`
  3 times; feedback only, verdicts unchanged.
- [ ] **D4.** `expo-doctor` 19/20 since 2026-11-05: wants expo ~58.0.23 and react-native-safe-area-context ~5.11.1
  (new upstream releases; nothing in the repo changed). `npx expo install --fix` in `mobile/`, then re-run jest,
  expo-doctor and the iOS export. Simulator check of the update goes to "Needs owner".

### E. Follow-ups from live data

- [ ] **E1. Opening-line language share.** Round 009: first NPC lines carry 0.05–0.24 target language against
  0.20 requested (Gerald 0.19 vs 0.25). Measure over a few runs per encounter, then adjust the greeting template or
  language rules; keep the golden-prompt test in step (regenerate on purpose).
- [ ] **E2. Author the greetings Portia uses unprompted** (piacere, benvenuto; mucho gusto, bienvenido) so they get
  chips and Spellbook cards.

## Needs owner

- Play the app in the iOS Simulator (round 004 open item 1), and every Simulator check listed in later rounds'
  open items.
- Review the Italian content (round 003 item 1) and any content added by autonomous rounds.
- Review every row in [decisions.md](decisions.md).
- Round 005: check the map in the Simulator (layout, labels, taps, Spellbook return), and review the six location
  descriptions in `content/world/locations/` ([open items](../rounds/005/findings.md#open-items)).

- Round 009: check the Market Entrance tutorial in the Simulator (companion card, first screen at the top, later
  turns scroll), review Portia's content and reference URLs, and decide whether Portia may model "come ti chiami"
  before the ask-back objective ([open items](../rounds/009/findings.md#open-items)).

## Progress

- 2026-11-05, iteration 1: created this file and `decisions.md`; baseline tests green (server 65/65, mobile 15/15,
  client 12/12). Round 005 (A1) built and closed: map, world API, save v2, PARALLANG_TOKEN, `play-market.js`;
  server 73/73, mobile 18/18, client 12/12; live codex-cli map playthrough resolved, `verify:cli` 9/9.
- 2026-11-05, iteration 1: round 006 (A2) built and closed: multi-encounter engine; server 77/77, mobile 19/19,
  client 12/12; Gerald's prompts byte-identical (golden test); live playthrough resolved.
- 2026-11-05, iteration 1: round 007 (B1) built and closed: style guide in the prompt, no-dictation rule; live 3+3
  runs: dictation 3/3 → 0/3, echo quality 2 → 5. Grader feedback dictation found (D5).
- 2026-11-05, iteration 1: round 008 (D5) built and closed: grading-prompt feedback rule; verify:cli 9/9; 0/29
  feedback strings leak (3/7 and 3/6 before). Iteration 1 ends here (four rounds, 005–008).
- 2026-11-05, iteration 2: round 009 (A3) built and closed: Portia's tutorial at the Market Entrance, companion
  briefing, per-encounter narration matching; server 82/82, mobile 20/20, client 12/12; live tutorial 4/4 resolved
  (it ×3, es ×1), Gerald unchanged.

## Handoff notes and traps

- `server` has no `npm test` script: run `node --test server/test/*.test.js`.
- No iOS Simulator here: verify `mobile/` with `npm run test:mobile`, `npx expo-doctor` and
  `npx expo export --platform ios`.
- **Codex critique cannot read files here**: its bwrap sandbox fails inside Apptainer ("Can't bind mount /oldroot/"),
  so a plain `codex exec --sandbox read-only ...` reviews nothing. What worked (round 005, critique 2): tell Codex not
  to run commands, and pipe a bundle of `cat -n` copies of the plan and the relevant files on stdin
  (`codex exec --sandbox read-only -c model_reasoning_effort=high "<prompt>" < bundle.txt`). It takes ~7 minutes;
  record the bundle's file list and sha256 in the critique header.
- Live data: `node server/scripts/play-market.js --provider codex-cli --out <file>` (in-process, ~40 s, 5 calls)
  and `npm run verify:cli -- --provider codex-cli` (~2 min, 14 calls). Both passed in round 005.
- **Narration chips are per encounter since round 009**: `definition.narrationEntries` holds the whole vocabulary
  files that the encounter's objectives target. A new encounter's words only show in its own lines; to share a file
  (e.g. reviewing all words in the Rift, A7), target an entry of each file from an objective.
- **Spellbook `contentVersion`** (the aggregate) changes whenever a vocabulary file is added; cards use the per-file
  `entryVersion(id)`. Tests must not compare a card's version with `content.vocabulary.version`.
- `play-market.js --location market_entrance` plays the tutorial (7 calls, ~50 s); add a script entry in its
  `scripts` table for each new encounter.
- The web client's tests: `npm exec --workspace client -- vitest run` (no `npm test` script in `client/`).
- **Adding an encounter (A3–A7)** is content only since round 006: a character file in
  `content/characters/enemies/`, then **in every language pack** (`it` and `es`) an `encounters/<id>.yaml` whose
  `location` names the place and a `vocabulary/<file>.yaml` (own `version`, ids unique across the pack), and set the
  location's `encounter:` in `content/world/locations/`. The world is shared, so a location naming an encounter
  that one pack lacks stops that pack from loading. `server/test/encounters.test.js` shows a minimal example
  (Bernard the Charcutier fixture). The fixture `FixtureProvider` grader in `server/test/helpers.js` only knows
  Gerald's objectives; new encounters need their own test grader (see `TwoEncounterProvider`).
- `/api/encounter/start` without `encounterId` starts the pack's `default_encounter` anywhere (web client); with one,
  the player must be at its location (409 `NOT_HERE`). One active session per learner.
- Gerald's rendered narration prompts are pinned by `server/test/fixtures/gerald-prompts-r007.json` (test in
  `server/test/encounters.test.js`). A round that changes the narration prompt on purpose regenerates it (the
  generator is ~20 lines: `buildNarrationMessages` for `it`/`es`, greeting and one turn; see the test's arguments) and
  says so in its record.
- The style guide is filled into `prompts/system/base.txt` (STYLE block) since round 007; edit content there, not
  the template.
- Live A/B pattern that worked (round 007): 3 `play-market.js` runs on HEAD before building, 3 after, classify the
  saved lines by reading them; ~35 s and 5 calls per run.
- Saves are schema 2 (`world` block). In-memory encounters are lost on server restart (by design since round 001).
- The map's node positions fall back to a 320-point square until `onLayout` fires (jest never fires it).
