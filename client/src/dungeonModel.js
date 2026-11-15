// Round 115: the client's shape of a dungeon. Pure, so the server's contract test builds the same object from the
// content file without Vite. A site's characterName comes later, from the server (GET /api/dungeons/:id).
// Round 119: the dungeon is a map: sites joined by paths, a start, a goal and the entrance.
export function toClientDungeon(file) {
  return Object.freeze({
    id: file.id,
    name: file.name,
    level: file.level,
    start: file.start,
    goal: file.goal,
    entrance: file.entrance.map((point) => [...point]),
    sites: file.sites.map((site) => Object.freeze({ id: site.id, encounterId: site.encounter, name: site.name, at: [...site.at], characterName: null })),
    paths: file.paths.map(({ between, via = [] }) => Object.freeze({ between: [...between], via: via.map((point) => [...point]) })),
  });
}

/** The ids of the sites a path joins to `siteId`, in the file's path order. */
export function neighbourIds(dungeon, siteId) {
  return dungeon.paths.flatMap(({ between: [a, b] }) => (a === siteId ? [b] : b === siteId ? [a] : []));
}

// What the map shows before the server has answered: the start site, and the sites a path leads to from it. The
// server's `progress.sites` replaces this (its rules are in server/src/dungeon.js).
export function unexploredSites(dungeon) {
  const known = new Set(neighbourIds(dungeon, dungeon.start));
  return Object.fromEntries(dungeon.sites.map((site) => [site.id, {
    state: site.id === dungeon.start ? 'current' : known.has(site.id) ? 'known' : 'hidden', cleared: false, reachable: false,
  }]));
}

// Round 119: the world map (content/world/atlas.yaml) in the client's shape, with its fog. The start is the current
// place, a place joined to it is known, and the rest are hidden and left out, with the paths to them.
export function atlasView(file) {
  const joined = new Set(file.paths.flatMap(([a, b]) => (a === file.start ? [b] : b === file.start ? [a] : [])));
  const places = file.places.filter((place) => place.id === file.start || joined.has(place.id)).map((place) => Object.freeze({
    id: place.id, name: place.name, state: place.id === file.start ? 'current' : 'known', map: { ...place.map },
    description: String(place.description ?? '').trim(), dungeonId: place.dungeon ?? null, closed: place.dungeon ? null : (place.closed ?? 'Closed.'),
  }));
  const shown = new Set(places.map((place) => place.id));
  return Object.freeze({ start: file.start, places, paths: file.paths.filter(([a, b]) => shown.has(a) && shown.has(b)).map(([a, b]) => [a, b]) });
}
