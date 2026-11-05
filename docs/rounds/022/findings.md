# Round 022 findings

## Question

Can a party member be talked to again, anywhere, through an authored and graded conversation that counts towards
them, without touching the map, the Rift gate or the existing encounters (backlog A8b)? Does the first one, Gerald's
coffee break, play as authored in both packs with a live provider?

## Finding

**Yes.** An encounter with `party_of` is a party conversation: it starts from the Party screen anywhere once its
character has joined (409 `NOT_IN_PARTY` before), is set at the player's location, never appears on the map or in
`completedEncounterIds`, and each resolution adds one to the member's `conversations`; a resolved conversation
starts fresh when talked to again. Gerald's coffee break (praise the coffee, thank him) resolved in **5 of 5 live
runs with a correct script** (it ×3, es ×1, it variant ×1), with **every verdict as scripted** (14 player lines in the
conversations): English "Delicious!" refused, the variant forms *buonissimo*, *buenísimo* and *buon* accepted, and
**"Il caffè è buona." refused for agreement** with feedback naming the fault in English ("Make the praise adjective
masculine") and Gerald saying "Il caffè è maschile. Your adjective is feminine." No NPC line named an objective's answer
before the player had passed it (all 23 coffee-break lines checked), and the share of target language was at or above the
request (lines 0.37 against 0.32 requested).

A sixth run (es, first) did not resolve because the play script still said *riquísimo*, a form the revised plan had
removed (critique 1.2, *rico* collides with "Puerto Rico"). The grader refused it as it should; that run tests the
script, not the game, and was repeated with the planned line.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md) (10 findings: 5 accepted, 5 in
  part; both Errors accepted: restart of resolved conversations, *rico* replaced by *delicioso*).
- Tests: `node --test server/test/*.test.js`, `npm run test:mobile`, the web client's vitest and build,
  `npx expo-doctor`, `npx expo export --platform ios`.
- Live: `TARGET_LANGUAGE=<it|es> node server/scripts/play-market.js --provider codex-cli --party`, in-process and
  sequential on the Linux compute node (16:51–17:02 UTC): Gerald's encounter, recruit, walk to the Market Entrance,
  coffee break with `Delicious!` / `È buonissimo!` / `Grazie mille!` (es `¡Está buenísimo!`, `¡Muchas gracias!`);
  the variant `--lines 'Il caffè è buona.|Un buon caffè, grazie!'`. 70 calls in all, no usage limit.
- Measures by [`results/summarize.py`](results/summarize.py): verdicts per line, the share estimate
  (`notInTranslation`, as in earlier rounds), and lines that contain an open objective's target form.

## Results

| Check | Result |
|---|---|
| Server tests | 127/127 (122 before; 5 new in `server/test/party-conversation.test.js`, several existing ones updated for the new vocabulary file) |
| Mobile tests | 37/37 (33 before; 4 new) |
| Web client | 12/12, build ok (untouched) |
| expo-doctor / iOS export | 20/20 / ok |
| Gerald's pinned prompts | unchanged |

| Run | Recruited | Resolved | Count | Off map | Calls | Verdicts as scripted |
|---|---|---|---|---|---|---|
| it 1 | yes | yes | 1 | yes | 12 | 5/5 |
| it 2 | yes | yes | 1 | yes | 12 | 5/5 |
| it 3 | yes | yes | 1 | yes | 12 | 5/5 |
| it variant | yes | yes | 1 | yes | 10 | 4/4 |
| es 1 (script error) | yes | no | 0 | yes | 12 | 4/5 as authored; *riquísimo* refused (not authored) |
| es 2 | yes | yes | 1 | yes | 12 | 5/5 |

Share of target language in the coffee break's NPC lines (estimate): Italian 15 lines, mean 0.37 against 0.32
requested, greetings 0.27, 0.26, 0.39, 0.19 against 0.25; Spanish 8 lines, 0.35 against 0.33, greetings 0.29, 0.29.
One line over requested + 0.15 (it 1, turn 2: 0.75, "Sì, buonissimo. … Il complimento va bene. Ma io preparo il
caffè: dov'è la gratitudine?"). No line before an objective passed contained its answer (*buono*/*ottimo*,
*grazie*; *bueno*/*delicioso*, *gracias*); Gerald asked open questions instead ("Che ne pensi?", "¿Qué tal el café?",
"In italiano, per favore: come è il caffè?").

Scene: every greeting set the conversation on the road, not at the cart ("Your travelling companion, apparently",
"I made you coffee"), from the objective intent; the serialized location was `market_entrance` in all runs.

LLM outputs, it 2 (requested 0.25 → 0.40):

1. "Ciao! Sono Gerald. Your travelling companion. Ecco il caffè. Four espresso shots out of five. What do you think?"
2. "Delicious? Three espresso shots. English-only praise: mid. Il caffè è maschile. What do you think of it in Italian?"
3. "Bene! Il caffè è buonissimo. Sono un artista. Five espresso shots; no notes. And for the imp who made it?"
4. "Prego! Sei molto gentile. Five espresso shots; no notes. Il caffè è buono, e la vita è bella. Our business is
   concluded. Keep milk out of it."

es 1, after the refused *riquísimo* and an accepted but held "¡Muchas gracias!": "De nada. Your thanks: five espresso
shots. No notes. Pero falta tu opinión. ¿Qué te parece el café? A Spanish word for good, please." Objectives are
ordered: thanks before praise is graded as passed but does not advance until praise passes.

## Decision

A8b is done: party conversations exist as content, and Gerald has one. Next content: a conversation for Mortimer,
Flick and Marginalia (backlog A8c). Deeper tiers by `conversations` stay deferred.

## Evidence

- [`results/party-it-1.json`](results/party-it-1.json), [`-it-2`](results/party-it-2.json),
  [`-it-3`](results/party-it-3.json), [`-it-variant`](results/party-it-variant.json),
  [`-es-1`](results/party-es-1.json), [`-es-2`](results/party-es-2.json): full reports with the LLM's raw outputs,
  grading and timings; [`results/summarize.py`](results/summarize.py).
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

Six live runs of one conversation (one Spanish run with the right script): a smoke check that the content plays and
grades as authored, not an estimate of rates. The share is the scripts' estimate, not a token labelling. The
reference URLs (Treccani *buono*, *ottimo*, *grazie*; RAE *bueno*, *delicioso*, *gracia*) were not opened (no web
access in the sandbox). Nothing checked in the iOS Simulator.

## Open items

- **Owner, Simulator:** the Party screen's Talk button, count and "Finish your conversation with … first." note; the
  coffee break's dialogue screen; that no recruitment card shows after it.
- **Owner, review:** Gerald's coffee break in both packs, the agreement rule, *delicioso* instead of *rico*, and the
  unopened reference URLs; the decisions in decisions.md (round 022).
- **A8c:** party conversations for Mortimer, Flick and Marginalia.
- Thanks given before praise is accepted by the grader but held by the ordered objectives; Gerald then says "De nada".
  A player may find that confusing; whether the conversation's objectives should be unordered is open.
