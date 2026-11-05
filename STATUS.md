# ParaLLang status

The entry point for agents: the current state, how the project is logged, and the round index.

## Current state (2026-11-05)

- **Built.** The Phase 2 Language Engine loop at The Coffee Cart in The Crumbling Market: Gerald the Imp's
  encounter, companion help, the Spellbook and spaced review ([round 001](docs/rounds/001/architecture.md)). It is
  playable through a Codex or Claude Code subscription CLI ([round 002](docs/rounds/002/architecture.md)).
- **Design sources.** [`parallang.md`](parallang.md) (vision and lore), [`prototype.md`](prototype.md) (technical
  blueprint) and [`parallang_obsidian/`](parallang_obsidian/Parallang.md), the owner's Obsidian notes on design,
  lore, characters, locations and quests. The notes are a copy of the vault in `~/Documents/Parallang`, taken
  2026-10-31.
- **Language.** Italian is the default target language; Spanish is still available. `TARGET_LANGUAGE` (`it` or
  `es`) selects a pack under `content/languages/`, and each language has its own Spellbook
  ([round 003](docs/rounds/003/architecture.md)).
- **App first.** Development is iPhone-first: the Expo / React Native app in `mobile/` plays the same loop and is
  tested in the iOS Simulator against the local server (`npm run dev:server`, `npm run dev:ios`). The web client in
  `client/` is frozen: it is kept working, but new features go to the app ([round 004](docs/rounds/004/architecture.md)).
- **World.** The app opens on the Crumbling Market map (six locations, fog of war, saved position;
  [round 005](docs/rounds/005/architecture.md)). Five of the six locations have encounters: the Market Entrance tutorial with
  Portia the Archway and a companion briefing ([round 009](docs/rounds/009/architecture.md)), Gerald at The Coffee
  Cart, Mortimer the Charcutier at The Butcher's Stall ([round 010](docs/rounds/010/architecture.md)), Flick the
  Letharger at The Cracked Fountain ([round 011](docs/rounds/011/architecture.md)) and Marginalia the Bookworm, who
  reads from *The Journey*, at The Old Bookshop ([round 013](docs/rounds/013/architecture.md)). The Rift is sealed until those five are complete ([round 014](docs/rounds/014/architecture.md)) and holds the boss, Errata, an infohazard in glitched mixed language who reviews every earlier vocabulary file ([round 015](docs/rounds/015/architecture.md)). New encounters are content only ([round 006](docs/rounds/006/architecture.md)). Defeated saveable NPCs can be saved to the player's party ([round 021](docs/rounds/021/architecture.md)). The autonomous run's backlog
  is in [`docs/autonomy/STATE.md`](docs/autonomy/STATE.md).
- **Tone.** The narration prompt carries the style guide (Pratchett × meme culture) and neither NPCs nor the
  grader's feedback give the answer away ([round 007](docs/rounds/007/architecture.md),
  [round 008](docs/rounds/008/architecture.md)), nor offer the answers as a menu to pick from
  ([round 012](docs/rounds/012/architecture.md)). The Spellbook hides meanings during encounters and on due cards
  ([round 017](docs/rounds/017/architecture.md)).
