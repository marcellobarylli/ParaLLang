// Round 145: saves written to GitHub. Against a GitHub in memory (the contents and git-data routes the server
// uses): a save is copied to a branch as a JSON file that says where the learner is in the curriculum and does not
// hold the learner's id; a server with an empty disk has the learner back from that file; GitHub being down never
// fails a turn; a file changed underneath is written again; a removed learner is removed there too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { GitHubSaves, MirroredLearningStorage, githubSavesConfig, saveFilePath } from '../src/github-saves.js';
import { saveSummary } from '../src/road/service.js';
import { api, createRuntime, makeTempDir } from './helpers.js';
import { RoadProvider, road, setMode, talkHere } from './road-helpers.js';

// GitHub, as far as the server uses it: one repository, branches of files, commits with their messages.
function fakeGitHub({ repo = 'owner/saves' } = {}) {
  const state = { branches: new Map(), commits: [], calls: [], down: false, objects: new Map() };
  const sha = (text) => createHash('sha1').update(text).digest('hex');
  const reply = (status, data) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
  const fetchImpl = async (url, { method = 'GET', headers = {}, body } = {}) => {
    const { pathname, searchParams } = new URL(url);
    state.calls.push(`${method} ${pathname}`);
    if (state.down) return reply(503, { message: 'Service unavailable' });
    if (headers.Authorization !== 'Bearer token-123') return reply(401, { message: 'Bad credentials' });
    const prefix = `/repos/${repo}`;
    if (!pathname.startsWith(prefix)) return reply(404, { message: 'Not Found' });
    const rest = pathname.slice(prefix.length);
    const payload = body ? JSON.parse(body) : {};
    if (rest.startsWith('/contents/')) {
      const path = decodeURIComponent(rest.slice('/contents/'.length));
      const branch = state.branches.get(method === 'GET' ? searchParams.get('ref') : payload.branch);
      if (!branch) return reply(404, { message: 'No commit found for the ref' });
      const file = branch.get(path);
      if (method === 'GET') return file ? reply(200, { content: file.content, sha: file.sha }) : reply(404, { message: 'Not Found' });
      if (method === 'PUT') {
        if (file && payload.sha !== file.sha) return reply(payload.sha ? 409 : 422, { message: file && !payload.sha ? '"sha" wasn\'t supplied.' : 'does not match' });
        if (!file && payload.sha) return reply(409, { message: 'does not match' });
        const next = { content: payload.content, sha: sha(payload.content + state.commits.length) };
        branch.set(path, next);
        state.commits.push({ message: payload.message, path, branch: payload.branch });
        return reply(file ? 200 : 201, { content: { sha: next.sha } });
      }
      if (method === 'DELETE') {
        if (!file || payload.sha !== file.sha) return reply(file ? 409 : 404, { message: 'Not Found' });
        branch.delete(path);
        state.commits.push({ message: payload.message, path, removed: true });
        return reply(200, {});
      }
    }
    if (method === 'GET' && rest.startsWith('/git/ref/heads/')) return state.branches.has(decodeURIComponent(rest.slice('/git/ref/heads/'.length))) ? reply(200, { ref: rest }) : reply(404, { message: 'Not Found' });
    if (method === 'POST' && rest === '/git/trees') { state.objects.set('tree-1', payload); return reply(201, { sha: 'tree-1' }); }
    if (method === 'POST' && rest === '/git/commits') { state.objects.set('commit-1', payload); state.commits.push({ message: payload.message, parents: payload.parents }); return reply(201, { sha: 'commit-1' }); }
    if (method === 'POST' && rest === '/git/refs') {
      const name = payload.ref.replace('refs/heads/', '');
      if (state.branches.has(name)) return reply(422, { message: 'Reference already exists' });
      state.branches.set(name, new Map(state.objects.get('tree-1').tree.map((entry) => [entry.path, { content: Buffer.from(entry.content).toString('base64'), sha: sha(entry.content) }])));
      return reply(201, {});
    }
    return reply(404, { message: 'Not Found' });
  };
  const file = (branch, path) => { const found = state.branches.get(branch)?.get(path); return found ? JSON.parse(Buffer.from(found.content, 'base64').toString('utf8')) : null; };
  return { state, fetchImpl, file, remote: () => new GitHubSaves({ token: 'token-123', repo, branch: 'saves', dir: 'saves', fetchImpl }) };
}

