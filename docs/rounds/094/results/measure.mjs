// Round 094 (backlog F15; copied from round 093): save size against turns, Spanish Coffee Cart with the test fixture provider.
// Each cycle: start (restart), WRONG wrong answers, one right answer (resolves), REVIEWS reviews. No LLM calls.
// Usage: node docs/rounds/093/results/measure.mjs [cycles] [wrong] (run from the repo root)
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { createRuntime } from '../../../../server/test/helpers.js';

const cycles = Number(process.argv[2] ?? 40);
const wrong = Number(process.argv[3] ?? 4);
let now = new Date('2026-01-15T12:00:00.000Z').getTime();
const runtime = await createRuntime({ clock: () => new Date(now) });
const { service } = runtime;
let turns = 0;
let reviews = 0;
const rows = [];
try {
  const ident = await (await fetch(`${runtime.baseUrl}/api/learner`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-ParaLLang-Token': runtime.token }, body: '{}' })).json();
  const id = ident.learnerId;
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    let { encounter } = await service.startEncounter(id, { restart: cycle > 0 });
    for (let i = 0; i < wrong; i += 1) {
      ({ encounter } = await service.submitDialogue(id, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: 'Hola amigo, no sé.' }));
      turns += 1;
    }
    ({ encounter } = await service.submitDialogue(id, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: 'Quiero un café negro.' }));
    turns += 1;
    now += 3 * 24 * 3600 * 1000; // cards fall due
    try {
      const { challenge } = await service.createReviewChallenge(id);
      if (challenge) { await service.submitReview(id, { challengeId: challenge.id, attemptId: randomUUID(), action: 'reveal' }); reviews += 1; }
    } catch (error) { if (cycle === 0) console.error('review skipped:', error.message); }
    const size = (await stat(runtime.storage.filePath(id))).size;
    const envelope = await runtime.storage.load(id);
    if (cycle === cycles - 1) {
      const receipt = Object.values(envelope.spellbook.processedAssessments).find((r) => r.kind === 'dialogue');
      const part = (v) => JSON.stringify(v ?? null).length;
      console.log('one dialogue receipt:', JSON.stringify({ total: part(receipt), encounter: part(receipt.response.encounter), transcript: part(receipt.response.encounter?.transcript), assessment: part(receipt.response.assessment), spellbook: part(receipt.response.spellbook) }));
      const r2 = Object.values(envelope.spellbook.processedAssessments).find((r) => r.kind === 'review');
      if (r2) console.log('one review receipt:', JSON.stringify({ total: part(r2), spellbook: part(r2.response.spellbook) }));
      console.log('save without receipts:', JSON.stringify({ ...envelope, spellbook: { ...envelope.spellbook, processedAssessments: {} } }).length);
    }
    const items = [...Object.values(envelope.spellbook.words), ...Object.values(envelope.spellbook.phrases)];
    rows.push({ cycle: cycle + 1, turns, reviews, bytes: size, receipts: Object.keys(envelope.spellbook.processedAssessments).length, cards: items.length, evidence: items.reduce((n, item) => n + item.evidence.length, 0), maxEvidence: Math.max(0, ...items.map((item) => item.evidence.length)) });
  }
} finally { await runtime.close(); }
for (const row of rows.filter((r, i) => i === 0 || (i + 1) % 10 === 0)) console.log(JSON.stringify(row));
const last = rows.at(-1);
console.log(`bytes per turn ~ ${Math.round((last.bytes - rows[0].bytes) / (last.turns + last.reviews - rows[0].turns - rows[0].reviews))}`);
