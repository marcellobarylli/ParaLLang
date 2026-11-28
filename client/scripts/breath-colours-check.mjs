// Round 226: the breathing's colours and words in a real browser: the breath in pale blue, the breath out gold, the
// words larger. Pictures at several moments of the first breaths go to the round's shots/.
//
//   npm run build -w client
//   node client/scripts/breath-colours-check.mjs [outDir]
import { LightProvider } from '../../server/test/helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({
  out: process.argv[2] ?? 'docs/rounds/226/shots',
  display: { breathing: true },
  provider: () => new LightProvider([{ meant: 'Good morning! My name is Luigione.', target: 'Buongiorno! Mi chiamo Luigione.', clean: false, objectives_met: ['greet', 'introduce'] }]),
});
await game.run(async ({ page, check, shot, say }) => {
  await game.toPortia();
  await say('Good morning! Me chiamo Luigione.');
  await game.tap(page.getByRole('button', { name: 'Begin' }), { timeout: 30000 });
  await page.waitForSelector('.sheet.breathing', { timeout: 10000 });
  check(await page.locator('canvas.breath-field').count() === 1, 'the breathing is drawn');
  // The light starts 70 degrees before the breath in; it reaches it at about 1.9 s, and the turn at about 4 s.
  const began = Date.now();
  const until = (ms) => page.waitForTimeout(Math.max(0, ms - (Date.now() - began)));
  await page.mouse.move(195, 420);
  await until(1700); await shot('01-at-in');
  await page.mouse.down(); // held for the breath in, as the game asks
  await until(2600); await shot('02-holding-in');
  await until(5900); await page.mouse.up(); // let go at the turn
  await until(6300); await shot('03-let-go');
  await until(11700); await page.mouse.down();
  await until(12200); await shot('04-next-in');
  await page.mouse.up();
});
