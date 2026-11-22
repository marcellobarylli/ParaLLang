// Round 158: untranslatable text in a real browser. A learner is walked along the road on the server (scripted
// model, no model called) until the narrator tells a passage with a turmeric text; then the built client is opened
// as that learner in headless Chromium.
//
//   npm run build -w client
//   node client/scripts/turmeric-check.mjs [outDir]
import { RoadProvider, moveTo, road, talkHere } from '../../server/test/road-helpers.js';
import { api } from '../../server/test/helpers.js';
import { openGame } from './lib/play.mjs';

let told = null;
const game = await openGame({
  out: process.argv[2] ?? 'docs/rounds/158/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 },
  before: async (runtime) => {
    const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
    await road(runtime, learnerId);
    for (let walked = 0; walked < 60 && !told; walked += 1) {
      await talkHere(runtime, learnerId);
      const view = (await road(runtime, learnerId)).data.road;
      const moved = (await moveTo(runtime, learnerId, (view.frontier.find((site) => site.biome === 'forest') ?? view.frontier.find((site) => site.recommended) ?? view.frontier[0]).id)).data;
      if (moved.road.narration?.segments.some((segment) => segment.kind === 'truth')) told = moved.road.narration;
    }
    return learnerId;
  },
});

await game.run(async ({ page, check, shot, tap, content }) => {
  check(Boolean(told), 'the walk on the server met a passage with a turmeric text');
  const text = told.segments.find((segment) => segment.kind === 'truth').text;
  await game.toRoad();
  const span = page.locator('.road-card .narration-truth');
  await span.waitFor({ timeout: 20000 });
  check(await span.textContent() === text, `the road's card shows it: "${text}"`);
  const style = await span.evaluate((element) => { const computed = getComputedStyle(element); return { colour: computed.color, slant: computed.fontStyle }; });
  check(style.colour === 'rgb(232, 163, 23)', `in turmeric (${style.colour})`);
  check(style.slant === 'normal', 'upright, inside the narrator\'s italic');
  check(await span.getAttribute('lang') === content.language.tag && await span.getAttribute('translate') === 'no', 'marked as Italian and not to be translated by the browser');
  check(await span.locator('button').count() === 0 && await page.locator('.road-card .narration button').count() === 0, 'with nothing to tap for a meaning');
  const card = await page.locator('.road-card').evaluate((element) => ({ top: element.getBoundingClientRect().top, bar: document.querySelector('.hud').getBoundingClientRect().bottom, scrolls: element.scrollHeight > element.clientHeight }));
  check(card.top >= card.bar - 1, `the card starts under the top bar (${Math.round(card.top)} px, the bar ends at ${Math.round(card.bar)})${card.scrolls ? ' and scrolls inside' : ''}`);
  const before = await page.locator('.road-card').textContent();
  await span.scrollIntoViewIfNeeded();
  await span.tap();
  check(await page.locator('.road-card').textContent() === before, 'a tap on it shows nothing more');
  const note = page.getByRole('complementary', { name: 'Entered in your guidebook' });
  check((await note.textContent()).includes('Turmeric coloured text cannot be translated.'), 'the guidebook\'s entry "Turmeric text" is told with it');
  await span.scrollIntoViewIfNeeded();
  await shot('01-turmeric-on-the-road');

  await tap(page.getByRole('button', { name: /^Guidebook/ }));
  const found = page.getByRole('region', { name: 'Turmeric text you have found' });
  await found.waitFor({ timeout: 20000 });
  check((await found.locator('.narration-truth').first().textContent()) === text, 'the guidebook keeps the passage with its text');
  check(await page.getByRole('heading', { name: /Turmeric text/ }).first().isVisible(), 'and has the entry that explains the colour');
  await found.scrollIntoViewIfNeeded();
  await shot('02-guidebook');
});
