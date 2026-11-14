import { createTempleWorld } from './scene/world.js';
import { createTaProhmWorld } from './scene/taprohm.js';

/** The levels, by id. Each factory returns the same world interface. */
export const WORLDS = {
  angkor: { label: 'Angkor Wat', create: createTempleWorld, defaultPreset: 'golden' },
  taprohm: { label: 'Ta Prohm', create: createTaProhmWorld, defaultPreset: 'jungle' },
};

export function createWorld(id = 'angkor', options = {}) {
  const entry = WORLDS[id];
  if (!entry) throw new Error(`Unknown world "${id}"`);
  return entry.create({ preset: entry.defaultPreset, ...options });
}
