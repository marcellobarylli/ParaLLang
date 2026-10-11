#!/usr/bin/env node
process.env.FAKE_PROVIDER = 'claude-cli';
await import('./fake-cli.mjs');
