// Round 156: the narrator's written passages in a real browser. Plays the built client in headless Chromium against
// the real server code with a scripted model: the first step on the road, an arrival, and a site of Ta Prohm.
//
//   npm run build -w client
//   node client/scripts/narrator-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/156/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });

await game.run(async ({ page, check, shot, tap, say, runtime, content }) => {
  await game.toRoad();
  const first = page.locator('.road-card .narration');
  check((await first.textContent()).startsWith('You step onto the road.'), 'the road\'s card tells the first step');
  check(await first.evaluate((element) => getComputedStyle(element).fontStyle) === 'italic', 'in the narrator\'s italic');
  await shot('01-first-step');

  // One conversation, answered with every objective's example, then on along the rails.
  await tap(page.getByRole('button', { name: /^Talk to / }));
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 60000 });
  const learnerId = await page.evaluate(() => localStorage.getItem('parallang.learnerId'));
  const session = runtime.service.encounters.get(learnerId);
  await say(runtime.service.definition(session).encounter.objectives.map((objective) => objective.accepted_examples[0]).join(' '));
  await page.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 60000 });
  check(await page.locator('.road-banner p.narrative').count() === 1, 'the conversation\'s last word is set as narration');
  await game.reveal(page.locator('.road-banner'));
  await shot('02-last-word');
  await tap(page.getByRole('button', { name: 'Continue' }));
  const caption = page.locator('.caption .narration');
  await caption.waitFor({ timeout: 60000 });
  const told = await caption.textContent();
  const passage = content.passages.find((entry) => entry.text.replace(/\s+/g, ' ').trim() === told);
  check(Boolean(passage) && passage.when.event === 'road_arrive', `the travel caption tells the way taken ("${told.slice(0, 50)}…")`);
  await shot('03-on-the-way');

  // A dungeon's site card: leave the road, enter Ta Prohm, walk down, leave the conversation.
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 60000 });
  await tap(page.getByRole('button', { name: 'Leave', exact: true }));
  await tap(page.getByRole('button', { name: 'World map' }));
  await tap(page.getByRole('button', { name: 'Enter Ta Prohm' }));
  await tap(page.getByRole('button', { name: 'Start', exact: true }));
  await page.getByLabel('Conversation with Portia').waitFor({ timeout: 60000 });
  await tap(page.getByRole('button', { name: 'Leave', exact: true }));
  const site = page.locator('.site-card .narration');
  await site.waitFor({ timeout: 20000 });
  check((await site.textContent()).startsWith('You stand before the gate.'), 'the site card of the Face Gate tells its passage');
  await shot('04-face-gate');
});
