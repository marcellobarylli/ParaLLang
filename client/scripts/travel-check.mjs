// Round 176: the camera's way between two sites in a real browser. On the road, the camera is sent from the start to
// a site four or more sites away; its position is read every tenth of a second and held against the shortest walk
// along the ways: near it all the way, and turning gently. Pictures along the way.
//
//   npm run build -w client
//   node client/scripts/travel-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { DESKTOP, openGame } from './lib/play.mjs';

const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/176/shots', device: DESKTOP, provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });

await game.run(async ({ page, check, shot }) => {
  await game.toRoad();
  await page.waitForFunction(() => ['hold', 'wander'].includes(window.__parallangRoad?.stats.mode), null, { timeout: 60000 });
  const plan = await page.evaluate(() => {
    const view = window.__parallangRoad;
    const { graph } = view;
    const here = graph.node(view.director.site ? graph.nodesNear(view.director.site.x, view.director.site.z, 0)[0]?.id : graph.start) ?? graph.node(graph.start);
    const far = graph.nodesNear(here.x, here.z, 3).map((node) => node.id).find((id) => id !== here.id && (graph.route(here.id, id)?.length ?? 0) >= 4);
    const walk = graph.route(here.id, far);
    const ways = walk.slice(1).flatMap((id, n) => graph.pathPoints(walk[n], id));
    return { from: here.id, to: far, walk, ways };
  });
  check(plan.walk.length >= 4, `a walk of ${plan.walk.length} sites: ${plan.walk.join(' → ')}`);
  await page.evaluate(({ from, to }) => {
    window.__track = [];
    window.__parallangRoad.setTalking(true);
    window.__parallangRoad.show({ at: to, from, mode: 'travel' });
    const take = () => { const p = window.__parallangRoad.camera.position; window.__track.push([p.x, p.z]); if (window.__parallangRoad.stats.mode === 'travel') setTimeout(take, 100); };
    take();
  }, plan);
  await page.waitForTimeout(2500);
  await shot('01-on-the-way');
  await page.waitForTimeout(2500);
  await shot('02-further');
  await page.waitForFunction(() => window.__parallangRoad.stats.mode === 'hold', null, { timeout: 30000 });
  await shot('03-there');
  const track = await page.evaluate(() => window.__track);
  const nearest = ([x, z]) => Math.min(...plan.ways.map(([a, b]) => Math.hypot(a - x, b - z)));
  const worst = Math.max(...track.slice(10).map(nearest)); // after the first second, which leaves the site it stood at
  check(track.length > 20 && worst < 20, `the camera keeps within ${worst.toFixed(1)} m of the ways (${track.length} readings)`);
  let sharpest = 0;
  for (let n = 2; n < track.length; n += 1) {
    const [a, b, c] = [track[n - 2], track[n - 1], track[n]];
    const [u, v] = [[b[0] - a[0], b[1] - a[1]], [c[0] - b[0], c[1] - b[1]]];
    if (Math.hypot(...u) < 0.5 || Math.hypot(...v) < 0.5) continue;
    sharpest = Math.max(sharpest, Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])));
  }
  check(sharpest < 0.35, `its sharpest turn is ${sharpest.toFixed(2)} rad in a tenth of a second`);
});
