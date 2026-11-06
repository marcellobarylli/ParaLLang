// Round 076: with PARALLANG_PREFETCH on, an open encounter's greeting is written after the player has stayed at its
// location for the dwell, and the next start there takes it instead of calling the provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FixtureProvider, createRuntime } from './helpers.js';
import { PREFETCH_MAX_GREETINGS } from '../src/learning-service.js';
import { ProviderError } from '../src/llm/provider-error.js';

const DWELL = 25;
const others = ['market_entrance_tutorial', 'imp_coffee_greeting', 'butchers_stall_charcutier', 'cracked_fountain_letharger', 'old_bookshop_bookworm'];

// Holds the next call of a schema until the test opens it; can fail the next narration.
class GatedProvider extends FixtureProvider {
  constructor() { super(); this.gates = new Map(); this.failNextNarration = false; this.held = []; }
  hold(schemaName) {
    let open; let reached;
    const gate = { released: new Promise((r) => { open = r; }), arrived: new Promise((r) => { reached = r; }) };
    this.gates.set(schemaName, { ...gate, reached });
    return { open, arrived: gate.arrived };
  }
  async structuredChat(messages, schema, options) {
    const gate = this.gates.get(options.schemaName);
    if (gate) {
      this.gates.delete(options.schemaName);
      this.held.push(options); // round 087: a held call is recorded on arrival (calls records only those that pass)
      gate.reached();
      // Round 087: a held call ends on its signal's abort, like the CLI runner; `open(error)` fails it.
      const aborted = new Promise((_resolve, reject) => options.signal?.addEventListener('abort', () => reject(new ProviderError('interrupted', { provider: 'fixture' })), { once: true }));
      const value = await Promise.race([gate.released, aborted]);
      if (value instanceof Error) throw value;
    }
    if (options.schemaName === 'encounter_narration' && this.failNextNarration) {
      this.failNextNarration = false;
      throw new Error('fixture narration outage');
    }
    return super.structuredChat(messages, schema, options);
  }
}

async function setup(t, { prefetch = true, ...options } = {}) {
  const runtime = await createRuntime({ provider: new GatedProvider(), serviceOptions: { prefetch, prefetchDwellMs: DWELL, ...options } });
  t.after(runtime.close);
  return runtime;
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Round 087: a held greeting is { promise, controller, settled }; the promise resolves to { generated } or { error }.
const heldEntry = (generated) => ({ promise: Promise.resolve({ generated }), controller: new AbortController(), settled: true });
const greetings = (runtime) => runtime.provider.calls.filter((call) => call.options.schemaName === 'encounter_narration');
const speaker = (call) => call.messages[0].content.match(/Gerald|Portia|Mortimer|Flick|Marginalia|Errata/)?.[0];
async function waitFor(condition, ms = 1000) {
  const end = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > end) throw new Error('timed out');
    await wait(5);
  }
}
// A fresh learner moved at once to the coffee cart (the entrance's own arrival is replaced before its dwell).
async function atCart(runtime) {
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  await runtime.service.moveTo(learnerId, { locationId: 'coffee_cart' });
  return learnerId;
}
async function seed(runtime, learnerId, world) {
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { visitedLocationIds: ['market_entrance', 'coffee_cart', 'cracked_fountain', 'old_bookshop'], completedEncounterIds: [], ...world };
  await runtime.storage.save(envelope);
}

test('off: a move and a launch call nothing; the start calls once', async (t) => {
  const runtime = await setup(t, { prefetch: false });
  const learnerId = await atCart(runtime);
  await wait(DWELL * 4);
  assert.equal(greetings(runtime).length, 0);
  assert.equal(runtime.service.arrivals.size, 0);
  await runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(greetings(runtime).length, 1);
  assert.equal(runtime.service.prefetchStats.scheduled, 0);
});

test('on: after the dwell the greeting is written, and the start takes it with the same prompt as a plain start', async (t) => {
  const runtime = await setup(t);
  const learnerId = await atCart(runtime);
  await waitFor(() => greetings(runtime).length === 1);
  assert.equal(speaker(greetings(runtime)[0]), 'Gerald');
  await wait(5);
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(greetings(runtime).length, 1, 'the start made no call');
  assert.equal(encounter.transcript.length, 1);
  assert.equal(runtime.service.prefetchStats.used, 1);
  // Parity (critique 1.6): the prefetch asked exactly what a start without prefetch asks.
  const plain = await setup(t, { prefetch: false });
  const other = await atCart(plain);
  await plain.service.startEncounter(other, { encounterId: 'imp_coffee_greeting' });
  assert.deepEqual(greetings(runtime)[0].messages, greetings(plain)[0].messages);
  // Round 087: the prefetch's call also carries its abort signal; nothing else differs.
  const { signal, ...prefetchOptions } = greetings(runtime)[0].options;
  assert.ok(signal instanceof AbortSignal);
  assert.deepEqual(prefetchOptions, greetings(plain)[0].options);
});

