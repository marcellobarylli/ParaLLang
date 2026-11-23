#!/usr/bin/env node
// One-command local setup for a new player: `npm run setup`.
// Installs dependencies, writes .env with a provider found on this machine, and checks the sign-in.
// It never installs a CLI, signs in, or makes an inference request.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const envPath = join(root, '.env');
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: root, shell: true, ...opts });
const fail = (message) => { console.error(`\n✗ ${message}`); process.exit(1); };

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 11)) fail(`Node.js 20.11 or newer is needed (found ${process.version}).`);
console.log(`✓ Node.js ${process.version}`);

console.log('… installing dependencies (npm ci)');
if (run('npm', ['ci', '--no-audit', '--no-fund'], { stdio: 'inherit' }).status !== 0) fail('npm ci failed.');

if (!existsSync(envPath)) { copyFileSync(join(root, '.env.example'), envPath); console.log('✓ created .env'); }
let env = readFileSync(envPath, 'utf8');
const current = env.match(/^LLM_PROVIDER=(.*)$/m)?.[1]?.trim();

const has = (cli) => run(cli, ['--version'], { stdio: 'ignore' }).status === 0;
const requested = process.argv[2];
let provider = requested
  ?? (current && current !== 'codex-cli' ? current : undefined)
  ?? (has('claude') ? 'claude-cli' : has('codex') ? 'codex-cli' : undefined);
if (!provider) {
  fail('Neither the Claude Code CLI (`claude`) nor the Codex CLI (`codex`) is on PATH.\n'
    + '  Install one and sign in with a subscription (`claude auth login` or `codex login`), then run `npm run setup` again.\n'
    + '  Or pass a provider: `npm run setup -- openai` (with OPENAI_API_KEY in .env) or `npm run setup -- ollama`.');
}
env = /^LLM_PROVIDER=.*$/m.test(env) ? env.replace(/^LLM_PROVIDER=.*$/m, `LLM_PROVIDER=${provider}`) : `${env}\nLLM_PROVIDER=${provider}\n`;
writeFileSync(envPath, env);
console.log(`✓ LLM_PROVIDER=${provider} in .env`);

console.log('… checking the provider (no inference request)');
if (run('npm', ['run', '--silent', 'check:provider'], { stdio: 'inherit' }).status !== 0) {
  const login = { 'claude-cli': 'claude auth login', 'codex-cli': 'codex login' }[provider];
  fail(`The provider check failed.${login ? ` Sign in with \`${login}\`, then run \`npm run setup\` again.` : ''}`);
}

console.log('\n✓ Ready. Start the game with `npm run dev` and open http://localhost:5173');
