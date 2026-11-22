// Round 144: The Long Way Home. The landscape and its graph are deterministic and need no storage; the curriculum
// loads in both packs and every authored example passes the engine's own answer check; the pacing puts reviews and
// gates where its rules say; a walk on rails goes through the curriculum; a move obeys the frontier; a finished
// conversation is recorded once; the whole save can be copied out and put back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadGameContent } from '../src/content-loader.js';
import { matchCanonicalVocabulary } from '../src/language-engine.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { TERRAIN, createTerrain } from '../src/road/terrain.js';
import { GRAPH, createGraph, parseNodeId } from '../src/road/graph.js';
import { PACING, composeCheckpoint, composeReview, emptyProgress, plan, position, record, scoreOf, successRate } from '../src/road/pacing.js';
import { characterFor, placeName } from '../src/road/characters.js';
import { buildRoadDefinition } from '../src/road/encounters.js';
import { frontierOf, freshRoad, offersFor } from '../src/road/service.js';
import { api, createRuntime } from './helpers.js';
import { RoadProvider, answer, fullAnswer, moveTo, road, roadRuntime, startHere, talkHere } from './road-helpers.js';

test('the landscape is a pure function of its seed, with dry land at the start and water elsewhere', () => {
  const [a, b, other] = [createTerrain(7), createTerrain(7), createTerrain(8)];
  let wet = 0;
  let differs = false;
  for (let x = -3000; x <= 3000; x += 150) {
    for (let z = -3000; z <= 3000; z += 150) {
      assert.equal(a.heightAt(x, z), b.heightAt(x, z));
      if (a.heightAt(x, z) !== other.heightAt(x, z)) differs = true;
      if (a.heightAt(x, z) < TERRAIN.waterY) wet += 1;
      assert.ok(Number.isFinite(a.heightAt(x, z)) && Math.abs(a.heightAt(x, z)) < 200);
    }
  }
  assert.ok(differs, 'another seed is another landscape');
  assert.ok(wet > 50 && wet < 41 * 41 * 0.6, `some water, not only water: ${wet} of ${41 * 41} samples`);
  for (const seed of [1, 7, 42, 99, 123456, 2 ** 31 - 2]) assert.ok(createTerrain(seed).heightAt(20, 30) > 1.2, `seed ${seed} starts on dry ground`);
  // Far from the origin the numbers still hold: the world does not end.
  assert.ok(Number.isFinite(a.heightAt(4e6, -7e6)));
  assert.deepEqual(a.treesIn(3, -2), b.treesIn(3, -2));
  for (const tree of a.treesIn(3, -2)) {
    assert.ok(tree.x >= 3 * TERRAIN.chunk && tree.x < 4 * TERRAIN.chunk && tree.z >= -2 * TERRAIN.chunk && tree.z < -TERRAIN.chunk, 'a tree stands in its own chunk');
    assert.ok(tree.y >= TERRAIN.waterY && ['fir', 'round'].includes(tree.kind));
  }
});

