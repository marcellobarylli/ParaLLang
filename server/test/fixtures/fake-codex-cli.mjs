#!/usr/bin/env node
process.env.FAKE_PROVIDER = 'codex-cli';
await import('./fake-cli.mjs');
