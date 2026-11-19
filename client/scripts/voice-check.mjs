// Round 126: character voices and the spoken answer in a real browser. Plays the built client's first conversation
// in headless Chromium (Playwright, software WebGL) against the real server code with the tests' fixture provider
// (no model is called). The browser's speech synthesis and recognition are replaced by recorders, because headless
// Chromium has no voices and no recognition service: this checks what the page asks the browser to say and what it
// does with what the browser hears, not the sound. It takes pictures of the conversation and of Settings.
//
//   npm run build -w client
//   node client/scripts/voice-check.mjs [outDir]
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { loadGameContent } from '../../server/src/content-loader.js';
import { PassingProvider, createRuntime, passingAnswers } from '../../server/test/helpers.js';

// Playwright is not a dependency of the repo: it is taken from wherever Node finds it (NODE_PATH, a global install).
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '126', 'shots'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const problems = [];
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) problems.push(text); };

const content = loadGameContent({ language: 'it' });
const runtime = await createRuntime({ language: 'it', content, provider: new PassingProvider(content) });
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
// The server's address and token, and recorders in place of the browser's speech.
await page.addInitScript(([settings]) => {
  localStorage.setItem('parallang.settings', settings);
  const voice = (name, lang) => ({ name, lang, localService: true, default: false, voiceURI: name });
  const voices = [voice('Samantha', 'en-US'), voice('Alice', 'it-IT'), voice('Luca', 'it-IT'), voice('Shelley', 'it-IT'), voice('Grandpa', 'it-IT')];
  window.__spoken = [];
  window.__cancels = 0;
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    getVoices: () => voices, cancel: () => { window.__cancels += 1; }, addEventListener: () => {}, removeEventListener: () => {},
    speak: (utterance) => window.__spoken.push({ text: utterance.text, lang: utterance.lang, voice: utterance.voice?.name ?? null, pitch: utterance.pitch, rate: utterance.rate, volume: utterance.volume }),
  } });
  window.SpeechSynthesisUtterance = function Utterance(text) { this.text = text; this.volume = 1; };
  window.__recognitions = [];
  const Recognition = function Recognition() { window.__recognitions.push(this); this.start = () => { this.started = true; }; this.stop = () => { this.onend?.(); }; };
  window.SpeechRecognition = Recognition;
  window.webkitSpeechRecognition = Recognition;
}, [JSON.stringify({ serverUrl: ORIGIN, token: runtime.token })]);

const shot = (name) => page.screenshot({ path: join(OUT, `${name}.jpg`), type: 'jpeg', quality: 82 });
const lines = () => page.evaluate(() => window.__spoken.filter((line) => line.volume !== 0));
const portia = content.encounters.get(content.dungeons.get('ta_prohm').sites[0].encounter).character;

try {
  await page.goto(`${ORIGIN}${BASE_PATH}`);
  await page.getByRole('button', { name: 'Enter', exact: true }).tap({ timeout: 60000 });
  const primed = await page.evaluate(() => window.__spoken.filter((line) => line.volume === 0).length);
  check(primed === 1, `the first tap speaks one silent utterance, so iOS lets the page speak later (${primed})`);
  await page.getByRole('button', { name: 'Enter Ta Prohm' }).tap();
  await page.getByRole('button', { name: 'Start', exact: true }).tap();
  check((await lines()).length === 0, 'nothing is read while the camera is on its way');
  await page.getByLabel(`Conversation with ${portia.name}`).waitFor({ timeout: 60000 });
  await page.waitForTimeout(300);

  const first = await lines();
  const shown = await page.locator('.native-line').first().textContent();
  check(first.length === 1 && first[0].text === shown.replace(/[*_~`#]+/g, '').replace(/\s+/g, ' ').trim(), `the greeting is read once, as written (${JSON.stringify(first[0]?.text)})`);
  check(first[0]?.voice === 'Alice' && first[0]?.lang === 'it-IT', `${portia.name} (${portia.voice.kind}) speaks with the Italian woman's voice (${first[0]?.voice}, ${first[0]?.lang})`);
  check(first[0]?.pitch === portia.voice.pitch && first[0]?.rate === portia.voice.rate, `at her sheet's pitch and rate (${first[0]?.pitch}, ${first[0]?.rate})`);
  await shot('01-conversation');

  // The microphone: what the browser hears goes into the box, and is not sent.
  const [answer] = passingAnswers(content, content.dungeons.get('ta_prohm').sites[0].encounter);
  await page.getByRole('button', { name: 'Speak your response in Italian' }).tap();
  const listening = await page.evaluate(() => ({ lang: window.__recognitions[0]?.lang, interim: window.__recognitions[0]?.interimResults, started: window.__recognitions[0]?.started, cancels: window.__cancels }));
  check(listening.started && listening.lang === 'it-IT' && listening.interim === true, `the microphone listens in Italian with interim results (${JSON.stringify(listening)})`);
  await page.evaluate((text) => {
    const result = (transcript, isFinal) => Object.assign([{ transcript }], { isFinal });
    const half = text.slice(0, Math.ceil(text.length / 2));
    window.__recognitions[0].onresult({ results: [result(half, false)] });
    window.__recognitions[0].onresult({ results: [result(text, true)] });
  }, answer);
  await shot('02-listening');
  check(await page.getByLabel('Your response').inputValue() === answer, `what was heard is in the reply box (${JSON.stringify(await page.getByLabel('Your response').inputValue())})`);
  await page.getByRole('button', { name: 'Stop listening' }).tap();
  check(await page.locator('.player-message').count() === 0, 'and nothing was sent');

  // Sending stops the voice, and the reply is read.
  const cancels = await page.evaluate(() => window.__cancels);
  await page.getByRole('button', { name: 'Send' }).tap();
  await page.locator('.npc-message').nth(1).waitFor({ timeout: 60000 });
  await page.waitForTimeout(300);
  const second = await lines();
  check(await page.evaluate(() => window.__cancels) > cancels, 'sending stops the voice');
  check(second.length === 2 && second[1].voice === 'Alice', `the reply is read, once (${second.length} lines, ${JSON.stringify(second[1]?.text)})`);
  await page.getByRole('button', { name: `Hear ${portia.name} say this line` }).first().tap();
  const third = await lines();
  check(third.length === 3 && third[2].text === first[0].text, 'a line\'s 🔊 reads that line again');

  // A refusal, as a page opened from the home screen is reported to give.
  await page.getByRole('button', { name: 'Speak your response in Italian' }).tap();
  await page.evaluate(() => { const r = window.__recognitions.at(-1); r.onerror({ error: 'service-not-allowed' }); r.onend(); });
  check(await page.getByText(/will not listen here/).isVisible(), 'a refusal to listen is said under the box, with the keyboard\'s microphone as the way round');
  await shot('03-refused');

  // Settings.
  await page.getByRole('button', { name: 'Settings' }).tap();
  const box = page.getByLabel('Character voices');
  check(await box.isChecked(), 'Settings shows "Character voices", ticked');
  await shot('04-settings');
  await box.tap();
  check(!(await box.isChecked()) && await page.evaluate(() => JSON.parse(localStorage.getItem('parallang.display')).voices === false), 'a tap switches the voices off and the choice is stored');
} catch (error) {
  problems.push(`the check stopped: ${error.message}`);
  console.error(error);
  await shot('x-stopped').catch(() => {});
} finally {
  await browser.close();
  await runtime.close();
}
console.log(problems.length ? `${problems.length} problem(s)` : '0 problems');
process.exit(problems.length ? 1 : 0);
