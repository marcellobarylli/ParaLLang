#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const [mode, ...args] = process.argv.slice(2);

if (mode === 'echo') {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    const output = Buffer.from(JSON.stringify({ args, input, multibyte: 'café ☕' }));
    for (let index = 0; index < output.length; index += 2) process.stdout.write(output.subarray(index, index + 2));
  });
} else if (mode === 'overflow') {
  process.stdout.write('x'.repeat(Number(args[0] ?? 4096)));
} else if (mode === 'stderr-overflow') {
  process.stderr.write('x'.repeat(Number(args[0] ?? 4096)));
} else if (mode === 'fail-after-output') {
  process.stdout.write('{"looks":"final"}\n');
  setTimeout(() => process.exit(9), 20);
} else if (mode === 'delay') {
  setTimeout(() => process.stdout.write('done'), Number(args[0] ?? 100));
} else if (mode === 'tree') {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  await writeFile(args[0], String(child.pid), 'utf8');
  process.on('SIGTERM', () => {});
  setInterval(() => {}, 1000);
} else {
  process.exit(2);
}
