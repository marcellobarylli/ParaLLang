// Round 221: after an answer, the correction box is brought to the top of the panel (with the breathing on and off),
// and a line mid-conversation has no narration. Plays Portia's conversation in headless Chromium against the real
// server code with a scripted model (no model is called).
//
//   npm run build -w client
//   node client/scripts/follow-check.mjs [outDir] [breathing: on|off]
import { LightProvider } from '../../server/test/helpers.js';
import { openGame } from './lib/play.mjs';

const breathing = process.argv[3] === 'on';
{
  const game = await openGame({
    out: process.argv[2] ?? 'docs/rounds/221/shots',
    display: { breathing },
    provider: () => new LightProvider([
      { meant: 'Good morning! My name is Luigione.', target: 'Buongiorno! Mi chiamo Luigione.', clean: false, objectives_met: ['greet', 'introduce'] },
      { meant: 'And you, what is your name?', target: 'E tu, come ti chiami?', clean: true, objectives_met: ['ask_back'] },
    ]),
  });
  await game.run(async ({ page, check, shot, say }) => {
    await game.toPortia();
    await say('Good morning! Me chiamo Luigione.');
    await page.getByRole('region', { name: 'What you meant' }).waitFor({ timeout: 90000 });
    if (breathing) {
      // The guidebook's entry on the breathing is told first; then at least three breaths (about 32 s).
      await game.tap(page.getByRole('button', { name: 'Begin' }), { timeout: 30000 });
      await page.waitForSelector('.sheet.breathing', { timeout: 10000 });
    }
    await page.waitForFunction(() => document.querySelectorAll('.npc-message').length >= 2 && !document.querySelector('.sheet.breathing'), null, { timeout: 90000 });
    await page.waitForTimeout(600);
    const where = await page.evaluate(() => {
      const scroll = document.querySelector('.sheet-scroll');
      const box = document.querySelector('.after-answer');
      const lines = [...document.querySelectorAll('.npc-message')];
      return {
        offset: box.getBoundingClientRect().top - scroll.getBoundingClientRect().top,
        narrated: lines.map((line) => Boolean(line.querySelector('p.narrative'))),
      };
    });
    const bar = await page.evaluate(() => document.querySelector('.objective-bar')?.getBoundingClientRect().bottom - document.querySelector('.sheet-scroll').getBoundingClientRect().top);
    check(where.offset >= (bar || 0) && where.offset <= (bar || 0) + 20, `breathing ${breathing ? 'on' : 'off'}: the correction box is at the top of the panel, under the objective's bar (${where.offset.toFixed(0)} px down; the bar ends at ${bar?.toFixed?.(0)})`);
    check(where.narrated[0] === true && where.narrated.slice(1).every((n) => !n), `breathing ${breathing ? 'on' : 'off'}: only the opening line is narrated (${where.narrated})`);
    await shot(`after-answer-breathing-${breathing ? 'on' : 'off'}`);
  });
}
