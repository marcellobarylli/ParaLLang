// Round 162: the pulled models in a real browser. Opens the built client on the road in headless Chromium: the
// model file is asked for only once the road is open, the chunks nearest the camera take their trees from it, and
// the level stays inside the style's triangle budget.
//
//   npm run build -w client
//   node client/scripts/models-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/162/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });

await game.run(async ({ page, check, shot, tap }) => {
  const asked = [];
  page.on('request', (request) => { if (/\.glb$|GLTFLoader|meshopt/.test(request.url())) asked.push(request.url().split('/').pop()); });
  await game.open();
  await tap(page.getByRole('button', { name: 'Enter', exact: true }), { timeout: 60000 });
  await page.waitForTimeout(1500);
  check(asked.length === 0, 'at the title and on the world map nothing of the models is asked for');
  await tap(page.getByRole('button', { name: /^Set out on/ }));
  await page.getByRole('button', { name: /^Talk to / }).waitFor({ timeout: 60000 });
  await page.waitForFunction(() => window.__parallangRoad?.world?.modelChunks === 5 && window.__parallangRoad.world.chunkCount >= 81, null, { timeout: 90000 });
  check(asked.some((name) => name === 'nature.glb'), `on the road the model file is asked for (${[...new Set(asked)].join(', ')})`);
  const level = await page.evaluate(() => { const { world } = window.__parallangRoad; return { chunks: world.chunkCount, models: world.modelChunks, triangles: world.triangleCount }; });
  check(level.models === 5, `the five chunks nearest the camera have their trees as models (of ${level.chunks} chunks)`);
  check(level.triangles <= 64000, `the level holds ${level.triangles} triangles, inside the style's 64 000`);
  await shot('01-hub-with-models');
  // The level alone, in clear daylight.
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = 'hidden'; window.__parallangRoad.pinWeather({ phase: 0.3, rain: 0, cloud: 0.15, wind: 0.2 }); });
  await page.waitForTimeout(4000);
  await shot('02-jungle-with-models');
  // Settings: "Tree models" off puts the level's own trees back, and on again brings the models without a second request.
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = ''; });
  await tap(page.getByRole('button', { name: 'Settings' }));
  await page.getByLabel('Tree models').scrollIntoViewIfNeeded();
  check(await page.getByLabel('Tree models').isChecked(), 'Settings has "Tree models", ticked');
  await tap(page.getByLabel('Tree models'));
  await page.waitForFunction(() => window.__parallangRoad.world.modelChunks === 0, null, { timeout: 30000 });
  const without = await page.evaluate(() => window.__parallangRoad.world.triangleCount);
  check(without < level.triangles, `switched off, the level's own trees are back (${without} triangles)`);
  await tap(page.getByRole('button', { name: 'Close' }));
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = 'hidden'; });
  await page.waitForTimeout(2500);
  await shot('03-jungle-without-models');
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = ''; });
  const requests = asked.filter((name) => name === 'nature.glb').length;
  await tap(page.getByRole('button', { name: 'Settings' }));
  await page.getByLabel('Tree models').scrollIntoViewIfNeeded();
  await tap(page.getByLabel('Tree models'));
  await page.waitForFunction(() => window.__parallangRoad.world.modelChunks === 5, null, { timeout: 30000 });
  check(asked.filter((name) => name === 'nature.glb').length === requests, 'switched on again, the models are back without the file being asked for again');
});