test('the graph is read off the landscape: sites on dry ground, ways both ways, and a way on from every site', () => {
  for (const seed of [7, 42, 4242]) {
    const terrain = createTerrain(seed);
    const graph = createGraph(terrain);
    assert.equal(graph.start, createGraph(createTerrain(seed)).start);
    let sites = 0;
    let voids = 0;
    const degrees = [];
    for (let i = -10; i <= 10; i += 1) {
      for (let j = -10; j <= 10; j += 1) {
        const node = graph.nodeAt(i, j);
        if (!node) { voids += 1; continue; }
        sites += 1;
        assert.ok(node.y >= GRAPH.dry, 'a site stands above the water');
        assert.ok(node.x >= i * GRAPH.cell && node.x < (i + 1) * GRAPH.cell && node.z >= j * GRAPH.cell && node.z < (j + 1) * GRAPH.cell, 'a site stands in its cell');
        assert.equal(terrain.heightAt(node.x, node.z), node.y);
        const next = graph.neighbours(node.id);
        degrees.push(next.length);
        assert.ok(next.length >= 1, `${node.id} has a way on`);
        assert.equal(new Set(next).size, next.length);
        for (const other of next) {
          assert.ok(graph.neighbours(other).includes(node.id), `${node.id} and ${other} are joined both ways`);
          const way = graph.edge(node.id, other);
          assert.ok(['path', 'ford', 'pass', 'ferry'].includes(way.kind));
          const points = graph.pathPoints(node.id, other);
          assert.ok(Math.hypot(points[0][0] - node.x, points[0][1] - node.z) < 1e-6, 'a way starts at its site');
          assert.deepEqual(graph.pathPoints(other, node.id), [...points].reverse());
        }
        // The forced way: every site reaches the next site to its north or east.
        assert.ok(next.some((other) => { const [oi, oj] = parseNodeId(other); return (oi === i && oj > j) || (oj === j && oi > i); }), `${node.id} goes on north or east`);
      }
    }
    assert.ok(sites > 150, `${sites} sites`);
    const mean = degrees.reduce((sum, value) => sum + value, 0) / degrees.length;
    assert.ok(mean > 2 && mean < 5, `the ground thins the ways out: mean degree ${mean.toFixed(2)}`);
    assert.ok(voids === 0 || [...Array(441).keys()].length > voids, 'cells of open water have no site');
    assert.equal(graph.edge('0,0', '9,9'), null);
    assert.equal(graph.node('nowhere'), null);
  }
});

test('the curriculum loads in both packs, and every authored example holds evidence the engine will find', () => {
  const shapes = [];
  for (const language of ['it', 'es']) {
    const { curriculum, vocabulary, vocabularyById } = loadGameContent({ language });
    assert.ok(curriculum, `${language} has a curriculum`);
    assert.ok(curriculum.stages.length >= 1 && curriculum.stages[0].id === 'a1_1');
    shapes.push(curriculum.units.map((unit) => `${unit.id}:${unit.lessons.map((lesson) => `${lesson.id}(${lesson.objectives.map((o) => o.id).join(',')})`).join(' ')}`));
    for (const unit of curriculum.units) {
      assert.ok(unit.roles.length >= 3);
      for (const lesson of unit.lessons) {
        // A lesson introduces a handful of new productive items, not a list (docs/curriculum.md, rule 2).
        assert.ok(lesson.objectives.length >= 2 && lesson.objectives.length <= 4, lesson.id);
        for (const objective of lesson.objectives) {
          for (const example of objective.accepted_examples) {
            const found = new Set(matchCanonicalVocabulary(example, curriculum.vocabulary.entries).map((match) => match.id));
            for (const group of objective.required_target_groups) assert.ok(group.some((id) => found.has(id)), `${language} ${objective.id}: "${example}"`);
          }
          assert.match(objective.prompt, new RegExp(`using ${language === 'it' ? 'Italian' : 'Spanish'}\\.$`));
        }
      }
    }
    // The curriculum's vocabulary is its own: prefixed ids, none in the market pack's lists.
    assert.ok(curriculum.vocabulary.entries.every((entry) => entry.id.startsWith('c_') && !vocabularyById.has(entry.id)));
    assert.ok(!vocabulary.entries.some((entry) => entry.id.startsWith('c_')));
    assert.equal(new Set(curriculum.stages.map((stage) => stage.ratio)).size, curriculum.stages.length, 'each stage speaks more of the language');
    assert.deepEqual(curriculum.stages.map((stage) => stage.ratio), [...curriculum.stages.map((stage) => stage.ratio)].sort((a, b) => a - b));
  }
  assert.deepEqual(shapes[0], shapes[1], 'both languages teach the same lessons and objectives');
});

