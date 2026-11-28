// Round 211: a road character whose conversation is complete stays standing, and sinks into the ground before the
// camera walks on. A conversation is completed in a real browser; Continue is pressed; the figure's sinking and the
// camera's mode are read every tenth of a second. Pictures along the way.
//
//   npm run build -w client
//   node client/scripts/sink-check.mjs [outDir] [--reduced]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { PHONE, openGame } from './lib/play.mjs';

// Round 212: with the system's Reduce motion on as well (`--reduced`), which the game ignores.
const reduced = process.argv.includes('--reduced');

const game = await openGame({ device: reduced ? { ...PHONE, reducedMotion: 'reduce' } : PHONE, out: (process.argv[2]?.startsWith('--') ? null : process.argv[2]) ?? 'docs/rounds/211/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242, exchangeLimit: 3 } });

await game.run(async ({ page, check, shot, tap, say }) => {
  await game.toRoad();
  if (reduced) check(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'the browser asks for reduced motion');
  await tap(page.getByRole('button', { name: /^Talk to / }));
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 60000 });
  await say('Non lo so.');
  await say('Boh.');
  await say('Niente.');
  await page.getByRole('button', { name: 'Continue' }).waitFor({ state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => window.__parallangRoad.stats);
  check(before.sinking === null, 'complete: the character still stands, not yet sinking');
  await game.reveal?.(page.getByRole('button', { name: 'Continue' }));
  await shot('00-complete');
  await page.evaluate(() => {
    window.__sink = [];
    const take = () => { const s = window.__parallangRoad?.stats; if (!s) return; window.__sink.push([performance.now(), s.sinking, s.mode]); if (window.__sink.length < 200) setTimeout(take, 100); };
    take();
  });
  await tap(page.getByRole('button', { name: 'Continue' }));
  await page.waitForTimeout(1100);
  await shot('01-sinking');
  await page.waitForTimeout(1200);
  await shot('02-nearly-gone');
  await page.waitForFunction(() => window.__parallangRoad.stats.mode === 'travel', null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await shot('03-walking-on');
  const rows = await page.evaluate(() => window.__sink);
  const sinking = rows.filter(([, u]) => u !== null);
  const firstTravel = rows.findIndex(([, , mode]) => mode === 'travel');
  const lastSink = rows.map(([, u]) => u !== null).lastIndexOf(true);
  check(sinking.length > 15, `the figure sank over ${sinking.length} readings (a tenth of a second each)`);
  check(sinking.every(([, , mode]) => mode !== 'travel'), 'the camera stayed at the site while it sank');
  check(firstTravel > lastSink, `the walk began after it was gone (reading ${firstTravel}, the last sinking ${lastSink})`);
  check(sinking.every(([, u], n) => n === 0 || u >= sinking[n - 1][1]), 'it went down steadily');
});