- **Next.** The owner plays the app in the Simulator and reviews the Italian content
  ([round 004 open items](docs/rounds/004/findings.md#open-items),
  [round 003 open items](docs/rounds/003/findings.md#open-items)).

## Addendum 2026-11-05: round 021, the party (autonomous)

A defeated NPC who is `saveable` (Gerald, Mortimer, Flick, Marginalia) can be saved to the player's party: the app
offers **Save** or **Leave** under the resolved encounter, Leave is not final (the map's location card keeps the
invitation), and the Party screen lists the members. The party is in the learner save (schema 3; v1 and v2 saves
migrate) and served by `GET /api/party` and `POST /api/party/recruit`. Also fixed: the HTTP start route dropped
`encounterId`, so the app started Gerald at every location (since round 009 this hid every other encounter in the
app; in-process runs never used the route). Codex critique 1 (8 findings: 5 accepted, 3 in part) decided
autonomously. Tests: server 122/122, mobile 33/33, web client 12/12 and build; live codex-cli: Gerald resolved and
recruited, and over real HTTP Portia starts at the entrance. Revisit conversations with party members are backlog
A8b. Not checked in the iOS Simulator. See [findings](docs/rounds/021/findings.md).

## Addendum 2026-11-05: round 020, a quirk for Portia's share, reverted (autonomous)

A character-sheet quirk putting Portia's formalities in the target language did not raise her share (Italian lines
0.17 against 0.16, greeting 0.13 against 0.12; 5 live runs, all resolved and graded as scripted, no leaks), so it was
reverted as decided before the run; content and code are as before the round. Re-reading round 019's runs shows its
real gain: Portia stopped modelling open answers ("Buongiorno!", "Come ti chiami?") in 5 of 12 lines → 0. Codex
critique 1 (9 findings: 4 accepted, 5 in part) decided autonomously. Backlog E1 is now a template question. See
[findings](docs/rounds/020/findings.md).

## Addendum 2026-11-05: round 019, Portia's own words (autonomous)

Encounters may list `ambient_vocabulary_ids`, authored words the NPC may use in any line that answer no objective;
the narration prompt lists them (with usage notes) only for such encounters, so Gerald's pinned prompts are
unchanged. Portia's tutorial has *benvenuto, piacere, mercato* / *bienvenido, mucho gusto, mercado*, the words she
was already using unauthored, and her sign quirk no longer names the Italian *MERCATO*. Codex critique 1 (12 findings:
7 accepted, 3 in part, 2 rejected) decided autonomously. Tests: server 114/114, mobile 25/25, web client 12/12 and
build. Live codex-cli, 9 runs: all resolved and graded as scripted; the words are chipped in every Italian line
(backlog E2 done), but her share of target language did not rise (lines 0.17 → 0.16), so backlog E1 stays open with
a content hypothesis. Not checked in the iOS Simulator. See [findings](docs/rounds/019/findings.md).

## Addendum 2026-11-05: round 018, claude-cli on a subscription OAuth token (autonomous)

Following the supervisor note, the claude-cli provider also accepts a Claude subscription OAuth token from
`CLAUDE_CODE_OAUTH_TOKEN`: the token goes to Claude CLI children only, the preflight accepts a logged-out or OAuth
status when the token is present, and API keys, auth tokens, base URLs and Bedrock/Vertex switches are refused on
every route. Codex critique 1 (7 findings, all accepted) decided autonomously. Tests: server 108/108, mobile 25/25,
web client 12/12 and build. Not live: this iteration's shell has no token, so the live preflight still refuses.
See [findings](docs/rounds/018/findings.md).

## Addendum 2026-11-05: round 017, the Spellbook stops giving answers away (autonomous)

The app's Spellbook no longer shows the answers the game is asking for (round 001's audit): while an encounter is
under way no card shows a meaning, note or example translation and reviews are refused (409 `IN_ENCOUNTER`, also for
a challenge issued earlier); between encounters a due card hides its meaning until reviewed, and the other cards
show their authored notes (round 003's deferred item). Codex critique 1 (6 findings: 4 accepted, 2 in part) widened
the plan from the current line's words to the whole Spellbook, decided autonomously. Tests: server 103/103, mobile
25/25, web client 12/12 and build, iOS export ok; no live runs (no prompt or content change). The frozen web client
still shows meanings. Not checked in the iOS Simulator. See [findings](docs/rounds/017/findings.md).

## Addendum 2026-11-05: round 015, the Rift boss (autonomous)

The Rift has its boss: Errata, a Rift-born infohazard made of mistranslations (LORE.md), speaks glitched English and
clean Italian or Spanish at a fixed 0.50 ratio and reviews all five earlier vocabulary files in three objectives (a
coffee and a meat, stop now, "my name is Nobody"); her encounter refuses to start while the Rift is sealed. Codex
critique 1 (7 findings: 5 accepted, 2 rejected) decided autonomously. Tests: server 101/101, mobile 22/22, web client
12/12 and build. Live codex-cli, across two iterations because of Codex's usage limit: every run that reached the
provider resolved with every scripted line graded as intended (Italian 3 runs, Spanish 1), 0 feedback leaks; the
Italian tour played all six encounters in one save (27/27 lines, 60 calls). The share measure counts glitched
English as target language (0.73–0.86 against 0.07–0.17 canonical). Not checked in the iOS Simulator. See
[findings](docs/rounds/015/findings.md).

## Addendum 2026-11-05: round 016, Expo dependency update (autonomous)

`npx expo-doctor` passes 20/20 again: `npx expo install --fix` moved `expo` to ~58.0.23, `jest-expo` to ~58.0.14 and
`react-native-safe-area-context` to ~5.11.1 (upstream releases; no source change). No critique (version bumps only;
Codex at its usage limit), decided autonomously. Tests: mobile 22/22, iOS export ok, server 101/101, web client 12/12
and build. Not checked in the iOS Simulator. Round 015 (the Rift boss) was still open, waiting for its live runs; it closed
after. See [findings](docs/rounds/016/findings.md).

## Addendum 2026-11-05: round 014, the Rift gate (autonomous)

The Rift is sealed until the other five encounters are complete: a location may list `requires_completed`
encounter ids, the map snapshot carries `gate: { sealed, required, completed }`, a move in is refused with 409
`SEALED`, and the app shows a disabled sealed node ("Sealed 4/5"). `play-market.js --tour` plays the whole market in
one save. Codex critique 1 (5 findings: 4 accepted, 1 rejected) decided autonomously. Tests: server 96/96, mobile
22/22, web client 12/12 and build. Live codex-cli Italian tour: 5/5 encounters resolved, 20/20 verdicts as intended,
Rift refused at 4 of 5 and open after, 45 calls in 6 min 50 s; Portia's tutorial carries about a third of its
requested target language, the other encounters meet theirs. The Rift boss (A7b) is next. Not checked in the iOS
Simulator. See [findings](docs/rounds/014/findings.md).

## Addendum 2026-11-05: round 013, The Old Bookshop and The Journey (autonomous)

The Old Bookshop has its encounter: Marginalia the Bookworm reads two passages of *The Journey*, the legend of
Journathan from the owner's notes, and asks where he is going and what name he gave the Cyclops (Nessuno / Nadie,
the first translation trick). The passages are authored in the objectives (content only), with a reading-context
exception so reported speech passes. Codex critique 1 (5 findings: 4 accepted, 1 rejected) decided autonomously.
Tests: server 90/90, mobile 20/20, web client 12/12 and build. Live codex-cli: her greeting did not read the first
passage (3/3), fixed by an Amendment (3/3 after); 6/6 runs resolved, 30/30 verdicts as intended, 0 feedback leaks.
Not checked in the iOS Simulator. See [findings](docs/rounds/013/findings.md).

## Addendum 2026-11-05: round 012, no menus of the answers (autonomous)

A narration style rule now forbids NPCs offering an open objective's target words as options ("Vuoi salame,
salsiccia o pollo?"), which turned recall into recognition. Gerald's pinned prompts were regenerated on purpose
(`gerald-prompts-r012.json`). Codex critique 1 (one Cut, rejected) decided autonomously. Tests: server 88/88, mobile
20/20, web client 12/12 and build. Live codex-cli: 6/6 runs resolved with unchanged verdicts; menus 0/4 runs after
against 4/4 before; no dictation. Portia may still model "Come ti chiami?" (pending owner review). The freeze commit
alone fails the golden test (a staged fixture removal; fixed in the next commit). See
[findings](docs/rounds/012/findings.md).

## Addendum 2026-11-05: round 011, The Cracked Fountain (autonomous)

The Cracked Fountain has its encounter: Flick the Letharger, a corner-of-the-eye creature from the owner's notes who
farms brainrot and wants everything done later. The player tells it to stop, tells it which way to go and insists on
now, in Italian or Spanish (content only). `play-market.js` now walks the shortest route and takes `--lines`. Codex
critique 1 (4 findings: Spanish `detente` and `recto` dropped as English words; two Cuts rejected) was decided
autonomously. Tests: server 88/88, mobile 20/20, web client 12/12 and build. Live codex-cli: 4/4 runs resolved, 24/24
scripted verdicts as intended (a surface variant included), 0/60 feedback leaks; Flick listed both directions once
(1/4), as Mortimer lists meats (backlog E3). Not checked in the iOS Simulator. See
[findings](docs/rounds/011/findings.md).

## Addendum 2026-11-05: round 010, The Butcher's Stall (autonomous)

Mortimer the Charcutier calls every cut ham; the player names a real meat (asking for ham fails) and says how much,
with a unit (a bare unit fails); Italian and Spanish, content only. The first live Italian runs found an old grading
bug: the rubric never showed authored surface forms, so plurals such as "etti" passed without evidence and the server
rejected the verdict. The rubric now lists them (Amendment). Codex critique 1: 7 findings, accepted in full or in
part, autonomously. Tests: server 85/85, mobile 20/20, web client 12/12 and build. Live codex-cli after the fix:
butcher 3/3 resolved with every scripted line graded as intended, Gerald's `verify:cli` 9/9. Mortimer offers the
passing meats as a menu after a wrong request (3/3). See [findings](docs/rounds/010/findings.md).

## Addendum 2026-11-05: round 009, the Market Entrance tutorial (autonomous)

Where every player starts, Portia the Archway now asks for a greeting, the player's name and her own name back
(greetings, pronouns; Italian and Spanish), and a static "Your companion" card explains word and sentence help, the
hint allowance and the Spellbook. Narration word chips are now matched against the played encounter's vocabulary
only. Codex critique 1: 9 findings, all accepted in full or in part, autonomously. Tests: server 82/82, mobile 20/20,
web client 12/12 and build. Live codex-cli: tutorial 4/4 resolved (3 Italian, 1 Spanish), every objective passed
first time, Gerald unchanged, no answers given away; Portia's lines carry less target language than requested. Not
checked in the iOS Simulator. See [findings](docs/rounds/009/findings.md).

## Addendum 2026-11-05: round 008, grader feedback (autonomous)

One rule in the grading prompt: feedback is shown to the learner, so it must never contain the target-language
answer to an objective not yet passed. Codex critique 1: 7 of 9 findings accepted autonomously. Live codex-cli in
Italian: `verify:cli` 9/9, three playthroughs with unchanged verdicts, and 0 of 29 feedback strings leaked an answer
(3/7 and 3/6 before). See [findings](docs/rounds/008/findings.md).

## Addendum 2026-11-05: round 007, tone layer and no dictated answers (autonomous)

The style guide now reaches the narration prompt, updated to the owner's Pratchett × meme-culture notes (English
only; target-language dialogue stays beginner-level), with a rule against telling the player what to say. Codex
critique 1: 9 of 10 findings accepted autonomously. Live codex-cli in Italian, 3 runs before and after: Gerald
dictated the answer in 3/3 → 0/3 runs, and the player's "Senza latte" went from quality 2 to 5. The grader's
feedback still gives the answer away (2/3): next round. See [findings](docs/rounds/007/findings.md).

