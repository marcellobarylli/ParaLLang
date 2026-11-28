// Round 144: helpers for the tests of The Journey 2. A module, not a test file.
import { randomUUID } from 'node:crypto';
import { loadGameContent } from '../src/content-loader.js';
import { matchCanonicalVocabulary } from '../src/language-engine.js';
import { PassingProvider, api, createRuntime } from './helpers.js';

// Grades a road conversation as PassingProvider grades an authored one, against the curriculum's own vocabulary.
// `spoil` names objective ids that fail this turn; `correct` makes a beginner's correction of what failed.
export class RoadProvider extends PassingProvider {
  constructor(content) { super(content); this.spoil = new Set(); this.correct = false; }

  // Round 174: a light turn (a chat after the end) meets nothing.
  narrate(messages) {
    const reply = super.narrate(messages);
    const turn = JSON.parse(messages.at(-1).content.split('TURN DATA: ').at(-1).trim());
    return turn.task === 'light_turn' ? { ...reply, player: { meant: 'Just chatting.', target: 'Due chiacchiere.', clean: true, objectives_met: [] } } : reply;
  }

  grade(messages) {
    const marker = 'AUTHORED RUBRIC: ';
    const system = messages[0].content;
    const start = system.indexOf(marker);
    const rubric = JSON.parse(system.slice(start + marker.length, system.indexOf('\nReturn only structured JSON.', start)));
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    const road = rubric.some((objective) => objective.targets.some((target) => target.id.startsWith('c_')));
    const matches = matchCanonicalVocabulary(answer, road ? this.content.curriculum.vocabulary.entries : this.content.vocabulary.entries);
    const results = rubric.map((objective) => {
      const targets = new Set(objective.targets.map((target) => target.id));
      const evidence = [];
      for (const match of matches) {
        if (targets.has(match.id) && !evidence.some((item) => item.vocabulary_id === match.id)) evidence.push({ vocabulary_id: match.id, evidence: match.excerpt, quality: 5 });
      }
      const found = new Set(evidence.map((item) => item.vocabulary_id));
      const said = objective.required_target_groups.every((group) => group.some((id) => found.has(id)));
      const passed = said && !this.spoil.has(objective.id);
      return { objective_id: objective.id, passed, attempted: said, feedback: passed ? `Passed ${objective.id}.` : `Keep working on ${objective.id}.`, vocabulary_evidence: passed ? evidence : [] };
    });
    // The strict grader's schema has neither `attempted` nor a correction; the beginner's has both.
    if (!/complete beginner/.test(system)) return { objective_results: results.map(({ attempted, ...result }) => result), overall_feedback: 'Fixture assessment applied.' };
    const corrected = this.correct && results.some((result) => result.attempted && !result.passed);
    return { objective_results: results, overall_feedback: 'Fixture assessment applied.', correction: corrected ? 'Corretto.' : null, correction_translation: corrected ? 'Corrected.' : null };
  }
}

// Round 173: streamlined mode is on by default; the tests of the full pacing switch it off (`streamlined: true` keeps it).
export async function roadRuntime(t, { language = 'it', seed = 4242, streamlined = false, serviceOptions = {} } = {}) {
  const content = loadGameContent({ language });
  const provider = new RoadProvider(content);
  const runtime = await createRuntime({ language, content, provider, serviceOptions: { seedSource: () => seed, ...serviceOptions } });
  t?.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  if (!streamlined) await setMode(runtime, learnerId, false);
  return { runtime, content, provider, learnerId };
}

export const setMode = (runtime, learnerId, streamlined) => api(runtime, '/api/road/mode', { learnerId, method: 'POST', body: { streamlined } });
export const road = (runtime, learnerId) => api(runtime, '/api/road', { learnerId });
export const moveTo = (runtime, learnerId, nodeId, extra = {}) => api(runtime, '/api/road/move', { learnerId, method: 'POST', body: { nodeId, ...extra } });
export const startHere = (runtime, learnerId, extra = {}) => api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { road: true, ...extra } });

// One answer that meets every objective of the conversation the learner is in: each objective's first example.
export function fullAnswer(runtime, learnerId) {
  const session = runtime.service.encounters.get(learnerId);
  return runtime.service.definition(session).encounter.objectives.map((objective) => objective.accepted_examples[0]).join(' ');
}

export async function answer(runtime, learnerId, encounter, message, extra = {}) {
  return runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message, ...extra });
}

// Starts and finishes the conversation waiting where the learner stands. Returns the resolving turn.
export async function talkHere(runtime, learnerId) {
  const started = await startHere(runtime, learnerId);
  if (started.status !== 200) throw new Error(`start failed: ${JSON.stringify(started.data.error)}`);
  const turn = await answer(runtime, learnerId, started.data.encounter, fullAnswer(runtime, learnerId));
  if (turn.encounter.state !== 'resolved') throw new Error(`the conversation did not resolve: ${JSON.stringify(turn.assessment.objectiveResults)}`);
  return turn;
}

// Round 215: a walk on. Only a finished conversation opens ways on, so the conversation waiting where the learner
// stands is finished first; then the walk goes to `pick(view.road)` (the rails' site, or the first ahead). Returns
// the road's view after the walk.
export async function walkOn(runtime, learnerId, pick = (view) => view.rails ?? view.frontier[0].id) {
  let view = (await road(runtime, learnerId)).data;
  if (view.road.current) { await talkHere(runtime, learnerId); view = (await road(runtime, learnerId)).data; }
  const moved = await moveTo(runtime, learnerId, pick(view.road));
  if (moved.status !== 200) throw new Error(`the walk failed: ${JSON.stringify(moved.data.error)}`);
  return moved.data;
}
