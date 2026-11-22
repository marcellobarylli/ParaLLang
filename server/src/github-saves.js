// Round 145: saves written to GitHub. The hosted server's disk is lost on every restart (the free plan), and the
// browser's copy of round 144 is only as safe as one browser. With a GitHub token the server also writes each
// learner's save as a JSON file to a branch of a repository, and reads it back when its own disk does not know the
// learner. The file starts with a summary of where the learner is in the curriculum, so it can be read by eye.
//
//   PARALLANG_GITHUB_TOKEN    a token that may read and write the repository's contents (a fine-grained personal
//                             access token: "Contents: Read and write" on that one repository)
//   PARALLANG_GITHUB_REPO     owner/name
//   PARALLANG_GITHUB_BRANCH   the branch the files go to (default `saves`; made as an empty branch if it is missing)
//   PARALLANG_GITHUB_DIR      the folder on that branch (default `saves`)
//
// Without the token and the repository nothing here runs and saves stay on the disk alone. With settings that are
// wrong the server runs on its disk too, and its health check says what is wrong.
//
// A file is saves/<language>/<hash>.json. The hash is of the learner's id, and the id is left out of the file: the
// id is what a browser shows the server to be that learner, and the repository may be public. Every commit message
// carries [skip ci], so a save starts no workflow, and the branch is not `main`, so it starts no deploy.

import { createHash } from 'node:crypto';
import { LEARNER_ID_PATTERN } from './learning-storage.js';

export const GITHUB_SAVE_FORMAT = 1;
const API = 'https://api.github.com';
const nonBlank = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);

/** The GitHub settings from the environment: null when saves are not written to GitHub, or { problem } when the settings are wrong. */
export function githubSavesConfig(env = process.env) {
  const token = nonBlank(env.PARALLANG_GITHUB_TOKEN);
  const repo = nonBlank(env.PARALLANG_GITHUB_REPO);
  if (!token && !repo) return null;
  if (!token || !repo) return { problem: 'PARALLANG_GITHUB_TOKEN and PARALLANG_GITHUB_REPO go together: set both, or neither.' };
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) return { problem: 'PARALLANG_GITHUB_REPO must be owner/name.' };
  const branch = nonBlank(env.PARALLANG_GITHUB_BRANCH) ?? 'saves';
  const dir = (nonBlank(env.PARALLANG_GITHUB_DIR) ?? 'saves').replace(/^\/+|\/+$/g, '');
  if (!/^[A-Za-z0-9_.\/-]+$/.test(branch) || !/^[A-Za-z0-9_.\/-]+$/.test(dir) || dir.includes('..')) return { problem: 'PARALLANG_GITHUB_BRANCH and PARALLANG_GITHUB_DIR may hold letters, digits, dots, dashes, underscores and slashes only.' };
  if (branch === 'main' || branch === 'master') return { problem: `PARALLANG_GITHUB_BRANCH must not be ${branch}: every save would be a commit there, and a commit to it deploys.` };
  return { token, repo, branch, dir };
}

/** The file of a learner's save on the branch. The id itself is in neither the name nor the file. */
export function saveFilePath(dir, language, learnerId) {
  return `${dir}/${language}/${createHash('sha256').update(String(learnerId).toLowerCase()).digest('hex').slice(0, 40)}.json`;
}

// The GitHub contents API for one branch of one repository: read, write and remove a JSON file.
export class GitHubSaves {
  constructor({ token, repo, branch = 'saves', dir = 'saves', fetchImpl = globalThis.fetch, timeoutMs = 15_000 }) {
    Object.assign(this, { token, repo, branch, dir, fetchImpl, timeoutMs });
    this.shas = new Map(); // path -> the blob sha GitHub last reported, which an update must name
  }

