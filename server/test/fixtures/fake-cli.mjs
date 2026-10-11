#!/usr/bin/env node
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

const args = process.argv.slice(2);
const provider = process.env.FAKE_PROVIDER ?? (basename(process.argv[1]).includes('codex') ? 'codex-cli' : 'claude-cli');
const capabilities = [
  'apps', 'browser_use', 'browser_use_external', 'browser_use_full_cdp_access', 'computer_use',
  'hooks', 'image_generation', 'memories', 'multi_agent', 'multi_agent_v2', 'plugins', 'remote_plugin',
  'shell_tool', 'skill_search', 'sleep_tool', 'tool_suggest', 'unified_exec', 'unified_exec_tty',
  'view_image', 'workspace_dependencies',
];

if (args.includes('--version')) {
  process.stdout.write(provider === 'codex-cli' ? 'codex-cli 0.162.0\n' : '2.1.287 (Claude Code)\n');
  process.exit(0);
}
if (provider === 'codex-cli' && args[0] === 'exec' && args.includes('--help')) {
  process.stdout.write('--ignore-user-config --ignore-rules --ephemeral --strict-config --output-schema --output-last-message --json --sandbox --skip-git-repo-check\n');
  process.exit(0);
}
if (provider === 'codex-cli' && args.includes('--help') && !args.includes('exec')) {
  process.stdout.write('--ask-for-approval --no-daemon\n');
  process.exit(0);
}
if (provider === 'codex-cli' && args.includes('features') && args.includes('list')) {
  process.stdout.write(`${capabilities.join('\n')}\n`);
  process.exit(0);
}
if (provider === 'codex-cli' && args.includes('login') && args.includes('status')) {
  process.stdout.write(process.env.FAKE_AUTH === 'api' ? 'Logged in using an API key\n' : 'Logged in using ChatGPT\n');
  process.exit(0);
}
if (provider === 'claude-cli' && args.includes('--help')) {
  process.stdout.write('--print --output-format --json-schema --safe-mode --restricted --strict-mcp-config --mcp-config --tools --disable-slash-commands --no-session-persistence --system-prompt[-file] --permission-prompts --no-chrome\n');
  process.exit(0);
}
if (provider === 'claude-cli' && args.includes('auth') && args.includes('status')) {
  const native = process.env.FAKE_AUTH !== 'api';
  process.stdout.write(JSON.stringify(native
    ? { loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty', email: 'must-not-leak@example.test' }
    : { loggedIn: true, authMethod: 'apiKey', apiProvider: 'firstParty', email: 'must-not-leak@example.test' }));
  process.exit(0);
}

let stdin = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) stdin += chunk;

let state = { calls: 0 };
try { state = JSON.parse(await readFile(process.env.FAKE_STATE_FILE, 'utf8')); } catch { /* first call */ }
state.calls += 1;
await writeFile(process.env.FAKE_STATE_FILE, JSON.stringify(state), 'utf8');
if (process.env.FAKE_CAPTURE_FILE) {
  await appendFile(process.env.FAKE_CAPTURE_FILE, `${JSON.stringify({ args, stdin, env: process.env })}\n`, 'utf8');
}
let control = {};
try { control = JSON.parse(await readFile(process.env.FAKE_CONTROL_FILE, 'utf8')); } catch { /* defaults */ }
const mode = control.failOn?.includes(state.calls) ? (control.failMode ?? 'process-fail') : (control.mode ?? 'success');
if (control.stderr) process.stderr.write(control.stderr);

function instructionsPath() {
  if (provider === 'codex-cli') {
    const value = args.find((argument) => argument.startsWith('model_instructions_file='));
    return JSON.parse(value.slice('model_instructions_file='.length));
  }
  return args[args.indexOf('--system-prompt-file') + 1];
}

const instructions = await readFile(instructionsPath(), 'utf8');
const messagePayload = JSON.parse(stdin);
const last = messagePayload.messages.at(-1)?.content ?? '';
const isGrading = instructions.includes('AUTHORED RUBRIC:');

function rubric() {
  const marker = 'AUTHORED RUBRIC: ';
  const start = instructions.indexOf(marker);
  const end = instructions.indexOf('\nReturn only structured JSON.', start);
  return JSON.parse(instructions.slice(start + marker.length, end));
}

