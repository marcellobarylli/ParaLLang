// Rounds 153 and 154: light mode in a real browser. Plays the built client's first conversation in headless
// Chromium against the real server code, with light mode switched on in Settings. The model is scripted to answer as
// light_turn.txt asks a model to (no model is called).
//
//   npm run build -w client
//   node client/scripts/light-check.mjs [outDir]
import { LightProvider } from '../../server/test/helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({
  out: process.argv[2] ?? 'docs/rounds/154/shots',
  provider: () => new LightProvider([
    { meant: 'Good morning! My name is Luigione.', target: 'Buongiorno! Mi chiamo Luigione.', clean: false, objectives_met: ['greet', 'introduce'] },
    { meant: 'And you, what is your name?', target: 'E tu, come ti chiami?', clean: true, objectives_met: ['ask_back'] },
    { meant: 'Thank you, see you soon!', target: 'Grazie, a presto!', clean: true, objectives_met: [] },
  ]),
});

await game.run(async ({ page, check, shot, tap, say, dialogues }) => {
  await game.toPortia();
  await tap(page.getByRole('button', { name: 'Settings' }));
  check(await page.getByRole('radio', { name: 'Strict' }).isChecked(), 'Settings: answers are checked strictly unless changed');
  await page.getByRole('radio', { name: 'Light' }).scrollIntoViewIfNeeded();
  await tap(page.getByRole('radio', { name: 'Light' }));
  check(await page.getByLabel('Beginner mode').isDisabled(), 'Beginner mode steps back under Light');
  await shot('01-settings-light');
  await tap(page.getByRole('button', { name: 'Close' }));
  check(await page.getByText(/Light mode: nothing is marked\./).first().isVisible(), 'the objective card says nothing is marked');
  check(await page.getByText(/Turn 1 of 3 to 5\. You can ask Portia questions back\./).first().isVisible(), 'and shows the exchange and the nudge to ask back');
  check(await page.locator('.hearts').count() === 0, 'no hearts in light mode');
  await shot('02-objective-light');

  await say('Good morning! Me chiamo Luigione.');
  const card = page.getByRole('region', { name: 'What you meant' });
  await card.waitFor({ timeout: 60000 });
  check(dialogues().length === 1 && dialogues()[0].light === true && !('beginner' in dialogues()[0]), 'the answer went to the server as light, not as a beginner\'s');
  check(await page.getByText('Understood', { exact: true }).isVisible(), 'the reply is headed "Understood"');
  check((await card.textContent()).includes('Buongiorno! Mi chiamo Luigione.'), 'the sentence is shown in Italian');
  await game.reveal(card);
  await shot('03-understood');

  await say('E tu, come ti chiami?');
  await page.getByText('Keep talking').first().waitFor({ timeout: 60000 });
  check(await page.getByRole('textbox', { name: 'Your response' }).isVisible(), 'everything is said after two turns, and the conversation goes on');
  await game.reveal(page.getByText('Keep talking').first());
  await shot('04-keep-talking');

  await say('Grazie, a presto!');
  await page.locator('.victory-banner').waitFor({ timeout: 60000 });
  check(await page.getByRole('textbox', { name: 'Your response' }).count() === 0, 'the third turn ends the conversation');
  await game.reveal(page.locator('.victory-banner'));
  await shot('05-ended');
});