## Addendum 2026-11-05: round 006, the multi-encounter engine (autonomous)

Encounters are now content: every encounter and vocabulary file in a language pack loads, each encounter sits at
one map location, and the app starts the encounter of the place you stand in (the server checks, 409 `NOT_HERE`).
Names, the location and the victory message come from content; requests without an encounter id (the frozen web
client) get the pack's `default_encounter`. Codex critique 1 (10 findings) accepted autonomously. Tests: server
77/77, mobile 19/19, web client 12/12 and build. Live codex-cli: Gerald resolved as before, prompts byte-identical.
Gerald dictated the answer again. See [findings](docs/rounds/006/findings.md).

## Addendum 2026-11-05: round 005, the Crumbling Market map (autonomous)

First round of the 72-hour autonomous run (branch `autonomous`, no owner present; backlog and decisions in
[`docs/autonomy/`](docs/autonomy/STATE.md)). The app now opens on a map of the six Crumbling Market locations, with
fog of war; position, visited places and completed encounters are saved (save schema 2, version 1 saves migrate),
and Gerald is entered from The Coffee Cart. Optional `PARALLANG_TOKEN` guards the API. Codex critique 2 (9
findings; critique 1 could not run in the container) was decided autonomously, pending owner review. Tests: server
73/73, mobile 18/18, web client 12/12 and build. Live codex-cli in Italian: map playthrough resolved, `verify:cli`
9/9. Not checked in the iOS Simulator. Found: Gerald dictates the answer, which the grader scores quality 2. See
[findings](docs/rounds/005/findings.md).

