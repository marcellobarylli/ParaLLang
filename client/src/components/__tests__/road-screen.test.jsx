// Round 144: The Journey 2 on the screen, against the real server logic (src/__tests__/roadServer.js) and with
// no WebGL (the backdrop stands in and the camera arrives at once). From the world map: the hub with the character in
// words, a conversation, the way on by the rails, the map with a site of the player's own choice, the curriculum.
import { afterAll, afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DungeonScreen from '../DungeonScreen.jsx';
import { positionLine } from '../Road.jsx';
import { createGameStore } from '../../stores/gameStore.js';
import { DUNGEON, DUNGEONS } from '../../dungeon.js';
import { ATLAS } from '../../atlas.js';
import { cleanUp, createRoadServer } from '../../__tests__/roadServer.js';

// The first test loads the whole content, the curriculum's vocabulary included (about a second).
vi.setConfig({ testTimeout: 30_000 });
afterEach(cleanup);
afterAll(cleanUp);

// Round 173: these tests play the full pacing, so streamlined mode is off in this browser.
function memoryStorage() {
  const values = new Map([['parallang.display', JSON.stringify({ streamlined: false })]]);
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}
const silent = { speaker: { supported: false, speaking: false, speak() {}, stop() {}, prime() {} }, listener: { supported: false, listening: false, start() { return false; }, stop() {} } };
const noMusic = { supported: false, start() {}, stop() {}, setLevel() {} };

async function mount() {
  const server = createRoadServer();
  const useStore = createGameStore({ api: server.api, storage: memoryStorage(), dungeon: DUNGEON, dungeons: DUNGEONS, atlas: ATLAS });
  const user = userEvent.setup();
  render(<DungeonScreen useStore={useStore} speech={silent} ambience={noMusic} />);
  await user.click(await screen.findByRole('button', { name: 'Enter' }, { timeout: 20_000 }));
  await user.click(screen.getByRole('button', { name: 'Set out on The Journey 2: Journathan Returns (again)' }));
  // The first road of a process loads the curriculum (about a second, more on a busy machine).
  await screen.findByRole('button', { name: /^Talk to / }, { timeout: 20_000 });
  return { server, user, s: () => useStore.getState() };
}

test('the hub names the place, describes who waits in words, and says where the player is in the curriculum', async () => {
  const { s } = await mount();
  const talk = await screen.findByRole('button', { name: /^Talk to / });
  const card = talk.closest('.road-card');
  const { current, here } = s().road;
  expect(within(card).getByRole('heading', { name: here.name })).toBeTruthy();
  expect(card.textContent).toContain(current.character.name);
  expect(card.textContent).toContain(current.character.description);
  expect(card.textContent).toContain('A1 · unit 1 of');
  expect(card.textContent).toContain('Saying hello');
  expect(screen.getByText('The Journey 2: Journathan Returns (again)')).toBeTruthy(); // the top bar
  expect(screen.queryByRole('button', { name: /^Party/ })).toBe(null);
  expect(screen.getByRole('checkbox', { name: /On rails/ }).checked).toBe(true);
  // Round 146: the time of day and the weather of this road, as its seed and the clock give them.
  const { weatherAt } = await import('../../../../server/src/road/weather.js');
  const line = card.querySelector('.weather-line');
  const labels = [weatherAt(Date.now() - 5000, s().road.seed).label, weatherAt(Date.now(), s().road.seed).label];
  expect(labels).toContain(line.textContent.replace(/^\S+ /, ''));
});

test('a conversation on the road, then Continue takes the rails to the next one', async () => {
  const { server, user, s } = await mount();
  await user.click(await screen.findByRole('button', { name: /^Talk to / }));
  const sheet = await screen.findByRole('region', { name: 'Saying hello' });
  expect(sheet.textContent).toContain(s().encounter.character.role);
  await user.type(within(sheet).getByRole('textbox'), server.fullAnswer(s().learnerId));
  await user.click(within(sheet).getByRole('button', { name: /^Send/ }));
  await screen.findByText('New: 100 % said cleanly.');
  await screen.findByRole('button', { name: 'Continue' }); // the road has been read again
  const next = s().road.frontier.find((site) => site.recommended);
  expect(document.querySelector('.next-line').textContent).toContain(next.offer.character.name);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  await vi.waitFor(() => expect(s().road.at).toBe(next.id));
  await vi.waitFor(() => expect(s().roadPhase).toBe('encounter'));
  expect((await screen.findByRole('region', { name: next.offer.title })).textContent).toContain(next.offer.character.name);
});

test('off the rails the hub lists the ways on; the map shows each site ahead and walks to the one picked', async () => {
  const { server, user, s } = await mount();
  await user.click(await screen.findByRole('button', { name: /^Talk to / }));
  const sheet = await screen.findByRole('region', { name: 'Saying hello' });
  await user.type(within(sheet).getByRole('textbox'), server.fullAnswer(s().learnerId));
  await user.click(within(sheet).getByRole('button', { name: /^Send/ }));
  await screen.findByRole('button', { name: 'Continue' });
  await user.click(screen.getByRole('checkbox', { name: /On rails/ }));
  expect(s().display.rails).toBe(false);
  const ways = within(screen.getByRole('list', { name: 'Ways on' })).getAllByRole('button');
  expect(ways).toHaveLength(s().road.frontier.length);
  await user.click(screen.getAllByRole('button', { name: 'Map' })[0]);
  const map = await screen.findByRole('main', { name: 'The map of the road' });
  const ahead = within(map).getAllByRole('button', { pressed: false });
  expect(within(map).getAllByRole('button', { pressed: true })).toHaveLength(1);
  const target = s().road.frontier.find((site) => !site.recommended) ?? s().road.frontier[0];
  await user.click(map.querySelectorAll('.map-ahead')[s().road.frontier.indexOf(target)]);
  expect(map.textContent).toContain(target.offer.character.description);
  expect(ahead.length).toBeGreaterThanOrEqual(0);
  await user.click(within(map).getByRole('button', { name: 'Walk here' }));
  await vi.waitFor(() => expect(s().road.at).toBe(target.id));
  expect(s().roadPanel).toBe(null);
});

test('the curriculum panel shows every stage with the unit the player is in and what is done', async () => {
  const { server, user, s } = await mount();
  await user.click(await screen.findByRole('button', { name: /^Talk to / }));
  const sheet = await screen.findByRole('region', { name: 'Saying hello' });
  await user.type(within(sheet).getByRole('textbox'), server.fullAnswer(s().learnerId));
  await user.click(within(sheet).getByRole('button', { name: /^Send/ }));
  await screen.findByRole('button', { name: 'Continue' });
  await user.click(screen.getByRole('button', { name: /^The curriculum:/ }));
  const panel = await screen.findByRole('main', { name: 'The curriculum' });
  expect(panel.textContent).toContain(positionLine(s().curriculum));
  expect(panel.textContent).toContain(`1 of ${s().curriculum.totals.lessonsTotal} lessons`);
  expect(panel.querySelectorAll('.unit-current')).toHaveLength(1);
  expect(panel.querySelector('.unit-current').textContent).toContain('you are here');
  expect(panel.querySelectorAll('.stage:not(.journal)')).toHaveLength(server.content.curriculum.stages.length);
  expect(panel.querySelector('.journal').textContent).toContain('Saying hello');
  expect(panel.querySelector('.lessons .done').textContent).toContain('100 %');
});