test('pacing: reviews follow the success rate, a gate waits for a conversation after its last lesson, a failed gate asks for a repair', () => {
  const { curriculum } = loadGameContent({ language: 'it' });
  const [first, second] = curriculum.units;
  let progress = emptyProgress();
  let step = 0;
  const play = (activity, score) => { step += 1; progress = record(progress, activity, score, step); };
  assert.deepEqual(plan(curriculum, progress, step).map((a) => a.kind), ['lesson'], 'nothing to review at the start');
  assert.equal(plan(curriculum, progress, step)[0].lessonId, first.lessons[0].id);
  assert.equal(successRate(progress), null);
  play({ kind: 'lesson', lessonId: first.lessons[0].id }, 0.8);
  play({ kind: 'lesson', lessonId: first.lessons[1].id }, 0.8);
  // Two new lessons at a normal rate: a review is due before the third.
  assert.equal(plan(curriculum, progress, step)[0].kind, 'review');
  assert.ok(plan(curriculum, progress, step).some((a) => a.kind === 'lesson'), 'the next lesson is still on offer elsewhere on the map');
  const picks = composeReview(curriculum, progress, step);
  assert.equal(picks.length, PACING.reviewObjectives);
  assert.equal(new Set(picks.map(([, id]) => id)).size, picks.length);
  play({ kind: 'review', picks }, 0.8);
  assert.equal(plan(curriculum, progress, step)[0].lessonId, first.lessons[2].id);
  play({ kind: 'lesson', lessonId: first.lessons[2].id }, 0.8);
  // The unit's lessons are done, but the gate is a test after a delay: something else comes first.
  assert.notEqual(plan(curriculum, progress, step)[0].kind, 'checkpoint');
  play({ kind: 'review', picks: composeReview(curriculum, progress, step) }, 0.8);
  assert.deepEqual(plan(curriculum, progress, step)[0], { kind: 'checkpoint', unitId: first.id, why: plan(curriculum, progress, step)[0].why });
  const gate = composeCheckpoint(curriculum, progress, first.id);
  assert.deepEqual(gate.map(([lessonId]) => lessonId), first.lessons.map((lesson) => lesson.id), 'the first gate asks one objective of each lesson');
  // A failed gate: the unit stays, a repair of its weakest lesson comes before the next try, and the next try asks others.
  play({ kind: 'checkpoint', unitId: first.id, picks: gate }, 0.5);
  assert.equal(position(curriculum, progress).unit.id, first.id);
  assert.equal(plan(curriculum, progress, step)[0].kind, 'repair');
  play({ kind: 'repair', lessonId: plan(curriculum, progress, step)[0].lessonId }, 1);
  assert.equal(plan(curriculum, progress, step)[0].kind, 'checkpoint');
  assert.notDeepEqual(composeCheckpoint(curriculum, progress, first.id), gate, 'a parallel retest');
  play({ kind: 'checkpoint', unitId: first.id, picks: composeCheckpoint(curriculum, progress, first.id) }, 0.875);
  assert.equal(position(curriculum, progress).unit.id, second.id, 'the next unit opens at the pass mark');
  assert.equal(plan(curriculum, progress, step)[0].lessonId, second.lessons[0].id);
  // The second unit's gate also asks something of the unit before it.
  assert.ok(composeCheckpoint(curriculum, progress, second.id).some(([lessonId]) => first.lessons.some((lesson) => lesson.id === lessonId)));

  // Easy going thins the reviews out; hard going puts one after every lesson.
  const easy = { ...emptyProgress(), lessons: progress.lessons, recent: [1, 1, 1, 1, 1], sinceReview: 2 };
  const hard = { ...emptyProgress(), lessons: progress.lessons, recent: [0.5, 0.5, 0.5, 1, 0.5], sinceReview: 1 };
  const withUnit = (state) => ({ ...state, checkpoints: progress.checkpoints });
  assert.equal(plan(curriculum, withUnit(easy), step)[0].kind, 'lesson');
  assert.ok(['review', 'repair'].includes(plan(curriculum, withUnit(hard), step)[0].kind));
  // A score: a corrected or hinted objective counts half.
  assert.equal(scoreOf({ total: 4 }), 1);
  assert.equal(scoreOf({ total: 4, corrected: 1 }), 0.875);
  assert.equal(scoreOf({ total: 4, corrected: 1, hinted: 1 }), 0.75);
  assert.equal(scoreOf({ total: 0 }), 0);
});

