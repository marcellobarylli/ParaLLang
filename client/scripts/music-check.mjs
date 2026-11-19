// Round 127: the ambient music in a real browser (headless Chromium, Playwright).
//   1. The built page: no audio before a tap; at the first tap an audio context runs and oscillators sound at the
//      chord table's frequencies.
//   2. The module itself (client/src/ambience.js, served as it is): three chords are rendered offline through the
//      real Web Audio graph, the peak and the average level are measured, and the result is written as a WAV file
//      for a person to listen to. No server runs; /api is refused.
//
//   npm run build -w client
//   node client/scripts/music-check.mjs [outDir]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { AMBIENCE, CHORDS, noteFrequency } from '../src/ambience.js';

// Playwright is not a dependency of the repo: it is taken from wherever Node finds it (NODE_PATH, a global install).
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '127'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const RATE = 16000; // the sample's rate: the music is filtered near 900 Hz
const CHORDS_RENDERED = 3;

const problems = [];
const check = (ok, text) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}`); if (!ok) problems.push(text); };

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
const page = await context.newPage();
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== ORIGIN || url.pathname.includes('/api/')) return route.fulfill({ status: 503, body: 'no server in this check' });
  if (url.pathname === '/ambience.js') return route.fulfill({ status: 200, contentType: 'text/javascript', body: await readFile(join(ROOT, 'client', 'src', 'ambience.js')) });
  const file = url.pathname.slice(BASE_PATH.length) || 'index.html';
  try { return route.fulfill({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: await readFile(join(DIST, file)) }); } catch { return route.fulfill({ status: 404, body: '' }); }
});
// A recorder round the real AudioContext: which contexts were made, and each oscillator's kind and frequency.
await page.addInitScript(() => {
  window.__audio = { contexts: [], oscillators: [] };
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...args) { super(...args); window.__audio.contexts.push(this); }
    createOscillator() { const oscillator = super.createOscillator(); window.__audio.oscillators.push(oscillator); return oscillator; }
  };
});

try {
  await page.goto(`${ORIGIN}${BASE_PATH}`);
  await page.getByRole('button', { name: 'Enter', exact: true }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  check(await page.evaluate(() => window.__audio.contexts.length) === 0, 'before a tap the page has made no audio context');
  await page.getByRole('button', { name: 'Enter', exact: true }).tap();
  await page.waitForTimeout(800);
  const live = await page.evaluate(() => ({
    contexts: window.__audio.contexts.length, state: window.__audio.contexts[0]?.state, time: window.__audio.contexts[0]?.currentTime,
    notes: window.__audio.oscillators.filter((o) => o.type === 'triangle').map((o) => Math.round(o.frequency.value * 100) / 100),
  }));
  check(live.contexts === 1 && live.state === 'running' && live.time > 0, `the first tap starts one audio context and its clock runs (${live.state}, ${live.time?.toFixed(2)} s)`);
  const wanted = CHORDS[0].notes.map((note) => Math.round(noteFrequency(note) * 100) / 100);
  check(live.notes.length === 8 && wanted.every((f) => live.notes.filter((n) => n === f).length === 2), `eight oscillators sound the first chord, ${CHORDS[0].name} (${[...new Set(live.notes)].join(', ')} Hz)`);

  await page.getByRole('button', { name: 'Settings' }).tap();
  const box = page.getByLabel('Ambient music');
  check(await box.isChecked(), 'Settings shows "Ambient music", ticked');
  await box.tap();
  await page.waitForTimeout(2200);
  check(await page.evaluate(() => window.__audio.contexts[0].state) === 'closed', 'unticking it fades the music out and closes the audio context');
  await box.tap();
  await page.waitForTimeout(500);
  check(await page.evaluate(() => window.__audio.contexts.length === 2 && window.__audio.contexts[1].state === 'running'), 'ticking it again starts the music at once');

  // The sound itself, rendered offline: the module drives a real offline context whose clock the script moves.
  const seconds = AMBIENCE.period * CHORDS_RENDERED + AMBIENCE.release + 1;
  const rendered = await page.evaluate(async ([rate, length, chords, period]) => {
    const { createAmbience } = await import('/ambience.js');
    const offline = new OfflineAudioContext(1, Math.ceil(rate * length), rate);
    let now = 0;
    const timers = [];
    let seed = 20261119;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const scope = {
      document: { hidden: false },
      setTimeout: (fn) => { timers.push(fn); return timers.length; }, clearTimeout: () => {},
      AudioContext: function Offline() {
        return new Proxy(offline, { get: (target, key) => (key === 'currentTime' ? now : typeof target[key] === 'function' ? target[key].bind(target) : target[key]) });
      },
    };
    const ambience = createAmbience({ scope, random });
    ambience.start();
    const played = [ambience.chord];
    for (let i = 1; i < chords; i++) { now += period; timers.pop()(); played.push(ambience.chord); }
    const buffer = await offline.startRendering();
    const data = buffer.getChannelData(0);
    let peak = 0; let sum = 0;
    for (const v of data) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
    return { played, peak, rms: Math.sqrt(sum / data.length), samples: Array.from(data, (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767)) };
  }, [RATE, seconds, CHORDS_RENDERED, AMBIENCE.period]);
  const db = (v) => (20 * Math.log10(v)).toFixed(1);
  console.log(`rendered ${seconds} s: chords ${rendered.played.map((i) => CHORDS[i].name).join(' → ')}; peak ${rendered.peak.toFixed(3)} (${db(rendered.peak)} dBFS), average ${rendered.rms.toFixed(3)} (${db(rendered.rms)} dBFS)`);
  check(rendered.peak > 0.005, 'the rendered music is not silence');
  check(rendered.peak < 0.5, `it stays far from full scale (peak ${rendered.peak.toFixed(3)})`);
  check(new Set(rendered.played).size === CHORDS_RENDERED, 'three different chords follow each other');
  // The WAV as it would be heard: the page's own level, 16-bit mono.
  const pcm = Buffer.alloc(rendered.samples.length * 2);
  rendered.samples.forEach((v, i) => pcm.writeInt16LE(v, i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  await writeFile(join(OUT, 'ambience-sample.wav'), Buffer.concat([header, pcm]));
  console.log(`wrote ${join(OUT, 'ambience-sample.wav')} (${((44 + pcm.length) / 1e6).toFixed(2)} MB)`);
} catch (error) {
  problems.push(`the check stopped: ${error.message}`);
  console.error(error);
} finally {
  await browser.close();
}
for (const problem of problems) console.error("problem:", problem);
console.log(problems.length ? `${problems.length} problem(s)` : "0 problems");
process.exit(problems.length ? 1 : 0);
