# Round 191 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 125's tilt to look.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/tilt.js`, `client/src/scene/director.js` and their tests.

## Decisions

1. **270 degrees to the side.** The look may turn 135 degrees to either side (it was 12 in `tilt.js` and about 14 in
   the director's `LOOK_MAX`). Both limits now say the same.
2. **One to one to the side.** The sideways look has its own gain, `yawGain: 1`: at round 125's gain of 0.6 the phone
   would have had to turn 225 degrees to reach 135. Turning round with the phone held up turns the look as far. The
   leash (where the baseline is dragged along) is at the range, as before.
3. **Up and down unchanged:** 8 degrees at a gain of 0.6. The owner asked about the 270; the pitch is the next thing to
   widen if it still feels held.

## Tests

`npm exec --workspace client -- vitest run` (333; tilt and director tests changed for the new range), client build.

## Status

On the session branch; not yet merged to `main`.