test('a start while the greeting is being written waits for it: one call', async (t) => {
  const runtime = await setup(t);
  const reply = runtime.provider.hold('encounter_narration');
  const learnerId = await atCart(runtime);
  await reply.arrived;
  const start = runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  await wait(DWELL);
  reply.open();
  await start;
  assert.equal(greetings(runtime).length, 1);
  assert.equal(runtime.service.prefetchStats.used, 1);
});

test('a dwell that ends while a start is saving does not call (critique 1.2)', async (t) => {
  const runtime = await setup(t, { prefetchDwellMs: DWELL * 2 });
  const learnerId = await atCart(runtime);
  // The start has its greeting and waits on the save: no call in flight, no session yet.
  const save = runtime.storage.save.bind(runtime.storage);
  let release; const saving = new Promise((r) => { release = r; }); let reached; const arrived = new Promise((r) => { reached = r; });
  runtime.storage.save = async (envelope) => { reached(); await saving; return save(envelope); };
  const start = runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  await arrived;
  assert.equal(runtime.service.providerCallsInFlight, 0);
  await wait(DWELL * 4);
  release();
  await start;
  runtime.storage.save = save;
  await wait(DWELL * 4);
  assert.equal(greetings(runtime).length, 1);
  assert.equal(runtime.service.prefetchStats.calls, 0);
  assert.equal(runtime.service.prefetchStats.skipped, 1);
});

test('A → B → A within the dwell: one call, for the last arrival (critique 1.3)', async (t) => {
  const runtime = await setup(t, { prefetchDwellMs: DWELL * 2 });
  const learnerId = await atCart(runtime);
  await runtime.service.moveTo(learnerId, { locationId: 'market_entrance' });
  await runtime.service.moveTo(learnerId, { locationId: 'coffee_cart' });
  await waitFor(() => greetings(runtime).length === 1);
  await wait(DWELL * 4);
  assert.equal(greetings(runtime).length, 1);
  assert.equal(speaker(greetings(runtime)[0]), 'Gerald');
});

test('a busy provider is waited out, then given up after the retries (critique 1.7)', async (t) => {
  const runtime = await setup(t, { prefetchRetries: 2 });
  runtime.service.providerCallsInFlight = 1;
  const learnerId = await atCart(runtime);
  await waitFor(() => runtime.service.prefetchStats.busy === 3);
  await wait(DWELL * 3);
  assert.equal(runtime.service.prefetchStats.busy, 3);
  assert.equal(greetings(runtime).length, 0);
  // A later busy spell that clears before the retries run out still writes it.
  await runtime.service.moveTo(learnerId, { locationId: 'market_entrance' });
  await waitFor(() => runtime.service.prefetchStats.busy === 4);
  runtime.service.providerCallsInFlight = 0;
  await waitFor(() => greetings(runtime).length === 1);
  assert.equal(speaker(greetings(runtime)[0]), 'Portia');
});

test('a failed prefetch: the start asks the provider and succeeds', async (t) => {
  const runtime = await setup(t);
  runtime.provider.failNextNarration = true;
  const learnerId = await atCart(runtime);
  await waitFor(() => runtime.service.prefetchStats.failed === 1);
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(encounter.transcript.length, 1);
  assert.equal(greetings(runtime).length, 1, 'the failed call throws before the fixture records it; the start\'s call is the one');
  assert.equal(runtime.service.prefetchStats.fallback, 1);
});

test('nothing for a completed encounter, a sealed Rift, an active session, or a pending drill (critique 1.5)', async (t) => {
  const SLOW = 100; // the saves below are edited before the first dwell ends
  const runtime = await setup(t, { prefetchDwellMs: SLOW });
  const { service } = runtime;
  // Completed: the save says so when the dwell ends.
  const done = await atCart(runtime);
  await seed(runtime, done, { currentLocationId: 'coffee_cart', completedEncounterIds: ['imp_coffee_greeting'] });
  // A save from rounds 005–013 standing in the sealed Rift, recovered at launch.
  const { learnerId: sealed } = await service.createOrRecoverLearner();
  await seed(runtime, sealed, { currentLocationId: 'the_rift' });
  await service.createOrRecoverLearner(sealed);
  // An active session of the place's encounter, recovered at launch.
  const { learnerId: active } = await service.createOrRecoverLearner();
  await wait(SLOW * 3);
  const before = greetings(runtime).length; // the active learner's launch prefetched Portia once
  await service.startEncounter(active, { encounterId: 'market_entrance_tutorial' });
  await service.createOrRecoverLearner(active);
  await wait(SLOW * 3);
  assert.equal(greetings(runtime).length, before, 'the start took the prefetch, and the relaunch wrote no other');
  assert.deepEqual(greetings(runtime).map(speaker), ['Portia']);
  // The Rift opened, but a drill is pending.
  const { learnerId: drill } = await service.createOrRecoverLearner();
  await seed(runtime, drill, { currentLocationId: 'the_rift', completedEncounterIds: others });
  const pendingDrill = service.pendingDrill.bind(service);
  service.pendingDrill = (envelope) => (envelope.learnerId === drill ? { encounterId: 'the_rift_errata', vocabularyIds: ['x'] } : pendingDrill(envelope));
  await service.createOrRecoverLearner(drill);
  await wait(SLOW * 3);
  assert.deepEqual(greetings(runtime).map(speaker), ['Portia']);
  assert.ok(service.prefetchStats.skipped >= 4);
});

