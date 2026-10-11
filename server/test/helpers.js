import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { createApp } from '../src/app.js';

export const fixedNow = new Date('2026-01-15T12:00:00.000Z');

function objectiveRubric(systemPrompt) {
  const marker = 'AUTHORED RUBRIC: ';
  const start = systemPrompt.indexOf(marker);
  const end = systemPrompt.indexOf('\nReturn only structured JSON.', start);
  return JSON.parse(systemPrompt.slice(start + marker.length, end));
}

export class FixtureProvider {
  constructor() {
    this.calls = [];
    this.invalidNextGrade = null;
    this.failNextGrade = false;
    this.narrativeState = 'failed';
  }

  grade(messages) {
    if (this.failNextGrade) { this.failNextGrade = false; throw new Error('fixture outage'); }
    if (this.invalidNextGrade) { const value = this.invalidNextGrade; this.invalidNextGrade = null; return value; }
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    const lower = answer.toLocaleLowerCase('es');
    const rubric = objectiveRubric(messages[0].content);
    const quoted = /["'].*(?:café|cafe|sin leche).*['"]/.test(lower) || /sign says|gerald said|two words/.test(lower);
    const otherPerson = /\b(?:she|he|friend)\b/.test(lower);
    const contradicted = /no\s+sin leche|sin leche.*con leche/.test(lower);
    const contextual = !quoted && !otherPerson;
    const cafeMatch = answer.match(/café|cafe/i);
    const quieroMatch = answer.match(/quiero/i);
    const noMilkMatch = answer.match(/sin leche|café solo|cafe solo|café negro|cafe negro/i);
    return {
      objective_results: rubric.map((objective) => {
        const evidence = [];
        if (objective.targets.some((target) => target.id === 'quiero') && quieroMatch) evidence.push({ vocabulary_id: 'quiero', evidence: quieroMatch[0], quality: 5 });
        const normalizedNoMilk = noMilkMatch?.[0].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
        const noMilkId = normalizedNoMilk === 'sin leche' ? 'sin_leche' : normalizedNoMilk === 'cafe solo' ? 'cafe_solo' : normalizedNoMilk === 'cafe negro' ? 'cafe_negro' : null;
        if (objective.id === 'order_coffee' && cafeMatch) {
          if (noMilkId && noMilkId !== 'sin_leche') evidence.push({ vocabulary_id: noMilkId, evidence: noMilkMatch[0], quality: 5 });
          else evidence.push({ vocabulary_id: 'cafe', evidence: cafeMatch[0], quality: 5 });
        }
        if (objective.id === 'no_milk' && noMilkMatch) {
          const id = noMilkId;
          evidence.push({ vocabulary_id: id, evidence: noMilkMatch[0], quality: 5 });
        }
        const passed = objective.id === 'order_coffee' ? contextual && Boolean(cafeMatch) : contextual && !contradicted && Boolean(noMilkMatch);
        return { objective_id: objective.id, passed, feedback: passed ? `Passed ${objective.id}.` : `Keep working on ${objective.id}.`, vocabulary_evidence: evidence };
      }),
      overall_feedback: 'Fixture assessment applied.',
    };
  }

  narrate(messages) {
    const turn = JSON.parse(messages.at(-1).content.split('TURN DATA: ').at(-1).trim());
    const greeting = turn.task === 'greeting';
    return {
      narrative: greeting ? 'A tiny barista glares over a cup with union-approved suspicion.' : 'Gerald consults an imaginary tasting chart and issues a verdict.',
      dialogue: {
        speaker: 'Gerald',
        native: greeting ? '¿Quieres un café? Sin leche es la única opción civilizada.' : 'Bien. Tu café será tomado en serio.',
        translation: greeting ? 'Do you want a coffee? Without milk is the only civilized option.' : 'Good. Your coffee will be taken seriously.',
        words: greeting
          ? [{ word: 'café', pos: 'noun', meaning: 'a hallucinated wrong meaning' }]
          : [{ word: 'café', pos: 'noun', meaning: 'also wrong' }],
      },
      must_translate: false,
      difficulty: 99,
      hints_available: false,
      encounter_state: this.narrativeState,
    };
  }

  async structuredChat(messages, _schema, options) {
    this.calls.push({ messages, options });
    return options.schemaName === 'dialogue_assessment' ? this.grade(messages) : this.narrate(messages);
  }
}

export async function createRuntime({ provider = new FixtureProvider(), clock = () => fixedNow, storage } = {}) {
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-test-'));
  const actualStorage = storage ?? new JsonLearningStorage({ saveDir });
  const content = loadGameContent();
  const service = new LearningService({ provider, storage: actualStorage, content, clock });
  const app = createApp({ service, logger: { error() {} } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    provider, storage: actualStorage, service, content, server, baseUrl, saveDir,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      await service.shutdown();
    },
  };
}

export async function api(runtime, path, { learnerId, method = 'GET', body } = {}) {
  const response = await fetch(`${runtime.baseUrl}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(learnerId ? { 'X-Learner-Id': learnerId } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { status: response.status, data };
}

export async function createLearnerAndEncounter(runtime) {
  const identity = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const learnerId = identity.data.learnerId;
  const started = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: {} });
  return { learnerId, started: started.data };
}
