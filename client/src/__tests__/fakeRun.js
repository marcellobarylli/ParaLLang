// Round 119: a dungeon run for the client's tests, kept by the server's own rules (server/src/dungeon.js, a pure
// module) over the real dungeon file, so a fake server in a test cannot drift from what the server does.
import file from '../../../content/world/dungeons/ta_prohm.yaml';
import { cleared, freshRun, isComplete, moveProblem, moved, readRun, siteOf, siteStates } from '../../../server/src/dungeon.js';

export const DUNGEON_FILE = file;
export const NAMES = { face_gate: 'Portia', buttress_tree: 'Mortimer', root_court: 'Gerald', sunlit_court: 'Flick', library: 'Marginalia', before_sanctuary: 'Bambieshart', sanctuary: 'Errata' };
// One legal walk that clears all seven sites: [siteId, whether the site is cleared on this visit].
export const TOUR = [
  ['face_gate', true], ['buttress_tree', true], ['root_court', true], ['sunlit_court', true], ['library', true],
  ['sunlit_court', false], ['before_sanctuary', true], ['sanctuary', true],
];

export const apiError = (message, code, details, status = 409) => Object.assign(new Error(message), { code, details, status });

export function createFakeRun(stored) {
  let run = readRun(file, stored);
  const fake = {
    get run() { return run; },
    get site() { return siteOf(file, run.at); },
    get complete() { return isComplete(file, run); },
    // GET /api/dungeons/:id
    view() {
      const sites = siteStates(file, run);
      return {
        dungeon: {
          id: file.id, name: file.name, level: file.level, start: file.start, goal: file.goal,
          sites: file.sites.map((site) => ({ id: site.id, encounterId: site.encounter, name: site.name, at: [...site.at], characterName: sites[site.id].state === 'hidden' ? null : NAMES[site.id] })),
          paths: file.paths.map(({ between, via = [] }) => ({ between: [...between], via: via.map((point) => [...point]) })),
        },
        progress: { run: run.run, at: run.at, complete: isComplete(file, run), clearedSiteIds: run.cleared, visitedSiteIds: run.visited, sites },
      };
    },
    // POST /api/dungeons/:id/move: the new view, or the server's refusal thrown as the client's API module throws it.
    move(siteId) {
      const problem = moveProblem(file, run, siteId);
      if (problem === 'UNKNOWN_SITE') throw apiError('Unknown site.', 'VALIDATION_ERROR', undefined, 400);
      if (problem === 'BLOCKED') throw apiError(`${NAMES[run.at]} has not let you pass yet.`, 'BLOCKED');
      if (problem) throw apiError(`You can't get there (${problem}).`, problem);
      run = moved(file, run, siteId);
      return fake.view();
    },
    clear(siteId = run.at) { run = cleared(file, run, siteId); return fake.view(); },
    reset() { run = freshRun(file, run.run + 1); return fake.view(); },
    // Puts the run somewhere without walking: after the first `steps` visits of TOUR.
    advance(steps) {
      for (const [siteId, clears] of TOUR.slice(0, steps)) {
        run = moved(file, run, siteId);
        if (clears) run = cleared(file, run, siteId);
      }
      return fake;
    },
  };
  return fake;
}
