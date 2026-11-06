# Round 089 findings

## Question

Rounds 040–053 (app token, ambient audio, font, Party hints, unordered objectives, relationship tiers, the `held`
early pass, the location atmosphere) were never reviewed after their builds, except 053. Does an independent review
find bugs, and can they be closed offline?

## Finding

**One answer leak (atmosphere on), one slot gap, two minor items; all closed.**

- **The atmosphere line could hold an open answer.** Its filter drops any pack form, but exempted a list of "English"
  forms from round 053. Every word of that list that is an entry of a pack is an objective's answer there (it
  *basta*, *sei*, *pollo*, *cento*, *io*…; es *once*, *kilo*, *soy*, *cafe*…), so "Someone by the dry basin sighs
  "Basta!"" was kept at the open Fountain. The list is gone, as round 081 did for footnotes. None of the 72 kept live
  lines of rounds 053 and 068 used a word of it ([`results/exempt.txt`](results/exempt.txt)), so the measured cost is
  zero; an English *once* or *due* now drops a line. The atmosphere is off by default, so no player met this.
- **An atmosphere call held the one CLI slot untracked.** A player's greeting, turn or grading then queued behind a
  cosmetic line, its deadline running. Now, on a serial (CLI) provider, a player's call aborts atmosphere calls in
  flight; the arrival prefetch does not abort and waits as for busy; an aborted call is not cached as a failure and
  every request sharing it is told to ask again in 15 s; a valid line that arrives after a late abort is kept. HTTP
  providers never abort. The slot frees when the aborted child exits (up to 2 s).
- **Latent:** a party fragment unlocked during a deeper conversation tier was filed under the first tier's id, so the
  app would not announce it; today's content (all fragments and tiers at 3) cannot hit it. It is now filed under the
  conversation offered at N − 1.
- **Minor:** a throw from the device speech call (or no voice) left the ambience lowered; it is now restored.

The review's "checked and fine" list covers unordered objectives, `held`, the tier choice and `NOT_YET`, story hints
from older servers, the token header and its messages, ambience races and the Sounds switch, the font fallback.

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 4 findings, critique 9 (2 Errors in the abort design: the prefetch
would have aborted nearly every line at open places; an abort would have been cached as a failure), all accepted.
Offline, no LLM call. Each fix was removed in turn to see that a test fails without it.

## Results

| Check | Result |
|---|---|
| `server/test/atmosphere.test.js` | 16/16 (1 new): es *once*, *kilo*, it *basta*, *sei* drop a line; the description's own words (MERCATO) are still kept; the old keep-test of "Once again… a kilo" changed |
| `server/test/greeting-prefetch.test.js` | 24/24 (5 new): a start aborts a shared atmosphere call, all three requests get `retryAfterMs`, drop `aborted`, no cached failure; a late valid line is kept and cached; no abort on a non-serial provider or from a background call; the prefetch waits as busy and writes the greeting after; CLI adapters are serial, HTTP ones not |
| `server/test/party-tiers.test.js` | 8/8 (1 new): a fragment at 4 with a tier at 3 is filed under the deeper tier; shipped content keeps the first tier |
| mobile `speech-stops` | 5/5 (1 new): a throwing speech call and a null voice both restore the ambience |
| A fix removed → test fails | 8/8: the exemptions, the abort, the prefetch busy check, the uncached abort, the serial check, the late line, the fragment tier, the `speak` catch |
| Full suites | server 323/323 (316 before), client 12/12, mobile 245/245 |
| `npx expo export --platform ios` | bundles (697 modules) |

## Decision

Keep the fixes (autonomous decisions, pending owner review).

## Evidence

`server/src/learning-service.js` (`getAtmosphere`, `abortAtmosphere`, `writeAtmosphere`, `callProvider`, `narrate`,
`fireArrival`, `journeyFragments`), `server/src/llm/cli-adapter.js` (`serial`), `mobile/src/speech.js`, the tests,
[`results/exempt.mjs`](results/exempt.mjs), [`trail/review-1.md`](trail/review-1.md),
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests only; no live run (the atmosphere is off by default and Codex is limited). The CLI slot is freed when the
aborted child exits, not at the abort. The atmosphere line may still use words of its location's own description.

## Open items

- Queued live (after 2026-11-09 17:32 UTC): with `PARALLANG_ATMOSPHERE=on` and `PARALLANG_PREFETCH=on`, walk the
  tour on codex-cli and count atmosphere drops by reason (`aborted`, `vocabulary`) and the Talk wait.
- Owner: whether an English *once* or *due* in an atmosphere line should be allowed again where the word is no
  answer of the current place (no such case exists in the packs today).
