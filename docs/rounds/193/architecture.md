# Round 193 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; the PS1 look's affine texture mapping (`aesthetic/STYLE.md`).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `aesthetic/src/ps1/shaders.js`, `aesthetic/src/ps1/material.js`.

## Decisions

1. **Perspective-correct up close.** The fragment shader mixes its perspective-correct and affine UVs by the
   fragment's depth: fully perspective-correct nearer than 5 m, fully affine beyond 16 m (`uAffineNear`, a shared
   uniform, so every PS1 material and level has it). The PS1 wobble stays in the middle and far distance, where its
   triangles are small on the screen.
2. **Not done:** finer ground near the camera. It would also cure the warp, but costs triangles the budget does not
   have (round 192).

## Tests

`npm test` in `aesthetic/` (95), `npm exec --workspace client -- vitest run` (336), client build.

## Status

Built, and seen in Chromium frames of a glide before and after; not seen on a phone. Merged to `main` and pushed on
the owner's word; GitHub Pages deploys `main`.
