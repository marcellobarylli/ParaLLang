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
- **Language.** Italian is the default target language; French ([round 181](docs/rounds/181/architecture.md)) and
  Spanish are also available, and the hosted server plays all three, each game picking its own. `TARGET_LANGUAGE` (`it` or
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
- **Tone.** The narration prompt carries the style guide (Pratchett's manner, no internet slang since [round 128](docs/rounds/128/architecture.md)) and neither NPCs nor the
  grader's feedback give the answer away ([round 007](docs/rounds/007/architecture.md),
  [round 008](docs/rounds/008/architecture.md)), nor offer the answers as a menu to pick from
  ([round 012](docs/rounds/012/architecture.md)). The Spellbook hides meanings during encounters and on due cards
  ([round 017](docs/rounds/017/architecture.md)).
- **Next.** The owner plays the app in the Simulator and reviews the Italian content
  ([round 004 open items](docs/rounds/004/findings.md#open-items),
  [round 003 open items](docs/rounds/003/findings.md#open-items)).

## Addendum 2026-11-27: round 194, tilt to look on the road

"Tilt to look" now works in conversations on the road, as it does in the dungeons: tilting the phone turns the view
a little while a character is talked to. Tested in Node and in Chromium with a fake tilt; not tried on a phone.
**Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/194/architecture.md), [findings](docs/rounds/194/findings.md).

## Addendum 2026-11-27: round 193, no warp under the player

The ground just under the camera no longer smears and swims as it moves: textures are mapped perspective-correctly
within 5 m of the camera, turning to the PS1's affine mapping by 16 m. Seen in Chromium frames of a glide before and
after; not seen on a phone. **Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/193/architecture.md), [findings](docs/rounds/193/findings.md).

## Addendum 2026-11-27: round 192, the road kept clear; ferns, flowers and bushes

No tree or plant now grows within 1.6 m of a way's centreline (the 1.6 m track and half its width again on each
side). The ground near the camera has ferns, little bushes and clumps of flowers in seven colours, by cover and biome.
Tested, and seen in a screenshot in Chromium; not seen on a phone. **Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/192/architecture.md), [findings](docs/rounds/192/findings.md).

## Addendum 2026-11-27: round 191, legacy dungeons on rails again; the road's glide keeps low

On the road a legacy dungeon is entered on foot from outside its gate, and its gate encounters are walked to from one
another along its paths at eye height, through the gate passages, as the dungeon mode did (no drop from the sky). The
road's glide no longer rises over the country: it keeps eye height over the ground along the same path, with a low,
long swell (0.14 m every 22 m). Tested in Node; not seen in a browser. **Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/191/architecture.md), [findings](docs/rounds/191/findings.md).

## Addendum 2026-11-27: round 190, the practice box shows five lines, and a reply can be followed

The practice box under a correction now grows to five lines in view (a layout rule had kept it at one line), then
scrolls. Settings has "When a character replies": "Follow the reply" (the default), which brings the character's new
line to the top of the panel as it appears, or "Stay where I am" (as before). Tested with fakes and the box measured in Chromium;
not played on a phone. **Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/190/architecture.md), [findings](docs/rounds/190/findings.md).

## Addendum 2026-11-27: round 189, the world in the second line

A conversation's greeting is now its exercise alone. The reply to the player's first answer, and only that one, lets
the world show once: one thing the character has seen of it in what the conversation practises, so the remark is
made of the exercise and does not repeat the same few noticed lines. Replaces round 155's "about one reply in three".
Tested with the scripted provider; not read from a live model. **Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/189/architecture.md), [findings](docs/rounds/189/findings.md).

## Addendum 2026-11-27: round 188, the microphone stays on

The microphone is now a toggle: it no longer switches itself off after a silence, but listens until it is tapped
off (or the answer is sent), and the language button switches between the target language and English while it
listens. Tested with fakes; not tried on a phone. **Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/188/architecture.md), [findings](docs/rounds/188/findings.md).

## Addendum 2026-11-26: round 187, the title music waits for the road

The title music no longer fades when the Journey button is pressed: it plays on while the road is being found (the
hosted server waking up) and fades once the road is here. **Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/187/architecture.md), [findings](docs/rounds/187/findings.md).

## Addendum 2026-11-25: round 186, the conversation panel opens full

The conversation panel now opens covering the screen under the top bar (the height of a drag to the top), instead of
62 % of it; a dragged height still wins. **Merged to `main` and deployed with rounds 184 and 185** on the owner's word.
[Architecture](docs/rounds/186/architecture.md), [findings](docs/rounds/186/findings.md).

## Addendum 2026-11-25: round 185, the gates back in streamlined mode

After every three units, streamlined mode now has their gate in a legacy dungeon (Ta Prohm first, then The Kiln and
Micromort Mountain): three encounters, one for each unit, at three of the dungeon's sites, each asking an objective of
each of its unit's lessons without saying the words first. Each counts whatever the score; the next unit opens after
the third. Tested with the scripted provider; not played in a browser. **Merged to `main` and deployed** (round 186).
[Architecture](docs/rounds/185/architecture.md), [findings](docs/rounds/185/findings.md).

## Addendum 2026-11-25: round 184, music on a silent iPhone, spoken narration words

The ambient music waited for the microphone because iOS mutes Web Audio with the silent switch, and recording
switches the page to a session the switch leaves alone. The page now asks for a `'playback'` audio session (Safari
16.4 and later), and every tap wakes a suspended context. A tap on a yellow word of the narration also says it, in the
browser's voice (no model call). Tested with fakes; not heard on an iPhone. **Merged to `main` and deployed** (round 186).
[Architecture](docs/rounds/184/architecture.md), [findings](docs/rounds/184/findings.md).

## Addendum 2026-11-25: round 183, friends on Claude Sonnet

With `CLAUDE_API_KEY` set (a Claude API key paid from the owner's monthly Max API credit), friends' turns run on
Claude Sonnet 5.5 (`FRIENDS_CLAUDE_MODEL`), with Gemini tried when a Claude call fails; a friend's own Gemini key
still wins, and the owner's turns stay on claude-cli. Tested with fakes only; the first real call is a friend's turn.
**Merged to `main` and deployed.** [Architecture](docs/rounds/183/architecture.md),
[findings](docs/rounds/183/findings.md).

## Addendum 2026-11-25: round 182, a character's convenient excuse

A friend's turns reach Gemini on the owner's key (tested from the session); they failed because Google's
`gemini-3.8-flash` was overloaded (503 "high demand"), slower than 60 seconds, or its free allowance spent for the
minute. A failed turn now says so, after a joke: "<name> isn't feeling it right now. His convenient excuse: Gemini
answered 503 UNAVAILABLE: \"This model is currently experiencing high demand…\" (tried 3 times: …)". Google's words
are kept (its error list is unwrapped). A passing failure is tried again within 150 s, then on `gemini-3.5-flash`
(`GEMINI_FALLBACK_MODEL`). **Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/182/architecture.md), [findings](docs/rounds/182/findings.md).

## Addendum 2026-11-25: round 181, French

French is the third language: a whole pack (`content/languages/fr/`: the market's encounters and vocabulary, the
curriculum A1 to B1, lore and truths), written by subagents from the Italian and not yet read by a native speaker.
One server now plays several languages (`TARGET_LANGUAGES=it,fr,es`, Italian the default); each game sends its
language (`X-ParaLLang-Language`) and keeps its own saves. A new game's language is chosen on the title or in Save
slots; today's games stay Italian. œ and æ fold to oe and ae, and « » are punctuation, wherever answers are matched.
**Merged to `main` and deployed** on the owner's word.
[Architecture](docs/rounds/181/architecture.md), [findings](docs/rounds/181/findings.md).

## Addendum 2026-11-25: round 180, an opening message

Once the camera has zoomed down at the start of the journey, a short pop-up comes first, with the landscape and the
first character behind it: the belief (a language is learned best by living in it), the game (learn the world and its
language by talking to its people) and a teaser about the seams of the world. **Set out** closes it and the arrival's
card follows; it is shown once per save slot. **Merged to `main` and deployed.**
[Architecture](docs/rounds/180/architecture.md), [findings](docs/rounds/180/findings.md).

## Addendum 2026-11-24: round 179, deleting a save and starting over

In Save slots, **Delete** removes a game not in use, on the server too, and **Start over** deletes the game being
played and reloads into a new one in the same slot; each asks for a second press. **Merged to `main` and deployed.**
[Architecture](docs/rounds/179/architecture.md), [findings](docs/rounds/179/findings.md).

## Addendum 2026-11-24: round 178, three save slots

Menu, **Save slots**: up to three games in one browser, each its own learner and save; Play or New game reloads the
page into a slot, and a slot not in use can be emptied. Today's save is slot 1, untouched. Client only; the server is
unchanged. **Merged to `main` and deployed** with round 177.
[Architecture](docs/rounds/178/architecture.md), [findings](docs/rounds/178/findings.md).

## Addendum 2026-11-24: round 177, conversations by level, after a playtest

Subagents played 32 road conversations against the live model and scored 218 character lines: "what do you think of
my work" ended about three lines in four, nearly every line stacked two or more questions, A1 drifted off level and
goodbyes were refused. The cause was the system prompt's conversation rules, the same at every level. The rules are now
by the stage's CEFR (`prompts/system/conversation_*.txt`): one question a line, about the player, never the
character's own work; A1 short and kept to the conversation's words; A2 and B1 react to the player and ask about them.
On the final version: none of the work questions, no stacked questions, goodbyes answered, still funny.
Then, on the owner's decisions: a character says an objective's words first only when the learner has never met them;
a grading whose evidence cannot be verified no longer fails the turn; an accent-only correction costs no heart; the
share of the language **follows the learner's level** by default (Settings: Follow my level); repeating quirks
reworded. `server/scripts/playtest.js` plays any unit against the live model. **Merged to `main` and deployed** on
the owner's word.
[Architecture](docs/rounds/177/architecture.md), [findings](docs/rounds/177/findings.md),
[playtest](docs/playtests/2026-11-24-conversations/README.md).

## Addendum 2026-11-23: round 176, the camera follows the shortest walk, smoothed

Between two sites the camera now follows the shortest walk along the graph's ways (`graph.route`), on a line smoothed
so that it curves near the ways without hard edges, and with its height smoothed along the ground
(`client/src/scene/roadPath.js`, `roadDirector.js`). Before, it flew straight over the country when the two sites
were not joined. Rounds 173 and 174 were made on `main` by another session at the same time; this session's title
round is 175 and `main` is merged in. **Deployed** on the owner's word ("deploy everything"), with round 175.
[Architecture](docs/rounds/176/architecture.md), [findings](docs/rounds/176/findings.md).

## Addendum 2026-11-23: round 175, a title over the clouds, and one menu

The page opens on the road's landscape seen from above the clouds, turning slowly, with the weather of the moment and
one button, **The Journey 2: Journathan Returns (again)**, which zooms the camera down into the first site. A sky shows
at once; the road is read and the ground built behind the title (a new player's road is made on the seed the title
already shows: `GET /api/road?seed=`). The top bar is the same everywhere: **Map** and **Menu** (map, curriculum,
Spellbook, party, guidebook, Settings, leave the conversation, other places, back to the title). The road's map opens
over a conversation, and walking off from it leaves the conversation unfinished. Ta Prohm and The Kiln are under
"Other places"; a reload opens on the title. Seen in headless Chromium at phone and desktop size; not on a real phone.
**Deployed** with round 176. [Architecture](docs/rounds/175/architecture.md), [findings](docs/rounds/175/findings.md).
## Addendum 2026-11-23: round 174, three replies and the conversation is complete

Every conversation, strict or light, on the road or in a dungeon, is **complete on the player's third reply**
(strict: sooner when every objective is met); a counter says "Reply 1 of 3". After that **"Keep chatting"** goes on
with the character and counts nothing; "Done chatting" brings the way on back. Played in headless Chromium with a
scripted provider. [Architecture](docs/rounds/174/architecture.md), [findings](docs/rounds/174/findings.md).

**Deployed** with round 173 on the owner's word ("push and deploy"): `main` is at `bc4ef51`. CI run 45278675005
succeeded; the Pages run 45278675009 failed on its first attempt (GitHub found no uploaded artifact) and succeeded on
the second. Render's deployment was not looked at; the live page and server are outside the session's network.

## Addendum 2026-11-23: round 173, streamlined mode

**Streamlined**, in Settings under Language and learning, on by default: on the road each unit (Hello and goodbye,
Where you are from, ...) is one conversation of the first objective of each of its lessons; finishing it completes
the unit whatever the score, and every site ahead offers the next unit. No reviews, repairs or gates until the
curriculum is finished. Switching it on completes a unit already begun. Off, the full pacing of round 144 is back.
Kept on the road (`POST /api/road/mode`). Not played in a browser.
[Architecture](docs/rounds/173/architecture.md), [findings](docs/rounds/173/findings.md).

## Addendum 2026-11-23: round 172, quieter rain and an Audio category

