// Round 119: the world map the web client shows above the dungeon. The content file is bundled at build time, as
// src/dungeon.js bundles the dungeon; the server does not load it.
import atlas from '../../content/world/atlas.yaml';
import { atlasView } from './dungeonModel.js';

export const ATLAS_FILE = atlas;
export const ATLAS = atlasView(atlas);
