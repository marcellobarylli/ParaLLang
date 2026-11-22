import express from 'express';
import cors from 'cors';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createEncounterRouter } from './routes/encounter.js';
import { AppError, OUTDATED_CLIENT, requireClient } from './errors.js';

const digest = (value) => createHash('sha256').update(String(value)).digest();

// Optional shared secret (PARALLANG_TOKEN): when set, every request except the health check needs the
// X-ParaLLang-Token header with that value. Round 092 (review R1.1): an allowlist of one path, compared as the router
// matches it (Express 5 is case-insensitive and ignores a trailing slash), so /API/world is not a way around it.
// Unknown paths are 401 without the token, not 404. CORS preflights are answered by cors() before this check.
const isHealth = (path) => path.toLowerCase().replace(/\/+$/, '') === '/api/health';
function requireToken(token) {
  const expected = digest(token);
  return (req, res, next) => {
    if (isHealth(req.path)) return next();
    const given = req.get('X-ParaLLang-Token');
    if (given && timingSafeEqual(digest(given), expected)) return next();
    return next(new AppError('A valid X-ParaLLang-Token header is required.', { status: 401, code: 'UNAUTHORIZED' }));
  };
}

export function createApp({ service, logger = console, token = null, saves = null }) {
  const app = express();
  app.use(cors());
  if (token) app.use(requireToken(token));
  // Round 144: a save put back from the player's own copy. A save is larger than any other request (about 150 kB
  // after long play), so this one route reads its body with its own limit, before the small one below.
  app.post('/api/save/restore', express.json({ limit: '2mb' }), async (req, res, next) => {
    try { res.json(await service.restoreSave(req.body ?? {})); }
    catch (error) { next(error); }
  });
  app.use(express.json({ limit: '32kb' }));
  // Round 145: with `saves` (where the saves are kept, and whether the last copy to GitHub went through) the health
  // check says so, so the owner can see from outside that the store is the one they set up.
  app.get('/api/health', (req, res) => res.json({ status: 'ok', ...(saves ? { saves: saves() } : {}) }));

  app.post('/api/learner', async (req, res, next) => {
    try { res.status(req.body?.learnerId ? 200 : 201).json(await service.createOrRecoverLearner(req.body?.learnerId)); }
    catch (error) { next(error); }
  });
  // Round 039: deletes the learner named by X-Learner-Id (the app's "Remove" on the Saves screen).
  app.delete('/api/learner', async (req, res, next) => {
    try { res.json(await service.deleteLearner(req.get('X-Learner-Id'))); }
    catch (error) { next(error); }
  });
  app.use('/api/encounter', createEncounterRouter(service));
  app.get('/api/onboarding', (req, res) => res.json(service.getOnboarding()));

  app.get('/api/world', async (req, res, next) => {
    try { res.json(await service.getWorld(req.get('X-Learner-Id'))); }
    catch (error) { next(error); }
  });
  // Round 053 (backlog A10): the current location's atmosphere line, or null; asked for apart from the map.
  app.get('/api/world/atmosphere', async (req, res, next) => {
    try { res.json(await service.getAtmosphere(req.get('X-Learner-Id'))); }
    catch (error) { next(error); }
  });
  app.post('/api/world/move', async (req, res, next) => {
    try { res.json(await service.moveTo(req.get('X-Learner-Id'), req.body ?? {})); }
    catch (error) { next(error); }
  });

  // Round 114: a dungeon with the learner's run, and a new run. Round 119: the dungeon is a map, and a move walks it.
  // Review 1 of round 119 (R1.1): the map is read at /map. The path the client of rounds 115 to 118 reads answers
  // with what to do, which that client shows on its route card: its page is older than this server.
  // Review 1 of round 121 (R1.2): the dungeon's routes ask for the client's contract (errors.js), so a page of
  // rounds 119 and 120, which knows no level seal, is told the same.
  app.get('/api/dungeons/:id/map', async (req, res, next) => {
    try { requireClient(req.query.client); res.json(await service.getDungeon(req.get('X-Learner-Id'), req.params.id)); }
    catch (error) { next(error); }
  });
  app.get('/api/dungeons/:id', (req, res, next) => next(new AppError(OUTDATED_CLIENT, { status: 426, code: 'CLIENT_OUTDATED' })));
  app.post('/api/dungeons/:id/reset', async (req, res, next) => {
    try { requireClient(req.body?.client); res.json(await service.resetDungeon(req.get('X-Learner-Id'), req.params.id)); }
    catch (error) { next(error); }
  });
  app.post('/api/dungeons/:id/move', async (req, res, next) => {
    try { requireClient(req.body?.client); res.json(await service.moveInDungeon(req.get('X-Learner-Id'), req.params.id, req.body ?? {})); }
    catch (error) { next(error); }
  });

  // Round 144: The Journey 2: the learner's place on the endless graph with what each site ahead offers and the
  // curriculum's marks; a walk to a site; a new road. And the whole save, for a copy the player keeps.
  app.get('/api/road', async (req, res, next) => {
    try { res.json(await service.getRoad(req.get('X-Learner-Id'))); }
    catch (error) { next(error); }
  });
  app.post('/api/road/move', async (req, res, next) => {
    try { res.json(await service.moveOnRoad(req.get('X-Learner-Id'), req.body ?? {})); }
    catch (error) { next(error); }
  });
  app.post('/api/road/reset', async (req, res, next) => {
    try { res.json(await service.resetRoad(req.get('X-Learner-Id'), req.body ?? {})); }
    catch (error) { next(error); }
  });
  app.get('/api/save', async (req, res, next) => {
    try { res.json(await service.exportSave(req.get('X-Learner-Id'))); }
    catch (error) { next(error); }
  });

  app.get('/api/party', async (req, res, next) => {
    try { res.json(await service.getParty(req.get('X-Learner-Id'))); }
    catch (error) { next(error); }
  });
  app.post('/api/party/recruit', async (req, res, next) => {
    try { res.json(await service.recruit(req.get('X-Learner-Id'), req.body ?? {})); }
    catch (error) { next(error); }
  });

  app.get('/api/spellbook', async (req, res, next) => {
    try { res.json(await service.getSpellbook(req.get('X-Learner-Id'))); }
    catch (error) { next(error); }
  });
  app.post('/api/spellbook/review', async (req, res, next) => {
    try { res.json(await service.createReviewChallenge(req.get('X-Learner-Id'), req.body?.vocabularyId ?? null)); }
    catch (error) { next(error); }
  });
  app.post('/api/spellbook/review/submit', async (req, res, next) => {
    try { res.json(await service.submitReview(req.get('X-Learner-Id'), req.body ?? {})); }
    catch (error) { next(error); }
  });

  // Round 157 (issue #5): the guidebook: the entries the learner has, and their being read when it is opened.
  app.get('/api/guidebook', async (req, res, next) => {
    try { res.json(await service.getGuidebook(req.get('X-Learner-Id'))); }
    catch (error) { next(error); }
  });
  app.post('/api/guidebook/read', async (req, res, next) => {
    try { res.json(await service.readGuidebook(req.get('X-Learner-Id'))); }
    catch (error) { next(error); }
  });

  // Round 111 (backlog B8): read a redacted annex anyway.
  app.post('/api/spellbook/annex/read', async (req, res, next) => {
    try { res.json(await service.readAnnex(req.get('X-Learner-Id'), req.body ?? {})); }
    catch (error) { next(error); }
  });

  app.use((error, req, res, _next) => {
    const requestId = randomUUID();
    const isAppError = error instanceof AppError;
    const appError = isAppError ? error : new AppError('An unexpected server error occurred.');
    const safeFields = appError.logFields ? ` ${JSON.stringify(appError.logFields)}` : '';
    const unexpectedMessage = isAppError ? '' : ` ${error.message}`;
    logger.error?.(`[${requestId}] ${appError.code}${safeFields}${unexpectedMessage}`);
    res.status(appError.status).json({
      error: { code: appError.code, message: appError.message, retryable: appError.retryable, requestId, details: appError.details },
    });
  });
  return app;
}
