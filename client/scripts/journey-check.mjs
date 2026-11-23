// Round 161: "Show Journey so far" in a real browser. A learner is walked sixty sites along the road on the server
// (walks need no finished conversation); then the built client is opened as that learner in headless Chromium, the
// map is opened and the journey is shown and hidden.
//
//   npm run build -w client
//   node client/scripts/journey-check.mjs [outDir] [hops]
import { RoadProvider, moveTo, road } from '../../server/test/road-helpers.js';
import { api } from '../../server/test/helpers.js';
import { openGame } from './lib/play.mjs';

const HOPS = Number(process.argv[3] ?? 60);
const game = await openGame({
  out: process.argv[2] ?? 'docs/rounds/161/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 },
  before: async (runtime) => {
    const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
    let view = (await road(runtime, learnerId)).data.road;
    // The rails' own choice at every step: the seeded random walk that "on rails" play is.
    for (let n = 0; n < HOPS; n += 1) view = (await moveTo(runtime, learnerId, view.rails ?? view.frontier[0].id)).data.road;
    return learnerId;
  },
});

await game.run(async ({ page, check, shot, tap }) => {
  await game.toRoad();
  await tap(page.getByRole('button', { name: 'Map', exact: true }));
  const toggle = page.getByRole('button', { name: 'Show Journey so far' });
  await toggle.waitFor({ timeout: 20000 });
  check(await toggle.getAttribute('aria-pressed') === 'false', 'the map has "Show Journey so far", off');
  check(await page.locator('.map-journey').count() === 0 && await page.locator('.map-ahead').count() > 0, 'the usual map shows the sites ahead and no journey');
  await shot('01-map');

  await tap(toggle);
  const line = page.locator('polyline.map-journey');
  await line.waitFor({ timeout: 20000 });
  const points = (await line.getAttribute('points')).trim().split(/\s+/);
  check(points.length === HOPS + 1, `the journey is painted as one line through ${points.length} sites (the start and ${HOPS} walks)`);
  const box = await page.locator('.road-map svg').evaluate((svg) => svg.viewBox.baseVal.width + 'x' + svg.viewBox.baseVal.height);
  const [width, height] = box.split('x').map(Number);
  check(points.every((pair) => { const [x, y] = pair.split(',').map(Number); return x >= 0 && x <= width && y >= 0 && y <= height; }), 'every site of it is inside the picture');
  check(await page.getByText(`${HOPS} walks from where you began.`).isVisible(), 'and the map says how many walks it is');
  check(await page.locator('.map-ahead').count() === 0, 'the sites ahead step back while the journey is shown');
  check(await page.getByRole('button', { name: 'Hide the journey' }).getAttribute('aria-pressed') === 'true', 'the button is pressed and reads "Hide the journey"');
  await page.waitForTimeout(400);
  await shot('02-journey');

  // Round 163 (issue #13): from a hundred walks the narrator remarks on the journey and shows the Odyssey's chart.
  const remark = page.getByRole('complementary', { name: 'The narrator, on your journey' });
  if (HOPS >= 100) {
    check(await remark.count() === 1 && (await remark.textContent()).startsWith('You unroll the whole of it.'), 'the narrator remarks on a journey this long');
    check(await remark.getByRole('img', { name: /The Odyssey, as tradition maps it/ }).count() === 1, 'and shows the chart of the Odyssey beside the remark');
    check(await remark.locator('.odyssey-stops li').count() === 14, 'with its fourteen stops listed');
    check(/new/.test(await page.getByRole('button', { name: /^Guidebook/ }).getAttribute('aria-label').catch(() => 'hidden new')), 'the guidebook has heard of it');
    await remark.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shot('03-the-narrator-and-the-odyssey');
    await remark.locator('figcaption').scrollIntoViewIfNeeded();
    await shot('04-the-chart');
  } else {
    check(await remark.count() === 0, 'under a hundred walks the narrator says nothing of it');
  }
  await tap(page.getByRole('button', { name: 'Hide the journey' }));
  check(await page.locator('.map-journey').count() === 0 && await page.locator('.map-ahead').count() > 0, 'hidden again, the usual map is back');
});
