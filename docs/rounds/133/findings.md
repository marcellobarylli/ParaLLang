# Round 132 findings

## Question

Can the world map gain a second place that looks like a burning temple (lava-rock floor, glowing and smouldering
ruins, charred bare trees, red light everywhere) while using only Ta Prohm's geometry and textures?

## Finding

Yes. The Kiln is a third level in `aesthetic/`, built by Ta Prohm's builder under an ember theme, and a second open
place on the web client's world map. It adds no texture and no model. It is playable: the same seven sites and
characters as Ta Prohm, with a run of its own. Nothing is deployed.

## Method

- The level builder takes a theme. The jungle theme builds Ta Prohm exactly as before (same triangle count, same
  vertex and colour data, checked by a hash before and after). The ember theme changes materials, colours and what
  stands in for leaves, grass and light shafts.
- The PS1 material gained three options, off by default: glow in the dark parts of a texture, a glow that fades
  with height, and rising ember quads. The shared uniforms gained a second, hotter glow colour, which equals the
  first unless a preset names one.
- The web client's store holds every bundled dungeon and plays one at a time. The world card lists each open place.
- The look was judged by Claude from screenshots in headless Chromium with software WebGL.

## Results

| What | Value |
|---|---|
| Textures added | 0 (the Kiln's materials use the 16 shared textures; a test checks every map) |
| Level triangles | The Kiln 62,654; Ta Prohm 62,408 (unchanged); the style's limit is 64,000 |
| In-game scene (level, markers, seven figures) | 63,938 triangles in The Kiln |
| Ta Prohm's stone, devata, thitpok and root-strand vertices | Identical in both levels (test) |
| Tests | aesthetic 55 pass (43 before), server 464 (463), client 209 (200); `npm run build -w client` succeeds |
| Playthrough (`client/scripts/kiln-shots.mjs`, 390×844 and 1440×900) | World map → The Kiln → The Ash Gate (answered) → walk → The Charred Buttress → reload (opens The Kiln) → world map → Ta Prohm (jungle level back, its own run untouched). No page error |

What the theme does, each from an existing asset:

| Asked for | How |
|---|---|
| Glowing lava rocks as the floor | The ground grid with the laterite texture, unlit and dark, hot patches in the vertex colours, and a glow in the texture's dark cracks. A moat of lava round the outer wall: the ground builder's water cells with the water texture, unlit and tinted orange, scrolling |
| Ruins glowing and smouldering | The stone, devata, laterite and face materials glow in their joints and grooves, strongest at the ground, pulsing as the strings do. Soot replaces moss. Light shafts become columns of lit smoke. Embers rise over the courts and the avenue |
| Charred black trees with no foliage | Trunks, fins, limbs and roots tinted to charcoal. Each canopy blob is replaced by three bare branches; bushes become burnt twigs. The roots' strands glow orange |
| Red glow everywhere | The preset `ember`: near-black red sky, red-brown fog from 14 m, a dim low sun behind the temple, and more ambient light from the ground than from the sky. Grass tufts are low flames |

## Decision

Kept as built. Claude's five decisions in the architecture stand until the owner says otherwise (see Open items).

## Evidence

- Level: [`kiln-face-gopura.png`](../../../aesthetic/docs/shots/kiln-face-gopura.png),
  [`kiln-gate-tree.png`](../../../aesthetic/docs/shots/kiln-gate-tree.png),
  [`kiln-wall-tree.png`](../../../aesthetic/docs/shots/kiln-wall-tree.png),
  [`kiln-moat.png`](../../../aesthetic/docs/shots/kiln-moat.png) (the package's demo, 960×600).
- In the game: [`01-world-map-phone.jpg`](shots/01-world-map-phone.jpg),
  [`02-kiln-map-desktop.jpg`](shots/02-kiln-map-desktop.jpg), [`03-ash-gate-desktop.jpg`](shots/03-ash-gate-desktop.jpg),
  [`04-walk-phone.jpg`](shots/04-walk-phone.jpg), [`05-charred-buttress-desktop.jpg`](shots/05-charred-buttress-desktop.jpg),
  [`07-ta-prohm-map-desktop.jpg`](shots/07-ta-prohm-map-desktop.jpg); the rest are in [`shots/`](shots/).
- Tests: `aesthetic/test/world.test.js` (the four Kiln tests), `server/test/dungeon.test.js` (the last test),
  `client/src/components/__tests__/place-switch.test.jsx`, `client/src/__tests__/dungeon-file.test.js`.

## Claim boundary

- The look was judged from screenshots by Claude. The owner has not seen it, and it has not run on a phone or on a
  real GPU. The frame rate is not measured; the triangle count is close to Ta Prohm's.
- The conversations in the playthrough are the test provider's stand-ins. No model was called.
- Not deployed. The work is on the branch `claude/loving-pascal-i1jq5j`.
- The iPhone app is unchanged. The mobile suite was not run: the round touches nothing it reads.

## Open items

For the owner:

1. **The name.** "The Kiln" is Claude's. It is in `content/world/atlas.yaml` and `content/world/dungeons/the_kiln.yaml`,
   with the seven site names (The Ash Gate, The Charred Buttress, The Ember Court, The Cinder Court, The Burnt
   Library, Before the Furnace, The Furnace).
2. **What the place holds.** It reuses Ta Prohm's seven characters and conversations unchanged. Whether it should
   have characters of its own, or ask more of the player (round 123: content above the player's level), is open.
3. **When it opens.** It is open from the start. A level or a cleared Ta Prohm could gate it.
4. **Deploy.** Merging to `main` deploys the client and the server. The server deploy is needed (the server must
   know the dungeon) and wipes the saves on the free plan. A page from before this round keeps working: it shows
   Ta Prohm only.
5. **The look.** Things to judge on a phone: whether the joints' glow is too regular (it follows the sandstone
   texture's block pattern), whether the characters read well in the red light, and whether the gold path ribbons
   on the map stand out enough against the lava floor.

Not done:

- Lava inside the courts, and any sound of fire.
- The Kiln in the iPhone app.