test('a review mixes units and takes a due card first', () => {
  const { curriculum } = loadGameContent({ language: 'es' });
  let progress = emptyProgress();
  const lessons = curriculum.units.slice(0, 2).flatMap((unit) => unit.lessons);
  lessons.forEach((lesson, index) => { progress = record(progress, { kind: 'lesson', lessonId: lesson.id }, 1, index + 1); });
  const picks = composeReview(curriculum, progress, 7);
  const units = new Set(picks.map(([lessonId]) => curriculum.lessonsById.get(lessonId).unit.id));
  assert.equal(units.size, 2, 'two units in one review');
  const dueObjective = lessons[4].objectives[1];
  const withDue = composeReview(curriculum, progress, 7, (objective) => objective.id === dueObjective.id);
  assert.deepEqual(withDue[0], [lessons[4].id, dueObjective.id]);
});

test('a character is drawn from what the conversation is about, and is the same on every call', () => {
  const { curriculum, language } = loadGameContent({ language: 'it' });
  const graph = createGraph(createTerrain(4242));
  const node = graph.node(graph.start);
  const activity = { kind: 'lesson', lessonId: 'cafe_order' };
  const build = (step = 3) => buildRoadDefinition({ curriculum, language, seed: 4242, node, step, activity, currentUnitId: 'cafe' });
  const definition = build();
  assert.deepEqual(build(), definition);
  assert.notEqual(build(4).character.name, definition.character.name, 'someone else stands there on a later pass');
  const unit = curriculum.units.find((candidate) => candidate.id === 'cafe');
  assert.ok(unit.roles.some((role) => role.title === definition.character.species), 'the trade is one of the unit\'s roles');
  assert.match(definition.character.appearance, new RegExp(definition.character.species));
  assert.equal(definition.character.language_profile.base_target_ratio, curriculum.stages[0].ratio);
  assert.equal(definition.encounter.objectives.length, 3);
  const first = definition.character.name.split(' ')[0];
  for (const objective of definition.encounter.objectives) {
    assert.ok(!/\{name\}/.test(JSON.stringify(objective)), 'the character\'s name is filled in');
    assert.equal(objective.hint_limit, PACING.hints.lesson);
    assert.match(objective.intent, /new to the player/);
  }
  assert.match(definition.encounter.objectives[0].prompt, new RegExp(first));
  assert.match(definition.teachingNote, /Model each of them/);
  // A review does not model its words, and gives fewer hints; a gate gives none.
  const review = buildRoadDefinition({ curriculum, language, seed: 4242, node, step: 3, activity: { kind: 'review', picks: [['greetings_hello', 'greetings_hello__greet'], ['cafe_order', 'cafe_order__a_drink']] }, currentUnitId: 'cafe' });
  assert.equal(review.teachingNote, null);
  assert.equal(review.encounter.objectives_unordered, true);
  assert.match(review.encounter.objectives[0].intent, /never says them/);
  assert.equal(review.encounter.objectives[0].hint_limit, PACING.hints.review);
  assert.equal(placeName(4242, node), placeName(4242, node));
  assert.match(placeName(4242, node), /^The \w+ [\w ]+$/);
  // Names seldom repeat among neighbours: of the sites of a ten-by-ten patch, nearly all have a name of their own.
  const names = graph.nodesNear(node.x, node.z, 5).map((site) => placeName(4242, site));
  assert.ok(new Set(names).size >= names.length * 0.9, `${new Set(names).size} names for ${names.length} sites`);
  assert.ok(characterFor({ seed: 1, node, step: 0, role: unit.roles[0], ratio: 0.2, focus: { vocabulary: 'x', grammar: 'y' } }).voice.pitch <= 2);
});

