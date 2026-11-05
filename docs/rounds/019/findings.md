# Round 019 findings

## Question

Does giving Portia authored words she may use freely (ambient vocabulary: benvenuto, piacere, mercato; bienvenido,
mucho gusto, mercado) bring her tutorial lines closer to their requested share of target language (backlog E1), and
do the words she already used unprompted now get chips and Spellbook cards (E2)?

## Finding

**E2: yes. E1: no.** With the ambient words, every Italian line uses at least one of them and they are chipped
(12/12 lines, against 6/12 lines with the same words unauthored and unchipped before). But the share of target
language barely moves: across all Italian lines 0.17 before and 0.16 after (requested mean 0.28); the greeting 0.08
→ 0.12 on three runs each (0.10, 0.08, 0.07 → 0.12, 0.06, 0.18: noise-sized); Spanish 0.21 → 0.19. The ambient
words **replace** other Italian rather than adding to it (her reply to "Ciao!" is now "Benvenuto!" where it echoed
"Ciao!"), and the rest of each line stays English bureaucratic humour. So the scarcity hypothesis does not explain
the gap. Gameplay is unchanged: 5/5 runs resolved, 17/17 player lines graded as scripted, and the variant run's
"Piacere!" alone was refused with feedback that names no greeting. A side effect: Portia no longer says "Come ti
chiami?" before the ask-back objective (0/3 Italian runs, 2/3 before).

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md) (12 findings: 7 accepted,
  3 in part, 2 rejected).
- `node server/scripts/play-market.js --provider codex-cli --location market_entrance`, sequential, in-process, on
  the Linux compute node. Baseline on HEAD `3d2b6d7` (3 it; 1 es with the inert loader code in the working tree, no
  ambient content, prompts byte-identical); after the build commit (3 it, 1 es, 1 it variant with
  `--lines 'Piacere!|Buongiorno, Portia.|Mi chiamo Robin.|E tu?'`). 9 runs, 65 calls; no usage limit hit.
- Share: the script's two rough measures, per NPC line: *not in translation* (tokens absent from the English
  translation) and *canonical* (tokens covered by authored matches; it rises by construction once the words are
  authored). Lines read for dictation, menus and feedback leaks.

## Results

| Set | Runs | Greeting share (not in translation) | All lines: not in translation / canonical / requested | Tokens per line | Lines with ambient words |
|---|---|---|---|---|---|
| Baseline it | 3 | 0.10, 0.08, 0.07 (mean 0.08) | 0.17 / 0.09 / 0.28 | 19.4 | 6/12 (unauthored) |
| After it | 3 | 0.12, 0.06, 0.18 (mean 0.12) | 0.16 / 0.13 / 0.28 | 18.8 | 12/12 |
| Baseline es | 1 | 0.21 | 0.22 / 0.06 / 0.28 | 19.8 | 2/4 (unauthored) |
| After es | 1 | 0.19 | 0.18 / 0.14 / 0.28 | 20.0 | 3/4 |
| Variant it | 1 | 0.10 | 0.14 / 0.13 / 0.30 | 20.6 | 5/5 |

Verdicts: every run resolved; each scripted line passed or failed as intended (17/17). Feedback leaks: 0 (no
overall feedback names a target-language answer to an open objective). Dictation of open targets: none.

Greetings verbatim (after, it): "Benvenuto! This is the mercato. Before entry: a greeting and your name, please.
Manners are load-bearing." / "Benvenuto. Welcome. A greeting and your name, please. Entry requires manners;
structural integrity is apparently optional." / "Benvenuto al mercato. Portia, entrance administration. A greeting
and your name, please. We have standards. Mostly structural." Spanish: "Bienvenido al mercado. A greeting and your
name, please. Being physically here is not an introduction." Before (it): "Buongiorno! A greeting and your name,
please. Manners before market."

Variant, after "Piacere!": "Piacere! A pleasure, certainly. But the greeting box remains empty, and your name is
still missing. Manners first; paperwork immediately after." Feedback: "Your polite response does not meet the
required targets yet. Greet Portia, introduce yourself, and ask her name in return."

## Decision

Keep the build: it fixes E2 (her real words are authored, chipped and in the Spellbook), it is inert for every
other encounter (Gerald's prompts byte-identical), and gameplay is unchanged. E1 stays open with a new hypothesis:
the gap is in the English around the Italian, not in the vocabulary. Every Portia line is built as "one Italian
formula + English bureaucratic joke", which her sheet invites (paperwork, visitors' book, "manners are
load-bearing"), while the request "Target approximately 20%" does not survive a tutorial framed as
"beginner-friendly". Next E1 step: a per-NPC language-profile note or quirk that her formalities and remarks about
the market are in the target language (content), measured the same way; only if that fails, the shared language
rules.

## Evidence

`results/base-{1,2,3}.json`, `results/base-es-1.json`, `results/after-{1,2,3}.json`, `results/after-es-1.json`,
`results/after-variant.json` (full prompts' outputs, grading and timings); journal rows 2, 6–8, 12–13.

## Claim boundary

Three Italian runs per arm and one Spanish: enough to see that the share did not rise by the hoped margin, not to
estimate a small change. Both share measures are rough (the not-in-translation measure counts names and cognates
like "Sam", "Portia" oddly; canonical rises by construction). Not checked in the iOS Simulator: the new chips, their
Spellbook cards, and hint spending on ambient words.

## Open items

1. E1 (Portia's share) stays open; next try is content (see Decision).
2. Owner: review the six new entries and their Treccani / RAE references (not opened from the container) and the
   neutral sign quirk.
3. Owner, Simulator: Portia's new chips and Spellbook cards; tapping an ambient word spends a hint (decision 4).
