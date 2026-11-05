# Autonomous run state

The 72-hour autonomous run on branch `autonomous` (started 2026-11-05). Each iteration reads this file after
[STATUS.md](../../STATUS.md), takes the next unfinished item, runs it as a round (`docs/rounds/NNN/`, round-log
skill), and updates this file before stopping. Decisions an owner would normally make are logged in
[decisions.md](decisions.md) as autonomous decisions pending owner review.

## In progress

- Nothing. Next: **A2** (multi-encounter engine), then B1 with the dictated-answer rule (see Handoff).

## Backlog

Priority order. Each item is sized for one round; tick it when its round closes.

### A. prototype.md Phase 3: World & Navigation (app-first, with the server)

- [x] **A1. Map and navigation.** (round 005, closed 2026-11-05) Crumbling Market locations and connections in YAML (6 nodes, prototype.md §8.2),
  a world API (current location, move to an adjacent node, fog of war over unvisited nodes), world progress in the
  learner save, and a Map screen in `mobile/` from which the Coffee Cart opens Gerald's encounter.
- [ ] **A2. Multi-encounter engine.** Generalise `LearningService` from one hard-wired encounter to encounters keyed
  by location (per-encounter vocabulary, character, objectives), with Gerald unchanged in behaviour.
- [ ] **A3. Market Entrance tutorial.** The companion introduces the mechanics (greetings, pronouns), Italian and
  Spanish packs.
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

- [ ] **B1. Tone layer.** Update `content/narration/style_guide.yaml` and Gerald's character sheet with the
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
- [ ] **D2.** Grader caps echoed phrases at quality 2 (round 003 item 4): measure, then decide on the prompt.
- [ ] **D3.** Show vocabulary notes; the Spellbook meaning leak from round 001 (round 003 item 5).
- [ ] **D4.** `expo-doctor` 19/20 since 2026-11-05: wants expo ~58.0.23 and react-native-safe-area-context ~5.11.1
  (new upstream releases; nothing in the repo changed). `npx expo install --fix` in `mobile/`, then re-run jest,
  expo-doctor and the iOS export. Simulator check of the update goes to "Needs owner".

## Needs owner

- Play the app in the iOS Simulator (round 004 open item 1), and every Simulator check listed in later rounds'
  open items.
- Review the Italian content (round 003 item 1) and any content added by autonomous rounds.
- Review every row in [decisions.md](decisions.md).
- Round 005: check the map in the Simulator (layout, labels, taps, Spellbook return), and review the six location
  descriptions in `content/world/locations/` ([open items](../rounds/005/findings.md#open-items)).

## Progress

- 2026-11-05, iteration 1: created this file and `decisions.md`; baseline tests green (server 65/65, mobile 15/15,
  client 12/12). Round 005 (A1) built and closed: map, world API, save v2, PARALLANG_TOKEN, `play-market.js`;
  server 73/73, mobile 18/18, client 12/12; live codex-cli map playthrough resolved, `verify:cli` 9/9.

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
- Encounter start is still location-agnostic on the server (frozen web client); A2 should add location-keyed
  encounter start for the app while keeping `/api/encounter/start` working for the web client.
- `LearningService` hard-wires one encounter (`this.content.encounter`, `this.content.character`, the vocabulary
  file name `gerald_coffee.yaml` in `content-loader.js`); the world loader insists exactly one location holds it.
  A2 must relax that check.
- Saves are schema 2 (`world` block). In-memory encounters are lost on server restart (by design since round 001).
- The map's node positions fall back to a 320-point square until `onLayout` fires (jest never fires it).
