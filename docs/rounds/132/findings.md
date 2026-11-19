# Round 132 findings

## Question
The owner reported from the iPhone that Settings does not scroll, that the pinned objective box leaves a thin wedge
of text, and asked for the box to follow the opening line and fold into a bar, and for the panel to drag from the
whole screen down to nothing. Are the three done?

## Finding
Yes in headless Chromium at the iPhone's size with touch input. Not tried on the iPhone, where the installed page
has its own layout and scrolling.

## Method
CSS for the Settings sheet; `DialoguePanel` reordered, with a pinned zero-height holder for the bar and a
measurement of the box on scroll; a new `SheetHandle` with pointer events that sets the panel's height.
`client/scripts/layout-check.mjs` plays the built client against the real server code and drags by touch through
the browser's own input pipeline.

## Results
- **Settings.** The sheet was 1,021 px of content on an 852 px screen and grew past the top. It now stops at the
  screen and scrolls inside: the heading is on the screen at first, the last button after scrolling
  ([top](shots/01-settings-top.jpg), [bottom](shots/02-settings-bottom.jpg)).
- **The cause of the wedge.** Round 131 turned the one-line objective into a list of up to four and left it pinned.
  On the owner's screen it took about 250 px of the panel.
- **The box.** A conversation opens on the narration, then the character's line, then the box, then the tutorial's
  briefing ([picture](shots/03-opening.jpg)). There is one box; it stays at that place and shows what is open now.
- **The bar.** Once the box is above the visible text, a 40 px bar is pinned at the top of the text: "Objective"
  and "3 to do" ([picture](shots/04-bar.jpg)). A tap unfolds the objectives over the text without moving it
  ([picture](shots/05-bar-unfolded.jpg)); another folds them; scrolling back to the box removes the bar.
- **The panel.** A grip at its top. Dragged up 150 px it is 150 px taller; all the way up it stops at the top bar's
  bottom edge, with Party, Spellbook and Settings in reach ([picture](shots/06-full.jpg)); all the way down only the
  30 px grip is left and the temple is uncovered ([picture](shots/07-down.jpg)). A tap on the grip of a panel that
  is down brings it back to 62%. Within 28 px of either end it goes to the end. The text under the grip still
  scrolls by a swipe. The arrow, Home and End keys move it too.
- **Tests.** Client 209 passing (200 before). Real browser: 23 checks, 0 problems. The other three browser checks
  (beginner mode, voices, narration words) still pass.

## Decision
Kept and deployed to the client. The bar's wording, the grip's look, the snaps and the stop at the top bar are
Claude's.

## Evidence
- The owner's words: [`trail/interview.md`](trail/interview.md).
- Pictures: [`shots/`](shots/), from `client/scripts/layout-check.mjs`.
- Timeline: [`trail/journal.md`](trail/journal.md).

## Claim boundary
Headless Chromium, not Safari, and not the page installed to the home screen. Not known on the iPhone: whether
Settings scrolls there, whether the drag starts cleanly under a finger at the very top of the panel, and how the
panel behaves when the keyboard is up. "Take up the entire screen" stops under the top bar, by Decision 4. The
panel's height is kept while the page is open, not across reloads. On a wide screen the panel is at the side and
has no grip.

## Open items
- **Owner:** try the three on the iPhone.
- If the panel should cover the top bar as well, the limit is `sheetLimits` in
  `client/src/components/SheetHandle.jsx`.
- The site card, the map card and the title card are not draggable; only the conversation panel is.
