// Round 053 (backlog A10): an LLM line of atmosphere for the current location, cached by state, never an error.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAtmosphereMessages } from '../src/llm/prompt-builder.js';
import { loadGameContent } from '../src/content-loader.js';
import { ATMOSPHERE_MAX_LENGTH, ATMOSPHERE_RETRY_MS } from '../src/learning-service.js';
import { schemaForCLI } from '../src/llm/cli-adapter.js';
import { locationAtmosphereSchema } from '../src/llm/schemas.js';
import { FixtureProvider, api, createRuntime } from './helpers.js';

class AtmosphereProvider extends FixtureProvider {
  constructor() {
    super();
    this.lines = [];
    this.atmosphereCalls = [];
    this.failNext = false;
  }

  async structuredChat(messages, schema, options) {
    if (options.schemaName !== 'location_atmosphere') return super.structuredChat(messages, schema, options);
    this.atmosphereCalls.push(messages);
    await new Promise((resolve) => setImmediate(resolve));
    if (this.failNext) { this.failNext = false; throw new Error('fixture outage'); }
    return { atmosphere: this.lines.shift() ?? 'A pigeon files a complaint with the wind.' };
  }
}

async function setup(t, options = {}) {
  const provider = new AtmosphereProvider();
  const runtime = await createRuntime({ provider, ...options });
  t.after(runtime.close);
  runtime.service.atmosphereEnabled = true; // off by default (Decision 1)
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  return { runtime, provider, learnerId, service: runtime.service };
}

test('the atmosphere is written once per state and served again from the cache', async (t) => {
  const { runtime, provider, learnerId } = await setup(t);
  const first = await api(runtime, '/api/world/atmosphere', { learnerId });
  assert.equal(first.status, 200);
  assert.deepEqual(first.data, { atmosphere: { locationId: 'market_entrance', text: 'A pigeon files a complaint with the wind.' } });
  const again = await api(runtime, '/api/world/atmosphere', { learnerId });
  assert.deepEqual(again.data, first.data);
  assert.equal(provider.atmosphereCalls.length, 1);
  // Another learner in the same state gets the same line without a call.
  const other = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  assert.deepEqual((await api(runtime, '/api/world/atmosphere', { learnerId: other })).data, first.data);
  assert.equal(provider.atmosphereCalls.length, 1);
});

test('completing the encounter, moving or a party member joining asks for a new line', async (t) => {
  const { runtime, provider, learnerId, service } = await setup(t);
  await service.getAtmosphere(learnerId);
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { ...envelope.world, completedEncounterIds: ['market_entrance_tutorial'] };
  await runtime.storage.save(envelope);
  await service.getAtmosphere(learnerId);
  assert.equal(provider.atmosphereCalls.length, 2);
  assert.match(provider.atmosphereCalls[1][0].content, /NOW: The player has already won over Portia, a Sentient Archway, here\./);
  await service.moveTo(learnerId, { locationId: 'coffee_cart' });
  const cart = await service.getAtmosphere(learnerId);
  assert.equal(cart.atmosphere.locationId, 'coffee_cart');
  assert.match(provider.atmosphereCalls[2][0].content, /NOW: Gerald, an Imp, is here and has not been won over yet\./);
  const saved = await runtime.storage.load(learnerId);
  saved.world = { ...saved.world, completedEncounterIds: [...saved.world.completedEncounterIds, 'imp_coffee_greeting'] };
  saved.party = [{ characterId: 'imp_coffee_001', encounterId: 'imp_coffee_greeting', joinedAt: '2026-01-15T12:00:00.000Z', conversations: 0 }];
  await runtime.storage.save(saved);
  await service.getAtmosphere(learnerId);
  assert.equal(provider.atmosphereCalls.length, 3 + 1);
  assert.match(provider.atmosphereCalls[3][0].content, /WITH THE PLAYER: Gerald \(Imp\)\n/);
});

test('a pack form drops the line, English words and the description\'s own words do not', async (t) => {
  const { provider, learnerId, service } = await setup(t);
  provider.lines.push('Somebody mutters quiero at the stones.');
  assert.deepEqual(await service.getAtmosphere(learnerId), { atmosphere: null }, 'pack form (es quiero)');
  assert.deepEqual(service.atmosphereStats.drops.at(-1), { reason: 'vocabulary', locationId: 'market_entrance', excerpt: 'quiero' });
  const { learnerId: other, service: fresh, provider: second } = await setup(t);
  second.lines.push('Once again, the sign flickers between MERCATO and MARKET, and a kilo of dust settles.');
  assert.equal((await fresh.getAtmosphere(other)).atmosphere.text, 'Once again, the sign flickers between MERCATO and MARKET, and a kilo of dust settles.');
});

