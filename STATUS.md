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
