# Round 137 architecture

**Conversational round, recorded with the build.** The owner's words are in [`trail/interview.md`](trail/interview.md).

- **Artifact:** `client/src/components/CorrectionCard.jsx`, `client/src/index.css`.

## Design

The practice box of the correction card (round 129) is a textarea that grows with its text and wraps; Enter checks it,
Shift+Enter breaks the line. The microphone and Check sit in a row below it. The box, and then the "Not quite" or
"That's it" verdict, are scrolled into view (`scrollIntoView`, nearest) when they change, so the verdict is not left
below the panel's edge.

## Claim boundary

Client tests pass; not watched in a browser or on the iPhone.

## Outcome (2026-11-19)

Built as designed.