test('too long, schema and provider failures give null, are traced, and are not retried for ten minutes', async (t) => {
  let now = Date.parse('2026-01-15T12:00:00.000Z');
  const { provider, learnerId, service } = await setup(t, { clock: () => new Date(now) });
  provider.lines.push('x'.repeat(ATMOSPHERE_MAX_LENGTH + 1));
  assert.deepEqual(await service.getAtmosphere(learnerId), { atmosphere: null });
  assert.deepEqual(await service.getAtmosphere(learnerId), { atmosphere: null });
  assert.equal(provider.atmosphereCalls.length, 1, 'cached failure');
  now += ATMOSPHERE_RETRY_MS + 1;
  provider.failNext = true;
  assert.deepEqual(await service.getAtmosphere(learnerId), { atmosphere: null });
  now += ATMOSPHERE_RETRY_MS + 1;
  provider.lines.push(42);
  assert.deepEqual(await service.getAtmosphere(learnerId), { atmosphere: null });
  now += ATMOSPHERE_RETRY_MS + 1;
  assert.equal((await service.getAtmosphere(learnerId)).atmosphere.text, 'A pigeon files a complaint with the wind.');
  assert.equal(provider.atmosphereCalls.length, 4);
  assert.deepEqual(service.atmosphereStats.drops.map((drop) => drop.reason), ['length', 'provider', 'schema']);
  assert.equal(service.atmosphereStats.calls, 4);
});

test('no atmosphere call starts while an encounter call is in flight', async (t) => {
  const { provider, learnerId, service } = await setup(t);
  service.providerCallsInFlight = 1;
  assert.deepEqual(await service.getAtmosphere(learnerId), { atmosphere: null, retryAfterMs: 15_000 });
  assert.equal(provider.atmosphereCalls.length, 0);
  assert.equal(service.atmosphereStats.drops.at(-1).reason, 'busy');
  service.providerCallsInFlight = 0;
  assert.ok((await service.getAtmosphere(learnerId)).atmosphere, 'busy is not cached');
  // callProvider counts itself in flight and always counts back down.
  provider.failNext = false;
  await service.callProvider([{ role: 'user', content: '{}' }], { parse: (value) => value }, 'location_atmosphere', 'Test').catch(() => {});
  assert.equal(service.providerCallsInFlight, 0);
});

test('the schema reaches the CLI providers strict and without a length', () => {
  const json = schemaForCLI(locationAtmosphereSchema);
  assert.deepEqual(json.required, ['atmosphere']);
  assert.equal(json.additionalProperties, false);
  assert.doesNotMatch(JSON.stringify(json), /maxLength/);
});

test('every location description of both packs passes the vocabulary filter', async (t) => {
  for (const language of ['it', 'es']) {
    const content = loadGameContent({ language });
    for (const location of content.world.locations) {
      const provider = new AtmosphereProvider();
      const runtime = await createRuntime({ provider, language });
      t.after(runtime.close);
      provider.lines.push(location.description.trim().replace(/\s+/g, ' ').slice(0, ATMOSPHERE_MAX_LENGTH));
      const text = await runtime.service.writeAtmosphere(location, 'none', null, []);
      assert.ok(text, `${language} ${location.id}: ${JSON.stringify(runtime.service.atmosphereStats.drops)}`);
    }
  }
});

test('concurrent requests for one state share one call', async (t) => {
  const { provider, learnerId, service } = await setup(t);
  const results = await Promise.all([service.getAtmosphere(learnerId), service.getAtmosphere(learnerId), service.getAtmosphere(learnerId)]);
  assert.equal(provider.atmosphereCalls.length, 1);
  for (const result of results) assert.equal(result.atmosphere.text, 'A pigeon files a complaint with the wind.');
});

test('switched off, the atmosphere is null without a call; an unknown learner is still refused', async (t) => {
  const provider = new AtmosphereProvider();
  const runtime = await createRuntime({ provider });
  t.after(runtime.close);
  assert.equal(runtime.service.atmosphereEnabled, false, 'off by default');
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  assert.deepEqual((await api(runtime, '/api/world/atmosphere', { learnerId })).data, { atmosphere: null });
  assert.equal(provider.atmosphereCalls.length, 0);
  const refused = await api(runtime, '/api/world/atmosphere', { learnerId: 'not-a-learner' });
  assert.ok(refused.status >= 400 && refused.status < 500, String(refused.status));
});