## Addendum 2026-10-31: round 004, iPhone app first

Round 004 moved development to an Expo / React Native iPhone app in `mobile/`, built alongside round 003 in a
separate worktree and rebased onto it. Codex critique 1 (10 findings) was accepted in full. Mobile tests pass
(15/15), as does `expo-doctor` (20/20); the frozen web client still passes 12/12 and builds. Every live step ran in
an iPhone 17 Simulator with the Codex CLI provider: a word and a sentence revealed, a due review answered, the order
resolved, the server-down message shown with the reply kept. Pronunciation was confirmed only as far as iOS speech
synthesis starting. The live run found two problems, both fixed: Expo now serves on localhost, and
`server/nodemon.json` stops learner saves from restarting `npm run dev:server` (an owner-approved Amendment). See
[findings](docs/rounds/004/findings.md).

## Addendum 2026-10-31: lore notes, Journathan and infohazards

Owner-requested additions to the design notes, made in `parallang_obsidian/` and synced into the vault at
`~/Documents/Parallang`. New character Journathan, a hero of old modelled on Odysseus, whose legend is *The Journey*
(`CHARACTERS.md`). The Pratchett style section now adds a contemporary meme-culture layer (`GAME MECHANICS.md`). A new
Infohazards lore subsection draws on Lovecraft and Pratchett (classic) and SCP (modern): dangerous memes native to the
foreign realm that breach through the strings (`LORE.md`). The notes are cross-linked with Obsidian wikilinks. The
game's tone files (`content/narration/style_guide.yaml`, `content/characters/enemies/imp_coffee.yaml`) still describe
the Pratchett-only tone.

