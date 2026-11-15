# Round 122 plan, draft 1: characters at the sites

For a Codex critique before the build. The repository is ParaLLang, with rounds 119 to 121 merged (the dungeon's
map, the party, levels). Read `docs/handoff.md` ("Working on the dungeon") and `aesthetic/README.md`.

## Goal

Each of the seven sites of the Ta Prohm dungeon shows its character as a 3D figure in the level's PS1 look, in
place of the placeholder beacon (a crystal, a ring and a shaft of light).

## Owner decisions

- Round 119, Q5: "Once you are done, can start replacing the placeholder 3D encounters with real characters. Run
  autonomously as I will be away, go with most reasonable assumption".
- Round 115 deferred "Encounter assets at the sites (characters, props)"; the beacons were stand-ins.

Everything else is Claude's: what each figure looks like, how it is built, and how it behaves.

## What exists

- `client/src/scene/levelView.js` builds a beacon per site (`beacon()`): a gold octahedron, a ring on the ground and
  an additive shaft, in three.js basic materials. A beacon shows only while the camera is at its site (the
  director's approach or walk to it). A resolved site lifts the crystal away and turns the ring green; a passed
  objective makes the crystal flare.
- `@parallang/aesthetic` holds the look. Its levels are built with `MeshBuilder` (geometry per material key, merged
  into one mesh per material, vertex colours painted in) and PS1 materials (`createMaterials`: `plain` is the
  vertex-coloured one, lit, fogged, jittered and affine-mapped like the level). A world exposes `materials`.
  `ruins.js` has a lion statue made of five boxes.
- The package's tests keep a triangle budget per level and check determinism from the seed.
- The character sheets (`content/characters/enemies/*.yaml`) describe each character's appearance:
  Portia, a stone archway with a half-translated sign, glowing threads in her cracks and mortar that moves like a
  mouth; Gerald, a foot-tall imp the colour of over-roasted beans in a tiny barista apron with an espresso cup;
  Mortimer, a broad man in a striped apron with a hat that is also a ham, and scales in a shrine; Flick, a
  gnome-like creature no taller than a teacup, made mostly of movement, trailing sparks; Marginalia, a bookworm the
  size of a sofa with half-moon spectacles and a pencil; Bambieshart, a tall, stooped traveller in a faded brocade
  coat under a signpost; Errata, a tear in the air shaped roughly like a person, with letters drifting off it.

## Design

### Figures (`aesthetic/src/scene/figures.js`, new)

- `FIGURES`: a table from a figure's name to its builder. Seven names: `archway`, `imp`, `charcutier`, `letharger`,
  `bookworm`, `wanderer`, `erratum`.
- `createFigure(name, materials, { seed })` returns `{ group, height, update(dt, state) }`, or null for an unknown
  name. The group's origin is the ground point of the site and the figure faces +z. It is built with a
  `MeshBuilder` from boxes, tapered tubes, lathes and cones into the `plain` material (vertex colours), plus
  `inscription` or `rootGlow` where the sheet calls for glow (Portia's threads, Errata). No texture is added.
- Each figure is under 400 triangles. Figures are not part of a level's world, so the levels' budgets and their
  determinism tests are untouched; a new test builds every figure and checks its triangle count, that it stands on
  the ground (lowest vertex at y between 0 and 0.05), its height, and that two builds from one seed are equal.
- What each shows (from its sheet):
  - **archway** (Portia, about 2.6 m): two stone piers and a lintel with a keystone, a mouth of dark mortar between
    two stones, two glowing threads in cracks, a small sign hung askew.
  - **imp** (Gerald, 0.35 m, standing on a coffee cart about 1.1 m high so he is near eye level): a dark brown imp
    with horns and ears, a pale apron, a white cup in one hand; the cart is a box with two wheels and an awning
    pole.
  - **charcutier** (Mortimer, about 1.9 m): a broad figure with a striped apron (bands of vertex colour), thick
    arms, a ham for a hat, a cleaver; beside him a small plinth with scales.
  - **letharger** (Flick, 0.2 m, on the rim of a cracked stone basin about 0.9 m high): a tiny gnome with a pointed
    cap in mid-step, three small bright sparks around it.
  - **bookworm** (Marginalia, about 1.3 m high and 2 m long): a fat segmented worm rising from a heap of books,
    half-moon spectacles, a pencil; one book held closed.
  - **wanderer** (Bambieshart, about 2 m, stooped): a tall thin figure in a long faded coat with a pattern of
    bands, a drooping face, a staff, and a signpost with one arm beside him.
  - **erratum** (Errata, about 2.2 m, floating 0.3 m off the ground): a rough person shape made of offset slabs
    that do not quite line up, with a bright seam down the middle and a dozen small tiles (the letters) around it.
- Motion, in `update(dt, state)`, small and cheap (transforms of sub-groups, no geometry rebuilt):
  an idle sway or breath for every figure; Flick hops along the rim; Errata's slabs drift apart and back and its
  tiles circle; `state.flare` (a passed objective) makes the figure nod or hop once; `state.cleared` makes it step
  aside (the group shifts 0.8 m to its right and turns a quarter away), which is "lets you pass".

### Content

A dungeon site may name its figure: `figure: archway`. `ta_prohm.yaml` names the seven. The loader's site schema
gains the optional `figure` (a lower-case word); the client's dungeon model carries it. The server does not check
the name against the package (it does not import three.js), and the client's dungeon-file test does.

### Level view (`client/src/scene/levelView.js`)

- For each site with a figure the view builds it from `world.materials` and adds it to the markers group at the
  site's ground point. A site without one keeps the beacon's crystal and shaft.
- **Facing.** Each frame a figure turns about its vertical axis to face the camera's ground position, eased, so it
  looks at the player from whichever path the camera came.
- **Visibility.** A figure is in the scene whenever its site is not under the fog (`setProgress`), so it can be
  seen from a neighbouring site and on the walk. On the temple map and the orbit it is shown too; it is small
  there. The fog patch already covers a hidden site.
- **The ring** on the ground stays as the site's mark while the camera is at the site, and still turns green when
  the site is resolved. The crystal and the shaft go for sites with a figure.
- **The conversation.** `setEncounter` passes the flare (a pass) and the resolve to the figure at the camera's site.
  A site that is already cleared when the camera arrives shows its figure stepped aside.
- **The camera's look-at height.** The director looks at a site 1.35 m above the ground. That stays; the figures are
  built so that their faces are near that height (the imp's cart, the basin's rim).

### Not changed

The server, the store, the screen's panels and the director.

## Tests

- **Figures** (`aesthetic`, Node, no WebGL): every name in `FIGURES` builds; triangle count under 400; stands on
  the ground; height within its stated range; the same seed gives the same vertex data; `update` moves nothing
  outside a 3 m box around the origin and returns the cleared figure to its place when `cleared` is false again.
- **Dungeon file** (`client`): every site's `figure` is a name `FIGURES` knows; the seven sites name seven
  different figures.
- **Loader** (`server`): a `figure` that is not a lower-case word is refused.
- **Camera wiring** (`client`, the view mocked): unchanged, since the view's interface does not change.
- **Playthrough and pictures** (`client/scripts/dungeon-shots.mjs`, in a Slurm job): the seven-site run as it is,
  with a check per site that the figure is in the scene, within 6 m of the camera, inside the view, and facing the
  camera (its forward axis within 25 degrees of the direction to the camera). A picture of each figure at 390×844
  and 1440×900. Claude looks at every picture before the round closes and records what each shows.
- Every existing suite passes.

## Claim boundary

The figures are judged from screenshots in headless Chromium with software WebGL, by Claude. The owner has not seen
them, and nothing runs on an iPhone: frame rate with seven more meshes is unmeasured there. The figures are built
from primitives in code; they are stand-ins a step above the beacons, not modelled or animated characters.

## Deferred

- Figures for party members who travel with the player. Figures in the iPhone app.
- Textured faces, skeletal animation, lip movement while a character speaks.
- Props for the sites beyond what a figure brings (stalls, shelves).

## Ship

The work is on the branch `round-122-figures`. The round ends with a merge to `main`. Only the client changes in
behaviour; the server changes by one optional content field.
