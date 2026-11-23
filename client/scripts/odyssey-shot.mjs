// Round 165: draws the chart of the Odyssey alone, outside the game, and takes its picture in headless Chromium:
// once whole at the width of a phone's card (chart-phone.jpg) and once large, the map alone (chart-large.jpg).
//
//   node client/scripts/odyssey-shot.mjs [outDir]
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? 'docs/rounds/165/shots');
mkdirSync(out, { recursive: true });

const vite = await createServer({ root, configFile: join(root, 'vite.config.js'), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
const { default: OdysseyChart } = await vite.ssrLoadModule('/src/components/OdysseyChart.jsx');
const figure = renderToStaticMarkup(createElement(OdysseyChart));
await vite.close();

const css = readFileSync(join(root, 'src', 'index.css'), 'utf8');
const page = (width) => `<!doctype html><meta charset="utf-8"><style>${css}</style><body style="margin:0;background:#141614;color:#f4efe0;font-family:system-ui,sans-serif"><div id="card" style="width:${width}px;padding:12px;box-sizing:border-box">${figure}</div>`;
const browser = await chromium.launch();
for (const [name, width, scale] of [['chart-phone', 366, 2], ['chart-large', 1400, 1]]) {
  const tab = await browser.newPage({ viewport: { width: width + 40, height: 900 }, deviceScaleFactor: scale });
  await tab.setContent(page(width));
  await tab.locator(scale > 1 ? '#card' : '#card svg').screenshot({ path: join(out, `${name}.jpg`), type: 'jpeg', quality: 88 });
  await tab.close();
}
await browser.close();
console.log(`pictures in ${out}`);
