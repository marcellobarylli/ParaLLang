// Round 166: the travel caption in a real browser. After a conversation the player walks on; the narrator's passage
// about the way taken stays in the caption while the next conversation loads, with what the game is doing as its
// last sentence. The start of the second conversation is held back here until the caption's picture is taken; a
// real model takes seconds over it by itself.
//
//   npm run build -w client
//   node client/scripts/caption-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/166/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });

await game.run(async ({ page, check, shot, tap, say, runtime, content }) => {
  await game.toRoad();
  // One conversation, answered with every objective's example.
  await tap(page.getByRole('button', { name: /^Talk to / }));
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 60000 });
  const learnerId = await page.evaluate(() => localStorage.getItem('parallang.learnerId'));
  const session = runtime.service.encounters.get(learnerId);
  await say(runtime.service.definition(session).encounter.objectives.map((objective) => objective.accepted_examples[0]).join(' '));
  await page.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 60000 });

  // From here on, a conversation does not start until it is let go.
  let held = 0;
  let letGo;
  const waiting = new Promise((resolve) => { letGo = resolve; });
  await page.route('**/api/encounter/start', async (route) => {
    held += 1;
    await waiting;
    await route.fallback();
  });
  await game.reveal(page.locator('.road-banner'));
  await tap(page.getByRole('button', { name: 'Continue' }));

  const caption = page.locator('section.caption');
  const passage = caption.locator('p.narration');
  await passage.waitFor({ timeout: 60000 });
  const walking = await caption.textContent();
  const after = passage.locator('.narration-after');
  check(/ On the way to .+…$/.test(walking) && /^On the way to /.test(await after.textContent()), `while the camera walks, the passage ends "${(await after.textContent())}"`);
  const told = walking.slice(0, walking.length - (await after.textContent()).length).trim();
  const written = content.passages.find((entry) => entry.text.replace(/\s+/g, ' ').trim() === told);
  check(Boolean(written) && written.when.event === 'road_arrive', `and begins with the narrator's passage on the way taken ("${told.slice(0, 48)}…")`);
  await shot('01-on-the-way');

  // The camera arrives and the conversation is still loading: the passage is still there, with a new last sentence.
  await after.filter({ hasText: /is getting ready to talk…$/ }).waitFor({ timeout: 60000 });
  const loading = await caption.textContent();
  check(loading.startsWith(told), 'when the camera is there, the passage is still on the screen');
  check(/ \S+ is getting ready to talk…$/.test(loading), `and now ends "${await after.textContent()}"`);
  check(await caption.locator('p.narration').count() === 1 && await caption.locator(':scope > span').count() === 0, 'as one paragraph, with no bare line under it');
  check(await passage.evaluate((element) => getComputedStyle(element).fontStyle) === 'italic', 'in the narrator\'s italic');
  const box = await caption.boundingBox();
  check(box.y + box.height <= 844 && box.x >= 0 && box.x + box.width <= 390, 'the caption is inside a phone\'s screen');
  await shot('02-getting-ready');
  letGo();

  // When the character is ready, the caption goes and the conversation opens.
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 60000 });
  check(held === 1 && await caption.count() === 0, 'when the character is ready, the caption goes and the conversation opens');
  await shot('03-talking');
});
