# Round 211 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-28 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; rounds 144 (the road's view) and 176 (the walk between sites).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/scene/roadView.js`; `client/scripts/sink-check.mjs` (new); shots in [`shots/`](shots/).

## Decisions

1. **The character stays after completion.** The view remembers the character of the site the player is at; when
   the server's road clears that site, the character is still shown there (not the cairn) until the player moves on.
2. **It sinks before the walk.** Moving on from that site, its figure goes down 2.4 m into the ground over 3.2 s,
   slowly at first (a smooth step), through the ground as it is. The camera stays on it (it neither wanders nor
   walks), the walk waits, and once the figure is gone the cairn shows and the walk sets off.
3. **Any other camera move** (the map, the hub, another road) ends a sink at once.
4. **Reduced motion:** no sink, as before.

## Tests

`node client/scripts/sink-check.mjs` (after `npm run build -w client`); `npm exec --workspace client -- vitest run`
(351); `npm test -w aesthetic` (95).

## Status

Built; seen in headless Chromium, not on a phone. Merged to `main` and pushed; GitHub Pages deploys the page.
