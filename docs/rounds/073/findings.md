# Round 073 findings

## Question

Starting an encounter waits for the NPC's greeting, an LLM call that took a median 8.6 s and up to about 15 s in the
live tours. Can the app show that it is working during that wait, instead of a disabled button and nothing else
(backlog I3)?

## Finding

**Yes, checked by tests only.** Under the Talk button that was pressed, on the map or the Party screen, a status
line now reads "{name} is getting ready to talk…" until the greeting arrives or the start fails.

- The store holds `starting` (the encounter id and a per-start token). It is set together with the loading state
  and cleared together with it, but only by that start's own result. It is also cleared at every reset: startup, a
  save switch, a save removal. A late reply from an older start cannot clear or restore it.
- The name comes from the card the line sits in: the location's character, or the party member. A missing name
  reads "Someone". A start with no encounter id (the pack's default encounter, used by the web client's flow) shows
  no line.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md): Codex, effort high, bundle
  on stdin. Of its 7 findings, 5 were accepted and 2 in part. The VoiceOver check goes to the owner, and leaving the
  Party screen during a start stays allowed. The Error (1.3) was a test that `switchSave` could never reach. That
  test now uses the test-only switch and is named as such, and `switchSave`'s refusal while loading is asserted on
  its own.
- Tests: `mobile/src/__tests__/starting.test.js` (7), all failing without the change. They cover the store, both
  panels, and an App-level press of "Talk to Gerald" with a pending start.

## Results

| Check | Result |
|---|---|
| Server | 257/257 (unchanged) |
| Mobile jest | 208/208 (201 before; 7 new) |
| Web client | 12/12 (unchanged) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

I3 is done.

## Evidence

`mobile/src/__tests__/starting.test.js`:
- `starting` set and cleared on success;
- a rejection, and a start with no id;
- late success and rejection after a reset;
- an older start settling during a newer one;
- MapPanel for the current location only, with the fallback name;
- PartyPanel for the matching member only;
- the App-level press.

## Claim boundary

Jest only: no Simulator, no VoiceOver.

## Open items

- Owner (Simulator): press "Talk to Gerald" and "Talk to {member}" and watch the line during the greeting. Check
  what VoiceOver announces inside the map card's live region, and whether it repeats the card (critique 1.5).

## Addendum 2026-11-06: Amendment 1

After the close, a review found that round 073's build had removed `recruit`'s guard against a missing encounter id,
by accident. The guard is restored with a test ([architecture.md](architecture.md#amendment-1-2026-11-06-recruits-guard-restored)).
Mobile is now 209/209.
