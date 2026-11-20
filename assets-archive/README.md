# Asset archive

References to public-domain (CC0) 3D characters and environments for ParaLLang. The catalogue is `sources.yaml`.

## Rules

1. **CC0 only.** No CC-BY, no "free for non-commercial", no per-site custom licences. Sketchfab, OpenGameArt and
   Poly Pizza mix licences: check each item's page and record it in `items/` before use.
2. **Reference first, download on need.** `sources.yaml` links to the origin. Files we use are copied to static
   hosting (GitHub Pages next to `client/`, or a CDN), never into the Express server and never into the Docker image.
   The server stays unchanged; it never reads or serves a model.
3. **Record each adopted item** in `items/<id>.yaml`: source, URL, licence page URL, date checked, file, size, triangles.
4. **Verify before relying.** Entries start as `verified: search-only`. Change to `verified: primary` when someone has
   read the licence on the origin page (this session's sandbox could not reach those hosts).

## Fit with the renderer

- three.js 0.186.1 with a custom PS1 `ShaderMaterial` (`aesthetic/src/ps1/`), vertex snapping, affine UVs, 15-bit
  dither. The web client and the Expo app both run it.
- Current characters are code-built boxes (`aesthetic/src/scene/figures.js`), capped at 160 triangles each by
  `aesthetic/test/figures.test.js`. That cap came from the level's 62,408 of 64,000 triangles. **Imported characters
  are not held to it**: they keep their native geometry, and their triangles are counted in a character budget of
  their own, apart from the level's `maxTrianglesPerScene`.
- Texture reduction to 32-64 px nearest-filtered is a look option per item, not a requirement.
- What still limits them is the phone. Only the current encounter's character and the party are loaded at a time,
  and each item's record notes its triangle count so we can set a per-scene character ceiling by measuring on the
  device.
- Loading needs `GLTFLoader` (in three's `examples/jsm`), a vertex-colour or texture map fed into
  `createPS1Material`, and lazy loading per encounter so the first screen stays light.
- Rigged characters (Quaternius, KayKit) bring animation clips; the PS1 look suits low frame-rate stepping.

## Pipeline (not built yet)

`download -> gltf-transform (optional texture resize, meshopt compression; no decimation by default) -> assets-archive/items/ metadata -> static host`.
