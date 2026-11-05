# Round 021 findings

## Question

Can the player save a defeated, saveable NPC to a party, with the choice in the app and the party in the learner
save (backlog A8a), without changing any encounter or prompt? Separately: does the app's start request reach the
encounter it names?

## Finding

**Yes, under tests and one live run.** After a saveable NPC's encounter resolves, the app offers **Save *Name*** or
**Leave**; Leave writes nothing and the NPC's location card on the map keeps the invitation open. The party is in the
learner save (schema 3, `party`), served by `GET /api/party` and `POST /api/party/recruit`, and listed on a Party
screen with a count in the header. Portia and Errata (`saveable: false`) are refused (`NOT_SAVEABLE`), nobody joins
before their encounter is won (`NOT_DEFEATED`), and recruiting twice or concurrently adds one member.

**A bug from round 006 is fixed.** `POST /api/encounter/start` dropped `encounterId`, so over HTTP the app started
the pack's default encounter (Gerald) at every location, with no location check. In-process scripts
(`play-market.js`) and tests never went through the route with an id, so no live run or test saw it. Over real HTTP
the same request now starts Portia at the Market Entrance and gets 409 `NOT_HERE` for Gerald there. Every
Simulator session the owner may have played since round 009 would have met Gerald everywhere.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md) (8 findings: 5 accepted, 3 in
  part; the one Error, saveability missing from the world snapshot, accepted).
- Tests: `node --test server/test/*.test.js`, `npm run test:mobile`, the web client's vitest and build,
  `npx expo-doctor`, `npx expo export --platform ios`.
- Mutation check: with the old route restored, the new route test (and the during-encounter test that relies on it)
  fail; restored afterwards.
- Live, codex-cli on the Linux compute node, sequential: `play-market.js --location coffee_cart --recruit` in Italian
  (5 calls), then an HTTP check through `results/http-check.mjs` (server child on 127.0.0.1:3917 with a random
  `PARALLANG_TOKEN`, stopped by the script; 1 call). A first HTTP attempt from the shell sent no valid token (all
  401, no LLM call) and left the node process running for about 10 s until it was killed by PID (journal row 12).

## Results

| Check | Result |
|---|---|
| Server tests | 122/122 (114 before; 8 new in `server/test/party.test.js`) |
| Mobile tests | 33/33 (25 before; 8 new in `mobile/src/__tests__/party.test.js`) |
| Web client | 12/12, build ok (untouched) |
| expo-doctor / iOS export | 20/20 / ok |
| Gerald's pinned prompts | unchanged (golden test passes) |
| Live recruit run (it) | resolved in 2 turns, verdicts as scripted (order 1st turn, no milk 2nd), recruited: `joined: true`, party `[Gerald, met at The Coffee Cart]`; 5 calls, 39 s |
| Live HTTP check (it) | Portia's id at the entrance → Portia (`saveable: false`); Gerald's id there → 409 `NOT_HERE`; recruit Portia → 409 `NOT_SAVEABLE`; recruit Gerald unbeaten → 409 `NOT_DEFEATED`; party `[]` |

LLM outputs (Gerald, it, requested 0.25 / 0.30 / 0.35; share is the script's canonical-token estimate):

1. "Buongiorno. Sono Gerald. This cart? Five espresso shots. The market? One. What would you like?"
2. "Un caffè, certo. Polite. Four espresso shots. Ma come vuoi il caffè? Your order leaves the milk situation
   unresolved. I consider that a security breach."
3. "Senza latte. Perfetto! Ecco il tuo caffè. Five espresso shots. No notes. You have spared a perfectly good coffee
   a dairy incident."

Portia over HTTP: "Benvenuto! Portia, entrance administration. Before the mercato: a greeting and your name, please.
The book gets fussy."

## Decision

A8a is done; A8 stays open for **A8b** (revisit conversations with party members, which need a prompt template,
relationship and live runs). The route fix stands on its own.

## Evidence

- [`results/coffee-recruit-it.json`](results/coffee-recruit-it.json): the live recruit run (steps, raw outputs,
  verdicts, party).
- [`results/http-check-it.json`](results/http-check-it.json) and its driver
  [`results/http-check.mjs`](results/http-check.mjs).
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

Server and app logic under tests, one live in-process run and one live HTTP check, Italian only (Spanish only in
tests). Nothing checked in the iOS Simulator. No measure of the language share or grading changed (no prompt or
content change).

## Open items

- **Owner, Simulator:** the SAVE / LEAVE card under the resolved encounter (does it scroll into view?), the map
  invitation, the Party screen and the header's Party button (fit beside Spellbook, Map and Restart on a small
  phone), the notice bar, VoiceOver labels.
- **Owner, review:** Leave is not final; party membership per character; recruiting allowed during another encounter
  (decisions.md, round 021).
- **Owner:** any Simulator session since round 009 met Gerald at every location (the route bug); earlier Simulator
  findings about other encounters may need re-checking.
- **A8b:** revisit conversations with party members.
- The frozen web client still shows no party (by design).
