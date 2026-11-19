// Round 115: the dungeon the web client plays. The content file is bundled at build time (the YAML transform in
// vite.config.js), so the attract and overview screens show the level, the route and the sites with no server.
// The run's progress and the characters' names come from the server.
// Round 133: there are two. DUNGEON is Ta Prohm, where a new player starts; DUNGEONS is every dungeon a place on the
// world map may open.
import taProhm from '../../content/world/dungeons/ta_prohm.yaml';
import theKiln from '../../content/world/dungeons/the_kiln.yaml';
import { toClientDungeon } from './dungeonModel.js';

export const DUNGEON = toClientDungeon(taProhm);
export const KILN = toClientDungeon(theKiln);
export const DUNGEONS = Object.freeze([DUNGEON, KILN]);
