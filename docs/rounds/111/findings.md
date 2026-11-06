# Round 111 findings: a redacted infohazard annex

## Question

Can the lore's "untranslated passages are infohazards; translating them gives juicy lore, but at a cost", with the
companion redacting the hazard, be in the game as a working mechanic, offline?

## Finding

Yes. CM-001 (the Fountain's jingle, filed after Flick) holds "Annex A: the second verse", blacked out by the
companion. The player may read it anyway from the Spellbook, after a system alert. The verse then shows in the target
language, its translation behind the toggle, and the file logs the reader as a host. The companion needs to
recover: the next conversation the player finishes has one hint fewer per objective (2 → 1 everywhere today). The cost
is real and bounded, and it falls on the conversations still ahead after the Fountain.

## Method

Offline, no LLM call. Plan v1 got a design critique from a fresh read-only subagent, since Codex is limited
([`trail/critique-1.md`](trail/critique-1.md): 2 Error, 5 Gap, 4 Minor; 10 accepted, 1.3 rejected as decision 4).
Protocol slip: the build began before the critique returned, and the freeze commit came after it, holding the
records only. The drafts were run through the shared answer check until clean: it *una*; es *quien* (stem *quie*),
*solo* were caught and replaced. A second fresh subagent reviewed the build ([`trail/review-1.md`](trail/review-1.md):
0 Error, 13 findings; Amendment 1).

## Results

| Check | Result |
|---|---|
| Answer check (forms, target words and stems, meanings), it and es | Clean |
| English check (title, redaction, exposure note) | Only the companion's "I" (it, es) and "you" (it), allowed by name |
| Unread payload | No text, translation, glossary or note; nothing leaks through `properties` |
| Strain | limit − 1 on each objective (first and second), floor 0; resume and restart strained; spent by the resolving save (location or party); replay and failed save spend nothing; unknown ids ignored |
| Suites | Server 406/406, client 21/21, mobile 317/317; web build ok |

The texts as shipped:

- it: *Seconda strofa, da non cantare. Chi la legge la canticchia; chi la canticchia la insegna; chi la insegna la
  dimentica, e la ritrova la notte stessa sulle labbra di uno sconosciuto. Questa strofa non ha fine: ha soltanto un
  ritorno.*
- es: *Segunda estrofa, que no se canta. El que la lee la tararea; el que la tararea la enseña; el que la enseña la
  olvida, y la vuelve a encontrar esa misma noche en los labios de un extraño. Esta estrofa no tiene fin: únicamente
  tiene un regreso.*

## Decision

Keep the annex and its cost (autonomous decisions, pending owner review; decisions rows for round 111). Any finished
conversation spends the strain, the player's pick (decision 4).

## Evidence

`server/test/annex.test.js`, `server/test/containment.test.js`, `server/test/party-conversation.test.js`,
`mobile/src/__tests__/annex.test.js`, `mobile/src/__tests__/api.test.js`; [`trail/plan-v1.md`](trail/plan-v1.md),
[`trail/critique-1.md`](trail/critique-1.md), [`trail/review-1.md`](trail/review-1.md).

## Claim boundary

No player has met the cost; whether a hint fewer is felt, or skipped by picking an easy conversation, is untested.
The texts are authored, not reviewed by a native speaker. The layout of the bars, the destructive alert and VoiceOver
through the annex block need the iOS Simulator.

## Open items

- Owner (Simulator): the annex block's layout, the alert, VoiceOver order and labels.
- Owner: whether the cost (one hint per objective, any finished conversation) is the right size.
- A native speaker's review of both verses.
- Later: an annex on CM-002 (Errata); the lore's "limited during certain events" (the companion cannot redact at
  all during some event); `baseLimit` in the hints line.
