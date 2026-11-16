# Round 124 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-16 by the owner's screenshot of the temple
map on the iPhone, not through the round pipeline. Sections marked *pre-run* must not be edited after the commit
that holds them. Changes go into dated Amendments; results go into the dated Outcome section, added later. The full
record (the owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 119's [architecture](../119/architecture.md) (the fog over hidden sites).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/src/scene/levelView.js`, `client/src/components/DungeonScreen.jsx`, `client/src/index.css`.

Round 123 (New Game Plus) is opened and only logged; this small round takes the next number.

## Goal (pre-run)

1. The temple map says what its dark patches are.
2. The patches are a bit less dark.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- "So what are the black shadows?" (Q0), on a screenshot of the temple map.
- "Let's add a little legend for these, and make them a bit less dark" (Q1).

The legend's wording and the new darkness are Claude's.

## Design (pre-run)

### The legend

- The temple map's card (`OverviewCard`) shows one line under the list of sites while at least one site is hidden:
  a small dark swatch and the text "Dark patches cover places you have not found. One lifts when you reach a site
  next to it."
- The line is absent when no site is hidden (a finished run, or a run that has found every site).
- The swatch is an octagon cut with `clip-path`, in three tones like a patch. The stylesheet keeps its rule of no
  rounded corner (round 117).
- The numbered markers get no legend: the list of sites above the line already names each number and its state.

### The darkness

- A patch is three stacked discs, each drawn at `FOG_PATCH.opacity`. The value goes from 0.42 to 0.3.
- So a patch's rim covers 30 % of the ground under it (42 % before), its middle ring 51 % (66 %) and its centre
  66 % (80 %). Where two patches overlap, as over The Sanctuary and the site before it, the centre covers 88 %
  (96 % before).
- The patches' size, height and colour stay.

## Claim boundary (pre-run)

"A bit less dark" is judged by Claude from a headless screenshot at the phone's size. Whether it is right on the
iPhone's screen is the owner's observation. The value is one number in `client/src/scene/levelView.js`.

## Tests (pre-run)

- Map card: the legend is shown at the start of a run, where four sites are hidden, and absent on a finished run.
- Playthrough (real browser, 390×844 and 1440×900): the legend is visible on the first temple map and lies inside
  the card; the existing overlap checks keep passing; a screenshot of the map for the record.
- All suites and the build keep passing.

## Outcome (2026-11-16)

Built as designed and deployed as `77cdf04` with `[skip render]`; the live build is `0.1.0+mwj51535`. The temple
map's card explains the dark patches while a site is hidden, and each disc of a patch is drawn at 0.3. All suites
and the playthrough pass. The claim boundary held: the darkness on the iPhone's screen is not known. See
[`findings.md`](findings.md); the owner's words are in [`trail/interview.md`](trail/interview.md).