Rain is about six times quieter and falls 15 % of the time (was 30 %). Settings is in categories; Audio holds Master,
Music, Effects (rain, thunder and the place's other sounds) and Voice volumes, stored in `display.volume`.
[Architecture](docs/rounds/172/architecture.md), [findings](docs/rounds/172/findings.md).

## Addendum 2026-11-23: round 171, friends play the hosted link on Gemini

Round 170 (a local setup for friends) was withdrawn by the owner and reverted (`456a521`). Reconceived: friends open
the same hosted link, so they always play the latest build. **`PARALLANG_FRIEND_CODE`** is a second access code; a
friend's turns run on **Gemini** (`server/src/llm/friend-router.js`): on the server's `GEMINI_API_KEY`, or, when there
is none, it is refused or its free allowance is spent, on a key the friend pastes into the page after three steps
(`client/src/components/AccessGate.jsx`), kept in their browser and never stored by the server. The owner's turns
stay on `LLM_PROVIDER`. Played in headless Chromium against a production-mode server up to the steps and a refused
key; no Gemini turn has been played (no real key here). **On `main`**, page and server. The owner's step:
`GEMINI_API_KEY` and `PARALLANG_FRIEND_CODE` in Render's Environment.
[Architecture](docs/rounds/171/architecture.md), [findings](docs/rounds/171/findings.md).

## Addendum 2026-11-23: round 169, whether the followers of the void are right

The owner set the moral centre of the story. It is **not clear whether the followers of the void are good or
bad**: they believe the void is the birthplace of everything, so that a collapse creates new worlds and new life;
nobody knows whether that is true, though there may be signs of a world being born in the abyss; and the player
chooses to foster it or prevent it. The telling is ordered as Dark Souls orders its own: **the early encounters lead
the player to believe the collapse must be prevented, and only later do its proponents speak.**
[`docs/lore-book.md`](docs/lore-book.md) has it as "Whether the followers are right". A join of round 167 that had
called the followers a sect is made two-sided, and the book's own part VI is named as one of the early voices. The owner
added **the creation cycle**: every time a world collapses a new world is born, a story within a story (part XI),
after Dark Souls' painted world; whether that is the world's truth or the followers' doctrine is put to the owner. The owner's questions on
what the cycle makes of this world (was it born of an earlier collision; why two worlds now) are in the book with a
proposal that the owner has not taken. No
code is changed and none of it is built: in the game today neither case is put.
[Architecture](docs/rounds/169/architecture.md), [findings](docs/rounds/169/findings.md).

## Addendum 2026-11-23: round 168, the religion of the place below

The owner added a main religion: it sort of knows of the gap between the worlds, perhaps its higher-ups know the
world's nature, and its canon is that the place below is hell or Hades, which keeps the general population afraid,
away and in the dark. [`docs/lore-book.md`](docs/lore-book.md) has it as "The religion of the place below". **In the
game:** every character is now told the teaching as something everybody knows
([`content/world/knowledge.yaml`](content/world/knowledge.yaml): most people keep the one faith, more or less; the
place under the ground is hell; nobody should go down looking for it), and six of the road's "noticed" lines are a
believer's, a doubter's or one who goes along. It shows as other details of the world do: now and then, in passing.
No character is told what is truly below. No live model was called, so how a character speaks of it has not been
heard. [Architecture](docs/rounds/168/architecture.md), [findings](docs/rounds/168/findings.md).

**Deployed** on the owner's word ("then deploy"): `main` is at `bb61bb1`, page and server. CI run 45162719786 and
the Pages run 45162719934 succeeded, and Render's deployment "main - parallang" reports success (read from GitHub's
API; the live page and server are outside the session's network and were not looked at).

## Addendum 2026-11-23: round 167, the lore of what is under the world, and the followers of the void

The owner refined the lore of round 164. [`docs/lore-book.md`](docs/lore-book.md), "What the book does not say",
gains **"Where the pulls are going"** (the valleys become abyssal chasms) and **"Under the world"**: the roads are
only the surface of the true graph; under the ground is one huge cave, its ceiling the underside of this world and
its floor where it touches the other; a world tree stands at every node from ceiling to floor and the trees hold
the gap between the worlds; nothing stands along an edge, and the edges run along the ceiling and the floor as
roots. The model is named: Dark Souls' Ash Lake and archtrees, and its Abyss. That the archtrees carry Lordran is
written as a reading of that game, which is what the lookups found it to be. The owner's final clarification is in
too: a stitch **pulls on the tree and shrinks it** (the valley), and past a certain force the tree **collapses**, both
worlds are destroyed there and space expands into a massive dark void (the chasm), which is not a gate. **Issue #25** asks for a view of it
that looks and feels like Dark Souls, and a way for the player to reach it. The book also gains **the followers of
the void**: a faction within the world that seeks to accelerate the collapse, with roots in Taoism (four passages of
the *Tao Te Ching*, looked up), written as a sect that has left its own teaching. On the owner's correction the book no longer says that no character
knows the world is a web: most do not, and a few, the followers among them, know more. Three questions are **left
open on purpose** (born here or came through; an end or a beginning; the player their enemy or their instrument),
and a player can oppose the followers or join them. Last, **everything under the world is written**: the trees, the
roots and all of it are covered in countless words, which the player sees on entering, and which is how the web and
the written world of part I are one thing. No code is changed and nothing is built.
[Architecture](docs/rounds/167/architecture.md), [findings](docs/rounds/167/findings.md).

## Addendum 2026-11-23: round 166, the narrator's passage stays while the conversation loads

The owner, from the phone: the narrator's passage on the walk to the next site is good, and the bare line that
replaced it when the camera arrived ("Erasmus is getting ready to talk…") is dull. The passage now **stays in the
travel caption until the character is ready to talk**, and what the game is doing is its last sentence: "On the way
to The Lesser Hollow…" while the camera walks, "Henrietta is getting ready to talk…" once it is there. The dungeons'
caption does the same. A site of which nothing is told still shows the plain line. Web client only; the server is
unchanged. `node client/scripts/caption-check.mjs` plays it; pictures:
[the owner's](docs/rounds/166/shots/00-the-owners-picture.jpg),
[getting ready](docs/rounds/166/shots/02-getting-ready.jpg). The owner's picture is the first sight of the deployed
game on a real phone in these rounds; this change has not been seen on one.
[Architecture](docs/rounds/166/architecture.md), [findings](docs/rounds/166/findings.md).

**Deployed** on the owner's word ("and deploy"): `main` is at `b2ba4bc`, pushed with `[skip render]`, so the page
alone was deployed. CI run 45151015231 and the Pages run 45151015525 succeeded (read from GitHub's API; the live page
is outside the session's network and was not looked at).

## Addendum 2026-11-23: round 165, a real map under the chart of the Odyssey

The owner asked that the chart of the Odyssey (round 163) have a real world map under it, accurate, and looking
like a world map from a myth. It has: the coast is **Natural Earth's land at 1:10m (public domain)**, cut and
thinned by `client/scripts/make-odyssey-map.mjs` into `content/world/odyssey-map.json`, and
`client/src/components/OdysseyChart.jsx` draws it as an old sea chart (shore lines, a compass rose and its winds,
names, a title plate, stained paper, a border of whole degrees). The line between two stops now goes **by sea**,
found by the same script; it is not the poem's, and the caption says so. Checking the stops against the coast found
two of round 163's coordinates wrong (Scylla and Charybdis inland, the Underworld on Corsica); both are corrected
and tests keep every stop, leg and name where the coast says it belongs. Source, licence and checksum:
[`client/public/models/ASSETS.md`](client/public/models/ASSETS.md). Pictures:
[the map](docs/rounds/165/shots/chart-large.jpg),
[in the game](docs/rounds/165/shots/03-the-narrator-and-the-odyssey.jpg). Not seen on a real phone. Where each stop
stands is tradition's, and rests on a search's summary of one Wikipedia page. Issue #13 stays open.
[Architecture](docs/rounds/165/architecture.md), [findings](docs/rounds/165/findings.md).

**Deployed** on the owner's word ("Then deploy"): `main` is at `0f97296`, pushed with `[skip render]`, so the page
alone was deployed and the server was left as it was. CI run 45139105526 and the Pages run 45139105518 succeeded
(read from GitHub's API; the live page is outside the session's network and was not looked at).

## Addendum 2026-11-23: round 164, the journey as the icon; the stitch in the lore book

On waking the owner said the eleven rounds were fine and asked for final touches, then the merge. **The icon** of
the web app and of the iPhone app is now the picture the owner picked: the whole journey of 120 walks painted on
the map (`client/scripts/make-icons.mjs`). **The lore book** has the owner's new lore in "What the book does not
say": a stitch is two passes; every character the player meets has come through from the other world and is an
impostor here; finishing an encounter sends them back through the ground and completes the stitch; a rift is a
stitch seen from the side; and the player's walk is a seam. It also has **the first pull**, a world event at the
step from A2 to B1: the map draws back, the whole graph grows out like a wave, and the land is pulled down at
every site of the walk, for good. The event is not built;
[`docs/proposals/2026-11-23-the-first-pull.md`](docs/proposals/2026-11-23-the-first-pull.md) says how it could be
([findings](docs/rounds/164/findings.md), picture: [`01-icon-512.png`](docs/rounds/164/shots/01-icon-512.png)).

**The deploy of rounds 153 to 164 (2026-11-23, 07:39 to 07:42 UTC).** The owner said "merge and deploy". The twelve
rounds were merged to `main` as `5ae0627`, without `[skip render]`. CI run 45132679028 and Pages run 45132679072
succeeded for it, and Render's deployment "main - parallang" for the same commit reports success (read from GitHub's
API; the cloud session cannot reach the hosted server or the live page itself, so neither was looked at). Issues #1
to #9 are closed. #11 (trees only) and #13 (a chart drawn here, no public-domain map) are left open for the owner's
word. The server restarted, so saves on its disk were lost unless the GitHub save is on; a browser's copy puts its
save back. **No model had been run against the new prompts before this**: the first live conversations are the
first test of light mode, the narrator's voice and the characters' hints.

**Amendment (2026-11-23): the pull comes at every larger step.** After the deploy the owner moved the world event
from the one step A2 to B1 to "all the medium to major transitions", not every unit: A1 to A2, and so on. The lore
book's part is now "The pulls" and the proposal is amended. Asked which steps, the owner settled it: only the changes
of level (A1 to A2, A2 to B1). Not built: it is **issue #23**. The owner also did not intend round 162's cutting down
of the tree models; **issue #24** is to use them at their original poly counts.

**Amendment (2026-11-23): the icon from further off.** The owner picked the maskable icon's view ("a bit more
zoomed out") for the app icon: every icon is now the journey small in the middle of its country
([`01-icon-512.png`](docs/rounds/164/shots/01-icon-512.png)). #11 and #13 stay open on the owner's word. It went to `main` as
`973068f` with `[skip render]`: CI run 45134979154 and Pages run 45134979253 succeeded (08:00 to 08:01 UTC), and no
server deployment was made for it (read from GitHub's API; the live page was not looked at).

## Addendum 2026-11-23: rounds 153 to 163, the eleven open issues, on one branch awaiting the owner's word

The owner asked for every open issue, one after the other, and went to sleep. All eleven are built, one round each,
in the issues' own build order, on the branch `claude/modest-einstein-obt6yy`. When this was written none was on
`main`; **they were merged and deployed with round 164** (the addendum above). Each round's addendum is below; this
is the list.

| Round | Issue | What |
|---|---|---|
| 153 | #1 | Light mode beside strict mode |
| 154 | #2 | A light conversation of three to five turns |
| 155 | #3 | The characters belong to the world |
| 156 | #6 | The italic text is a narrator |
| 157 | #5 | The guidebook |
| 158 | #4 | Untranslatable (turmeric) text, and the vault's "Understood Later" |
| 159 | #7 | Three characters utter a deeper truth |
| 160 | #8 | Biomes, and the legacy dungeons as nodes of the road |
| 161 | #9 | The whole journey, saved and painted on the map |
| 162 | #11 | Pulled tree models |
| 163 | 11-23 | The narrator on a long journey, and a chart of the Odyssey (issue #13): a remark from a hundred walks when the journey is shown, a guidebook entry, and a chart drawn here in place of a public-domain map that could not be fetched | [163](docs/rounds/163/architecture.md) | [findings](docs/rounds/163/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 164 | 11-23 | The journey as the icon; the stitch and the first pull in the lore book (the owner's lore of 2026-11-23); a proposal for building the first pull | [164](docs/rounds/164/architecture.md) | [findings](docs/rounds/164/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 165 | 11-23 | A real map under the chart of the Odyssey: Natural Earth's coast (public domain), the line between stops by sea, drawn as an old sea chart; two stops' coordinates corrected against the coast | [165](docs/rounds/165/architecture.md) | [findings](docs/rounds/165/findings.md) | on `main` with `0f97296` (the page only) |
| 166 | 11-23 | The narrator's passage stays in the travel caption until the character is ready to talk, with "… is getting ready to talk…" as its last sentence (the owner, from the phone) | [166](docs/rounds/166/architecture.md) | [findings](docs/rounds/166/findings.md) | on `main` with `b2ba4bc` (the page only) |
| 167 | 11-23 | The lore of what is under the world: the valleys become chasms; a cave, a world tree at every node, the ways as roots (Dark Souls' Ash Lake named as the model); issue #25 opened for a view of it; the followers of the void, with roots in Taoism | [167](docs/rounds/167/architecture.md) | [findings](docs/rounds/167/findings.md) | on `main` (docs only; nothing deployed) |
| 168 | 11-23 | The religion of the place below: its canon (the place under the ground is hell) in the lore book and in what every character knows; believers, doubters and people who go along among the road's characters | [168](docs/rounds/168/architecture.md) | [findings](docs/rounds/168/findings.md) | on `main` with `bb61bb1` (page and server) |
| 169 | 11-23 | Whether the followers of the void are right: they believe the void is a birthplace; nobody knows; the player chooses; the early encounters say the collapse must be prevented and its proponents speak only later (after Dark Souls) | [169](docs/rounds/169/architecture.md) | [findings](docs/rounds/169/findings.md) | on `main` (docs only; nothing deployed) |
| 170 | 11-23 | A local setup for friends (`PLAY.md`, `npm run setup`, a Gemini provider): withdrawn by the owner and reverted (`456a521`); its records are in the history of `d9165cd` | none | none | reverted on `main` |
| 171 | 11-23 | Friends play the hosted link on Gemini: a friend code, their turns on the server's `GEMINI_API_KEY` or their own pasted key, three clear steps when no model is available | [171](docs/rounds/171/architecture.md) | [findings](docs/rounds/171/findings.md) | on `main` (page and server) |
| 172 | 11-23 | Rain far quieter (on its own effects bus) and 15 % of the time; Settings in categories, with Audio's Master, Music, Effects and Voice volumes | [172](docs/rounds/172/architecture.md) | [findings](docs/rounds/172/findings.md) | on `main` (page and server) |
| 173 | 11-23 | Streamlined mode, on by default: one conversation a unit, finishing it completes the unit, every site offers the next unit | [173](docs/rounds/173/architecture.md) | [findings](docs/rounds/173/findings.md) | on `main` with `bc4ef51` (page and server) |
| 174 | 11-23 | Every conversation complete on the third reply, with a counter; Keep chatting after, which counts nothing | [174](docs/rounds/174/architecture.md) | [findings](docs/rounds/174/findings.md) | on `main` with `bc4ef51` (page and server) |
| 175 | 11-23 | The title screen over the clouds (the road's landscape turning, the weather, one button, the zoom down; the world loaded behind it); one top bar of Map and Menu; the map over a conversation, which can be left unfinished | [175](docs/rounds/175/architecture.md) | [findings](docs/rounds/175/findings.md) | on `main` with round 176 |
| 176 | 11-23 | The camera between sites follows the shortest walk along the ways, smoothed in plan and in height | [176](docs/rounds/176/architecture.md) | [findings](docs/rounds/176/findings.md) | on `main` (page and server) |
| 163 | #13 | The narrator on a long journey, and a chart of the Odyssey |

**What holds for all of them.** No model was called: the cloud session's `claude` CLI is not signed in, so every
prompt was tested for what it says and not for what a model then writes. Nothing was seen on a phone; the screens
were played in headless Chromium at a phone's size. Every text in Italian and Spanish is Claude's and unread by a
speaker. The iPhone app is unchanged. Tests at the end: server 567, web client 281, the aesthetic package 95 (505,
258 and 87 before).

**What is not as the issues asked.** #3's "Deployed" waits for the merge. #11 pulled trees only: dungeon pieces and
characters need a network that reaches the usual CC0 libraries. #13 shows a chart drawn here, not a public-domain
map: Wikimedia Commons could not be reached to find one and read its licence.

## Addendum 2026-11-23: round 163, the narrator on a long journey, and a chart of the Odyssey (on the session branch, not deployed)

Issue #13, the last of the eleven. When the journey shown on the map is a hundred walks or more, the narrator
remarks on it ("It does not look like a journey. It looks like what a fly does in a quiet room …") and the guidebook
gains "The long way round". Beside the remark the map shows a **chart of the voyage of Odysseus**: the poem's stops
in order, each where tradition most often puts it, joined by the same gold line. **It is a sketch drawn in this
repository, not a public-domain map**: Wikimedia Commons and every page tried were outside the session's network,
so no map's licence could be read and none was taken; `client/public/models/ASSETS.md` says how to put a real one
in. Played in headless Chromium with 60 and 120 walks, not on a phone
([findings](docs/rounds/163/findings.md), picture:
[`03-the-narrator-and-the-odyssey.jpg`](docs/rounds/163/shots/03-the-narrator-and-the-odyssey.jpg)).

## Addendum 2026-11-23: round 162, pulled tree models for the road (on the session branch, not deployed)

Issue #11, the tenth of the eleven. The web client now ships one file of pulled 3D models,
[`client/public/models/nature.glb`](client/public/models/ASSETS.md): fifteen models (palms, broad-leaved trees,
pines, bushes, stones) from flo-bit's "low poly nature pack", **CC0**, cut from 17 617 triangles to 1 672 and from
1.77 MB to **34 kB** by `client/scripts/make-models.mjs`. `ASSETS.md` beside it records the source, the licence in
the source's own words and each file's checksum. On the road the five chunks of ground nearest the camera take
their trees from it; the file is asked for only there, and "Tree models" in Settings switches it off. The level
stays inside its 64 000 triangles (57 709 at the start). **The cut-down trees are ragged**, and whether they beat
the simple ones is the owner's call; dungeon pieces and characters were not pulled, because the usual CC0 libraries
are outside this session's network. Seen in headless Chromium, not on a phone
([findings](docs/rounds/162/findings.md), pictures:
[with](docs/rounds/162/shots/02-jungle-with-models.jpg) and
[without](docs/rounds/162/shots/03-jungle-without-models.jpg)).

## Addendum 2026-11-23: round 161, the whole journey, saved and painted on the map (on the session branch, not deployed)

Issue #9, the ninth of the eleven. The save now holds the whole walk of the road: the id of every site walked to,
in order (`road.walk`, the last 20 000) and the count of walks. Ids are enough, because the graph is the same graph
whenever it is read. The road's map has a switch, **"Show Journey so far"**: it reads the walk
(`GET /api/road/walk`) and paints it as one gold line over the landscape, from as far off as it takes to hold all of
it, with a mark where it began. Played in headless Chromium with a walk of sixty, not on a phone
([findings](docs/rounds/161/findings.md), picture: [`02-journey.jpg`](docs/rounds/161/shots/02-journey.jpg)).

## Addendum 2026-11-23: round 160, biomes, and the legacy dungeons as nodes of the road (on the session branch, not deployed)

Issue #8, the eighth of the eleven. **Biomes.** The endless landscape has kinds of country (`BIOMES` in
`server/src/road/terrain.js`): jungle, woodland and steppe, each with its own trees, density and colours. Every road
starts in the jungle (palms and broad-leaved trees) and a very low noise chooses further out. What the code called
a point's biome (shore, meadow, forest, …) is now its *cover*. **Dungeons.** A unit's gate stands in a legacy
dungeon: the site where the gate is offered is that dungeon's node, a stepped gate on the map and a ruined gate
seen from the road; the way on reads "Enter Ta Prohm", and the gate's conversation is played in the dungeon's own
level, which is built only then. The units go round Ta Prohm, The Kiln and Micromort Mountain in order, and a
place's card counts down ("Jungle · Ta Prohm in 3 conversations or more"). The issue's two questions are answered in
the findings: the terrain and the graph are seeded throughout, with no `Math.random`, and nothing is generated or
loaded ahead. Played in headless Chromium, not on a phone
([findings](docs/rounds/160/findings.md), pictures: [`01b-jungle-level.jpg`](docs/rounds/160/shots/01b-jungle-level.jpg),
[`02-map-with-ta-prohm.jpg`](docs/rounds/160/shots/02-map-with-ta-prohm.jpg)).

## Addendum 2026-11-22: round 159, three characters utter a deeper truth (on the session branch, not deployed)

Issue #7, the seventh of the eleven, and the last of the narration's. An encounter may now have a `revelation`:
what its character utters once the encounter is completed. The narrator tells it in the finished conversation ("…
and he utters the following:"), in turmeric, before the conversation's last word, and the guidebook keeps it.
Marginalia, Bambieshart and Errata have one each, in both packs, from parts IV, VI and X of the lore book and in
harder language (B1 and B2) than the road's signs; what they say is in the vault note. Played with Bambieshart in
headless Chromium; **the texts are Claude's and unread by a speaker**, and it was not seen on a phone
([findings](docs/rounds/159/findings.md), picture:
[`01-bambieshart-utters.jpg`](docs/rounds/159/shots/01-bambieshart-utters.jpg)).

## Addendum 2026-11-22: round 158, untranslatable text in the narration (on the session branch, not deployed)

Issue #4, the sixth of the eleven. Deep truths about the world now exist only in the language being learned: ten
short texts in each pack (`content/languages/<code>/lore/truths.yaml`), the first of them the owner's *Torna
indietro! Oltre giace la scia di un punto.*, harder in language as the truth gets deeper (A1 to B1). Eleven of the
narrator's written passages lead up to one each, as a message cut in a tree or scratched on a stone in a ford, and
show it in **turmeric**. Nothing translates them: the pack's file has no field for a translation, the server sends
the text alone, and the screen has nothing to tap. The guidebook explains the colour once ("Turmeric text") and
keeps the texts found for a later reading. What each one says is in
[`parallang_obsidian/Understood Later.md`](parallang_obsidian/Understood%20Later.md), which the game does not read.
A place's card, which had outgrown a phone's screen, now scrolls. **The Italian and Spanish are Claude's and unread
by a speaker.** Seen in headless Chromium, not on a phone ([findings](docs/rounds/158/findings.md), picture:
[`01-turmeric-on-the-road.jpg`](docs/rounds/158/shots/01-turmeric-on-the-road.jpg)).

## Addendum 2026-11-22: round 157, the guidebook (on the session branch, not deployed)

Issue #5, the fifth of the eleven. The web client has a **guidebook**, the "?" in the top bar, open at any time. Its
entries are content ([`content/narration/guidebook.yaml`](content/narration/guidebook.yaml)): a title, a text in the
narrator's voice and the event that enters it. An entry is entered the first time its event happens, is kept in the
save, is told once on the card of the place ("Entered in your guidebook"), and is read when the guidebook is opened.
There are four: The road, Being let past, Old words and Gates; issue #4 adds "Turmeric text". Seen in headless
Chromium at a phone's size, not on a phone ([findings](docs/rounds/157/findings.md), picture:
[`02-guidebook.jpg`](docs/rounds/157/shots/02-guidebook.jpg)).

## Addendum 2026-11-22: round 156, the italic text is a narrator (on the session branch, not deployed)

Issue #6, the fourth of the eleven. The narration a model writes for each line is now asked for as a storybook told
to "you" in the present tense, which describes a thing as an old inventory does, leaves the thought unfinished and
never explains the world; the model is given the truth of the lore book's last part and told never to state it, with
at most one hint a conversation (a word for sewing where a word for a road is expected). The narrator also has 26
**written passages** ([`content/narration/passages.yaml`](content/narration/passages.yaml)), told on the first step
of the road, on each arrival (by the way taken and the country) and at a dungeon's sites; a conversation's last line
is set as narration too. A passage is sent as segments, where issue #4's untranslatable spans will go, and the save
keeps what was told, which issue #5's guidebook will hang on. Gerald's pinned prompts were regenerated. **No model
was called**; seen in headless Chromium, not on a phone ([findings](docs/rounds/156/findings.md), picture:
[`03-on-the-way.jpg`](docs/rounds/156/shots/03-on-the-way.jpg)).

## Addendum 2026-11-22: round 155, the characters belong to the world (on the session branch, not deployed)

Issue #3, the third of the eleven. The narrator's prompt now carries what a character knows of the world it was born
in, in three short layers: what everybody knows, what the character's region knows, and one thing the character has
noticed ([`content/world/knowledge.yaml`](content/world/knowledge.yaml), `prompts/system/world.txt`). The model is
asked to let one small detail show in about one reply in three, and to answer "what do you mean?" in character with
something concrete and partial. On the road, characters of the A levels have noticed ordinary things and those from
B1 on more knowing ones, and the region acts as Tuscany without a word about Tuscany being written. No character
knows what the lore book's last part says, and a test holds that. **No model was called**, so what the characters
then say is not seen, and the issue's "Deployed" waits for the owner: it is on the session branch
([findings](docs/rounds/155/findings.md)).

## Addendum 2026-11-22: round 154, a light conversation is an exchange of three to five turns (on the session branch, not deployed)

Issue #2, the second of the eleven. In light mode a conversation now runs **three to five of the player's turns**:
it goes on to the third even when everything asked for has been said, ends from the third once no objective is open,
and ends on the fifth whatever is open. The model is told where each turn stands, is asked to follow up on what the
player said and to answer and invite questions, and the objective card says "Turn 2 of 3 to 5. You can ask Portia
questions back." On the road an objective never met counts nothing in the score. Strict mode is unchanged. Played in
headless Chromium with a scripted model; **no live model**, not on a phone
([findings](docs/rounds/154/findings.md), picture: [`03-understood.jpg`](docs/rounds/154/shots/03-understood.jpg)).

## Addendum 2026-11-22: round 153, light mode beside strict mode (on the session branch, not deployed)

The owner asked for every open issue, one after the other, and went to sleep; this is the first, #1 (step 3 of the
build order). Settings in the web client has "How answers are checked": **Strict** (as before, the default) or
**Light**. In light mode nothing is marked: one call to the model returns what the player meant, the same in the
target language, which open objectives it covers, and the character's reply, so a turn is one call instead of two.
An objective closes on the model's word, in any order; there are no hearts. The Spellbook still records the target
words the player wrote, and the road's score still tells a clean answer from a mended one. Strict mode's prompts and
tests are unchanged. **No model was called** (the tests script it), and it is on the branch
`claude/modest-einstein-obt6yy`, not on `main` ([findings](docs/rounds/153/findings.md)).

## Addendum 2026-11-22: round 152, the road is The Journey 2: Journathan Returns (again) (deployed)

The owner asked for the next GitHub issue: #10, step 2 of the build order. The endless road, The Long Way Home until
now, is called **The Journey 2: Journathan Returns (again)** on the world map, its button, the top bar, in what the
narrator is told of the scene, and in the README, `CLAUDE.md`, `docs/curriculum.md` and `docs/handoff.md`. The
place's id (`the_long_way`) and the saves are unchanged; the earlier rounds' records keep the old name. The world
map's label is set as two lines, since one ran off the map on a phone. Checked by tests and in headless Chromium at a
phone and a desktop size; not on a phone, and no model was told the new name. Asked
whether the merge should also restart the server, the owner answered "Yes to both": it is merged to `main` without
`[skip render]`, so the page and the server are both deployed, and issue #10 is closed. The server's restart loses
the saves on its disk unless the GitHub save is on; a browser's copy puts its save back
([findings](docs/rounds/152/findings.md), picture:
[`01-world-map-phone.jpg`](docs/rounds/152/shots/01-world-map-phone.jpg)).

**The deploy (2026-11-22, 21:58 to 22:01 UTC).** Round 152 was merged to `main` as `ffd4b51`. CI run 45075078399
and Pages run 45075078391 succeeded for it, and Render's deployment "main - parallang" for the same commit reports
success (read from GitHub's API; the cloud session cannot reach the hosted server or the live page itself).

## Addendum 2026-11-22: round 151, the lore book says what the roads are (on `main`)

The owner asked for the next GitHub issue that needs nothing first: #12, step 1 of the issues' build order. The
world's graph is a web, its roads are threads, the web is stitched to other worlds, and no character knows it.
[`docs/lore-book.md`](docs/lore-book.md) now has this in two places: part VIII, "The roads", in the compiler's voice
(the belief that the roads were built long ago, and what anyone can see of them), and "What the book does not say",
outside that voice (the fact, how the game holds it, and what is not settled). The old parts VIII to X are IX to XI.
A text only: no code, prompt or content changed, and the owner has not read it. The
owner said "Go!": it is merged to `main` with `[skip ci] [skip render]` (nothing is built or restarted) and issue
#12 is closed ([findings](docs/rounds/151/findings.md)).

## Addendum 2026-11-22: round 150, the icons are the road's map with a walk on it (deployed)

The owner asked for the top GitHub issue, #22: the app's and the web's icon as a snapshot of the isometric map with
the graph walk on it. `client/scripts/make-icons.mjs` now draws the icons from the game's own landscape, graph and
map (seed 3, the owner's pick of the tries; a walk of nine ways) and writes the web app's five and the iPhone app's `mobile/assets/icon.png`. The
gold archway and the SVG favicon are gone. Seen in headless Chromium, not on a phone. The owner said "Go": it is merged to
`main` with `[skip render]` (the page alone; the server is not restarted) ([findings](docs/rounds/150/findings.md),
picture: [`01-icon-sizes.png`](docs/rounds/150/shots/01-icon-sizes.png)).

## Addendum 2026-11-22: round 149, the translation directly under the line (deployed)

From the live game on a phone the owner asked for nothing between the Italian line and its English: the word
buttons stood between the two. The translation is now directly under the line and the word buttons come after it
([findings](docs/rounds/149/findings.md)). The web client only.

Asked whether to deploy, the owner chose "Deploy, and keep deploying": this round is merged to `main` with
`[skip render]` (the page alone; the server is not restarted), and later changes asked for in the same chat are
deployed once tested, without a question first.

## Addendum 2026-11-22: round 148, a slider for how much of the language the characters speak, at 100 % by default (deployed)

The owner asked for "full italian for the npcs" as a slider that goes up to 100 % and starts there, with the
coloured translation carrying the learning and the voices kept.

- **Settings has "How much Italian the characters speak"**, 10 % to 100 %, 100 % unless moved. The web client sends
  it with every start and every answer; it replaces the content's share (a character's own, its rise by the turn, the
  stage's on the road). The server's default is unchanged, so the iPhone app plays as before.
- **At 100 % the narrator is told to write every line in the language only**
  (`prompts/system/dialogue_full.txt`), simply, with a translation that follows it sentence for sentence. The
  narration around the line stays English with a few words of the language.
- **At 100 % the line's translation shows with it, free.** As a hint it would be spent on every line and refused at
  a gate.

**No model was called**: the tests check what the narrator is told, not what a model then writes
([findings](docs/rounds/148/findings.md)).

**The deploy of rounds 147 and 148 (2026-11-22, 19:05 to 19:14 UTC).** The owner chose "Deploy both now" when
asked. Both rounds were merged to `main` as `f6acc02`. CI run 45058747456 succeeded and Render's deployment "main -
parallang" for the commit reports success. The Pages run for the push (45058747466) built and uploaded the page but
failed at its last step twice: first GitHub's API did not yet list the artifact just uploaded, and the re-run of
the job then found two artifacts of the same name in the one run. A fresh run started by hand on `main`
(45059330498, no change to the code) succeeded. The cloud session cannot reach the hosted server or the live page
itself; this is read from GitHub's API. The server restarted, so saves on its disk were lost unless the GitHub save
is on; a browser's copy puts its save back.

## Addendum 2026-11-22: round 147, sunsets and sunrises, clouds, and the road's map as an isometric picture (deployed)

The owner asked for "nice sunsets with beautiful orange, purple, red and beautiful sunrises", clouds, and the world
map "not top down but isometric zoomed out", to show off the fractal landscape.

- **The sky** of The Long Way Home passes through a row of palettes as the sun goes down: the day, a golden hour, a
  sunset (an orange horizon under red and purple), an afterglow, the night; the morning has its own (violet before
  dawn, a pink and gold sunrise, a pale gold morning). The sun's disc goes down to the horizon and grows as it does.
  Scattered cloud no longer greys the sky.
- **Clouds**: a layer of up to 80 low-poly clouds that drifts with the wind, thickens with the weather and takes its
  colours from the sky, so a low sun lights it from below.
- **The road's map** is an isometric picture of at least a kilometre of the landscape (`client/src/roadMap.js`):
  relief drawn three times taller than true, lit from the left, with height lines, trees and water, and the sites as
  signs standing on it.

Checked by tests and in headless Chromium at a phone and a desktop size, at one site; not on a phone
([findings](docs/rounds/147/findings.md), pictures in [`docs/rounds/147/shots/`](docs/rounds/147/shots/)). It was
deployed with round 148 (see that addendum).

## Addendum 2026-11-22: round 146, a guide to the GitHub save in Settings; day, night and weather on the road (deployed)

The owner asked for the steps of the GitHub save in the app ("I might lose this chat"), a day and night of 45
minutes, rain 30 % of the time and "other cool stuff", and a re-deploy.

- **The guide** is in Settings under "Your save": a line that says where the server keeps its saves now (read from
  its health check: its disk only, or GitHub) and "Guide: keep the saves on GitHub", which opens the four steps in
  place (a token, two variables on Render, the check, the first commit).
- **The weather** of The Long Way Home is a pure function of the clock and the road's seed
  (`server/src/road/weather.js`): a day of 45 minutes with about 25 of daylight, rain 30 % of the time in spells of
  three minutes, clouds before and after, storms. The level blends its sky and light for every moment and has rain,
  snow on high ground, stars and a moon, fireflies, lightning with thunder (none with reduced motion), wind in the
  trees and the sound of rain under the music. The hub's card shows the weather and the narrator is told it. The
  other places keep their light.

Checked by tests and in headless Chromium at a phone and a desktop size with the weather held still; not on a phone,
the sound not heard, no live model told the weather ([findings](docs/rounds/146/findings.md), pictures in
[`docs/rounds/146/shots/`](docs/rounds/146/shots/)).

**The deploy (2026-11-22).** Round 146 was merged to `main` as `3cb31fe`. The CI run and the Pages run for that
commit succeeded, and Render's deployment "main - parallang" for it reports success (read through GitHub's public
API from the cloud session, which cannot reach the hosted server or the live page itself).

## Addendum 2026-11-22: round 145, saves written to GitHub; rounds 144 and 145 deployed

The owner asked for a save safer than the browser's copy, as JSON written to GitHub that says where the learner is in
the curriculum, and said to deploy. The server can now write every save to a `saves` branch of a repository as one
JSON file per learner (a summary of the level and of the place in the curriculum, then the whole save) and read it
back when its disk has lost it (`server/src/github-saves.js`). The file's name is a hash and the learner's id is not
in it, because the repository is public. **It is off until the owner enters `PARALLANG_GITHUB_TOKEN` and
`PARALLANG_GITHUB_REPO` in Render** (the README says how); `GET /api/health` says which store is in use. Tested
against a GitHub written in the tests, not against GitHub. Rounds 144 and 145 were merged to `main` as `4772475`,
which deploys the client and the server ([findings](docs/rounds/145/findings.md)).

**The deploy (2026-11-22, 16:51 to 16:54 UTC).** CI run 45046139766 and Pages run 45046139840 succeeded for
`4772475`, and Render's deployment "main - parallang" for the same commit reports success. The cloud session could
reach neither the live page nor the hosted server (its network does not allow those hosts), so neither was looked
at: the health check's `saves` field has not been read.

## Addendum 2026-11-22: round 144, The Long Way Home: an endless road, a curriculum, and a save that survives the server (deployed with round 145)

The owner asked for a backbone: an endless fractal landscape of which only the part around the player exists, a
graph of points computed from it as the world map, a researched curriculum walked along it with random characters
described in words, pacing by what is known about learning, travel on rails or by the map, and the whole game state
saved with the place in the curriculum on show. It is built, in the web client, as a new place on the world map:
**The Long Way Home**.

- **The landscape and the graph** are pure functions of a seed (`server/src/road/terrain.js`, `graph.js`): fractal
  noise for the ground, a site on the flattest dry ground of each 88 m cell, ways where the ground between two sites
  is easy, and a ford, a pass or a ferry where one is needed so that no site is a dead end. The client builds only
  the 81 chunks around the camera (`aesthetic/src/scene/endless.js`), with very simple trees.
- **The curriculum** is content: six stages from A1.1 to B1.2, 36 units, 108 lessons, 324 objectives, in Italian and
  Spanish, with its own vocabulary of about 490 entries a language. Its order, the pacing's rules and their sources
  are in [`docs/curriculum.md`](docs/curriculum.md). A conversation is a new lesson, a review, a lesson again or a
  unit's gate; the pacing recommends one and the map offers the others at other sites.
- **The characters** are generated per site from the unit's roles and shown as descriptions beside a plain cloaked
  figure.
- **The save.** The server saved after every answer already. Now the browser keeps a copy of the whole save and puts
  it back when the server has lost it, and Settings writes it to a file and loads one.

Played from the world map through every lesson and gate with a scripted grader and narrator, and in headless Chromium
at a phone and a desktop size. **Not checked:** the Italian and Spanish (written by Claude and a subagent, read by no
speaker), a live model, a phone. The research was read as search extracts; no page could be opened. The work is on
`claude/admiring-mendel-zuqioq`; a merge to `main` deploys it, which is the owner's call
([architecture](docs/rounds/144/architecture.md), [findings](docs/rounds/144/findings.md), pictures in
[`docs/rounds/144/shots/`](docs/rounds/144/shots/)).

## Addendum 2026-11-20: round 143, every site out of the fog is reachable from anywhere

The owner clarified round 135's travel: any place that can be reached, unexplored ones too, is directly reachable from
any point; only sites still hidden in the fog need a neighbour visited first. The server's move rule now says so and
the "a character lets you pass" gate is gone ([findings](docs/rounds/143/findings.md)). Seals still hold. Tested, not
watched; the owner should confirm the skipped gate is meant.

## Addendum 2026-11-20: round 142, matching sentences share a colour

A character's line and its translation (also the correction card) are matched sentence by sentence, and each pair is
coloured alike from a colourblind-safe palette (Okabe-Ito, seven colours, cycling). A line whose two sides differ in
sentence count stays plain. Client only; tested in jsdom, not seen on a phone ([findings](docs/rounds/142/findings.md)).

## Addendum 2026-11-20: round 141, the answer boxes grow with their text

The practice box of the correction card showed two lines of a longer text. Both it and the reply box now show all their
text (the border was missing from the height), up to twelve lines, then scroll inside
([findings](docs/rounds/141/findings.md)). Client only; merged with `[skip render]`.

## Addendum 2026-11-20: round 140, the text's position is pinned to the player's scrolling

The owner still saw the text jump down when a reply arrived. The sheet now remembers the position while the player
scrolls and puts it back after any other scroll or render ([findings](docs/rounds/140/findings.md)). The jump was not
reproduced here; reload the page from Settings to be sure the build is the new one. Client only; merged with
`[skip render]`.

## Addendum 2026-11-19: round 139, the walk at its original speed

The owner asked for the camera's walk back at its original speed (2.8 m/s): the conversation already starts while the
camera walks, so round 135's doubling was not needed ([findings](docs/rounds/139/findings.md)). Travel between visited
sites stays. Client only; merged with `[skip render]`.

## Addendum 2026-11-19: round 138, the text stays where the player scrolled it

The owner asked that the conversation text never move by itself when an answer, a verdict or a reply comes in. Round
136's scroll to the reply is removed; only opening a conversation sets the scroll
([findings](docs/rounds/138/findings.md)). Client only; merged with `[skip render]`.

## Addendum 2026-11-19: round 137, the correction card's practice box grows

The owner's screenshot showed the correction card's practice box as one line with the verdict cut off below it. The box
now wraps and grows, Check and the microphone sit below it, and the verdict is scrolled into view
([findings](docs/rounds/137/findings.md)). Client only; merged with `[skip render]`.

## Addendum 2026-11-19: round 136, Courier New and the text at the reply

The owner asked for every font to be Courier New and for the conversation text to stand at the character's reply
when it arrives, not scrolled to the end below it. Both are in the web client ([findings](docs/rounds/136/findings.md)).
Client only; merged with `[skip render]`.

## Addendum 2026-11-19: round 135, a faster walk and travel between discovered places

The owner asked for the camera's walk to be twice as fast and for a move between any two discovered places, not
only neighbours. The walk is 5.6 m/s. A move to any visited site is allowed (the server's pass rule), and the camera
walks the paths between ([findings](docs/rounds/135/findings.md)). Deployed with rounds 133, 134 and 135 by a merge to
`main`; the Render deploy wipes the saves on the free plan.

## Addendum 2026-11-19: round 134, a minimal Micromort Mountain

The owner asked for a minimal Micromort Mountain: one encounter with Eduardo, a hiker who sprained his ankle, the
level starting halfway up the mountain and a snowy summit with a wine festival. The world map now opens the
mountain beside Ta Prohm. Its level is a ridge trail up to a snowfield; Eduardo sits on a ledge halfway up, and
the festival (bonfire, marquees, tables, bunting, a crowd) stands on the summit as scenery. Eduardo's encounter has
three objectives (help, the top, a festival) in Italian and Spanish; resolving him completes the run. His location,
The Micromort Trail, joins the market's world beside The High Gate. Checked with scripted replies and in headless
Chromium, not against the live model and not on a phone; the Italian and Spanish text awaits the owner's review
([findings](docs/rounds/134/findings.md), pictures in [`docs/rounds/134/shots/`](docs/rounds/134/shots/)).

## Addendum 2026-11-19: round 133, The Kiln, a burnt Ta Prohm on the world map (deployed)

The owner asked for a new zone on the world map that reuses Ta Prohm's assets and textures: lava-rock floor, glowing
and smouldering ruins, charred trees without foliage, red glow everywhere. It is The Kiln (the name is Claude's): a
third level in `aesthetic/`, built by Ta Prohm's builder under an ember theme with no new texture or model, and a
second open place on the web client's world map. It is playable with Ta Prohm's seven sites and characters under
its own site names, and keeps a run of its own; the browser remembers the place last entered. Judged from
screenshots by Claude, not by the owner and not on a phone. The owner said to deploy: the merge to `main` carries
no `[skip render]`, so Pages builds the client and Render the server, whose restart wipes the saves on the free plan
once more. Another session's round took the number 132 meanwhile, so this one is 133
([findings](docs/rounds/133/findings.md), pictures: [`03-ash-gate-desktop.jpg`](docs/rounds/133/shots/03-ash-gate-desktop.jpg),
[`kiln-face-gopura.png`](aesthetic/docs/shots/kiln-face-gopura.png)).

## Addendum 2026-11-19: round 132, the conversation panel's layout

The owner reported from the iPhone that Settings did not scroll and that the pinned objective box (a list since
round 131) left a thin wedge of text. Settings now scrolls inside the screen. The objective box stands in the
conversation after the character's opening line; once scrolled past, it folds into a one-line bar that a tap
unfolds. The panel has a grip and drags up to the top bar and down to the grip alone. Checked in a headless browser
at the iPhone's size with touch, not on the iPhone ([findings](docs/rounds/132/findings.md), pictures in
[`docs/rounds/132/shots/`](docs/rounds/132/shots/)).

## Addendum 2026-11-19: round 131's server half is deployed

The owner said to deploy the server. The push that carries this note has no `[skip render]`, so Render builds the
server with the conversational prompts, the graders' paragraph line and the list of open objectives. The free plan's
saves are wiped by it once more; the web client now recovers from that by itself.

## Addendum 2026-11-19: round 131, a turn asks for a paragraph (the server half not deployed yet)

The owner finds each turn slow and asked that each ask for more: an answer of about a paragraph, with conversational
characters from the first line. The character's line is now asked to be two to four sentences that request
everything still open at once and add a question of its own; the objective card lists every open objective; the
reply box takes several lines. No content was added, so a conversation can finish in one or two answers. **The
client is deployed. The server half (the prompts and the list of open objectives) is on `main` and not deployed**: a
server deploy wipes the owner's run on the free plan, so it waits for the owner's word; the next push to `main`
without `[skip render]` deploys it ([findings](docs/rounds/131/findings.md)).

## Addendum 2026-11-19: a server that forgot the learner no longer strands the player

The owner's first answer at Mortimer's site came back "Unknown learner ID. Create a learner identity first.", with
the conversation left dead on the screen. Cause: the hosted server had restarted for a deploy, and on the free Render
plan a restart wipes the saves; the page still held the old learner's id. Five server deploys went out on this day (rounds 125 and 126 together, 128, 129, its Amendment, 130).
The web client now recognises that answer on any request, says "The server was restarted and lost your run with it.
A new run has started.", drops the dead conversation and starts a new run at the temple map. The run itself is still
lost: keeping saves across restarts needs the paid plan's disk (`render.yaml`) or fewer server deploys. Client only,
no round (`client/src/stores/gameStore.js`, a test in `camera-wiring.test.jsx`).

## Addendum 2026-11-19: round 130, Italian words in the narration, tapped for their meaning

The owner liked the narration and asked whether it follows the share of Italian words. It did not; the prompt kept
it English. It is now asked to be English prose with a few target-language words dropped in, at half the share of
the character's line. The model lists the words with meanings; the server keeps those that are in the text and are
not an answer; in the web dungeon each is a word to tap, which shows its meaning for free. Proven with scripted
replies; the model has not been run with the new prompt ([findings](docs/rounds/130/findings.md), picture:
[`02-tapped.jpg`](docs/rounds/130/shots/02-tapped.jpg)).

## Addendum 2026-11-19: beginner mode takes English too

The owner played round 129's build: Italian with mistakes is corrected as designed, but English was not accepted.
His decision: English and Italian may be used alone or mixed, and English is corrected like a mistake. The beginner
grader now counts an English answer that says what is asked as an attempt and gives it in Italian in the correction,
for a heart; the character is told not to remark on the language. The browser listens in one language at a time, so
the microphone got a switch between Italian and English ([round 129's Amendment](docs/rounds/129/architecture.md)).

## Addendum 2026-11-19: round 129, beginner mode

The owner answered Portia with "Bungiorno! Me chiamo Luigione. Come te chiame?" and got three refusals and no
correction: "very harsh for someone who has never spoken Italian". The web dungeon now has a beginner mode, on by
default. The grader works out what the player tried to say and returns it in correct Italian. A mistake costs one
heart for the whole answer, the correction is shown, and the conversation moves on. There are three hearts a
conversation; with none left a mistake is still corrected but must be said right. Under the correction the player
may say or type it again, which the app checks itself and which costs nothing. Proven with a scripted grader; the
new grading prompt has not been run against the model ([findings](docs/rounds/129/findings.md), pictures in
[`docs/rounds/129/shots/`](docs/rounds/129/shots/)).

## Addendum 2026-11-19: round 128, no internet slang; the humour in Pratchett's manner

The owner asked to get rid of the gen-Z speak ("mid" and the like) and to make the humour Pratchett style. This
reverses the meme half of round 007's "Pratchett × meme culture". The style guide now asks for Pratchett's manner
and bans internet slang, meme formats and present-day references; Gerald, Mortimer, Flick and Marginalia each lost a
slang quirk and gained one in kind (Gerald now delivers verdicts like a wine taster addressing a court). Footnotes
and the meme lore stay. A test scans the style guide, the character sheets and the encounters' English. Deployed
with the server; no line from the live model has been seen. A second flaky prefetch test, which failed CI on the
round 127 merge, is fixed ([findings](docs/rounds/128/findings.md)).

## Addendum 2026-11-19: round 127, ambient music

The owner asked for non-intrusive ambient music, in the manner of a slow ambient track he named. The web dungeon now
plays quiet generated chords from the first tap, made in the browser with no audio file: eight voicings of our own, a
new one every 14 s, never the same order twice. The music drops while a character speaks and stops while the
microphone listens; Settings has an "Ambient music" switch. Measured, not heard: a rendered sample is in the round's
folder for the owner to listen to ([findings](docs/rounds/127/findings.md),
[sample](docs/rounds/127/ambience-sample.m4a)).

## Addendum 2026-11-19: the lore as one book

The owner asked for the whole lore and story of the notes and the world as a linear book, kept outside the vault,
with "some say…" wherever the notes hold more than one version. It is [`docs/lore-book.md`](docs/lore-book.md),
"Some Say": ten parts from the Telling to the story so far, from a reading of every note in the vault. Its last section lists the note behind each part, the
forks that "some say" marks, and the few joins the compiler added that are not in the notes. It is a draft for the
owner to edit; nothing in the game reads it.

## Addendum 2026-11-19: the vertical tilt turned round

The owner tried "Tilt to look" on the iPhone and found the vertical direction inverted. Tilting the phone's top
towards the player now looks up (`TILT.pitchSign` in `client/src/scene/tilt.js`); sideways is unchanged. Deployed
to the client alone ([round 125's Amendment](docs/rounds/125/architecture.md)).

## Addendum 2026-11-19: rounds 125 and 126 are deployed; a creation myth in the owner's notes

The owner said to deploy. `main` holds both rounds as `63a3436`. The first Pages deploy failed on a race in an old
server test (`greeting-prefetch.test.js`: on a busy runner the entrance's 25 ms dwell ended before the test's move);
the test is fixed, and CI run 44559507379 and Pages run 44559506971 succeeded for `d3913c7`. Render deploys the
server from `63a3436` on its own; the cloud session could reach neither the live page nor the server, so neither was
looked at. The owner also asked for a creation myth for "language is the fabric of reality", in Pratchett's manner,
with stories within stories: it is [`parallang_obsidian/Creation Myth.md`](parallang_obsidian/Creation%20Myth.md),
linked from the lore notes. It is a draft in the repository's copy of the vault, not in the owner's own vault, and
nothing of it is in the game yet.

## Addendum 2026-11-19: round 126, the characters speak and the player may (on a branch, not deployed)

The owner asked for voiced characters by type, the player's voice recognised as text, the cheapest and easiest way,
and Sonnet as the default model. In the web dungeon each character now reads its lines aloud with the browser's own
speech, in the voice its sheet names (female, male, creature or funny, with a pitch and a rate), and a 🎤 beside the
reply box writes what the player says; the player sends it. Both cost nothing and add no call to the model. The
Claude CLI provider asks for Sonnet unless `LLM_MODEL` is set; before, it used the account's default. It was checked
by tests and in a headless browser with recorders, not heard and not on a phone. Reports say the iPhone does not
listen in a page opened from the home screen; the owner has to try. The findings also list what a turn spends its
time on: two model calls in a row ([findings](docs/rounds/126/findings.md), pictures in
[`docs/rounds/126/shots/`](docs/rounds/126/shots/)).

## Addendum 2026-11-19: round 125, tilt to look (on a branch, not deployed)

The owner asked for a gyro feature: the encounter camera should respond to the phone's orientation. Settings in the
web dungeon now has a "Tilt to look" checkbox, off by default. With it on, tilting the phone at a site turns the
camera's look by up to 12° sideways and 8° up or down; the camera stays where it stands. Ticking the box is the tap
from which iOS is asked for access to motion. It was checked by tests and in a headless browser with synthetic
orientation events, not on a phone. The work is on the branch `claude/inspiring-hypatia-xoybb3`; merging it to
`main` deploys it, which is the owner's call ([findings](docs/rounds/125/findings.md), pictures in
[`docs/rounds/125/shots/`](docs/rounds/125/shots/)).

## Addendum 2026-11-16: round 124, a legend for the map's dark patches, and the patches less dark

The owner asked what the black shadows on the temple map are. They are the fog over the sites not yet found. The
map's card now says so in one line while a site is hidden, and the patches are lighter (each of a patch's three
discs at 0.3, 0.42 before). Live as build `0.1.0+mwj51535`; checked in a headless browser, not on a phone
([findings](docs/rounds/124/findings.md), picture: [`03-map-start-phone.jpg`](docs/rounds/124/shots/03-map-start-phone.jpg)).

## Addendum 2026-11-15: round 123 is opened and only logged, New Game Plus on reused assets

The owner locked the next round's subject and asked for it to be logged only. The game should work with limited
resources as PS1 games did: reuse the assets it has and avoid building new places. So New Game Plus becomes a
feature. The player goes through the world map's places more than once, meets target-language content above their
level on each pass, and comes back to it when they understand more. Nothing is designed or built. The owner's words
and the open questions are in [`docs/rounds/123/trail/interview.md`](docs/rounds/123/trail/interview.md); the round
has no `architecture.md` yet.

## Addendum 2026-11-15: round 122, the characters stand at the sites

The owner asked for real characters in place of the placeholder beacons. Each of the seven sites now shows its
character as a 3D figure in the level's PS1 look, built in code after the character's sheet: Portia an archway with
eyes, Gerald an imp on his coffee cart, Mortimer in a striped apron with a ham for a hat, Flick a gnome on a
cracked basin, Marginalia a spectacled worm on a heap of books, Bambieshart a stooped wanderer, Errata a misaligned
figure with a bright seam. A figure turns to the player and hops when an objective is passed. They are simple
(about 140 triangles each) and were judged from screenshots by Claude, not by the owner and not on a phone. The
round also found and fixed the server test that failed now and then on GitHub
([findings](docs/rounds/122/findings.md), pictures in [`docs/rounds/122/shots/`](docs/rounds/122/shots/)).

## Addendum 2026-11-15: round 121, levels in the dungeon

The third of the owner's three integration rounds. The player earns experience in the dungeon: 10 XP for each
objective, 25 for a finished conversation, 5 for a correct review of a due card. The top bar shows the level. The
Library opens at level 3 and The Sanctuary at level 5 besides its six sites, which asks for one or two
conversations more than the six. At each level the dungeon's characters speak a little more of the target language
(3 points per level). The numbers are a first choice. It was played in a headless browser with scripted replies,
not against the live model and not on a phone, so what the model writes at the higher ratio is not yet seen. The
iPhone app's play is unchanged. A page older than this round is told to reload
([findings](docs/rounds/121/findings.md), pictures in [`docs/rounds/121/shots/`](docs/rounds/121/shots/)).

## Addendum 2026-11-15: round 120, the party in the dungeon

The second of the owner's three integration rounds. In the dungeon a character who can be saved (Gerald, Mortimer,
Flick, Marginalia) may be saved to the party once they have let the player pass, and talked to again from a Party
panel wherever the player is, as in the iPhone app. After three finished conversations a member offers a deeper
one. It was played in a headless browser with scripted replies, not against the live model and not on a phone. The
owner was away, so Claude decided the open points and reports them. Levels are round 121
([findings](docs/rounds/120/findings.md), pictures in [`docs/rounds/120/shots/`](docs/rounds/120/shots/)).

## Addendum 2026-11-15: round 119, the dungeon is a map under a world map

The owner asked to bring the earlier gameplay (the world map, the party, leveling) into the dungeon, one round each.
This is the first. Ta Prohm now holds all seven market encounters as sites joined by paths. The player picks where
to walk on a top-down map with fog of war: a character lets them pass once answered, the way back is always open,
and The Sanctuary (Errata) is sealed until the other six are cleared. A world map above it shows Ta Prohm open and
Angkor Wat and Micromort Mountain closed. It was played through all seven sites in a headless browser with scripted
replies, not against the live model and not on a phone. The owner was away and said to run on the most reasonable
assumption, so Claude decided the design's open points and reports them. The party is round 120 and levels are
round 121 ([findings](docs/rounds/119/findings.md), pictures in [`docs/rounds/119/shots/`](docs/rounds/119/shots/)).

## Addendum 2026-11-15: round 118, round 117's fix for the bottom strip was wrong; a reload from Settings

Round 117's fix cut the bottom of the screen on the owner's iPhone, including the reply box, for 23 minutes on the
live site. The layout now keeps all content inside the area the phone is known to show, so nothing can be cut;
whether the empty strip is gone is still for the owner to see. Settings shows the running build and has a "Reload
the page" button ([findings](docs/rounds/118/findings.md)).

## Addendum 2026-11-15: round 117, the owner's first phone run: the bottom strip, an opacity slider, a PS1 menu look

The owner played the dungeon on an iPhone against the live server and asked for three changes, all deployed. The
screen now reaches the bottom edge when the page is opened from the home screen. Settings has a slider that sets how
much of the 3D level shows through the text panels. The panels are grey with hard corners, in the style of a PS1
menu. None of this has been checked on an iPhone from the cluster; the owner looks next
([findings](docs/rounds/117/findings.md)).

## Addendum 2026-11-14: round 116, the camera follows the conversation; the dungeon is live

The dungeon is deployed at https://marcellobarylli.github.io/ParaLLang/. Inside a conversation the camera now reacts
to the player: it moves closer each time an objective is met, and when a character lets the player pass it turns to
the gate ahead before the walk. The deployed page was opened in a headless browser and shows the temple and the
route; a conversation against the live model has not been played yet, which needs the access token
([findings](docs/rounds/116/findings.md)).

## Addendum 2026-11-14: round 115, the Ta Prohm dungeon in the web client (on a branch, not deployed)

The web client is now a dungeon crawl through the 3D Ta Prohm level: a title over a slow orbit of the temple, the
route from above with three numbered sites, then Portia's tutorial, Gerald's coffee order and Bambieshart in order,
with the camera walking between them at eye height, and a victory screen. The conversation is a bottom sheet on a
phone and a side panel on a desktop. It was played from start to finish in a headless browser with scripted replies,
not yet against the live model or on a real phone. The work is on the branch `round-115-dungeon`; merging it to
`main` deploys it, which is the owner's call ([findings](docs/rounds/115/findings.md), pictures in
[`docs/rounds/115/shots/`](docs/rounds/115/shots/)).

## Addendum 2026-11-14: the web client is live

The owner did round 114's setup steps. The web client is at https://marcellobarylli.github.io/ParaLLang/ and its
server at https://parallang.onrender.com, which calls Claude through the owner's subscription. One encounter turn was
played through the hosted server (`tools/check_hosted.py`). The live setup, its limits and the brief for round 115
(the Ta Prohm dungeon) are in [`docs/handoff.md`](docs/handoff.md). Every push to `main` now deploys both.

## Addendum 2026-11-14: round 114, the web client on GitHub Pages and a hosted server

The web client can now be served from GitHub Pages (workflows in `.github/workflows/`) and talks to a server URL set
at build time or in its settings sheet, sending the access token from there. A Dockerfile and `render.yaml` run the
server on Render with the owner's Claude subscription; in production it refuses to start without `PARALLANG_TOKEN`.
Nothing is deployed yet: the owner steps are in the README and the [findings](docs/rounds/114/findings.md). The Ta
Prohm dungeon is designed in round 114's architecture and partly built (server side); the 3D view is the next round.

## Addendum 2026-11-14: round 113, Bambieshart and the High Gate

A new optional location, The High Gate, holds Bambieshart from Zanzibart, a wanderer from a screenshot the owner
shared, with an encounter in both packs (thank him, ask about the mountain). A signpost beside the gate points to
Micromort Mountain, one chance in a million of death per step, which is the owner's idea of a place to visit. The
mountain itself is not on the map yet ([findings](docs/rounds/113/findings.md)).

## Addendum 2026-11-06: round 111, a redacted infohazard (autonomous)

The Fountain's containment file now has an annex the companion has blacked out: the jingle's second verse. The
player may read it anyway from the Spellbook, after a warning. The verse then shows in the target language with its
translation, and the file logs the reader as a new host. The price follows the owner's lore ("translating them gives
juicy lore, but at a cost"): the companion needs to recover, so the next conversation the player finishes has one
hint fewer per objective ([findings](docs/rounds/111/findings.md)).

## Addendum 2026-11-06: round 110, the spores (autonomous)

The owner's mushrooms-and-spores lore is in the game as a page of The Journey, "Spores", found at Mortimer's stall
after the first order there: mushrooms on the Dead Branch's roots, whose spores make Journathan dream a new tongue and
wake in a world that speaks it ("some say this book was born the same way"). A new test keeps the English shown with
every fragment from naming an answer ([findings](docs/rounds/110/findings.md)).

## Addendum 2026-11-06: round 109, two new pages of The Journey (autonomous)

A check of the owner's notes against the game found that two parts of Journathan's story were missing: the
Odyssey-style opening ("the man of countless tongues"; nobody remembers whether the hero or the book came first) and
Journathan today, an ageing hero still technically on his way home and tired of his own motto. They are now two
fragments, found after Portia's tutorial and after Gerald's coffee order. The Wizard of Just in Case and the
Trepanners are not in the game yet: they need a place and live runs ([findings](docs/rounds/109/findings.md)).

## Addendum 2026-11-06: round 108, a second review of rounds 105–107 (autonomous)

A second, independent review of the last three rounds found no bug a player meets. The web client's preview mode
(`vite preview`) had picked up the access-token pass-through meant only for its development server; it no longer
does. The web client now declares a library its config uses, and every server response that carries the Spellbook is
tested for hiding word meanings during a conversation ([findings](docs/rounds/108/findings.md)).

## Addendum 2026-11-06: round 107, playthrough reports tie each line to the right call (autonomous)

The tool that plays the market through the live LLM reports, for every line a character said, how long it took and
whether it was written twice. When an answer failed after the LLM had replied and the next reply happened to be word
for word the same, the report could credit the failed call's time to the next line. Each line now comes from the
calls of the step that produced it, and a line with no call is listed instead of silently dropped. No game behaviour
changes ([findings](docs/rounds/107/findings.md)).

## Addendum 2026-11-06: round 106, the server no longer sends hidden word meanings (autonomous)

The app and the web client hide a word's meaning during a conversation and while the word is due for review, but
the server still sent the meanings, where a curious player could read them from the network. The server now leaves
them out in the same cases. Nothing on screen changes. After a server restart mid-conversation the server no longer
knows about it and sends them again; the app still hides them ([findings](docs/rounds/106/findings.md)).

## Addendum 2026-11-06: round 105, the web client reaches a protected server (autonomous)

When the server is started with an access token, the browser version of the game could not talk to it. Its
development server now adds the token on the way through, so the token never reaches the browser. The iPhone app
already sent it ([findings](docs/rounds/105/findings.md)).

## Addendum 2026-11-06: round 104, fixes from a review of rounds 100–103 (autonomous)

A review of the last four rounds found no bug a player meets. It found five ways the tool that checks playthroughs
for answers given away could miscount future reports, for example by treating Gerald's "espresso" as English even
when it is the answer. These are fixed. None of the published numbers change. The web Spellbook now also hides a word
that falls due while it is open ([findings](docs/rounds/104/findings.md)).

## Addendum 2026-11-06: round 103, the frozen web client still plays against today's server (autonomous)

A new test runs the web client's own code against the real server: it still plays Gerald's encounter, the
Spellbook and reviews. Its Spellbook showed word meanings during an encounter, which could give answers away; they
are now hidden, as in the app. The web client sends no access token, so it cannot reach a protected server; that is
left for the owner ([findings](docs/rounds/103/findings.md)).

## Addendum 2026-11-06: round 102, a replayed answer after a server restart goes to the map (autonomous)

If the server restarted while an answer's reply was lost, sending the answer again showed its verdict in a
conversation the server had forgotten, until the next answer failed. The app now checks right away: if the server
holds no conversation, it returns to the map; if it holds another one, it shows that one
([findings](docs/rounds/102/findings.md)).

## Addendum 2026-11-06: round 101, most "leaks" in NPC lines were optional words (autonomous)

The leak check counted about 130 NPC lines that held an answer. Half were Gerald's English "espresso shots" or
Errata's word for "name", which the answer does not need; they are now counted apart. Since round 051, six real ones
remain, all Italian: Flick using *ora* to mean "hour" (it is also the answer "now"), and two words in Errata's own
lines ([findings](docs/rounds/101/findings.md)).

## Addendum 2026-11-06: round 100, narratives and grader feedback do not give answers away (autonomous)

The tool that checks live playthroughs for answers given away now also reads the narrator's English text and the
grader's feedback. Over all 149 committed playthrough reports, no narrative and no feedback since round 008 names
an answer the player still has to find; the only cases are the eight no-milk hints round 008 fixed
([findings](docs/rounds/100/findings.md)).

## Addendum 2026-11-06: round 099, fixes from a second review of rounds 093–098 (autonomous)

A second review found one bug a player can hit: asking for help after an answer whose reply was lost reloaded the
conversation, and sending the answer again graded it twice. The app now keeps the conversation and asks for a
resend, which shows the verdict the server already gave. Smaller fixes: a lost save is announced even after a failed
load, a recruit no longer drops the map's refresh after a win, a review reply after leaving the screen lands
quietly, the review screen always has a way on, and a CLI failure after its exit keeps its real cause
([findings](docs/rounds/099/findings.md)).

## Addendum 2026-11-06: round 098, stale CLI temp dirs are swept (autonomous)

A server, script or test killed mid-run left its CLI temp dir (a copy of the prompt) behind. The first CLI run of a
process now removes such dirs once they are an hour old, and nothing else ([findings](docs/rounds/098/findings.md)).

## Addendum 2026-11-06: round 097, the live-run tools report what happened (autonomous)

A review of the scripts that produce the live data found that a line the server writes again (when it has no
target language) would have shown up twice in a playthrough report, shifting every later turn and making the leak
scan skip the report. No committed report has such a line yet. Reports now show the line the player saw, with the
retry beside it. The leak scan now treats objectives that may be met in any order as the server does, and
`verify-cli` no longer depends on the order the grader lists its verdicts in ([findings](docs/rounds/097/findings.md)).

## Addendum 2026-11-06: round 096, fixes from a review of the app's state (autonomous)

A review of the app's store as a whole found three bugs a player can hit. A review answered on a bad connection
could never be finished, because the resend was refused; it now replays the verdict. A slow conversation start
pulled the player out of the Spellbook; it now stays put, with a way back to the conversation. And a recruit could
be undone on screen by an older read. Help on a conversation the server had moved on now reloads it, and a save the
server lost is announced. All checked in jest; the Simulator checks are listed for the owner
([findings](docs/rounds/096/findings.md)).

## Addendum 2026-11-06: round 095, fixes from a review of the LLM layer (autonomous)

A review of the code that runs the Codex and Claude CLIs found that round 089's fix, where the player's turn takes
the CLI from a cosmetic atmosphere line, had never run in the real server: the server's provider wrapper did not say
it was a one-at-a-time CLI. It does now. Codex timeouts and aborts are reported as such again, instead of
"invalid response". A CLI process that exits while a helper keeps its output open can no longer hold the CLI slot,
or block the server's shutdown, past a short grace. The live checks wait for Codex ([findings](docs/rounds/095/findings.md)).

## Addendum 2026-11-06: round 094, the save is bounded (autonomous)

Each word card also kept a record of every time it was graded or reviewed, forever, though nothing reads it. A card
now keeps its 20 latest records; with round 093 the save no longer grows with play (138 KB after 1000 scripted turns,
flat from turn 250) ([findings](docs/rounds/094/findings.md)).

## Addendum 2026-11-06: round 093, the save stops growing with every turn (autonomous)

Each answer and review kept a full copy of its reply in the learner's save, forever: in a scripted play the save
reached 2.5 MB after 240 turns, and every turn read and rewrote all of it. A save now keeps the replies of its 20
latest attempts, without a copy of the Spellbook (158 KB after the same play). A resent answer whose reply is gone is
still refused, never counted twice ([findings](docs/rounds/093/findings.md)).

## Addendum 2026-11-06: round 092, the server token can no longer be skipped (autonomous)

A review of the core server code found that the optional `PARALLANG_TOKEN` check could be skipped by writing a route
in capitals (`/API/world`), since Express matches routes case-insensitively; every request but the health check now
needs the token. A grader's evidence must also stand in the answer as whole words ("pane" quoted from "panettone" no
longer counts), and help taken in an ordered encounter caps every objective the turn closes. The evidence rule awaits
a live check once Codex is available ([findings](docs/rounds/092/findings.md)).

## Addendum 2026-11-06: round 091, a conversation under way is not replaced (autonomous)

A review of the code of rounds 017–028 found no answer leak, and one way to lose progress: the map's "Talk to …"
silently replaced a conversation under way elsewhere (a party conversation half done). The server now refuses that
and the map card offers "Return to …" or "Leave … and talk to …" instead; a restart of the conversation works away
from its place ([findings](docs/rounds/091/findings.md)).

## Addendum 2026-11-06: round 090, fixes from a review of rounds 029–039 (autonomous)

A review of the code of rounds 029–039 found two bugs a player can hit. After a relaunch the app forgot a
conversation the server still held, which could leave the player stuck at the Rift's drill; startup now asks the
server. And a readable Spellbook card gave away a due one through its example or a phrase's meaning (*cento*'s
example "A hundred grams of ham" while *prosciutto* is due); that English now waits for the review. A save the server
cannot read no longer locks the player out of the others, and removing it keeps its file aside
([findings](docs/rounds/090/findings.md)).

## Addendum 2026-11-06: round 089, fixes from a review of rounds 040–053 (autonomous)

A review of the code of rounds 040–053 found that the location atmosphere line (off by default) let through pack
words treated as English that are real answers (*basta* at the open Fountain, es *once*); that filter now has no
exemptions, which no live line had needed. On the CLI providers an atmosphere call no longer makes the player's
conversation wait: a player's call aborts it, and the greeting prefetch waits for it instead. Two smaller fixes: a
story unlocked in a deeper party conversation would be announced, and a failed speech call restores the ambience
([findings](docs/rounds/089/findings.md)).

## Addendum 2026-11-06: round 088, a kept line no longer gives away a due card (autonomous)

A review of rounds 054–064 found one answer leak: a kept line's translation was withheld only while one of its chip
words was due, so a line from Gerald's coffee break that says *caffè* showed its translation while the *caffe* card
(from another encounter) was due. A line now waits while any of the player's cards stands in it, alone or inflected,
from any encounter; an English homograph of a due card may make it wait too ([findings](docs/rounds/088/findings.md)).

## Addendum 2026-11-06: round 087, fixes from a review of rounds 076–080 (autonomous)

A second review pass, over the greeting prefetch and the no-target-language retry, found no bug a player hits in
normal play and four gaps, now closed. A prefetched greeting the player no longer needs (they walked on, started
another conversation, removed the save) is aborted instead of holding the one CLI slot; a start waiting on a
prefetch that times out fails once instead of waiting a second timeout; the CLI runner no longer signals a process
that already exited; the OpenAI and Ollama adapters honour aborts ([findings](docs/rounds/087/findings.md)).

## Addendum 2026-11-06: round 086, three fixes from a review of rounds 081–085 (autonomous)

An independent review of the code built while Codex was limited found no bugs a player hits in normal play and three
gaps, now closed. A move no longer brings a Spellbook with meanings into an encounter the server forgot (after a
restart). A narrator footnote is also dropped when it holds an unlisted inflection of an open answer (it *buoni*, es
*quieres*): a rule measured over 47k English tokens of live narration, which caught every synthetic inflection. The
Spellbook refresh after the background also works when the app passes through `inactive`
([findings](docs/rounds/086/findings.md)).

## Addendum 2026-11-06: round 085, the Saves screen's due count refreshed (autonomous)

The Saves screen's "N due for review" now refreshes when the screen opens, after a save is removed, and after a new
save or a switch fails, all of which leave the player on that screen. Before, only the map's own refresh fed it, and
each Saves action dropped a refresh in flight ([findings](docs/rounds/085/findings.md)).

## Addendum 2026-11-06: round 084, the Spellbook refreshed (autonomous)

The app fetched the Spellbook only at startup and on a save switch, so cards falling due by the clock (SM-2 days)
never showed until an action returned one. It is now fetched again behind the screen when the Spellbook or the map
opens and when the app returns from the background. A late reply never overwrites a newer Spellbook, and none
showing meanings is applied while the player is in a conversation the server forgot ([findings](docs/rounds/084/findings.md)).

## Addendum 2026-11-06: round 083, fragments under the answer check (autonomous)

The fragments of *The Journey* now pass round 082's answer check too. Six small target-language rewrites removed
words of real answers: it *senza* and *giorno*; es *sin*, *día*, *solo*, *vez* and *más*. The English is unchanged.
Articles and one stem false positive are allowed by name ([findings](docs/rounds/083/findings.md)).

## Addendum 2026-11-06: round 082, inscriptions (autonomous)

Each location now carries a short authored inscription in the target language (it, es), "lore hidden in plain
sight". It is found by visiting the place, shown on the map card behind "Look closer" and kept in the Spellbook,
with its translation and glossary behind a toggle (withheld during encounters). A harder answer check, over every
objective target's words and stems, caught twelve problems in the drafts. A move now returns the Spellbook, which
also fixes the Rift's drill note being stale after a move. Offline: no LLM sees the inscriptions
([findings](docs/rounds/082/findings.md)).

## Addendum 2026-11-06: round 081, narrator footnotes (autonomous)

An NPC reply may carry a `footnote` (the owner's "the footnotes can turn into meme formats"): kept by the server when
short, free of pack vocabulary and not right after another, shown under the narration in the app with "*". Live
(codex-cli, 21 lines, it and es) the model wrote none, so the criterion failed and the feature is inert; no
regression where the runs reached. Codex then hit a usage limit until 2026-11-09 17:32 UTC, past the autonomous run:
no more live data in this run ([findings](docs/rounds/081/findings.md)).

## Addendum 2026-11-06: round 080, a live Italian regression tour after round 078 (autonomous)

A full Italian tour (codex-cli) resolved all six encounters with the same verdicts as round 072. The target-language
share was 0.43 against 0.44 requested, and the 8 leak lines were of known kinds. The new guard checked 35 lines and
flagged none, so it made no extra call ([findings](docs/rounds/080/findings.md)).

## Addendum 2026-11-06: round 079, `verify:cli` in Spanish (autonomous)

The scripted grading check ran in Spanish for the first time (codex-cli). All nine cases gave their expected verdicts,
including the quoted, metalinguistic, negated and third-person answers, and the encounter resolved. No feedback gave a
Spanish answer away ([findings](docs/rounds/079/findings.md)).

## Addendum 2026-11-06: round 078, a line with no target language is written again (autonomous)

If an NPC line has no target language at all (4 or more words, all in its translation, none of the encounter's
vocabulary), the server asks once more. The model sees the rejected line and a correction. If the retry fails, is
still English or takes over 20 s, the first line is kept, and a late retry is cancelled. The rule flags 2 of 1,218
recorded live lines, both real (round 048). Two live runs flagged 0 of 14 lines, so they made no extra call
([findings](docs/rounds/078/findings.md)).

## Addendum 2026-11-06: round 077, the greeting prefetch over HTTP (autonomous)

Through `server.js` and the app's routes, with `PARALLANG_PREFETCH=on`, Talk after a 10 s stay took 4.06 s and 0.03 s,
against 16.7 s after a 0.3 s stay ([findings](docs/rounds/077/findings.md)).

## Addendum 2026-11-06: round 076, the greeting written while the player reads (autonomous)

With `PARALLANG_PREFETCH=on` (off by default), the server writes an open encounter's greeting once the player has
stayed 1.5 s at its place, and Talk takes it. In a live Italian run with a 10 s stay, Talk took 4.4 s on average,
against 12.1 s without the prefetch. Every prefetched greeting was used. One start without prefetch failed on a
provider error ([findings](docs/rounds/076/findings.md)).

## Addendum 2026-11-06: round 075, three minor notes from the review (autonomous)

After a provisional verdict, the counted one now ends with "Counted." and is announced to VoiceOver once. A replay
reconciled to a newer turn no longer shows the older verdict, and the progress route compares attempt ids as strings.
Checked by tests only ([findings](docs/rounds/075/findings.md)).

## Addendum 2026-11-06: round 074, a live regression tour in Spanish (autonomous)

A full Spanish tour (codex-cli) after rounds 069–073 resolved all six encounters. The verdicts matched round 067's
in every encounter, the target-language share was 0.41 against 0.44 requested, and the 6 leak lines were the known
kinds: no regression ([findings](docs/rounds/074/findings.md)).

## Addendum 2026-11-06: round 073, a waiting line while an encounter starts (autonomous)

The NPC's greeting takes about 9 s to write. While it does, the pressed Talk button on the map or the Party screen
now shows "{name} is getting ready to talk…" instead of nothing. Checked by tests only
([findings](docs/rounds/073/findings.md)).

## Addendum 2026-11-06: round 072, a live regression tour (autonomous)

A full Italian tour (codex-cli) after rounds 069–071 resolved all six encounters. The verdicts matched round 067's
in every encounter, the target-language share was 0.45 against 0.44 requested, and the leaks were the known kinds:
no regression ([findings](docs/rounds/072/findings.md)).

## Addendum 2026-11-06: round 071, a resent answer replays (autonomous)

If an answer's response is lost after the server saved the turn, sending the same answer again now replays that
turn instead of failing with "changed in another tab". A conversation that moved on is reloaded, and the answer
stays in the box, unsent. A conversation that has closed returns the player to the map. Checked by tests only
([findings](docs/rounds/071/findings.md)).

## Addendum 2026-11-06: round 070, the verdict before the reply (autonomous)

The app no longer waits for both LLM calls before showing anything. While the NPC's reply is being written, the
grader's verdict appears in the Assessment box, marked "Not counted until {name} replies.", and the final response
then replaces it. In a live HTTP run (it, codex-cli), the verdict was readable 5.3–6.8 s into each turn, against
11.8–16.1 s for the full response. All six early verdicts were identical to the final ones. Saves, receipts and
replays are unchanged ([findings](docs/rounds/070/findings.md)).

## Addendum 2026-11-06: round 069, kept lines live (autonomous)

Round 060's kept lines work with real provider text. In both packs (codex-cli), paid sentence reveals at Gerald's and
Mortimer's encounters reached the save and the Spellbook exactly as the provider wrote them. They were hidden during
the next encounter and while a card in the line was due, opened after review, and survived a restart. Every check
passed (it 30/30, es 28/28). One difference from the fixture tests: a line with no due card opens as soon as its
encounter ends ([findings](docs/rounds/069/findings.md)).

## Addendum 2026-11-06: round 068, atmosphere variety (autonomous)

The optional atmosphere line no longer tells the same office joke everywhere. Its prompt asks for the joke to come
from the place itself, and each place and state gets one fixed kind of detail. The bureaucratic motif fell from 20
of 24 lines (round 053) to 1 of 48 live lines, with all 48 kept and every one still a joke about its own place. The
line stays off by default ([findings](docs/rounds/068/findings.md)).

## Addendum 2026-11-06: round 067, a live regression tour (autonomous)

Both live tours (codex-cli, it and es) resolved all six encounters in 64 calls each, with no regression since rounds
050–051. The verdicts are unchanged, except that an early "Adesso!" at the Fountain now fails, as round 051
intended. The target-language share was it 0.53 and es 0.52 against 0.44 requested; the Rift still runs at
0.83–0.88 against 0.50 ([findings](docs/rounds/067/findings.md)).

## Addendum 2026-11-06: round 053, location atmosphere live (autonomous)

The optional atmosphere line (`PARALLANG_ATMOSPHERE=on`) passed its live check. All 24 lines were kept, each in
English, 19–33 words, and fitting its place. But 23 of the 24 tell the same bureaucratic joke, so varying it is
follow-up A10b. The line stays off by default ([findings](docs/rounds/053/findings.md)).

## Addendum 2026-11-06: round 052, numbers in Flick's slow walk (autonomous)

All four live runs (codex-cli, it and es) resolved with the scripted verdicts. Answers with no number of minutes
failed ("Sei stanco.", "Tres horas."), and a number passed, including Mortimer's *tre*. Flick never said a number or
*andiamo* / *vamos* before the player did, and the slow walk had no leaks. H2 is done
([findings](docs/rounds/052/findings.md)).

## Addendum 2026-11-06: round 066, a playtest kit (autonomous)

[`docs/playtest/guide.md`](docs/playtest/guide.md) is a kit for prototype.md Phase 4's last task, 3–5 external
testers. Every tester plays at the owner's Mac. It covers setup, a checklist for each tester, a 45-minute session by
encounter, a table for counting by hand, questions to ask, and how to tune from the results. The README now
describes the whole market, not just Gerald. No tester has used the kit yet
([open items](docs/rounds/066/findings.md#open-items)).

## Addendum 2026-11-06: round 065, a loading line between reviews (autonomous)

"Continue reviews" now shows "Finding the next review…" instead of a brief "No due review is available.". A failed
load says "The next review could not load." and offers Try again. A reply that arrives after the player left the
screen no longer pulls them back. Checked by tests only ([open items](docs/rounds/065/findings.md#open-items)).

## Addendum 2026-11-06: round 064, speech and the background (autonomous)

When the app goes to the background, the speech voice now stops and the ambience comes back up. A peek at Control
Centre does not cut a word. On return, the ambience is undocked if nothing is speaking, so an interruption cannot leave
it lowered. Checked by tests only ([open items](docs/rounds/064/findings.md#open-items)).

## Addendum 2026-11-06: round 063, no voice outlives its screen (autonomous)

The Spellbook and the Review screen now stop the speech voice when they go, as the encounter and the map do. Before,
a fragment could go on reading over the map with the ambience lowered. The critique also found a race in `speak`: a
stop that arrived while `speak` waited for the previous utterance was ignored. `speak` now gives way to it. Checked by
tests only ([open items](docs/rounds/063/findings.md#open-items)).

## Addendum 2026-11-06: round 062, the narrator on the map and the companion card (autonomous)

The map card now has "Hear the place". It reads the place's name, description and atmosphere line in the narrator's
English voice. The companion card has "Hear the briefing". Moving to another place or leaving the map stops the voice.
Capitals and target-language words in descriptions, such as MERCATO, are read by the English voice. Checked by tests
only ([open items](docs/rounds/062/findings.md#open-items)).

## Addendum 2026-11-06: round 061, hear the narrator (autonomous)

Each NPC message's narration now has a 🔊, "Hear the narrator". It reads the English text with the device's British
voice, or any English voice, and never a novelty voice. This follows the owner's note that everything should be
spoken by a narrator. It plays on demand only; reading each narration automatically is an owner question. A word chip
cuts the narration. Checked by tests only ([open items](docs/rounds/061/findings.md#open-items)).

## Addendum 2026-11-06: one command for every test (autonomous, maintenance)

`npm test` at the root runs the server, web-client and app tests (about 20 s). `npm run test:server` runs the server
alone. A bare `node --test` inside `server/` hangs, because it also runs the fake CLIs in `server/test/fixtures/` as
tests and they wait on stdin. The README says so. Backlog F4; no round.

## Addendum 2026-11-06: round 060, lines you translated (autonomous)

When the player pays to translate an NPC line, the line is now kept in the save, up to the 50 newest. The Spellbook
lists these lines under "Lines you translated", each with a 🔊 and its translation behind a toggle. This follows the
owner's note that translated sentences should be kept for retrieval. The translation is withheld during encounters
and while any card in the line is due, since the line would give that card's answer. Stored receipts no longer copy
the lines. Checked by tests only ([open items](docs/rounds/060/findings.md#open-items)).

## Addendum 2026-11-06: round 059, word class on Spellbook cards and in reviews (autonomous)

The word class now looks the same on Spellbook cards and on the review prompt as on the encounter chips. On a card,
the class word is in its chip colour (nouns blue, verbs red, adjectives green); other classes stay in muted text, and
card frames stay neutral. The review prompt shows the class under the word. The app takes it from the Spellbook card,
so the server is unchanged. Meanings stay hidden wherever round 017 hides them. Showing the class on a recall prompt is
an owner question. Checked by tests only ([open items](docs/rounds/059/findings.md#open-items)).

## Addendum 2026-11-05: round 058, every vocabulary form matches its own entry (autonomous)

The matcher used to sort entries by their longest variant. An entry with one long variant could then take another
entry's phrase with a short variant: a synthetic `buono` took `buon giorno`. Today's packs passed only because of
the lengths their entries happen to have. The matcher now tries every (entry, variant) pair longest first, and a
pack-wide test requires every form of both packs to match its own entry. The matcher's output on 1,021 saved live
NPC lines is unchanged.

## Addendum 2026-11-05: round 057, chip words marked in the line (autonomous)

The words that have chips under an NPC line are now marked inside the line too, at the spans the server matched.
The server sends `spans` on narration words, so a word inside a longer match is never marked. Nouns are blue,
adjectives green, verbs red with a dashed underline, and other classes get an ink underline. Lines saved before
this round stay unmarked. A contract test runs the server's matcher through the app's `segmentLine`. Checked by
tests only ([open items](docs/rounds/057/findings.md#open-items)).

## Addendum 2026-11-05: round 056, word chips by class (autonomous)

The word chips under NPC lines now show their class, as the owner's note asks ("R/G/B for noun/verb/adjective").
Nouns get a blue border and "noun", verbs a red dashed border and "verb", adjectives a green border and "adj.".
The label and the dash mean colour is never the only cue, and VoiceOver hears the class in the chip's name. Other
classes keep today's look. Revealed chips are no longer dimmed. The class shows on the active line too; that is an
owner question, as is the palette. Checked by jest only ([open items](docs/rounds/056/findings.md#open-items)).

## Addendum 2026-11-05: round 055, hear the words of an encounter line (autonomous)

Each word chip under an NPC line now has a 🔊 that speaks the chip's word in the pack's voice, as Spellbook cards
and reviews already did. It is free: it costs no hint and reveals no meaning, and it stays enabled when the chip is
not. When no voice is installed, the chip rows have no speaker. Voices are looked up once per language, a late
callback no longer raises the ambience under the next word, and leaving the encounter stops the voice. Checked by
jest only; the sound, layout and VoiceOver need the Simulator
([open items](docs/rounds/055/findings.md#open-items)).

## Addendum 2026-11-05: round 054, typographic apostrophes (autonomous)

An iPhone types ’ with Smart Punctuation, and the server compared apostrophes exactly. A correct "È l’una" could
therefore fail as `INVALID_GRADING` on every retry whenever the grader quoted it with '. `ancora un po’` also
matched only `ancora`. Every apostrophe look-alike now folds to ' in four places: the vocabulary matcher, answer
normalisation (reviews), the grader-evidence check (which also folds NFC and whitespace) and the atmosphere filter.
Content and prompts are unchanged. There were no live runs (Codex at its limit). The owner should check the case
in the Simulator ([open items](docs/rounds/054/findings.md#open-items)).

## Addendum 2026-11-05: round 051, an early pass is not a success (autonomous)

In an encounter with ordered objectives, an answer that meets a later objective while an earlier one is still open
used to be graded as passed and shown with ✓. The narrator praised it too. Yet the objective stayed open, and the
player had to say it again. The grading prompt now says that objectives count only in order. Live, the grader then
failed the early "now" at the Fountain and said to say it again after the time. Flick did not celebrate, and an
answer holding both still closed both. A pass that does not close is now marked `held` and shown as "…" in the app.
This is a backstop that was tested offline only. verify:cli and the Spanish tour pass. Critiqued by Codex (9
findings: 7 accepted, 2 in part). Server 198/198, mobile 126/126
([open items](docs/rounds/051/findings.md#open-items)).

## Addendum 2026-11-05: round 050, telling the time at the Fountain (autonomous)

Flick now has a fourth objective between the direction and "now": the fountain's clock stopped, Flick says it is
always too early, and the player tells it the time (it *sono le …*, *è l'una*, *mezzogiorno*, *mezzanotte*; es *son
las …*, *es la una*, *mediodía*, *medianoche*). No number lesson was added, but Mortimer already teaches *tre* /
*tres*. Live, three runs per language passed 48 of 48 verdicts as planned. The grader rejected "now" without a time,
a question with a time in it and an action scheduled for midday. Flick asked the time but never said one. The
Italian tour still resolves (64 calls). Critiqued by Codex (13 findings: 8 accepted, 5 in part). Server 192/192,
mobile 124/124 ([open items](docs/rounds/050/findings.md#open-items)).

## Addendum 2026-11-05: round 049, other conversations' words in NPC lines (autonomous)

The leak scan now also reports *other-target exposure*: NPC lines holding a word that a different party
conversation teaches. These are counted apart from leaks. In round 048's runs it is common (half the Italian and a
third of the Spanish party lines), but the words are everyday ones (*grazie*, *ancora*, *vamos*, Mortimer's *amico
mio*). Hearing them first is input, not the answer, so no content rule was added. One authored case was found:
Marginalia's first passage says "una lingua sola" ("only"), and *sola* is now her deeper tier's target. No live calls.
Critiqued by Codex (9 findings: 7 accepted, 2 in part). Server 188/188
([open items](docs/rounds/049/findings.md#open-items)).

## Addendum 2026-11-05: round 048, deeper conversations for Mortimer, Flick and Marginalia (autonomous)

After three conversations, every saveable member now offers a deeper conversation, as Gerald has since round 047.
Mortimer's oath: calm him (*tranquillo* / *tranquilo*), then promise (*prometto* / *prometo*). Flick's lotus: wake
it (*svegliati* / *despierta*), then give it courage (*coraggio* / *ánimo*). Marginalia's folded page: answer "here I
am" (*eccomi* / *aquí estoy*), then tell her she is not alone (*non sei sola* / *no estás sola*). All three are
content only. Live in both languages, all three resolved with every verdict as scripted, including a wrong line that
holds the target word but not the meaning. Amendment 1: Marginalia's second line had become all English, and it now
mixes languages again. Other members' targets turn up in NPC lines (Flick says *eccomi*), recorded as an open item.
Critiqued by Codex (6 findings: 5 accepted, 1 in part). Server 184/184, mobile 124/124
([open items](docs/rounds/048/findings.md#open-items)).

## Addendum 2026-11-05: round 047, a deeper conversation after three coffee breaks (autonomous)

Party conversations can now have tiers. A conversation with `after_conversations: N` is offered once the member has
finished N conversations, and the deepest unlocked tier is what Talk starts. Gerald's confidence is the first: after
three coffee breaks, the player tells him he is a friend and makes the toast (it *amico*, *cin cin*; es *amigo*,
*salud*). The Party card says that a deeper conversation is waiting. Live, both languages resolved as scripted.
Amendment 1 moved the Dead Branch opening into the greeting: before it, Gerald greeted the player as a stranger.
Critiqued by Codex (8 findings: 6 accepted, 1 in part, 1 rejected). Server 181/181, mobile 124/124
([open items](docs/rounds/047/findings.md#open-items)).

## Addendum 2026-11-05: round 046, a share estimate for glitched lines (autonomous)

`languageShare` (play-market) now also reports `folded`, which folds glitch letters on both sides before comparing.
It abstains (`translationShort`) when the translation is under 60% of the line. Against the hand counts, its mean
error on the same lines is 0.003, against the old estimate's 0.175, and 0.021 against 0.350 on a held-out set. All
the gain is in Errata's lines. It abstains only on the two known glosses. The old estimate is unchanged. Critiqued by
Codex (9 findings: 5 accepted, 4 in part) ([open items](docs/rounds/046/findings.md#open-items)).

## Addendum 2026-11-05: round 045, objectives in any order (autonomous)

An encounter may now set `objectives_unordered: true`: every objective that passes closes, in any order. Mortimer's
tasting is the first to use it (like it / ask for more), and every other encounter is unchanged. Live in both
languages, asking for more first closed that objective, and the verdict then resolved the tasting (14 calls each).
Critiqued by Codex (9 findings: 5 accepted, 2 in part, 2 rejected). Server 176/176
([open items](docs/rounds/045/findings.md#open-items)).

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
| 064 | 11-06 | Speech stops in the background; the ambience is undocked on return when nothing speaks (backlog C10d) (autonomous) | [064](docs/rounds/064/architecture.md) | [findings](docs/rounds/064/findings.md) | pre-run record to round 064 close |
| 065 | 11-06 | A loading line and a failure state between reviews; a late review reply no longer pulls the player back (round 063 critique) (autonomous) | [065](docs/rounds/065/architecture.md) | [findings](docs/rounds/065/findings.md) | pre-run record to round 065 close |
| 066 | 11-06 | A playtest kit for the owner (prototype.md Phase 4) and a README refresh (autonomous) | [066](docs/rounds/066/architecture.md) | [findings](docs/rounds/066/findings.md) | pre-run record to round 066 close |
| 067 | 11-06 | A live regression tour, it and es, after rounds 051–066 (autonomous) | [067](docs/rounds/067/architecture.md) | [findings](docs/rounds/067/findings.md) | pre-run record to round 067 close |
| 068 | 11-06 | Atmosphere variety: no generic office humour, one detail kind per place and state (backlog A10b) (autonomous) | [068](docs/rounds/068/architecture.md) | [findings](docs/rounds/068/findings.md) | pre-run record to round 068 close |
| 069 | 11-06 | Kept lines live: paid sentence reveals through the save and Spellbook with real text (autonomous) | [069](docs/rounds/069/architecture.md) | [findings](docs/rounds/069/findings.md) | pre-run record to round 069 close |
| 070 | 11-06 | The verdict before the NPC's reply: a progress route and app polling (backlog I1) (autonomous) | [070](docs/rounds/070/architecture.md) | [findings](docs/rounds/070/findings.md) | pre-run record to round 070 close |
| 071 | 11-06 | A resent answer replays a committed turn; a stale session reloads (round 070, critique 1.2) (autonomous) | [071](docs/rounds/071/architecture.md) | [findings](docs/rounds/071/findings.md) | pre-run record to round 071 close |
| 072 | 11-06 | A live regression tour (it) after rounds 069–071 (autonomous) | [072](docs/rounds/072/architecture.md) | [findings](docs/rounds/072/findings.md) | pre-run record to round 072 close |
| 073 | 11-06 | A waiting line while an encounter starts (backlog I3) (autonomous) | [073](docs/rounds/073/architecture.md) | [findings](docs/rounds/073/findings.md) | pre-run record to round 073 close |
| 074 | 11-06 | A live regression tour (es) after rounds 069–073 (autonomous) | [074](docs/rounds/074/architecture.md) | [findings](docs/rounds/074/findings.md) | pre-run record to round 074 close |
| 075 | 11-06 | Three minor notes from the review of rounds 070–073: a reconciled replay, a "Counted." line, progress ids (autonomous) | [075](docs/rounds/075/architecture.md) | [findings](docs/rounds/075/findings.md) | pre-run record to round 075 close |
| 076 | 11-06 | The greeting prefetched on arrival, behind `PARALLANG_PREFETCH` (autonomous) | [076](docs/rounds/076/architecture.md) | [findings](docs/rounds/076/findings.md) | pre-run record to round 076 close |
| 077 | 11-06 | The greeting prefetch over HTTP through `server.js` (autonomous) | [077](docs/rounds/077/architecture.md) | [findings](docs/rounds/077/findings.md) | pre-run record to round 077 close |
| 078 | 11-06 | An NPC line with no target language is written again once (autonomous) | [078](docs/rounds/078/architecture.md) | [findings](docs/rounds/078/findings.md) | pre-run record to round 078 close |
| 079 | 11-06 | `verify:cli` in Spanish with codex-cli (autonomous) | [079](docs/rounds/079/architecture.md) | [findings](docs/rounds/079/findings.md) | pre-run record to round 079 close |
| 080 | 11-06 | A live Italian regression tour after round 078 (autonomous) | [080](docs/rounds/080/architecture.md) | [findings](docs/rounds/080/findings.md) | pre-run record to round 080 close |
| 081 | 11-06 | Narrator footnotes, now and then, without pack vocabulary (autonomous) | [081](docs/rounds/081/architecture.md) | [findings](docs/rounds/081/findings.md) | pre-run record to round 081 close |
| 082 | 11-06 | Inscriptions: lore in the target language at each location, found by visiting (autonomous) | [082](docs/rounds/082/architecture.md) | [findings](docs/rounds/082/findings.md) | pre-run record to round 082 close |
| 083 | 11-06 | Fragments under the inscriptions' answer check; six target-language rewrites (autonomous) | [083](docs/rounds/083/architecture.md) | [findings](docs/rounds/083/findings.md) | pre-run record to round 083 close |
| 084 | 11-06 | The Spellbook refreshed on opening it, the map, and the return from the background (autonomous) | [084](docs/rounds/084/architecture.md) | [findings](docs/rounds/084/findings.md) | pre-run record to round 084 close |
| 085 | 11-06 | The Saves screen's due count refreshed on opening it, after a remove and after a failed switch (autonomous) | [085](docs/rounds/085/architecture.md) | [findings](docs/rounds/085/findings.md) | pre-run record to round 085 close |
| 086 | 11-06 | Three fixes from a review of rounds 081–085: a move's Spellbook guarded, footnote inflections, the foreground refresh (autonomous) | [086](docs/rounds/086/architecture.md) | [findings](docs/rounds/086/findings.md) | pre-run record to round 086 close |
| 087 | 11-06 | Fixes from a review of rounds 076–080: stale prefetches aborted, one timeout at most, runner and adapter aborts (autonomous) | [087](docs/rounds/087/architecture.md) | [findings](docs/rounds/087/findings.md) | pre-run record to round 087 close |
| 088 | 11-06 | Fixes from a review of rounds 054–064: a kept line hidden while any due card stands in it (autonomous) | [088](docs/rounds/088/architecture.md) | [findings](docs/rounds/088/findings.md) | pre-run record to round 088 close |
| 089 | 11-06 | Fixes from a review of rounds 040–053: no answers in the atmosphere line, atmosphere calls give way to the player's on a CLI provider (autonomous) | [089](docs/rounds/089/architecture.md) | [findings](docs/rounds/089/findings.md) | pre-run record to round 089 close |
| 090 | 11-06 | Fixes from a review of rounds 029–039: startup knows the server's encounter, no due answer in other cards' examples, saves reachable after a failed start (autonomous) | [090](docs/rounds/090/architecture.md) | [findings](docs/rounds/090/findings.md) | pre-run record to round 090 close |
| 091 | 11-06 | Fixes from a review of rounds 017–028: a conversation under way is not replaced by the map's Talk; a way back and a way out (autonomous) | [091](docs/rounds/091/architecture.md) | [findings](docs/rounds/091/findings.md) | pre-run record to round 091 close |
| 108 | 11-06 | Fixes from a second review of rounds 105–107: no token proxy in `vite preview`, the client declares `dotenv`, withholding tests for every Spellbook route (autonomous) | [108](docs/rounds/108/architecture.md) | [findings](docs/rounds/108/findings.md) | pre-run record to round 108 close |
| 109 | 11-06 | Owner-notes audit; two fragments of The Journey, the archway's telling and Journathan still on his way (autonomous) | [109](docs/rounds/109/architecture.md) | [findings](docs/rounds/109/findings.md) | pre-run record to round 109 close |
| 146 | 11-22 | A guide to the GitHub save in Settings, with where the server keeps its saves now; on The Long Way Home a day of 45 minutes, rain 30 % of the time, a blended sky, rain, snow, stars, fireflies, lightning, wind and the sound of rain; the narrator told the weather; deployed | [146](docs/rounds/146/architecture.md) | [findings](docs/rounds/146/findings.md) | round 146 build, merged to `main` |
| 147 | 11-22 | Sunsets in orange, red and purple and sunrises in gold and pink on The Long Way Home, the sun's disc down to the horizon; a layer of drifting clouds lit by the sky; the road's map as an isometric picture of the landscape with relief; deployed with round 148 | [147](docs/rounds/147/architecture.md) | [findings](docs/rounds/147/findings.md) | round 147 build, merged to `main` |
| 148 | 11-22 | A slider in Settings for how much of the language the characters speak, 100 % by default: the narrator is told to speak the language only, and at 100 % the line's translation shows with it, free; the server's default and the iPhone app unchanged; no model called; deployed | [148](docs/rounds/148/architecture.md) | [findings](docs/rounds/148/findings.md) | round 148 build, merged to `main` |
| 149 | 11-22 | The translation directly under a character's line, the word buttons after it; the web client only; deployed | [149](docs/rounds/149/architecture.md) | [findings](docs/rounds/149/findings.md) | round 149 build, merged to `main` |
| 150 | 11-22 | The icons of the web app and the iPhone app are a snapshot of the road's isometric map with a walk on it (issue #22); deployed | [150](docs/rounds/150/architecture.md) | [findings](docs/rounds/150/findings.md) | round 150 build, merged to `main` |
| 151 | 11-22 | The lore book says what the roads are: the graph is a web of threads stitched to other worlds, and no character knows (issue #12); a text only; on `main` | [151](docs/rounds/151/architecture.md) | [findings](docs/rounds/151/findings.md) | round 151 build, merged to `main` |
| 152 | 11-22 | The road's name is The Journey 2: Journathan Returns (again) (issue #10): the world map, the top bar, the narrator's scene, the documents; ids and saves unchanged; deployed | [152](docs/rounds/152/architecture.md) | [findings](docs/rounds/152/findings.md) | round 152 build, merged to `main` |
| 153 | 11-22 | Light mode beside strict mode (issue #1): one call that reads the answer and replies, nothing checked; a Strict / Light choice in Settings; strict mode unchanged | [153](docs/rounds/153/architecture.md) | [findings](docs/rounds/153/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 154 | 11-22 | A light conversation is an exchange of three to five turns (issue #2): a floor of three, a ceiling of five, the objectives decide between; follow-ups and questions back asked of the model and nudged on the screen | [154](docs/rounds/154/architecture.md) | [findings](docs/rounds/154/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 155 | 11-22 | The characters belong to the world (issue #3): what everybody knows, a region's lore and one thing noticed, as one block of the narrator's prompt; the road acts as Tuscany; A levels ordinary, B levels more knowing | [155](docs/rounds/155/architecture.md) | [findings](docs/rounds/155/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 156 | 11-22 | The italic text is a narrator (issue #6): a storybook told to "you" that knows more than it says, as rules in the style guide; 26 written passages for the road and the dungeons' sites; segments and the save's `told` as hooks for issues #4 and #5; Gerald's pinned prompts regenerated | [156](docs/rounds/156/architecture.md) | [findings](docs/rounds/156/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 157 | 11-22 | The guidebook (issue #5): entries as content, entered when their event first happens, kept in the save, told once on the place's card and read in a panel behind the top bar's "?" | [157](docs/rounds/157/architecture.md) | [findings](docs/rounds/157/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 158 | 11-22 | Untranslatable text in the narration (issue #4): ten texts a pack in the language being learned only, set into written passages in turmeric with nothing to tap; the guidebook's "Turmeric text" entry and the texts found; the vault's "Understood Later" | [158](docs/rounds/158/architecture.md) | [findings](docs/rounds/158/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 159 | 11-22 | Three characters utter a deeper truth (issue #7): an encounter's `revelation`, told by the narrator on completion in turmeric and kept by the guidebook; Marginalia, Bambieshart and Errata | [159](docs/rounds/159/architecture.md) | [findings](docs/rounds/159/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 160 | 11-23 | Biomes, and the legacy dungeons as nodes of the road (issue #8): jungle, woodland and steppe, the road starting in the jungle; a point's old "biome" renamed cover; a unit's gate stands in a legacy dungeon whose node is on the map ("Enter Ta Prohm") and whose level is built on entry | [160](docs/rounds/160/architecture.md) | [findings](docs/rounds/160/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 161 | 11-23 | The whole journey, saved and painted on the map (issue #9): `road.walk` as node ids, its own route, and the map's "Show Journey so far" | [161](docs/rounds/161/architecture.md) | [findings](docs/rounds/161/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 162 | 11-23 | Pulled tree models for the road (issue #11): fifteen CC0 models by flo-bit in one 34 kB file, its source and licence in `ASSETS.md`, stamped into the five nearest chunks, loaded on the road only, with a switch in Settings | [162](docs/rounds/162/architecture.md) | [findings](docs/rounds/162/findings.md) | on `main` with `5ae0627` (the deploy of rounds 153 to 164) |
| 145 | 11-22 | Saves written to GitHub by the server: one JSON file per learner on a `saves` branch, with the place in the curriculum, read back when the disk has lost it; off until the owner sets a token; rounds 144 and 145 deployed | [145](docs/rounds/145/architecture.md) | [findings](docs/rounds/145/findings.md) | round 145 build, merged to `main` |
| 144 | 11-22 | The Long Way Home: an endless fractal landscape, a graph of sites over it, a curriculum from A1 to B1 with generated characters and pacing, travel on rails or by the map, and a copy of the save that survives the server (on a branch) | [144](docs/rounds/144/architecture.md) | [findings](docs/rounds/144/findings.md) | round 144 build on `claude/admiring-mendel-zuqioq` |
| 141 | 11-20 | The answer boxes grow with their text, up to twelve lines | [141](docs/rounds/141/architecture.md) | [findings](docs/rounds/141/findings.md) | round 141 build |
| 140 | 11-20 | The text's position is pinned to the player's scrolling | [140](docs/rounds/140/architecture.md) | [findings](docs/rounds/140/findings.md) | round 140 build |
| 139 | 11-19 | The walk back at its original speed | [139](docs/rounds/139/architecture.md) | [findings](docs/rounds/139/findings.md) | round 139 build |
| 138 | 11-19 | The conversation text stays where the player scrolled it | [138](docs/rounds/138/architecture.md) | [findings](docs/rounds/138/findings.md) | round 138 build |
| 137 | 11-19 | The correction card's practice box grows and wraps, Check below | [137](docs/rounds/137/architecture.md) | [findings](docs/rounds/137/findings.md) | round 137 build |
| 136 | 11-19 | Courier New everywhere; the text stands at the character's reply | [136](docs/rounds/136/architecture.md) | [findings](docs/rounds/136/findings.md) | round 136 build |
| 135 | 11-19 | A faster walk; a move between any two discovered places | [135](docs/rounds/135/architecture.md) | [findings](docs/rounds/135/findings.md) | round 135 build |
| 134 | 11-19 | A minimal Micromort Mountain: Eduardo on a ledge halfway up, a snowy summit with a wine festival | [133](docs/rounds/134/architecture.md) | [findings](docs/rounds/134/findings.md) | round 133 build |
| 133 | 11-19 | The Kiln: a third level built from Ta Prohm's plan and textures under an ember theme (lava floor and moat, glowing stone, charred bare trees), a second dungeon on it and a second open place on the world map (deployed) | [133](docs/rounds/133/architecture.md) | [findings](docs/rounds/133/findings.md) | `98c1fc4` (pre-run record) to round 133 close; build `b0c2b08` |
| 132 | 11-19 | Settings scrolls; the objective box follows the opening line and folds into a bar; the conversation panel drags from the top bar down to its grip | [132](docs/rounds/132/architecture.md) | [findings](docs/rounds/132/findings.md) | `74f16da` (pre-run record) to round 132 close; build `16ec3f9` |
| 131 | 11-19 | A turn asks for a paragraph: the character asks for everything open and a question of its own; the card lists the open objectives; a reply box of several lines (server half waits for a deploy) | [131](docs/rounds/131/architecture.md) | [findings](docs/rounds/131/findings.md) | `15bb752` (pre-run record) to round 131 close; build `5af7179` |
| 130 | 11-19 | Target-language words in the narration, each tapped for its meaning (half the line's share; listed by the model, filtered by the server) | [130](docs/rounds/130/architecture.md) | [findings](docs/rounds/130/findings.md) | `2ca2b2b` (pre-run record) to round 130 close; build `d5ece33` |
| 129 | 11-19 | Beginner mode: a mistake is understood, corrected for one heart and the player moves on; three hearts a conversation; a practice box checked in the app | [129](docs/rounds/129/architecture.md) | [findings](docs/rounds/129/findings.md) | `8502225` (pre-run record) to round 129 close; build `2363b42` |
| 128 | 11-19 | No internet slang; the humour in Pratchett's manner (style guide, four character quirks, a tone test); a second prefetch test race fixed | [128](docs/rounds/128/architecture.md) | [findings](docs/rounds/128/findings.md) | `9cb64ee` (pre-run record) to round 128 close; build `83534c8` |
| 127 | 11-19 | Quiet ambient music made in the browser: generated chords, ducked under speech, a Settings switch | [127](docs/rounds/127/architecture.md) | [findings](docs/rounds/127/findings.md) | `9c52599` (pre-run record) to round 127 close; build `8a974a6` |
| 126 | 11-19 | Character voices by type and a spoken answer in the web dungeon (the browser's speech); the Claude CLI defaults to Sonnet; what a turn does (on a branch) | [126](docs/rounds/126/architecture.md) | [findings](docs/rounds/126/findings.md) | `5055562` (pre-run record) to round 126 close; build `c9a2ce7` |
| 125 | 11-19 | Tilt to look: the phone's orientation turns the encounter camera's look at a site (a Settings checkbox, off by default; on a branch) | [125](docs/rounds/125/architecture.md) | [findings](docs/rounds/125/findings.md) | `25d1d0f` (pre-run record) to round 125 close; build `747dbda` |
| 124 | 11-16 | A legend line for the temple map's fog patches; the patches less dark (0.42 to 0.3 per disc) | [124](docs/rounds/124/architecture.md) | [findings](docs/rounds/124/findings.md) | `17282b3` (pre-run record) to round 124 close; build `77cdf04` |
| 123 | 11-15 | Opened and only logged: New Game Plus on reused assets (no design yet) | [interview](docs/rounds/123/trail/interview.md) | — | `17282b3` |
| 122 | 11-15 | Characters at the sites: seven figures built in code in the PS1 look, one per character, in place of the beacons (autonomous, the owner away) | [122](docs/rounds/122/architecture.md) | [findings](docs/rounds/122/findings.md) | `98bb0e4` (pre-run record) to round 122 close, merged to `main` |
| 121 | 11-15 | Levels in the dungeon: XP for objectives, resolves and due reviews; a derived level; level seals on the Library and the Sanctuary; more of the target language per level (autonomous, the owner away) | [121](docs/rounds/121/architecture.md) | [findings](docs/rounds/121/findings.md) | `29f7271` (pre-run record) to round 121 close, merged to `main` |
| 120 | 11-15 | The party in the dungeon: the offer after a saveable site, the invitation on a site card, a Party panel, a conversation with a member from anywhere outside a conversation (autonomous, the owner away) | [120](docs/rounds/120/architecture.md) | [findings](docs/rounds/120/findings.md) | `b176f30` (pre-run record) to round 120 close, merged to `main` |
| 119 | 11-15 | The map in the dungeon, in two layers: Ta Prohm as a free map of seven sites with fog, a seal and a pass rule; a world map of places above it; walks along any path with a turn on the spot (autonomous, the owner away) | [119](docs/rounds/119/architecture.md) | [findings](docs/rounds/119/findings.md) | `4713727` (pre-run record) to round 119 close, merged to `main` |
| 118 | 11-15 | Round 117's strip fix cut the screen's bottom on the iPhone: a 100vh document with the panels kept out of the gap; the build and a reload in Settings | [118](docs/rounds/118/architecture.md) | [findings](docs/rounds/118/findings.md) | `ea04174` (pre-run record) to round 118 close; build `6076b49` |
| 117 | 11-15 | The owner's first phone run: the installed page fills the screen on iOS, a slider for the text panels' opacity, a PS1 menu look | [117](docs/rounds/117/architecture.md) | [findings](docs/rounds/117/findings.md) | `bd91573` (pre-run record) to round 117 close; builds `7eeadfd`, `f728a16` |
| 116 | 11-14 | The gameplay drives the camera inside an encounter (closed objectives, verdicts, the resolve); the dungeon deployed | [116](docs/rounds/116/architecture.md) | [findings](docs/rounds/116/findings.md) | `f299da0` (pre-run record) to round 116 close; merge `d01c8a0` |
| 115 | 11-14 | The Ta Prohm dungeon crawl in the web client: three sites, five camera transitions, the dialogue as a bottom sheet, a victory screen (merged to `main` in round 116) | [115](docs/rounds/115/architecture.md) | [findings](docs/rounds/115/findings.md) | `76a59f7` (pre-run record) to round 115 close |
| 114 | 11-14 | Infrastructure for the web client on GitHub Pages and a hosted server on Render (the dungeon itself moved to a later round) | [114](docs/rounds/114/architecture.md) | [findings](docs/rounds/114/findings.md) | `4200fe4` (pre-run record) to round 114 close |
| 113 | 11-14 | The High Gate: Bambieshart from Zanzibart and a Micromort Mountain signpost, in both packs | [113](docs/rounds/113/architecture.md) | [findings](docs/rounds/113/findings.md) | this commit |
| 110 | 11-06 | Spores: a fragment of The Journey on the mushrooms of the dead branches, after the Butcher's Stall (autonomous) | [110](docs/rounds/110/architecture.md) | [findings](docs/rounds/110/findings.md) | pre-run record to round 110 close |
| 107 | 11-06 | play-market matches narration calls within the step that committed each line (autonomous) | [107](docs/rounds/107/architecture.md) | [findings](docs/rounds/107/findings.md) | pre-run record to round 107 close |
| 106 | 11-06 | The server withholds card meanings during encounters and on due cards (autonomous) | [106](docs/rounds/106/architecture.md) | [findings](docs/rounds/106/findings.md) | pre-run record to round 106 close |
| 105 | 11-06 | The web client's Vite proxy sends `PARALLANG_TOKEN` (autonomous) | [105](docs/rounds/105/architecture.md) | [findings](docs/rounds/105/findings.md) | pre-run record to round 105 close |
| 104 | 11-06 | Fixes from a review of rounds 100–103: the leak scan's kinds and old count, the web Spellbook's due cards (autonomous) | [104](docs/rounds/104/architecture.md) | [findings](docs/rounds/104/findings.md) | pre-run record to round 104 close |
| 103 | 11-06 | The frozen web client tested against the real server; its Spellbook hides meanings during encounters (autonomous) | [103](docs/rounds/103/architecture.md) | [findings](docs/rounds/103/findings.md) | pre-run record to round 103 close |
| 102 | 11-06 | A replayed answer after a server restart no longer leaves a conversation the server forgot on screen (autonomous) | [102](docs/rounds/102/architecture.md) | [findings](docs/rounds/102/findings.md) | pre-run record to round 102 close |
| 101 | 11-06 | The leak scan counts optional frame words and *espresso* apart from leaks in NPC lines (autonomous) | [101](docs/rounds/101/architecture.md) | [findings](docs/rounds/101/findings.md) | pre-run record to round 101 close |
| 100 | 11-06 | The leak scan reads narratives and grader feedback too; a measure over the committed reports (autonomous) | [100](docs/rounds/100/architecture.md) | [findings](docs/rounds/100/findings.md) | pre-run record to round 100 close |
| 099 | 11-06 | Fixes from a second review of rounds 093–098: help after a lost send, lost-save notice, write counters, review replies off-screen, runner and Codex failure categories (autonomous) | [099](docs/rounds/099/architecture.md) | [findings](docs/rounds/099/findings.md) | pre-run record to round 099 close |
| 098 | 11-06 | The CLI runner sweeps stale run dirs a killed process left in the temp root (autonomous) | [098](docs/rounds/098/architecture.md) | [findings](docs/rounds/098/findings.md) | pre-run record to round 098 close |
| 097 | 11-06 | Fixes from a review of the live-run tools: retried narrations in reports, the leak scan's order and echo rules, verify-cli by objective (autonomous) | [097](docs/rounds/097/architecture.md) | [findings](docs/rounds/097/findings.md) | pre-run record to round 097 close |
| 096 | 11-06 | Fixes from a review of the mobile store: review resends replay, a start keeps the player's screen, stale reads never undo a recruit, stale help reloads, a lost save is announced (autonomous) | [096](docs/rounds/096/architecture.md) | [findings](docs/rounds/096/findings.md) | pre-run record to round 096 close |
| 095 | 11-06 | Fixes from a review of the LLM layer: the atmosphere abort reaches the real adapter, CLI failures keep their category, a child holding its pipes no longer wedges the slot (autonomous) | [095](docs/rounds/095/architecture.md) | [findings](docs/rounds/095/findings.md) | pre-run record to round 095 close |
| 094 | 11-06 | Each card keeps its 20 newest evidence entries: the save is bounded by its cards (backlog F15) (autonomous) | [094](docs/rounds/094/architecture.md) | [findings](docs/rounds/094/findings.md) | pre-run record to round 094 close |
| 093 | 11-06 | Assessment receipts pruned to the 20 newest, without Spellbook snapshots: the save stops growing per turn (backlog F13) (autonomous) | [093](docs/rounds/093/architecture.md) | [findings](docs/rounds/093/findings.md) | pre-run record to round 093 close |
| 092 | 11-06 | Fixes from a review of the core server paths (rounds 001–016): the token check no longer bypassed by the URL's case; grader evidence in context; the reveal cap (autonomous) | [092](docs/rounds/092/architecture.md) | [findings](docs/rounds/092/findings.md) | pre-run record to round 092 close |
| 063 | 11-06 | Speech stops when the Spellbook or Review screen goes; `speak` gives way to a stop during its wait (backlog C10c) (autonomous) | [063](docs/rounds/063/architecture.md) | [findings](docs/rounds/063/findings.md) | pre-run record to round 063 close |
| 062 | 11-06 | The narrator on the map card ("Hear the place") and the companion card ("Hear the briefing") (backlog C10b) (autonomous) | [062](docs/rounds/062/architecture.md) | [findings](docs/rounds/062/findings.md) | pre-run record to round 062 close |
| 061 | 11-06 | Hear the narrator: a 🔊 per NPC narration, English device voice, on demand (backlog C10) (autonomous) | [061](docs/rounds/061/architecture.md) | [findings](docs/rounds/061/findings.md) | pre-run record to round 061 close |
| 060 | 11-06 | Lines the player paid to translate kept in the save and shown in the Spellbook, hidden while their cards are due (backlog C9) (autonomous) | [060](docs/rounds/060/architecture.md) | [findings](docs/rounds/060/findings.md) | pre-run record to round 060 close |
| 059 | 11-06 | Word class on Spellbook cards (class word coloured) and on the review prompt (backlog C8) (autonomous) | [059](docs/rounds/059/architecture.md) | [findings](docs/rounds/059/findings.md) | pre-run record to round 059 close |
| 058 | 11-05 | The matcher tries every form longest first across entries; every form matches its own entry (backlog F3) (autonomous) | [058](docs/rounds/058/architecture.md) | [findings](docs/rounds/058/findings.md) | pre-run record to round 058 close |
| 057 | 11-05 | Chip words marked inside the NPC line at the server's spans, by class (backlog C7) (autonomous) | [057](docs/rounds/057/architecture.md) | [findings](docs/rounds/057/findings.md) | pre-run record to round 057 close |
| 056 | 11-05 | Word chips coloured and labelled by class: noun, verb, adjective (backlog C6) (autonomous) | [056](docs/rounds/056/architecture.md) | [findings](docs/rounds/056/findings.md) | pre-run record to round 056 close |
| 055 | 11-05 | A 🔊 per word chip in encounter lines, free of hints (backlog C5) (autonomous) | [055](docs/rounds/055/architecture.md) | [findings](docs/rounds/055/findings.md) | pre-run record to round 055 close |
| 054 | 11-05 | Typographic apostrophes fold to ' in the matcher, reviews and the grader-evidence check (backlog F2) (autonomous) | [054](docs/rounds/054/architecture.md) | [findings](docs/rounds/054/findings.md) | pre-run record to round 054 close |
| 053 | 11-05 | An LLM atmosphere line under each location's description, off by default (backlog A10) (autonomous) | [053](docs/rounds/053/architecture.md) | [findings](docs/rounds/053/findings.md) | pre-run record to round 053 close |
| 052 | 11-05 | Numbers 2–12 in Flick's slow walk: a bargaining objective, reinforcement for the hours (backlog H2) (autonomous) | [052](docs/rounds/052/architecture.md) | [findings](docs/rounds/052/findings.md) | pre-run record to round 052 close |
| 051 | 11-05 | An early pass in an ordered encounter is no longer reported as a success: grading ORDER line, `held` marks (backlog H1) (autonomous) | [051](docs/rounds/051/architecture.md) | [findings](docs/rounds/051/findings.md) | pre-run record to round 051 close |
| 050 | 11-05 | Telling the time at the Cracked Fountain: a fourth objective for Flick, four authored constructions per pack (backlog G5) (autonomous) | [050](docs/rounds/050/architecture.md) | [findings](docs/rounds/050/findings.md) | pre-run record to round 050 close |
| 049 | 11-05 | Other-target exposure in the leak scan: NPC lines that carry another party conversation's target (backlog G7) (autonomous) | [049](docs/rounds/049/architecture.md) | [findings](docs/rounds/049/findings.md) | pre-run record to round 049 close |
| 048 | 11-05 | Deeper conversations after three: Mortimer's oath, Flick's lotus, Marginalia's folded page (backlog G6) (autonomous) | [048](docs/rounds/048/architecture.md) | [findings](docs/rounds/048/findings.md) | pre-run record to round 048 close |
| 047 | 11-05 | Relationship tiers: a deeper party conversation after N conversations, Gerald's confidence first (backlog G4) (autonomous) | [047](docs/rounds/047/architecture.md) | [findings](docs/rounds/047/findings.md) | pre-run record to round 047 close (row added in round 048) |
| 046 | 11-05 | A second share estimate (`folded`) that survives glitched English and gloss translations (autonomous) | [046](docs/rounds/046/architecture.md) | [findings](docs/rounds/046/findings.md) | pre-run record to round 046 close |
| 045 | 11-05 | Objectives met in any order (`objectives_unordered`), Mortimer's tasting first (autonomous) | [045](docs/rounds/045/architecture.md) | [findings](docs/rounds/045/findings.md) | pre-run record to round 045 close |
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
