# Autonomous run state

The 72-hour autonomous run on branch `autonomous` (started 2026-11-05). Each iteration reads this file after
[STATUS.md](../../STATUS.md), takes the next unfinished item, runs it as a round (`docs/rounds/NNN/`, round-log
skill), and updates this file before stopping. Decisions an owner would normally make are logged in
[decisions.md](decisions.md) as autonomous decisions pending owner review.

## In progress

Iteration 20 (2026-11-06, from 02:09 UTC) closed round 069 (kept lines live) and is working on the next candidate.

Next candidates, none needing the owner:
- **Atmosphere repetition within a place** (round 068): across runs a place's line returns to the same idea
  (Portia "leaving someone on read"). Low value while the cache shows one line per place and state per server run.

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
- [x] **A8b. Party conversations.** (round 022, closed 2026-11-05) Encounters with `party_of` (no location), started
  from the Party screen anywhere once the member joined, counted per member (`conversations`); Gerald's coffee break
  (it, es).
- [x] **A8c. More party conversations.** (round 023, closed 2026-11-05) Mortimer's tasting, Flick's slow walk,
  Marginalia's fragment (it, es); `play-market.js --party --member <home location>`. Deferred: unordered objectives,
  deeper tiers by `conversations`, leak checks for bare words inside authored phrases ("¿Quieres más?").
- [x] **A9. Lore fragments.** (round 030, closed 2026-11-05) Three fragments of *The Journey* per pack in the
  Spellbook, found on completion; translation behind a toggle, withheld during encounters. More fragments (Gerald's
  Dead Branch coffee) wait for relationship tiers.
- [x] **A12. Relationship unlocks, first.** (round 032, closed 2026-11-05) Gerald's Dead Branch fragment after three
  coffee breaks (`after_conversations`). Open: unlocks for Mortimer, Flick, Marginalia; tiers that change the
  conversation; a Party-screen hint (owner question).
- [x] **A12b. Unlocks for the other members.** (round 033, closed 2026-11-05) Mortimer (forbidden herd), Flick (lotus),
  Marginalia (old dog) after three conversations each; stem check over every fragment and party conversation.
  Open: tiers that change the conversation (needs live runs); a Party-screen hint (owner question).
- [x] **A11b. Removing saves.** (rounds 038–039, closed 2026-11-05) Non-current saves, system alert, no label reuse;
  deleted on the server first (`DELETE /api/learner`). Open (owner): renaming; the app sending `PARALLANG_TOKEN`.
- [x] **A10. LLM-enhanced location atmosphere** (round 053, closed 2026-11-06: 24/24 live lines kept; `PARALLANG_ATMOSPHERE=on`,
  `GET /api/world/atmosphere`, a line under the description on the map card).
- [x] **A10b. Atmosphere variety** (round 068, closed 2026-11-06): no generic office humour; one detail kind per place
  and state (`atmosphereDetail`); motif 20/24 → 1/48 live, 48/48 kept.
- [x] **A11. Save slots.** (round 031, closed 2026-11-05) Up to three learners per device, Saves screen from the
  map; delete and rename deferred (owner question).

### B. Content in line with the newer lore notes (do not edit `parallang_obsidian/`)

- [x] **B1. Tone layer.** (round 007, closed 2026-11-05) Update `content/narration/style_guide.yaml` and Gerald's character sheet with the
  Pratchett × meme-culture layer (GAME MECHANICS.md), and make sure the style guide actually reaches the prompt
  (`prompts/system/base.txt` does not use `styleGuide` today). Add the narration rule "never give the player the
  exact phrase to type": round 005 live data shows Gerald saying "Say: 'Senza latte, per favore.'", and the echo
  then scores quality 2 (also D2). Re-measure with `play-market.js`.
- [x] **B2. Journathan.** (round 013, closed 2026-11-05) Journathan and *The Journey* in Marginalia's sheet and
  passages. More fragments belong to A9.
- [x] **B3. Infohazards.** (Fountain part: round 025, closed 2026-11-05: Flick's jingle, containment notice, plaque) Infohazard flavour in the Rift and Fountain content (LORE.md). The Rift part is done
  (round 015, Errata); the Fountain part is open.

- [x] **B4. Containment files.** (round 028, closed 2026-11-05) CM-001 (Fountain jingle) and CM-002 (Errata) in the
  Spellbook, filed on the encounter's completion (`containment_file` on the encounter, both packs).

### C. prototype.md Phase 4: Polish & Audio

- [x] **C1. Forced repetition.** (round 029, closed 2026-11-05) Drill before the Rift's first fight: one due card
  per required target group, `DRILL_REQUIRED`, map note; `play-market.js --tour` clears it (`drillCards`).
- [x] **C2. Onboarding.** (round 027, closed 2026-11-05) Philosophy statement screen before the map, once per
  device; `content/narration/onboarding.yaml`, `GET /api/onboarding`.
- [x] **C3. Visual polish.** (rounds 034–035, closed 2026-11-05) C3a type scale, palette tokens, contrast test; C3b
  fades that respect Reduce Motion (`mobile/src/motion.js`), line-height tokens. C3c (round 042, closed 2026-11-05):
  Literata Bold for titles (`Title` in `ui.js`, OFL notice in `mobile/THIRD_PARTY_NOTICES.md`).
- [x] **C4. Sound design.** **C4a** UI cues (round 037, closed 2026-11-05: `pass`, `resolve`, synthesized by
  `mobile/scripts/gen-ui-sounds.js`, switch on the Saves screen). **C4b** ambient loops per location (round 041,
  closed 2026-11-05: `mobile/scripts/gen-ambient.js`, `mobile/src/ambience.js`, ducked under speech).

- [x] **C5. Hear the words of an encounter line** (round 055, closed 2026-11-05): a pronounce button per word chip under NPC lines
  (TTS was only in the Spellbook and reviews; prototype.md Phase 4). No live calls.
- [x] **C6. Word chips by class** (round 056, closed 2026-11-05): nouns, verbs and adjectives coloured with a label (owner's GAME
  MECHANICS note, "R/G/B for noun/verb/adjective"). No live calls.
- [x] **C7. Chip words marked in the line** (round 057, closed 2026-11-05): the server's match spans, coloured and underlined by
  class inside the NPC line. No live calls.
- [x] **C10. Hear the narrator** (round 061, closed 2026-11-06): a 🔊 per NPC narration, English device voice (en-GB
  first, no novelty voices), on demand. Auto-read is an owner question. No live calls.
- [x] **C10b. The narrator on the map and companion card** (round 062, closed 2026-11-06): "Hear the place", "Hear the
  briefing"; a move stops the voice. No live calls.
- [x] **C10c. Stop speech when the Review or Spellbook view goes** (round 063, closed 2026-11-06); also fixed a race in
  `speak` (a stop during its wait was ignored).
- [x] **C10d. Stop speech when the app goes to the background** (round 064, closed 2026-11-06): `background` stops it,
  `active` undocks the ambience when nothing speaks.
- [x] **C9. Lines you translated** (round 060, closed 2026-11-06): paid sentence reveals kept in the save (`lines`, 50,
  500 characters) and shown in the Spellbook, hidden during encounters and while a card in the line is due. No live calls.
- [x] **C8. Word class on Spellbook cards and in reviews** (round 059, closed 2026-11-06): the class word in its chip
  colour on cards (frames stay neutral), a class tag under the review word, from the Spellbook card. No live calls.
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

### G. Follow-ups seeded in iteration 12 (from deferred items of rounds 011, 023, 032–033)

- [x] **G1. Party-screen hint.** (round 043, closed 2026-11-05: `storyProgress`, `storyHint`) Show how many conversations remain until a member's next fragment (rounds 032–033
  left it as an owner question: decide autonomously, record it). No live calls needed.
