import express from 'express';
import cors from 'cors';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createEncounterRouter } from './routes/encounter.js';
import { AppError } from './errors.js';

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

export function createApp({ service, logger = console, token = null }) {
  const app = express();
  app.use(cors());
  if (token) app.use(requireToken(token));
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

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

  // Round 114: a dungeon (its sites and route) with the learner's run, and a new run.
  app.get('/api/dungeons/:id', async (req, res, next) => {
    try { res.json(await service.getDungeon(req.get('X-Learner-Id'), req.params.id)); }
    catch (error) { next(error); }
  });
  app.post('/api/dungeons/:id/reset', async (req, res, next) => {
    try { res.json(await service.resetDungeon(req.get('X-Learner-Id'), req.params.id)); }
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
