# Round 157 architecture

**Conversational round, recorded with the build.** The fifth of the owner's eleven issues (see
[`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #5, "Guidebook with hardcoded narration entries" (step 7 of the build order);
  [round 156](../156/architecture.md), whose events it uses.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/narration/guidebook.yaml`, `server/src/narration.js` (`entriesFor`),
  `server/src/learning-service.js` (`enterGuide`, `guidebookNote`, `getGuidebook`, `readGuidebook`),
  `server/src/learning-storage.js` (`guidebook`), `server/src/app.js`, `client/src/components/Guidebook.jsx`,
  `client/src/stores/gameStore.js`, `client/scripts/guidebook-check.mjs`, `docs/rounds/157/shots/`.

## Goal

A guidebook the player can open at any time. Some narration is written down and, the first time it is shown, is
entered in the guidebook for later reference.

## Design

**Entries are content.** `content/narration/guidebook.yaml` holds each entry: `{ id, title, when, text }`. `when` is
an event and its facts, the vocabulary round 156 gave the narrator's passages (`road_enter`, `road_arrive`,
`site_arrive`), with one fact added to an arrival on the road: the `kind` of conversation waiting there. There are
four entries. The issue asks for the mechanism with a placeholder; these are real ones, since the mechanism needs
something to show:

| Entry | Entered by |
|---|---|
| The road | the first step on the road |
| Being let past | the first conversation at a site of a dungeon |
| Old words | the first arrival at a review |
| Gates | the first arrival at a unit's gate |

Issue #4 adds "Turmeric text".

**An entry is entered when its narration fires.** Wherever the server tells a written passage (`tell`), it also
enters every entry whose `when` fits what happened and which the learner does not have. The road's arrivals already
go through `tell`. A dungeon's entry is entered when a conversation opens at a site and on a walk between sites, not
when the map is merely read: the world map reads every dungeon's map for its counts.

**The save holds the guidebook**: `guidebook: { id: { at, read } }`, written in the same save as the move or the
conversation that entered the entry. An entry the content no longer has stays in the save and is not listed.

**Shown first, then kept.** Every view of a place (the road's, a dungeon's, the reply to a conversation's start)
carries `guidebook: { count, unread }`, `unread` being the entries not yet read, as narration. The web client tells
them on the card of the place, under the narrator's passage, with "Entered in your guidebook" and a way in. They stay
there until the guidebook is opened.

**The guidebook** is the "?" button in the top bar, at any time, with a count while an entry is unread. It is an
overlay like the Spellbook: each entry's title and its text in the narrator's italic, the unread ones marked "New",
and "2 of 4 entries" so that the player knows there is more to find. Opening it reads every entry
(`POST /api/guidebook/read`); the "New" marks stay for that visit.

**Routes.** `GET /api/guidebook` → `{ guidebook: { entries: [{ id, title, segments, at, unread }], total } }`;
`POST /api/guidebook/read` → the same, all read.

## Tests

- `server/test/guidebook.test.js` (6 tests): the content; which entries an event enters; the road's first step
  through to reading; a review's arrival; a dungeon's first conversation and a map only read; the save's validation.
- `client/src/components/__tests__/guidebook.test.jsx` (4 tests): the panel, the empty and the opening states, the
  note on a card, and the store against the real server logic.
- `client/scripts/guidebook-check.mjs` in headless Chromium at a phone's size, the top bar's width among its checks.

## Claim boundary

Seen in headless Chromium, not on a phone. The four entries are Claude's and unread by the owner. No model is
involved in any of it. The iPhone app has no guidebook.

## Outcome

See [`findings.md`](findings.md).