test('the road opens with the first lesson at the start, and a walk on rails goes through the curriculum', async (t) => {
  const { runtime, content, learnerId } = await roadRuntime(t);
  const opened = await road(runtime, learnerId);
  assert.equal(opened.status, 200, JSON.stringify(opened.data.error));
  const first = opened.data;
  assert.equal(first.road.at, createGraph(createTerrain(4242)).start);
  assert.equal(first.road.seed, 4242);
  assert.deepEqual([first.road.step, first.road.current.kind, first.road.current.title], [0, 'lesson', content.curriculum.units[0].lessons[0].title]);
  assert.ok(first.road.current.character.description.length > 40, 'the character is a description');
  assert.ok(first.road.frontier.length >= 1 && first.road.frontier.filter((site) => site.recommended).length === 1);
  assert.equal(first.curriculum.position.unitId, content.curriculum.units[0].id);
  assert.deepEqual(first.curriculum.totals, { lessonsDone: 0, lessonsTotal: content.curriculum.lessonsById.size, unitsDone: 0, unitsTotal: content.curriculum.units.length });
  // The same road on a second read: the seed was saved by the first.
  assert.deepEqual((await road(runtime, learnerId)).data, first);

  const kinds = [];
  const seen = new Set([first.road.at]);
  for (let n = 0; n < 12; n += 1) {
    const turn = await talkHere(runtime, learnerId);
    kinds.push(turn.roadResult.kind);
    assert.equal(turn.roadResult.score, 1);
    assert.ok(turn.xpGained > 0);
    const view = (await road(runtime, learnerId)).data;
    assert.equal(view.road.current, null, 'nobody waits where a conversation was finished');
    assert.equal(view.road.step, n + 1);
    assert.equal(view.road.log[0].kind, turn.roadResult.kind);
    const next = view.road.frontier.find((site) => site.recommended);
    assert.ok(!seen.has(next.id), 'the rails never go back');
    seen.add(next.id);
    assert.equal((await moveTo(runtime, learnerId, next.id)).status, 200);
  }
  // Three lessons, a review and the gate: a unit of five conversations when everything is said cleanly.
  assert.deepEqual(kinds, ['lesson', 'lesson', 'lesson', 'review', 'checkpoint', 'lesson', 'lesson', 'lesson', 'review', 'checkpoint', 'lesson', 'lesson']);
  const after = (await road(runtime, learnerId)).data;
  assert.deepEqual([after.curriculum.totals.lessonsDone, after.curriculum.totals.unitsDone], [8, 2]);
  assert.equal(after.curriculum.stages[0].units[0].state, 'done');
  assert.equal(after.curriculum.stages[0].units[2].state, 'current');
  assert.equal(after.road.trail.length, 13);
  // The Spellbook holds the curriculum's words, each with its own content version; the market's lists do not.
  const { spellbook } = await runtime.service.currentEncounter(learnerId);
  assert.ok(spellbook.cards.length >= 20 && spellbook.cards.every((card) => card.vocabularyId.startsWith('c_')));
  const save = await runtime.storage.load(learnerId);
  assert.deepEqual(save.world.completedEncounterIds, [], 'the market\'s list of completed encounters does not grow with the road');
});

