# Round 122 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-15 from the owner's instruction in round 119,
not through the round pipeline. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section, added later. The full record (the
interview, the draft as Codex read it, the raw critique, the timeline) is in `trail/`; it is not needed to
implement this round.

- **Design source:** round 119's [interview](../119/trail/interview.md) (Q5); round 115's
  [architecture](../115/architecture.md) (the beacons as stand-ins); the character sheets in
  `content/characters/enemies/`; [`aesthetic/README.md`](../../../aesthetic/README.md) (the look);
  [`docs/handoff.md`](../../handoff.md).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `aesthetic/src/scene/figures.js`, `client/src/scene/levelView.js`,
  `content/world/dungeons/ta_prohm.yaml`, the tests and `docs/rounds/122/shots/`.

## Goal (pre-run)

Each of the seven sites of the Ta Prohm dungeon shows its character as a 3D figure in the level's PS1 look, in
place of the placeholder beacon (a crystal, a ring and a shaft of light).

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- Round 119, Q5: "Once you are done, can start replacing the placeholder 3D encounters with real characters. Run
  autonomously as I will be away, go with most reasonable assumption". No option was offered.
- The owner gave no art direction. What each figure looks like, how it is built and how it behaves is Claude's, and
  so is every disposition of the critique.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 65e9fdf7…; Codex, effort high; raw text in
[`trail/critique-1.md`](trail/critique-1.md). The owner was away, so every disposition is Claude's.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error, high | On a phone the conversation sheet leaves 38% of the height, and the camera stands 4 m from the site and steps in. A figure 2.5 m tall is cut at the top | 0 | Accept: no figure is taller than 2.2 m, each is built around a focus point near the height the camera looks at (1.35 m), and the check is that the focus is inside the free part of the screen at the first hold and at the resolved one. The camera is not changed | **Accepted** by Claude; the owner was away | Figures; Tests |
| 1.2 | Error, high | "Within 6 m of the camera" fails at the first site, where the approach holds 9.5 m back | 0 | Accept the error, not the fix (a change to the director): the check uses the distance the playthrough already allows per site (10.5 m at the start site, 4.5 m elsewhere) | **Accepted in part** by Claude; the owner was away | Tests |
| 1.3 | Error, high | "Every figure stands on the ground" contradicts Errata, who floats | 0 | Accept: a figure may declare a clearance, and the test reads it | **Accepted** by Claude; the owner was away | Figures; Tests |
| 1.4 | Error, medium | A clear site point is room for a walker, not for a figure with props. The step aside would put Errata into a gate pier, and Marginalia has 1.5 m either side | 0 | Accept: every figure with its props fits a circle of 0.9 m radius, the dungeon-file test checks that circle against the wall plan at each site, and no figure moves from its place (the step aside goes) | **Accepted** by Claude; the owner was away | Figures; Level view; Tests |
| 1.5 | Error, medium | The level has 62,408 triangles of a budget of 64,000. Seven figures of 400 would break it, and nothing would count them | + | Accept: 160 triangles a figure, the fog patches drawn with fewer, and the playthrough counts level, markers and figures together against the style's budget | **Accepted** by Claude; the owner was away | Figures; Tests |
| 1.6 | Error, medium | The new module was not exported from the package | + | Accept | **Accepted** by Claude; the owner was away | Figures |
| 1.7 | Error, medium | "The server is not changed" contradicts the schema field | 0 | Accept: the server's rules are unchanged; its loader accepts one optional field | **Accepted** by Claude; the owner was away | Content |
| 1.8 | Cut, high | Breathing, hopping, drifting slabs, circling tiles, gestures and a quarter turn need a hierarchy of meshes and rules that compete with facing the camera | − | Accept in part: no part of a figure moves by itself. The whole figure keeps two motions the beacon had, at the cost of one line each: a slow bob, and a hop when an objective is passed | **Accepted in part** by Claude; the owner was away | Figures; Level view |
| 1.9 | Cut, medium | The ring kept as a site mark is placeholder geometry with its own handling | − | Accept: a site with a figure has no ring | **Accepted** by Claude; the owner was away | Level view |
| 1.10 | Cut, medium | `inscription` and `rootGlow` glow with the level's corruption, which is zero in Ta Prohm, so they would not glow | − | Accept: bright vertex colours in `plain` | **Accepted** by Claude; the owner was away | Figures |
| 1.11 | Cut, medium | An eased turn needs state and angle wrapping | − | Accept: a figure's facing is set from its place and the camera's each frame | **Accepted** by Claude; the owner was away | Level view |