test('a launch schedules the current place; a restart over an active session takes a held greeting', async (t) => {
  const runtime = await setup(t);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  await waitFor(() => greetings(runtime).length === 1);
  assert.equal(speaker(greetings(runtime)[0]), 'Portia');
  await wait(5);
  const first = await runtime.service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial' });
  assert.equal(greetings(runtime).length, 1);
  assert.equal(runtime.service.prefetchStats.used, 1);
  // Amendment 1: a greeting held for this encounter while its session is active (written directly; the arrival
  // itself skips an active session) is taken by the restart, which makes no call.
  const definition = runtime.content.encounters.get('market_entrance_tutorial');
  const held = await runtime.provider.narrate(runtime.service.greetingMessages(definition, undefined));
  runtime.service.greetings.set(`${learnerId}\u0000market_entrance_tutorial`, heldEntry(held));
  const before = greetings(runtime).length;
  const again = await runtime.service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial', restart: true });
  assert.notEqual(again.encounter.id, first.encounter.id);
  assert.equal(runtime.service.prefetchStats.used, 2);
  assert.equal(greetings(runtime).length, before, 'the restart made no call');
  assert.equal(runtime.service.greetings.size, 0);
});

test('a party conversation never takes a prefetched greeting', async (t) => {
  const runtime = await setup(t);
  const definition = runtime.content.encounters.get('gerald_coffee_break');
  assert.ok(definition.encounter.party_of);
  // Amendment 1: a greeting held under the conversation's own key is still not taken.
  const key = `anyone\u0000${definition.encounter.id}`;
  runtime.service.greetings.set(key, heldEntry({ held: true }));
  assert.equal(await runtime.service.prefetchedGreeting('anyone', definition), null);
  assert.equal(runtime.service.greetings.has(key), true);
});

test('a deleted learner\'s greeting in flight is dropped; shutdown clears the timers (critique 1.4)', async (t) => {
  const runtime = await setup(t);
  const reply = runtime.provider.hold('encounter_narration');
  const learnerId = await atCart(runtime);
  await reply.arrived;
  assert.equal(runtime.service.greetings.size, 1);
  await runtime.service.deleteLearner(learnerId);
  assert.equal(runtime.service.greetings.size, 0);
  reply.open();
  await wait(5);
  assert.equal(runtime.service.greetings.size, 0);
  // Shutdown before a dwell ends: no call, no timer, and no arrival scheduled afterwards.
  const other = await atCart(runtime);
  await runtime.service.shutdown();
  assert.equal(runtime.service.arrivals.size, 0);
  runtime.service.scheduleArrival(other, 'coffee_cart');
  await wait(DWELL * 3);
  assert.equal(greetings(runtime).length, 0, 'round 087: the deleted learner\'s call was aborted, so none completed');
  assert.equal(runtime.service.arrivals.size, 0);
});

test('at most PREFETCH_MAX_GREETINGS are held; the oldest goes', async (t) => {
  const runtime = await setup(t);
  for (let i = 0; i < PREFETCH_MAX_GREETINGS; i += 1) runtime.service.greetings.set(`filler-${i}`, heldEntry(null));
  await atCart(runtime);
  await waitFor(() => greetings(runtime).length === 1);
  assert.equal(runtime.service.greetings.size, PREFETCH_MAX_GREETINGS);
  assert.equal(runtime.service.greetings.has('filler-0'), false);
  assert.equal(runtime.service.prefetchStats.evicted, 1);
});