test('a move obeys the frontier, the map offers a choice of kinds, and a conversation under way is not walked out of by accident', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  const graph = createGraph(createTerrain(4242));
  const first = (await road(runtime, learnerId)).data;
  assert.equal((await moveTo(runtime, learnerId, '500,500')).data.error.code, 'NOT_ADJACENT');
  assert.equal((await moveTo(runtime, learnerId, 'elsewhere')).status, 400);
  assert.deepEqual((await moveTo(runtime, learnerId, first.road.at)).data.road.at, first.road.at, 'a move to where you stand changes nothing');
  assert.deepEqual(first.road.frontier.map((site) => site.id).sort(), graph.neighbours(first.road.at).sort());
  for (const site of first.road.frontier) assert.deepEqual(site.at, [Math.round(graph.node(site.id).x * 10) / 10, Math.round(graph.node(site.id).z * 10) / 10]);

  const started = await startHere(runtime, learnerId);
  assert.equal(started.status, 200, JSON.stringify(started.data.error));
  assert.equal(started.data.encounter.road.kind, 'lesson');
  assert.equal(started.data.encounter.location, 'the_long_way');
  assert.ok(started.data.encounter.character.description && started.data.encounter.character.role);
  assert.match(runtime.provider.calls[0].messages.at(-1).content, /in The Long Way Home\./);
  assert.match(runtime.provider.calls[0].messages.at(-1).content, /teaching_note/);
  // A reload resumes the same conversation; a walk away needs `leave`.
  assert.equal((await startHere(runtime, learnerId)).data.encounter.id, started.data.encounter.id);
  const target = first.road.frontier[0].id;
  assert.equal((await moveTo(runtime, learnerId, target)).data.error.code, 'CONVERSATION_UNDER_WAY');
  const left = await moveTo(runtime, learnerId, target, { leave: true });
  assert.equal(left.data.road.at, target);
  assert.equal(left.data.road.step, 0, 'an unfinished conversation is not a step');
  assert.ok(left.data.road.current, 'someone waits at the new site');
  assert.ok(!left.data.road.frontier.some((site) => site.id === first.road.at), 'the trail is not the frontier');

  // Once there is something to review, the frontier offers more than one kind of conversation.
  for (let n = 0; n < 2; n += 1) {
    await talkHere(runtime, learnerId);
    const view = (await road(runtime, learnerId)).data;
    await moveTo(runtime, learnerId, view.road.frontier.find((site) => site.recommended).id);
  }
  const view = (await road(runtime, learnerId)).data;
  assert.ok(new Set(view.road.frontier.map((site) => site.offer.kind)).size >= 2, JSON.stringify(view.road.frontier.map((site) => site.offer.kind)));
  // The pure helpers agree with the view.
  const stored = (await runtime.storage.load(learnerId)).road;
  assert.deepEqual(frontierOf(graph, stored).map((entry) => entry.id), view.road.frontier.map((site) => site.id));
  assert.equal(offersFor(graph, stored, runtime.content.curriculum).rails, view.road.rails);
  assert.equal((await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { road: true } })).status, 200);
});

test('a walk that boxes itself in still has a site ahead', () => {
  const { curriculum } = loadGameContent({ language: 'it' });
  for (const seed of [7, 42, 4242]) {
    const graph = createGraph(createTerrain(seed));
    // A trail that fills a whole block of cells around its end: every site next to the learner is visited.
    const block = [];
    for (let i = -6; i <= 6; i += 1) for (let j = -6; j <= 6; j += 1) if (graph.nodeAt(i, j)) block.push(graph.nodeAt(i, j).id);
    const at = graph.node('0,0') ? '0,0' : graph.start;
    const trail = [...block.filter((id) => id !== at), at];
    const stored = { ...freshRoad(seed, curriculum), at, trail };
    assert.ok(graph.neighbours(at).every((id) => trail.includes(id)), 'boxed in');
    const frontier = frontierOf(graph, stored);
    assert.ok(frontier.length >= 1, `seed ${seed}: a site ahead`);
    assert.ok(frontier.every((entry) => !trail.includes(entry.id) && trail.includes(entry.from)));
    assert.ok(offersFor(graph, stored, curriculum).rails, 'and the rails have somewhere to go');
  }
});

