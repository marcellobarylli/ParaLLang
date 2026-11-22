// Round 146: the time of day and the weather of The Journey 2. A day of 45 minutes, rain 30 % of the time, no
// jumps, the same sky for the same clock and seed, and the narrator told what the sky is doing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WEATHER, partOfDay, weatherAt, weatherOf } from '../src/road/weather.js';
import { api, createRuntime } from './helpers.js';
import { loadGameContent } from '../src/content-loader.js';
import { RoadProvider, road, startHere } from './road-helpers.js';

test('a day turns in 45 minutes: the same sky one cycle later, dawn to night in order', () => {
  assert.equal(WEATHER.cycleMs, 45 * 60_000);
  const start = 1_800_000_000_000;
  const parts = [];
  for (let t = 0; t < WEATHER.cycleMs; t += 30_000) {
    const now = weatherAt(start + t, 4242);
    assert.equal(weatherAt(start + t + WEATHER.cycleMs, 4242).phase.toFixed(6), now.phase.toFixed(6));
    assert.equal(now.part, partOfDay(now.phase));
    if (parts.at(-1) !== now.part) parts.push(now.part);
  }
  // One turn through the day, starting wherever the clock stands.
  const order = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'];
  const from = order.indexOf(parts[0]);
  assert.deepEqual(parts.slice(0, 6), [...order.slice(from), ...order.slice(0, from)]);
  // The sun is up for a little over half of it, and the night is dark.
  assert.equal(weatherOf({ phase: 0.28 }).daylight, 1);
  assert.equal(weatherOf({ phase: 0.78 }).daylight, 0);
  assert.ok(weatherOf({ phase: 0.28 }).height > 0.99 && weatherOf({ phase: 0.78 }).height < -0.99);
  assert.ok(weatherOf({ phase: 0 }).twilight > 0.9 && weatherOf({ phase: WEATHER.dayShare }).twilight > 0.9, 'sunrise and sunset colour the sky');
  assert.equal(weatherOf({ phase: 0.02 }).rising, true);
  assert.equal(weatherOf({ phase: 0.54 }).rising, false);
  // Two roads are not at the same hour.
  assert.notEqual(weatherAt(start, 1).phase, weatherAt(start, 2).phase);
  assert.deepEqual(weatherAt(start, 7), weatherAt(start, 7));
});

test('it rains 30 % of the time, in spells that fade in and out, and a storm is the strong end of it', () => {
  for (const seed of [1, 4242, 99]) {
    let wet = 0;
    let storms = 0;
    let count = 0;
    for (let t = 0; t < WEATHER.cycleMs * 600; t += 9_000) {
      const now = weatherAt(t, seed);
      count += 1;
      if (now.rain > 0) wet += 1;
      if (now.storm) storms += 1;
      assert.ok(now.rain >= 0 && now.rain <= 1 && now.cloud >= 0 && now.cloud <= 1 && now.wind >= 0 && now.wind <= 1 && now.mist >= 0 && now.mist <= 1);
      if (now.rain > 0) assert.ok(now.cloud >= 0.75, 'it does not rain from a clear sky');
    }
    assert.ok(Math.abs(wet / count - WEATHER.rainShare) < 0.03, `seed ${seed}: rain ${(wet / count).toFixed(3)} of the time`);
    assert.ok(storms > 0 && storms < wet / 2, 'some of the rain is a storm, most is not');
  }
  // No jump from one second to the next, over two hours.
  let before = weatherAt(0, 4242);
  for (let t = 1000; t < 2 * 3_600_000; t += 1000) {
    const now = weatherAt(t, 4242);
    assert.ok(Math.abs(now.rain - before.rain) < 0.08, `rain jumps at ${t}`);
    assert.ok(Math.abs(now.cloud - before.cloud) < 0.08, `cloud jumps at ${t}`);
    assert.ok(Math.abs(now.daylight - before.daylight) < 0.02, `the light jumps at ${t}`);
    before = now;
  }
});

test('the weather has words: a label for the screen and a sentence for the narrator', () => {
  assert.equal(weatherOf({ phase: 0.28 }).label, 'Midday · clear');
  assert.equal(weatherOf({ phase: 0.75 }).label, 'Night · stars');
  assert.equal(weatherOf({ phase: 0.52, rain: 0.3 }).label, 'Dusk · light rain');
  assert.equal(weatherOf({ phase: 0.1, rain: 0.6 }).sky, 'heavy rain');
  assert.equal(weatherOf({ phase: 0.1, cloud: 0.8 }).sentence, 'It is morning and the sky is grey.');
  assert.equal(weatherOf({ phase: 0.75, rain: 0.9 }).sentence, 'It is night and a storm is overhead, with hard rain and lightning.');
  assert.equal(weatherOf({ phase: 0.75, rain: 0.9 }).storm, true);
  assert.equal(weatherOf({ phase: 0.99 }).part, 'dawn');
  assert.ok(weatherOf({ phase: 0.99 }).mist > 0.5, 'a mist at dawn');
  assert.equal(weatherOf({ phase: 0.3 }).mist, 0);
});

test('the narrator is told the time of day and the weather of the road, at the greeting and at each turn', async (t) => {
  const content = loadGameContent({ language: 'it' });
  const clock = new Date('2026-01-15T12:00:00.000Z');
  const runtime = await createRuntime({ language: 'it', content, provider: new RoadProvider(content), clock: () => clock, serviceOptions: { seedSource: () => 4242 } });
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  await road(runtime, learnerId);
  const started = await startHere(runtime, learnerId);
  const { sentence } = weatherAt(clock.getTime(), 4242);
  const greeting = runtime.provider.calls[0].messages.at(-1).content;
  assert.ok(greeting.includes(`in The Journey 2: Journathan Returns (again). ${sentence}`), greeting);
  await runtime.service.submitDialogue(learnerId, { encounterId: started.data.encounter.id, version: 1, attemptId: 'a1', message: 'Buongiorno!' });
  const turn = JSON.parse(runtime.provider.calls.at(-1).messages.at(-1).content.split('TURN DATA: ').at(-1));
  assert.equal(turn.weather, sentence);
  // An authored encounter of the market is told nothing of the kind.
  const market = await createRuntime({ language: 'it', content });
  t.after(market.close);
  const { data: { learnerId: other } } = await api(market, '/api/learner', { method: 'POST', body: {} });
  await api(market, '/api/encounter/start', { learnerId: other, method: 'POST', body: {} });
  assert.match(market.provider.calls[0].messages.at(-1).content, /in The Crumbling Market\."\}/);
});
