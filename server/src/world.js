import { conflictError, validationError } from './errors.js';

// World progress lives in the learner save (schema version 2). These functions are pure: they read the loaded
// world content and a save's `world` record and never write.

export function emptyWorldProgress() {
  return { currentLocationId: null, visitedLocationIds: [], completedEncounterIds: [] };
}

// A missing or unknown current location (a fresh save, or content that has since changed) means the start.
export function currentLocationId(world, progress) {
  return world.locationsById.has(progress?.currentLocationId) ? progress.currentLocationId : world.start;
}

function visitedSet(world, progress) {
  const visited = new Set((progress?.visitedLocationIds ?? []).filter((id) => world.locationsById.has(id)));
  visited.add(currentLocationId(world, progress));
  return visited;
}

export function worldSnapshot(world, progress, encounters = new Map()) {
  const current = currentLocationId(world, progress);
  const visited = visitedSet(world, progress);
  const completed = new Set(progress?.completedEncounterIds ?? []);
  const known = new Set([...visited].flatMap((id) => world.neighbours.get(id)));
  const visible = (id) => visited.has(id) || known.has(id);

  const locations = world.locations.filter((location) => visible(location.id)).map((location) => {
    const state = location.id === current ? 'current' : visited.has(location.id) ? 'visited' : 'known';
    const base = {
      id: location.id,
      name: location.name,
      state,
      map: location.map,
      adjacent: world.neighbours.get(current).includes(location.id),
    };
    if (state === 'known') return base;
    return {
      ...base,
      description: location.description,
      vocabularyFocus: location.vocabulary_focus,
      encounter: location.encounter ? {
        id: location.encounter,
        completed: completed.has(location.encounter),
        characterName: encounters.get(location.encounter)?.character.name ?? null,
      } : null,
    };
  });
  return {
    currentLocationId: current,
    locations,
    paths: world.paths.filter(([a, b]) => visible(a) && visible(b)).map(([a, b]) => [a, b]),
  };
}

// Returns `{ progress, changed }` after moving to `locationId`, or throws. A move to the current location changes nothing.
export function applyMove(world, progress, locationId) {
  if (typeof locationId !== 'string' || !world.locationsById.has(locationId)) {
    throw validationError('Unknown location.');
  }
  const current = currentLocationId(world, progress);
  const base = { ...emptyWorldProgress(), ...progress };
  if (locationId === current) return { progress: { ...base, currentLocationId: current }, changed: false };
  if (!world.neighbours.get(current).includes(locationId)) {
    throw conflictError(`You can't get to ${world.locationsById.get(locationId).name} from here.`, 'NOT_ADJACENT');
  }
  const visited = [...visitedSet(world, progress)];
  if (!visited.includes(locationId)) visited.push(locationId);
  return { progress: { ...base, currentLocationId: locationId, visitedLocationIds: visited }, changed: true };
}
