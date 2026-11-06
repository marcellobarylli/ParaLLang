# Round 106 findings: the server withholds card meanings during encounters and on due cards

## Question

Does the Spellbook payload still hold answers the screens hide (round 104 R1.7)? If so, can the server withhold them
by the same rule the app uses, without changing what a player sees?

## Finding

It did: during an encounter every card carried its meanings, note and example English, and so did due cards.
`spellbookSnapshot` now blanks them by the app's rule at snapshot time (encounter, due, round 090's form and example
waits) and marks each card `withheld: { meaning, example }`. Nothing a player sees changes: both clients hid these
already and now also render a null safely.

## Method

Offline. Server change in `server/src/learning-service.js`; tests in `server/test/spellbook-withheld.test.js`
(in-process runtime, fixture LLM): the start, a resumed start, a word help and `GET /api/spellbook` during
Gerald's encounter (es); the resolving turn; snapshots with set schedules for the due and wait cases. A fresh
read-only subagent reviewed the build (5 findings, no Error).

## Results

- During the encounter (start, resume, help, route): every card withheld; no string in the payload holds any card's
  accepted translation as a whole word.
- Cards not due during a restarted encounter are withheld too; the same envelope outside an encounter shows all.
- Outside an encounter: a due card and a phrase whose word is due are withheld; a card whose example holds a due card
  keeps its meaning and loses only the example's English; the content is untouched.
- After the resolving turn, cards not due and not waiting have their meanings and notes back.
- Six mutations each fail a test. Suites: server 392/392, client 20/20, mobile 303/303.

## Decision

Keep the server-side withholding (autonomous decision, pending owner review; decisions row for round 106).

## Evidence

`server/test/spellbook-withheld.test.js`, `server/test/spellbook-encounter.test.js` (the note test),
`mobile/src/__tests__/spellbook.test.js`, `client/src/components/__tests__/learning-flow.test.jsx`,
[`trail/review-1.md`](trail/review-1.md).

## Claim boundary

Encounters live in server memory: after a server restart during one, the server knows no encounter and sends the
meanings; the app's `leaksMeanings` guard keeps them off the screen (review R1.1, declined). The review challenge and
its result are unchanged and still name the answer after a reveal or an answer, as designed.

## Open items

- A persisted "encounter ongoing" flag would close the restart case in the payload too (R1.1); not needed for what a
  player sees.
- Simulator (owner): the Spellbook during and after an encounter looks as before.
