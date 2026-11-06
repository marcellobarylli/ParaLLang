# Round 065 findings

## Question

Pressing "Continue reviews" briefly showed "No due review is available." (round 063 critique). Can the review screen
stop claiming that nothing is due while the next review loads, or when it fails to load?

## Finding

**Yes. Checked by jest only.**

- **While loading.** The screen says "Finding the next review…" and keeps the return button. It no longer shows the
  no-due text during the request.
- **When the load fails.** It says "The next review could not load." and offers "Try again", with the error banner
  above. Before, a failure left the false no-due text on screen. The critique found this path.
- **Leaving during the wait.** Before, a reply that came after the player went back to the map or the encounter
  pulled them back to the review or the Spellbook. Now the reply only updates the Spellbook counts, and a failure
  that arrives after they left shows no error. The critique found this race; it predates the round.
- The plain no-due text stays for the case it describes.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 7 findings, all accepted.
- Changed `ReviewPanel` (two new states and an `error` prop), `App.js` (passes `state.error`) and `startReview` in
  `gameStore.js` (drops a late reply when the view changed).
- New tests in `mobile/src/__tests__/review-loading.test.js` (6), with the second review request held open.
- Ran the full suites (`npm test`), expo-doctor and the iOS export. No live runs and no Simulator.

## Results

| Check | Result |
|---|---|
| Mobile jest | 182/182 (176 before; all 6 new tests fail without the change) |
| Server / web client | 244/244 / 12/12 (unchanged) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

Done. The cosmetic item from round 063 is closed, along with two real defects next to it (the false message after a
failure, and the late reply that pulled the player back).

## Evidence

- `mobile/src/__tests__/review-loading.test.js`, covering:
  - the loading line, then the next word;
  - nothing left due, which goes to the Spellbook;
  - a 503, then Try again;
  - Return during the wait, with both a reply and a failure;
  - the panel's three empty states.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

Untested on a device. Whether VoiceOver announces the loading line, now that the focused "Continue reviews" button
has gone, is unverified (critique 1.6).

## Open items

1. **Owner, Simulator:** review a word, press "Continue reviews" and check the loading line on a slow connection.
   With VoiceOver on, check that the line is announced or easy to reach. Also stop the server during the wait: you
   should see "The next review could not load." and "Try again".

## Addendum 2026-11-06: review 1 and Amendment 1

A read-only review of rounds 059–065 found nothing serious ([review 1](trail/review-1.md)). It did find that this
round's check did not stop an older review reply from overtaking a newer request on the same screen, and that
"Try again" had no guard against a double tap. Both are fixed now, along with a rare case where the ambience was
raised over a word spoken just after the app came back ([Amendment 1](architecture.md#amendment-1-2026-11-06-review-1-latest-request-only-and-a-guard)).
Mobile 185/185 (3 new tests, all failing without the fix), server 244/244, client 12/12.
