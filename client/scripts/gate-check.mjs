// Round 218: the change from A1 to A2 played as the owner plays it, on a phone, with the breathing on (its default).
// A journey of some walks is made on the server and the units are put at the last unit of A1. Then, in a real
// browser: that unit's conversation; Continue, which enters Angkor Wat (the gate that ends a level); the gate's three conversations, one
// at each of three of its sites, the breathing played over every walk and every wait for a reply; Continue after the
// last, which plays the world event (the pull); and the way on afterwards. Pictures along the way.
//
//   npm run build -w client
//   node client/scripts/gate-check.mjs [outDir] [--desktop]
import { RoadProvider, moveTo, road, talkHere } from '../../server/test/road-helpers.js';
import { api } from '../../server/test/helpers.js';
import { DESKTOP, PHONE, openGame } from './lib/play.mjs';

const desktop = process.argv.includes('--desktop');
const out = (process.argv[2]?.startsWith('--') ? null : process.argv[2]) ?? 'docs/rounds/218/shots';
const WALKS = 4;

const game = await openGame({
  device: desktop ? DESKTOP : PHONE, out, display: { breathing: true }, provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242, exchangeLimit: 2 },
  before: async (runtime) => {
    const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
    for (let n = 0; n < WALKS; n += 1) {
      let view = (await road(runtime, learnerId)).data;
      if (!view.road.current) view = (await api(runtime, '/api/road/jump', { learnerId, method: 'POST', body: { unitId: view.curriculum.stages[0].units[0].id } })).data;
      await talkHere(runtime, learnerId);
      view = (await road(runtime, learnerId)).data;
      if (view.road.frontier.find((site) => site.id === view.road.rails)?.offer.dungeon) view = (await api(runtime, '/api/road/jump', { learnerId, method: 'POST', body: { unitId: view.curriculum.stages[0].units[0].id } })).data;
      await moveTo(runtime, learnerId, view.road.rails);
    }
    // The units up to the last of A1 are done; its conversation waits where the learner stands.
    const { data: view } = await road(runtime, learnerId);
    const a1 = view.curriculum.stages.findLast((stage) => stage.cefr === 'A1');
    await api(runtime, '/api/road/jump', { learnerId, method: 'POST', body: { unitId: a1.units.at(-1).id } });
    return learnerId;
  },
});

await game.run(async ({ page, check, shot, tap, runtime }) => {
  const breathing = page.locator('.breath');
  const intro = page.getByRole('button', { name: 'Begin' });
  // Waits out a breathing (the guidebook's card first, the first time): it must start, and it must end.
  const breatheThrough = async (what) => {
    await Promise.race([breathing.waitFor({ timeout: 30000 }), intro.waitFor({ timeout: 30000 })]);
    if (await intro.isVisible().catch(() => false)) await tap(intro);
    await breathing.waitFor({ timeout: 30000 });
    await breathing.waitFor({ state: 'detached', timeout: 180000 });
    check(true, `${what}: the breathing played and ended`);
  };
  const say = async (text, what) => {
    await page.getByRole('textbox', { name: 'Your response' }).fill(text);
    await tap(page.getByRole('button', { name: 'Send' }));
    await breatheThrough(what);
  };
  const talk = async (name) => {
    await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 60000 });
    for (let n = 1; n <= 2; n += 1) await say(n === 1 ? 'Non lo so.' : 'Boh.', `${name}, answer ${n}`);
    const onward = page.getByRole('button', { name: /^(Continue|Enter )/ });
    await onward.first().waitFor({ state: 'attached', timeout: 60000 });
    await game.reveal(onward.first());
    return onward.first();
  };

  await game.toRoad();
  const learnerId = await page.evaluate(() => localStorage.getItem('parallang.learnerId'));
  await tap(page.getByRole('button', { name: /^Talk to / }));
  await shot('01-the-last-unit-of-a1');
  let onward = await talk('the last unit of A1');
  const label = await onward.textContent();
  check(/Enter Angkor Wat/.test(label), `the way on after the last unit of A1 is "${label}"`);
  await shot('02-before-angkor-wat');

  for (let part = 1; part <= 3; part += 1) {
    await tap(onward);
    await page.waitForTimeout(3000);
    await shot(`03-${part}-walking-in-angkor-wat`);
    await breatheThrough(`the walk to the gate's conversation ${part}`);
    const panel = page.locator('.dialogue-panel article.npc-message').first();
    const opened = await panel.waitFor({ timeout: 60000 }).then(() => true, () => false);
    const text = opened ? await page.locator('body').innerText() : '';
    const where = text.match(/The gate, \d of 3[^\n]*\n[^\n]*\n?[^\n]*Angkor Wat/);
    check(opened && text.includes(`The gate, ${part} of 3`) && /, Angkor Wat/.test(text), `the gate's conversation ${part} of 3 opens in Angkor Wat after the walk${where ? '' : ''}`);
    // The level behind it is Angkor Wat's, and it is drawn (not the green backdrop that stands in when it fails).
    const level = await page.evaluate(() => ({ status: document.querySelector('.level')?.className ?? null, name: window.__parallangLevel?.dungeon?.id ?? window.__parallangLevel?.name ?? null }));
    check(/level-ready/.test(level.status ?? ''), `the level is drawn behind it (${level.status})`);
    await shot(`04-${part}-the-gate-conversation`);
    onward = await talk(`the gate's conversation ${part}`);
    await shot(`05-${part}-the-gate-conversation-finished`);
  }

  const view = (await road(runtime, learnerId)).data;
  check(view.road.event?.kind === 'pull' && view.curriculum.position.cefr === 'A2', 'the gate is passed: the learner is in A2 and the road owes the pull');
  await tap(onward);
  await page.locator('.pull-event').waitFor({ timeout: 30000 });
  check(await breathing.count() === 0, 'no breathing over the world event');
  await shot('05b-the-world-event');
  await page.waitForFunction(() => window.__parallangPull?.phase === 'buckle', null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  await shot('06-the-land-sinking');
  const done = page.locator('.pull-event').getByRole('button', { name: 'Continue' });
  await done.waitFor({ timeout: 60000 });
  await tap(done);
  await page.locator('.pull-event').waitFor({ state: 'detached', timeout: 30000 });
  const after = (await road(runtime, learnerId)).data;
  check(after.road.event === null && after.road.pulled.length === 1, 'the event is seen; the land is the pulled one');
  await page.getByRole('button', { name: /^(Continue|Enter )/ }).waitFor({ timeout: 30000 });
  await shot('07-after-the-event');
});
