# Playtest kit

For the owner, to run prototype.md Phase 4's last task: **3–5 external testers, iterate on pacing and difficulty**.
Written by the autonomous run (round 066). Nothing here has been tried with a tester yet.

## What a session tests

1. **Pacing.** How long each encounter takes, and where a tester stalls or loses interest.
2. **Difficulty.** Whether the target-language share feels right. Each NPC starts at its `base_target_ratio` and
   rises every turn by its encounter's `escalation.target_ratio_increase_per_turn`.
3. **The core idea.** Whether "translate to defeat" reads as a game and not a quiz, and whether the absurd
   characters carry it.
4. **Help and memory.** How much the tester uses word and sentence reveals, and whether the Spellbook reviews feel
   like part of the game.

It does not test content correctness. That is the native-speaker review listed under "Needs owner" in
[`docs/autonomy/STATE.md`](../autonomy/STATE.md).

## Where testers play

With a CLI provider (`codex-cli`, `claude-cli`) the server listens on 127.0.0.1 only, and the app runs in the iOS
Simulator through Expo Go. **Every tester sits at the owner's Mac.** Expo Go on a tester's own phone cannot reach
the server in this mode.

## Setup (once, on the Mac)

- Follow the README's "Run the iPhone app", with `LLM_PROVIDER=codex-cli` (or `claude-cli`).
- In the Simulator, add an Italian and a Spanish voice (Settings → Accessibility → Spoken Content → Voices), so the
  🔊 buttons work.
- Accents: the Mac keyboard types into the Simulator, and holding a key (e, a) offers accented letters. Show the
  tester this before starting.
- If you set `PARALLANG_TOKEN`, start Expo with the same `EXPO_PUBLIC_PARALLANG_TOKEN` (README, "Optional API
  token").

## Before each tester

1. `npm run check:provider` (signed in, and the right provider). Every turn makes two LLM calls (grading, then the NPC's reply).
   If the provider hits its usage limit mid-session, the app keeps the tester's text and shows an error. Stop there
   and note how far they got; do not switch provider mid-session.
2. Language: set `TARGET_LANGUAGE` (`it` or `es`), restart the server, and press `r` in the Expo terminal.
3. **A new save:** the Saves button in the header (on the map), then "Start a new save". A new save is a new learner
   with an empty Spellbook. At most three saves fit on a device, so to make room for the next tester, remove an old
   one, but **only after copying its file** (see Recording): removing deletes the server's file too.
4. Note the time the save was created. Save files are named by learner id, not by "Save 1", so the creation time is
   how you match a file to a tester.
5. Tell the tester that each turn takes several seconds, so a slow turn is not read as a crash. Ask for consent to
   take notes and keep their save file.

## Session (about 45 minutes)

Say as little as possible. Ask the tester to think aloud. Do not explain the rules: that is what the onboarding
statement and Portia's tutorial are for. The onboarding statement shows once per device: to show it again, delete
and reinstall Expo Go's data, or skip it.

| Minutes | Where | Watch for |
|---|---|---|
| 0–3 | First launch: the philosophy statement | Does the tester read it? Can they say in one sentence what the game is? |
| 3–10 | Market Entrance: Portia (greet, introduce yourself, ask back) | Do they find the companion card and the word chips? Do they try the target language unprompted? |
| 10–18 | The Coffee Cart: Gerald (order a coffee, no milk) | First real objective. Do they use reveals? How many turns? |
| 18–25 | The Butcher's Stall: Mortimer (a meat that is not ham, a quantity) | Are the marks understood (✓ passed, → not yet, … right but too early)? |
| 25–33 | The Cracked Fountain: Flick (stop, a direction, the time, now) | Four objectives in order: too long? Is the jingle funny or irritating? |
| 33–40 | The Old Bookshop: Marginalia (*The Journey*) | The longest passages: does reading stall? |
| 40–45 | The Spellbook, one review, the Party screen | Do they find reviews on their own? Do they save an NPC to the party, and why or why not? |

If there is time: the Rift. It stays sealed until the five encounters are done. Before the fight it asks for a short
drill when the needed cards are all due. New cards are due as soon as they are found, so the drill usually appears,
unless the tester has already reviewed those words. Also try one party conversation from the Party screen.

Optional, one each: the 🔊 on a word chip, "Hear the place" on the map card, the Sounds switch on the Saves screen.

## Recording (per tester)

Use one copy of this table per tester. The app shows no turn counter and keeps transcripts only in memory, and the
on-screen "Hints" counter is one shared budget per objective. So count by hand.

| Encounter | Start | End | Sends | Word reveals | Sentence reveals | Stalls (where, what they said) |
|---|---|---|---|---|---|---|
| Portia | | | | | | |
| Gerald | | | | | | |
| Mortimer | | | | | | |
| Flick | | | | | | |
| Marginalia | | | | | | |
| Errata | | | | | | |

- Also note their level (none, A1, A2, B1+), the language and the save's creation time.
- Count a stall when they pause for more than about 20 seconds.
- Note every NPC line they called "too much" or "too easy", word for word if possible.
- For bugs: take a screenshot, and copy the server's console line if there is one.
- **The save file:** one JSON file per learner under `server/data/saves/it/` (Spanish saves sit directly in
  `server/data/saves/`). Pick the file by its creation time. It holds the Spellbook, reviews and kept lines, but no
  transcripts. Copy it before removing the save in the app.

## Questions afterwards (5 minutes)

1. In one sentence, what is this game?
2. Which character do you remember, and why?
3. Was there a moment you wanted to stop? Where?
4. Did the language get harder? Too fast, too slow, or about right?
5. Did you feel you were translating, or talking to someone?
6. Anything that made you laugh, or groan?

The next day, ask: would you open it again today to do the reviews?

## After 3–5 testers

- Look for **the same stall in two or more sessions**: that is a pacing fix. One tester's dislike is a note, not a
  change.
- Compare sends per encounter between testers with no target-language knowledge and the rest. If the beginners take
  more than twice as many somewhere, tune that NPC first, before rewriting content. Lower one of:
  - its `base_target_ratio` (`language_profile` in `content/characters/`);
  - its encounter's `escalation.target_ratio_increase_per_turn`. This sits in each pack's
    `content/languages/<code>/encounters/`, so change both `it` and `es`.
- File the results as a round (`docs/rounds/NNN/`), with each change and its evidence.