const content = loadGameContent({ language: 'it' });
const quiet = { error() {} };

// A server whose saves are mirrored to `github`, on a disk of its own.
async function mirrored(t, github, { delayMs = 60_000, logger = quiet } = {}) {
  const saveDir = await makeTempDir('parallang-github-');
  const storage = new MirroredLearningStorage({
    local: new JsonLearningStorage({ saveDir }), remote: github.remote(), language: 'it', delayMs, logger,
    describe: (envelope) => saveSummary(content, envelope),
  });
  const runtime = await createRuntime({ language: 'it', content, storage, provider: new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });
  t.after(runtime.close);
  return { runtime, storage };
}

test('the settings: both or neither, a repository as owner/name, never the main branch', () => {
  assert.equal(githubSavesConfig({}), null);
  assert.deepEqual(githubSavesConfig({ PARALLANG_GITHUB_TOKEN: ' t ', PARALLANG_GITHUB_REPO: 'me/saves' }), { token: 't', repo: 'me/saves', branch: 'saves', dir: 'saves' });
  assert.deepEqual(githubSavesConfig({ PARALLANG_GITHUB_TOKEN: 't', PARALLANG_GITHUB_REPO: 'me/saves', PARALLANG_GITHUB_BRANCH: 'data/saves', PARALLANG_GITHUB_DIR: '/learners/' }), { token: 't', repo: 'me/saves', branch: 'data/saves', dir: 'learners' });
  assert.match(githubSavesConfig({ PARALLANG_GITHUB_TOKEN: 't' }).problem, /go together/);
  assert.match(githubSavesConfig({ PARALLANG_GITHUB_REPO: 'me/saves' }).problem, /go together/);
  assert.match(githubSavesConfig({ PARALLANG_GITHUB_TOKEN: 't', PARALLANG_GITHUB_REPO: 'not a repo' }).problem, /owner\/name/);
  assert.match(githubSavesConfig({ PARALLANG_GITHUB_TOKEN: 't', PARALLANG_GITHUB_REPO: 'me/saves', PARALLANG_GITHUB_BRANCH: 'main' }).problem, /must not be main/);
  assert.match(githubSavesConfig({ PARALLANG_GITHUB_TOKEN: 't', PARALLANG_GITHUB_REPO: 'me/saves', PARALLANG_GITHUB_DIR: '../x' }).problem, /may hold/);
});

