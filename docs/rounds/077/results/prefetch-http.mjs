// Round 077: the greeting prefetch over HTTP through server/server.js (127.0.0.1, random token, random port).
//   node docs/rounds/077/results/prefetch-http.mjs --out <report.json>
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..', '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((ok, fail) => {
  const probe = createServer();
  probe.once('error', fail);
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => ok(port)); });
});

const token = randomBytes(24).toString('hex');
const port = await freePort();
const saveDir = await mkdtemp(join(tmpdir(), 'parallang-http-'));
const log = [];
const server = spawn(process.execPath, ['server/server.js'], {
  cwd: root,
  env: { ...process.env, LLM_PROVIDER: 'codex-cli', TARGET_LANGUAGE: 'it', PARALLANG_PREFETCH: 'on', PARALLANG_TOKEN: token, PORT: String(port), PARALLANG_SAVE_DIR: saveDir },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const exited = new Promise((r) => server.once('exit', (code, signal) => r({ code, signal })));
server.stdout.on('data', (d) => log.push(String(d)));
server.stderr.on('data', (d) => log.push(String(d)));
const base = `http://127.0.0.1:${port}`;
const report = { startedAt: new Date().toISOString(), port, requests: [], starts: [] };

async function call(method, path, { learnerId, body, withToken = true } = {}) {
  const t0 = performance.now();
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(learnerId ? { 'X-Learner-Id': learnerId } : {}), ...(withToken ? { 'X-ParaLLang-Token': token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ms = Math.round(performance.now() - t0);
  const json = await response.json().catch(() => null);
  report.requests.push({ method, path, withToken, status: response.status, ms });
  return { status: response.status, json, ms };
}

try {
  for (let i = 0; i < 100 && !log.join('').includes('listening'); i += 1) await sleep(100);
  report.listening = log.join('').includes(`listening on http://127.0.0.1:${port}`);
  const unauth = await call('GET', '/api/world', { withToken: false });
  report.withoutToken = unauth.status;
  const { json: identity } = await call('POST', '/api/learner', { body: {} });
  const learnerId = identity.learnerId;
  const visit = async (locationId, encounterId, stayMs) => {
    const move = await call('POST', '/api/world/move', { learnerId, body: { locationId } });
    await sleep(stayMs);
    const start = await call('POST', '/api/encounter/start', { learnerId, body: { encounterId } });
    const entry = { locationId, encounterId, stayMs, moveStatus: move.status, status: start.status, startMs: start.ms, greeting: start.json?.encounter?.transcript?.[0]?.dialogue?.native ?? null, error: start.json?.error ?? null };
    report.starts.push(entry);
    console.error(`${locationId} after ${stayMs} ms: ${start.status} in ${start.ms} ms`);
  };
  await visit('coffee_cart', 'imp_coffee_greeting', 10_000);
  await visit('market_entrance', 'market_entrance_tutorial', 10_000);
  await visit('butchers_stall', 'butchers_stall_charcutier', 300);
} finally {
  server.kill('SIGTERM');
  const timer = setTimeout(() => server.kill('SIGKILL'), 10_000);
  report.exit = await exited;
  clearTimeout(timer);
  await rm(saveDir, { recursive: true, force: true });
}
report.serverLog = log.join('').split('\n').filter((line) => !line.includes(token));
report.finishedAt = new Date().toISOString();
const out = process.argv.indexOf('--out');
const text = `${JSON.stringify(report, null, 2)}\n`;
if (out > 0) await writeFile(process.argv[out + 1], text);
process.stdout.write(text);
