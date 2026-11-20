# Encounter assets

Rigged CC0 characters for encounters. One folder per pack: `humanoids/`, `creatures/`, `animations/`
(clip libraries that retarget onto a character rig). Each pack folder holds a `pack.yaml` and, once downloaded,
the model files. Catalogue and licence notes: [`assets-archive/sources.yaml`](../../assets-archive/sources.yaml).

**Status: every pack is `pending`. No model files are here yet.** The build sandbox could not reach the asset hosts.

Rules:
- Download only after `licence_checked` is true. Put the pack's `license` file next to the models.
- Prefer glTF/GLB. FBX/OBJ/Blend-only packs need converting (Blender or `gltf-transform`/FBX2glTF).
- The Dockerfile copies named folders only, so this folder stays out of the server image. Serve models from
  static hosting, not Express. Large binaries: use Git LFS or external hosting, listed in `pack.yaml`.
- Excluded: Polygonal Mind 100Avatars (see `assets-archive/sources.yaml`: CC-BY 4.0, not CC0).
