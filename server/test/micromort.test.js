// Round 133: Micromort Mountain, the minimal version. One site, Eduardo's ledge, a location encounter in both packs; a run
// starts there, resolving Eduardo completes it, and the Ta Prohm run beside it is untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadGameContent } from '../src/content-loader.js';
import { PassingProvider, api, createRuntime, passingAnswers } from './helpers.js';

for (const language of ['it', 'es']) {
  test(`${language}: the mountain loads as one site of Eduardo's, on the micromort level, and his three words are the answers`, () => {
    const { dungeons, encounters, world, vocabularyById } = loadGameContent({ language });
    const mountain = dungeons.get('micromort_mountain');
    assert.equal(mountain.level, 'micromort');
    assert.deepEqual(mountain.sites.map((site) => [site.id, site.encounter, site.figure]), [['ankle_ledge', 'micromort_eduardo', 'hiker']]);
    assert.deepEqual([mountain.start, mountain.goal, mountain.paths], ['ankle_ledge', 'ankle_ledge', []]);
    const eduardo = encounters.get('micromort_eduardo');
    assert.equal(eduardo.character.name, 'Eduardo');
    assert.equal(eduardo.encounter.location, 'micromort_trail');
    assert.equal(world.locationsById.get('micromort_trail').encounter, 'micromort_eduardo');
    assert.deepEqual(eduardo.encounter.objectives.map((objective) => objective.id), ['offer_help', 'ask_top', 'ask_party']);
    // Each accepted example holds a form of the word the objective asks for.
    for (const objective of eduardo.encounter.objectives) {
      const forms = objective.required_target_groups.flat().flatMap((id) => vocabularyById.get(id).surface_variants.map((form) => form.toLowerCase()));
      for (const example of objective.accepted_examples) assert.ok(forms.some((form) => example.toLowerCase().includes(form)), `${objective.id}: ${example}`);
    }
    assert.equal(dungeons.get('ta_prohm').sites.length, 7); // the temple is as it was
  });

  test(`${language}: a run on the mountain starts at Eduardo, resolving him completes it, and Ta Prohm's run stays fresh`, async (t) => {
    const content = loadGameContent({ language });
    const runtime = await createRuntime({ language, content, provider: new PassingProvider(content) });
    t.after(runtime.close);
    const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
    const fresh = await api(runtime, '/api/dungeons/micromort_mountain/map?client=121', { learnerId });
    assert.equal(fresh.status, 200);
    assert.deepEqual(fresh.data.dungeon.sites.map((site) => [site.id, site.characterName, site.at]), [['ankle_ledge', 'Eduardo', [3, 22]]]);
    assert.deepEqual(fresh.data.progress, { run: 1, at: 'ankle_ledge', complete: false, clearedSiteIds: [], visitedSiteIds: ['ankle_ledge'], sites: { ankle_ledge: { state: 'current', cleared: false, reachable: false } } });

    const started = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { dungeonId: 'micromort_mountain', client: 121 } });
    assert.equal(started.status, 200, JSON.stringify(started.data.error));
    assert.equal(started.data.encounter.encounterId, 'micromort_eduardo');
    assert.equal(started.data.encounter.siteId, 'ankle_ledge');
    let current = started.data.encounter;
    for (const message of passingAnswers(content, 'micromort_eduardo')) {
      current = (await runtime.service.submitDialogue(learnerId, { encounterId: current.id, version: current.version, attemptId: randomUUID(), message })).encounter;
    }
    assert.equal(current.state, 'resolved');
    const done = (await api(runtime, '/api/dungeons/micromort_mountain/map?client=121', { learnerId })).data.progress;
    assert.deepEqual([done.complete, done.clearedSiteIds], [true, ['ankle_ledge']]);
    const temple = (await api(runtime, '/api/dungeons/ta_prohm/map?client=121', { learnerId })).data.progress;
    assert.deepEqual([temple.complete, temple.clearedSiteIds, temple.at], [false, [], 'face_gate']);
  });
}
