# Autonomous run state

The 72-hour autonomous run on branch `autonomous` (started 2026-11-05). Each iteration reads this file after
[STATUS.md](../../STATUS.md), takes the next unfinished item, runs it as a round (`docs/rounds/NNN/`, round-log
skill), and updates this file before stopping. Decisions an owner would normally make are logged in
[decisions.md](decisions.md) as autonomous decisions pending owner review.

## In progress

Nothing in progress: round 021 (A8a) is closed. Next, in order: **A8b** (revisit conversations with party members),
**B3**'s Fountain part (content, live runs), then **E1** as a template round (see its entry). Check Codex's limit
first (see traps).

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
- [x] **A4. The Butcher's Stall.** (round 010, closed 2026-11-05) Mortimer the Charcutier (name a meat that is not
  ham, a quantity with a unit); also fixed the grading rubric, which never showed surface forms.
- [x] **A5. The Cracked Fountain.** (round 011, closed 2026-11-05) Flick the Letharger (stop, a direction, now not
  later); brainrot flavour in the character sheet only. Telling the time deferred.
- [x] **A6. The Old Bookshop.** (round 013, closed 2026-11-05) Marginalia the Bookworm reads two passages of
  *The Journey* (home; the Cyclops name trick).
- [x] **A7a. The Rift gate.** (round 014, closed 2026-11-05) Sealed until the other five encounters are complete
  (`requires_completed`, `gate` in the snapshot, 409 `SEALED`, sealed node in the app); `play-market.js --tour`.
- [x] **A7b. The Rift boss.** (round 015, closed 2026-11-05) Mini-boss in corrupted mixed language, reviewing all learned vocabulary. Narration
  chips need an objective targeting an entry of each vocabulary file (see traps). `startEncounter` must refuse a
  sealed location (saves from rounds 005–013 may already stand in the Rift).
- [x] **A8a. Party recruitment.** (round 021, closed 2026-11-05) SAVE / LEAVE after a saveable NPC, party in the
  save (schema 3), `GET /api/party`, `POST /api/party/recruit`, map invitation, Party screen. Also fixed the start
  route dropping `encounterId`.
- [ ] **A8b. Party conversations.** Revisit conversations with party members (prototype.md §7 lists
  `save_to_party.txt`; a new prompt template, a free-conversation turn without objectives or with light ones, a
  relationship / conversation counter in the party member, a Talk button on the Party screen). Needs live runs: the
  share and tone of a member's lines, no answer leaks. Members hold `{ characterId, encounterId, joinedAt }` today;
  adding fields needs the validation in `learning-storage.js` (`validParty`) and maybe a schema bump.
