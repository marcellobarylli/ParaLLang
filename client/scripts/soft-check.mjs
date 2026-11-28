// Round 219: the road's colours at five times of day, for the soft grade and the longer sunsets. Plays the built
// client to the road's first site in headless Chromium (scripted provider, no model) and pins the weather.
//
//   npm run build -w client
//   node client/scripts/soft-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({
  out: process.argv[2] ?? 'docs/rounds/219/shots',
  provider: (content) => new RoadProvider(content),
  serviceOptions: { seedSource: () => 4242 },
});

await game.run(async ({ page, check, shot }) => {
  // The same place every run; the panel is hidden so the land shows.
  await page.addInitScript(() => { if (!localStorage.getItem('parallang.title')) localStorage.setItem('parallang.title', JSON.stringify({ seed: 4242, at: '0,0' })); });
  // A new game asks the learner's level first (round 216).
  await game.open();
  await page.locator('.title-level input[type=radio]').last().check({ timeout: 60000 });
  await game.tap(page.getByRole('button', { name: 'The Journey 2: Journathan Returns (again)' }));
  await page.getByRole('button', { name: /^Talk to / }).waitFor({ timeout: 60000 });
  await page.waitForFunction(() => window.__parallangRoad?.stats?.mode === 'hold', null, { timeout: 60000 });
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = 'hidden'; });
  const pin = (values) => page.evaluate((v) => window.__parallangRoad.pinWeather({ rain: 0, cloud: 0.15, wind: 0.1, ...v }), values);
  for (const [name, values] of [['1-morning', { phase: 0.1 }], ['2-noon', { phase: 0.28 }], ['3-golden-hour', { phase: 0.5 }], ['4-sunset', { phase: 0.555 }], ['5-sunrise', { phase: 0.01 }]]) {
    await pin(values);
    await page.waitForTimeout(1500);
    await shot(name);
  }
  check(true, 'five pictures taken');
});
