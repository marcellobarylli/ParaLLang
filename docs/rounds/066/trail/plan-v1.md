# Round 066 plan v1: a playtest kit and a README refresh (docs only)

Proposal: add docs/playtest/guide.md (below) and update three stale README passages (diff below). No code, no live calls.

## docs/playtest/guide.md

# Playtest kit

For the owner, to run prototype.md Phase 4's last task: **3–5 external testers, iterate on pacing and difficulty**.
Written by the autonomous run (round 066). Nothing here has been tried with a tester yet.

## What a session tests

1. **Pacing.** How long each encounter takes, and where a tester stalls or loses interest.
2. **Difficulty.** Whether the target-language share feels right. Each NPC starts at its `base_target_ratio` and
   rises by its `escalation_rate` per turn.
3. **The core idea.** Whether "translate to defeat" reads as a game and not a quiz, and whether the absurd
   characters carry it.
4. **Help and memory.** How much the tester uses word and sentence reveals, and whether the Spellbook reviews feel
   like part of the game.

It does not test content correctness. That is the native-speaker review listed in STATE.md "Needs owner".

## Setup (once per machine)

- Follow the README's "Run the iPhone app", with `LLM_PROVIDER=codex-cli` (or `claude-cli`) and
  `npm run check:provider`.
- Pick the language with `TARGET_LANGUAGE` (`it` or `es`) and restart the server.
- Give each tester **a new save** (the Saves button on the map, then "Start a new save"; at most three per device).
  Remove the previous tester's save so the Spellbook starts empty.
- Testers who already know the language a little are fine; note their level (none, A1, A2, B1+).
- Each LLM turn takes several seconds on a CLI provider. Tell the tester this before they start, so a slow turn is not
  read as a crash.

## Session (about 45 minutes)

Say as little as possible. Ask the tester to think aloud. Do not explain the rules: that is what the onboarding
statement and Portia's tutorial are for.

| Minutes | Where | Watch for |
|---|---|---|
| 0–3 | First launch: the philosophy statement | Does the tester read it? Can they say in one sentence what the game is? |
| 3–10 | Market Entrance: Portia (greet, introduce yourself, ask back) | Do they find the companion card and the word chips? Do they try the target language unprompted? |
| 10–18 | The Coffee Cart: Gerald (order a coffee, no milk) | First real objective. Do they use reveals? How many turns? |
| 18–25 | The Butcher's Stall: Mortimer (a meat that is not ham, a quantity) | Are the marks understood (✓ passed, → not yet, … right but too early)? |
| 25–33 | The Cracked Fountain: Flick (stop, a direction, the time, now) | Four objectives in order: too long? Is the jingle funny or irritating? |
| 33–40 | The Old Bookshop: Marginalia (*The Journey*) | The longest passages: does reading stall? |
| 40–45 | The Spellbook, one review, the Party screen | Do they find reviews on their own? Do they save an NPC to the party, and why or why not? |

If there is time: the Rift. It stays sealed until the five encounters are done, and asks for a drill of due cards
before the fight. Also try one party conversation from the Party screen.

Optional, one each: the 🔊 on a word chip, "Hear the place" on the map card, the Sounds switch on the Saves screen.

## Recording (per tester)

- Their level, the language and the device.
- **Per encounter:** start and end time, the number of turns, and the number of word and sentence reveals. The
  hint counter is on screen; the turns are in the transcript.
- **Every stall over about 20 seconds:** where it happened and what they said.
- **Every NPC line they called "too much" or "too easy"**, word for word if possible.
- Bugs: a screenshot, plus the server's console line if there is one.
- The save itself: one JSON file per learner under `server/data/saves/it/` (Spanish saves sit directly in
  `server/data/saves/`). It holds the Spellbook, reviews and kept lines (no
  transcripts; those live in memory only). Copy it after the session if the tester agrees.

## Questions afterwards (5 minutes)

1. In one sentence, what is this game?
2. Which character do you remember, and why?
3. Was there a moment you wanted to stop? Where?
4. Did the language get harder? Too fast, too slow, or about right?
5. Did you feel you were translating, or talking to someone?
6. Would you open it again tomorrow to do the reviews?
7. Anything that made you laugh, or groan?

