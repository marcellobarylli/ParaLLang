import { spawn } from 'node:child_process';
import { lstat, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ProviderError } from './provider-error.js';

export const DEFAULT_STDOUT_LIMIT = 1024 * 1024;
export const DEFAULT_STDERR_LIMIT = 64 * 1024;

function killProcessGroup(child, signal) {
  if (!child?.pid) return;
  try {
    if (process.platform === 'win32') child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {
    try { child.kill(signal); } catch { /* already gone */ }
  }
}

// Round 098 (round 095 review R1.9): a hard kill skips the `finally` that removes a run's temp dir, leaving a copy of
// its prompt. Once per temp root per process, the first run sweeps this user's run dirs (the exact mkdtemp name;
// real directories only) whose mtime is STALE_TEMP_MS or more in the past. Safe: a run lasts at most its timeout
// (capped at 300 s by config) plus the kill grace, and a dir's mtime only gets newer while a run uses it.
export const STALE_TEMP_MS = 3_600_000;
export const MIN_STALE_TEMP_MS = 600_000;
const RUN_DIR = /^parallang-cli-[A-Za-z0-9]{6}$/;
const sweeps = new Map();

export async function sweepStaleTempDirs(tempRoot, { staleMs = STALE_TEMP_MS, now = Date.now() } = {}) {
  const removed = [];
  let entries;
  try { entries = await readdir(tempRoot); } catch { return removed; }
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  for (const name of entries) {
    if (!RUN_DIR.test(name)) continue;
    const path = join(tempRoot, name);
    try {
      const stat = await lstat(path);
      if (!stat.isDirectory() || (uid !== null && stat.uid !== uid)) continue;
      const age = now - stat.mtimeMs;
      if (age < staleMs) continue; // also a future mtime (negative age)
      await rm(path, { recursive: true, force: true });
      removed.push(name);
    } catch { /* one entry never stops the sweep */ }
  }
  return removed;
}

export class CLIProcessRunner {
  constructor({
    spawnImpl = spawn,
    maxQueue = 8,
    stdoutLimit = DEFAULT_STDOUT_LIMIT,
    stderrLimit = DEFAULT_STDERR_LIMIT,
    killGraceMs = 2_000,
    tempRoot = tmpdir(),
    staleTempMs = STALE_TEMP_MS,
    sweepTemp = true,
  } = {}) {
    if (!(staleTempMs >= MIN_STALE_TEMP_MS)) throw new TypeError('staleTempMs must be at least 10 minutes (no live run may lose its dir).');
    this.staleTempMs = staleTempMs;
    this.sweepTemp = sweepTemp;
    this.sweep = null;
    this.spawnImpl = spawnImpl;
    this.maxQueue = maxQueue;
    this.stdoutLimit = stdoutLimit;
    this.stderrLimit = stderrLimit;
    this.killGraceMs = killGraceMs;
    this.tempRoot = tempRoot;
    this.queue = [];
    this.active = null;
    this.shuttingDown = false;
    this.idleWaiters = [];
  }

  // Round 098: the background sweep of this runner's temp root, once per root per process; never fails a run.
  #sweepOnce() {
    if (!this.sweepTemp || this.sweep) return;
    const root = resolve(this.tempRoot);
    if (!sweeps.has(root)) sweeps.set(root, sweepStaleTempDirs(root, { staleMs: this.staleTempMs }).catch(() => []));
    this.sweep = sweeps.get(root);
  }

  run(spec) {
    this.#sweepOnce();
    const timeoutMs = spec.timeoutMs;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('A positive process timeout is required.');
    if (this.shuttingDown) return Promise.reject(new ProviderError('interrupted', { provider: spec.provider }));

    // Round 078 (review 1): an optional AbortSignal takes a queued task out of the queue or cancels the running one,
    // so a caller that stopped waiting does not hold the one slot.
    const { signal } = spec;
    if (signal?.aborted) return Promise.reject(new ProviderError('interrupted', { provider: spec.provider }));

    return new Promise((outerResolve, outerReject) => {
      let onAbort = null;
      const settle = (fn) => (value) => { if (onAbort) signal.removeEventListener('abort', onAbort); fn(value); };
      const resolve = settle(outerResolve);
      const reject = settle(outerReject);
      const task = { spec, resolve, reject, deadline: Date.now() + timeoutMs, queueTimer: null };
      if (signal) {
        onAbort = () => {
          const index = this.queue.indexOf(task);
          if (index >= 0) {
            this.queue.splice(index, 1);
            clearTimeout(task.queueTimer);
            reject(new ProviderError('interrupted', { provider: spec.provider }));
          } else if (this.active === task) task.cancel?.();
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
      if (!this.active) this.#start(task);
      else if (this.queue.length >= this.maxQueue) reject(new ProviderError('busy', { provider: spec.provider }));
      else {
        this.queue.push(task);
        task.queueTimer = setTimeout(() => {
          const index = this.queue.indexOf(task);
          if (index >= 0) this.queue.splice(index, 1);
          reject(new ProviderError('timeout', { provider: spec.provider, elapsedMs: timeoutMs }));
        }, timeoutMs);
      }
    });
  }

  async #start(task) {
    clearTimeout(task.queueTimer);
    if (this.shuttingDown) {
      task.reject(new ProviderError('interrupted', { provider: task.spec.provider }));
      this.#advance();
      return;
    }
    const remainingMs = task.deadline - Date.now();
    if (remainingMs <= 0) {
      task.reject(new ProviderError('timeout', { provider: task.spec.provider, elapsedMs: task.spec.timeoutMs }));
      this.#advance();
      return;
    }
    this.active = task;
    task.cancel = () => { task.cancelRequested = true; };
    try { task.resolve(await this.#execute(task, remainingMs)); }
    catch (error) { task.reject(error); }
    finally {
      this.active = null;
      this.#advance();
    }
  }

  #advance() {
    if (!this.active && !this.shuttingDown && this.queue.length) {
      this.#start(this.queue.shift());
      return;
    }
    if (!this.active && this.queue.length === 0) {
      for (const resolve of this.idleWaiters.splice(0)) resolve();
    }
  }

  async #execute(task, remainingMs) {
    const { spec } = task;
    const startedAt = Date.now();
    const directory = await mkdtemp(join(this.tempRoot, 'parallang-cli-'));
    try {
      const prepared = spec.prepare ? await spec.prepare(directory) : {};
      if (task.cancelRequested) throw new ProviderError('interrupted', { provider: spec.provider });
      const args = prepared.args ?? spec.args ?? [];
      const input = prepared.stdin ?? spec.stdin ?? '';
      const result = await new Promise((resolve, reject) => {
        let child;
        let closed = false;
        let failure = null;
        let stdoutBytes = 0;
        let stderrBytes = 0;
        const stdout = [];
        const stderr = [];
        let forceTimer;
        // Round 095 (review R1.3, critique 1.1-1.5): a child may exit and leave its pipes open (a grandchild holds
        // them), or never end at all. `close` alone still settles (a spawn ENOENT gives no `exit`). After `exit`, a
        // grace; then the group gets SIGKILL and the stdio is destroyed, so Node emits `close` and `finish` settles.
        // If nothing at all comes after a SIGKILL, a last fallback settles. A setsid escapee is not reached by the
        // group kill; destroying the stdio still frees the slot.
        let exited = false;
        let exitCode = null;
        let exitGraceTimer;
        let fallbackTimer;
        const releaseStdio = () => {
          for (const stream of [child?.stdin, child?.stdout, child?.stderr]) { try { stream?.destroy(); } catch { /* gone */ } }
        };
        let forced = false;
        // Round 099 (review R1.3, rejected): after `exit` the child is reaped, but Linux keeps its PID allocated while
        // it is the id of a process group with members, so the group kill below reaches only that group; with no
        // member left it reaches a process only if one took the PID and made itself a group leader within
        // killGraceMs. A `kill(-pid, 0)` probe first would race the same way.
        const forceKill = () => {
          if (forced || closed) return;
          forced = true;
          killProcessGroup(child, 'SIGKILL');
          releaseStdio();
          fallbackTimer = setTimeout(() => finish(exited ? exitCode : null, exited ? null : 'SIGKILL'), this.killGraceMs);
        };

        // Round 087 (review R1.3): once the child has closed, an abort (e.g. during collect) sends nothing.
        // Round 095 (critique 1.4): nor once it has exited 0; the run finished. Round 099 (review R1.1): nor once it
        // has exited at all: a timeout or cancel in the exit grace would replace the exit's `process` failure, whose
        // stated events the adapters map. The grace timer still force-kills a group that holds the pipes.
        const failAndTerminate = (error) => {
          if (failure || closed || exited) return;
          failure = error;
          killProcessGroup(child, 'SIGTERM');
          forceTimer = setTimeout(forceKill, this.killGraceMs);
        };
        const timeoutTimer = setTimeout(() => failAndTerminate(new ProviderError('timeout', {
          provider: spec.provider, elapsedMs: Date.now() - startedAt,
        })), remainingMs);

        const finish = (code, signal) => {
          if (closed) return;
          closed = true;
          task.cancel = () => {};
          clearTimeout(timeoutTimer);
          clearTimeout(forceTimer);
          clearTimeout(exitGraceTimer);
          clearTimeout(fallbackTimer);
          const result = {
            stdout: Buffer.concat(stdout).toString('utf8'),
            stderr: Buffer.concat(stderr).toString('utf8'),
            exitCode: code,
            signal,
            elapsedMs: Date.now() - startedAt,
            directory,
          };
          if (failure) {
            if (!failure.internal) Object.defineProperty(failure, 'internal', { value: result, enumerable: false });
            reject(failure);
          } else if (code !== 0) {
            reject(new ProviderError('process', {
              provider: spec.provider, exitCode: code, signal, elapsedMs: result.elapsedMs, internal: result,
            }));
          } else resolve(result);
        };

        try {
          child = this.spawnImpl(spec.executable, args, {
            cwd: prepared.cwd ?? spec.cwd ?? directory,
            env: prepared.env ?? spec.env,
            shell: false,
            detached: process.platform !== 'win32',
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          task.cancel = () => failAndTerminate(new ProviderError('interrupted', {
            provider: spec.provider, elapsedMs: Date.now() - startedAt,
          }));
          if (task.cancelRequested) task.cancel();
        } catch (error) {
          clearTimeout(timeoutTimer);
          reject(new ProviderError(error?.code === 'ENOENT' ? 'missing-cli' : 'process', {
            provider: spec.provider, elapsedMs: Date.now() - startedAt,
          }));
          return;
        }

        child.stdout.on('data', (chunk) => {
          stdoutBytes += chunk.length;
          if (stdoutBytes > this.stdoutLimit) failAndTerminate(new ProviderError('output-limit', {
            provider: spec.provider, elapsedMs: Date.now() - startedAt,
          }));
          else stdout.push(Buffer.from(chunk));
        });
        child.stderr.on('data', (chunk) => {
          stderrBytes += chunk.length;
          if (stderrBytes > this.stderrLimit) failAndTerminate(new ProviderError('output-limit', {
            provider: spec.provider, elapsedMs: Date.now() - startedAt,
          }));
          else stderr.push(Buffer.from(chunk));
        });
        child.once('error', (error) => failAndTerminate(new ProviderError(error?.code === 'ENOENT' ? 'missing-cli' : 'process', {
          provider: spec.provider, elapsedMs: Date.now() - startedAt,
        })));
        child.once('exit', (code) => {
          exited = true;
          exitCode = code;
          if (!closed) exitGraceTimer = setTimeout(forceKill, this.killGraceMs);
        });
        child.once('close', finish);
        child.stdin.on('error', () => {});
        child.stdin.end(input);
      });
      if (spec.collect) result.collected = await spec.collect(directory, result);
      return result;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  async shutdown() {
    if (this.shuttingDown && !this.active) return;
    this.shuttingDown = true;
    for (const task of this.queue.splice(0)) {
      clearTimeout(task.queueTimer);
      task.reject(new ProviderError('interrupted', { provider: task.spec.provider }));
    }
    this.active?.cancel?.();
    if (this.active) await new Promise((resolve) => this.idleWaiters.push(resolve));
  }
}
