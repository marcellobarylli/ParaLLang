// Rounds 153 and 154: light mode in a real browser. Plays the built client's first conversation in headless
// Chromium against the real server code, with light mode switched on in Settings. The model is scripted to answer as
// light_turn.txt asks a model to (no model is called).
//
//   npm run build -w client
//   node client/scripts/light-check.mjs [outDir]
import { LightProvider } from '../../server/test/helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({
  out: process.argv[2] ?? 'docs/rounds/198/shots',
  provider: () => new LightProvider([
    { meant: 'Good morning! My name is Luigione.', target: 'Buongiorno! Mi chiamo Luigione.', clean: false, objectives_met: ['greet', 'introduce'] },
    { meant: 'And you, what is your name?', target: 'E tu, come ti chiami?', clean: true, objectives_met: ['ask_back'] },
    { meant: 'Thank you, see you soon!', target: 'Grazie, a presto!', clean: true, objectives_met: [] },
  ]),
});

await game.run(async ({ page, check, shot, tap, say, dialogues }) => {
  await game.toPortia();
  // Round 198: light checking is the default, so nothing is switched on first.
  check(await page.getByText(/Light mode: nothing is marked\./).first().isVisible(), 'the objective card says nothing is marked');
  check(await page.locator('.hearts').count() === 0, 'no hearts in light mode');

  await say('Good morning! Me chiamo Luigione.');
  const card = page.getByRole('region', { name: 'What you meant' });
  await card.waitFor({ timeout: 60000 });
  check(dialogues().length === 1 && dialogues()[0].light === true && !('beginner' in dialogues()[0]), 'the answer went to the server as light, not as a beginner\'s');
  check(await page.getByText('Understood', { exact: true }).isVisible(), 'the reply is headed "Understood"');
  check((await card.textContent()).includes('Buongiorno! Mi chiamo Luigione.'), 'the sentence is shown in Italian');
  // Round 198: what was understood stands under the player's answer, and the character's reply is last, above the box.
  const order = await page.evaluate(() => {
    const top = (selector) => [...document.querySelectorAll(selector)].at(-1)?.getBoundingClientRect().top ?? null;
    return { answer: top('.player-message'), understood: top('.assessment-banner'), reply: top('.npc-message'), box: top('.input-bar, form') };
  });
  check(order.answer < order.understood && order.understood < order.reply, `the order is answer, understood, reply (${JSON.stringify(order)})`);
  check(await page.evaluate(() => { const scroll = document.querySelector('.sheet-scroll'); const reply = [...scroll.querySelectorAll('.npc-message')].at(-1); return [...scroll.querySelectorAll('.sheet-scroll > *, .dialogue-panel > *')].every((node) => node === reply || node.contains(reply) || !(node.getBoundingClientRect().top >= reply.getBoundingClientRect().bottom && node.getBoundingClientRect().height > 0)); }), 'nothing stands between the reply and the box');
  await shot('03-understood');
});