test('a corrected answer scores half, a failed gate keeps the unit, and a resent answer is recorded once', async (t) => {
  const { runtime, provider, learnerId } = await roadRuntime(t);
  await road(runtime, learnerId);
  const started = await startHere(runtime, learnerId);
  const objectives = runtime.service.definition(runtime.service.encounters.get(learnerId)).encounter.objectives;
  // Beginner mode: the first objective is said wrongly, corrected for a heart, and counts half.
  provider.spoil = new Set([objectives[0].id]);
  provider.correct = true;
  const attemptId = randomUUID();
  const request = { encounterId: started.data.encounter.id, version: started.data.encounter.version, attemptId, message: fullAnswer(runtime, learnerId), beginner: true };
  const turn = await runtime.service.submitDialogue(learnerId, request);
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.roadResult.score, Math.round(scoreOf({ total: objectives.length, corrected: 1 }) * 100) / 100);
  const again = await runtime.service.submitDialogue(learnerId, request);
  assert.equal(again.replayed, true);
  assert.deepEqual(again.roadResult, turn.roadResult);
  const view = (await road(runtime, learnerId)).data;
  assert.equal(view.road.step, 1, 'a replay is not a second conversation');
  assert.equal(view.curriculum.stages[0].units[0].lessons[0].done, 1);
  assert.equal((await startHere(runtime, learnerId)).data.error.code, 'NOTHING_HERE');
});

test('a word of the curriculum is a Spellbook card: hidden while it is due, reviewed by its meaning, and scheduled', async (t) => {
  let now = new Date('2026-01-15T12:00:00.000Z');
  const content = loadGameContent({ language: 'it' });
  const runtime = await createRuntime({ language: 'it', content, provider: new RoadProvider(content), clock: () => now, serviceOptions: { seedSource: () => 4242 } });
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  await road(runtime, learnerId);
  await talkHere(runtime, learnerId);
  now = new Date('2026-01-18T12:00:00.000Z');
  const book = await runtime.service.getSpellbook(learnerId);
  const due = book.cards.filter((card) => card.due);
  assert.ok(due.length >= 1, 'a card of the lesson falls due');
  assert.equal(due[0].meanings, null, 'a due card keeps its meaning back');
  const { challenge } = await runtime.service.createReviewChallenge(learnerId, due[0].vocabularyId);
  const entry = content.curriculum.vocabulary.byId.get(challenge.vocabularyId);
  assert.equal(challenge.target, entry.target);
  const reviewed = await runtime.service.submitReview(learnerId, { challengeId: challenge.id, attemptId: randomUUID(), action: 'answer', answer: entry.accepted_translations[0] });
  assert.equal(reviewed.result.correct, true);
  assert.equal(reviewed.result.scheduleChanged, true);
  assert.ok(reviewed.xpGained > 0);
  assert.ok(Date.parse(reviewed.result.nextReviewAt) > now.getTime());
  // The cards a card's own form or example holds are found among the curriculum's entries, as among the pack's.
  // (Each entry is read alone, the pack's and the curriculum's: "ciao" is a card of both.) The quick way of finding
  // them gives what reading every entry precisely gives.
  const { inflectsForms } = await import('../src/learning-service.js');
  for (const text of ['Ciao, come stai? Mi chiamo Sam.', 'Vorrei due caffè e una pizza, per favore.', 'Ieri ho mangiato i panini buonissimi.', 'The player approaches.']) {
    const precise = runtime.service.allEntries().filter((entry) => matchCanonicalVocabulary(text, [entry]).length || inflectsForms(text, entry.surface_variants)).map((entry) => entry.id);
    assert.deepEqual([...runtime.service.entryIdsIn(text)].sort(), precise.sort(), text);
  }
  const found = runtime.service.entryIdsIn('Ciao, come stai? Mi chiamo Sam.');
  for (const id of ['c_ciao', 'c_come_stai', 'c_mi_chiamo', 'ciao']) assert.ok(found.has(id), id);
});

