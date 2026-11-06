# Codex critique 1: playtest kit and README refresh

- **Dispatched:** 2026-11-06 00:57:06
- **Returned:** 2026-11-06 00:59 (approx.)
- **Model:** a Claude (claude-opus-5-5) general-purpose subagent standing in for Codex (Codex at its usage limit until 01:36 UTC), read-only by instruction
- **Prompt:** adversarial read-only fact-check of plan-v1 against the mobile components, encounter YAML, the Rift's seal and drill, save paths, language_profile, play-market.js options, onboarding, speech buttons and the Sounds switch; usability for 3–5 testers; findings typed Error / Risk / Gap with evidence; Optional list; under 500 words
- **Reviewed input:** `plan-v1.md`, sha256 2ffe6202…, HEAD bbaf326, working tree README.md, docs/playtest/, docs/rounds/066/
- **Findings:** 11

## Raw output (verbatim)

```text
Four errors, two risks and five gaps in plan-v1; the rest checks out against the code and content.

**Errors**

1. **`escalation_rate` does not exist, so the tuning advice points at the wrong place.** The per-turn rise is `escalation.target_ratio_increase_per_turn` in each encounter file (for example `content/languages/it/encounters/imp_coffee_greeting.yaml:12-13`, schema at `server/src/content-loader.js:78`, used at `server/src/learning-service.js:101-102`). Only `base_target_ratio` sits in `language_profile` in `content/characters/enemies/*.yaml`. The rise is set per language pack: both the `it` and `es` copies need editing. Fix "What a session tests §2" and "After 3–5 testers" to say this.
2. **The "hint counter" cannot give separate word and sentence reveal counts.** It shows `Hints: remaining/limit` (`mobile/src/components/DialoguePanel.js:36`). That is one shared budget for word and sentence reveals, counted per objective (`hint_limit`, `learning-service.js:380, 515`). Fix: the observer tallies word-chip taps and "Translate sentence" taps (`BilingualText.js:46`) by hand.
3. **"Turns are in the transcript" is not something the owner can read off.** The app shows no turn counter. Transcripts are kept only in memory (README:116) and are lost when the server restarts, for example after a language switch. Fix: the observer counts Send presses.
4. **"Remove the previous save so the Spellbook starts empty" gives the wrong reason.** Every new save is a new learner, so it already starts empty. Removal is only needed because of the three-save cap (`SavesPanel.js:8, 37`). Also, the Saves button is in the header (`Header.js:18`), not "on the map". `STATE.md` should be `docs/autonomy/STATE.md`.

**Risks**

5. **Remove deletes the server file too** (`SavesPanel.js:13`; the store, `gameStore.js:332`). If the owner removes a save before copying it, the data is gone. Removing also needs another save to be current first (`SavesPanel.js:29`). Fix the order: start a new save, then copy the old file, then remove the old save.
6. **Save files are named `<learnerId>.json`** (`learning-storage.js:121`), but the app shows only labels like "Save 1". The owner cannot tell which file belongs to which tester. Fix: note the file's modification time per tester, or show the learner ID.

**Gaps**

7. **The plan never says how a tester reaches the app, and that blocks a session.** CLI providers force the server onto 127.0.0.1 (`server/src/config.js:75`), and the app runs only in the Simulator on the owner's Mac (README:96). So every tester has to sit at that Mac, and Expo Go on a tester's own phone will not work with `codex-cli` or `claude-cli`. Say this, and replace "the device" with "the Mac" in Recording.
8. **The setup steps for the Mac are missing:** the Italian/Spanish iOS voice for 🔊 (README:98), typing accents on a Mac keyboard in the Simulator, and keeping `PARALLANG_TOKEN` consistent between server and app (README:106).
9. **The plan doesn't check that the provider stays logged in and within quota for a whole 45-minute session.** Add a CLI provider check run immediately before each session, plus a fallback if quota runs out partway.
10. **The Rift step is unclear.** The drill only appears when every current card for a required group is due (`learning-service.js:159-174`). A tester who has just finished the five encounters will usually have no due cards, so they will see no drill. The guide should say the drill may not appear.
11. **Language switching between testers is underspecified.** After changing `TARGET_LANGUAGE`, restart the server and reload the app (press `r` in the Expo terminal, README:98).

**Confirmed correct:** the objectives for all six encounters (Portia greet/introduce/ask_back, Gerald order_coffee/no_milk, Mortimer name_meat (not ham)/quantity, Flick stop/direction/time/now, Marginalia's two passages, Errata), the Rift seal (`content/world/locations/the_rift.yaml:11-16`), `drill_before`, the marks ✓/→/… (`DialoguePanel.js:97`), "Hear the place" (`MapPanel.js:82`), 🔊 on the word chips, the Sounds switch on the Saves screen (`SavesPanel.js:40`), the onboarding statement, the companion card, the `it/` and Spanish save paths, and the play-market.js options (header, lines 1-15).

**Optional**
- README:29 still says "the language Gerald speaks" and "vocabulary and encounter" (singular). Refresh it with the other three passages.
- README diff: `--member` takes `butchers_stall|cracked_fountain|old_bookshop` (or `coffee_cart` as the default). Mention `--tier` and `--recruit`, or link the script header.
- Add a consent line and a note-taking template (a table per encounter).
- Ask the testers question 6 the next day, not straight after the session.
- Give each tester a short "turns in English allowed?" rule: the objectives fail English-only answers.
```
