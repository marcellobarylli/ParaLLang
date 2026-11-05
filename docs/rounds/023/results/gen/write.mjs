import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/work/ParaLLang/server/package.json');
const yaml = require('js-yaml');
const [, , json, root] = process.argv;
for (const [path, data] of JSON.parse(readFileSync(json, 'utf8'))) writeFileSync(join(root, path), yaml.dump(data, { lineWidth: 1000, noRefs: true }));
console.log('written');
