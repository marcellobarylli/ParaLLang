// Round 129: beginner mode in a real browser. Plays the built client's first conversation in headless Chromium
// (Playwright, software WebGL) against the real server code. The grader is scripted to answer as the beginner prompt
// asks a model to (no model is called): the owner's own answer to Portia is understood, corrected and let through
// for one heart. Checks the screen and takes pictures.
//
//   npm run build -w client
//   node client/scripts/beginner-check.mjs [outDir]
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { loadGameContent } from '../../server/src/content-loader.js';
import { PassingProvider, createRuntime } from '../../server/test/helpers.js';

// Playwright is not a dependency of the repo: it is taken from wherever Node finds it (NODE_PATH, a global install).
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '129', 'shots'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const OWNERS = 'Bungiorno! Me chiamo Luigione. Come te chiame?';
const CORRECT = 'Buongiorno! Mi chiamo Luigione. Come ti chiami?';

// The owner's answer is tried on all three objectives and corrected; anything else is graded by the fixture.
class BeginnerProvider extends PassingProvider {
  grade(messages) {
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    if (answer !== OWNERS) return super.grade(messages);
    return {
      objective_results: [
        { objective_id: 'greet', passed: false, attempted: true, feedback: 'Nearly: the greeting is spelled buongiorno.', vocabulary_evidence: [] },
        { objective_id: 'introduce', passed: false, attempted: true, feedback: 'Almost: it is mi chiamo, with mi.', vocabulary_evidence: [] },
        { objective_id: 'ask_back', passed: false, attempted: true, feedback: 'Close: come ti chiami, with ti and an i at the end.', vocabulary_evidence: [] },
      ],
      overall_feedback: 'You greeted Portia, told her your name and asked hers. Three small slips, all easy to fix.',
      correction: CORRECT, correction_translation: 'Good morning! My name is Luigione. What is your name?',
    };
  }
}

const problems = [];
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) problems.push(text); };

const content = loadGameContent({ language: 'it' });
const runtime = await createRuntime({ language: 'it', content, provider: new BeginnerProvider(content) });
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
const page = await context.newPage();
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
const sent = [];
await page.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin !== ORIGIN) return route.fulfill({ status: 503, body: '' });
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/encounter/dialogue') sent.push(JSON.parse(request.postData()));
    const answer = await fetch(`${runtime.baseUrl}${url.pathname}${url.search}`, { method: request.method(), headers: request.headers(), body: request.postData() ?? undefined });
    return route.fulfill({ status: answer.status, contentType: answer.headers.get('content-type') ?? 'application/json', body: await answer.text() });
  }
  const file = url.pathname.slice(BASE_PATH.length) || 'index.html';
  try { return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: await readFile(join(DIST, file)) }); } catch { return route.fulfill({ status: 404, body: '' }); }
});
// The server's address and token; no music and no voices in this check.
await page.addInitScript(([settings]) => {
  localStorage.setItem('parallang.settings', settings);
  if (!localStorage.getItem('parallang.display')) localStorage.setItem('parallang.display', JSON.stringify({ music: false, voices: false }));
}, [JSON.stringify({ serverUrl: ORIGIN, token: runtime.token })]);
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 82 });

try {
  await page.goto(`${ORIGIN}${BASE_PATH}`);
  await page.getByRole('button', { name: 'Enter', exact: true }).tap({ timeout: 60000 });
  await page.getByRole('button', { name: 'Enter Ta Prohm' }).tap();
  await page.getByRole('button', { name: 'Start', exact: true }).tap();
  await page.getByLabel('Conversation with Portia').waitFor({ timeout: 60000 });
  check(await page.getByLabel('3 of 3 hearts left').textContent() === '♥♥♥', 'the objective card shows three hearts');
  await shot('01-hearts');

  await page.getByRole('textbox', { name: 'Your response' }).fill(OWNERS);
  await page.getByRole('button', { name: 'Send' }).tap();
  const card = page.getByRole('region', { name: 'What you meant' });
  await card.waitFor({ timeout: 60000 });
  check(sent.length === 1 && sent[0].beginner === true, 'the answer went to the server as a beginner\'s');
  check((await card.textContent()).includes(CORRECT), `the corrected sentence is shown (${CORRECT})`);
  check(await page.getByLabel('One heart used').isVisible(), 'one heart is marked as used');
  check(await page.getByText('Portia sighs with relief', { exact: false }).count() > 0 || await page.locator('.victory-banner').count() > 0, 'the conversation moved on: Portia lets the player pass');
  check(await page.getByLabel('2 of 3 hearts left').count() === 1 || await page.locator('.hearts').count() === 0, 'the hearts read two of three (or the finished conversation shows none)');
  await card.scrollIntoViewIfNeeded();
  await shot('02-corrected');

  // The practice: wrong, then right, and nothing more is sent.
  await page.getByRole('textbox', { name: 'Say it yourself' }).fill('Buongiorno! Me chiamo Luigione. Come ti chiami?');
  await page.getByRole('button', { name: 'Check' }).tap();
  check(await page.getByText('✓ Yeah, pretty good. You probably said it right.').isVisible(), 'a try that is not the sentence is green too (round 201)');
  await page.getByRole('textbox', { name: 'Say it yourself' }).fill('buongiorno mi chiamo luigione come ti chiami');
  await page.getByRole('button', { name: 'Check' }).tap();
  check(await page.getByText('✓ That\'s it.').isVisible(), 'the right sentence is accepted without its capitals and punctuation');
  check(sent.length === 1, 'the practice sent nothing to the server');
  await page.getByText('✓ That\'s it.').scrollIntoViewIfNeeded();
  await shot('03-practice');

  await page.getByRole('button', { name: 'Settings' }).tap();
  check(await page.getByLabel('Beginner mode').isChecked(), 'Settings shows "Beginner mode", ticked');
  await page.getByLabel('Beginner mode').scrollIntoViewIfNeeded();
  await shot('04-settings');
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
