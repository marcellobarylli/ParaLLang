# Round 054 findings

## Question

Can a player who types a typographic apostrophe (’, the iPhone default with Smart Punctuation) get the same chips,
evidence checks and verdicts as one who types ', and can a correct answer stop failing as `INVALID_GRADING` on every
retry when the grader quotes it with the other apostrophe (backlog F2)?

## Finding

**Yes, on the server, for every client.** Before this round two server checks were exact on apostrophes:

- the vocabulary matcher missed `ancora un po’` (it matched only `ancora`);
- the grader-evidence presence check refused a correct "È l’una, adesso!" whenever the grader quoted `è l'una`.
  The second is a hard block, because a retry with the same answer fails the same way.

Now one definition, `foldApostrophes` (’ ‘ ʼ \` ´ ′ → '), runs in four places: the matcher, `normalizeAnswer`
(reviews and the loader's ambient-overlap check), the evidence check and, through the matcher, the atmosphere
filter. The evidence check also folds NFD/NFC and whitespace. Excerpts still keep the characters the player typed.
No content or prompt changed, and Gerald's golden prompts are unchanged.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 8 findings, 6 accepted (both Errors), 2 in part.
- The new tests were run against HEAD 9d9cb74 source (`results/head-run.txt`, with `foldApostrophes` stubbed in the
  test, since HEAD lacks it). The 10 behaviour tests fail there and the guards pass.
- There were no live LLM runs. The change is deterministic, and Codex is at its limit until 01:36 UTC.

## Results

| Check | Result |
|---|---|
| New tests on HEAD source | 10 behaviour tests fail, 15 guards and existing pass |
| Server tests | 228/228 (214 before; 13 in `apostrophes.test.js`, 1 in `atmosphere.test.js`) |
| Mobile / web client | 131/131 / 12/12 and build (unchanged) |

## Decision

F2 is done. The server folds apostrophes for every client. New content does not need `’` variants. The two
variants on *l'una* stay, with a YAML comment, so the vocabulary version does not move.

## Evidence

- `server/test/apostrophes.test.js`: matcher, offsets, reviews, and the Fountain played through `submitDialogue`
  with a grader that quotes the other apostrophe or NFC text.
- `server/test/atmosphere.test.js`, last test.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md), `results/head-run.txt`.

## Claim boundary

The server path is tested with fixture graders. No live grader has seen a ’ answer yet. The app sends the text
unchanged, and no test covers that path on a device. Italian ASCII spellings (`e'` for `è`) are not folded; this
is a new backlog line, not a regression. The stored `vocabularyEvidence.evidence` keeps the grader's characters,
so any future highlight must fold.

## Open items

1. **Owner, Simulator:** with Smart Punctuation on, type "È l'una" at the Fountain and "Ancora un po'" in
   Mortimer's tasting, and confirm both pass (critique 1.7).
2. Next live run with codex-cli: script one ’ answer (for example `--lines` with "È l’una") to see a real grader
   with it.
