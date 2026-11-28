// Round 115: the dungeon the web client plays. The content file is bundled at build time (the YAML transform in
// vite.config.js), so the attract and overview screens show the level, the route and the sites with no server.
// The run's progress and the characters' names come from the server.
// Round 133: there are two. DUNGEON is Ta Prohm, where a new player starts; DUNGEONS is every dungeon a place on the
// world map may open.
import taProhm from '../../content/world/dungeons/ta_prohm.yaml';
import theKiln from '../../content/world/dungeons/the_kiln.yaml';
import { toClientDungeon } from './dungeonModel.js';

import micromortMountain from '../../content/world/dungeons/micromort_mountain.yaml';
// Round 218: Angkor Wat, where the gate that ends a level stands. No place of the world map opens it yet.
import angkorWat from '../../content/world/dungeons/angkor_wat.yaml';

export const DUNGEON = toClientDungeon(taProhm);
export const KILN = toClientDungeon(theKiln);
export const MICROMORT_MOUNTAIN = toClientDungeon(micromortMountain);
export const ANGKOR_WAT = toClientDungeon(angkorWat);
export const DUNGEONS = Object.freeze([DUNGEON, KILN, MICROMORT_MOUNTAIN]);
// Round 218: the dungeons only the road's gates are played in (no place of the world map opens them).
export const GATE_DUNGEONS = Object.freeze([ANGKOR_WAT]);
