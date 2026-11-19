# Round 133 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-19 by the owner's instruction in a Claude
Code cloud session, not through the round pipeline. Sections marked *pre-run* must not be edited after the commit
that holds them. Changes go into dated Amendments; results go into the dated Outcome section, added later. The full
record (the owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** the owner's instruction ([`trail/interview.md`](trail/interview.md)); round 119's
  [architecture](../119/architecture.md) (the world map and the dungeon map); `aesthetic/STYLE.md` (the PS1 rules);
  round 123's logged constraint (reuse the assets, avoid building new places).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `aesthetic/src/` (the level and the shader), `content/world/dungeons/the_kiln.yaml`,
  `content/world/atlas.yaml`, `server/src/content-loader.js`, `client/src/` (store, level view, world card), the
  tests and `docs/rounds/133/shots/`.

## Goal (pre-run)

The world map gains a second place the player can enter: Ta Prohm's plan again, burnt. The floor is glowing lava
rock, the ruins glow and smoulder, the trees are charred and bare, and red light is everywhere. It is built from
Ta Prohm's geometry and textures, with no new texture and no new model.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md) (Q0):

- A new zone on the world map that reuses the Ta Prohm assets and textures.
- The look: glowing lava rocks as the floor, temple ruins glowing and smouldering, charred black trees with no
  foliage, "make the red glow everywhere".

Claude's decisions (the owner was not asked; each is listed in the findings' open items):

- **Decision 1: the name is The Kiln.** The owner named the inspiration, not the place. The name is ours, in the
  manner of The Bone Dome, and is one line in two content files.
- **Decision 2: the zone is a playable dungeon with Ta Prohm's seven sites and encounters.** A place on the world
  map that cannot be entered would show nothing of the look in the game. New characters and vocabulary were not
  asked for, and round 123 logs the owner's wish to reuse what exists and to go through the places more than once.
  The Kiln therefore has the same site graph, the same characters and the same seals as Ta Prohm, under its own
  site names. Its run is separate from Ta Prohm's; experience, the Spellbook and the party are shared, as they are
  across runs.
- **Decision 3: nothing else differs.** The characters do not speak more of the target language there and no site
  asks for a higher level. What the second place should ask of the player is round 123's open question.
- **Decision 4: The Kiln is open from the start,** joined to Ta Prohm on the world map, so that the owner can walk
  into it at once.
- **Decision 5: the place the player last entered is remembered in the browser,** not on the server. The server
  already keeps one run per dungeon; where the player is in the world is one key in local storage.

## Design (pre-run)

### The level (`aesthetic/`)

- **One builder, two themes.** `createTaProhmWorld` becomes a call of the level's builder with the jungle theme.
  `createKilnWorld` calls the same builder with the ember theme. The level id is `kiln`
  (`WORLDS.kiln`, default preset `ember`). Ta Prohm must build exactly as before: same triangle count, same vertices.
- **Same plan.** Rings, gates, towers, the library, the outer wall, the giants, the heights and `isClear` are
  Ta Prohm's. The random sequence is consumed in the same order, so the collapsed bays and the roots fall where
  they do in Ta Prohm. The dungeon's sites and paths are therefore valid in both.
- **Stone.** The same sandstone, devata, laterite and face textures, with vertex colours darkened to soot (the
  moss colour of the builder becomes a soot colour for this level). The stone materials glow where the texture is
  dark (joints and carved grooves), strongest at the ground and fading with height.
- **Floor.** The ground keeps its grid and one of the existing textures, darkened to rock, with hot patches in the
  vertex colours and the same glow in its dark parts. A moat of lava lies between the outer wall and the edge of
  the fine grid, made with the ground builder's water cells and the existing water texture, unlit and tinted.
- **Trees.** Trunks, buttress fins, limbs and roots keep their geometry and textures and are tinted to charcoal.
  Every canopy blob is replaced by a few bare branches. Bushes become burnt twigs. The roots' glowing strands stay
  and take the level's glow colour.
- **Small things.** Grass tufts become low flames (the same cut-out texture, unlit and tinted). The light shafts
  become columns of lit smoke. Embers rise over the courts if the triangle budget and the shader allow it simply.
- **Light.** A new preset `ember`: a near-black red sky, red-brown fog that starts close, a dim low sun, and more
  ambient light from the ground than from the sky, so that every underside is lit orange. The preset names the
  glow colour; the other presets keep the strings' violet.
- **Shader.** The PS1 material gains three options: glow where the texture is dark, a glow that fades with height,
  and a second, hotter glow colour for the brightest parts. With the options off the shader's output is unchanged.
