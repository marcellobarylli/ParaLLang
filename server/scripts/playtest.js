// Round 177: a playtest harness for The Journey 2's conversations against a live model.
//
//   node scripts/playtest.js serve --port 3101 --dir <dir> [--model sonnet] [--language it]
//       A local server on the claude-cli provider, with one extra route that puts a learner at any unit or lesson.
//       The CLI child gets this process's whole environment and the adapter's sign-in check is skipped: it is for a
//       development machine or a cloud session whose CLI is signed in some other way, never for the game's server.
//
//   node scripts/playtest.js start --port 3101 --dir <dir> --unit <unitId> [--lesson <lessonId>] [--mode beginner|light|strict] [--immersion auto|0.1..1] [--seed N]
//       A new learner at that unit (streamlined: the unit conversation) or lesson; prints the character's greeting.
//
//   node scripts/playtest.js say --port 3101 --dir <dir> --learner <id> "what the player says"
//       One reply of the player; prints the character's answer. After the third reply the turn is a "keep chatting" one.
//
// Every line goes to <dir>/transcripts/<learnerId>.jsonl, and the conversation's set-up to <dir>/sessions/<id>.json.

import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const command = args[0];
const option = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const positional = () => {
  const out = [];
  for (let i = 1; i < args.length; i += 1) {
    if (args[i].startsWith('--')) { i += 1; continue; }
    out.push(args[i]);
  }
  return out;
};
const dir = resolve(option('dir', join(process.cwd(), 'playtest-data')));
const port = Number(option('port', 3101));
const base = `http://127.0.0.1:${port}`;