- [ ] **A9. Lore fragments.** Optional hidden passages with advanced vocabulary (e.g. fragments of *The Journey*).
- [ ] **A10. LLM-enhanced location atmosphere** (optional; static YAML descriptions first).
- [ ] **A11. Save slots** (if still wanted after A1's save format).

### B. Content in line with the newer lore notes (do not edit `parallang_obsidian/`)

- [x] **B1. Tone layer.** (round 007, closed 2026-11-05) Update `content/narration/style_guide.yaml` and Gerald's character sheet with the
  Pratchett × meme-culture layer (GAME MECHANICS.md), and make sure the style guide actually reaches the prompt
  (`prompts/system/base.txt` does not use `styleGuide` today). Add the narration rule "never give the player the
  exact phrase to type": round 005 live data shows Gerald saying "Say: 'Senza latte, per favore.'", and the echo
  then scores quality 2 (also D2). Re-measure with `play-market.js`.
- [x] **B2. Journathan.** (round 013, closed 2026-11-05) Journathan and *The Journey* in Marginalia's sheet and
  passages. More fragments belong to A9.
- [ ] **B3. Infohazards.** Infohazard flavour in the Rift and Fountain content (LORE.md). The Rift part is done
  (round 015, Errata); the Fountain part is open.

### C. prototype.md Phase 4: Polish & Audio

- [ ] **C1. Forced repetition.** Pre-encounter Spellbook drill before the Rift boss.
- [ ] **C2. Onboarding.** Philosophy statement screen before the tutorial.
- [ ] **C3. Visual polish.** Typography, palette, transitions in the app.
- [ ] **C4. Sound design.** Ambient and UI sounds (needs assets; check licensing).

### D. Open items from rounds 003 and 004 doable without the Simulator or the owner

- [ ] **D1.** (claude-cli preflight accepts an OAuth token since round 018; still blocked: no token in the shell)
  `verify:cli` for `claude-cli` in Italian and for either provider in Spanish (round 003 item 3).
- [x] **D2.** Grader caps echoed phrases at quality 2 (round 003 item 4): explained by rounds 007–008 (the echoes
  were prompted; unprompted, the same answer scores 5).
- [x] **D3.** (round 017, closed 2026-11-05) Show vocabulary notes; the Spellbook meaning leak from round 001 (round 003 item 5).
- [x] **D5. Grader feedback dictates the answer** (round 008, closed 2026-11-05) (round 007 findings): after a partial order, `overall_feedback`
  (shown in the app's Assessment panel) said "Add “senza latte” to specify no milk." in 2/3 runs (1/3 baseline).
  Add a rule to `prompts/language/grading.txt` (feedback may name what is missing in English, never the
  target-language answer to an open objective); re-run `verify:cli` (verdicts must stay 9/9) and `play-market.js`
  3 times; feedback only, verdicts unchanged.
- [x] **D4.** (round 016, closed 2026-11-05) `expo-doctor` 19/20 since 2026-11-05: wants expo ~58.0.23 and react-native-safe-area-context ~5.11.1
  (new upstream releases; nothing in the repo changed; 3 packages out of date by round 014). `npx expo install --fix` in `mobile/`, then re-run jest,
  expo-doctor and the iOS export. Simulator check of the update goes to "Needs owner".

### E. Follow-ups from live data

- [ ] **E1. Opening-line language share.** Round 009: first NPC lines carry 0.05–0.24 target language against
  0.20 requested (Gerald 0.19 vs 0.25). Round 014's tour: only Portia is short (mean 0.11 vs 0.28, greeting 0.07 vs
  0.20); Gerald 0.26/0.30, Mortimer, Flick and Marginalia at or above. Start with Portia's character sheet or
  encounter (content), not the shared template. **Round 019:** ambient words did not raise it (lines 0.17 → 0.16,
  greeting 0.08 → 0.12 on 3 runs): the gap is the English around her one Italian formula. Next: a language-profile
  note or quirk that her formalities and remarks are in the target language; measure 3 it + 1 es as in round 019.
  **Round 020:** that quirk did not help either (lines 0.17, greeting 0.13) and was reverted. Content is exhausted;
  next is a template round: make "Target approximately N%" concrete (e.g. about K of every 10 words), regenerate
  Gerald's golden prompts on purpose, and measure with a full `--tour` (Mortimer, Flick, Marginalia overshoot today,
  so a stronger rule may push them further). Use `docs/rounds/020/results/compare.py` for the measures. Measure over a few runs per encounter, then adjust the greeting template or
  language rules; keep the golden-prompt test in step (regenerate on purpose).
- [x] **E3. NPCs list the answers.** (round 012, closed 2026-11-05) Style rule against menus of an open objective's
  targets; menus 4/4 → 0/4 runs. Portia's "Come ti chiami?" left allowed (pending owner review).
- [x] **E2. Author the greetings Portia uses unprompted** (round 019, closed 2026-11-05) as ambient vocabulary
  (`ambient_vocabulary_ids`): benvenuto, piacere, mercato; bienvenido, mucho gusto, mercado. Chipped in 12/12 lines.

## Needs owner

