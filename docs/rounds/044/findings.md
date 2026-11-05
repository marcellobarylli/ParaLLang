# Round 044 findings

## Question

How often have NPC lines given away an open objective's answer across all live runs so far, counting words inside
multi-word answers (round 023's "¿Quieres más?" for *un poco más*)? Do these near-leaks need a fix?

## Finding

**Near-leaks are rare and mild.** Across all 611 NPC lines in 84 reports (rounds 005–026, both languages), the
scanner found **6 near lines**:
- **5 of Gerald's** ask about the milk, before the player has said *senza latte*: "Vuoi latte?" and "Il latte?".
  These are in rounds 007–015, all in Italian.
- **1 of Mortimer's**: the round 023 "¿Quieres más?".

Each one names the topic. None says the phrase the player has to build ("senza", "un poco"). **No fix is needed**
(autonomous decision, pending owner review): asking "Do you want milk?" is how a barista talks, and the grader still
needs the whole phrase.

**Whole-form leaks fell to almost none after rounds 007 and 012**, the no-dictation and no-menu rules. Before round
011 they appear in every round (2–6 lines a round). From round 020 on, every one that is left is one of these:
- Portia's greeting, 13 lines, the known case Amendment 2 of round 026 addresses ("Buongiorno!" while the player
  must greet);
- Errata's frame words, 18 lines, on its `nobody` objective. The words are "Sono Errata" and "tu nombre". The key
  answer (*nessuno* / *nadie*) never appears before the player gives it;
- Gerald's English "espresso shots", 19 lines. This is a collision of a target form with an English word, not a
  leak.

The scanner also sorts out what earlier checks miscounted:
- **44 quoted lines:** Marginalia reading her authored passage, which holds *casa*;
- **16 echo lines:** an NPC repeating the player's own failed answer ("Chilo, sì! Ma quanto?").

## Method

- Built `server/scripts/leak-scan.js` (plan [v1](trail/plan-v1.md), [critique 1](trail/critique-1.md): 14 findings,
  12 accepted, 2 in part). The scanner was drafted, and run once over the reports, before the critique returned
  (journal row 5).
- Ran it over every `docs/rounds/*/results/*.json` except this round's own output: 89 files. Of these, 84 were
  scanned; 2 are not JSON (npm banners), 2 have no scenes and 1 has no language.
- 208 scenes: 11 inferred (rounds 005–008), 80 of them round 026's greeting replays. None skipped.
- Read today's content. No verdict named an objective today's content lacks.
- Read every near line and a sample of every leak group by hand (`results/scan.txt`).
- Linux compute node. No LLM calls.

## Results

Lines by kind and round (`results/by-round.txt`). "Leak" excludes the espresso-only lines, which are counted apart:

| Rounds | Lines | Leak | Espresso only | Near | Quoted | Echo |
|---|---|---|---|---|---|---|
| 005–010 (it, es) | 80 | 24 | 5 | 4 | 0 | 5 |
| 011–015 | 185 | 17 | 4 | 1 | 26 | 6 |
| 019–026 | 346 | 18 | 10 | 1 | 18 | 5 |
| **all** | **611** | **59** | **19** | **6** | **44** | **16** |

From round 020 on, 18 leak lines remain:
- 13 are greetings in round 026's 80 greeting replays (Portia, and Errata's "Sono Errata");
- 5 are Errata's frame words.

Encounters with no fresh exact leak since round 012: Gerald (apart from "espresso"), Mortimer, Flick, Marginalia,
and all four party conversations.

Tests: server 172/172 (leak scan 7). Mobile and the web client are unchanged.

## Decision

- Keep the scanner and run it on new live reports, starting with round 026's after-build tours.
- Change no prompt or content for near-leaks.
- Treat Errata's frame words and Gerald's "espresso" as known noise. A later round could weight a target by its
  required group: a leak of *nessuno* counts, while a leak of the *sono* frame does not.

G2 is done.

## Evidence

`results/scan.txt` (every hit, with its line), `results/scan.json`, `results/by-round.txt`; journal rows 4–8.

## Claim boundary

- Old reports are read against today's content. A round whose objectives changed since is measured by today's
  objectives.
- The word scan is a lower bound: there is no inflection, so "chiamo" never hits "chiami".
- "Quoted" needs a passage of five or more words in the intent, between quotes.
- Echo uses the scripted player lines, not what the game shows.
- The near and leak lines were read by hand, but only a sample of the 44 quoted and 16 echo lines.

## Open items

1. Owner: is a topic word ("Vuoi latte?", "¿Quieres más?") acceptable, or should NPCs avoid every word of an open
   answer phrase?
2. A later round could weight a target by its required group (key answer against frame words), so Errata's *sono* /
   *nombre* stop counting as leaks.
