# Round 185 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-25 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 173 (streamlined mode, which had no gates); round 160 (the legacy
  dungeons as nodes of the road).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/road/pacing.js`, `server/src/road/encounters.js`, `server/src/road/service.js`;
  `client/src/components/Road.jsx`, `client/src/components/DungeonScreen.jsx`, `client/src/components/SettingsSheet.jsx`,
  `client/src/index.css`; `docs/curriculum.md`; tests in `server/test/streamlined.test.js`,
  `server/test/biomes-dungeons.test.js`, `client/src/components/__tests__/narration.test.jsx`.

## Decisions

1. **Reading of the message.** In streamlined mode a conversation is a unit of three lessons, so "every 3
   conversations ... the content from those 3 lessons (so 3 encounters)" is read as: after every three units, a gate
   of three encounters, one for each of those units. To confirm with the owner (findings, open items).
2. **A new kind, `gate`** (`PACING.gateEvery` = 3), streamlined only. It is owed when the units completed are a
   multiple of three, or the curriculum is finished (its last gate may be of fewer units). `progress.gates[gateId]`
   counts its encounters played; `gateId` is the id of its last unit.
3. **One encounter a unit.** Each asks for one objective of each of the unit's lessons: the second where there is
   one, since the unit conversation asked for the first. Asked as a review asks (the words are not said first, the
   objectives in any order), two hints an objective.
4. **Counted whatever the score**, as a unit conversation is. The next unit opens after the third encounter; until
   then every way on leads into the gate.
5. **Where.** Gates go round Ta Prohm, The Kiln and Micromort Mountain (the first gate is Ta Prohm's). The three
   encounters are at three of the dungeon's sites: its start, then the next two in its list. The road stores
   `dungeonSite`; `here.dungeon.siteId` tells the client which site of the level to show.
6. **The countdown** on a place's card counts unit conversations to the next gate ("Ta Prohm in 2 conversations or
   more").
7. **Saves.** A streamlined road that has completed three, six, ... units and has not started the next one owes that
   gate now; an earlier gate it went past is not owed. Switching streamlined off with a gate waiting gives the full
   pacing's choice, as with a unit.

## Tests

`npm test` in `server/` (612; 2 new), `npm exec --workspace client -- vitest run` (329; 1 new), client build.

## Status

Built and tested with the scripted provider, on `claude/loving-lamport-s6pjlu`; not merged, not deployed, not played in
a browser.
