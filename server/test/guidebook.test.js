// Round 157 (issue #5): the guidebook. Its entries are data; an entry is entered the first time what it speaks of
// happens, is kept in the save, is told unread where the narrator speaks, and is read when the guidebook is opened.
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGameContent } from '../src/content-loader.js';
import { entriesFor } from '../src/narration.js';
import { api, createRuntime } from './helpers.js';
import { moveTo, road, roadRuntime, talkHere } from './road-helpers.js';

const content = loadGameContent({ language: 'it' });
const guidebook = (runtime, learnerId) => api(runtime, '/api/guidebook', { learnerId });
const read = (runtime, learnerId) => api(runtime, '/api/guidebook/read', { learnerId, method: 'POST', body: {} });

test('the entries are content: a title, a text and what enters each', () => {
  assert.deepEqual(content.guide.map((entry) => entry.id), ['the_road', 'turmeric_text', 'the_long_way_round', 'talked_past', 'second_tellings', 'the_gate', 'the_breath']);
  for (const entry of content.guide) {
    assert.ok(entry.title.length > 2 && entry.text.length > 40);
    assert.equal(typeof entry.when.event, 'string');
    assert.doesNotMatch(entry.text, /\b(web|graph|stitched to|other worlds?|are threads)\b/i, `${entry.id} explains nothing of the world`);
  }
});

test('which entries an event enters: those that fit and are not had yet', () => {
  const ids = (event, have) => entriesFor(content.guide, event, have).map((entry) => entry.id);
  assert.deepEqual(ids({ event: 'road_enter' }), ['the_road']);
  assert.deepEqual(ids({ event: 'road_enter' }, { the_road: { at: 'x', read: true } }), []);
  assert.deepEqual(ids({ event: 'road_arrive', way: 'path', cover: 'meadow', kind: 'lesson' }), []);
  assert.deepEqual(ids({ event: 'road_arrive', way: 'ford', cover: 'shore', kind: 'review' }), ['second_tellings']);
  assert.deepEqual(ids({ event: 'road_arrive', way: 'path', cover: 'meadow', kind: 'checkpoint' }), ['the_gate']);
  assert.deepEqual(ids({ event: 'site_arrive', dungeon: 'the_kiln', site: 'library' }), ['talked_past']);
});

test('a new learner has an empty guidebook; the first step on the road enters "The road", unread, and the road\'s view tells it', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t, { streamlined: true }) // no mode call: it would make the road;
  assert.deepEqual((await guidebook(runtime, learnerId)).data, { guidebook: { entries: [], total: 7, fragments: [] } });
  const view = (await road(runtime, learnerId)).data;
  assert.equal(view.guidebook.count, 1);
  assert.deepEqual(view.guidebook.unread.map(({ id, title, unread }) => [id, title, unread]), [['the_road', 'The road', true]]);
  assert.match(view.guidebook.unread[0].segments[0].text, /^No road ends\./);
  // The save holds it.
  const save = await runtime.storage.load(learnerId);
  assert.deepEqual(Object.keys(save.guidebook), ['the_road']);
  assert.equal(save.guidebook.the_road.read, false);
  // Opening the guidebook lists it, and reading marks it read; it is not told again.
  const listed = (await guidebook(runtime, learnerId)).data.guidebook;
  assert.deepEqual(listed.entries.map(({ id, unread }) => [id, unread]), [['the_road', true]]);
  const after = (await read(runtime, learnerId)).data.guidebook;
  assert.deepEqual(after.entries.map(({ id, unread }) => [id, unread]), [['the_road', false]]);
  const again = (await road(runtime, learnerId)).data.guidebook;
  assert.deepEqual({ count: again.count, unread: again.unread }, { count: 1, unread: [] });
  assert.equal((await runtime.storage.load(learnerId)).guidebook.the_road.read, true);
  // Reading twice writes nothing more and answers the same.
  assert.deepEqual((await read(runtime, learnerId)).data.guidebook, after);
});

test('an arrival at a review enters "Old words", once', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  await road(runtime, learnerId);
  let entered = null;
  for (let step = 0; step < 12 && !entered; step += 1) {
    await talkHere(runtime, learnerId);
    const view = (await road(runtime, learnerId)).data.road;
    const review = view.frontier.find((site) => site.offer.kind === 'review');
    const moved = (await moveTo(runtime, learnerId, (review ?? view.frontier.find((site) => site.recommended) ?? view.frontier[0]).id)).data;
    if (review) entered = moved.guidebook.unread.map((entry) => entry.id);
  }
  assert.ok(entered, 'a review was offered within twelve conversations');
  assert.ok(entered.includes('second_tellings'));
  const save = await runtime.storage.load(learnerId);
  assert.equal(save.guidebook.second_tellings.read, false);
});

