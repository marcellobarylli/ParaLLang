import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { createEncounterRouter } from './routes/encounter.js';
import { AppError } from './errors.js';

export function createApp({ service, logger = console }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.post('/api/learner', async (req, res, next) => {
    try { res.status(req.body?.learnerId ? 200 : 201).json(await service.createOrRecoverLearner(req.body?.learnerId)); }
    catch (error) { next(error); }
  });
  app.use('/api/encounter', createEncounterRouter(service));

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

  app.use((error, req, res, _next) => {
    const requestId = randomUUID();
    const appError = error instanceof AppError ? error : new AppError('An unexpected server error occurred.');
    logger.error?.(`[${requestId}] ${appError.code}: ${error.message}${error.cause ? ` (cause: ${error.cause.message})` : ''}`);
    res.status(appError.status).json({
      error: { code: appError.code, message: appError.message, retryable: appError.retryable, requestId, details: appError.details },
    });
  });
  return app;
}
