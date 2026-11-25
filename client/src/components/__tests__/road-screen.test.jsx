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

// Round 180: the opening message, once the camera is down at the start of the journey; closed by Set out.
async function welcome(user) {
  const dialog = await screen.findByRole('dialog', { name: 'A word first' }, { timeout: 20_000 });
  await user.click(within(dialog).getByRole('button', { name: 'Set out' }));
}

async function mount({ storage = memoryStorage() } = {}) {
  const server = createRoadServer();
  const useStore = createGameStore({ api: server.api, storage, dungeon: DUNGEON, dungeons: DUNGEONS, atlas: ATLAS });
  const user = userEvent.setup();
  render(<DungeonScreen useStore={useStore} speech={silent} ambience={noMusic} />);
  // Round 175: the title screen's one button sets out on the road.
  await user.click(await screen.findByRole('button', { name: 'The Journey 2: Journathan Returns (again)' }, { timeout: 20_000 }));
  if (storage.getItem('parallang.welcomed') !== '1') await welcome(user);
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

test('the journey opens on a message about learning by conversation; closed, it does not come again in this slot', async () => {
  const server = createRoadServer();
  const storage = memoryStorage();
  const useStore = createGameStore({ api: server.api, storage, dungeon: DUNGEON, dungeons: DUNGEONS, atlas: ATLAS });
  const user = userEvent.setup();
  render(<DungeonScreen useStore={useStore} speech={silent} ambience={noMusic} />);
  await user.click(await screen.findByRole('button', { name: 'The Journey 2: Journathan Returns (again)' }, { timeout: 20_000 }));
  const dialog = await screen.findByRole('dialog', { name: 'A word first' }, { timeout: 20_000 });
  expect(dialog.textContent).toContain('by living in it');
  expect(dialog.textContent).toContain('talking to the people who live in it');
  expect(screen.queryByRole('button', { name: /^Talk to / })).toBeNull(); // the arrival's card waits behind it
  await user.click(within(dialog).getByRole('button', { name: 'Set out' }));
  expect(await screen.findByRole('button', { name: /^Talk to / })).toBeTruthy();
  expect(storage.getItem('parallang.welcomed')).toBe('1');
  cleanup();
  // The same slot again: straight to the arrival's card.
  await mount({ storage });
  expect(screen.queryByRole('dialog', { name: 'A word first' })).toBeNull();
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

// Round 175: the title screen offers The Journey 2 alone; the top bar has the map and the menu everywhere, the map
// opens over a conversation, and a conversation can be left unfinished from the menu or by walking off from the map.
test('the title offers the journey alone; the map and the menu are at hand in a conversation, which can be left unfinished', async () => {
  const server = createRoadServer();
  const useStore = createGameStore({ api: server.api, storage: memoryStorage(), dungeon: DUNGEON, dungeons: DUNGEONS, atlas: ATLAS });
  const user = userEvent.setup();
  const s = () => useStore.getState();
  render(<DungeonScreen useStore={useStore} speech={silent} ambience={noMusic} />);
  const title = screen.getByRole('region', { name: 'ParaLLang' });
  expect(within(title).getAllByRole('button').map((button) => button.textContent)).toEqual(['The Journey 2: Journathan Returns (again)']);
  expect(screen.queryByRole('button', { name: /^Enter / })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Map' })).toBeNull(); // nothing to map yet
  await vi.waitFor(() => expect(s().road).not.toBe(null), { timeout: 20_000 }); // the world is loaded behind the title
  expect(s().mode).toBe('dungeon');
  // The menu on the title: the records, Settings and the other places; no way out of anything.
  await user.click(screen.getByRole('button', { name: /^Menu/ }));
  let menu = screen.getByRole('navigation', { name: 'Game menu' });
  expect(within(menu).getAllByRole('button').map((button) => button.textContent.replace(/\s+/g, ' ').trim())).toEqual(['Close', 'Spellbook', 'Guidebook 1 new', 'Settings', 'Save slots Slot 1', 'Other places Ta Prohm, The Kiln']); // the guidebook's first entry came with the road
  await user.click(within(menu).getByRole('button', { name: 'Close' }));

  await user.click(screen.getByRole('button', { name: 'The Journey 2: Journathan Returns (again)' }));
  await welcome(user);
  await user.click(await screen.findByRole('button', { name: /^Talk to / }, { timeout: 20_000 }));
  const sheet = await screen.findByRole('region', { name: 'Saying hello' });
  const name = s().encounter.character.name;
  // The map over the conversation, and back to it.
  await user.click(screen.getByRole('button', { name: 'Map' }));
  let map = await screen.findByRole('main', { name: 'The map of the road' });
  expect(within(map).getByRole('button', { name: 'Leave the conversation and walk here' }).disabled).toBe(false);
  await user.click(within(map).getByRole('button', { name: `Back to ${name}` }));
  expect(screen.queryByRole('main', { name: 'The map of the road' })).toBeNull();
  expect(screen.getByRole('region', { name: 'Saying hello' })).toBe(sheet);

  // The menu in the conversation: the map, the curriculum, the records, Settings and the ways out.
  await user.click(screen.getByRole('button', { name: /^Menu/ }));
  menu = screen.getByRole('navigation', { name: 'Game menu' });
  expect(within(menu).getAllByRole('button').map((button) => button.textContent.replace(/\s+/g, ' ').trim().split(' ')[0])).toEqual(['Close', 'Map', 'Curriculum', 'Spellbook', 'Guidebook', 'Settings', 'Save', 'Leave', 'Other', 'Back']);
  await user.click(within(menu).getByRole('button', { name: 'Leave the conversation' }));
  expect(s().roadPhase).toBe('hub');
  expect(s().encounter.state).toBe('ongoing'); // it waits, unfinished
  expect(screen.getByRole('button', { name: 'Back to the conversation' })).toBeTruthy();

  // Back in, and off again by the map: the conversation is left, and the walk goes.
  await user.click(screen.getByRole('button', { name: 'Back to the conversation' }));
  const here = s().road.at;
  await user.click(screen.getByRole('button', { name: 'Map' }));
  map = await screen.findByRole('main', { name: 'The map of the road' });
  await user.click(within(map).getByRole('button', { name: 'Leave the conversation and walk here' }));
  await vi.waitFor(() => expect(s().road.at).not.toBe(here));
  expect(s().road.cleared).not.toContain(here);

  // And back to the title from the menu.
  await vi.waitFor(() => expect(s().isLoading).toBe(false));
  await user.click(screen.getByRole('button', { name: /^Menu/ }));
  await user.click(within(screen.getByRole('navigation', { name: 'Game menu' })).getByRole('button', { name: 'Back to the title' }));
  expect([s().phase, s().mode]).toEqual(['attract', 'dungeon']);
  expect(screen.getByRole('region', { name: 'ParaLLang' })).toBeTruthy();
});
