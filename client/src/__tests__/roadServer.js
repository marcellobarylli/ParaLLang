// Round 144: the server of The Journey 2 for the client's tests: the real LearningService, in this process,
// with a scripted grader and a save directory of its own. The store's API is a thin adapter over the service's
// methods, so the client is tested against the server's own rules (as fakeRun.js does for the dungeon's map).
// A module, not a test file.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGameContent } from '../../../server/src/content-loader.js';
import { JsonLearningStorage } from '../../../server/src/learning-storage.js';
import { LearningService } from '../../../server/src/learning-service.js';
import { RoadProvider } from '../../../server/test/road-helpers.js';

let content = null;
const dirs = [];
export const cleanUp = () => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); };

/** A server with an empty save directory. `seed` fixes the landscape of a new road. */
export function createRoadServer({ seed = 4242 } = {}) {
  content ??= loadGameContent({ language: 'it' });
  const saveDir = mkdtempSync(join(tmpdir(), 'parallang-client-road-'));
  dirs.push(saveDir);
  const provider = new RoadProvider(content);
  const service = new LearningService({ provider, storage: new JsonLearningStorage({ saveDir }), content, clock: () => new Date('2026-01-15T12:00:00.000Z'), seedSource: () => seed });
  const api = {
    createLearner: (learnerId) => service.createOrRecoverLearner(learnerId),
    getDungeon: (learnerId, dungeonId) => service.getDungeon(learnerId, dungeonId),
    moveDungeon: (learnerId, dungeonId, body) => service.moveInDungeon(learnerId, dungeonId, body),
    resetDungeon: (learnerId, dungeonId) => service.resetDungeon(learnerId, dungeonId),
    getParty: (learnerId) => service.getParty(learnerId),
    recruit: (learnerId, encounterId) => service.recruit(learnerId, { encounterId }),
    startEncounter: (learnerId, { restart = false, encounterId = null, dungeonId = null, road = false, immersion = null } = {}) => service.startEncounter(learnerId, { restart, encounterId, dungeonId, road, immersion }),
    currentEncounter: (learnerId) => service.currentEncounter(learnerId),
    sendDialogue: (learnerId, payload) => service.submitDialogue(learnerId, payload),
    revealHelp: (learnerId, payload) => service.revealEncounterHelp(learnerId, payload),
    getSpellbook: (learnerId) => service.getSpellbook(learnerId),
    createReview: (learnerId, vocabularyId) => service.createReviewChallenge(learnerId, vocabularyId ?? null),
    submitReview: (learnerId, payload) => service.submitReview(learnerId, payload),
    getRoad: (learnerId) => service.getRoad(learnerId),
    moveRoad: (learnerId, body) => service.moveOnRoad(learnerId, body),
    resetRoad: (learnerId, body) => service.resetRoad(learnerId, body),
    exportSave: (learnerId) => service.exportSave(learnerId),
    restoreSave: (copy) => service.restoreSave(copy),
  };
  // One answer that meets every objective of the conversation under way.
  const fullAnswer = (learnerId) => service.definition(service.encounters.get(learnerId)).encounter.objectives.map((objective) => objective.accepted_examples[0]).join(' ');
  return { api, service, provider, content, fullAnswer };
}
