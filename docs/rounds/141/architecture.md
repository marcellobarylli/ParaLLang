# Round 141 architecture

**Conversational round, recorded with the build.** The owner's words are in [`trail/interview.md`](trail/interview.md).

- **Artifact:** `client/src/components/CorrectionCard.jsx`, `client/src/components/InputBar.jsx`.

## Design

Both text boxes (the correction card's practice box and the reply box) are sized as their text plus the border, which
`scrollHeight` leaves out (the two-line cut in the owner's picture), and the cap is twelve lines (the reply box's was
about six), after which the box scrolls inside. They start one line high.

## Claim boundary

The rule was measured in headless Chromium at 1, 5, 12 and 30 lines; not tried on the iPhone. "At least five rows
beyond that point" was read as: the whole text shows, up to twelve lines.

## Outcome (2026-11-20)

Built as designed.