**Deferred:** none (Codex listed no Optional items).

Net change against draft 1: figures smaller and lighter (2.2 m, 160 triangles, a 0.9 m footprint), three checks
corrected, one check added (the scene's budget), and the choreography, the step aside, the ring, the glow materials
and the eased turn removed.

## Design (pre-run)

### What exists

- `client/src/scene/levelView.js` builds a beacon per site (`beacon()`): a gold octahedron, a ring on the ground and
  an additive shaft, in three.js basic materials. A beacon shows only while the camera is at its site. A resolved
  site lifts the crystal away and turns the ring green; a passed objective makes the crystal flare.
- `@parallang/aesthetic` holds the look. Its levels are built with `MeshBuilder` (geometry per material key, merged
  into one mesh per material, vertex colours painted in) and PS1 materials (`plain` is the vertex-coloured one: lit,
  fogged, jittered like the level). A world exposes `materials`. The package's public API is `src/index.js`.
- The style's budget is 64,000 triangles a scene (`aesthetic/src/style.js`); Ta Prohm with seed 7 has 62,408.
- The camera holds 4 m from a site at eye height and looks at a point 1.35 m above the site's ground; at the start
  site it holds 9.5 m back and 2.8 m up. A conversation steps it in by up to 35%.
- The character sheets (`content/characters/enemies/*.yaml`) describe each character's appearance.

### Figures (`aesthetic/src/scene/figures.js`, new, exported from `src/index.js`)

- `FIGURES`: a table from a figure's name to its builder and its numbers: `archway`, `imp`, `charcutier`,
  `letharger`, `bookworm`, `wanderer`, `erratum`.
- `createFigure(name, materials, { seed })` returns `{ group, height, focus, radius, clearance }`, or null for an
  unknown name. The group's origin is the site's ground point and the figure faces +z. It is one mesh in the `plain`
  material, built with a `MeshBuilder` from boxes, cones, cylinders and tapered tubes with vertex colours. Bright
  parts (Portia's threads, Errata's seam, Flick's sparks) are bright vertex colours (finding 1.10).
- Limits, each checked: at most 160 triangles (finding 1.5); at most 2.2 m tall (finding 1.1); everything within
  0.9 m of the vertical axis (finding 1.4); the lowest vertex at the ground, or at the figure's stated clearance
  (finding 1.3); `focus`, the height of the face, between 1.0 and 1.7 m.
- What each shows, from its sheet:
  - **archway** (Portia, 2.2 m): two stone piers and a lintel with a keystone, a mouth of dark mortar between two
    stones, two bright threads in cracks, a small sign hung askew.
  - **imp** (Gerald): a dark brown imp 0.35 m tall with horns, a pale apron and a white cup, standing on a coffee
    cart 1.05 m high, so that he is at the height the camera looks at.
  - **charcutier** (Mortimer, 1.9 m): a broad figure in a striped apron, thick arms, a ham for a hat, a cleaver.
  - **letharger** (Flick): a gnome 0.25 m tall with a pointed cap, in mid-step on the rim of a cracked stone basin
    1.1 m high, with three bright sparks beside him.
  - **bookworm** (Marginalia, 1.5 m): a fat segmented worm rising from a heap of books, with half-moon spectacles
    and a pencil.
  - **wanderer** (Bambieshart, 2.0 m, stooped): a tall thin figure in a long faded coat with bands, a drooping face
    and a staff.
  - **erratum** (Errata, 1.9 m, floating 0.25 m off the ground): a rough person shape of slabs that do not quite
    line up, with a bright seam, and a few small tiles (the letters) beside it.

### Content

A dungeon site may name its figure: `figure: archway`. `ta_prohm.yaml` names the seven. The loader's site schema
gains the optional `figure` (a lower-case word), and the client's dungeon model carries it. The server's rules do not
change (finding 1.7). The server does not check the name against the package (it does not import three.js); the
client's dungeon-file test does.

### Level view (`client/src/scene/levelView.js`)

- For each site with a figure the view builds it from `world.materials` and adds it to the markers group at the
  site's ground point. A site without one keeps the whole beacon. A site with one has no crystal, no shaft and no
  ring (finding 1.9).
- **Facing.** Each frame a figure's rotation about its vertical axis is set so that it faces the camera's ground
  position (finding 1.11).
- **Visibility.** A figure is in the scene whenever its site is not under the fog (`setProgress`), so it can be
  seen from a neighbouring site and on a walk.
- **Motion.** The whole figure bobs a few centimetres, and hops once when an objective is passed, the flare the
  beacon had (finding 1.8). Nothing else moves, and no figure leaves its place (finding 1.4).
- **The fog patches** are drawn with 12 segments in place of 20 (finding 1.5).
- **Dispose.** The figures' geometry is disposed with the scene, as the markers' is. Their material is the world's.

### Not changed

The server's rules, the store, the screen's panels and the director.

## Claim boundary (pre-run)

The figures are judged from screenshots in headless Chromium with software WebGL, by Claude. The owner has not seen
them, and nothing runs on an iPhone: the frame rate with seven more meshes is unmeasured there. The figures are
built from primitives in code at 160 triangles each. They are stand-ins a step above the beacons, not modelled or
animated characters.

## Deferred (pre-run)

- A mark in the scene that a site is cleared (the ring showed it; the top bar, the map and the site's card still do).
- Parts that move (a mouth, an arm), textured faces, lip movement while a character speaks.
- Figures for party members who travel with the player. Figures in the iPhone app.
- Props for the sites beyond what a figure brings (stalls, shelves).

## Tests (pre-run)

- **Figures** (`aesthetic`, Node, no WebGL): every name in `FIGURES` builds; at most 160 triangles; at most 2.2 m
  tall; within 0.9 m of the axis; on the ground or at its clearance; `focus` between 1.0 and 1.7 m and inside the
  figure's height; the same seed gives the same vertex data; an unknown name gives null.
- **Dungeon file** (`client`): every site names a figure `FIGURES` knows; the seven sites name seven different
  figures; a circle of each figure's radius around its site is clear of the wall plan.
- **Loader** (`server`): a `figure` that is not a lower-case word is refused.
- **Camera wiring** (`client`, the view mocked): unchanged, since the view's interface does not change.
- **Playthrough and pictures** (`client/scripts/dungeon-shots.mjs`, in a Slurm job): the seven-site run as it is,
  with a check per site that the figure is in the scene and shown, within the hold distance of its site (10.5 m at
  the start site, 4.5 m elsewhere), that its focus point is inside the free part of the screen at the first hold
  and after the resolve, and that it faces the camera within 25 degrees. One check that the level, the markers and
  the figures together are within the style's 64,000 triangles. A picture of each figure at 390×844 and 1440×900.
  Claude looks at every picture before the round closes and records what each shows.
- Every existing suite passes: root `npm test` (in a Slurm job) and `npm run build -w client`.

## Ship (pre-run)

The work is on the branch `round-122-figures`. The round ends with a merge to `main`, which deploys the client and
the server. The server changes by one optional content field.
