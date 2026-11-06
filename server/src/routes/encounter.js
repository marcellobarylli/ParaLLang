import { Router } from 'express';
import { validationError } from '../errors.js';

function learnerId(req) {
  const value = req.get('X-Learner-Id');
  if (!value) throw validationError('X-Learner-Id header is required.');
  return value;
}

export function createEncounterRouter(service) {
  const router = Router();
  router.post('/start', async (req, res, next) => {
    // Round 021: the app names the encounter at its location; without encounterId the default encounter starts.
    try { res.json(await service.startEncounter(learnerId(req), { restart: req.body?.restart === true, encounterId: req.body?.encounterId ?? null })); }
    catch (error) { next(error); }
  });
  router.get('/current', async (req, res, next) => {
    try { res.json(await service.currentEncounter(learnerId(req))); }
    catch (error) { next(error); }
  });
  router.post('/dialogue', async (req, res, next) => {
    try { res.json(await service.submitDialogue(learnerId(req), req.body ?? {})); }
    catch (error) { next(error); }
  });
  // Round 070 (backlog I1): the verdict of a turn under way, by its attempt id.
  router.get('/progress', (req, res, next) => {
    try { res.json(service.progress(learnerId(req), req.query.attemptId)); }
    catch (error) { next(error); }
  });
  router.post('/help', async (req, res, next) => {
    try { res.json(await service.revealEncounterHelp(learnerId(req), req.body ?? {})); }
    catch (error) { next(error); }
  });
  return router;
}
