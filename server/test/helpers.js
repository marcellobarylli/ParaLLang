import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { createApp } from '../src/app.js';
import { matchCanonicalVocabulary } from '../src/language-engine.js';

// Round 024: temp dirs made by the tests are removed when the test process exits (node --test runs each file in its
// own process). Not on runtime close: tests reopen a runtime's save dir to simulate a server restart.
const tempDirs = new Set();
let exitHookRegistered = false;

function removeTempDirs() {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      process.stderr.write(`could not remove test temp dir ${dir}: ${error.message}\n`);
    }
  }
  tempDirs.clear();
}

export async function makeTempDir(prefix) {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  if (!exitHookRegistered) {
    process.once('exit', removeTempDirs);
    exitHookRegistered = true;
  }
  tempDirs.add(dir);
  return dir;
}

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
    // Round 053 (critique 1.8): the map's atmosphere line has its own branch.
    if (options.schemaName === 'location_atmosphere') return { atmosphere: 'Dust settles on the stalls like it has opinions.' };
    if (options.schemaName !== 'dialogue_assessment') return this.narrate(messages);
    // Round 129: asked as the beginner's teacher, a fixture verdict without the beginner fields gets them: an
    // objective is tried when it passed, and nothing is corrected. A grader that scripts them keeps its own.
    const verdict = this.grade(messages);
    if (!/complete beginner/.test(messages[0].content) || !verdict || 'correction' in verdict) return verdict;
    return {
      ...verdict,
      objective_results: verdict.objective_results.map((result) => ({ attempted: result.passed, ...result })),
      correction: null, correction_translation: null,
    };
  }
}

// Round 153: light mode's replies. Each entry of the queue is the `player` block; the narration around it is the fixture's.
export class LightProvider extends FixtureProvider {
  constructor(queue = []) { super(); this.queue = [...queue]; }
  narrate(messages) {
    const reply = super.narrate(messages);
    const turn = JSON.parse(messages.at(-1).content.split('TURN DATA: ').at(-1).trim());
    if (turn.task !== 'light_turn') return reply;
    const next = this.queue.shift();
    return { ...reply, player: typeof next === 'function' ? next(turn) : next };
  }
}
// Round 114: grades any encounter in any pack. An objective passes when the answer holds an authored form of a target
// from each of its required groups (the evidence the service checks); narration is the shared fixture's.
export class PassingProvider extends FixtureProvider {
  constructor(content) { super(); this.content = content; }

  grade(messages) {
    const rubric = objectiveRubric(messages[0].content);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    const matches = matchCanonicalVocabulary(answer, this.content.vocabulary.entries);
    return {
      objective_results: rubric.map((objective) => {
        const targets = new Set(objective.targets.map((target) => target.id));
        const evidence = [];
        for (const match of matches) {
          if (targets.has(match.id) && !evidence.some((item) => item.vocabulary_id === match.id)) evidence.push({ vocabulary_id: match.id, evidence: match.excerpt, quality: 5 });
        }
        const found = new Set(evidence.map((item) => item.vocabulary_id));
        const passed = objective.required_target_groups.every((group) => group.some((id) => found.has(id)));
        return { objective_id: objective.id, passed, feedback: passed ? `Passed ${objective.id}.` : `Keep working on ${objective.id}.`, vocabulary_evidence: evidence };
      }),
      overall_feedback: 'Fixture assessment applied.',
    };
  }
}

// Round 114: one answer per objective that the PassingProvider passes (each objective's first accepted example).
export function passingAnswers(content, encounterId) {
  return content.encounters.get(encounterId).encounter.objectives.map((objective) => objective.accepted_examples[0]);
}

export async function createRuntime({ provider = new FixtureProvider(), clock = () => fixedNow, storage, language = 'es', saveDir: baseSaveDir, content: givenContent, serviceOptions = {}, saves = null } = {}) {
  const saveDir = baseSaveDir ?? await makeTempDir('parallang-test-');
  const actualStorage = storage ?? new JsonLearningStorage({ saveDir });
  const content = givenContent ?? loadGameContent({ language }); // round 045: a test may pass edited content
  const service = new LearningService({ provider, storage: actualStorage, content, clock, ...serviceOptions }); // round 076: options
  // Test servers bind 127.0.0.1 and are protected by a random PARALLANG_TOKEN-style secret.
  const token = randomUUID();
  const app = createApp({ service, logger: { error() {} }, token, ...(saves ? { saves } : {}) }); // round 146: a test may say where its saves are kept
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    provider, storage: actualStorage, service, content, server, baseUrl, saveDir, token,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      await service.shutdown();
    },
  };
}

export async function api(runtime, path, { learnerId, method = 'GET', body, token = runtime.token } = {}) {
  const response = await fetch(`${runtime.baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(learnerId ? { 'X-Learner-Id': learnerId } : {}),
      ...(token ? { 'X-ParaLLang-Token': token } : {}),
    },
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

// Round 017: reviews are closed while an encounter is under way. Resolve the opening encounter so a test can review.
export async function finishEncounter(runtime, session) {
  const encounter = session.started.encounter;
  const result = await runtime.service.submitDialogue(session.learnerId, {
    encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: 'Quiero un café negro.',
  });
  if (result.encounter.state !== 'resolved') throw new Error('fixture encounter did not resolve');
  return result;
}