async function serve() {
  const { default: express } = await import('express');
  const { loadGameContent } = await import('../src/content-loader.js');
  const { JsonLearningStorage } = await import('../src/learning-storage.js');
  const { LearningService } = await import('../src/learning-service.js');
  const { createApp } = await import('../src/app.js');
  const { ClaudeCLIAdapter } = await import('../src/llm/adapters/claude-cli.js');
  const { composeUnit } = await import('../src/road/pacing.js');

  class PlaytestAdapter extends ClaudeCLIAdapter {
    async preflight() { return { provider: this.providerName, authentication: 'playtest (not checked)', requestedModel: this.model }; }
  }
  const childEnv = { ...process.env, NO_COLOR: '1', TERM: 'dumb' };
  const provider = new PlaytestAdapter({ model: option('model', 'sonnet'), timeoutMs: 180_000, childEnv });
  const content = loadGameContent({ language: option('language', 'it') });
  const storage = new JsonLearningStorage({ saveDir: join(dir, 'saves') });
  const service = new LearningService({ provider, storage, content });
  const app = createApp({ service, token: null });
  const outer = express();
  outer.post('/playtest/place', express.json(), async (req, res) => {
    try {
      const { learnerId, unitId, lessonId } = req.body;
      const curriculum = content.curriculum;
      const envelope = await storage.load(learnerId);
      const road = envelope.road;
      let activity;
      if (lessonId) {
        const found = curriculum.lessonsById.get(lessonId);
        if (!found) throw new Error(`No lesson ${lessonId}`);
        activity = { kind: 'lesson', lessonId, unitId: found.unit.id };
      } else {
        if (!curriculum.units.some((unit) => unit.id === unitId)) throw new Error(`No unit ${unitId}`);
        activity = { kind: 'unit', unitId, picks: composeUnit(curriculum, unitId) };
      }
      // Streamlined mode off, so the road keeps the activity placed here; the stage's ratio comes from the unit.
      road.streamlined = false;
      road.current = { node: road.at, step: road.step, activity };
      await storage.save(envelope);
      res.json({ ok: true, activity });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });
  outer.use(app);
  outer.listen(port, '127.0.0.1', () => console.log(`playtest server on ${base}, saves in ${dir}/saves`));
}

async function call(path, { method = 'GET', body, learnerId } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(learnerId ? { 'X-Learner-Id': learnerId } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${JSON.stringify(data)}`);
  return data;
}

const sessionPath = (learnerId) => join(dir, 'sessions', `${learnerId}.json`);
const log = (learnerId, entry) => appendFileSync(join(dir, 'transcripts', `${learnerId}.jsonl`), `${JSON.stringify(entry)}\n`);

function lastNpc(encounter) {
  return [...encounter.transcript].reverse().find((message) => message.role === 'npc');
}

function show(message) {
  const lines = [];
  if (message.narrative) lines.push(`[narration] ${message.narrative}`);
  lines.push(`${message.dialogue.speaker}: ${message.dialogue.native}`);
  if (message.dialogue.translation) lines.push(`  (translation) ${message.dialogue.translation}`);
  return lines.join('\n');
}

function objectivesLine(encounter) {
  const open = encounter.openObjectives ?? [];
  const exchange = encounter.exchange ? `reply ${encounter.exchange.turn} of ${encounter.exchange.limit ?? encounter.exchange.max}` : '';
  return [`${exchange}; open objectives (${open.length}):`, ...open.map((objective) => `  - ${objective.prompt}`)].join('\n');
}

async function start() {
  mkdirSync(join(dir, 'sessions'), { recursive: true });
  mkdirSync(join(dir, 'transcripts'), { recursive: true });
  const { learnerId } = await call('/api/learner', { method: 'POST', body: {} });
  await call('/api/road', { learnerId });
  await call('/playtest/place', { method: 'POST', body: { learnerId, unitId: option('unit'), lessonId: option('lesson') } });
  // Round 177: the game's default is the learner's level (no share sent): --immersion auto, the default here too.
  const raw = option('immersion', 'auto');
  const immersion = raw === 'auto' ? null : Number(raw);
  const started = await call('/api/encounter/start', { method: 'POST', learnerId, body: { road: true, ...(immersion !== null ? { immersion } : {}) } });
  const encounter = started.encounter;
  const session = { learnerId, encounterId: encounter.id, version: encounter.version, mode: option('mode', 'beginner'), immersion, unit: option('unit'), lesson: option('lesson'), road: encounter.road ?? null };
  writeFileSync(sessionPath(learnerId), JSON.stringify(session, null, 2));
  const npc = lastNpc(encounter);
  log(learnerId, { kind: 'start', session, encounter: { road: encounter.road, openObjectives: encounter.openObjectives, exchange: encounter.exchange, character: encounter.character }, npc: { narrative: npc.narrative, native: npc.dialogue.native, translation: npc.dialogue.translation } });
  console.log(`learner: ${learnerId}`);
  console.log(`conversation: ${JSON.stringify(encounter.road ?? {})}`);
  console.log(`objectives:\n${objectivesLine(encounter)}`);
  console.log('');
  console.log(show(npc));
}

async function say() {
  const learnerId = option('learner');
  const [message] = positional();
  if (!learnerId || !message) throw new Error('say needs --learner and a message');
  const session = JSON.parse(readFileSync(sessionPath(learnerId), 'utf8'));
  const chat = session.complete === true;
  const flags = chat ? { chat: true } : session.mode === 'light' ? { light: true } : session.mode === 'beginner' ? { beginner: true } : {};
  const result = await call('/api/encounter/dialogue', { method: 'POST', learnerId, body: { encounterId: session.encounterId, version: session.version, attemptId: randomUUID(), message, ...(session.immersion != null ? { immersion: session.immersion } : {}), ...flags } });
  const encounter = result.encounter;
  session.version = encounter.version;
  if (encounter.state !== 'ongoing') session.complete = true;
  writeFileSync(sessionPath(learnerId), JSON.stringify(session, null, 2));
  const npc = lastNpc(encounter);
  const verdict = result.assessment ?? result.grading ?? null;
  const correction = result.correction ?? verdict?.correction ?? null;
  log(learnerId, { kind: 'turn', chat, player: message, state: encounter.state, correction, verdict, openObjectives: encounter.openObjectives, exchange: encounter.exchange, npc: { narrative: npc.narrative, native: npc.dialogue.native, translation: npc.dialogue.translation } });
  if (correction) console.log(`[correction] ${JSON.stringify(correction)}`);
  if (verdict?.overall_feedback || verdict?.feedback) console.log(`[feedback] ${verdict.overall_feedback ?? verdict.feedback}`);
  console.log(`[state] ${encounter.state}${chat ? ' (keep chatting)' : ''}`);
  console.log(`objectives:\n${objectivesLine(encounter)}`);
  console.log('');
  console.log(show(npc));
}

const commands = { serve, start, say };
if (!commands[command]) {
  console.error('usage: playtest.js serve|start|say ... (see the head of the file)');
  process.exit(2);
}
commands[command]().catch((error) => { console.error(error.message); process.exit(1); });
