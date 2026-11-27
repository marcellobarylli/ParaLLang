// Round 162: the pulled models in a real browser. Opens the built client in headless Chromium: the chunks nearest the
// camera take their trees from the model file, and the level stays inside the style's triangle budget. Round 195: the
// models are always on (the file is asked for once, when the road's view is made, behind the title since round 175),
// and Settings has no switch for them.
//
//   npm run build -w client
//   node client/scripts/models-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/195/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });
const JOURNEY = 'The Journey 2: Journathan Returns (again)';

await game.run(async ({ page, check, shot, tap }) => {
  const asked = [];
  page.on('request', (request) => { if (/\.glb$/.test(request.url())) asked.push(request.url().split('/').pop()); });
  // The title picks the road's seed (round 175), so it is pinned here, before the page loads, for counts that repeat.
  await page.addInitScript(() => { if (!localStorage.getItem('parallang.title')) localStorage.setItem('parallang.title', JSON.stringify({ seed: 4242, at: '0,0' })); });
  await game.open();
  await tap(page.getByRole('button', { name: JOURNEY }), { timeout: 60000 });
  await page.getByRole('button', { name: /^Talk to / }).waitFor({ timeout: 90000 });
  await page.waitForFunction(() => window.__parallangRoad?.world?.modelChunks >= 5 && window.__parallangRoad.world.chunkCount >= 81, null, { timeout: 90000 });
  check(asked.filter((name) => name === 'nature.glb').length === 1, `the model file is asked for once (${asked.join(', ')})`);
  const level = await page.evaluate(() => { const { world } = window.__parallangRoad; return { chunks: world.chunkCount, models: world.modelChunks, triangles: world.triangleCount }; });
  check(level.models >= 5, `${level.models} of ${level.chunks} chunks have their trees as models: the five nearest the camera, and any it has just passed`);
  check(level.triangles <= 64000, `the level holds ${level.triangles} triangles, inside the style's 64 000`);
  await shot('01-hub-with-models');
  // The level alone, in clear daylight.
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = 'hidden'; window.__parallangRoad.pinWeather({ phase: 0.3, rain: 0, cloud: 0.15, wind: 0.2 }); });
  await page.waitForTimeout(4000);
  await shot('02-jungle-with-models');
  // Round 195: there is no switch for them in Settings.
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = ''; });
  await tap(page.getByRole('button', { name: /^Menu/ }));
  await tap(page.getByRole('navigation', { name: 'Game menu' }).getByRole('button', { name: 'Settings' }));
  await page.getByLabel('Tilt to look').waitFor({ state: 'attached' }); // in a closed category
  check(await page.getByLabel('Tree models').count() === 0, 'Settings has no "Tree models" switch');
});