  async request(method, path, body) {
    const response = await this.fetchImpl(`${API}/repos/${this.repo}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json', Authorization: `Bearer ${this.token}`, 'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'parallang-server', ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    let data = null;
    try { data = await response.json(); } catch { /* an empty body */ }
    return { status: response.status, ok: response.ok, data };
  }

  fail(what, reply) { return new Error(`GitHub ${what} failed (${reply.status}${reply.data?.message ? `: ${reply.data.message}` : ''}).`); }
  contents(path) { return `/contents/${path.split('/').map(encodeURIComponent).join('/')}`; }

  /** The file's JSON, or null when the file or the branch is not there. */
  async read(path) {
    const reply = await this.request('GET', `${this.contents(path)}?ref=${encodeURIComponent(this.branch)}`);
    if (reply.status === 404) { this.shas.delete(path); return null; }
    if (!reply.ok || typeof reply.data?.content !== 'string') throw this.fail('read', reply);
    this.shas.set(path, reply.data.sha);
    return JSON.parse(Buffer.from(reply.data.content, 'base64').toString('utf8'));
  }

  // An empty branch of its own: one commit with no parent, so the saves share no history with the code.
  async createBranch() {
    const readme = 'ParaLLang saves, written by the server (server/src/github-saves.js). One JSON file per learner and language.\n';
    const tree = await this.request('POST', '/git/trees', { tree: [{ path: 'README.md', mode: '100644', type: 'blob', content: readme }] });
    if (!tree.ok) throw this.fail('branch (tree)', tree);
    const commit = await this.request('POST', '/git/commits', { message: 'The branch for ParaLLang saves [skip ci]', tree: tree.data.sha, parents: [] });
    if (!commit.ok) throw this.fail('branch (commit)', commit);
    const ref = await this.request('POST', '/git/refs', { ref: `refs/heads/${this.branch}`, sha: commit.data.sha });
    if (!ref.ok && ref.status !== 422) throw this.fail('branch (ref)', ref); // 422: another request made it meanwhile
  }

  /** Writes the file. A missing branch is made; a file that changed underneath is read again and written once more. */
  async write(path, value, message) {
    const content = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8').toString('base64');
    const put = () => this.request('PUT', this.contents(path), { message, content, branch: this.branch, ...(this.shas.has(path) ? { sha: this.shas.get(path) } : {}) });
    let reply = await put();
    if (reply.status === 404) {
      const branch = await this.request('GET', `/git/ref/heads/${this.branch.split('/').map(encodeURIComponent).join('/')}`);
      if (branch.status !== 404) throw this.fail('write', reply);
      await this.createBranch();
      reply = await put();
    }
    if (reply.status === 409 || reply.status === 422) {
      // The sha this server holds is not the file's (another server instance wrote it, or this one never read it).
      const current = await this.request('GET', `${this.contents(path)}?ref=${encodeURIComponent(this.branch)}`);
      if (current.ok && current.data?.sha) this.shas.set(path, current.data.sha); else this.shas.delete(path);
      reply = await put();
    }
    if (!reply.ok) throw this.fail('write', reply);
    this.shas.set(path, reply.data?.content?.sha);
  }

  /** Removes the file; a file that is not there counts as removed. */
  async remove(path, message) {
    if (!this.shas.has(path)) { try { await this.read(path); } catch { /* removed below, or not */ } }
    if (!this.shas.has(path)) return false;
    const reply = await this.request('DELETE', this.contents(path), { message, sha: this.shas.get(path), branch: this.branch });
    this.shas.delete(path);
    if (!reply.ok && reply.status !== 404) throw this.fail('remove', reply);
    return reply.ok;
  }
}

/**
 * A learning storage that keeps saves on the disk (`local`, a JsonLearningStorage) and mirrors them to GitHub
 * (`remote`, a GitHubSaves).
 *
 *   save     the disk first, as before; the copy to GitHub follows `delayMs` later, one write per learner for all the
 *            saves of that time. A failed copy is logged and tried again with the next save: it never fails a turn.
 *   load     the disk first; a learner the disk does not know is looked for on GitHub and, when found, written to the
 *            disk. So a server that has lost its disk has every learner back at their next request.
 *   remove   both.
 *   flush    every copy still waiting is written now (the server calls it when it is stopped).
 *
 * `describe(envelope)` is the summary put at the top of the file (where the learner is in the curriculum).
 */
export class MirroredLearningStorage {
  constructor({ local, remote, language, describe = () => ({}), delayMs = 10_000, missMs = 60_000, clock = () => Date.now(), logger = console }) {
    Object.assign(this, { local, remote, language, describe, delayMs, missMs, clock, logger });
    this.waiting = new Map(); // learner id -> the timer of a copy not yet written
    this.writing = new Map(); // learner id -> the write under way
    this.misses = new Map(); // learner id -> until when GitHub is not asked again for a learner it did not have
    this.status = { kind: 'github', lastWriteAt: null, lastWriteOk: null, restored: 0 };
  }

  get saveDir() { return this.local.saveDir; }
  filePath(learnerId) { return this.local.filePath(learnerId); }
  path(learnerId) { return saveFilePath(this.remote.dir, this.language, learnerId); }

  async load(learnerId, options = {}) {
    const found = await this.local.load(learnerId);
    if (found) return found;
    const restored = await this.restore(learnerId);
    if (restored) return restored;
    return options.create ? this.local.load(learnerId, options) : null;
  }

  // A learner the disk does not know: their file on GitHub, written to the disk. Null when there is none, when
  // GitHub does not answer, or when the file is not a save this server can read (it is left where it is).
  async restore(learnerId) {
    if (!LEARNER_ID_PATTERN.test(String(learnerId ?? ''))) return null;
    if ((this.misses.get(learnerId) ?? 0) > this.clock()) return null;
    let file;
    try { file = await this.remote.read(this.path(learnerId)); }
    catch (error) { this.logger.error?.(`[github-saves] read failed: ${error.message}`); return null; }
    if (!file?.save || typeof file.save !== 'object' || file.language !== this.language) {
      this.misses.set(learnerId, this.clock() + this.missMs);
      if (this.misses.size > 5000) this.misses.delete(this.misses.keys().next().value);
      return null;
    }
    try {
      const saved = await this.local.save({ ...file.save, learnerId, spellbook: { ...file.save.spellbook, processedAssessments: {} } });
      this.status.restored += 1;
      return saved;
    } catch (error) {
      this.logger.error?.(`[github-saves] a save on GitHub could not be restored: ${error.message}`);
      return null;
    }
  }

  async save(envelope, options) {
    const saved = await this.local.save(envelope, options);
    this.misses.delete(envelope.learnerId);
    this.schedule(envelope.learnerId);
    return saved;
  }

  schedule(learnerId) {
    if (this.waiting.has(learnerId)) return;
    const timer = setTimeout(() => { this.waiting.delete(learnerId); this.push(learnerId).catch(() => {}); }, this.delayMs);
    timer.unref?.();
    this.waiting.set(learnerId, timer);
  }

  // Writes the learner's save as the disk holds it now. One write at a time per learner.
  async push(learnerId) {
    const before = this.writing.get(learnerId);
    if (before) await before.catch(() => {});
    const write = (async () => {
      const envelope = await this.local.load(learnerId);
      if (!envelope) return;
      const { learnerId: _id, ...save } = envelope;
      const summary = this.describe(envelope);
      const file = {
        format: GITHUB_SAVE_FORMAT, language: this.language, savedAt: new Date(this.clock()).toISOString(),
        summary, save: { ...save, spellbook: { ...save.spellbook, processedAssessments: {} } },
      };
      const path = this.path(learnerId);
      const name = path.split('/').at(-1).slice(0, 8);
      try {
        await this.remote.write(path, file, `save ${name} (${this.language}): ${summary?.line ?? 'progress'} [skip ci]`);
        Object.assign(this.status, { lastWriteAt: file.savedAt, lastWriteOk: true });
      } catch (error) {
        Object.assign(this.status, { lastWriteAt: file.savedAt, lastWriteOk: false });
        this.logger.error?.(`[github-saves] write failed: ${error.message}`);
        throw error;
      }
    })();
    this.writing.set(learnerId, write);
    try { await write; } finally { if (this.writing.get(learnerId) === write) this.writing.delete(learnerId); }
  }

  async remove(learnerId) {
    const timer = this.waiting.get(learnerId);
    if (timer) { clearTimeout(timer); this.waiting.delete(learnerId); }
    await this.writing.get(learnerId)?.catch(() => {});
    const removed = await this.local.remove(learnerId);
    try { await this.remote.remove(this.path(learnerId), `remove save ${this.path(learnerId).split('/').at(-1).slice(0, 8)} [skip ci]`); }
    catch (error) { this.logger.error?.(`[github-saves] remove failed: ${error.message}`); }
    return removed;
  }

  /** Writes every copy still waiting, and waits for the writes under way. */
  async flush() {
    const ids = [...this.waiting.keys()];
    for (const id of ids) { clearTimeout(this.waiting.get(id)); this.waiting.delete(id); }
    await Promise.allSettled([...ids.map((id) => this.push(id)), ...this.writing.values()]);
  }
}
