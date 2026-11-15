// Round 119: a dungeon run for the client's tests, kept by the server's own rules (server/src/dungeon.js, a pure
// module) over the real dungeon file, so a fake server in a test cannot drift from what the server does.
import file from '../../../content/world/dungeons/ta_prohm.yaml';
import { cleared, freshRun, isComplete, moveProblem, moved, readRun, siteOf, siteStates } from '../../../server/src/dungeon.js';
import { levelFor, progressionView } from '../../../server/src/language-engine.js';

export const DUNGEON_FILE = file;
export const NAMES = { face_gate: 'Portia', buttress_tree: 'Mortimer', root_court: 'Gerald', sunlit_court: 'Flick', library: 'Marginalia', before_sanctuary: 'Bambieshart', sanctuary: 'Errata' };
// One legal walk that clears all seven sites: [siteId, whether the site is cleared on this visit].
export const TOUR = [
  ['face_gate', true], ['buttress_tree', true], ['root_court', true], ['sunlit_court', true], ['library', true],
  ['sunlit_court', false], ['before_sanctuary', true], ['sanctuary', true],
];

// Round 120: who can be saved to the party (as content/characters says), and the conversations Talk starts: the first,
// and the deeper one after three finished conversations (round 047).
export const SAVEABLE = { buttress_tree: true, root_court: true, sunlit_court: true, library: true };
export const TALKS = {
  buttress_tree: ['mortimer_tasting', 'mortimer_oath'], root_court: ['gerald_coffee_break', 'gerald_confidence'],
  sunlit_court: ['flick_slow_walk', 'flick_lotus'], library: ['marginalia_fragment', 'marginalia_folded_page'],
};
const MARKET = { buttress_tree: "The Butcher's Stall", root_court: 'The Coffee Cart', sunlit_court: 'The Cracked Fountain', library: 'The Old Bookshop' };

export const apiError = (message, code, details, status = 409) => Object.assign(new Error(message), { code, details, status });

// Round 121: the fake has experience, and its level opens the level seals as the server's does. It starts with 5000 XP
// (level 21, above every site's level, with 460 XP to the next) so that a test which is not about levels walks freely
// and meets no level-up; a test about them sets `xp`. `earn` adds experience, as a turn or a review does on the server.
export function createFakeRun(stored, { xp: startXp = 5000 } = {}) {
  let run = readRun(file, stored);
  let xp = startXp;
  const fake = {
    get run() { return run; },
    get xp() { return xp; },
    set xp(value) { xp = value; },
    get level() { return levelFor(xp); },
    get progression() { return progressionView(xp); },
    earn(amount) { xp += amount; return progressionView(xp); },
    get site() { return siteOf(file, run.at); },
    get complete() { return isComplete(file, run); },
    // GET /api/dungeons/:id
    view() {
      const sites = siteStates(file, run, levelFor(xp));
      return {
        dungeon: {
          id: file.id, name: file.name, level: file.level, start: file.start, goal: file.goal,
          sites: file.sites.map((site) => ({ id: site.id, encounterId: site.encounter, name: site.name, at: [...site.at], characterName: sites[site.id].state === 'hidden' ? null : NAMES[site.id], saveable: sites[site.id].state === 'hidden' ? null : Boolean(SAVEABLE[site.id]) })),
          paths: file.paths.map(({ between, via = [] }) => ({ between: [...between], via: via.map((point) => [...point]) })),
        },
        progress: { run: run.run, at: run.at, complete: isComplete(file, run), clearedSiteIds: run.cleared, visitedSiteIds: run.visited, sites },
        progression: progressionView(xp),
      };
    },
    // POST /api/dungeons/:id/move: the new view, or the server's refusal thrown as the client's API module throws it.
    move(siteId) {
      const problem = moveProblem(file, run, siteId, levelFor(xp));
      if (problem === 'UNKNOWN_SITE') throw apiError('Unknown site.', 'VALIDATION_ERROR', undefined, 400);
      if (problem === 'BLOCKED') throw apiError(`${NAMES[run.at]} has not let you pass yet.`, 'BLOCKED');
      if (problem === 'SEALED' && siteOf(file, siteId).requires_level > levelFor(xp)) throw apiError(`${siteOf(file, siteId).name} is sealed. It opens at level ${siteOf(file, siteId).requires_level} (you are level ${levelFor(xp)}).`, 'SEALED');
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

// Round 120: the party as the server keeps it (rounds 021, 022, 047), for a fake server: recruit after the site's
// encounter is won, a conversation count per member, and the conversation Talk starts.
export function createFakeParty(run) {
  const members = [];
  const won = new Set(); // encounters ever won: the server's world.completedEncounterIds outlives a new run
  const siteOfEncounter = (encounterId) => file.sites.find((site) => site.encounter === encounterId);
  const snapshot = () => members.map((member) => {
    const deeper = member.conversations >= 3;
    return {
      characterId: `${NAMES[member.siteId].toLowerCase()}_001`, name: NAMES[member.siteId], encounterId: siteOf(file, member.siteId).encounter,
      locationId: member.siteId, locationName: MARKET[member.siteId], joinedAt: '2026-11-15T10:00:00.000Z', conversations: member.conversations,
      conversationId: TALKS[member.siteId][deeper ? 1 : 0], conversationTier: deeper ? 3 : 0, nextStoryAt: deeper ? null : 3, storiesTold: deeper ? 1 : 0,
    };
  });
  return {
    get party() { return snapshot(); },
    // POST /api/party/recruit
    recruit(encounterId) {
      for (const id of run.run.cleared) won.add(siteOf(file, id).encounter);
      const site = siteOfEncounter(encounterId);
      if (!site) throw apiError('Unknown encounter.', 'VALIDATION_ERROR', undefined, 400);
      if (!SAVEABLE[site.id]) throw apiError(`${NAMES[site.id]} cannot join your party.`, 'NOT_SAVEABLE');
      if (!won.has(encounterId)) throw apiError(`${NAMES[site.id]} has not been won over yet. Finish the encounter first.`, 'NOT_DEFEATED');
      if (members.some((member) => member.siteId === site.id)) return { party: snapshot(), joined: false };
      members.push({ siteId: site.id, conversations: 0 });
      return { party: snapshot(), joined: true };
    },
    // The member a party conversation belongs to, or null (not a party conversation, or its member has not joined).
    memberOf(conversationId) { return members.find((member) => TALKS[member.siteId].includes(conversationId)) ?? null; },
    finished(conversationId) { const member = this.memberOf(conversationId); if (member) member.conversations += 1; },
  };
}
