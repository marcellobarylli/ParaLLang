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
  reads from *The Journey*, at The Old Bookshop ([round 013](docs/rounds/013/architecture.md)). The Rift is sealed until those five are complete ([round 014](docs/rounds/014/architecture.md)) and holds the boss, Errata, an infohazard in glitched mixed language who reviews every earlier vocabulary file ([round 015](docs/rounds/015/architecture.md)). New encounters are content only ([round 006](docs/rounds/006/architecture.md)). Defeated saveable NPCs can be saved to the player's party ([round 021](docs/rounds/021/architecture.md)) and talked to again anywhere ([round 022](docs/rounds/022/architecture.md)). The autonomous run's backlog
  is in [`docs/autonomy/STATE.md`](docs/autonomy/STATE.md).
- **Tone.** The narration prompt carries the style guide (Pratchett × meme culture) and neither NPCs nor the
  grader's feedback give the answer away ([round 007](docs/rounds/007/architecture.md),
  [round 008](docs/rounds/008/architecture.md)), nor offer the answers as a menu to pick from
  ([round 012](docs/rounds/012/architecture.md)). The Spellbook hides meanings during encounters and on due cards
  ([round 017](docs/rounds/017/architecture.md)).
- **Next.** The owner plays the app in the Simulator and reviews the Italian content
  ([round 004 open items](docs/rounds/004/findings.md#open-items),
  [round 003 open items](docs/rounds/003/findings.md#open-items)).

## Addendum 2026-11-05: round 026 closed, the language-mix rule kept (autonomous)

The shared prompt's language-mix rule ("in a 20-word line, about K words", without "greetings" after Amendment 2)
stays. After-build tours against the baseline: the mean line gap fell from 0.12 to 0.07 (it) and from 0.15 to 0.14
(es). By hand, every greeting is within 0.07 of its target, and Portia, short since round 009, now reaches hers. Both
tours passed (6/6, gate held and opened, 60 calls each). Reading them found no new kind of open-answer line. Backlog
E1 is closed ([open items](docs/rounds/026/findings.md#open-items)).

## Addendum 2026-11-05: round 044, a leak scan over every live report (autonomous)

`server/scripts/leak-scan.js` flags NPC lines that give away an open objective's answer, including words inside
multi-word answers. It marks echoes of the player and passages quoted from an intent. Over all 611 lines in 84
earlier reports there are 6 near-leaks, all topic words ("Vuoi latte?", "¿Quieres más?"), and no prompt change was
made for them. Whole-form leaks fell after rounds 007 and 012; since round 020, only greetings and Errata's frame
words remain. Critiqued by a Claude subagent (14 findings: 12 accepted, 2 in part). Server 172/172
([open items](docs/rounds/044/findings.md#open-items)).

## Addendum 2026-11-05: round 043, the Party screen's story hint (autonomous)

Each party member's card now counts down to the member's next *Journey* fragment ("2 more finished conversations
until Gerald tells you a story."), without naming it. Once the story is found, the card points to the Spellbook. The
server derives the count with the same rule that files the fragment. Opening the Party screen refreshes the party.
Critiqued by a Claude subagent (8 findings: 7 accepted, 1 in part). Server 165/165, mobile 120/120
([open items](docs/rounds/043/findings.md#open-items)).

## Addendum 2026-11-05: round 042, a display font for titles (autonomous)

Screen and section titles now use Literata Bold (SIL Open Font License 1.1, from `@expo-google-fonts/literata`; one
256 KB face). It loads at runtime with `expo-font`, and the app never waits for it. Titles keep the system font until
it loads, or if it fails; all other text stays on the system font. The licence notice is in
`mobile/THIRD_PARTY_NOTICES.md`. Critiqued by a Claude subagent (9 findings: 8 accepted, 1 in part). Mobile 110/110
([open items](docs/rounds/042/findings.md#open-items)).

## Addendum 2026-11-05: round 041, ambient audio per location (autonomous)

Each of the six locations now has a quiet 6-second loop, synthesized by `mobile/scripts/gen-ambient.js` (no
third-party assets). The loop for the player's current location plays on every screen but the first-launch
statement. The Sounds switch turns it off along with the cues, and it ducks while the pronunciation voice speaks.
Critiqued by a Claude subagent (10 findings: 9 accepted, 1 in part; its Error was bass a phone speaker cannot play).
Mobile 105/105. Nobody has heard the loops yet ([open items](docs/rounds/041/findings.md#open-items)).

## Addendum 2026-11-05: round 040, the app and the server token (autonomous)

The app can now play against a server started with `PARALLANG_TOKEN`. Start Expo with the same value in
`EXPO_PUBLIC_PARALLANG_TOKEN` (see the README). A missing, wrong or malformed token each gets its own message, and
none shows the value. Critiqued by a Claude subagent (6 findings, all accepted). Mobile 95/95
([open items](docs/rounds/040/findings.md#open-items)).

## Addendum 2026-11-05: round 039, deleting a removed save on the server (autonomous)

Removing a save on the Saves screen now deletes it on the server first, through `DELETE /api/learner`. The delete
also takes any temporary copy a failed write left behind, and it waits for a request in flight. If the server cannot
delete it, the save stays on the device. The alert says it cannot be undone. Critiqued by a Claude subagent
(6 findings: 4 accepted, 2 in part). Server 162/162, mobile 91/91
([open items](docs/rounds/039/findings.md#open-items)).

## Addendum 2026-11-05: round 038, removing a save (autonomous)

A save other than the current one can now be removed from the device: "Remove" on the Saves screen, then the system
alert's destructive button. The removal locks the store, so a save cannot come back by a race, a stale key or a
reused "Save N" label. The server keeps the file, and the alert says only what the device does. Renaming is not
built. Critiqued by a Claude subagent (7 findings, all accepted). Mobile 90/90
([open items](docs/rounds/038/findings.md#open-items)).

## Addendum 2026-11-05: round 037, UI sounds (autonomous)

The app plays two short cues, synthesized by a committed script (no third-party assets): one when the current
objective is met or a review is correct, one when an encounter is won. A miss plays nothing. A "Sounds" switch on the
Saves screen turns them off, and the silent switch mutes them. New dependencies: `expo-audio` and its peer
`expo-asset`. Critiqued by a Claude subagent (9 findings, all accepted). Mobile 86/86, expo-doctor 20/20. Not heard
on a device ([open items](docs/rounds/037/findings.md#open-items)).

## Addendum 2026-11-05: round 036, where each fragment came from (autonomous)

Each of the Spellbook's seven Journey fragments now says "Told by Marginalia" or "Found at The Old Bookshop", on screen
and in its accessible label. The server adds the teller's name (`toldBy`) to conversation fragments. Critiqued by a
Claude subagent (3 findings accepted, 4 checks). Server 157/157, mobile 79/79. Not seen in the Simulator
([open items](docs/rounds/036/findings.md#open-items)).

## Addendum 2026-11-05: round 035, transitions (autonomous)

New dialogue lines, a new assessment, the victory banner and a new screen fade in over 200 ms. Under Reduce Motion
nothing moves, and nothing moves until the setting is known. Lines already on screen when an encounter appears
(opening, resume, restart) do not fade, and the list's auto-scroll follows the setting. Line heights are now tokens.
Critiqued by a Claude subagent (8 findings: 6 accepted, 2 in part), which found three ways the first plan would have
flashed or missed fades. Mobile 78/78. Not seen in the Simulator ([open items](docs/rounds/035/findings.md#open-items)).

## Addendum 2026-11-05: round 034, type scale and palette (autonomous)

The app has one type scale (ten sizes named after Apple's text styles, in `mobile/src/components/ui.js`) and one
palette. A test keeps literal sizes and colours out of every other file, and checks that each text colour meets
WCAG's 4.5:1 on the backgrounds it is used on. Text that was at 14 points (set by hand or left at React Native's
default) is now 15. Map nodes you cannot walk to are no longer faded to 45%, which made "you are here" hard to read;
their labels are muted instead. Critiqued by a Claude subagent (8 findings: 6 accepted, 2 in part). Mobile 74/74.
Not seen in the Simulator ([open items](docs/rounds/034/findings.md#open-items)).

## Addendum 2026-11-05: round 033, unlocks for Mortimer, Flick and Marginalia (autonomous)

Each of the other three party members now recites a fragment of *The Journey* after three resolved conversations:
Mortimer the Sun's forbidden herd, Flick the lotus ("five minutes", then five more), Marginalia the old dog who alone
knows Journathan. Content and tests only. The leak check now stems every word of every party conversation's answers
and runs over every fragment; it caught one word in round 030's Spanish text, now reworded. Critiqued by a Claude
subagent (7 findings, all accepted). Server 157/157, mobile 69/69. Not seen in the Simulator; the texts await a
native speaker ([open items](docs/rounds/033/findings.md#open-items)).

## Addendum 2026-11-05: round 032, Gerald remembers the Dead Branch (autonomous)

The first relationship unlock (prototype.md §4.2). After his third resolved coffee break, Gerald recites "The word
for it", a fragment of *The Journey* in which Journathan drinks something dark and bitter in the Dead Branch. The
word for that drink died with the branch. The fragment joins round 030's fragments in the Spellbook, and the
resolved screen notes it on that third break only. A test checks that its text holds no vocabulary form of the pack
and no stem of the coffee break's answers. The plan was critiqued by a Claude subagent (7 findings: 6 accepted,
1 in part). Server 156/156, mobile 68/68. Not seen in the Simulator; the texts await a native speaker
([open items](docs/rounds/032/findings.md#open-items)).

## Addendum 2026-11-05: round 031, save slots (autonomous)

The app keeps up to three saves on one device (backlog A11, prototype.md "save slots"). Each save is a learner on
the server, so the server did not change. A "Saves" button on the map's header opens a screen that continues another
save or starts a new one. An older install's learner becomes "Save 1". A switch reloads the save from the server,
including the encounter the server holds for it, and resets every per-save field. Every store action now drops a
reply that lands after a switch. The plan was critiqued by a Claude subagent (10 findings: 9 accepted, 1 in part).
Mobile 67/67. Deleting or renaming saves is not built. Not seen in the Simulator
([open items](docs/rounds/031/findings.md#open-items)).

## Addendum 2026-11-05: round 030, fragments of The Journey (autonomous)

The market now hides optional passages of *The Journey* in the target language (backlog A9; CHARACTERS.md: "Optional
to translate, but they give juicy lore"). There are three per pack: the first stitch after Marginalia, the Sirens
after Flick, and the shroud after Errata. Each is filed in the Spellbook when its encounter is completed. The
glossary of advanced words and the English translation sit behind a Show translation toggle. During an encounter
the server withholds both. The resolved encounter screen says which fragment from there is in the Spellbook. A test
checks that no text contains any vocabulary form of its pack, so no fragment answers an NPC. The plan was critiqued
by a Claude subagent (10 findings: 9 accepted, 1 in part), since Codex was at its usage limit. Server 154/154,
mobile 56/56. The texts await a native speaker, and nothing has been seen in the Simulator
([open items](docs/rounds/030/findings.md#open-items)).

## Addendum 2026-11-05: round 029, forced repetition before the Rift (autonomous)

Before the first fight with Errata, the Rift now runs a Spellbook drill (backlog C1, prototype.md Phase 4). Each of
the boss's six answer slots whose cards are all due needs one review, so the drill is at most six cards. Starting
the fight earlier is refused with 409 `DRILL_REQUIRED`. The map shows the count with a review button, or names the
conversation that must be finished first. `play-market.js --tour` clears the drill before the Rift and reports
`drillCards`. Server 148/148, mobile 51/51. Not yet run live or seen in the Simulator
([open items](docs/rounds/029/findings.md#open-items)).

## Addendum 2026-11-05: round 028, containment files in the Spellbook (autonomous)

The Spellbook now keeps a deadpan SCP-style containment file for each infohazard the player has dealt with
(backlog B4, LORE.md): CM-001 for Flick's jingle at the Cracked Fountain and CM-002 for Errata at the Rift. Each file
has a class, virulence, harm, incubation, vector, containment and notes. A file is added when its encounter is
completed, not on a visit, so it never explains a hazard before the player has met it. A test checks that no file
contains an answer. The build also fixed a resolving turn that returned stale progress. Server 142/142, mobile 47/47.
Not yet seen in the Simulator ([open items](docs/rounds/028/findings.md#open-items)).

## Addendum 2026-11-05: round 027, the philosophy statement on first launch (autonomous)

The app now greets a first-time player with the game's philosophy statement before the map (backlog C2). The
statement is the owner's text from `parallang.md`, word for word, followed by two authored notes: one on the
Spellbook's structured repetition, and one handing over to the archway. The text is content
(`content/narration/onboarding.yaml`) and the server serves it at `GET /api/onboarding`. The screen shows once per
device. It never blocks startup: if the fetch fails, the screen is skipped. Server 138/138, mobile 45/45. The plan
was critiqued by a Claude subagent because Codex was at its usage limit. Not yet seen in the Simulator
([open items](docs/rounds/027/findings.md#open-items)).

## Addendum 2026-11-05: round 025, the Fountain's infohazard (autonomous)

Flick's jingle at the Cracked Fountain is now a named brainrot infohazard: *Dopo, dopo, domani!* / *¡Después,
después, mañana!* ("later, later, tomorrow"). The companion gives a containment notice when the encounter starts,
and a plaque on the fountain reads PLEASE DO NOT HUM. Humming the jingle back fails the "insist on now" objective.
"Stop!" is no longer rejected as English-only, because it is also Italian and Spanish (Codex critique 1: 7
findings, 5 accepted, 2 in part, decided autonomously). Tests: server 133/133, mobile 37/37, web client 12/12 and
build. Live codex-cli: 3 of 3 runs resolved with every verdict as scripted. The refrain ended all 21 of Flick's
lines, and no line gave an answer away. The refrain takes up part of the target-language share (0.39 without it,
against 0.53 before), which is evidence for backlog E1. Backlog B3 is done. Not checked in the iOS Simulator. See
[findings](docs/rounds/025/findings.md).

## Addendum 2026-11-05: round 024, server tests clean up their temp dirs (autonomous)

The server tests no longer leave save directories in `/tmp` (34 per run before, which filled the 64 MB tmpfs over
many runs). `makeTempDir` in `server/test/helpers.js` removes them when each test process exits (Codex critique 1:
6 findings, 3 accepted, 2 in part, 1 rejected, decided autonomously). Tests: server 131/131, mobile 37/37, web
client 12/12 and build. Test code only; no gameplay change. See [findings](docs/rounds/024/findings.md).

## Addendum 2026-11-05: round 023, every party member can talk (autonomous)

Mortimer (a tasting: say you like it, ask for more), Flick (a slow walk: let's go, together) and Marginalia (a
fragment of *The Journey*: praise the story, ask her to read it again) have party conversations in Italian and
Spanish, so every saveable character has one. Spanish asks for *un poco más* and *juntos*, because bare *más* and
*juntas* match English words (Codex critique 1: 11 findings, 7 accepted, 3 in part, 1 rejected, decided autonomously).
A new test checks party vocabulary against an English blocklist and every other form in the pack. Tests: server
130/130, mobile 37/37, web client 12/12 and build. Live codex-cli: 6 of 6 runs resolved with every verdict as scripted,
and no authored answer given away; Flick's lines are under the requested share (0.24–0.28 against 0.38). Not checked
in the iOS Simulator; the content needs a native speaker's review. See [findings](docs/rounds/023/findings.md).

## Addendum 2026-11-05: round 022, talking to party members (autonomous)

A party member can be talked to again from the Party screen, wherever the player is: a party conversation is an
encounter file with `party_of` (no map location), graded like any other, set at the player's location, outside the
map, the Rift gate and the Rift's review; each resolution adds one to the member's conversation count, and a resolved
conversation can be played again. The first is Gerald's coffee break (praise his coffee with the right agreement,
thank him), in Italian and Spanish; Spanish uses *bueno* / *delicioso* because *rico* matches "Puerto Rico". Codex
critique 1 (10 findings: 5 accepted, 5 in part) decided autonomously. Tests: server 127/127, mobile 37/37, web client
12/12 and build. Live codex-cli: 5 of 5 runs with the planned script resolved with every verdict as scripted
("Il caffè è buona." refused for agreement), no answer given away, share 0.37 against 0.32 requested. Not checked in
the iOS Simulator. See [findings](docs/rounds/022/findings.md).

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
| 022 | 11-05 | Conversations with party members: Gerald's coffee break, anywhere once he has joined (backlog A8b) (autonomous) | [022](docs/rounds/022/architecture.md) | [findings](docs/rounds/022/findings.md) | `53b5cca` (pre-run record) to round 022 close |
| 023 | 11-05 | Party conversations for Mortimer, Flick and Marginalia (backlog A8c) (autonomous) | [023](docs/rounds/023/architecture.md) | [findings](docs/rounds/023/findings.md) | `677b75a` (pre-run record) to round 023 close |
| 024 | 11-05 | Server tests remove their temp dirs (backlog F1) (autonomous) | [024](docs/rounds/024/architecture.md) | [findings](docs/rounds/024/findings.md) | `f2220e8` (pre-run record) to round 024 close |
| 025 | 11-05 | The Cracked Fountain's infohazard: Flick's jingle, a containment notice (backlog B3, Fountain part) (autonomous) | [025](docs/rounds/025/architecture.md) | [findings](docs/rounds/025/findings.md) | `07ef542` (pre-run record) to round 025 close |
| 026 | 11-05 | A concrete language-mix rule in the shared prompt (backlog E1, template round) (autonomous) | [026](docs/rounds/026/architecture.md) | [findings](docs/rounds/026/findings.md) | pre-run record |
| 027 | 11-05 | The philosophy statement on first launch: content, `GET /api/onboarding`, app screen shown once (backlog C2) (autonomous) | [027](docs/rounds/027/architecture.md) | [findings](docs/rounds/027/findings.md) | `88b223b` (pre-run record) to round 027 close |
| 028 | 11-05 | Containment files in the Spellbook: the Fountain jingle and Errata, filed on completion (backlog B4) (autonomous) | [028](docs/rounds/028/architecture.md) | [findings](docs/rounds/028/findings.md) | `09248d5` (pre-run record) to round 028 close |
| 032 | 11-05 | Gerald's Dead Branch fragment after three coffee breaks: the first relationship unlock (backlog A12) (autonomous) | [032](docs/rounds/032/architecture.md) | [findings](docs/rounds/032/findings.md) | `f1589f1` (pre-run record) to round 032 close |
| 033 | 11-05 | Journey fragments for Mortimer, Flick and Marginalia after three party conversations; wider stem check (backlog A12) (autonomous) | [033](docs/rounds/033/architecture.md) | [findings](docs/rounds/033/findings.md) | pre-run record to round 033 close |
| 034 | 11-05 | App type scale and palette tokens; every text style sized, map labels undimmed, contrast tests (backlog C3a) (autonomous) | [034](docs/rounds/034/architecture.md) | [findings](docs/rounds/034/findings.md) | pre-run record to round 034 close |
| 035 | 11-05 | Fade-in transitions that respect Reduce Motion; line-height tokens (backlog C3b) (autonomous) | [035](docs/rounds/035/architecture.md) | [findings](docs/rounds/035/findings.md) | pre-run record to round 035 close |
| 036 | 11-05 | Journey fragments name who told them or where they were found, in the Spellbook (autonomous) | [036](docs/rounds/036/architecture.md) | [findings](docs/rounds/036/findings.md) | pre-run record to round 036 close |
| 037 | 11-05 | Two synthesized UI cues on progress only, and a sound switch (backlog C4a) (autonomous) | [037](docs/rounds/037/architecture.md) | [findings](docs/rounds/037/findings.md) | pre-run record to round 037 close |
| 038 | 11-05 | Remove a non-current save from the device after a system alert; no label reuse (backlog A11b) (autonomous) | [038](docs/rounds/038/architecture.md) | [findings](docs/rounds/038/findings.md) | pre-run record to round 038 close |
| 039 | 11-05 | Removing a save deletes it on the server too (`DELETE /api/learner`) (autonomous) | [039](docs/rounds/039/architecture.md) | [findings](docs/rounds/039/findings.md) | pre-run record to round 039 close |
| 044 | 11-05 | Leak scan over every live report: words inside authored phrases, echo and quoted kinds; near-leaks are rare topic words (autonomous) | [044](docs/rounds/044/architecture.md) | [findings](docs/rounds/044/findings.md) | pre-run record to round 044 close |
| 043 | 11-05 | The Party screen counts down to each member's next story (autonomous) | [043](docs/rounds/043/architecture.md) | [findings](docs/rounds/043/findings.md) | pre-run record to round 043 close |
| 042 | 11-05 | A display font for titles: Literata Bold (OFL), loaded at runtime, system font for the rest (autonomous) | [042](docs/rounds/042/architecture.md) | [findings](docs/rounds/042/findings.md) | pre-run record to round 042 close |
| 041 | 11-05 | Ambient audio per location: six synthesized loops behind the Sounds switch, ducked under speech (autonomous) | [041](docs/rounds/041/architecture.md) | [findings](docs/rounds/041/findings.md) | pre-run record to round 041 close |
| 040 | 11-05 | The app sends the optional server token (`EXPO_PUBLIC_PARALLANG_TOKEN`) (autonomous) | [040](docs/rounds/040/architecture.md) | [findings](docs/rounds/040/findings.md) | pre-run record to round 040 close |
| 031 | 11-05 | Save slots: up to three learners per device, Saves screen, stale-reply guards (backlog A11) (autonomous) | [031](docs/rounds/031/architecture.md) | [findings](docs/rounds/031/findings.md) | `2c5e2ae` (pre-run record) to round 031 close |
| 030 | 11-05 | Fragments of The Journey: three authored passages per pack in the Spellbook, found on completion, translation behind a toggle (backlog A9) (autonomous) | [030](docs/rounds/030/architecture.md) | [findings](docs/rounds/030/findings.md) | `d6e2e51` (pre-run record) to round 030 close |
| 029 | 11-05 | Forced repetition before the Rift: one due card per answer slot, DRILL_REQUIRED, map drill note (backlog C1) (autonomous) | [029](docs/rounds/029/architecture.md) | [findings](docs/rounds/029/findings.md) | `4942a58` (pre-run record) to round 029 close |
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
