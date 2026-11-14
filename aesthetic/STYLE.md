# ParaLLang PS1 style guide

The look, stated as rules a port to any engine can follow. `src/style.js` exports the same numbers as
`PS1_STYLE`; `docs/shots/` holds the reference renders to match.

Hardware facts below are from the psx-spx PlayStation hardware reference (`github.com/psx-spx/psx-spx.github.io`,
read at commit `6d7d1bc`): the GPU chapter (`docs/graphicsprocessingunitgpu.md`) and, for lighting and depth cueing,
the GTE chapter (`docs/geometrytransformationenginegte.md`: light source matrix, `NCS`/`NCT` normal colour and
`DPCS`/`NCDS` depth-cue commands, which work per vector).

## 1. Rendering rules

| Rule | What we do | PS1 hardware (psx-spx) |
|---|---|---|
| Resolution | Render at 240 lines on the short side (320x240 at 4:3; 240x519 on an iPhone in portrait), upscale with nearest filtering. 480 lines is the "hi-res" option | Horizontal 256, 320, 368, 512 or 640; vertical 240, or 480 interlaced |
| Colour depth | Quantise to 5 bits per channel (15-bit) after rendering | Framebuffer drawing is 15-bit; 24-bit is a display mode for images |
| Dither | Add the 4x4 table below to 8-bit colour, saturate, divide by 8 | Same table and method: "added to the 8bit R/G/B values, the result is saturated to +00h..+FFh, and then divided by 8" |
| Vertex snapping | Snap clip-space x and y to the internal pixel grid, so vertices jump pixel to pixel | Vertices reach the GPU as integer X,Y (signed, -1024..+1023); no sub-pixel precision |
| Texture mapping | Affine: UVs interpolate linearly in screen space, so large polygons warp | "The PSX doesn't support perspective correct rendering" |
| Shading | Gouraud, per vertex: one sun plus a sky/ground ambient. Vertex colours carry grime, moss and per-face variation | Gouraud-shaded polygons; lighting computed per vertex on the GTE |
| Fog | Linear depth cueing per vertex towards the fog colour | Depth cueing done per vertex on the GTE |
| Textures | 32 or 64 px, power of two, nearest filtering, no mipmaps, tiling | 4-bit or 8-bit palettised or 15-bit direct textures, in pages of up to 256x256 |
| Transparency | Cut-out only (alpha test 0.5) for leaves and grass; blending only for water and the sun halo | Semi-transparency modes and a mask bit, no alpha channel |

Dither table (offsets in 8-bit units, rows are scanlines):

```
-4  +0  -3  +1
+2  -2  +3  -1
-3  +1  -4  +0
+3  -1  +2  -2
```

**Deliberate deviations.** The hardware dithers only Gouraud-shaded or modulated polygons; we dither the whole frame
in a post pass, which looks the same on a lit scene and is one shader in any engine. The PS1 had no depth buffer
("it's NOT buffering Depth values") and games sorted polygons, which made faces pop through each other; we keep a
depth buffer, because that artefact reads as a bug, not as style. Our 64 px texture limit is an art choice, smaller
than the hardware's 256x256 pages, to keep the texel density chunky on modern screens.

## 2. Art direction

- **Polygon budget.** At most 64k triangles for a whole outdoor scene, not counting the mirrored reflection. Round
  things get 5 to 8 sides; towers are 8-sided lathes; canopies are displaced icosahedra with flat normals.
- **Texel density.** 16 texels per world unit on stone (64 px over 4 units), 8 on the ground. Box-map stone in
  world space so blocks line up across buildings.
- **Vertex colour does the detail.** Grime darkens the bottom 3 to 4 units of every structure, moss creeps over
  upward faces and low stone, each triangle varies in brightness by about 5%. Textures stay generic and tile.
- **Fog hides the edge of the world.** The sky's horizon colour equals the fog colour in every preset, so distant
  geometry fades into the sky with no seam. Fog far is 165 to 250 units.
