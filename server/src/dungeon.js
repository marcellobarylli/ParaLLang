// Round 119: a dungeon is a map. These functions are pure, as world.js is for the market: they read a loaded dungeon
// (content/world/dungeons/) and a run, and never write.
//
// A run is { run, at, cleared, visited }: its number, the site the player stands at, and the ids of the sites
// cleared and visited, each in the file's site order.
//
//   fog      a site is `current` (at), `visited`, `known` (joined by a path to a visited site) or `hidden`
//   seal     a site with `requires` is sealed until every site it lists is cleared, and one with `requires_level`
//            (round 121) until the player has that level
//   pass     a move from `at` to a site is allowed when a path joins them or the site is visited (round 134), the site is not sealed, and either `at` is
//            cleared or the site is visited: a character lets the player pass once answered, and the way back is open
//   complete the run is complete when `goal` is cleared; a complete run is open everywhere

const siteIds = (dungeon) => dungeon.sites.map((site) => site.id);
export const siteOf = (dungeon, siteId) => dungeon.sites.find((site) => site.id === siteId) ?? null;

export function neighboursOf(dungeon, siteId) {
  return dungeon.paths.flatMap(({ between: [a, b] }) => (a === siteId ? [b] : b === siteId ? [a] : []));
}

export function freshRun(dungeon, run = 1) {
  return { run, at: dungeon.start, cleared: [], visited: [dungeon.start] };
}

// A run as the save holds it, made whole. A save from rounds 114 to 118 holds { run, cleared: [encounterId] }: an
// entry counts for the site whose id or whose encounter it equals. Unknown ids are dropped (content has changed).
export function readRun(dungeon, stored) {
  if (!stored) return freshRun(dungeon);
  const ids = siteIds(dungeon);
  const clearedStored = new Set(stored.cleared ?? []);
  const cleared = dungeon.sites.filter((site) => clearedStored.has(site.id) || clearedStored.has(site.encounter)).map((site) => site.id);
  const at = ids.includes(stored.at) ? stored.at : dungeon.start;
  const visitedStored = new Set([...(stored.visited ?? []), ...cleared, at, dungeon.start]);
  return { run: stored.run, at, cleared, visited: ids.filter((id) => visitedStored.has(id)) };
}

export const isComplete = (dungeon, run) => run.cleared.includes(dungeon.goal);

// A sealed site's gate: how many of the sites it requires are cleared and, for a site that asks for a level (round
// 121), that level and the player's. Sealed until both are met. Null for a site that asks for neither.
export function gateFor(site, run, level = 1) {
  const required = site.requires ?? [];
  const needs = site.requires_level ?? null;
  if (!required.length && needs === null) return null;
  const completed = required.filter((id) => run.cleared.includes(id)).length;
  return {
    sealed: completed < required.length || (needs !== null && level < needs),
    required: required.length, completed,
    ...(needs !== null ? { level: { required: needs, current: level } } : {}),
  };
}

// Why a move to `siteId` is refused now: 'UNKNOWN_SITE', 'NOT_ADJACENT', 'SEALED' or 'BLOCKED'. Null when it is allowed
// (a move to `at` is allowed and changes nothing). `level` is the player's (round 121).
export function moveProblem(dungeon, run, siteId, level = 1) {
  const site = typeof siteId === 'string' ? siteOf(dungeon, siteId) : null;
  if (!site) return 'UNKNOWN_SITE';
  if (siteId === run.at) return null;
  // Round 134: any two discovered (visited) sites are joined, as well as neighbours: the player walks the way between.
  if (!neighboursOf(dungeon, run.at).includes(siteId) && !run.visited.includes(siteId)) return 'NOT_ADJACENT';
  if (isComplete(dungeon, run)) return null;
  if (gateFor(site, run, level)?.sealed) return 'SEALED';
  if (!run.cleared.includes(run.at) && !run.visited.includes(siteId)) return 'BLOCKED';
  return null;
}

// The run after a move that moveProblem allows.
export function moved(dungeon, run, siteId) {
  if (siteId === run.at) return run;
  const visited = new Set([...run.visited, siteId]);
  return { ...run, at: siteId, visited: siteIds(dungeon).filter((id) => visited.has(id)) };
}

// The run after the encounter at `siteId` resolved.
export function cleared(dungeon, run, siteId) {
  if (!siteOf(dungeon, siteId) || run.cleared.includes(siteId)) return run;
  const done = new Set([...run.cleared, siteId]);
  const visited = new Set([...run.visited, siteId]);
  const ids = siteIds(dungeon);
  return { ...run, cleared: ids.filter((id) => done.has(id)), visited: ids.filter((id) => visited.has(id)) };
}

// What the map shows of each site, by id. In a complete run no gate is sealed, as no move is refused for one
// (round 121, critique 1.2).
export function siteStates(dungeon, run, level = 1) {
  const visited = new Set(run.visited);
  const known = new Set(run.visited.flatMap((id) => neighboursOf(dungeon, id)));
  const complete = isComplete(dungeon, run);
  return Object.fromEntries(dungeon.sites.map((site) => {
    const state = site.id === run.at ? 'current' : visited.has(site.id) ? 'visited' : known.has(site.id) ? 'known' : 'hidden';
    const gate = gateFor(site, run, level);
    return [site.id, {
      state,
      cleared: run.cleared.includes(site.id),
      reachable: site.id !== run.at && moveProblem(dungeon, run, site.id, level) === null,
      ...(gate ? { gate: complete ? { ...gate, sealed: false } : gate } : {}),
    }];
  }));
}
