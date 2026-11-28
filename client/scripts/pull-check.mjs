// Round 213 (issue #23): the pull, found the way the owner tests it. A journey of some walks is made on the server;
// then, in a real browser: Settings, Developer mode, a jump to the gate that ends A1; the walk to the gate; its
// conversation; Continue. The world event must then play on the whole screen (the map, the web, the journey, the land
// sinking), and afterwards the land of the map and of the level must be the pulled one. Pictures along the way.
// Round 215: the last site of the journey is walked to and its conversation left unfinished, so it is not pulled; and
// the journey begins by the sea, so the pull drowns its first sites.
//
//   npm run build -w client
//   node client/scripts/pull-check.mjs [outDir] [--desktop]
import { RoadProvider, moveTo, road, talkHere } from '../../server/test/road-helpers.js';
import { api } from '../../server/test/helpers.js';
import { DESKTOP, PHONE, openGame } from './lib/play.mjs';

const desktop = process.argv.includes('--desktop');
const out = (process.argv[2]?.startsWith('--') ? null : process.argv[2]) ?? 'docs/rounds/215/shots';
const WALKS = 14;

const game = await openGame({
  device: desktop ? DESKTOP : PHONE, out, provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242, exchangeLimit: 3 },
  // A journey first: a conversation and a walk on, some times over.
  before: async (runtime) => {
    const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
    for (let n = 0; n < WALKS; n += 1) {
      let view = (await road(runtime, learnerId)).data;
      // A gate on the way is in an old place: the units are put back to the start instead, to keep to the road.
      if (!view.road.current) view = (await api(runtime, '/api/road/jump', { learnerId, method: 'POST', body: { unitId: view.curriculum.stages[0].units[0].id } })).data;
      await talkHere(runtime, learnerId);
      view = (await road(runtime, learnerId)).data;
      if (view.road.frontier.find((site) => site.id === view.road.rails)?.offer.dungeon) view = (await api(runtime, '/api/road/jump', { learnerId, method: 'POST', body: { unitId: view.curriculum.stages[0].units[0].id } })).data;
      await moveTo(runtime, learnerId, view.road.rails);
    }
    return learnerId;
  },
});

const pull = (page) => page.evaluate(() => { const hook = window.__parallangPull; return hook ? { phase: hook.phase, share: hook.share, made: hook.made, total: hook.total } : null; });
const until = (page, phase, timeout = 120000) => page.waitForFunction((wanted) => window.__parallangPull?.phase === wanted, phase, { timeout });

