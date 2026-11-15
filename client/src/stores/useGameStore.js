// Round 115: the app's store, playing the bundled dungeon. gameStore.js itself imports no YAML, so the server's
// contract test loads it in plain Node. Round 119: with the bundled world map.
import { createGameStore } from './gameStore.js';
import { DUNGEON } from '../dungeon.js';
import { ATLAS } from '../atlas.js';

export const useGameStore = createGameStore({ dungeon: DUNGEON, atlas: ATLAS });