## Addendum 2026-10-31: round 003, Italian by default

Round 003 was the first round recorded with the round log. It made the target language configurable, with Italian
as the default and Spanish kept. Codex critique 1 (14 findings) was accepted in full. Tests pass: server 65/65 and
client 12/12. A live Codex run in Italian passed 9/9 cases and resolved the encounter. Open items: the owner's review
of the Italian content, and a manual browser pass. See [findings](docs/rounds/003/findings.md).

## How the project is logged

| Record | Where | Form | Rule |
|---|---|---|---|
| **Status** | This file | Current state, dated addenda (newest first) and the round index | One addendum per piece of work |
| **Design decisions** | `docs/rounds/NNN/architecture.md` | Goal, owner decisions, Second opinion, design, tests (pre-run); dated Amendments, Status and Outcome | Rounds 001–002 ran through the round pipeline (`packet.md`, `implement.md`, `audit-1`, `fix-1`, `verify-1`, `round.json`). From round 003, conversational rounds are recorded with the `round-log` skill |
| **Findings** | From round 003: `docs/rounds/NNN/findings.md` | Question, Finding, Method, Results, Decision, Evidence, Claim boundary, Open items | One per round |
| **Round trail** (from round 003) | `docs/rounds/NNN/trail/`: `journal.md`, `interview.md`, `plan-vK.md`, `critique-K.md`, `review-K.md` | Append-only journal (one row per event, occurred and recorded times); exact drafts as sent; raw critiques verbatim | Written by the `round-log` skill as each event happens. Not read for implementing; each item is summarised and linked from `architecture.md` or `findings.md`. Checked with `python3 tools/round_log_check.py NNN` |
| **Proposals** (work without a round) | `docs/proposals/<YYYY-MM-DD>-<topic>.md`, trail in `<proposal>-trail/` next to it | Goal, problem, change, Second opinion table | Written before the work |
| **Implementation** | The code, tests and README | A `built` journal row names the commit subject; its Record is the main paths changed | Verification commands go in the round's Tests section and the README |

The project has no environment registry or paper ledgers; the round-log steps for those do not apply.

## Round index

Newest first.