- The PS1 rules hold: no new texture, textures stay 64 px, the scene stays under 64,000 triangles, Gouraud
  lighting, per-vertex fog whose colour is the sky's horizon.

### Content and server

- `content/world/dungeons/the_kiln.yaml`: `level: kiln`, Ta Prohm's sites, encounters, figures, paths, seals and
  entrance, with site names of its own.
- `content/world/atlas.yaml`: a place `the_kiln` with `dungeon: the_kiln`, joined to Ta Prohm.
- `server/src/content-loader.js`: `kiln` joins the known levels. No other server change is planned: the save
  already holds a run per dungeon.

### Client

- `src/dungeon.js` bundles both dungeon files. The store takes the list, holds the dungeon the player is in, and
  `enterPlace` switches to the place's dungeon: older replies are dropped, the run of the new dungeon is read, and
  the place is written to local storage. A reload opens the place last entered.
- The world card lists each open place with its own count of cleared sites and its own Enter button.
- The level view knows the level `kiln` (Ta Prohm's heights and box) and is rebuilt when the dungeon changes.

## Claim boundary (pre-run)

The look is judged by Claude from screenshots taken in headless Chromium (software WebGL), not by the owner and not
on a phone. The Kiln's conversations are not played against the live model: they are Ta Prohm's encounters.
Nothing is deployed in this round. A server deploy is needed for The Kiln to open (the server must know the dungeon),
and on the free plan it wipes the saves; that is the owner's call.

## Deferred (pre-run)

- What The Kiln asks of the player that Ta Prohm does not (round 123: content above the player's level).
- Characters and encounters of its own.
- Lava inside the courts, and sound.
- The dungeon in the iPhone app.

## Tests (pre-run)

- **Level** (`aesthetic/test/world.test.js`): the suite that runs over every level runs over `kiln` (budget,
  determinism, PS1 materials, VRAM rules, presets). Ta Prohm's triangle count and first vertices are unchanged by
  the theme work. The Kiln has no leaves, has lava, and uses only textures Ta Prohm has.
- **Content** (`server`): the loader accepts the new file and level; the two dungeons keep separate runs.
- **Dungeon file** (`client`): The Kiln's sites and paths pass the same wall-plan checks as Ta Prohm's.
- **World file** (`client`): The Kiln is a known, open place.
- **Store** (`client`): entering another place switches the dungeon, reads its run, drops replies of the place
  left, and a new store opens the place last entered.
- **Screen** (`client`): the world card shows two open places, each with its count and button.
- **Pictures:** the level in the package's demo and the place in the built client, in headless Chromium.
- Every existing suite passes: server, client, aesthetic; `npm run build -w client`.

## Amendment 2026-11-19: what the build settled (Claude, during the build)

Each item is a detail inside the design above, or a limit the build met.

- **Bare branches are straight and three to a canopy blob.** Curved branches, five to a blob, put the level at
  75,828 triangles. Three straight spikes of six triangles each give 62,654, which leaves room for the game's
  markers and figures under the 64,000 limit (63,938 in the game).
- **The fine glow dims with the fog.** From the air the glowing cracks of a minified texture sparkled. The
  dark-part glow is multiplied by 1 − 0.8 × the vertex's fog.
- **The floor is unlit and uses the laterite texture.** Its colour comes from the vertex colours alone, so the hot
  patches do not depend on the sun.
- **The characters' material is tinted** (`plain`, ×1.1, 1.5, 2.0). Under the orange light a figure was a dark
  shape; with green and blue lifted it keeps some of its own colours.
- **Embers are in.** The vertex shader lifts each quad through 16 m and starts it again; the quad's phase is carried
  in the direction of its normal, which an unlit material does not otherwise use.
- **The store's state gained `enterable` and `runs`.** The world card shows an Enter button only for a place whose
  dungeon the store holds, and each open place's count once its run has been read.
- **The level view gets a new canvas per dungeon.** A disposed view gives up its WebGL context, so the canvas
  element is keyed by the dungeon.
- **The server change is one line** (the known levels), as planned, plus a test.

## Outcome (2026-11-19)

Built as designed, with the Amendment above. The world map has a second open place, The Kiln: Ta Prohm's plan under
an ember theme, with no new texture and no new model, playable with Ta Prohm's seven sites and characters and a run
of its own. Ta Prohm builds exactly as before. Suites: aesthetic 55, server 464, client 209, all passing; the built
client was played into The Kiln and back in headless Chromium at 390×844 and 1440×900. The claim boundary held: the
look was judged from screenshots by Claude, no model was called, and nothing is deployed. See
[`findings.md`](findings.md) and [`shots/`](shots/).
