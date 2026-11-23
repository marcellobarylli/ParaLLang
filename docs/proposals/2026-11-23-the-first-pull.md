# Proposal: the first pull

*2026-11-23. Not built. Written because the owner described the event and said "we need to kind of think of how to
implement that animation and then permanently update the world map". No second opinion was taken (the cloud session
has no Codex); the questions at the end are for the owner.*

## Goal

At the step from A2 to B1 the player sees what they have been walking on and what their walk has done to it
([`docs/lore-book.md`](../lore-book.md), "The first pull"): the map draws back, the whole graph grows out from where
they stand like a wave, and then the land is pulled down at every site of their walk, for good.

## Problem

The landscape is a pure function of a seed (`server/src/road/terrain.js`), and everything rests on that: the server
rules on moves with it, the client builds its ground and paints its map from the same functions, and the save holds
ids and nothing else. A landscape that changes because of what one learner did must stay a pure function, or the
server and the client stop agreeing on where the ground is.

## Change

**1. The pull is data in the save, and the land is still a function.** When the event happens the road keeps
`pulled: { step, sites: [node ids] }`: the sites of the walk so far, each once. `createTerrain(seed, { pulls })`
takes their positions and lowers the ground round each:

    height(x, z) = base(x, z) − Σ depth · k(distance to the site / radius),   k(t) = (1 − t²)² for t < 1, else 0

About 60 m across and 8 to 12 m deep makes a hollow that reads as a small valley on the map and a dip in the level;
where sites of the walk lie along a line, the hollows run together into a valley along the seam, which is the picture
the lore asks for. A site never goes under water: its own depth is capped at its height less a metre and a half.
The pulls are indexed by the graph's cell, so a height asks nine cells at most.

**2. The graph does not move.** Sites and ways are still read from the land without pulls, so every id, every way
and every saved walk stays valid; only a site's height is read from the pulled land. (Otherwise a pull could flood a
way or move a site, and old saves would point at nothing.)

**3. The event.** `finishRoad` already knows when a conversation opens a new unit. When the unit it opens is the
first of B1, it writes `pulled` in the same save and the reply carries `worldEvent: 'first_pull'`. The client then
plays, on the map:

- *the map draws back*: the journey's frame (round 161), a little wider;
- *the web*: every site and way within a radius that grows from the player outward over a few seconds, drawn as the
  map draws ways (the graph is generated as the radius reaches it, which is the generation the owner wants shown);
- *the pull*: the map's picture painted again with the pulls at 0 %, 10 %, … 100 % of their depth. The painter takes
  some tens of milliseconds a frame at the map's 240 columns, so ten frames a second is within reach on a phone;
- then the narrator's passage for it (a written one, with a turmeric text), and the guidebook's entry.

After it the 3D level builds its chunks from the pulled land, and the map and the icon-like picture of the journey
show the valleys from then on.

**4. Later pulls.** `pulled` can hold more than one moment (`[{ step, sites, depth }]`), each deeper than the last:
"not pulled without limit, but that is the way it is going".

**5. The characters going back.** Separate and small: at the end of a conversation on the road the stand-in sinks
through the ground (`client/src/scene/roadView.js` already moves the figures each frame).

## Questions for the owner

- **Which sites are pulled**: every site walked to, or only those where a conversation was finished (a completed
  stitch, by the lore)?
- **How deep and how wide** the first pull is: a dip that needs the map to notice, or a valley seen from the road?
- **Is it shown once**, or can the player watch it again from the guidebook?
- **Does the web stay visible** on the map after the event (faintly), or only during it?