test('a finished conversation is written to a branch of its own as a file that says where the learner is, without their id', async (t) => {
  const github = fakeGitHub();
  const { runtime, storage } = await mirrored(t, github);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  await setMode(runtime, learnerId, false); // round 173: the full pacing
  await talkHere(runtime, learnerId);
  assert.equal(github.state.commits.length, 0, 'nothing is written while the copy waits');
  await storage.flush();

  // The branch did not exist: it was made empty, with no parent commit, and the save went onto it.
  assert.deepEqual(github.state.commits[0], { message: 'The branch for ParaLLang saves [skip ci]', parents: [] });
  assert.equal(github.state.commits.length, 2, 'one write for all the saves of the conversation');
  const path = saveFilePath('saves', 'it', learnerId);
  assert.match(path, /^saves\/it\/[0-9a-f]{40}\.json$/);
  const [, commit] = github.state.commits;
  assert.equal(commit.path, path);
  assert.equal(commit.branch, 'saves');
  assert.match(commit.message, /^save [0-9a-f]{8} \(it\): A1, unit 1 of 36 \(Hello and goodbye\), 1 of 108 lessons, 1 conversations \[skip ci\]$/);

  const file = github.file('saves', path);
  assert.deepEqual([file.format, file.language], [1, 'it']);
  assert.ok(!JSON.stringify(file).includes(learnerId), 'the learner\'s id is in neither the name nor the file');
  assert.equal(file.summary.curriculum.position.unitId, 'greetings');
  assert.deepEqual(file.summary.curriculum.totals, { lessonsDone: 1, lessonsTotal: 108, unitsDone: 0, unitsTotal: 36 });
  assert.deepEqual(file.summary.curriculum.units[0], { id: 'greetings', title: 'Hello and goodbye', cefr: 'A1', state: 'current', lessonsDone: 1, lessons: 3, gate: false });
  assert.equal(file.summary.curriculum.units.length, 36);
  assert.ok(file.summary.spellbookCards >= 3 && file.summary.xp > 0);
  assert.equal(file.save.road.step, 1);
  assert.deepEqual(file.save.spellbook.processedAssessments, {}, 'no receipts');
  assert.deepEqual((await api(runtime, '/api/health', {})).data, { status: 'ok' }, 'a test server is given no store to report');
  assert.deepEqual({ ok: storage.status.lastWriteOk, kind: storage.status.kind }, { ok: true, kind: 'github' });

  // The next conversation updates the same file.
  const view = (await road(runtime, learnerId)).data;
  await api(runtime, '/api/road/move', { learnerId, method: 'POST', body: { nodeId: view.road.rails } });
  await talkHere(runtime, learnerId);
  await storage.flush();
  assert.equal(github.state.commits.length, 3);
  assert.equal(github.file('saves', path).save.road.step, 2);
});

test('a server with an empty disk has the learner back from GitHub at their next request', async (t) => {
  const github = fakeGitHub();
  const first = await mirrored(t, github);
  const { data: { learnerId } } = await api(first.runtime, '/api/learner', { method: 'POST', body: {} });
  await road(first.runtime, learnerId);
  await talkHere(first.runtime, learnerId);
  const before = (await road(first.runtime, learnerId)).data;
  await first.storage.flush();

  // A redeploy: another process, another disk, the same repository.
  const second = await mirrored(t, github);
  const again = await api(second.runtime, '/api/learner', { method: 'POST', body: { learnerId } });
  assert.deepEqual([again.status, again.data.recovered, again.data.learnerId], [200, true, learnerId]);
  assert.deepEqual((await road(second.runtime, learnerId)).data, before, 'the road, the curriculum and the level are as they were');
  assert.equal(second.storage.status.restored, 1);
  assert.equal((await second.storage.local.load(learnerId)).road.step, 1, 'and the disk holds the save again');
  // Without the first request too: any route finds the learner.
  const third = await mirrored(t, github);
  assert.equal((await api(third.runtime, '/api/road', { learnerId })).data.road.step, 1);
});

test('a learner GitHub has never seen is asked for once, then not again for a while; a file that is no save is left alone', async (t) => {
  const github = fakeGitHub();
  const { runtime, storage } = await mirrored(t, github);
  const unknown = '22222222-2222-4222-8222-222222222222';
  assert.match((await api(runtime, '/api/road', { learnerId: unknown })).data.error.message, /Unknown learner ID/);
  const reads = () => github.state.calls.filter((call) => call.startsWith('GET /repos/owner/saves/contents/')).length;
  assert.equal(reads(), 1);
  await api(runtime, '/api/road', { learnerId: unknown });
  await api(runtime, '/api/spellbook', { learnerId: unknown });
  assert.equal(reads(), 1, 'not asked again');
  // Files that are not this server's to restore: another language's, and one that is no save at all.
  github.state.branches.set('saves', new Map());
  const put = (id, value) => github.state.branches.get('saves').set(saveFilePath('saves', 'it', id), { content: Buffer.from(JSON.stringify(value)).toString('base64'), sha: 'x' });
  const [spanish, broken] = ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'];
  put(spanish, { format: 1, language: 'es', save: { schemaVersion: 3 } });
  put(broken, { format: 1, language: 'it', save: { schemaVersion: 3, nonsense: true } });
  assert.equal(await storage.load(spanish), null);
  assert.equal(await storage.load(broken), null);
  assert.equal(await storage.local.load(broken), null, 'nothing was written to the disk');
  assert.equal(await storage.load('not-an-id').catch((error) => error.status), 400);
});