## After 3–5 testers

Look for **the same stall in two or more sessions**: that is a pacing fix. One tester's dislike is a note, not a
change. Compare turn counts per encounter between testers with no target-language knowledge and the rest; if the
beginners take more than twice as many turns somewhere, lower that NPC's `base_target_ratio` or `escalation_rate`
(`language_profile` in `content/characters/`) first, before rewriting content. File the results as a round (`docs/rounds/NNN/`), with each change and its
evidence.

## README diff

```diff
diff --git a/README.md b/README.md
index a6aaabb..bbb88ae 100644
--- a/README.md
+++ b/README.md
@@ -1,6 +1,6 @@
 # ParaLLang
 
-ParaLLang is a conversational language-learning game. It teaches Italian by default, and Spanish is also available. The implemented Phase 2 loop takes place at The Coffee Cart in The Crumbling Market: order from Gerald, use tracked companion help, collect canonical vocabulary, and practise due Spellbook cards.
+ParaLLang is a conversational language-learning game. It teaches Italian by default, and Spanish is also available. The prototype is The Crumbling Market: six places on a map, an encounter at each (Portia's tutorial at the entrance, Gerald, Mortimer, Flick, Marginalia, and Errata in the sealed Rift), tracked companion help, a Spellbook of canonical vocabulary with spaced-repetition reviews, a party of saved NPCs with their own conversations, and fragments of the in-world book *The Journey*. For running a session with testers, see [`docs/playtest/guide.md`](docs/playtest/guide.md).
 
 ## Design notes and project records
 
@@ -99,7 +99,7 @@ If the server is not running, the app shows "Can't reach the ParaLLang server at
 
 The app keeps its own learner ID (in the app's storage), so its Spellbook is separate from the browser's.
 
-The app opens on the map of the Crumbling Market (round 005): six locations from `content/world/locations/`, joined by the paths in `content/world/connections.yaml`. Unvisited places beyond your neighbours stay hidden; tap a neighbouring place to walk there. Gerald is at The Coffee Cart ("Talk to Gerald"); the other places have no encounter yet. Your position, the places you have visited and the encounters you have completed are saved with your Spellbook.
+The app opens on the map of the Crumbling Market (round 005): six locations from `content/world/locations/`, joined by the paths in `content/world/connections.yaml`. Unvisited places beyond your neighbours stay hidden; tap a neighbouring place to walk there. Each place has its encounter ("Talk to Gerald" at The Coffee Cart); the Rift stays sealed until the other five are complete and asks for a short review drill first. Your position, the places you have visited and the encounters you have completed are saved with your Spellbook.
 
 ### Optional API token
 
@@ -107,7 +107,7 @@ Set `PARALLANG_TOKEN` in the root `.env` to require the header `X-ParaLLang-Toke
 
 ### Live Crumbling Market playthrough
 
-`node server/scripts/play-market.js --provider codex-cli [--location coffee_cart|market_entrance|butchers_stall] [--out report.json]` plays the map and one encounter with scripted answers (Gerald at The Coffee Cart by default; `market_entrance` plays Portia's tutorial, `butchers_stall` Mortimer, with a failing ham request and a bare unit first) in-process (no port) on a temporary save and prints a JSON report: each step, every raw LLM output, grading verdicts, timings and two rough estimates of the target-language share of each NPC line. It exits 1 unless the encounter resolves and the map marks it complete.
+`node server/scripts/play-market.js --provider codex-cli [--location <id>] [--out report.json]` plays the map and one encounter with scripted answers (Gerald at The Coffee Cart by default; any location id from `content/world/locations/`; `--tour` plays all six in order, `--party --member <home location>` a party conversation, `--lines 'a|b|c'` your own answers) in-process (no port) on a temporary save and prints a JSON report: each step, every raw LLM output, grading verdicts, timings and two rough estimates of the target-language share of each NPC line. It exits 1 unless the encounter resolves and the map marks it complete.
 
 ## Learning data and saves
 
```
