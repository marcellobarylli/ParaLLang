import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
const dir = mkdtempSync(join(tmpdir(), 'parallang-http-'));
const token = randomUUID();
const port = 3917;
const child = spawn('node', ['server/server.js'], { cwd: '/work/ParaLLang', env: { ...process.env, PORT: String(port), LLM_PROVIDER: 'codex-cli', TARGET_LANGUAGE: 'it', PARALLANG_SAVE_DIR: dir, PARALLANG_TOKEN: token }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; child.stdout.on('data', (d) => { log += d; }); child.stderr.on('data', (d) => { log += d; });
const base = `http://127.0.0.1:${port}`;
const call = async (path, { learnerId, body } = {}) => {
  const r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'X-ParaLLang-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(learnerId ? { 'X-Learner-Id': learnerId } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json() };
};
const out = {};
try {
  for (let i = 0; i < 60; i++) { try { await fetch(base + '/api/health'); break; } catch { await new Promise((r) => setTimeout(r, 500)); } }
  const { data: { learnerId } } = await call('/api/learner', { body: {} });
  out.startedAt = new Date().toISOString();
  const portia = await call('/api/encounter/start', { learnerId, body: { encounterId: 'market_entrance_tutorial' } });
  out.portia = { status: portia.status, encounterId: portia.data.encounter?.encounterId, character: portia.data.encounter?.character, native: portia.data.encounter?.transcript[0].dialogue.native, error: portia.data.error };
  const gerald = await call('/api/encounter/start', { learnerId, body: { encounterId: 'imp_coffee_greeting' } });
  out.geraldAtEntrance = { status: gerald.status, code: gerald.data.error?.code, message: gerald.data.error?.message };
  const recruitPortia = await call('/api/party/recruit', { learnerId, body: { encounterId: 'market_entrance_tutorial' } });
  out.recruitPortia = { status: recruitPortia.status, code: recruitPortia.data.error?.code };
  const recruitGerald = await call('/api/party/recruit', { learnerId, body: { encounterId: 'imp_coffee_greeting' } });
  out.recruitGerald = { status: recruitGerald.status, code: recruitGerald.data.error?.code };
  out.party = (await call('/api/party', { learnerId })).data;
  out.finishedAt = new Date().toISOString();
} finally {
  child.kill('SIGTERM');
  await new Promise((r) => child.once('exit', r));
  rmSync(dir, { recursive: true, force: true });
}
out.serverLog = log.split('\n').filter((line) => line && !line.includes(token));
writeFileSync(process.argv[2], JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
