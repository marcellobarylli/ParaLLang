# Round 081 findings

## Question

With an optional `footnote` field and a style rule asking for one "about one reply in three", does the model write
narrator footnotes, and does the server keep them free of pack vocabulary and never two in a row?

## Finding

**The model wrote no footnote.** Over 21 live NPC lines (codex-cli: 14 Italian, 7 Spanish), every reply carried the
`footnote` key as `null`. The pre-run success criterion (at least one kept footnote per language) **failed** in both
packs. The feature is inert in play: nothing new is shown, and nothing else changed.

1. **Offered 0 of 21, kept 0.** The CLI schema lists the key as required-nullable (`footnote: ["string","null"]`), so
   Codex had to decide each time; it chose `null` on all 21. The schema's description ("an optional … footnote") does
   not reach the CLI schema (zod-to-json-schema drops it on the nullable type), so the only invitation is the style
   rule, which also says "only when there is a real aside … otherwise null".
2. **The narration already does the job.** The narratives are footnote-like on their own ("the Crumbling Market
   quietly depreciates around him", "the solemnity of a customs official discovering a banana"). A model that has
   just written a dry aside in `narrative` sees no "real aside" left over.
3. **No regression where it ran.** The Italian tour stopped at the Fountain when Codex hit its usage limit (04:17
   UTC, 24 calls). The 10 scripted answers before it all got the same verdicts as round 080; Portia, Gerald and
   Mortimer resolved; folded shares 0.24 / 0.28 / 0.46 against round 080's 0.21 / 0.31 / 0.40. The Spanish Gerald
   and Market Entrance runs resolved (shares 0.34 and 0.23). The round 078 guard checked 21 lines and flagged none.
4. **Codex is now limited until 2026-11-09 17:32 UTC**, after the end of the autonomous run, so the re-measure of a
   changed rule cannot happen in this run.

## Method

As in [architecture.md](architecture.md), with Amendment 1 (reports carry the raw footnote). `play-market.js
--provider codex-cli`: Italian `--tour` (04:13:51–04:17:17, stopped by the limit), Spanish `--location coffee_cart`
(04:14:23–04:14:56) and `--location market_entrance` (to 04:15:54). Counted with
[`results/footnotes.mjs`](results/footnotes.mjs) (offered from `lines[].footnote`, kept from the transcripts in the
steps); verdicts and shares compared with round 080's `tour-it.json` by script.

## Results

| Run | Lines | Footnotes offered | Kept | Resolved | Verdicts vs round 080 |
|---|---|---|---|---|---|
| it tour (to the Fountain) | 14 | 0 | 0 | 3 of 6 (limit at the 4th) | 10/10 equal |
| es Gerald | 3 | 0 | 0 | yes | — |
| es Market Entrance | 4 | 0 | 0 | yes | — |

Offline: `footnotes.test.js` (7 server tests: kept, trimmed, blank, length, Italian and Spanish forms dropped,
"once" and "café" kept, never two in a row) and 3 mobile tests; full suite server 291/291, client 12/12 (and the web
build), mobile 221/221.

## Decision

Keep the build (autonomous decision, pending owner review): it is tested, inert while the model writes `null`, and
ready for a firmer rule. Do not change the rule blind: Gerald's prompts are pinned, and a wording change needs a
measurement that cannot run before the deadline. The next live window should try, by Amendment, a rule that invites
rather than permits (for example "write a footnote on the greeting and on about one reply in three; a footnote adds
what the narrative did not say"), and re-measure against the pre-run criteria.

## Evidence

[`results/tour-it.json`](results/tour-it.json), [`results/gerald-es.json`](results/gerald-es.json),
[`results/entrance-es.json`](results/entrance-es.json), [`results/footnotes.txt`](results/footnotes.txt) (the
per-line table). The `*.log` copies stay local (ignored by git). The limit message:
"You've hit your usage limit … try again at Nov 9th, 2026 5:32 PM" (a direct `codex exec` at about 04:19 UTC).

## Claim boundary

21 lines from one provider, on the first encounters only (the Fountain, the Bookshop and the Rift were not reached).
It shows that this rule wording gives no footnotes with codex-cli; it says nothing about other providers or a firmer
wording. Whether footnotes are wanted at all, and funny, is the owner's call.

## Open items

- **Re-measure with a firmer rule** when Codex is available (after 2026-11-09 17:32 UTC), by Amendment.
- Owner: are footnotes wanted, and should the narrator use meme formats in them (Decision 4)?
- Simulator: the footnote line under a narration (only reachable once the model writes one; jest covers it).
