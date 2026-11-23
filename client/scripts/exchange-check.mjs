// Round 174: a road conversation in a real browser is complete on the third reply, whatever is said, and the player
// may keep chatting after it. Shots of the counter, the end with "Keep chatting", and a chat turn.
//
//   npm run build -w client
//   node client/scripts/exchange-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/174/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242, exchangeLimit: 3 } }); // the game's limit (the test helper's default is none)

await game.run(async ({ page, check, shot, tap, say }) => {
  await game.toRoad();
  await tap(page.getByRole('button', { name: /^Talk to / }));
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 60000 });
  const count = page.locator('.exchange-count').first();
  check(/^Reply 1 of 3\./.test(await count.textContent()), `before the first reply: "${await count.textContent()}"`);
  await say('Non lo so.');
  await page.locator('.exchange-count', { hasText: 'Reply 2 of 3' }).first().waitFor({ timeout: 60000 });
  await shot('01-reply-2-of-3');
  await say('Boh.');
  await say('Niente.');
  const chatOn = page.getByRole('button', { name: /^Keep chatting with / });
  await chatOn.waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Continue' }).waitFor({ state: 'attached', timeout: 60000 });
  check(true, 'the third reply completes it: Continue is offered');
  check(await page.locator('textarea, input[type="text"]').count() === 0, 'no reply box until the player asks to chat');
  await game.reveal(chatOn);
  await shot('02-complete-after-three');
  await tap(chatOn);
  await say('Come va?');
  await page.getByText(/Chatting on with/).waitFor({ timeout: 60000 });
  await page.locator('.dialogue-panel article.npc-message').nth(4).waitFor({ timeout: 60000 });
  check(await page.locator('.dialogue-panel article.npc-message').count() === 5, 'the character answers the chat');
  await game.reveal(page.getByText(/Chatting on with/));
  await shot('03-chatting-on');
  await tap(page.getByRole('button', { name: 'Done chatting' }));
  check(await page.getByRole('button', { name: 'Continue' }).count() === 1, 'done chatting: the way on is back');
});