- **Round 021: re-check the app over HTTP.** Until round 021 the HTTP start route dropped `encounterId`, so the app
  started Gerald at every location (Simulator sessions since round 009 never met Portia, Mortimer, Flick, Marginalia
  or Errata). Check the SAVE / LEAVE card, the map invitation, the Party screen and the header's Party button
  ([open items](../rounds/021/findings.md#open-items)).

- **Expose `CLAUDE_CODE_OAUTH_TOKEN` to the agent's shell** (round 018). The game's claude-cli preflight now accepts
  the subscription token (supervisor note), but the iteration's Bash shell does not carry it (only the agent's parent
  process does), so `claude -p` says "Not logged in" and claude-cli live runs still fail. The agent does not copy it
  out of another process. Until then Codex's usage limit stops all live data.

- Play the app in the iOS Simulator (round 004 open item 1), and every Simulator check listed in later rounds'
  open items.
- Review the Italian content (round 003 item 1) and any content added by autonomous rounds.
- Review every row in [decisions.md](decisions.md).
- Round 005: check the map in the Simulator (layout, labels, taps, Spellbook return), and review the six location
  descriptions in `content/world/locations/` ([open items](../rounds/005/findings.md#open-items)).

- Round 009: check the Market Entrance tutorial in the Simulator (companion card, first screen at the top, later
  turns scroll), review Portia's content and reference URLs, and decide whether Portia may model "come ti chiami"
  before the ask-back objective ([open items](../rounds/009/findings.md#open-items)).
- Round 017: check the Spellbook during an encounter (explanation line, no Review) and between encounters (due
  cards hidden, notes on reference cards); review closing reviews during encounters
  ([open items](../rounds/017/findings.md#open-items)).
- Round 015: check Errata's glitched English on screen and with VoiceOver; review Errata and the containment-file
  voice ([open items](../rounds/015/findings.md#open-items)).
- Round 016: open the app after the Expo update (expo 58.0.23, safe-area-context 5.11.1); check safe-area insets
  on the map and encounter screens ([open items](../rounds/016/findings.md#open-items)).
- Round 014: check the sealed Rift on the map in the Simulator (lock mark, "Sealed 4/5" caption, disabled tap,
  VoiceOver label) and review the explicit five-id gate and keeping old saves in the Rift
  ([open items](../rounds/014/findings.md#open-items)).
- Round 013: review Marginalia's content, both passages of *The Journey* and the Journathan lore she states
  ([open items](../rounds/013/findings.md#open-items)).
- Round 012: review the no-menu narration rule and the choice to keep Portia's "Come ti chiami?"
  ([open items](../rounds/012/findings.md#open-items)).
- Round 011: review Flick's content and reference URLs, and the dropped Spanish `detente` / `recto` (no Spanish
  "straight on") ([open items](../rounds/011/findings.md#open-items)).
- Round 010: review Mortimer's content and reference URLs, the dropped Italian `due` entry, and whether NPCs may
  list an open objective's answers as options ([open items](../rounds/010/findings.md#open-items)).

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
- 2026-11-05, iteration 2: round 010 (A4) built and closed: Mortimer at The Butcher's Stall; live runs found that
  the grading rubric never showed surface forms (plurals failed evidence); fixed by Amendment; server 85/85, mobile
  20/20, client 12/12; butcher 3/3 resolved after the fix, verify:cli 9/9. Iteration 2 ends here (rounds 009–010).
- 2026-11-05, iteration 3: round 011 (A5) built and closed: Flick the Letharger at The Cracked Fountain; server
  88/88, mobile 20/20, client 12/12; live 4/4 resolved (it ×3 incl. a variant run, es ×1), 24/24 verdicts as
  intended, 0/60 feedback leaks.
- 2026-11-05, iteration 3: round 012 (E3) built and closed: narration rule against answer menus, Gerald's golden
  prompts regenerated (r012); server 88/88, mobile 20/20, client 12/12; live 6/6 resolved, menus 0/4 (4/4 before).
- 2026-11-05, iteration 3: round 013 (A6, B2) built and closed: Marginalia the Bookworm at The Old Bookshop with
  passages of *The Journey*; greeting fix by Amendment; server 90/90, mobile 20/20, client 12/12; live 6/6 resolved,
  30/30 verdicts as intended. Iteration 3 ends here (rounds 011–013).

- 2026-11-05, iteration 4: round 014 (A7a) built and closed: the Rift gate and `play-market.js --tour`; server
  96/96, mobile 22/22, client 12/12; first live full-market tour (it): 5/5 resolved, 20/20 verdicts as intended,
  Rift sealed at 4/5 and open after, 45 calls in 6 min 50 s.

- 2026-11-05, iteration 4: round 015 (A7b) planned, critiqued (7 findings: 5 accepted, 2 rejected), frozen and
  built: Errata at the Rift; server 101/101, mobile 22/22, client 12/12. Live: Italian 2/2 resolved, then Codex's
  usage limit; round left open. Iteration 4 ends here (round 014 closed, 015 open).
- 2026-11-05, iteration 5: round 016 (D4) built and closed while Codex's limit lasted: `npx expo install --fix`,
  expo-doctor 20/20; mobile 22/22, server 101/101, client 12/12.
- 2026-11-05, iteration 5: round 015 closed after Codex's reset (15:35 UTC): Spanish Rift resolved 7/7, Italian
  tour 6/6 encounters and 27/27 lines, 0/81 feedback leaks.
- 2026-11-05, iteration 5: round 017 (D3) planned, critiqued (6 findings: 4 accepted, 2 in part), frozen, built and
  closed: no Spellbook answers or reviews during encounters, due cards hide theirs, notes shown; server 103/103,
  mobile 25/25, client 12/12. Iteration 5 ends here (rounds 015–017 closed).

- 2026-11-05, iteration 6: round 018 (supervisor note) planned, critiqued (7 findings, all accepted), built and
  closed: claude-cli preflight accepts `CLAUDE_CODE_OAUTH_TOKEN`; server 108/108. No live claude-cli: the token is not
  in the agent's shell.
- 2026-11-05, iteration 6: round 019 (E1, E2) planned, critiqued (12 findings: 7 accepted, 3 in part, 2 rejected),
  built and closed: ambient vocabulary for Portia; server 114/114, mobile 25/25, client 12/12; live 9 runs, 65
  calls, all resolved and graded as scripted; E2 done, E1 not improved.

- 2026-11-05, iteration 6: round 020 (E1, second try) planned, critiqued (9 findings: 4 accepted, 5 in part), built,
  measured (5 runs, 37 calls) and reverted by Amendment: Portia's quirk left the share unchanged. Re-read of round 019:
  open-answer modelling 5/12 → 0/12 lines. Iteration 6 ends here (rounds 018–020 closed; ~140 Codex calls, no limit).

- 2026-11-05, iteration 7: round 021 (A8a) planned, critiqued (8 findings: 5 accepted, 3 in part), built and
  closed: party recruitment and the start route fix; server 122/122, mobile 33/33, client 12/12; live recruit run
  and a real-HTTP check passed (6 calls).

## Handoff notes and traps

- **In-process runs bypass the HTTP routes** (round 021): `play-market.js` and most tests call `LearningService`
  directly, which hid a route that dropped `encounterId` for 15 rounds. A new request field needs an HTTP test
  through `api()` in `server/test/helpers.js`. `docs/rounds/021/results/http-check.mjs` is a live HTTP driver that
  spawns the real server on 127.0.0.1 with a random token and always stops it.
- **Starting the server from Bash with `VAR=... node server/server.js &`**: `$!` was not node's PID, so `kill $!`
  left the server running (round 021). Spawn it from a Node script (`http-check.mjs`) or check with
  `pgrep -af server/server.js` afterwards.
- **Codex critique from `/tmp`** needs `--skip-git-repo-check` (round 021: without it codex exits at once).
- **The world snapshot's encounter block** has `characterId` and `saveable` since round 021; tests that
  `deepEqual` it list all five fields.
- **Save schema 3** (round 021): `party` is required in a v3 save; v1/v2 migrate in memory. Test fixtures that write
  a save by hand must include `party: []`.

- **`docs/rounds/020/results/compare.py`** compares `play-market.js` tutorial runs (`label=f1,f2 ...`): both share
  measures, token counts, overshoot, verdicts, and lines that model an open objective's answer. Its leak patterns are
  Portia's; extend `LEAKS` for other encounters.

- **Ambient vocabulary** (round 019): `ambient_vocabulary_ids` on an encounter adds words to its narration entries
  one by one and a FREE VOCABULARY line to its narration prompt (empty for encounters without it, so pinned prompts
  hold). The loader refuses an ambient id that is a target or whose folded form overlaps a target's form.
- **The claude CLI is not signed in from the Bash shell** (round 018): `CLAUDE_CODE_OAUTH_TOKEN` exists only in the
  agent's parent process. `npm run check:provider -- --provider claude-cli` refuses (`authentication`). Do not copy
  the token out of `/proc`. If a later shell has it, run check:provider first; an unlisted `authMethod` in
  `claude auth status --json` is refused: add it to `TOKEN_AUTH_METHODS` with a test.
- **Codex critique without file access works with a short bundle in about 1–2 minutes** (rounds 018, 019; ~450 and
  ~1000 lines), much faster than the 7–9 minutes noted below for bigger bundles.

- **Reviews are refused during an encounter** (round 017, 409 `IN_ENCOUNTER`, create and submit). Server tests that
  review must resolve the encounter first (`finishEncounter` in `server/test/helpers.js`); `verify-cli.js` reviews
  after its second turn and so needs that turn to resolve. The app decides "due" from `nextReviewAt` against the
  real clock: component tests with 2026-01 fixture dates must pass `now` to `Spellbook`.
- **Spellbook-only mobile tests go in `mobile/src/__tests__/spellbook.test.js`**: appended to `learning-flow.test.js`
  the Spellbook rendered null (cause not found).
- **Codex's usage limit resets about 90 minutes after it hits** (iteration 4: hit 14:05, reset 15:34 UTC). Use the
  wait for rounds without live runs (dependency updates, deterministic app or server rules). Iteration 5 made
  76 calls (15 + 60 game calls and one critique) after the reset without hitting it again.

- **Codex has a subscription usage limit.** Iteration 4 hit it after about 100 game calls and two critiques in
  ~50 minutes (14:05 UTC). The game maps it to `PROVIDER_FAILURE` ("temporarily unavailable"); a direct
  `codex exec --json` shows the real message and reset time. Pace live runs: single-location runs before tours, and
  no parallel live runs.

- **Do not wait on Codex with `pgrep -f "codex exec ..."`**: the wait loop's own command line contains the pattern,
  so it never ends (round 014). Run Codex with Bash `run_in_background` and wait for its notification, or test the
  output file.
- `play-market.js --tour` plays all five encounters in one save (45 calls, ~7 min with codex-cli) and checks the
  Rift gate; exit code 0 only if all resolved and the gate held and opened. Use it as the end-to-end regression run.
- Content copies in tests that remove or replace an encounter must also edit `the_rift.yaml`'s
  `requires_completed` (the loader rejects unknown ids); see `fixtureContent` in `server/test/encounters.test.js`.
- Adding an encounter elsewhere does not tighten the gate: add its id to `requires_completed` on purpose if it should.

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
- **Always script a plural or variant answer in live runs.** Round 010's bug (rubric without `forms`) was invisible
  for nine rounds because every scripted answer used the canonical form. The grading rubric now carries `forms`; the
  narration data deliberately does not (Gerald's golden prompts).
- **Surface variants that are English words** ("due", "chili", "media", "soy") get chipped in the NPC's English
  text, because matching is language-blind. Leave them out or accept the risk knowingly (round 009 kept "soy").
- **Narration chips are per encounter since round 009**: `definition.narrationEntries` holds the whole vocabulary
  files that the encounter's objectives target. A new encounter's words only show in its own lines; to share a file
  (e.g. reviewing all words in the Rift, A7), target an entry of each file from an objective.
- **Spellbook `contentVersion`** (the aggregate) changes whenever a vocabulary file is added; cards use the per-file
  `entryVersion(id)`. Tests must not compare a card's version with `content.vocabulary.version`.
- **Journal times: run `date -u` when writing a row**, never type an expected time. Rounds 011 and 012 each needed
  a correction row because Recorded was written ahead of the clock.
- **`git rm` stages immediately**: a later `git add <paths> && git commit` commits it too. Round 012's freeze commit
  carried a fixture removal and fails the golden test on its own. Do `git rm` after the freeze, or `git commit <paths>`.
- **Reading passages are content** (round 013): put the passage in the objective's `intent`. A passage that must
  open the scene has to say "in her greeting": `prompts/encounter/greeting.txt` asks for a concise greeting and wins
  otherwise. Changing that template would change Gerald's pinned prompts.
- **`accent_insensitive` is ignored**: `matchCanonicalVocabulary` always folds accents. Do not author a word whose
  folded form is a different word (es `años` → `anos`).
- The grader rejects "third-person attribution" (`grading.txt`); comprehension objectives need an explicit
  reading-context constraint and an accepted reported-speech example (round 013).
- `play-market.js` walks the shortest route to `--location` (round 011, exported `route()`), and `--lines 'a|b|c'`
  replaces the scripted player lines: use it for surface-variant runs instead of editing the script table.
- Codex critique on a content-only encounter takes ~9 minutes and checks English collisions with web search; run it
  in the background and draft the content meanwhile (do not commit before the freeze).
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
- Gerald's rendered narration prompts are pinned by `server/test/fixtures/gerald-prompts-r012.json` (test in
  `server/test/encounters.test.js`). A round that changes the narration prompt on purpose regenerates it (the
  generator is ~20 lines: `buildNarrationMessages` for `it`/`es`, greeting and one turn; see the test's arguments) and
  says so in its record.
- The style guide is filled into `prompts/system/base.txt` (STYLE block) since round 007; edit content there, not
  the template.
- Live A/B pattern that worked (round 007): 3 `play-market.js` runs on HEAD before building, 3 after, classify the
  saved lines by reading them; ~35 s and 5 calls per run.
- Saves are schema 2 (`world` block). In-memory encounters are lost on server restart (by design since round 001).
- The map's node positions fall back to a 320-point square until `onLayout` fires (jest never fires it).