test('GitHub being down never fails a turn, and the next save writes what was missed', async (t) => {
  const github = fakeGitHub();
  const errors = [];
  const { runtime, storage } = await mirrored(t, github, { logger: { error: (line) => errors.push(line) } });
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  await road(runtime, learnerId);
  github.state.down = true;
  const turn = await talkHere(runtime, learnerId);
  assert.equal(turn.encounter.state, 'resolved');
  await storage.flush();
  assert.equal(storage.status.lastWriteOk, false);
  assert.match(errors.join('\n'), /write failed: GitHub write failed \(503/);
  assert.equal((await storage.local.load(learnerId)).road.step, 1, 'the disk has it');
  github.state.down = false;
  const view = (await road(runtime, learnerId)).data;
  await api(runtime, '/api/road/move', { learnerId, method: 'POST', body: { nodeId: view.road.rails } });
  await storage.flush();
  assert.equal(storage.status.lastWriteOk, true);
  assert.equal(github.file('saves', saveFilePath('saves', 'it', learnerId)).save.road.step, 1);
});

test('a file that changed underneath is read again and written; a copy is written by itself after its delay', async (t) => {
  const github = fakeGitHub();
  const { runtime, storage } = await mirrored(t, github, { delayMs: 30 });
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  await road(runtime, learnerId);
  const path = saveFilePath('saves', 'it', learnerId);
  // No flush: the timer writes it.
  for (let waited = 0; waited < 3000 && !github.file('saves', path); waited += 20) await new Promise((done) => setTimeout(done, 20));
  assert.equal(github.file('saves', path).save.road.step, 0);
  // Another instance of the server wrote the file meanwhile (a deploy overlapping the old process).
  github.state.branches.get('saves').get(path).sha = 'changed-elsewhere';
  await talkHere(runtime, learnerId);
  await storage.flush();
  assert.equal(github.file('saves', path).save.road.step, 1);
  // And a server that starts with the file already there (it has no sha for it yet) writes over it.
  const fresh = await mirrored(t, github);
  await fresh.storage.local.save(await storage.local.load(learnerId));
  await fresh.storage.push(learnerId);
  assert.equal(fresh.storage.status.lastWriteOk, true);
});

test('a removed learner is removed from GitHub too, and does not come back', async (t) => {
  const github = fakeGitHub();
  const { runtime, storage } = await mirrored(t, github);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  await road(runtime, learnerId);
  await storage.flush();
  const path = saveFilePath('saves', 'it', learnerId);
  assert.ok(github.file('saves', path));
  assert.deepEqual((await api(runtime, '/api/learner', { learnerId, method: 'DELETE' })).data, { deleted: true, existed: true });
  assert.equal(github.file('saves', path), null);
  assert.match(github.state.commits.at(-1).message, /^remove save [0-9a-f]{8} \[skip ci\]$/);
  assert.equal(await storage.load(learnerId), null);
  // A removal with a copy still waiting writes nothing afterwards.
  const { data: { learnerId: other } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  await api(runtime, '/api/learner', { learnerId: other, method: 'DELETE' });
  await storage.flush();
  assert.equal(github.file('saves', saveFilePath('saves', 'it', other)), null);
});

test('the summary of a save without a road says the level and the Spellbook', () => {
  const summary = saveSummary(content, { spellbook: { words: { a: {} }, phrases: {} }, progression: { xp: 70 }, dungeons: { ta_prohm: { run: 2, cleared: ['a', 'b'] } } });
  assert.deepEqual(summary, { line: 'level 2, 1 Spellbook cards', level: 2, xp: 70, spellbookCards: 1, dungeons: { ta_prohm: { run: 2, cleared: 2 } }, curriculum: null });
});