test('with the atmosphere line on too, the atmosphere waits while a greeting is being written', async (t) => {
  const runtime = await setup(t, { atmosphere: true });
  const reply = runtime.provider.hold('encounter_narration');
  const learnerId = await atCart(runtime);
  await reply.arrived;
  const busy = await runtime.service.getAtmosphere(learnerId);
  assert.equal(busy.atmosphere, null);
  assert.ok(busy.retryAfterMs > 0);
  reply.open();
  await waitFor(() => runtime.service.providerCallsInFlight === 0);
  const line = await runtime.service.getAtmosphere(learnerId);
  assert.equal(line.atmosphere.locationId, 'coffee_cart');
});

// Round 087 (review 076–080): greetings no longer needed are aborted and dropped; a start never waits two timeouts.
test('a move away aborts and drops the greeting being written; it is not counted as failed', async (t) => {
  const runtime = await setup(t);
  const reply = runtime.provider.hold('encounter_narration');
  const learnerId = await atCart(runtime);
  await reply.arrived;
  const call = runtime.provider.held[0];
  await runtime.service.moveTo(learnerId, { locationId: 'market_entrance' });
  assert.equal(call.signal.aborted, true);
  assert.equal(runtime.service.greetings.has(`${learnerId}\u0000imp_coffee_greeting`), false);
  await wait(5);
  assert.equal(runtime.service.prefetchStats.dropped, 1);
  assert.equal(runtime.service.prefetchStats.failed, 0);
});

test('a start of another encounter drops a pending greeting; a resume drops nothing', async (t) => {
  const runtime = await setup(t);
  const reply = runtime.provider.hold('encounter_narration');
  const { learnerId } = await runtime.service.createOrRecoverLearner(); // Portia's greeting at the entrance
  await reply.arrived;
  const portia = runtime.provider.held[0];
  await runtime.service.startEncounter(learnerId); // the default encounter (Gerald) starts anywhere
  assert.equal(portia.signal.aborted, true);
  assert.equal(runtime.service.prefetchStats.dropped, 1);
  const held = heldEntry({ held: true });
  runtime.service.greetings.set(`${learnerId}\u0000market_entrance_tutorial`, held);
  await runtime.service.startEncounter(learnerId); // resumes Gerald
  assert.equal(held.controller.signal.aborted, false);
  assert.equal(runtime.service.greetings.size, 1);
});

test('a start that took a pending greeting whose call then timed out fails with that timeout, no second call', async (t) => {
  const runtime = await setup(t);
  const reply = runtime.provider.hold('encounter_narration');
  const learnerId = await atCart(runtime);
  await reply.arrived;
  const start = runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  await wait(5);
  reply.open(new ProviderError('timeout', { provider: 'fixture' }));
  await assert.rejects(start, (error) => error.code === 'CLI_TIMEOUT');
  assert.equal(greetings(runtime).length, 0, 'no second greeting call');
  assert.equal(runtime.service.prefetchStats.failed, 1);
  // The player tries again: a plain call.
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(encounter.transcript.length, 1);
  assert.equal(greetings(runtime).length, 1);
});

test('a greeting that timed out before the tap falls back to one fresh call', async (t) => {
  const runtime = await setup(t);
  const reply = runtime.provider.hold('encounter_narration');
  const learnerId = await atCart(runtime);
  await reply.arrived;
  reply.open(new ProviderError('timeout', { provider: 'fixture' }));
  await waitFor(() => runtime.service.prefetchStats.failed === 1);
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(encounter.transcript.length, 1);
  assert.equal(greetings(runtime).length, 1, 'one fresh call');
  assert.equal(runtime.service.prefetchStats.fallback, 1);
});

test('a start that took a greeting keeps it though a move is queued behind it (serialized order)', async (t) => {
  const runtime = await setup(t);
  const reply = runtime.provider.hold('encounter_narration');
  const learnerId = await atCart(runtime);
  await reply.arrived;
  const start = runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  await wait(5);
  const move = runtime.service.moveTo(learnerId, { locationId: 'market_entrance' }).catch((error) => error);
  reply.open();
  const { encounter } = await start;
  await move;
  assert.equal(encounter.transcript.length, 1);
  assert.equal(runtime.provider.held[0].signal.aborted, false);
  assert.equal(greetings(runtime).length, 1);
  assert.equal(runtime.service.prefetchStats.used, 1);
  assert.equal(runtime.service.prefetchStats.dropped, 0);
});

test('a delete and a shutdown abort a greeting being written', async (t) => {
  const runtime = await setup(t);
  const first = runtime.provider.hold('encounter_narration');
  const learnerId = await atCart(runtime);
  await first.arrived;
  await runtime.service.deleteLearner(learnerId);
  assert.equal(runtime.provider.held[0].signal.aborted, true);
  const second = runtime.provider.hold('encounter_narration');
  await atCart(runtime);
  await second.arrived;
  await runtime.service.shutdown();
  assert.equal(runtime.provider.held[1].signal.aborted, true);
  assert.equal(runtime.service.greetings.size, 0);
});
