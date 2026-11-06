// Round 070: live HTTP check of the early verdict. Spawns the real server on 127.0.0.1 with a free port and a random
// PARALLANG_TOKEN (codex-cli, it), plays Gerald and Mortimer, polls /api/encounter/progress every 250 ms during each
// POST, and always stops the server. Writes the report to argv[2] and stdout.
//   node docs/rounds/070/results/progress-live.mjs docs/rounds/070/results/live-it.json
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { isDeepStrictEqual } from 'node:util';
import { join } from 'node:path';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { route } from '../../../../server/scripts/play-market.js';

const SCRIPT = {
  coffee_cart: ['Vorrei un caffè, per favore.', 'Senza latte, per favore.'],
  butchers_stall: ['Vorrei del prosciutto, per favore.', 'Vorrei del salame, per favore.', 'Chilo.', 'Due etti, per favore.'],
};
const freePort = () => new Promise((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dir = mkdtempSync(join(tmpdir(), 'parallang-progress-'));
const token = randomUUID();
const port = await freePort();
const child = spawn('node', ['server/server.js'], {
  cwd: new URL('../../../../', import.meta.url).pathname,
  env: { ...process.env, PORT: String(port), LLM_PROVIDER: 'codex-cli', TARGET_LANGUAGE: 'it', PARALLANG_SAVE_DIR: dir, PARALLANG_TOKEN: token, PARALLANG_ATMOSPHERE: 'off' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
child.stdout.on('data', (d) => { log += d; });
child.stderr.on('data', (d) => { log += d; });
const base = `http://127.0.0.1:${port}`;
const call = async (path, { learnerId, body } = {}) => {
  const r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'X-ParaLLang-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(learnerId ? { 'X-Learner-Id': learnerId } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json() };
};
const out = { port, turns: [], errors: [] };
try {
  for (let i = 0; i < 60; i += 1) { try { await fetch(`${base}/api/health`); break; } catch { await sleep(500); } }
  const world = loadGameContent({ language: 'it' }).world;
  const { data: { learnerId } } = await call('/api/learner', { body: {} });
  let at = world.start;
  for (const locationId of Object.keys(SCRIPT)) {
    for (const next of route(world, at, locationId)) await call('/api/world/move', { learnerId, body: { locationId: next } });
    at = locationId;
    const encounterId = world.locationsById.get(locationId).encounter;
    let { data: { encounter } } = await call('/api/encounter/start', { learnerId, body: { encounterId } });
    for (const message of SCRIPT[locationId]) {
      if (encounter.state !== 'ongoing') break;
      const attemptId = randomUUID();
      const started = performance.now();
      let settled = false;
      const post = call('/api/encounter/dialogue', { learnerId, body: { encounterId: encounter.id, version: encounter.version, attemptId, message } })
        .finally(() => { settled = true; });
      let early = null;
      let earlyMs = null;
      let polls = 0;
      const bodies = [];
      while (!settled) {
        await sleep(250);
        if (settled) break;
        const progress = await call(`/api/encounter/progress?attemptId=${attemptId}`, { learnerId });
        polls += 1;
        bodies.push(JSON.stringify(progress.data));
        if (progress.status !== 200) { out.errors.push({ attemptId, status: progress.status, data: progress.data }); continue; }
        if (!early && progress.data.progress.assessment) { early = progress.data.progress.assessment; earlyMs = Math.round(performance.now() - started); }
      }
      const response = await post;
      const responseMs = Math.round(performance.now() - started);
      if (response.status !== 200) { out.errors.push({ attemptId, status: response.status, data: response.data }); break; }
      const npc = response.data.encounter.transcript.at(-1).dialogue.native;
      out.turns.push({
        encounterId, message, polls, earlyMs, responseMs, savedMs: earlyMs === null ? null : responseMs - earlyMs,
        earlyEqual: early === null ? null : isDeepStrictEqual(early, response.data.assessment),
        npcTextInProgress: bodies.some((body) => body.includes(npc)),
        verdicts: response.data.assessment.objectiveResults.map((r) => `${r.objectiveId}:${r.passed}${r.held ? ':held' : ''}`),
        feedback: response.data.assessment.overallFeedback,
        state: response.data.encounter.state,
      });
      encounter = response.data.encounter;
    }
  }
} catch (error) {
  out.errors.push({ message: error.message });
} finally {
  child.kill('SIGTERM');
  await new Promise((r) => (child.exitCode !== null ? r() : child.once('exit', r)));
  rmSync(dir, { recursive: true, force: true });
}
const early = out.turns.filter((turn) => turn.earlyMs !== null);
out.summary = {
  turns: out.turns.length,
  withEarly: early.length,
  allEqual: early.every((turn) => turn.earlyEqual === true),
  npcTextLeaked: out.turns.some((turn) => turn.npcTextInProgress),
  medianSavedMs: early.map((t) => t.savedMs).sort((a, b) => a - b)[Math.floor(early.length / 2)] ?? null,
};
out.passed = out.errors.length === 0 && out.turns.length === 6 && early.length >= 5 && out.summary.allEqual && !out.summary.npcTextLeaked;
out.serverLog = log.split('\n').filter((line) => line && !line.includes(token));
writeFileSync(process.argv[2], `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out.summary), out.passed);