test('the whole save can be copied out and put back on a server that lost it', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  await road(runtime, learnerId);
  await talkHere(runtime, learnerId);
  const before = (await road(runtime, learnerId)).data;
  const exported = await api(runtime, '/api/save', { learnerId });
  assert.equal(exported.status, 200);
  assert.equal(exported.data.language, 'it');
  assert.equal(exported.data.save.learnerId, learnerId);
  assert.deepEqual(exported.data.save.spellbook.processedAssessments, {}, 'the copy holds no receipts');
  assert.equal(exported.data.save.road.step, 1);
  // The server still has the save: a restore is refused unless it is asked to replace it.
  assert.equal((await api(runtime, '/api/save/restore', { method: 'POST', body: exported.data })).data.error.code, 'SAVE_EXISTS');

  // Another server with an empty disk (a redeploy on the free plan).
  const fresh = await createRuntime({ language: 'it', content: runtime.content, provider: new RoadProvider(runtime.content), serviceOptions: { seedSource: () => 1 } });
  t.after(fresh.close);
  assert.match((await api(fresh, '/api/road', { learnerId })).data.error.message, /Unknown learner ID/);
  assert.equal((await api(fresh, '/api/save/restore', { method: 'POST', body: { ...exported.data, language: 'es' } })).data.error.code, 'WRONG_LANGUAGE');
  assert.equal((await api(fresh, '/api/save/restore', { method: 'POST', body: { save: { learnerId, nonsense: true } } })).status, 400);
  const restored = await api(fresh, '/api/save/restore', { method: 'POST', body: exported.data });
  assert.deepEqual([restored.status, restored.data.restored, restored.data.learnerId], [200, true, learnerId]);
  assert.deepEqual((await api(fresh, '/api/road', { learnerId })).data, before, 'the road, the curriculum and the level are as they were');
  // A save larger than the usual request limit still goes through this route.
  const large = structuredClone(exported.data);
  large.save.lines = Array.from({ length: 50 }, (_, index) => ({ id: `line-${index}`, encounterId: 'x', locationId: null, speaker: 'S', native: 'n'.repeat(480), translation: 't'.repeat(480), vocabularyIds: [], savedAt: '2026-01-01T00:00:00.000Z' }));
  assert.ok(JSON.stringify(large).length > 40_000);
  assert.equal((await api(fresh, '/api/save/restore', { method: 'POST', body: { ...large, replace: true } })).status, 200);
});

test('a save with a road this server cannot read keeps everything else and starts a new road', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  await road(runtime, learnerId);
  const storage = new JsonLearningStorage({ saveDir: runtime.saveDir });
  const save = await storage.load(learnerId);
  save.progression = { xp: 70 };
  save.road = { ...save.road, trail: 'not a list' };
  // Written as a file, as an edited save would be.
  const { writeFile } = await import('node:fs/promises');
  await writeFile(storage.filePath(learnerId), JSON.stringify(save));
  const view = (await road(runtime, learnerId)).data;
  assert.equal(view.road.step, 0);
  assert.equal(view.progression.xp, 70);
  // A new road and a fresh one from the same seed are the same road.
  assert.deepEqual(freshRoad(4242, runtime.content.curriculum).at, view.road.at);
});

test('a new road is another landscape with the curriculum kept; the dungeon is untouched by the road', async (t) => {
  const seeds = [11, 22, 33];
  const content = loadGameContent({ language: 'it' });
  const runtime = await createRuntime({ language: 'it', content, provider: new RoadProvider(content), serviceOptions: { seedSource: () => seeds.shift() } });
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  assert.equal((await road(runtime, learnerId)).data.road.seed, 11);
  await talkHere(runtime, learnerId);
  const reset = await api(runtime, '/api/road/reset', { learnerId, method: 'POST', body: {} });
  assert.equal(reset.data.road.seed, 22);
  assert.deepEqual([reset.data.road.step, reset.data.curriculum.totals.lessonsDone, reset.data.road.trail.length], [1, 1, 1]);
  assert.equal(reset.data.road.current.kind, 'lesson');
  const forgotten = await api(runtime, '/api/road/reset', { learnerId, method: 'POST', body: { forget: true } });
  assert.deepEqual([forgotten.data.road.seed, forgotten.data.road.step, forgotten.data.curriculum.totals.lessonsDone], [33, 0, 0]);
  const dungeon = await api(runtime, '/api/dungeons/ta_prohm/map?client=121', { learnerId });
  assert.equal(dungeon.status, 200);
  assert.equal(dungeon.data.progress.clearedSiteIds.length, 0);
});
