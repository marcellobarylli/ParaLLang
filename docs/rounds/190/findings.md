# Round 190 findings

## Question

Why does the practice box not show what the microphone heard, and can a new reply be brought into view by a setting?

## Finding

The box never grew: in Chromium, with the column form's `flex: 1`, a box given 219 px stayed 46 px (one line). With
`flex: none` and the page's own CSS it shows 1 line for a short answer and 5.0 lines for 7, 10 and 30 lines of text,
scrolling inside past five. "Follow the reply", the default, puts a new line at the panel's top in a test (jsdom, with the panel's
scroll and the line's place set by hand); switched off, the panel does not move.

## Results

| Check | Result |
|---|---|
| Client tests | 333 of 333 (1 new, 3 changed) |
| Client build | passes |
| Practice box in Chromium (page CSS, the component's sizing) | 1 to 5 lines in view, then scrolls |
| Follow the reply in a browser | not checked (no model to reply locally) |
| On a phone | not checked |

## Claim boundary

- The follow was checked without a real layout; its place on the phone, with the keyboard up, was not seen.
