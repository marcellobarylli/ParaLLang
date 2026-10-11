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
    try { res.json(await service.startEncounter(learnerId(req), { restart: req.body?.restart === true })); }
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
  router.post('/help', async (req, res, next) => {
    try { res.json(await service.revealEncounterHelp(learnerId(req), req.body ?? {})); }
    catch (error) { next(error); }
  });
  return router;
}
