// Round 161 (issue #9): the whole journey is part of the save: every site walked to, in order, as node ids alone
// (the graph is the same graph every time it is read), served on its own route for the map's "Show Journey so far".
import assert from 'node:assert/strict';
import test from 'node:test';
import { createTerrain } from '../src/road/terrain.js';
import { graphFor } from '../src/road/graph.js';
import { ROAD } from '../src/road/service.js';
import { api } from './helpers.js';
import { moveTo, road, roadRuntime, talkHere } from './road-helpers.js';

const walkOf = (runtime, learnerId) => api(runtime, '/api/road/walk', { learnerId });

test('a new road\'s journey is its start; each walk adds the site walked to, and the save holds the list', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  const first = (await road(runtime, learnerId)).data.road;
  assert.equal(first.hops, 0);
  assert.deepEqual((await walkOf(runtime, learnerId)).data, { walk: { seed: 4242, nodes: [first.at], hops: 0, kept: 1 } });
  const visited = [first.at];
  let view = first;
  for (let n = 0; n < 6; n += 1) {
    if (n % 2 === 0) await talkHere(runtime, learnerId); // a walk needs no finished conversation
    view = (await road(runtime, learnerId)).data.road;
    const next = view.frontier[n % view.frontier.length].id;
    view = (await moveTo(runtime, learnerId, next, { leave: true })).data.road;
    visited.push(next);
    assert.equal(view.hops, n + 1);
  }
  const { walk } = (await walkOf(runtime, learnerId)).data;
  assert.deepEqual(walk, { seed: 4242, nodes: visited, hops: 6, kept: 7 });
  // The road's view does not carry the list (it is sent after every answer and walk).
  assert.equal(view.walk, undefined);
  // Every id is a site of the same graph, read again from the seed alone.
  const graph = graphFor(walk.seed, createTerrain);
  for (const id of walk.nodes) assert.ok(graph.node(id), `${id} is a site`);
  const save = await runtime.storage.load(learnerId);
  assert.deepEqual(save.road.walk, visited);
  assert.equal(save.road.hops, 6);
  assert.ok(save.road.walk.every((id) => typeof id === 'string'), 'node ids only');
});

test('a walk to the site the learner stands at adds nothing', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  const view = (await road(runtime, learnerId)).data.road;
  await moveTo(runtime, learnerId, view.at);
  assert.equal((await walkOf(runtime, learnerId)).data.walk.hops, 0);
});

test('a road saved before the walk was kept takes its trail for one', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  let view = (await road(runtime, learnerId)).data.road;
  for (let n = 0; n < 3; n += 1) view = (await moveTo(runtime, learnerId, view.frontier[0].id)).data.road;
  const envelope = await runtime.storage.load(learnerId);
  const { walk: _walk, hops: _hops, ...before } = envelope.road;
  await runtime.storage.save({ ...envelope, road: before });
  const { walk } = (await walkOf(runtime, learnerId)).data;
  assert.deepEqual(walk.nodes, envelope.road.trail);
  assert.equal(walk.hops, 3);
  // And the next walk goes on from it.
  view = (await road(runtime, learnerId)).data.road;
  await moveTo(runtime, learnerId, view.frontier[0].id);
  assert.equal((await walkOf(runtime, learnerId)).data.walk.hops, 4);
});

test('a new landscape starts a new journey, and a very long one keeps its last sites and its count', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  let view = (await road(runtime, learnerId)).data.road;
  view = (await moveTo(runtime, learnerId, view.frontier[0].id)).data.road;
  const fresh = (await api(runtime, '/api/road/reset', { learnerId, method: 'POST', body: {} })).data.road;
  assert.equal(fresh.hops, 0);
  assert.deepEqual((await walkOf(runtime, learnerId)).data.walk.nodes, [fresh.at]);
  // A walk longer than the list: the save is set up directly.
  assert.equal(ROAD.walk, 20000);
  const envelope = await runtime.storage.load(learnerId);
  const long = Array.from({ length: ROAD.walk }, (_, n) => `${n % 50},${Math.floor(n / 50)}`);
  await runtime.storage.save({ ...envelope, road: { ...envelope.road, walk: [...long.slice(0, -1), envelope.road.at], hops: 31000 } });
  view = (await road(runtime, learnerId)).data.road;
  await moveTo(runtime, learnerId, view.frontier[0].id);
  const { walk } = (await walkOf(runtime, learnerId)).data;
  assert.equal(walk.kept, ROAD.walk);
  assert.equal(walk.hops, 31001);
  assert.equal(walk.nodes.at(-1), view.frontier[0].id);
  // A save whose walk is not a list of sites loses its road, as with any other part of a road that cannot be read.
  await assert.doesNotReject(runtime.storage.save({ ...envelope, road: { ...envelope.road, walk: ['not a site'] } }));
  assert.equal((await runtime.storage.load(learnerId)).road, undefined);
});

test('the walk needs a learner', async (t) => {
  const { runtime } = await roadRuntime(t);
  assert.equal((await api(runtime, '/api/road/walk', { learnerId: '00000000-0000-4000-8000-000000000000' })).status, 400);
});