- **Reflections are mirrored geometry** under translucent water (opacity 0.5), as PS1 games did it. The sky dome is
  mirrored below the horizon so the water reflects it too.
- **Everything is generated from a seed.** Textures, layout and vegetation are code, not assets: the same seed gives
  the same world on web, iOS and in tests.

## 3. The dead branch: Angkor Wat

From the lore (`parallang.md`): a dead branch of the language tree, "Angkor wat with roots growing amongst the temple
ruins. The roots represent the strings pulling the worlds together, now strangling the land", with original languages
"inscribed in stone" and mushrooms that grow on the dead realities' roots.

| Element | How it is built |
|---|---|
| Temple | Three stepped tiers on moulded platforms; galleries with a rosette-relief inner wall, an outer colonnade and gabled tile roofs; corner and entrance pavilions with stacked pediments; steep stairs; the quincunx of five lotus-bud prangs (corners 11 units, centre 16.5) |
| Approach | Avenue, naga causeway over the moat with seven-headed hood ends, guardian lions, the gopura with a collapsed central tower, two libraries, two reflecting pools, the terrace of honour |
| Ruins | A Ta Prohm-style shrine with a broken tower and a fig growing out of it; figs whose roots pour over the enclosure wall; fallen blocks |
| The strings | Every root carries a thin strand that glows violet (`#c08cff`) with the corruption level, pulsing slowly |
| The language | Inscribed steles and door jambs carry an invented, rounded script (head stroke over a looped body). Its grooves glow with corruption. It is not a real script |
| Mushrooms | Orange caps where roots meet the ground |
| Vegetation | Leaning coconut palms with V-folded, alpha-cut fronds that sway; tall jungle trees beyond the moat; grass tufts; lily pads and lotus on the moat |

## 4. Palette

Display-space sRGB; the pipeline does no linear conversion and no tone mapping (`src/palette.js`).

| Token | Hex | Use |
|---|---|---|
| sandstone | `#b29b74` | Walls, towers |
| sandstoneLight | `#cbb68c` | Inscription panels, highlights |
| laterite | `#85573f` | Plinths, enclosure wall, banks |
| roof | `#857761` | Gallery and pavilion roofs |
| moss | `#566a35` | Vertex-colour moss |
| grass | `#62803a` | Ground |
| leaf / leafDark / leafLight | `#4b7a2f` / `#2c4a24` / `#86a845` | Foliage |
| palmTrunk | `#7b6649` | Palm trunks |
| root | `#6b5642` | Fig roots |
| water | `#2f5552` | Moat and pools |
| stringGlow | `#c08cff` | Corruption |

## 5. Times of day

| Preset | Sun | Fog | Corruption | Mood |
|---|---|---|---|---|
| `golden` | Low from the west, on the facade | `#e6bf8c`, 45–235 | 0 | The default: warm, readable |
| `dawn` | Rising behind the temple | `#cf8f78`, 35–210 | 0 | Silhouetted towers, pink sky |
| `day` | High | `#c5d6d4`, 55–250 | 0 | Hazy midday |
| `corrupted` | Pale violet | `#58446a`, 22–165 | 1 | The dead branch at full corruption |

## 6. Porting checklist

1. Render the 3D scene into a target 240 lines high; upscale with nearest filtering.
2. Vertex shader: snap clip-space xy to the target's pixel grid; output uv·w and w for affine mapping; compute
   lighting and fog per vertex; mirror the normal's y for negatively scaled (reflected) objects.
3. Fragment shader: divide (uv·w)/w for affine UVs; texture × vertex colour; corruption glow; mix in fog.
4. Post pass: add the dither table, saturate, quantise to 5 bits.
5. Textures nearest-filtered without mipmaps; alpha test 0.5 for foliage.
6. Compare against `docs/shots/` with the same camera views (`scripts/screenshots.cjs` lists them).
