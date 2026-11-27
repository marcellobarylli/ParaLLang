// Round 204: the legacy dungeons under the road's sky. Opens the client's sources through Vite's dev server in
// headless Chromium, builds each dungeon's level with a seed, holds a weather still (weatherClock.js) and takes a
// picture at a site: by day, at dusk, at night, and at night in a storm. It fails if the effects do not follow.
//
//   node client/scripts/dungeon-sky-check.mjs [outDir]
import { createServer } from 'vite';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(process.argv[2] ?? join(ROOT, '..', 'docs', 'rounds', '204', 'shots'));
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(join(process.env.PLAYWRIGHT_DIR ?? '/usr/lib/node_modules', 'playwright')); } })();

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, host: '127.0.0.1' } });
await server.listen();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
await mkdir(OUT, { recursive: true });
const problems = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) problems.push(what); };
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => problems.push(error.message));
  await page.goto('http://127.0.0.1:5199/scripts/blank.html').catch(() => {});
  await page.setContent('<canvas id="c" style="position:fixed;inset:0;width:100vw;height:100vh"></canvas>');
  const WEATHERS = { day: { phase: 0.25, rain: 0 }, dusk: { phase: 0.56, rain: 0 }, night: { phase: 0.8, rain: 0 }, storm: { phase: 0.8, rain: 1 }, 'rain-by-day': { phase: 0.25, rain: 0.7 } };
  for (const [key, siteIndex] of [['DUNGEON', 1], ['KILN', 1], ['MICROMORT_MOUNTAIN', 0]]) {
    const seen = {};
    for (const [name, weather] of Object.entries(WEATHERS)) {
      seen[name] = await page.evaluate(async ({ key, siteIndex, weather }) => {
        const [{ createLevelView }, dungeons, { pinWeather }] = await Promise.all([import('/src/scene/levelView.js'), import('/src/dungeon.js'), import('/src/scene/weatherClock.js')]);
        window.__view?.dispose();
        const old = document.getElementById('c');
        const canvas = old.cloneNode(); old.replaceWith(canvas);
        pinWeather(weather);
        const view = createLevelView(canvas, { dungeon: dungeons[key], seed: 3 });
        window.__view = view;
        view.setPhase({ phase: 'site', siteIndex });
        for (let n = 0; n < 120; n += 1) view.step(0.1);
        const u = view.world.uniforms;
        return { part: view.weather.part, effects: view.effects, sun: u.uSunColor.value.toArray().map((v) => +v.toFixed(2)), fog: [u.uFogNear.value, u.uFogFar.value].map(Math.round), glow: u.uGlowColor.value.toArray().map((v) => +v.toFixed(2)), corruption: u.uCorruption.value, preset: view.world.preset };
      }, { key, siteIndex, weather });
      await page.waitForTimeout(150);
      await page.screenshot({ path: join(OUT, `${key.toLowerCase()}-${name}.jpg`), type: 'jpeg', quality: 80, timeout: 120000 });
      console.log(key, name, JSON.stringify(seen[name]));
    }
    check(seen.day.part !== seen.night.part && seen.night.part === 'night', `${key}: the level takes the clock's part of the day`);
    check(seen.night.sun.reduce((a, b) => a + b) < seen.day.sun.reduce((a, b) => a + b) * 0.6, `${key}: the light is lower at night`);
    check(seen.night.effects.stars > 0.5 && seen.day.effects.stars < 0.1, `${key}: stars at night, none by day`);
    check(seen.storm.effects.rain + seen.storm.effects.snow > 0.9 && seen.day.effects.rain + seen.day.effects.snow === 0, `${key}: rain (or snow, high up) in a storm, none in clear weather`);
    check(seen.storm.fog[1] < seen.night.fog[1], `${key}: the rain's mist shortens the level's own fog`);
    check(JSON.stringify(seen.day.glow) === JSON.stringify(seen.night.glow), `${key}: the level keeps its own glow`);
  }
  // Without a seed the level is as it was: its fixed preset and no weather.
  const plain = await page.evaluate(async () => {
    const [{ createLevelView }, dungeons] = await Promise.all([import('/src/scene/levelView.js'), import('/src/dungeon.js')]);
    window.__view?.dispose();
    const old = document.getElementById('c');
    const canvas = old.cloneNode(); old.replaceWith(canvas);
    const view = createLevelView(canvas, { dungeon: dungeons.DUNGEON });
    view.step(0.05);
    const answer = { weather: view.weather, effects: view.effects };
    view.dispose();
    return answer;
  });
  check(plain.weather === null && plain.effects === null, 'without a seed the level has no weather');
} finally {
  await browser.close();
  await server.close();
}
if (problems.length) { console.error(`${problems.length} problem(s):\n${problems.join('\n')}`); process.exit(1); }
console.log('0 problems');
