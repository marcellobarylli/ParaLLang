import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

export class CLIProcessRunner {
  constructor({
    spawnImpl = spawn,
    maxQueue = 8,
    stdoutLimit = DEFAULT_STDOUT_LIMIT,
    stderrLimit = DEFAULT_STDERR_LIMIT,
    killGraceMs = 2_000,
    tempRoot = tmpdir(),
  } = {}) {
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

  run(spec) {
    const timeoutMs = spec.timeoutMs;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new TypeError('A positive process timeout is required.');
    if (this.shuttingDown) return Promise.reject(new ProviderError('interrupted', { provider: spec.provider }));

    return new Promise((resolve, reject) => {
      const task = { spec, resolve, reject, deadline: Date.now() + timeoutMs, queueTimer: null };
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

        const failAndTerminate = (error) => {
          if (failure) return;
          failure = error;
          killProcessGroup(child, 'SIGTERM');
          forceTimer = setTimeout(() => killProcessGroup(child, 'SIGKILL'), this.killGraceMs);
        };
        const timeoutTimer = setTimeout(() => failAndTerminate(new ProviderError('timeout', {
          provider: spec.provider, elapsedMs: Date.now() - startedAt,
        })), remainingMs);

        const finish = (code, signal) => {
          if (closed) return;
          closed = true;
          clearTimeout(timeoutTimer);
          clearTimeout(forceTimer);
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
