// Round 159: a character's revelation in a real browser. A learner stands before Ta Prohm's sanctuary (the save is
// set up on the server); the built client is opened as that learner in headless Chromium and answers Bambieshart
// with a scripted grader (no model is called).
//
//   npm run build -w client
//   node client/scripts/revelation-check.mjs [outDir]
import { PassingProvider, api, passingAnswers } from '../../server/test/helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({
  out: process.argv[2] ?? 'docs/rounds/159/shots', provider: (content) => new PassingProvider(content),
  before: async (runtime) => {
    const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
    const envelope = await runtime.storage.load(learnerId);
    await runtime.storage.save({ ...envelope, dungeons: { ta_prohm: { run: 1, at: 'before_sanctuary', cleared: ['face_gate'], visited: ['face_gate', 'before_sanctuary'] } } });
    return learnerId;
  },
});

await game.run(async ({ page, check, shot, tap, say, content }) => {
  await game.open();
  // A run under way resumes at the site the player stands at.
  await page.getByLabel('Conversation with Bambieshart').waitFor({ timeout: 90000 });
  check(await page.locator('.revelation').count() === 0, 'nothing is uttered while the conversation runs');
  await say(passingAnswers(content, 'high_gate_bambieshart').join(' '));
  const region = page.locator('.revelation');
  await region.waitFor({ timeout: 60000 });
  const text = content.truths.get('inflection').text;
  check((await region.textContent()).includes('he utters the following:'), 'the narrator tells that Bambieshart utters something');
  const span = region.locator('.narration-truth');
  check(await span.textContent() === text, `and what: "${text.slice(0, 48)}…"`);
  check(await span.evaluate((element) => getComputedStyle(element).color) === 'rgb(232, 163, 23)', 'in turmeric');
  check(await region.locator('button').count() === 0, 'with nothing to tap');
  const order = await page.evaluate(() => { const uttered = document.querySelector('.revelation'); const last = document.querySelector('.victory-banner'); return Boolean(uttered.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING); });
  check(order, 'before the conversation\'s last word');
  await game.reveal(region);
  await shot('01-bambieshart-utters');
  check(/2 new/.test(await page.getByRole('button', { name: /^Guidebook/ }).getAttribute('aria-label')), 'the guidebook has two new entries: being let past, and turmeric text');
  await tap(page.getByRole('button', { name: /^Guidebook/ }));
  const found = page.getByRole('region', { name: 'Turmeric text you have found' });
  await found.waitFor({ timeout: 20000 });
  check((await found.textContent()).includes(text), 'and keeps what he uttered');
  await found.scrollIntoViewIfNeeded();
  await shot('02-kept');
});
