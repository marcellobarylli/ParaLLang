// Round 180: the opening message in a real browser. After the title's button the camera comes down to the start of
// the journey; the message is then in the middle of the screen with the landscape and the first character behind
// it, and Set out gives way to the arrival's card. Pictures go to the round's shots/.
//
//   npm run build -w client
//   node client/scripts/welcome-check.mjs [outDir] [phone|desktop]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { DESKTOP, PHONE, openGame } from './lib/play.mjs';

const desktop = process.argv[3] === 'desktop';
const tag = desktop ? 'desktop-' : '';
const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/180/shots', device: desktop ? DESKTOP : PHONE, provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 }, welcomed: false });
const JOURNEY = 'The Journey 2: Journathan Returns (again)';

await game.run(async ({ page, check, shot, tap }) => {
  await game.open();
  await page.getByRole('heading', { name: 'ParaLLang' }).waitFor({ timeout: 20000 });
  await page.waitForFunction(() => window.__parallangRoad?.stats?.mode === 'title', null, { timeout: 120000 });
  await tap(page.getByRole('button', { name: JOURNEY }));
  check(await page.getByRole('dialog').count() === 0, 'no message during the zoom down');
  const dialog = page.getByRole('dialog', { name: 'A word first' });
  await dialog.waitFor({ timeout: 60000 });
  const mode = await page.evaluate(() => window.__parallangRoad?.stats.mode);
  check(mode === 'hold' || mode === 'wander', `the message comes once the camera is down (${mode})`);
  check(await page.getByRole('button', { name: /^Talk to / }).count() === 0, 'the arrival card waits behind it');
  const box = await dialog.boundingBox();
  const size = page.viewportSize();
  check(box.x >= 0 && box.x + box.width <= size.width && box.y >= 0 && box.y + box.height <= size.height, `the message fits the screen (${Math.round(box.width)} × ${Math.round(box.height)})`);
  await page.waitForTimeout(800);
  await shot(`${tag}01-welcome`);
  await tap(dialog.getByRole('button', { name: 'Set out' }));
  await page.getByRole('button', { name: /^Talk to / }).waitFor({ timeout: 60000 });
  check(await page.evaluate(() => localStorage.getItem('parallang.welcomed')) === '1', 'closed, it is remembered in this slot');
  await page.waitForTimeout(500);
  await shot(`${tag}02-after`);
});
