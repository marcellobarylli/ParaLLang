// Round 116: looks at the deployed web client. It loads the Pages site in headless Chromium, waits for the 3D level,
// goes from the title to the route and presses Start. Without an access token the hosted server refuses, so the
// run stops there: the check is that the level renders, the two far camera states work and the refusal is explained.
// With PARALLANG_TOKEN set it starts the first conversation (one model call on the owner's subscription).
//
//   CHROME_PATH=/path/to/chrome PUPPETEER_CORE=/path/to/node_modules/puppeteer-core \
//     node client/scripts/live-check.mjs [url] [outDir]
//
// Chromium is driven over a pipe, so nothing listens on a port. It still belongs in a Slurm job on the cluster.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const URL_ = process.argv[2] ?? 'https://marcellobarylli.github.io/ParaLLang/';
const OUT = resolve(process.argv[3] ?? 'live-check');
const TOKEN = process.env.PARALLANG_TOKEN ?? '';
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
  for (const size of [{ name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 }]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport(size);
    const problems = [];
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('requestfailed', (request) => problems.push(`request failed: ${request.url()} ${request.failure()?.errorText}`));
    if (TOKEN) await page.evaluateOnNewDocument((token) => { const s = JSON.parse(localStorage.getItem('parallang.settings') ?? '{}'); if (!s.token) localStorage.setItem('parallang.settings', JSON.stringify({ ...s, token })); }, TOKEN);
    const click = (label) => page.evaluate((text) => { const b = [...document.querySelectorAll('button')].find((e) => e.textContent.trim().startsWith(text) && !e.disabled); b?.click(); return Boolean(b); }, label);
    const read = () => page.evaluate(() => {
      const s = window.__parallang.store.getState();
      const d = window.__parallangLevel?.director;
      return { phase: s.phase, connection: s.connection, serverProblem: s.serverProblem, siteError: s.siteError, serverUrl: s.settings.serverUrl, level: Boolean(d), mode: d?.mode, stage: d?.stage, encounter: s.encounter?.encounterId ?? null, text: document.querySelector('.dock')?.innerText.slice(0, 300) };
    });
    const started = Date.now();
    await page.goto(URL_, { waitUntil: 'load', timeout: 60000 });
    const version = await page.evaluate(() => fetch('./version.json').then((r) => r.json()).catch(() => null));
    await page.waitForFunction(() => Boolean(window.__parallangLevel), { timeout: 60000 });
    console.log(size.name, 'level ready after', ((Date.now() - started) / 1000).toFixed(1), 's; build', JSON.stringify(version));
    await sleep(3000);
    await page.screenshot({ path: join(OUT, `live-1-attract-${size.name}.jpg`), type: 'jpeg', quality: 72 });
    console.log(size.name, 'attract', JSON.stringify(await read()));
    if (!(await click('Enter'))) throw new Error('no Enter button');
    await page.waitForFunction(() => window.__parallangLevel.director.mode === 'overview' && window.__parallangLevel.director.arrived, { timeout: 30000 });
    await sleep(2600);
    await page.screenshot({ path: join(OUT, `live-2-overview-${size.name}.jpg`), type: 'jpeg', quality: 72 });
    console.log(size.name, 'overview', JSON.stringify(await read()));
    if (!(await click('Start')) && !(await click('Continue'))) throw new Error('no Start button');
    // Either the server refuses (no token) and the route card says why, or the first conversation opens.
    await page.waitForFunction(() => { const s = window.__parallang.store.getState(); return !s.starting && (s.serverProblem || s.siteError || s.phase === 'encounter'); }, { timeout: 150000, polling: 250 });
    await sleep(2000);
    await page.screenshot({ path: join(OUT, `live-3-start-${size.name}.jpg`), type: 'jpeg', quality: 72 });
    const end = await read();
    console.log(size.name, 'after Start', JSON.stringify(end));
    const expected = TOKEN ? end.phase === 'encounter' : /access token/.test(end.serverProblem ?? '');
    if (!expected) { failed = true; console.error(size.name, 'UNEXPECTED state after Start'); }
    // A refused token logs a 401 in the console; that is the expected refusal, not a page problem.
    for (const problem of problems) { failed = true; console.error(' ', problem); }
    await context.close();
  }
} catch (error) {
  failed = true;
  console.error('FAILED', error);
} finally { await browser.close(); }
process.exit(failed ? 1 : 0);