function grade() {
  const answer = JSON.parse(last).player_answer;
  const lower = answer.toLocaleLowerCase('es');
  const quoted = /["'].*(?:café|cafe|sin leche).*['"]/.test(lower) || /sign says|gerald said|two words/.test(lower);
  const otherPerson = /\b(?:she|he|friend)\b/.test(lower);
  const contradicted = /no\s+sin leche|sin leche.*con leche/.test(lower);
  const contextual = !quoted && !otherPerson;
  const cafeMatch = answer.match(/café|cafe/i);
  const quieroMatch = answer.match(/quiero/i);
  const noMilkMatch = answer.match(/sin leche|café solo|cafe solo|café negro|cafe negro/i);
  return {
    objective_results: rubric().map((objective) => {
      const evidence = [];
      if (objective.targets.some((target) => target.id === 'quiero') && quieroMatch) evidence.push({ vocabulary_id: 'quiero', evidence: quieroMatch[0], quality: 5 });
      const normalized = noMilkMatch?.[0].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      const noMilkId = normalized === 'sin leche' ? 'sin_leche' : normalized === 'cafe solo' ? 'cafe_solo' : normalized === 'cafe negro' ? 'cafe_negro' : null;
      if (objective.id === 'order_coffee' && cafeMatch) {
        if (noMilkId && noMilkId !== 'sin_leche') evidence.push({ vocabulary_id: noMilkId, evidence: noMilkMatch[0], quality: 5 });
        else evidence.push({ vocabulary_id: 'cafe', evidence: cafeMatch[0], quality: 5 });
      }
      if (objective.id === 'no_milk' && noMilkMatch) evidence.push({ vocabulary_id: noMilkId, evidence: noMilkMatch[0], quality: 5 });
      const passed = objective.id === 'order_coffee' ? contextual && Boolean(cafeMatch) : contextual && !contradicted && Boolean(noMilkMatch);
      return { objective_id: objective.id, passed, feedback: passed ? `Passed ${objective.id}.` : `Keep working on ${objective.id}.`, vocabulary_evidence: evidence };
    }),
    overall_feedback: 'Fixture assessment applied.',
  };
}

function narrate() {
  const turn = JSON.parse(last.split('TURN DATA: ').at(-1).trim());
  const greeting = turn.task === 'greeting';
  return {
    narrative: greeting ? 'A tiny barista glares over a cup.' : 'Gerald issues a verdict.',
    dialogue: {
      speaker: 'Gerald',
      native: greeting ? '¿Quieres un café? Sin leche es civilizado.' : 'Bien. Tu café será tomado en serio.',
      translation: greeting ? 'Do you want coffee? Without milk is civilized.' : 'Good. Your coffee will be taken seriously.',
      words: [{ word: 'café', pos: 'noun', meaning: 'coffee' }],
    },
    must_translate: true,
    difficulty: 1,
    hints_available: true,
    encounter_state: 'ongoing',
  };
}

let payload = isGrading ? grade() : narrate();
if (mode === 'schema-invalid') payload = {};
const failureCode = control.failureCode ?? 'quota_exceeded';

if (provider === 'codex-cli') {
  const outputPath = args[args.indexOf('--output-last-message') + 1];
  if (mode !== 'missing-final') {
    const serialized = mode === 'malformed' ? '{bad' : mode === 'duplicate-final'
      ? `${JSON.stringify(payload)}\n${JSON.stringify(payload)}` : JSON.stringify(payload);
    await writeFile(outputPath, serialized, 'utf8');
  }
  if (mode === 'failure-envelope') process.stdout.write(`${JSON.stringify({ type: 'error', error: { code: failureCode } })}\n`);
  else {
    process.stdout.write(`${JSON.stringify({ type: 'thread.started' })}\n`);
    process.stdout.write(`${JSON.stringify({ type: 'turn.completed', model: 'fake-codex-model' })}\n`);
    if (mode === 'duplicate-event') process.stdout.write(`${JSON.stringify({ type: 'turn.completed' })}\n`);
  }
} else {
  if (mode === 'malformed') process.stdout.write('{bad');
  else if (mode === 'duplicate-final') process.stdout.write(`${JSON.stringify({ type: 'result', subtype: 'success', structured_output: payload })}${JSON.stringify({ type: 'result', subtype: 'success', structured_output: payload })}`);
  else if (mode === 'missing-final') process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', result: JSON.stringify(payload) }));
  else if (mode === 'failure-envelope') process.stdout.write(JSON.stringify({ type: 'result', subtype: 'error', is_error: true, error: { code: failureCode } }));
  else process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, structured_output: payload, modelUsage: { 'fake-claude-model': {} } }));
}

if (mode === 'process-fail') process.exit(7);