await game.run(async ({ page, check, shot, tap, say, runtime }) => {
  await game.toRoad();
  const learnerId = await page.evaluate(() => localStorage.getItem('parallang.learnerId'));
  const walked = (await runtime.service.getRoadWalk(learnerId)).walk.nodes.length;
  check(walked === WALKS + 1, `the journey is ${walked} sites long`);

  // Settings: developer mode, and the jump to the gate that ends A1.
  await tap(page.getByRole('button', { name: /^Menu/ }));
  await tap(page.getByRole('button', { name: /^Settings/ }));
  const developer = page.locator('details.settings-group', { hasText: 'Developer' });
  await tap(developer.locator('summary'));
  await tap(page.getByLabel('Developer mode'));
  const options = await page.getByLabel('Jump to').locator('option').allTextContents();
  check(options.length > 36 && options.some((text) => /the land is pulled/.test(text)), `the jump lists ${options.length} places, the gates that pull the land among them`);
  const gate = options.find((text) => /then A2: the land is pulled/.test(text));
  await page.getByLabel('Jump to').selectOption({ label: gate });
  await developer.scrollIntoViewIfNeeded();
  await shot('00-developer-jump');
  await tap(page.getByRole('button', { name: 'Jump', exact: true }));
  await page.getByText(/The gate is the next site/).waitFor({ timeout: 30000 });
  await tap(page.getByRole('button', { name: 'Close' }));

  // The walk to the gate (an old place), and its last conversation.
  const enter = page.getByRole('button', { name: /^Enter / });
  await enter.waitFor({ timeout: 30000 });
  await shot('01-before-the-gate');
  await tap(enter);
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 90000 });
  await say('Non lo so.');
  await say('Boh.');
  await say('Niente.');
  const onward = page.getByRole('button', { name: 'Continue' });
  await onward.waitFor({ state: 'attached', timeout: 60000 });
  const view = (await road(runtime, learnerId)).data;
  check(view.road.event?.kind === 'pull' && view.road.event.number === 1, 'the gate\'s last conversation pulled the land: the road owes the event');
  check(view.curriculum.position.cefr === 'A2', 'the learner is in A2');
  check(view.road.pulled.length === 0, 'the land shown is not pulled yet');
  await game.reveal(onward);
  await shot('02-gate-complete');

  // Continue: not the walk on, but the map, and nothing else on the screen.
  await tap(onward);
  await page.locator('.pull-event').waitFor({ timeout: 30000 });
  await until(page, 'fade');
  check(await page.locator('.pull-event button').count() === 0, 'nothing but the map is on the screen: no button, no bar');
  await until(page, 'still');
  await shot('03-the-map-alone');
  await until(page, 'web');
  const readings = [];
  for (let n = 0; n < 4; n += 1) { await page.waitForTimeout(1600); readings.push(await pull(page)); if (n === 0) await shot('04-the-web-begins'); if (n === 2) await shot('05-the-web-spreads'); }
  check(readings.every((reading, n) => n === 0 || reading.made >= readings[n - 1].made) && readings[0].made > 0 && readings[0].made < readings.at(-1).made && readings[0].made < readings[0].total,
    `the web is generated as it shows, outward: ${readings.map((reading) => reading.made).join(', ')} of ${readings[0].total} cells`);
  await until(page, 'rest');
  check((await pull(page)).made === readings[0].total, 'the web covers the map');
  await shot('06-the-web-whole');
  await until(page, 'journey');
  await page.waitForTimeout(2200);
  await shot('07-the-journey-a-walk-at-a-time');
  await until(page, 'breath');
  check((await pull(page)).share === 0, 'the journey is whole and the land has not moved yet');
  await page.waitForTimeout(600);
  await shot('08-before-the-pull');
  await until(page, 'buckle');
  const shares = [];
  for (let n = 0; n < 5; n += 1) { await page.waitForTimeout(1200); shares.push((await pull(page)).share); if (n === 2) await shot('09-the-land-sinking'); }
  check(shares.every((share, n) => n === 0 || share >= shares[n - 1]) && shares[0] > 0 && shares[0] < 1, `the land sinks steadily: ${shares.map((share) => share.toFixed(2)).join(', ')}`);
  await until(page, 'after');
  check((await pull(page)).share === 1, 'the land is all the way down');
  await page.waitForTimeout(500);
  await shot('10-after-the-pull');
  const done = page.locator('.pull-event').getByRole('button', { name: 'Continue' });
  await done.waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot('11-the-way-on');
  await tap(done);
  await page.locator('.pull-event').waitFor({ state: 'detached', timeout: 30000 });

  // Afterwards: the event is seen, the land is the pulled one, and the way on walks.
  const after = (await road(runtime, learnerId)).data;
  check(after.road.event === null && after.road.pulled.length === 1, 'the event is seen; the road\'s land is the pulled one');
  const journey = (await runtime.service.getRoadWalk(learnerId)).walk.nodes;
  const unfinished = journey[WALKS]; // the last site walked to before the jump: its conversation was never finished
  check(after.road.pulled[0].sites.length === walked && !after.road.pulled[0].sites.includes(unfinished) && after.road.pulled[0].sites.includes(journey.at(-1)),
    `the pull took the ${after.road.pulled[0].sites.length} sites whose conversation was finished (the gate's among them), and not the one only walked to`);
  await page.getByRole('button', { name: /^(Continue|Enter )/ }).waitFor({ timeout: 30000 });
  await shot('12-back-on-the-road');
  await tap(page.getByRole('button', { name: 'Map', exact: true }));
  await page.locator('.road-map canvas').waitFor({ timeout: 30000 });
  await tap(page.getByRole('button', { name: 'Show Journey so far' }));
  await page.locator('.map-journey').waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  await shot('13-the-map-afterwards');
  await tap(page.getByRole('button', { name: /^Back to/ }));
  // The walk on leaves the old place: the road's level is built on the pulled land.
  await tap(page.getByRole('button', { name: /^(Continue|Enter )/ }));
  await page.waitForFunction(() => window.__parallangRoad?.terrain?.pullAt, null, { timeout: 60000 });
  const sunk = await page.evaluate(() => {
    const { graph, terrain } = window.__parallangRoad;
    const node = graph.node(graph.start);
    return { dip: terrain.pullAt(node.x, node.z), y: node.y, ground: node.ground, drowned: node.drowned, plain: graph.base.node(graph.start).y, waterY: terrain.waterY };
  });
  check(Math.abs(sunk.dip + 26) < 0.01 && Math.abs(sunk.ground - (sunk.plain - 26)) < 0.01, `the level stands on the pulled land: the ground of the journey's first site is ${(-sunk.dip).toFixed(2)} m lower`);
  check(sunk.drowned && sunk.y === sunk.waterY, `that site was ${sunk.plain.toFixed(1)} m over the sea: it is under ${(-sunk.ground).toFixed(1)} m of water now, and stands on its surface`);
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  await shot('14-the-level-on-pulled-land');
});
