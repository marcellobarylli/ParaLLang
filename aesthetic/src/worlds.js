import { createTempleWorld } from './scene/world.js';
import { createKilnWorld, createTaProhmWorld } from './scene/taprohm.js';
import { createMicromortWorld } from './scene/micromort.js';

/** The levels, by id. Each factory returns the same world interface. */
export const WORLDS = {
  angkor: { label: 'Angkor Wat', create: createTempleWorld, defaultPreset: 'golden' },
  taprohm: { label: 'Ta Prohm', create: createTaProhmWorld, defaultPreset: 'jungle' },
  // Round 133: Ta Prohm's plan, burnt. The same layout, heights and clear ground as `taprohm`.
  kiln: { label: 'The Kiln', create: createKilnWorld, defaultPreset: 'ember' },
  micromort: { label: 'Micromort Mountain', create: createMicromortWorld, defaultPreset: 'alpine' },
};

export function createWorld(id = 'angkor', options = {}) {
  const entry = WORLDS[id];
  if (!entry) throw new Error(`Unknown world "${id}"`);
  return entry.create({ preset: entry.defaultPreset, ...options });
}