| Round | Date | Topic | Design record | Findings | Commits |
|---|---|---|---|---|---|
| 020 | 11-05 | Portia's formalities in the target language: a character-sheet quirk (backlog E1, second try) (autonomous) | [020](docs/rounds/020/architecture.md) | [findings](docs/rounds/020/findings.md) | `4492e02` (pre-run record) to round 020 close (quirk reverted) |
| 021 | 11-05 | Party recruitment: SAVE / LEAVE after a saveable NPC, party in the save, Party screen (backlog A8a); start route keeps `encounterId` (autonomous) | [021](docs/rounds/021/architecture.md) | [findings](docs/rounds/021/findings.md) | `9e51acd` (pre-run record) to round 021 close |
| 019 | 11-05 | Portia's own words: ambient vocabulary so the tutorial speaks its share of target language (backlog E1, E2) (autonomous) | [019](docs/rounds/019/architecture.md) | [findings](docs/rounds/019/findings.md) | `55eacb2` (pre-run record) to round 019 close |
| 018 | 11-05 | claude-cli accepts a subscription OAuth token from the environment (supervisor note) (autonomous) | [018](docs/rounds/018/architecture.md) | [findings](docs/rounds/018/findings.md) | `b6fbd9e` (pre-run record) to round 018 close |
| 017 | 11-05 | The Spellbook stops giving answers away: no meanings or reviews during an encounter, due cards hide theirs, notes shown (backlog D3) (autonomous) | [017](docs/rounds/017/architecture.md) | [findings](docs/rounds/017/findings.md) | `7657879` (pre-run record) to round 017 close |
| 016 | 11-05 | Expo patch and minor updates so expo-doctor passes again (backlog D4) (autonomous) | [016](docs/rounds/016/architecture.md) | [findings](docs/rounds/016/findings.md) | `76dea06` (pre-run record) to round 016 close |
| 015 | 11-05 | The Rift boss: Errata, an infohazard in glitched mixed language, reviewing every earlier vocabulary file (autonomous) | [015](docs/rounds/015/architecture.md) | [findings](docs/rounds/015/findings.md) | `82371f9` (pre-run record) to round 015 close |
| 014 | 11-05 | The Rift gate: sealed on the map until the other five encounters are complete; live full-market tour (autonomous) | [014](docs/rounds/014/architecture.md) | [findings](docs/rounds/014/findings.md) | `14a5830` (pre-run record) to round 014 close |
| 013 | 11-05 | The Old Bookshop: Marginalia the Bookworm, reading passages of *The Journey* (Journathan, the Cyclops trick) (autonomous) | [013](docs/rounds/013/architecture.md) | [findings](docs/rounds/013/findings.md) | `c1505f5` (pre-run record) to round 013 close |
| 012 | 11-05 | No menus of the answers: narration rule against listing an open objective's targets; Gerald's golden prompts regenerated (autonomous) | [012](docs/rounds/012/architecture.md) | [findings](docs/rounds/012/findings.md) | `9e87913` (pre-run record) to round 012 close |
| 011 | 11-05 | The Cracked Fountain: Flick the Letharger (commands, directions, now not later); play-market route and `--lines` (autonomous) | [011](docs/rounds/011/architecture.md) | [findings](docs/rounds/011/findings.md) | `f078d3e` (pre-run record) to round 011 close |
| 010 | 11-05 | The Butcher's Stall: Mortimer the Charcutier (meats, quantities); grading rubric shows surface forms (autonomous) | [010](docs/rounds/010/architecture.md) | [findings](docs/rounds/010/findings.md) | `a90ff32` (pre-run record) to round 010 close |
| 009 | 11-05 | Market Entrance tutorial: Portia the Archway (greetings, pronouns), companion briefing, per-encounter narration matching (autonomous) | [009](docs/rounds/009/architecture.md) | [findings](docs/rounds/009/findings.md) | `a59f548` (pre-run record) to round 009 close |
| 008 | 11-05 | Grader feedback stops giving the answer away (autonomous) | [008](docs/rounds/008/architecture.md) | [findings](docs/rounds/008/findings.md) | `e525608` (pre-run record) to round 008 close |
| 007 | 11-05 | Tone layer: style guide in the narration prompt (Pratchett × meme culture), no dictated answers (autonomous) | [007](docs/rounds/007/architecture.md) | [findings](docs/rounds/007/findings.md) | `d9b0861` (pre-run record) to round 007 close |
| 006 | 11-05 | Multi-encounter engine: encounters per location from pack content, location-checked start, names from content (autonomous) | [006](docs/rounds/006/architecture.md) | [findings](docs/rounds/006/findings.md) | `e01baf1` (pre-run record) to round 006 close |
| 005 | 11-05 | The Crumbling Market map: six locations, paths, fog of war, saved position; Gerald entered from The Coffee Cart (autonomous) | [005](docs/rounds/005/architecture.md) | [findings](docs/rounds/005/findings.md) | `1a21bdb` (pre-run record) to round 005 close |
| 004 | 10-31 | iPhone app first: Expo / React Native app in `mobile/`, tested in the iOS Simulator against the local server; web client frozen | [004](docs/rounds/004/architecture.md) | [findings](docs/rounds/004/findings.md) | `8f4c456` (pre-run record) to round 004 close |
| 003 | 10-31 | Italian by default: configurable target language packs, Italian Gerald content, per-language Spellbooks | [003](docs/rounds/003/architecture.md) | [findings](docs/rounds/003/findings.md) | `4f7bbd3` (pre-run record) to round 003 close |
| 002 | 10-11 | Playtest ParaLLang through Codex and Claude Code subscriptions: CLI providers for narration and grading, provider check, live verification | [002](docs/rounds/002/architecture.md) and pipeline files | [verify-1](docs/rounds/002/verify-1.md) | `baca831` (architecture and packet) to `8577c26` (finish) |
| 001 | 10-11 | Phase 2 Language Engine at The Coffee Cart: grading, companion help, Spellbook, spaced review, persistence | [001](docs/rounds/001/architecture.md) and pipeline files | [audit-1](docs/rounds/001/audit-1.md) | `3c6ce2b` (architecture and packet) to `d272a1e` (finish) |