test('a dungeon: the first conversation at a site enters "Being let past"; reading the map alone enters nothing', async (t) => {
  const runtime = await createRuntime({ language: 'it' });
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const read = (await api(runtime, '/api/dungeons/ta_prohm/map?client=121', { learnerId })).data;
  assert.deepEqual({ count: read.guidebook.count, unread: read.guidebook.unread }, { count: 0, unread: [] });
  assert.equal((await runtime.storage.load(learnerId)).guidebook, undefined);
  const started = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { dungeonId: 'ta_prohm', client: 121 } })).data;
  assert.deepEqual(started.guidebook.unread.map((entry) => entry.id), ['talked_past']);
  const at = (await runtime.storage.load(learnerId)).guidebook.talked_past.at;
  // A walk on enters nothing more, and neither does another dungeon.
  const moved = (await api(runtime, '/api/dungeons/ta_prohm/move', { learnerId, method: 'POST', body: { siteId: 'buttress_tree', client: 121, leave: true } })).data;
  assert.equal(moved.guidebook.count, 1);
  assert.equal((await api(runtime, '/api/dungeons/the_kiln/map?client=121', { learnerId })).data.guidebook.count, 1);
  assert.equal((await runtime.storage.load(learnerId)).guidebook.talked_past.at, at);
});

test('the guidebook needs a learner, and a save keeps only what a guidebook holds', async (t) => {
  const runtime = await createRuntime({ language: 'it' });
  t.after(runtime.close);
  assert.equal((await api(runtime, '/api/guidebook', { learnerId: '00000000-0000-4000-8000-000000000000' })).status, 400);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const envelope = await runtime.storage.load(learnerId);
  await runtime.storage.save({ ...envelope, guidebook: { the_road: { at: '2026-01-15T12:00:00.000Z', read: 'yes' }, bad: 'x', worse: { at: 'never' } } });
  assert.deepEqual((await runtime.storage.load(learnerId)).guidebook, { the_road: { at: '2026-01-15T12:00:00.000Z', read: false } });
  // An entry the content no longer has stays in the save and is not listed.
  await runtime.storage.save({ ...envelope, guidebook: { gone: { at: '2026-01-15T12:00:00.000Z', read: false } } });
  assert.deepEqual((await guidebook(runtime, learnerId)).data.guidebook.entries, []);
});

// Round 214: the breathing while a reply is awaited. The page tells its entry itself, before the first breathing, so
// every view carries it ahead of time; the page then asks for it to be entered, as read.
test('"A breath while you wait" is carried ahead by every view until the page enters it; entered, it is read and no longer ahead', async (t) => {
  const runtime = await createRuntime({ language: 'it' });
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const enter = (body) => api(runtime, '/api/guidebook/enter', { learnerId, method: 'POST', body });
  const before = (await api(runtime, '/api/dungeons/ta_prohm/map?client=121', { learnerId })).data.guidebook;
  assert.deepEqual(before.ahead.map(({ id, title, event }) => [id, title, event]), [['the_breath', 'A breath while you wait', 'breath_wait']]);
  // The owner's wording (2026-11-28; round 218: the tap and the breath told apart), the same on the card before the first breathing and in the guidebook.
  assert.equal(before.ahead[0].segments[0].text, 'The world is fast. Sometimes it is good to be slow. Nobody here answers at once, and the wait is for breathing. A light swells: hold the panel, anywhere, and breathe in with it. Feel your belly expand. Where the ring glows, let go of the tap as you let go of the breath, and breathe out as the light sinks. Let it go. Hold the tap once more with the following in-breath, where the ring glows next.');
  assert.deepEqual((await guidebook(runtime, learnerId)).data.guidebook.entries, []); // not in the guidebook yet
  const entered = await enter({ event: 'breath_wait' });
  assert.equal(entered.status, 200);
  assert.deepEqual(entered.data.guidebook, { count: 1, unread: [] }); // told by the page: read, and nothing ahead
  const save = await runtime.storage.load(learnerId);
  assert.equal(save.guidebook.the_breath.read, true);
  assert.deepEqual((await guidebook(runtime, learnerId)).data.guidebook.entries.map(({ id, unread }) => [id, unread]), [['the_breath', false]]);
  assert.equal((await api(runtime, '/api/dungeons/ta_prohm/map?client=121', { learnerId })).data.guidebook.ahead, undefined);
  // Again changes nothing; only the page's own events may be entered this way.
  assert.deepEqual((await enter({ event: 'breath_wait' })).data.guidebook, { count: 1, unread: [] });
  assert.equal((await runtime.storage.load(learnerId)).guidebook.the_breath.at, save.guidebook.the_breath.at);
  for (const body of [{ event: 'road_enter' }, { event: 'site_arrive' }, {}]) {
    const refused = await enter(body);
    assert.equal(refused.status, 400);
    assert.equal(refused.data.error.code, 'UNKNOWN_GUIDE_EVENT');
  }
  assert.deepEqual(Object.keys((await runtime.storage.load(learnerId)).guidebook), ['the_breath']);
});
