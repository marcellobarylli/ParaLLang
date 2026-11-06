# Round 079 findings

## Question

Does `verify:cli` pass in Spanish with codex-cli? Since round 005 it had run only in Italian (backlog D1, round 003
open item 3).

## Finding

**Yes.** All three pre-run criteria were met in one run (codex-cli 0.166.0, 03:46:15–03:47:40 UTC):

1. `passed: true`. The nine grading cases gave their expected verdicts: positive, complete, mixed-language,
   English-only, contextual, negated, quoted, metalinguistic and third-person. The two-turn encounter resolved, and
   its cards were *café*, *quiero* and *sin leche*.
2. All 30 feedback strings were read (25 from the grading cases, 5 from the encounter). None gives a Spanish answer to an open objective. They say "a Spanish
   expression meaning without milk or black coffee" or "the Spanish word for coffee", in English, as round 008's rule
   asks.
3. The run made 14 provider calls. Round 078's guard checked 3 narration lines and flagged none.

Grading calls took 4.2–7.0 s each. The greeting took 12.3 s, and the two turns 14.5 s and 9.8 s.

## Method

As fixed in [architecture.md](architecture.md): one `TARGET_LANGUAGE=es npm run verify:cli -- --provider codex-cli`
run, with no critique. The script serves on 127.0.0.1 with a random token and closes its server.

## Results

| Case | Expected | Observed |
|---|---|---|
| positive | pass, fail | pass, fail |
| complete | pass, pass | pass, pass |
| mixed-language | pass, pass | pass, pass |
| English-only | fail, fail | fail, fail |
| contextual | pass | pass |
| negated | fail | fail |
| quoted | fail, fail | fail, fail |
| metalinguistic | fail, fail | fail, fail |
| third-person | fail, fail | fail, fail |

## Decision

D1 is done for codex-cli in Spanish. It stays open for claude-cli, whose token is not in the agent's shell.

## Evidence

[`results/verify-es.json`](results/verify-es.json) (every verdict, feedback string and timing). The raw
`results/verify-es.log` stays local: `*.log` is ignored by git.

## Claim boundary

One run, one provider, Gerald's encounter only.

## Open items

- `verify:cli` with claude-cli in both packs, when its token is available to the shell (Needs owner).
