# Round 023 findings

## Question

Do authored party conversations for Mortimer, Flick and Marginalia (backlog A8c) load, avoid English collisions and
overlaps, and play and grade as authored in both packs with a live provider?

## Finding

**Yes, in one live run per member and language.** All four saveable characters now have one party conversation
(Gerald's from round 022; Mortimer's tasting, Flick's slow walk, Marginalia's fragment of *The Journey*). **6 of 6
live runs resolved, with all 18 conversation turns graded as scripted**: the English line refused every time, then
each objective in order, including the Spanish phrase *un poco más* and the agreed *La storia è meravigliosa* /
*La historia es preciosa*. **No NPC line used an authored answer before the player had passed it** (24 lines).

One near-leak: in Spanish, Mortimer asked "¿Quieres más?" before the player had asked for more. That is the bare
word, not the authored *un poco más*, so the check misses it, but it hints at the answer. In Italian, Marginalia gave
an agreement hint before any Italian answer ("La storia è femminile: attenzione alla parola finale").

Language share: overall 0.43 against 0.39 requested (24 lines). Flick runs short, at 0.28 (it) and 0.24 (es) against
0.38, with long English riddles around short target-language phrases. That is the pattern backlog E1 found for
Portia's tutorial. Mortimer (es 0.60) and Marginalia (0.49–0.54, which includes the fragment she reads) run over.

The new overlap test found an overlap left by round 022: Gerald's *buon* / *buen* sits inside Portia's *buon giorno*
/ *buen día*. It is the same word, and the matcher takes the longest match ("Buen día" → *buenos días* only, checked),
so it is allowed as one named exception.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md) (11 findings: 7 accepted, 3 in
  part, 1 rejected; all four Errors accepted).
- Content generated from one table for both packs ([`results/gen/make.py`](results/gen/make.py), written to YAML by
  `write.mjs` with the server's `js-yaml`; the sandbox has no Python `yaml`).
- Tests: `node --test server/test/*.test.js`, `npm run test:mobile`, web client vitest and build.
- Live: `TARGET_LANGUAGE=<it|es> node server/scripts/play-market.js --provider codex-cli --party --member
  <butchers_stall|cracked_fountain|old_bookshop>`, sequential, in-process on the Linux compute node, 17:11–17:25
  UTC; 108 calls (42 in the conversations), no usage limit.
- Measures by [`results/summarize.py`](results/summarize.py) (verdicts, share estimate `notInTranslation`, authored
  answer forms in NPC lines before they were passed); the near-leaks were found by reading the lines.

## Results

| Check | Result |
|---|---|
| Server tests | 130/130 (127 before; 3 new; fixture and version strings updated) |
| Mobile / web client | 37/37 / 12/12 and build (unchanged) |
| Gerald's pinned prompts | unchanged |

| Run | Resolved | Count | Off map | Verdicts as scripted | Share (req) | Answer leaks |
|---|---|---|---|---|---|---|
| Mortimer it | yes | 1 | yes | 3/3 | 0.43 (0.38) | 0 |
| Mortimer es | yes | 1 | yes | 3/3 | 0.60 (0.38) | 0 (near-leak "¿Quieres más?") |
| Flick it | yes | 1 | yes | 3/3 | 0.28 (0.38) | 0 |
| Flick es | yes | 1 | yes | 3/3 | 0.24 (0.38) | 0 |
| Marginalia it | yes | 1 | yes | 3/3 | 0.54 (0.42) | 0 (agreement hint) |
| Marginalia es | yes | 1 | yes | 3/3 | 0.49 (0.42) | 0 |

Each run also won the member's home encounter with its existing script (all resolved). Marginalia read the authored
fragment word for word in her greeting in both languages, and again after "read again".

LLM outputs (greetings and one turn each):

- Mortimer it: "Benvenuto! Sono Mortimer. Questo è prosciutto! Certified ham. The hat is also ham, but not for sale."
  After *Mi piace!*: "Ti piace! Benissimo! … Il piatto è quasi vuoto. Che cosa desideri?"
- Flick es: "¡Hola! Soy Flick. ¿Tienes prisa? Five more minutes. Riddle me this: why walk when—oh, something moved."
  After *¡Vamos!*: "¡Sí, vamos! Pero tú estás aquí y yo estoy allí. How do we keep this a two-person trip?"
- Marginalia it: "“Journathan parla con il mare in due lingue. Il mare risponde in una lingua sola: la sua.” No
  spoilers. The sea has a very strict comments policy. Che ne pensi della storia?"

## Decision

A8 is done (recruitment, conversations, a conversation for every saveable character). Flick's low share joins E1's
evidence for a template-level fix; it is not tuned here.

## Evidence

- `results/party-<member>-<lang>.json` (six reports with raw outputs, grading and timings), e.g.
  [`party-cracked_fountain-es.json`](results/party-cracked_fountain-es.json);
  [`results/summarize.py`](results/summarize.py); [`results/gen/`](results/gen/).
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

One run per member and language is a smoke check of authored content, not rates. Share figures are the scripts'
estimate. Reference URLs (Treccani *ancora*, *andare*, *insieme*, *meraviglioso*, *nuovo*; RAE *gustar*, *más*,
*poco*, *ir*, *junto*, *precioso*, *vez*; Wiktionary pages) were not opened (no web access). Nothing checked in the
iOS Simulator; no native-speaker review.

## Open items

- **Owner:** native-speaker review of the three conversations in both packs (and of Gerald's from round 022), the
  reference URLs, and the decisions (round 023 rows in decisions.md).
- **Owner, Simulator:** Talk for each member on the Party screen.
- Near-leak by a bare word that is not the authored form ("¿Quieres más?"): extend leak checks to the words inside
  authored phrases, or accept them as natural modelling.
- Flick's party lines are under the requested share (0.24–0.28 against 0.38): evidence for backlog E1.
- Server tests leave `/tmp/parallang-*` dirs behind; the tmpfs filled during this round (cleaned by hand). A test
  cleanup would prevent it.