- [x] **G2. Leak check for bare target words inside authored phrases** (round 044, closed 2026-11-05: `server/scripts/leak-scan.js`; 6 near-leaks in 611 lines, no fix) (round 023: "¿Quieres más?"): a test or
  `replay-leaks.mjs`-style scan over authored content and live reports. No live calls needed for the content part.
- [x] **G3. Unordered objectives** (round 045, closed 2026-11-05: `objectives_unordered`, Mortimer's tasting; live it/es passed) (round 023): an encounter may mark objectives as completable in any order; engine
  and tests first (no live), then one live run.
- [x] **G4. Relationship tiers that change the conversation** (round 047, closed 2026-11-05: `after_conversations` on
  party conversations, Gerald's confidence at 3, it/es live). Open: deeper tiers for Mortimer, Flick, Marginalia
  (content only, backlog G6).
- [x] **G5. Telling the time at the Fountain** (round 050, closed 2026-11-05: objective `time` between direction and
  now, four authored constructions per pack, no number lesson; 48/48 live verdicts, zero stated times).
- [x] **G6. Deeper tiers for the other members** (round 048, closed 2026-11-05: Mortimer's oath, Flick's lotus,
  Marginalia's folded page at 3, it/es live, Amendment 1 for Marginalia's all-English line).
- [x] **G7. Words from other conversations** (round 049, closed 2026-11-05: `foreign` hits in `leak-scan.js`;
  common but everyday words, no content rule; *sola* is in Marginalia's first-tier passage).

### H. Follow-ups seeded in iteration 15 (round 050)

- [x] **H1. Early pass in an ordered encounter.** (round 051, closed 2026-11-05: an ORDER bullet in the grading
  prompt, and the grader now fails the early objective with "say it again" feedback; `held` marks a pass that does
  not close, shown as "…" in the app; Gerald's pinned narration prompts unchanged.)
- [x] **H2. Hours 1–12** (round 052, closed 2026-11-06: four live runs as scripted; objective `minutes` first in `flick_slow_walk`,
  numbers 2–12 in `flick_party.yaml` v2) (owner question in round 050): a numbers lesson (a party conversation or the Fountain) so
  *sono le* / *son las* has numbers behind it. Mortimer teaches only *tre*/*cento* (it) and *dos*/*tres*/*cien* (es).
  Watch English collisions (it *due*, es *once*).

### F. Maintenance

- [x] **F1. Test temp dirs.** (round 024, closed 2026-11-05: `makeTempDir` in helpers.js, removed at process exit) Server tests `mkdtemp` save dirs under `/tmp` and never remove them; `/tmp` is a 64 MB
  tmpfs and filled during round 023. Add `t.after(() => rm(dir, …))` in `createRuntime` (helpers.js) and the other
  `mkdtemp` sites; check `ls /tmp | grep parallang | wc -l` stays 0 after `node --test`.

- [x] **F2. Typographic apostrophes** (round 054, closed 2026-11-05): fold ’ ‘ ʼ (and look-alikes) to ' in `matchCanonicalVocabulary`
  and the grader-evidence presence check, so an iPhone's Smart Punctuation cannot make a correct answer
  `INVALID_GRADING` on every retry. No live calls.
- [x] **F3. Vocabulary forms match their own entry** (round 058, closed 2026-11-05): matcher sorts (entry, variant) pairs longest
  first; pack-wide behavioural test. No live calls.

- [x] **F4. One test command** (2026-11-06, no round): root `npm test` (server, client, mobile), `npm run test:server`;
  bare `node --test` in `server/` hangs on the fake CLIs in `test/fixtures/`.

### E. Follow-ups from live data

- [x] **E1. Opening-line language share.** (round 026, closed 2026-11-05: rule kept with Amendment 2; tour gap it 0.12 → 0.07, es 0.15 → 0.14; greetings within 0.07 by hand) Round 009: first NPC lines carry 0.05–0.24 target language against
  0.20 requested (Gerald 0.19 vs 0.25). Round 014's tour: only Portia is short (mean 0.11 vs 0.28, greeting 0.07 vs
  0.20); Gerald 0.26/0.30, Mortimer, Flick and Marginalia at or above. Start with Portia's character sheet or
  encounter (content), not the shared template. **Round 019:** ambient words did not raise it (lines 0.17 → 0.16,
  greeting 0.08 → 0.12 on 3 runs): the gap is the English around her one Italian formula. Next: a language-profile
  note or quirk that her formalities and remarks are in the target language; measure 3 it + 1 es as in round 019.
  **Round 020:** that quirk did not help either (lines 0.17, greeting 0.13) and was reverted. Content is exhausted;
  next is a template round: make "Target approximately N%" concrete (e.g. about K of every 10 words), regenerate
  Gerald's golden prompts on purpose, and measure with a full `--tour` (Mortimer, Flick, Marginalia overshoot today,
  so a stronger rule may push them further). **Round 025:** with Flick's refrain on every line, the share was 0.46
  against 0.45 but only 0.39 without the refrain (0.53 before): the model counts a recurring formula toward its
  quota. A template rule should say whether refrains count. **Round 023:** Flick's party lines are also short (0.24 es, 0.28 it
  against 0.38; long English riddles around short phrases), while Mortimer (es 0.60) and Marginalia run over. Use `docs/rounds/020/results/compare.py` for the measures. Measure over a few runs per encounter, then adjust the greeting template or
  language rules; keep the golden-prompt test in step (regenerate on purpose).
- [x] **E3. NPCs list the answers.** (round 012, closed 2026-11-05) Style rule against menus of an open objective's
  targets; menus 4/4 → 0/4 runs. Portia's "Come ti chiami?" left allowed (pending owner review).
- [x] **E2. Author the greetings Portia uses unprompted** (round 019, closed 2026-11-05) as ambient vocabulary
  (`ambient_vocabulary_ids`): benvenuto, piacere, mercato; bienvenido, mucho gusto, mercado. Chipped in 12/12 lines.

## Needs owner

- **Atmosphere** (rounds 053, 068): read some lines in `docs/rounds/068/results/` and decide whether it should be on
  by default (`PARALLANG_ATMOSPHERE=on`).
- **Playtesting (prototype.md Phase 4's last task):** run [`docs/playtest/guide.md`](../playtest/guide.md) with
  3–5 testers at the Mac (round 066); file the results as a round.
- Rounds 059–064 (Simulator):
  - the class word on Spellbook cards and the review's class tag;
  - the "Lines you translated" section;
  - "Hear the narrator", "Hear the place" and "Hear the briefing": the voice, MERCATO and capitals, the row layout;
  - speech stopping when you leave a screen or the app.
  Decide:
  - whether the review prompt may show the class;
  - whether to keep the lines from free translations too, and whether hiding a line until its cards are reviewed is
    right;
  - whether the narrator should read automatically, and with its own rate or pitch;
  - whether descriptions should avoid capitals and target words for the voice.
  ([059](../rounds/059/findings.md#open-items), [060](../rounds/060/findings.md#open-items),
  [061](../rounds/061/findings.md#open-items), [062](../rounds/062/findings.md#open-items),
  [063](../rounds/063/findings.md#open-items), [064](../rounds/064/findings.md#open-items)).
- Rounds 055–057 (Simulator): the 🔊 beside each encounter chip (it, es voices, late voices on a cold start), chips
  coloured and labelled by class (dashed verbs, narrow screens), words marked in the NPC line, VoiceOver. Decide: may
  the class show on the active line before a hint; R/G/B as the palette; ink underlines for other classes
  ([055](../rounds/055/findings.md#open-items), [056](../rounds/056/findings.md#open-items),
  [057](../rounds/057/findings.md#open-items)).
- Round 054 (Simulator): type "È l'una" and "Ancora un po'" with Smart Punctuation on; both should pass
  ([open items](../rounds/054/findings.md#open-items)).
- Round 051: should an early correct use be recorded in the Spellbook though it does not close (the grader now fails
  it); check the "…" mark in the Simulator ([open items](../rounds/051/findings.md#open-items)).
- Round 050: review the Fountain's time objective and its ten entries (it, es), the four constructions and no number
  lesson (backlog H2); play the Fountain with four objectives in the Simulator
  ([open items](../rounds/050/findings.md#open-items)).
- Round 049: confirm that NPCs may say other conversations' words (*grazie*, Mortimer's *amico mio*), and keeping
  *sola* despite Marginalia's "una lingua sola" ([open items](../rounds/049/findings.md#open-items)).
- Round 048: review Mortimer's oath, Flick's lotus and Marginalia's folded page (it, es), whether members may say
  other conversations' targets, and check each member's Party-card tier line in the Simulator
  ([open items](../rounds/048/findings.md#open-items)).

- Round 047: review Gerald's confidence (it, es), whether the deeper tier should repeat or alternate, and check the
  Party card's tier line in the Simulator ([open items](../rounds/047/findings.md#open-items)).

- Round 032: review Gerald's Dead Branch fragment (it, es) and the threshold of three coffee breaks; check the "from
  Gerald" note in the Simulator ([open items](../rounds/032/findings.md#open-items)).

- Round 031: check the Saves button and screen in the Simulator; decide on deleting / renaming saves and whether a
  new save shows the statement again ([open items](../rounds/031/findings.md#open-items)).

- Round 030: native-speaker review of the six fragment texts and glosses; check the Fragments section, the toggle
  and VoiceOver on glossary lines in the Simulator ([open items](../rounds/030/findings.md#open-items)).

- Round 029: check the Rift's drill note, the review loop from the map and back, the finish-first case; decide
  whether a reveal counts as a drill review and whether replays should drill
  ([open items](../rounds/029/findings.md#open-items)).
- Round 028: check the Spellbook's Containment files section (long lists, during encounters, VoiceOver) and review
  both files' texts ([open items](../rounds/028/findings.md#open-items)).
- Round 027: check the first-launch statement screen in the Simulator (clear the app's storage), VoiceOver focus,
  and review the two authored notes and the title ([open items](../rounds/027/findings.md#open-items)).

- Round 025: review Flick's jingle, the Fountain's containment notice and plaque, and whether the refrain should be
  on every line; check the Fountain's companion card in the Simulator ([open items](../rounds/025/findings.md#open-items)).

- Round 023: native-speaker review of the four party conversations (rounds 022–023) and their reference URLs
  ([open items](../rounds/023/findings.md#open-items)).
- Round 022: check the Party screen's Talk button and count, the coffee break, and review Gerald's coffee-break
  content, the agreement rule and its unopened reference URLs ([open items](../rounds/022/findings.md#open-items)).
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

- 2026-11-05, iteration 7: round 022 (A8b) planned, critiqued (10 findings: 5 accepted, 5 in part), built and
  closed: party conversations and Gerald's coffee break; server 127/127, mobile 37/37, client 12/12; live 6 runs,
  70 calls, 5/5 with the planned script resolved as scripted.

- 2026-11-05, iteration 7: round 023 (A8c) planned, critiqued (11 findings: 7 accepted, 3 in part, 1 rejected),
  built and closed: party conversations for Mortimer, Flick, Marginalia; server 130/130; live 6/6 resolved as
  scripted (108 calls). Iteration 7 ends here (rounds 021–023 closed; about 200 Codex calls, no limit).

- 2026-11-05, iteration 8: round 024 (F1) planned, critiqued (6 findings: 3 accepted, 2 in part, 1 rejected), built
  and closed: test temp dirs removed at exit; server 131/131, 0 dirs left (34 before).
- 2026-11-05, iteration 8: round 026 (E1) planned, critiqued (9 findings: 4 accepted, 5 in part), built and committed;
  baseline tours (it, es) and 80 paired greeting replays: mean gap 0.108 → 0.095 (it), 0.133 → 0.108 (es), Portia's
  greeting 0.14 → 0.21 and 0.10 → 0.18; Amendment 1 keeps the rule (the bar's failing cells are estimate artifacts by
  hand count); Portia greet-answer leak found; Codex limit at 18:17 stopped the after-build tours. Round left open.
- 2026-11-05, iteration 8: round 025 (B3, Fountain) planned, critiqued (7 findings: 5 accepted, 2 in part), built and
  closed: Flick's jingle as an infohazard; server 133/133, mobile 37/37, client 12/12; live 5 runs (2 baseline),
  65 calls, all resolved as scripted, refrain 21/21 lines, share displaced (E1).

- 2026-11-05, iteration 9: round 026 Amendment 2 built (no live check yet: Codex limit until 20:35 UTC). Round 027
  (C2) planned, critiqued by a Claude subagent (10 findings: 8 accepted, 2 in part), built and closed: the philosophy
  statement on first launch; server 138/138, mobile 45/45, client 12/12, expo-doctor 20/20.
- 2026-11-05, iteration 9: round 028 (B4) planned, critiqued by a Claude subagent (9 findings: 7 accepted, 2 in
  part), built and closed: containment files in the Spellbook, filed on completion; fixed the resolving turn
  returning stale progress; server 142/142, mobile 47/47, client 12/12.
- 2026-11-05, iteration 9: round 029 (C1) planned, critiqued by a Claude subagent (two reports: 8 findings, all
  accepted; 11 more after the freeze, by Amendment), built and closed: forced repetition before the Rift; server
  148/148, mobile 51/51, client 12/12. Iteration 9 ends here (Amendment 2 of round 026 built; rounds 027–029 closed;
  no Codex calls: limit until 20:35 UTC).

- 2026-11-05, iteration 10: rounds 030 (A9, fragments of *The Journey*), 031 (A11, save slots) and 032 (A12,
  Gerald's Dead Branch fragment after three coffee breaks) planned, critiqued by Claude subagents (10, 10 and 7
  findings), built and closed; server 156/156, mobile 68/68, client 12/12, expo-doctor 20/20. No Codex calls
  (limit until about 20:35 UTC); round 026 still open with its live steps queued.

- 2026-11-05, iteration 12 (20:02–21:05 UTC): rounds 041 (C4b, ambient loops), 042 (C3c, Literata titles), 043 (G1,
  Party-screen story hint) and 044 (G2, leak scan over every live report) planned, critiqued by Claude subagents and
  closed while Codex was at its limit. After the reset (20:36): round 026 closed (Amendment 2 check passed; tours
  gap it 0.12 → 0.07, es 0.15 → 0.14; E1 done), round 045 (G3, unordered objectives, Codex critique) built and closed
  with live runs; round 046 (a `folded` share estimate, Codex critique) closed without live calls. Server 177/177,
  mobile 120/120, web 12/12, expo-doctor 20/20. Seeded backlog G. About 177 Codex calls after the reset, no limit.

- 2026-11-05, iteration 13 (21:08–21:25 UTC): round 047 (G4, relationship tiers) planned, critiqued by Codex (8
  findings, 2 Errors accepted), built, run live (2 × it, 2 × es; Amendment 1 put the tier's opening in the
  greeting) and closed. Server 181/181, mobile 124/124, web 12/12, expo-doctor 20/20.

- 2026-11-05, iteration 14 (21:23–22:01 UTC): round 048 (G6, deeper tiers for Mortimer, Flick and Marginalia)
  planned, critiqued by Codex (6 Risks: 5 accepted, 1 in part), built, run live (8 runs: 6 + 2 after Amendment 1)
  and closed. Also: `cli-learning-flow.test.js` now removes its temp dirs. Server 184/184, mobile 124/124, web
  12/12, expo-doctor 20/20. Then round 049 (G7, other-target exposure in the leak scan; Codex critique, 9 findings,
  4 Errors accepted; no live calls) closed: server 188/188.

- 2026-11-05, iteration 15 (22:02–23:00 UTC): round 050 (G5, telling the time at the Fountain) planned, critiqued
  by Codex (13 findings, 5 Errors accepted), built, run live (3 × it, 3 × es, matrix of pass and fail paths; plus an
  it tour) and closed. Seeded backlog H. Then round 051 (H1, held results and the grading ORDER line; Codex critique, 9
  findings, 3 Errors accepted; Amendment 1 moved the line before the rubric), live it/es Fountain, combined answers,
  verify:cli and an es tour. Server 198/198, mobile 126/126, web 12/12.

- 2026-11-05, iteration 16 (22:56–23:25 UTC): round 052 (H2, numbers 2–12 in Flick's slow walk; Codex critique,
  11 findings, 4 Errors accepted incl. a matcher offset bug on decomposed accents) built and run live with the scripted
  lines (it, es: as scripted); Codex then hit its limit (23:14), so its variant runs are queued. Round 053 (A10, LLM
  location atmosphere; Claude-subagent critique, 13 findings, 3 Errors accepted: off by default because the CLI
  runner is serial) built offline. Server 213/213, mobile 130/130, web 12/12. `git push` failed from 23:22 with a
  GitHub-side "fatal error in commit_refs" until 23:25 (see traps).

- 2026-11-05, iteration 11: rounds 033–040 planned, critiqued by Claude subagents, built and closed, all without
  live LLM calls (Codex limit until 20:35 UTC). The rounds:
  - 033 (A12b): Journey fragments for Mortimer, Flick and Marginalia; a wider stem check.
  - 034 (C3a): a type scale, palette tokens and a contrast test.
  - 035 (C3b): fades that respect Reduce Motion.
  - 036: the fragment source line in the Spellbook.
  - 037 (C4a): two synthesized UI cues and a sound switch.
  - 038 (A11b): removing a save.
  - 039: the server deletes a removed save.
  - 040: the app sends `PARALLANG_TOKEN`.
  Server 163/163 (after round 039's Amendment 1, from a read-only review of the eight rounds by a Claude
  subagent: no serious bugs), mobile 95/95, client 12/12, expo-doctor 20/20. Iteration 11 ended at 20:01 UTC.
- 2026-11-05, iteration 17 (23:26–23:58 UTC, Codex limited throughout; critiques by Claude subagents): rounds 054
  (F2, typographic apostrophes folded in the matcher, reviews and the evidence check), 055 (C5, a 🔊 per encounter
  chip, voice cache, speech generations), 056 (C6, chips coloured and labelled by class), 057 (C7, chip words marked
  in the line at the server's `spans`), 058 (F3, matcher sorts every form longest first across entries; a latent
  stealing bug found by the critique; 0 differences on 1,021 saved lines). All closed: server 238/238, mobile
  146/146, client 12/12, expo-doctor 20/20, iOS export built. No live runs.
- 2026-11-06, iteration 18: Codex limited (reset 01:36 UTC). Six rounds closed offline, each critiqued by a Claude
  subagent standing in for Codex:
  - 059 (C8): the word class on Spellbook cards and reviews;
  - 060 (C9): lines you translated;
  - 061 (C10): hear the narrator;
  - 062 (C10b): the narrator on the map and the briefing;
  - 063 (C10c): the Spellbook and Review screens stop speech; fixed a race in `speak`;
  - 064 (C10d): speech stops in the background.
  Also F4 (`npm test`). Server 244/244, mobile 176/176, client 12/12, expo-doctor 20/20. The live queue (rounds
  052–054) is untouched.
- 2026-11-06, iteration 19 (from 00:45 UTC; Codex limited until 01:36): round 065 (round 063's cosmetic item): a
  loading line and a failure state with Try again between reviews; `startReview` drops a reply that arrives after the
  view changed (a pre-existing race the critique found). Mobile 182/182. After Codex's reset: round 052 closed (four
  slow-walk runs as scripted), round 053 closed (24/24 atmosphere lines), round 054 item 2 (a live ’ answer passes),
  round 067 (live regression tour it/es) and round 068 (A10b, Codex critique with a bundle on stdin). A read-only review of rounds 059–065 found
  nothing serious; two minor races fixed as round 065's Amendment 1 (mobile 185/185). Round 066: a playtest kit for
  the owner (`docs/playtest/guide.md`) and a README refresh, docs only.
- 2026-11-06, iteration 20: round 069 closed: kept lines (C9) live, it 30/30 and es 28/28 checks, 28 calls;
  `docs/rounds/069/results/kept-lines-live.mjs` is a ~2-minute regression check.

## Handoff notes and traps

- **Codex critique needs a bundle on stdin** (again in round 068): without it, bwrap fails and the critique is void.
  Build the bundle with `cat -n` of the plan and files, and tell Codex not to run commands. It returned in about 2
  minutes this time.
- **Keyword counts over LLM lines: use whole words** (round 068 critique 1.4): substring stems hit "apparently" and
  "feet". `docs/rounds/068/results/motif.mjs` is the whole-word scan.
- **Atmosphere detail kinds** (round 068): `atmosphereDetail(world, locationId, state)` = `ATMOSPHERE_DETAILS[(3i+s) %
  5]` by the location's index in `world.locations` (file order). A new location shifts nothing before it; the test
  derives the expected kinds from the same formula.
- **App-level jest tests and `initialize`** (round 065): `initialize()` caches its promise per module, so a second
  `render(<App />)` in the same test file never refetches. Either keep one App test per file, or seed the store's
  `beforeEach` with the loaded state (learnerId, language, world, spellbook), as `review-loading.test.js` does.
- **`startReview` drops late replies** (round 065): it remembers `get().view` and, if the view changed by the reply,
  only updates `spellbook` and clears `isLoading`. A new screen that starts a review must stay on the view it started
  from until the reply, or it loses the challenge.
- **Run every test with `npm test`** at the root (about 20 s; round F4). A bare `node --test` inside `server/` hangs:
  it also runs `server/test/fixtures/fake-*.mjs`, which wait on stdin. `node --test server/test/*.test.js` from the
  root works too.
- **`jest.mock` of a module that `speech.js` imports does not apply** (round 061): `jest.after-env.js` loads
  `speech.js` before the test file's mocks. To watch the ambience under speech, use the real `ambience.js` and read
  the mocked player's `.volume` (`createAudioPlayer.mock.results.at(-1).value`), as `narrator.test.js` and
  `speech-stops.test.js` do. `resetVoiceCacheForTests` also drops speech's AppState listener (round 064).
- **`font.test.js` counts `<Title style={styles.x}>` literally** (rounds 060, 062): a new section title raises the
  count, and an array style breaks the match, so put extra layout rules in the title's own style.
- **Kept lines** (round 060): `envelope.lines` (optional, at most 50, 500 characters per text); invalid entries are
  dropped on load; receipts are stored without `spellbook.lines` (`withoutLines`), and replays re-attach the current
  ones (`replayWithLines`). A line stays hidden while any of its cards is due, so new lines start hidden.
- **Narrator** (rounds 061–064): `NARRATOR` (en-GB) in `speech.js`; `findVoice` skips Apple's novelty and Eloquence
  voices and folds `_`. `NarratorButton` and `speechText` are in `components/NarratorButton.js`. `speak` returns
  without speaking when a stop or a newer word arrives during its wait. The encounter, map, Spellbook and Review
  screens stop speech on unmount, and the app stops it on `background`. The jest mock has `isSpeakingAsync`.

- **Matcher order** (round 058): `matchCanonicalVocabulary` tries (entry, variant) pairs longest folded form first
  across all entries (stable: ties keep load order). `vocabularyFormConflicts(entries)` is the pack-wide check in
  `vocabulary-forms.test.js`: a new variant that another entry takes, or that takes another's, fails there.
  `docs/rounds/058/results/compare-matchers.mjs <old-engine.js>` compares two matchers over every saved NPC line.
- **Spans** (round 057): narration words carry `spans` (every `[start, end]` of that id, UTF-16 offsets into
  `dialogue.native`), stored in saves and serialized when present; older lines lack them and show unmarked.
  `segmentLine` (`mobile/src/wordClass.js`) drops malformed or overlapping spans. `server/test/word-spans.test.js`
  imports the app module (Node prints a typeless-package warning: expected). The `mark` style in `wordClassStyle`
  is listed in the theme test's `MODIFIERS`.
- **Word chips** (round 056): `wordClass(partOfSpeech)` in `mobile/src/wordClass.js` (noun, verb, adjective or
  null); colours `wordNoun`/`wordVerb`/`wordAdjective` and `wordClassStyle(cls)` in `ui.js`; `Button` takes
  `suffix`/`suffixStyle`. A coloured chip's name ends ", noun" / ", verb" / ", adjective" (tests query
  "Translate word: caffè, noun"). Word chips pass `dim={false}`. A new `part_of_speech` value fails
  `word-class.test.js` until it is mapped.
- **Speech** (round 055): `PronounceButton` looks voices up through `voiceFor(tag)` (in-flight promise cached per
  tag, misses dropped); `findVoice` stays pure. `mobile/jest.after-env.js` (`setupFilesAfterEnv`) resets the cache
  before every test. `speak` only lets the latest utterance restore the ambience; `stopSpeech()` runs when
  `DialoguePanel` unmounts. Chip rows pass `hideWhenUnavailable`. The chip row's label is "Words" (was "Word
  translations").
- **Numbers in Flick's slow walk** (round 052): `minutes` targets it `due` … `dodici` with Mortimer's `tre`, es
  Mortimer's `dos`, `tres` and `cuatro` … `doce` (cross-file ids: Mortimer's whole butcher file is chipped in this
  conversation). `minuti` / `minutos` are non-target entries in `flick_party.yaml`. English-word forms among the
  slow walk's chips are pinned in `server/test/flick-numbers.test.js` (it *due*, *sei*, *otto*, *nove*, *salami*,
  *mezzo*, *cento*; es *once*, *kilo(s)*, *chorizo(s)*); a new one fails there. Any English text checked against the
  es pack now hits *once* (round 052 rewrote Errata's containment file and the lotus fragment for this).
  `encounters.test.js`'s `fixtureContent` strips `dos`/`tres` from es `minutes`, since it removes Mortimer's file.
- **Matcher offsets** (round 052): `matchCanonicalVocabulary` folds per cluster and maps folded indices back to the
  source; NFC results are unchanged, decomposed accents and growing lowercases (İ) no longer shift offsets.
- **Atmosphere** (round 053): off unless `PARALLANG_ATMOSPHERE=on` (`new LearningService({ atmosphere: true })` in
  scripts/tests). `providerCallsInFlight` (counted in `callProvider`) makes it return null ("busy", not cached) while an
  encounter call runs; once started it still delays the next encounter call on the serial CLI runner. Failures are
  cached as null for `ATMOSPHERE_RETRY_MS` (10 min); `service.atmosphereStats` holds calls and drop reasons.
  `ATMOSPHERE_ENGLISH` lists pack forms the English line may use. The `FixtureProvider` answers `location_atmosphere`.
  The app's store subscription (`followAtmosphere`) keys by learner, location, completion and party ids.
- **`git push` rejected by GitHub** from 23:22 UTC 2026-11-05: `remote: fatal error in commit_refs`, while fetch
  works. Not a local problem found (no large files); it passed again at 23:25 UTC. If it recurs, retry `git push origin autonomous` later; never force-push.

- **Ordered grading** (round 051): `buildGradingMessages({ ordered })` fills `{{order}}` (end of the Quality bullet in
  `grading.txt`) with an ORDER bullet when two or more ordered objectives are graded; empty otherwise (byte-identical,
  `order-line.test.js`). **Never append text after the `AUTHORED RUBRIC:` line**: the test graders parse the rubric
  JSON to the end of that line (Amendment 1). With the line, the grader fails an early later objective instead of
  passing it. `held: true` (only when true) marks a pass that does not close, in the response and the narration
  decision (`held_note`, `HELD_NOTE`); the app shows "…" (`resultMark`, `HELD_SUFFIX` in `DialoguePanel.js`).

- **The Fountain has four objectives** (round 050): stop, direction, `time`, now (ordered; `now` stays last for the
  jingle). A Fountain script needs eight lines now; `fountain.test.js`'s `FountainProvider` names the time entry
  from `timeIds`. Time targets: it `sono_le`, `luna` (*è l'una*, straight and typographic apostrophes),
  `mezzogiorno`, `mezzanotte`; es `son_las`, `es_la_una`, `mediodia`, `medianoche`; non-targets `che_ore_sono`,
  `que_hora_es`. *tre* / *tres* are Mortimer's entries and also match in "Sono le tre". The leak scan flags *l'ora*
  (hour) as the target *ora*: noise. `docs/rounds/050/results/measure.py` measures Fountain reports with closure
  in order.
- **Typographic apostrophes are folded** since round 054: `foldApostrophes` (’ ‘ ʼ \` ´ ′ → ', one unit for one) runs
  in `matchCanonicalVocabulary`, `normalizeAnswer` and the evidence check (`foldEvidenceText`: also NFC, whitespace).
  New content needs no `’` variants. ʼ was a letter before, so it is now a word boundary for the matcher.

- **Other-target exposure** (round 049): `leak-scan.js` prints `foreign` rows (a party target of another
  conversation, exact whole forms; `amigo` marked `english`) apart from the four kinds, and the summary line ends
  "foreign N (party conversations: X of Y lines)". About half of party lines have one: read the words, do not act on
  the rate. `docs/rounds/049/results/measure.mjs` tabulates every report. **A new party target must also be checked
  against every other conversation's authored intents** (round 048 missed Marginalia's "una lingua sola").
- **Deeper tiers** (round 048): every saveable member has one at 3 (`mortimer_oath`, `flick_lotus`,
  `marginalia_folded_page`, `gerald_confidence`). A new party vocabulary file changes the pinned party entry count
  (17 now), the stems list in `lore-fragments.test.js`, the encounter key list and the vocabulary version pins in
  `encounters.test.js` / `language-engine.test.js`, and `fixtureContent` must drop Mortimer's party files.
  Reference ids are unique per pack, across vocabulary files (es `rae-solo` was taken: `rae-solo-alone`).
  **"In English only" in an intent makes the whole line English** (Amendment 1): say "in one English sentence".
  Double quotes inside a YAML double-quoted intent must be escaped (`\"`).
  `docs/rounds/048/results/summarize.py` summarises `--party --tier` reports (verdicts, lines, unmet-target forms).
- **Mobile jest flaked once** (round 048: 1 failure on 1 of 5 runs, not identified). Rerun before chasing it.
- **Relationship tiers** (round 047): a party conversation with `after_conversations: N` is offered once the member
  has N finished conversations (`partyConversationFor(home, count)`, deepest wins, any file order). One first tier
  per home (loader). `partySnapshot` gives `conversationId` and `conversationTier`; an unresolved party session of
  that member wins the offer. Members are matched by home (`isHomeMember`) for start, `NOT_YET` and counting.
  `play-market.js --party [--member X] --tier N` writes count N into the save and plays the offered tier. A new
  party vocabulary file changes the pinned party entry count (11 now) and the stems list in `lore-fragments.test.js`.
  **A tier's opening must be in the greeting** (Amendment 1): say "in his greeting he does not introduce himself"
  in the first objective's intent, or the NPC greets the player as a stranger.

- **Share estimates** (round 046): `languageShare` returns `folded` (trust it over `notInTranslation`; null means the
  translation is a gloss: hand-count) and `translationShort`. `docs/rounds/046/results/evaluate.mjs` scores both
  against the hand counts; add new hand counts there.
- **Leak scan** (round 044): `node server/scripts/leak-scan.js <reports...>` reads every play-market report shape
  (tour, party, single, rounds 005–008, greeting replays). Kinds: leak, near, quoted, echo. Known noise: Gerald's
  English "espresso", Errata's frame words (*sono*, *nome*, *nombre*), Portia's greeting word (about half of her
  greetings, since round 009). Run it on every new live report and read the leak and near lines.
- **Unordered objectives** (round 045): `objectives_unordered: true` on an encounter; only `mortimer_tasting` sets it
  (a test checks). Use `service.activeObjectives` / `currentObjective`, never `objectives[objectiveIndex]`. Help caps
  every graded objective in unordered encounters. `createRuntime({ content })` takes edited content for tests (see
  `server/test/unordered-objectives.test.js`, `contentWith`).
- **Tour reports do not record `journeyFragments`** (round 026): to check fragments on resolving turns, add them to
  play-market's report or read the save.
- **Ambience** (round 041): `mobile/src/ambience.js` (`setAmbience`, `duckAmbience`), injected into the store
  (`createGameStore({ ambience })`), which calls it only when the wanted location changes. Store tests that count
  `createAudioPlayer` calls must pass `ambience: jest.fn()` (see `sounds.test.js`). A new map location needs a loop:
  add a recipe in `mobile/scripts/gen-ambient.js`, run it, and add the `require` in `ambience.js`
  (`ambience.test.js` checks the ids against the location YAMLs). `wav(samples, rate)` in `gen-ui-sounds.js` is
  shared; the cue bytes must stay identical.
- **Titles** (round 042): screen and section titles use `<Title>` from `ui.js` (Literata Bold once loaded, through
  the `DisplayFont` context set in App). `expo-font` is mocked in `jest.setup.js`. Import only
  `@expo-google-fonts/literata/700Bold`, never the package root (it would bundle all faces; `font.test.js` checks).
  Card titles and the review word stay on the system font by design.

- **Sounds** (round 037): `mobile/src/sounds.js` (`playCue`), cues injected into the store
  (`createGameStore({ cue })`); jest mocks `expo-audio` in `jest.setup.js`. Regenerate the WAVs with
  `node mobile/scripts/gen-ui-sounds.js`; the test compares bytes, so a changed generator needs regenerated files.
  `expo-audio` needs its peer `expo-asset` (expo-doctor).
- **Saves** (rounds 038–039): `removeSave` locks the store (`isLoading`, new epoch), deletes on the server first
  (`api.deleteLearner`), then writes the record; `_loadSave` refuses an id no longer listed; `nextNumber` in the
  record keeps removed numbers from coming back. Store fakes need `deleteLearner`.
- **Token** (round 040): the app sends `X-ParaLLang-Token` from `EXPO_PUBLIC_PARALLANG_TOKEN`; jest deletes the variable
  at setup. Tests that need it pass `token` to `createLearningApi`.
- **Motion** (round 035): `mobile/src/motion.js` holds one app-wide Reduce Motion value; `<FadeIn>` decides once at
  mount and never fades while the value is unknown. Jest runs with Reduce Motion **on** (`jest.setup.js`); a test
  that wants a fade must turn it off, render a probe, settle, unmount, then render (see `motion.test.js`, `known()`),
  and call `resetReduceMotionForTests()` in `beforeEach`. **`screen.unmount()` is async**: await it, or later queries
  miss text with "overlapping act()" errors.
- **Theme test** (round 034): no literal `fontSize`, `lineHeight` or colour outside `mobile/src/components/ui.js`;
  every style with `color`/`fontWeight`/`fontStyle` names a `type.*` size unless it is listed in `MODIFIERS` (styles
  only combined with or nested in a sized one). A new text/background pair goes into the contrast list.
- **Map nodes are not dimmed** (`Button dim={false}`); unreachable labels use `colors.muted`.
- **Stem check** (round 033): every word of 4+ letters of every party conversation's target forms gives a 4-letter
  stem; no fragment (any kind) may hold a word starting with one. 3-letter words ("más", "più", "vez") are not
  caught: check by hand.

- **Second opinion rows are numbered by critique, `K.n`** (critique-1 → `1.1`…), even in a new round: round 032 wrote
  `2.n` in its pre-run table and needed Amendment 1. Run `round_log_check.py NNN` right after the freeze commit.
- **Recorded times: use `$(date -u +%H:%M:%S)` in the heredoc**, never type them (round 030 rows 4–5 are
  corrections again).
- **Fragments** (rounds 030, 032): `content/languages/<code>/lore/fragments.yaml`, optional file. A text must hold no
  surface form of any vocabulary entry of the pack (`foldWords` splits apostrophes: "vent'anni" hits `anni`), and no
  glossary meaning equal to a target's accepted translation; `after_conversations` fragments also no stem of their
  party conversation's targets. Draft the text, run the test, then rewrite. A new vocabulary entry whose form
  appears in a fragment fails `lore-fragments.test.js`: rewrite the fragment, not the test. Fixtures that remove an
  encounter must also drop its fragments (see `fixtureContent` in `encounters.test.js`).
- **Spellbook snapshot has `journeyFragments`** (translation and glossary `null`, `hidden: true` during encounters).
- **Save slots** (round 031): the app keeps `parallang.saveSlots` and still writes `parallang.learnerId` (active).
  Every store action captures `requestEpoch` and the learner and drops late replies; keep that in new actions.
  Store tests for saves use `fakeApi` in `mobile/src/__tests__/saves.test.js` (distinct ids per `createLearner(null)`).

- **`python3 tools/round_log_check.py` (all rounds) fails on round 012** since round 026 removed
  `server/test/fixtures/gerald-prompts-r012.json` (journal row 8 records it). Expected and append-only; check single
  rounds (`round_log_check.py NNN`) at close. Do not restore the file or edit the row.
- **The Rift drill** (round 029): a test or script that starts the Rift with due Spellbook cards in its target groups
  gets 409 `DRILL_REQUIRED`; clear it with `clearDrill(service, learnerId)` from `play-market.js`. The drill lives in
  `spellbook.drill` (only at the Rift, not completed). `createReviewChallenge(null)` serves drill cards first and
  skips stale cards.
- **A subagent critic can return twice**: the same background agent sent a second, different report after the freeze
  (round 029). Keep it as `critique-2.md` and dispose of it by Amendment.
- **A resolving turn's response now reflects its own progress** (round 028): `submitDialogue` records the
  completion (or the party member's count) before building the response. Before, the resolving turn's spellbook
  and anything derived from `completedEncounterIds` were one step stale.
- **Containment files** (round 028): `containment_file` on a location encounter (never a party conversation),
  `CM-NNN` designations unique per pack; `server/test/containment.test.js` checks no file contains a pack target or
  a word of its own encounter. Errata's file must stay identical in both packs (tested).
- **Mobile tests and the onboarding flag** (round 027): the store reads `parallang.onboardingSeen` at startup; a
  test without it is a first launch and fetches `/api/onboarding`. The existing fakes seed the flag (returning
  player); first-launch cases live in `mobile/src/__tests__/onboarding.test.js`. A missing `getOnboarding` in a
  fake is swallowed silently, so seed the flag in new store tests. `render` is async here: `await render(<App />)`,
  or the test ends before the render and jest fails with "require a file outside of the scope of the test code".
- **Critique without Codex** (round 027): a fresh general-purpose subagent with repo read access, given the plan
  path and file list only, returned a useful critique in ~70 s. Number the Second opinion rows `1.n` from the start
  (the log check needs them; round 027 needed an Amendment for it).

- **Quote the `folded` share, not `notInTranslation`** (round 067 addendum): by `folded` the tours are it 0.43 / es
  0.44 against 0.44 and the Rift 0.50 / 0.50; round 067's "Rift at 0.83" was the glitch artifact again.
- **The share estimate `notInTranslation` overcounts** in two cases (round 026 hand counts): glitched English
  (Errata: 0.67 by estimate, 0.33 by hand) and a `translation` field holding a summary, not a translation (0.93 vs
  0.37). Errata's "overshoot" in every tour since round 015 is mostly this artifact. Hand-count before acting on
  Errata's or any outlier's share.
- **A tour is 60 calls now** (not 45): the Rift and Fountain lines grew. Two tours, 80 replays and smaller runs used
  Codex's whole window in iteration 8 (~300 calls in ~55 min).

- **Test temp dirs** (round 024): use `makeTempDir(prefix)` from `server/test/helpers.js` in new tests; it removes
  the dir at process exit. Check with `TMPDIR=$(mktemp -d) node --test server/test/*.test.js` and `ls` that dir.
- **Content that must reach every narration line goes in the last objective's intent** (round 025): turns get the
  remaining objectives, so the last one is always there (greeting included), and the grader sees it too.
- **`docs/rounds/025/results/measure.py`** measures `--location cracked_fountain` reports (verdicts, open-target
  leaks, refrain, share with and without the refrain); adapt its regexes for other encounters.
- **Flick's party conversation** (`flick_slow_walk`) shares the changed quirk (the jingle) but was not re-run.

- **`/tmp` is a 64 MB tmpfs and the server tests never delete their save dirs** (`mkdtemp` `parallang-test-*`,
  `parallang-party-*`, …; 1,406 dirs / 17 MB by round 023, plus iOS exports). At 8 MB free, Claude Code's own temp
  output failed. Before a long session: `df -h /tmp`; remove your own `/tmp/parallang-*` dirs and export copies (no
  server running). Export iOS builds into a dir you delete afterwards.
- **No Python `yaml` module** in the sandbox: generate content as JSON and write YAML with the server's `js-yaml`
  (`docs/rounds/023/results/gen/`).
- **The overlap test** (`server/test/party-conversation.test.js`) checks every party vocabulary form against all
  other entries in its pack and an English blocklist; `buon`/`buen` inside `buon giorno`/`buen día` is the one
  allowed overlap (the matcher takes the longest match).

- **Party conversations** (round 022): an encounter file with `party_of: <location encounter>` and no `location`.
  The loader checks same character file, saveable, one per location encounter, not default, not in
  `requires_completed`. Its vocabulary file is not reviewed by the Rift (the Errata test excludes party targets).
  Adding a vocabulary file changes the aggregate `vocabulary.version` pinned in `encounters.test.js` and
  `language-engine.test.js`.
- **Keep `play-market.js` scripts in step with a revised plan** (round 022: a stale `riquísimo` line cost a run).
- **Narration turn prompts carry no location**; only the greeting names the place (round 022).
- **`docs/rounds/022/results/summarize.py`** summarises `--party` reports (verdicts, share, answer leaks).

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
