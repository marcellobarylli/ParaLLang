// Round 175: the title screen in a real browser. The page shows a sky at once; the road's landscape comes up behind
// it, seen from above the clouds and turning slowly; its one button zooms the camera down into the first site. The
// map and the menu are in the top bar in a conversation too. Pictures go to the round's shots/.
//
//   npm run build -w client
//   node client/scripts/title-check.mjs [outDir] [phone|desktop]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { DESKTOP, PHONE, openGame } from './lib/play.mjs';

const desktop = process.argv[3] === 'desktop';
const tag = desktop ? 'desktop-' : '';
const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/175/shots', device: desktop ? DESKTOP : PHONE, provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });
const JOURNEY = 'The Journey 2: Journathan Returns (again)';
const stats = (page) => page.evaluate(() => window.__parallangRoad?.stats ?? null);

await game.run(async ({ page, check, shot, tap }) => {
  const opened = Date.now();
  await game.open();
  await page.getByRole('heading', { name: 'ParaLLang' }).waitFor({ timeout: 20000 });
  check(Date.now() - opened < 5000, `the title is on the screen ${Date.now() - opened} ms after the page was asked for`);
  const buttons = await page.locator('.title-screen button').allTextContents();
  check(buttons.length === 1 && buttons[0] === JOURNEY, `the title's one button is "${buttons.join(' | ')}"`);
  check(await page.getByRole('button', { name: /^Enter / }).count() === 0, 'no Enter Ta Prohm, no Enter The Kiln');
  if (!desktop) await shot('01-at-once');

  // The landscape from above the clouds: the far land built, the high clouds out, the camera turning.
  await page.waitForFunction(() => {
    const s = window.__parallangRoad?.stats;
    return s && s.mode === 'title' && s.high > 0.99 && s.farTiles >= 64 && s.chunks >= 60;
  }, null, { timeout: 120000 });
  const first = await stats(page);
  check(first.highClouds > 0, `clouds below the camera: ${first.highClouds}`);
  await page.waitForTimeout(1500);
  await shot(`${tag}02-title`);
  const before = await page.evaluate(() => [...window.__parallangRoad.camera.position.toArray()]);
  await page.waitForTimeout(6000);
  const after = await page.evaluate(() => [...window.__parallangRoad.camera.position.toArray()]);
  const turned = Math.abs(Math.atan2(after[2], after[0]) - Math.atan2(before[2], before[0]));
  check(turned > 0.02 && turned < 0.3, `it turns slowly: ${turned.toFixed(3)} rad in 6 s`);
  await shot(`${tag}03-title-later`);
  // The world is loaded behind the title: the road has been read (the learner's road is made on the title's seed).
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('parallang.title') ?? 'null'));
  check(Boolean(kept?.at), `the road was read behind the title (site ${kept?.at}, seed ${kept?.seed})`);

  // A storm at night, held still, as the weather can be.
  await page.evaluate(() => window.__parallangRoad.pinWeather({ phase: 0.02, rain: 0.8, cloud: 1, wind: 0.8 }));
  await page.waitForTimeout(2500);
  await shot(`${tag}04-title-storm-night`);
  await page.evaluate(() => window.__parallangRoad.pinWeather({ phase: 0.68, rain: 0, cloud: 0.4, wind: 0.3 }));
  await page.waitForTimeout(1500);

  // The start: the camera zooms down into the first site.
  await tap(page.getByRole('button', { name: JOURNEY }));
  await page.waitForFunction(() => window.__parallangRoad?.stats.mode === 'descend', null, { timeout: 30000 });
  await page.waitForTimeout(900);
  await shot(`${tag}05-zooming-down`);
  await page.waitForFunction(() => window.__parallangRoad?.stats.mode === 'hold' || window.__parallangRoad?.stats.mode === 'wander', null, { timeout: 30000 });
  const down = await stats(page);
  check(down.high === 0 && down.farTiles === 0, 'down at the site, the far land is gone');
  await page.getByRole('button', { name: /^Talk to / }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  await shot(`${tag}06-arrived`);

  // In the conversation: the map over it, and the menu.
  await tap(page.getByRole('button', { name: /^Talk to / }));
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 60000 });
  check(await page.getByRole('button', { name: 'Map', exact: true }).isVisible(), 'the map is in the top bar in a conversation');
  await tap(page.getByRole('button', { name: 'Map', exact: true }));
  await page.getByRole('main', { name: 'The map of the road' }).waitFor();
  check(await page.getByRole('button', { name: 'Leave the conversation and walk here' }).count() === 1, 'and a site on it can be walked to, leaving the conversation');
  await page.waitForTimeout(400);
  await shot(`${tag}07-map-in-conversation`);
  await tap(page.getByRole('button', { name: /^Back to / }).first());
  await tap(page.getByRole('button', { name: /^Menu/ }));
  await page.getByRole('navigation', { name: 'Game menu' }).waitFor();
  await shot(`${tag}08-menu-in-conversation`);
  const box = await page.locator('.game-menu').boundingBox();
  const width = desktop ? 1440 : 390;
  check(box.x >= 0 && box.x + box.width <= width, 'the menu is inside the screen');
});
