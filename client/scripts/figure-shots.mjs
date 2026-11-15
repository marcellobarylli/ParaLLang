// Round 122: pictures of the characters' figures at their sites, for looking at them while they are built. It loads
// the built web client in headless Chromium with no server (the page works without one), hides the panels, lifts the
// fog, and for each site puts the camera where a conversation holds it, then where a resolved conversation holds it.
//
//   npm run build -w client
//   CHROME_PATH=/path/to/chrome PUPPETEER_CORE=/path/to/node_modules/puppeteer-core node client/scripts/figure-shots.mjs [outDir]
//
// Chromium is driven over a pipe and the page is served by request interception: nothing listens on a port. On the
// real-itu cluster it still belongs in a Slurm job. puppeteer-core is not a dependency of the repo.
import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '122', 'shots', 'figures'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const SIZES = [
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, free: 0.38 }, // the conversation sheet leaves the top 38%
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, free: 1 },
];
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function loadPuppeteer() {
  const from = process.env.PUPPETEER_CORE;
  if (!from) return (await import('puppeteer-core')).default;
  const loaded = await import(pathToFileURL(createRequire(join(resolve(from), 'package.json')).resolve(resolve(from))).href);
  const module = loaded.default ?? loaded;
  return typeof module.launch === 'function' ? module : module.default;
}

const puppeteer = await loadPuppeteer();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH, headless: true, pipe: true,
  env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: 'disabled:' },
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
let failed = false;
try {
  await mkdir(OUT, { recursive: true });
  for (const size of SIZES) {
    const page = await (await browser.createBrowserContext()).newPage();
    await page.setViewport(size);
    page.on('pageerror', (error) => { failed = true; console.error('pageerror', error.message); });
    await page.setRequestInterception(true);
    page.on('request', async (request) => {
      const url = new URL(request.url());
      if (url.origin !== ORIGIN || !url.pathname.startsWith(BASE_PATH)) return void request.abort().catch(() => {});
      const file = join(DIST, decodeURIComponent(url.pathname.slice(BASE_PATH.length)) || 'index.html');
      const body = file.startsWith(DIST) ? await readFile(file).catch(() => null) : null;
      return void request.respond(body ? { status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body } : { status: 404, body: '' });
    });
    await page.goto(`${ORIGIN}${BASE_PATH}`, { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__parallangLevel), { timeout: 60000 });
    // No panels; the camera frames the part of the screen a conversation leaves free.
    await page.addStyleTag({ content: '.hud, .dock, .site-labels, .error-banner { display: none !important; }' });
    const sites = await page.evaluate((free) => {
      const level = window.__parallangLevel;
      level.setProgress({}); // no fog
      level.setInsets({ top: free < 1 ? 62 : 46, right: 0, left: 0, bottom: Math.round(innerHeight * (1 - free)) }); // the top bar, and the sheet on a phone
      return level.figures.map((figure) => figure && figure.name);
    }, size.free);
    for (const [index, name] of sites.entries()) {
      if (!name) continue;
      for (const [label, engage] of [['hold', 0], ['resolved', 1]]) {
        const seen = await page.evaluate(async (site, level01) => {
          const level = window.__parallangLevel;
          level.setPhase({ phase: 'attract', siteIndex: 0 });
          level.setPhase({ phase: 'approach', siteIndex: site });
          level.director.skip();
          level.director.engage(level01);
          for (let i = 0; i < 90; i += 1) level.step(1 / 30); // three seconds: the step in has eased
          const figure = level.figures[site];
          const pose = level.director.pose;
          return { figure: figure.name, visible: figure.visible, scale: Math.round(figure.scale * 100) / 100, camera: pose.position.map((v) => Math.round(v * 100) / 100), away: Math.round(Math.hypot(pose.position[0] - figure.position[0], pose.position[2] - figure.position[2]) * 100) / 100 };
        }, index, engage);
        await sleep(250);
        await page.screenshot({ path: join(OUT, `${String(index + 1)}-${name}-${label}-${size.name}.jpg`), type: 'jpeg', quality: 80 });
        console.log(size.name, label, JSON.stringify(seen));
        if (!seen.visible || seen.scale < 0.99) { failed = true; console.error('NOT SHOWN WHOLE', name, label); }
      }
    }
    const triangles = await page.evaluate(() => window.__parallangLevel.sceneTriangles);
    console.log(size.name, 'scene triangles', JSON.stringify(triangles));
    if (triangles.total > 64000) { failed = true; console.error('OVER THE BUDGET'); }
    await page.close();
  }
} catch (error) {
  failed = true;
  console.error('FAILED', error);
} finally { await browser.close(); }
process.exit(failed ? 1 : 0);