test('the prompt holds the place, its state and the party, in English, and no learning data', () => {
  const content = loadGameContent({ language: 'it' });
  const location = content.world.locationsById.get('cracked_fountain');
  const [system] = buildAtmosphereMessages({ language: content.language, styleGuide: content.styleGuide, location, state: 'Flick is here and has not been won over yet.', partyNames: ['Gerald', 'Mortimer'] });
  assert.match(system.content, /PLACE: The Cracked Fountain\. The fountain stopped running water/);
  assert.match(system.content, /NOW: Flick is here/);
  assert.match(system.content, /WITH THE PLAYER: Gerald, Mortimer/);
  assert.match(system.content, /Write no word of Italian or of any language other than English/);
  assert.doesNotMatch(system.content, /\{\{|LEARNING DATA|target_vocabulary/);
  const [alone] = buildAtmosphereMessages({ language: content.language, styleGuide: content.styleGuide, location, state: 'x', partyNames: [] });
  assert.match(alone.content, /WITH THE PLAYER: nobody; the player walks alone/);
});

test('a prompt that cannot be built gives null and a build drop, not an error (review 1)', async (t) => {
  const { provider, learnerId, service } = await setup(t);
  service.content = { ...service.content, styleGuide: null };
  assert.deepEqual(await service.getAtmosphere(learnerId), { atmosphere: null });
  assert.equal(service.atmosphereStats.drops.at(-1).reason, 'build');
  assert.equal(provider.atmosphereCalls.length, 0);
});

// Round 054 (critique 1.4): apostrophes fold before the pack-form check, so ʼ (a letter) no longer hides a form,
// and an English line with typographic apostrophes is kept.
test('it: a pack form written with ʼ drops the line; an English line with ’ is kept', async (t) => {
  const { provider, learnerId, service } = await setup(t, { language: 'it' });
  provider.lines.push('The clock insists: È lʼuna.');
  assert.deepEqual(await service.getAtmosphere(learnerId), { atmosphere: null });
  assert.deepEqual(service.atmosphereStats.drops.at(-1), { reason: 'vocabulary', locationId: 'market_entrance', excerpt: 'È lʼuna' });
  const { learnerId: other, service: fresh, provider: second } = await setup(t, { language: 'it' });
  second.lines.push('The archway’s keystone hums; nobody’s listening.');
  assert.equal((await fresh.getAtmosphere(other)).atmosphere.text, 'The archway’s keystone hums; nobody’s listening.');
});

// Round 068 (backlog A10b): one kind of detail per place and state, and no generic office humour.
test('the detail kind is fixed per place and state: (3i + s) mod 5, all five kinds, open differs from complete (critique 1.6, 1.7)', async () => {
  const { ATMOSPHERE_DETAILS, atmosphereDetail } = await import('../src/learning-service.js');
  for (const language of ['it', 'es']) {
    const { world } = loadGameContent({ language });
    assert.equal(world.locations.length, 6);
    const used = new Set();
    world.locations.forEach((location, i) => {
      ['none', 'open', 'complete'].forEach((state, s) => {
        const detail = atmosphereDetail(world, location.id, state);
        assert.equal(detail, ATMOSPHERE_DETAILS[(3 * i + s) % 5], `${location.id} ${state}`);
        assert.equal(atmosphereDetail(world, location.id, state), detail); // repeatable, so the cache stays right
        if (state !== 'none') used.add(detail);
      });
      assert.notEqual(atmosphereDetail(world, location.id, 'open'), atmosphereDetail(world, location.id, 'complete'));
    });
    assert.equal(used.size, 5);
    assert.equal(atmosphereDetail(world, 'nowhere', 'open'), 'a sound');
  }
});

test('the service sends the place\'s detail kind and the no-office rule, not the old fixed list (critique 1.7)', async (t) => {
  const { atmosphereDetail } = await import('../src/learning-service.js');
  const { runtime, provider, learnerId, service } = await setup(t);
  await service.getAtmosphere(learnerId);
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { ...envelope.world, completedEncounterIds: ['market_entrance_tutorial'] };
  await runtime.storage.save(envelope);
  await service.getAtmosphere(learnerId);
  const [open, complete] = provider.atmosphereCalls.map((messages) => messages[0].content);
  const rules = (text) => text.slice(text.indexOf('RULES:'));
  for (const [text, state] of [[open, 'open'], [complete, 'complete']]) {
    const detail = atmosphereDetail(service.content.world, 'market_entrance', state);
    assert.ok(rules(text).includes(`passing detail of this moment: ${detail}, drawn from`), state);
    assert.match(rules(text), /If that kind of detail does not fit this place, use a sound instead\./);
    assert.match(rules(text), /Avoid generic office humour: no approvals, complaints, forms, applications, fees, budgets or paperwork\./);
    assert.doesNotMatch(text, /\(a sound, a smell, a movement\)/);
  }
  assert.notEqual(open, complete);
});

test('buildAtmosphereMessages without a detail asks for a sound', () => {
  const content = loadGameContent({ language: 'es' });
  const location = content.world.locationsById.get('old_bookshop');
  const [system] = buildAtmosphereMessages({ language: content.language, styleGuide: content.styleGuide, location, state: 'x', partyNames: [] });
  assert.match(system.content, /passing detail of this moment: a sound, drawn from/);
});
