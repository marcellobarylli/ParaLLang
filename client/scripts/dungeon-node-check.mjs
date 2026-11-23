// Round 160: biomes and the legacy dungeons on the road, in a real browser. A learner is walked along the road on
// the server (scripted model, no model called) until the unit's gate is offered; then the built client is opened as
// that learner in headless Chromium: the jungle the road starts in, the map with Ta Prohm's node, the way in, and
// the gate's conversation inside the dungeon's own level.
//
//   npm run build -w client
//   node client/scripts/dungeon-node-check.mjs [outDir]
import { RoadProvider, moveTo, road, talkHere } from '../../server/test/road-helpers.js';
import { api } from '../../server/test/helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({
  out: process.argv[2] ?? 'docs/rounds/160/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 },
  before: async (runtime) => {
    const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
    await road(runtime, learnerId);
    for (let walked = 0; walked < 12; walked += 1) {
      await talkHere(runtime, learnerId);
      const view = (await road(runtime, learnerId)).data.road;
      if (view.frontier.some((site) => site.offer.dungeon)) break;
      await moveTo(runtime, learnerId, view.rails);
    }
    return learnerId;
  },
});

await game.run(async ({ page, check, shot, tap, say, runtime }) => {
  await game.open();
  await tap(page.getByRole('button', { name: 'Enter', exact: true }), { timeout: 60000 });
  await tap(page.getByRole('button', { name: /^Set out on/ }));
  const enter = page.getByRole('button', { name: 'Enter Ta Prohm' });
  await enter.waitFor({ timeout: 60000 });
  check((await page.locator('.biome-line').textContent()).startsWith('Jungle'), 'the place is in the jungle, the biome the road starts in');
  check(/Ta Prohm is near/.test(await page.locator('.biome-line').textContent()), 'and says Ta Prohm is near');
  // The level: the jungle's trees stand round the site, and the dungeon's gate stands at the site ahead.
  await page.waitForFunction(() => window.__parallangRoad?.world?.chunkCount > 40, null, { timeout: 60000 }).catch(() => {});
  const scene = await page.evaluate(() => {
    const view = window.__parallangRoad;
    const names = [];
    view?.world?.scene?.traverse((object) => { if (object.name === 'landmark') names.push(object.name); });
    return { landmarks: names.length, chunks: view?.world?.chunkCount ?? 0 };
  });
  check(scene.landmarks === 1, `the endless level shows one landmark at the dungeon's node (${scene.landmarks}), with ${scene.chunks} chunks of ground built`);
  await page.waitForTimeout(2500);
  await shot('01-jungle-and-the-way-in');
  // The level alone, the panels put aside for the picture, in clear daylight: the jungle's trees, and from above the
  // site with the dungeon's gate at the site ahead.
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = 'hidden'; window.__parallangRoad?.pinWeather?.({ phase: 0.3, rain: 0, cloud: 0.15, wind: 0.2 }); });
  await page.waitForTimeout(4000);
  await shot('01b-jungle-level');
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = ''; });

  await tap(page.getByRole('button', { name: 'Map', exact: true }));
  const node = page.locator('.map-ahead.dungeon');
  await node.waitFor({ timeout: 20000 });
  check(await node.count() === 1, 'the map shows one site ahead as a legacy dungeon\'s node');
  check(/^Ta Prohm, beyond /.test(await node.getAttribute('aria-label')), `its label names the dungeon ("${await node.getAttribute('aria-label')}")`);
  check(await page.locator('.map-choice').getByRole('button', { name: 'Enter Ta Prohm' }).isVisible(), 'and the map\'s button for it reads "Enter Ta Prohm"');
  await shot('02-map-with-ta-prohm');

  // On the road no dungeon's level exists (the title's was disposed of when the road was entered).
  check(await page.evaluate(() => window.__parallangLevel === undefined && Boolean(window.__parallangRoad)), 'no dungeon\'s level exists while on the road');
  await tap(page.locator('.map-choice').getByRole('button', { name: 'Enter Ta Prohm' }));
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 90000 });
  const level = await page.evaluate(() => ({ loaded: Boolean(window.__parallangLevel), heading: document.querySelector('.sheet-header .site-text')?.textContent ?? '' }));
  check(level.loaded, 'entering it builds the dungeon\'s level');
  check(/The Face Gate, Ta Prohm/.test(level.heading), `the gate's conversation is set at the dungeon's first site ("${level.heading}")`);
  await page.waitForTimeout(3000);
  await shot('03-the-gate-in-ta-prohm');

  // Pass the gate and walk on: back on the road.
  const learnerId = await page.evaluate(() => localStorage.getItem('parallang.learnerId'));
  const session = runtime.service.encounters.get(learnerId);
  await say(runtime.service.definition(session).encounter.objectives.map((objective) => objective.accepted_examples[0]).join(' '));
  await page.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 60000 });
  check(/Through the gate/.test(await page.locator('.road-result').textContent()), 'the gate is passed');
  await game.reveal(page.getByRole('button', { name: 'Continue' }));
  await tap(page.getByRole('button', { name: 'Continue' }));
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 90000 });
  check(!/Ta Prohm/.test(await page.locator('.sheet-header .site-text').textContent()), 'the next conversation is back on the road');
  check(await page.evaluate(() => window.__parallangLevel === undefined), 'and the dungeon\'s level is gone again');
  await shot('04-back-on-the-road');
});
