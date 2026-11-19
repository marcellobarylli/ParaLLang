// Renders the reference shots in docs/shots/ from a running demo (npm run build && npm run preview).
// Needs Playwright with Chromium; WebGL runs on SwiftShader, so no GPU is required.
//
//   node scripts/screenshots.cjs [baseUrl] [outDir]
//
// The shots are the visual target for any port of the look: render the same views and compare.

const path = require('node:path');
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://localhost:5181';
const out = process.argv[3] ?? path.join(__dirname, '..', 'docs', 'shots');

const SHOTS = {
  'approach-golden': 't=0.02&pause=1',
  'pool-golden': 'cam=-22,2.2,43.5,-4,11,0',
  'pool-modern': 'cam=-22,2.2,43.5,-4,11,0&ps1=0',
  'stele-dawn': 'cam=12,2.4,90,9.5,2,86&preset=dawn',
  'shrine-corrupted': 'cam=-31,4,25,-39,5.5,4&preset=corrupted',
  'aerial-day': 'orbit=0.5,0.32,95&preset=day',
  'taprohm-face-gopura': 'scene=taprohm&cam=0,2.6,74,0,6.5,57',
  'taprohm-gate-tree': 'scene=taprohm&cam=-3,2.2,41,0,5,28.7',
  'taprohm-wall-tree-corrupted': 'scene=taprohm&cam=-24,2.6,14,-33,4.5,6&preset=corrupted',
  'taprohm-fig-tower-golden': 'scene=taprohm&cam=27,3,27,18.7,5,16.7&preset=golden',
  'kiln-face-gopura': 'scene=kiln&cam=0,2.6,74,0,6.5,57',
  'kiln-gate-tree': 'scene=kiln&cam=-3,2.2,41,0,5,28.7',
  'kiln-wall-tree': 'scene=kiln&cam=-24,2.6,14,-33,4.5,6',
  'kiln-moat': 'scene=kiln&cam=24,5,76,40,0,58',
};

(async () => {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  for (const [name, query] of Object.entries(SHOTS)) {
    await page.goto(`${base}/?${query}&ui=0`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    console.log('wrote', name);
  }
  await browser.close();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
})();
