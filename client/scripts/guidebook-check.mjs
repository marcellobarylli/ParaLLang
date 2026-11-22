// Round 157: the guidebook in a real browser. Plays the built client in headless Chromium against the real server
// code with a scripted model: an entry is told on the road's card, the top bar's button is marked, the guidebook
// lists it, and after that it is told no more.
//
//   npm run build -w client
//   node client/scripts/guidebook-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/157/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });

await game.run(async ({ page, check, shot, tap }) => {
  await game.toRoad();
  const note = page.getByRole('complementary', { name: 'Entered in your guidebook' });
  await note.waitFor({ timeout: 20000 });
  check((await note.textContent()).includes('No road ends.'), 'the road\'s card tells the entry "The road"');
  const button = page.getByRole('button', { name: /^Guidebook/ });
  check(/1 new/.test(await button.getAttribute('aria-label')), 'the top bar\'s button says one entry is new');
  const bar = await page.locator('.hud').evaluate((element) => ({ wide: element.scrollWidth, room: element.clientWidth }));
  check(bar.wide <= bar.room, `the top bar still fits the phone (${bar.wide} of ${bar.room} px)`);
  await shot('01-entry-told');

  await tap(button);
  await page.getByRole('main', { name: 'Guidebook' }).waitFor();
  await page.getByText('1 of 5 entries').waitFor({ timeout: 20000 });
  check(await page.getByRole('heading', { name: /The road/ }).count() === 1, 'the guidebook lists the entry');
  check(await page.locator('.guide-new').count() === 1, 'and marks it new');
  await shot('02-guidebook');

  await tap(page.getByRole('button', { name: 'Back to the road' }));
  check(await note.count() === 0, 'back on the road, the entry is told no more');
  check(await page.getByRole('button', { name: /^Guidebook/ }).getAttribute('aria-label') === 'Guidebook', 'and the button\'s mark is gone');
  await tap(page.getByRole('button', { name: /^Guidebook/ }));
  await page.getByText('1 of 5 entries').waitFor({ timeout: 20000 });
  await page.waitForTimeout(300);
  check(await page.locator('.guide-new').count() === 0, 'opened again, nothing is new');
  await shot('03-read');
});
