# Round 132 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-19 by the owner's report from the iPhone, in
a Claude Code cloud session, not through the round pipeline. Sections marked *pre-run* must not be edited after the
commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section, added later.
The full record (the owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 115's [architecture](../115/architecture.md) (the conversation as a bottom sheet, the
  objective pinned at its top), round 131's (the card lists every open objective), round 117's and 118's (the
  installed page's layout).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/src/components/DialoguePanel.jsx`, `client/src/components/DungeonScreen.jsx`,
  `client/src/components/SheetHandle.jsx` (new), `client/src/index.css`.

## Goal (pre-run)

1. Settings can be scrolled.
2. The objective box stands in the conversation where the player should answer, and folds into a small bar once
   the player has scrolled past it.
3. The conversation panel can be dragged up to fill the screen and down to cover nothing.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md) (Q0):

- "Settings screen doesn't scroll."
- "The objective screen is pinned, and the scrollable encounter text is a thin wedge between objective and answer
  bar." This is round 131's doing: the card grew from one objective to a list and stayed pinned.
- "The player should first see the narrative opening, the opening dialogue, and then the grey objective box as it
  is."
- "If it carries across turns, it should still appear at the point I said, and … once the player keeps scrolling
  past its first appearance it should collapse into a small foldable 'objective' bar that can be unfolded / toggled
  by tapping."
- "The whole text element should be draggable to take up the entire screen or all the way down to cover nothing."

Claude's decisions:

- **Decision 1: one box, at its first place, always current.** The box stands after the character's opening line
  and stays there for the whole conversation. Its content is the objectives open now, so it never shows a stale
  list. Putting a second box after each later line would repeat it down the page.
- **Decision 2: the bar appears only when the box is above the visible text.** It is one line at the top of the
  text: "Objective" and how many are still to do. A tap unfolds the same content under it; another tap folds it.
  It starts folded each time it appears.
- **Decision 3: the companion's briefing follows the box.** The owner's order is narration, line, objectives; the
  tutorial's advice on how to answer comes after them.
- **Decision 4: a handle at the top of the panel.** A strip with a grip. Dragged up, the panel grows to the bottom
  edge of the top bar, which stays in reach (Party, Spellbook, Settings); dragged down, only the handle is left, so
  the temple is uncovered. The height is kept for the session, across conversations. On a wide screen the panel is
  at the side and has no handle.
- **Decision 5: the keyboard can do it too.** The handle is a button: the up and down arrows move it, Home and End
  take it to its ends.

## Design (pre-run)

- **Settings.** The sheet gets a maximum height of the screen less the safe area at the top, and scrolls inside.
- **The objective box.** `DialoguePanel` draws the first line of the character, then the box (no longer pinned),
  then the briefing, then the rest. A zero-height pinned holder at the top of the text carries the bar, so showing
  or hiding the bar never moves the text. An `IntersectionObserver` on the box, with the scrolling text as its
  root, shows the bar when the box has left the top.
- **The handle.** Pointer events with capture, `touch-action: none` on the strip only, so the text below still
  scrolls. The panel's height is a CSS variable on the sheet, clamped between the handle's own height and the
  distance from the top bar's bottom edge to the bottom of the screen; within 28 px of either end it snaps to it.
  The camera already frames the part of the screen the panel leaves free and follows the new height.

## Claim boundary (pre-run)

Checked in headless Chromium at the iPhone's size with touch input, and in tests. The installed page on the iPhone
has its own layout rules (rounds 117 and 118) and its own way of scrolling; whether the drag feels right under a
finger, and whether Settings scrolls there, is the owner's observation.

## Tests (pre-run)

- **Order:** the first line, the box, the briefing, then later lines; the box is not pinned.
- **The bar:** hidden while the box is in view; shown when it has left the top; a tap unfolds the objectives and a
  second folds them; it shows the count still to do and "complete" at the end.
- **The handle:** a drag up and down changes the height by the distance dragged, within the limits; the snaps; the
  arrow, Home and End keys; no handle effect on a wide screen.
- **Real browser (390×844, touch):** Settings scrolls to its first and last control; a new conversation shows the
  narration and the line before the box; after an answer the box is above and the bar shows; the panel drags to
  the top bar and down to the handle, and the reply box is reachable again after dragging back.
- All client suites and the build keep passing.
