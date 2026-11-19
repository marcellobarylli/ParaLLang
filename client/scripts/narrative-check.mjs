// Round 130: the narration's tappable words in a real browser. Plays the built client to its first conversation in
// headless Chromium (Playwright, software WebGL) against the real server code; the narration is scripted with
// Italian words and their list, as the prompt asks a model for (no model is called). Taps a word and takes pictures.
//
//   npm run build -w client
//   node client/scripts/narrative-check.mjs [outDir]
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { loadGameContent } from '../../server/src/content-loader.js';
import { PassingProvider, createRuntime } from '../../server/test/helpers.js';

// Playwright is not a dependency of the repo: it is taken from wherever Node finds it (NODE_PATH, a global install).
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '130', 'shots'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const NARRATIVE = 'The arco has stood at the edge of the mercato for longer than the mercato has existed, which it considers a matter of principle. A little polvere falls from the keystone whenever it disapproves, and today the polvere is steady.';
const LISTED = [{ word: 'arco', meaning: 'archway' }, { word: 'mercato', meaning: 'market' }, { word: 'polvere', meaning: 'dust' }, { word: 'ciao', meaning: 'hello' }];

class NarratingProvider extends PassingProvider {
  narrate(messages) { return { ...super.narrate(messages), narrative: NARRATIVE, narrative_words: LISTED }; }
}

const problems = [];
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) problems.push(text); };
const content = loadGameContent({ language: 'it' });
const runtime = await createRuntime({ language: 'it', content, provider: new NarratingProvider(content) });
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
const page = await context.newPage();
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
await page.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin !== ORIGIN) return route.fulfill({ status: 503, body: '' });
  if (url.pathname.startsWith('/api/')) {
    const answer = await fetch(`${runtime.baseUrl}${url.pathname}${url.search}`, { method: request.method(), headers: request.headers(), body: request.postData() ?? undefined });
    return route.fulfill({ status: answer.status, contentType: answer.headers.get('content-type') ?? 'application/json', body: await answer.text() });
  }
  const file = url.pathname.slice(BASE_PATH.length) || 'index.html';
  try { return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: await readFile(join(DIST, file)) }); } catch { return route.fulfill({ status: 404, body: '' }); }
});
await page.addInitScript(([settings]) => {
  localStorage.setItem('parallang.settings', settings);
  localStorage.setItem('parallang.display', JSON.stringify({ music: false, voices: false }));
}, [JSON.stringify({ serverUrl: ORIGIN, token: runtime.token })]);
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 82 });

try {
  await page.goto(`${ORIGIN}${BASE_PATH}`);
  await page.getByRole('button', { name: 'Enter', exact: true }).tap({ timeout: 60000 });
  await page.getByRole('button', { name: 'Enter Ta Prohm' }).tap();
  await page.getByRole('button', { name: 'Start', exact: true }).tap();
  await page.getByLabel('Conversation with Portia').waitFor({ timeout: 60000 });
  const narration = page.locator('p.narrative').first();
  await narration.scrollIntoViewIfNeeded();
  check(await narration.textContent() === NARRATIVE, 'the narration reads as written');
  const words = await narration.getByRole('button').allTextContents();
  check(JSON.stringify(words) === JSON.stringify(['arco', 'mercato', 'mercato', 'polvere', 'polvere']), `its Italian words are buttons in the text (${words.join(', ')})`);
  check(!words.includes('ciao'), 'a word that is one of Portia\'s answers is not offered');
  await shot('01-narration');
  await narration.getByRole('button', { name: 'Translate polvere' }).first().tap();
  await narration.getByRole('button', { name: 'Translate arco' }).tap();
  check((await narration.textContent()).includes('The arco (archway) has stood') && (await narration.textContent()).includes('A little polvere (dust) falls'), 'a tap shows the meaning after the word');
  await shot('02-tapped');
  await narration.getByRole('button', { name: 'arco: archway' }).tap();
  check(!(await narration.textContent()).includes('(archway)'), 'a second tap hides it');
} catch (error) {
  problems.push(`the check stopped: ${error.message}`);
  console.error(error);
  await shot('x-stopped').catch(() => {});
} finally {
  await browser.close();
  await runtime.close();
}
for (const problem of problems) console.error('problem:', problem);
console.log(problems.length ? `${problems.length} problem(s)` : '0 problems');
process.exit(problems.length ? 1 : 0);
