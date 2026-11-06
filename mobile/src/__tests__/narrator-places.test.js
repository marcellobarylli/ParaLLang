// Round 062 (backlog C10b): the narrator reads the map card and the companion briefing.
import * as Speech from 'expo-speech';
import { createAudioPlayer } from 'expo-audio';
import { render, screen, userEvent } from '@testing-library/react-native';
import MapPanel from '../components/MapPanel.js';
import DialoguePanel from '../components/DialoguePanel.js';
import { speechText } from '../components/NarratorButton.js';
import { AMBIENCE_VOLUME, resetAmbienceForTests, setAmbience } from '../ambience.js';

const daniel = { identifier: 'com.apple.voice.compact.en-GB.Daniel', language: 'en-GB', name: 'Daniel', quality: 'Default' };
const place = (id, name) => ({ id, name, state: 'current', adjacent: false, map: { x: 0.5, y: 0.5 }, description: `The ${id} creaks.\n`, vocabularyFocus: [], encounter: null });
const worldAt = (id, name = id) => ({ currentLocationId: id, locations: [place(id, name)], paths: [] });
const props = { isLoading: false, onMove: jest.fn(), onEnterEncounter: jest.fn() };

beforeEach(() => { jest.clearAllMocks(); Speech.getAvailableVoicesAsync.mockResolvedValue([daniel]); });

test('speechText trims, drops blanks, ends each part in punctuation and keeps what is there', () => {
  expect(speechText(['  The Coffee Cart ', 'A cart.\n', '', null, 'Steam argues!', 'He said "no"'])).toBe('The Coffee Cart. A cart. Steam argues! He said "no"');
  expect(speechText([])).toBe('');
  expect(speechText(undefined)).toBe('');
});

test('"Hear the place" reads what the card shows when pressed: name, description, then the atmosphere line (decision 1)', async () => {
  const user = userEvent.setup();
  const { rerender } = await render(<MapPanel world={worldAt('cart', 'The Coffee Cart')} atmosphere={null} {...props} />);
  await user.press(await screen.findByRole('button', { name: 'Hear the place' }));
  expect(Speech.speak).toHaveBeenLastCalledWith('The Coffee Cart. The cart creaks.', expect.objectContaining({ language: 'en-GB', voice: daniel.identifier }));
  await rerender(<MapPanel world={worldAt('cart', 'The Coffee Cart')} atmosphere={{ locationId: 'cart', text: 'Steam argues with the drizzle.' }} {...props} />);
  await user.press(screen.getByRole('button', { name: 'Hear the place' }));
  expect(Speech.speak).toHaveBeenLastCalledWith('The Coffee Cart. The cart creaks. Steam argues with the drizzle.', expect.anything());
  // Another place's line is not read.
  await rerender(<MapPanel world={worldAt('cart', 'The Coffee Cart')} atmosphere={{ locationId: 'fountain', text: 'Wet.' }} {...props} />);
  await user.press(screen.getByRole('button', { name: 'Hear the place' }));
  expect(Speech.speak).toHaveBeenLastCalledWith('The Coffee Cart. The cart creaks.', expect.anything());
});

test('no English voice, no button', async () => {
  Speech.getAvailableVoicesAsync.mockResolvedValue([]);
  await render(<MapPanel world={worldAt('cart')} {...props} />);
  expect(await screen.findByText('The cart creaks.\n')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Hear the place' })).not.toBeOnTheScreen();
});

test('a move stops the voice and the new place\'s ambience plays at full volume; a null world, then a world, then unmount (critiques 1.1, 1.2, 1.5)', async () => {
  resetAmbienceForTests();
  const user = userEvent.setup();
  const view = await render(<MapPanel world={null} {...props} />);
  await view.rerender(<MapPanel world={worldAt('cart')} {...props} />);
  await setAmbience('coffee_cart');
  await user.press(await screen.findByRole('button', { name: 'Hear the place' }));
  const stops = Speech.stop.mock.calls.length;
  await view.rerender(<MapPanel world={worldAt('butchers_stall')} {...props} />);
  expect(Speech.stop.mock.calls.length).toBe(stops + 1);
  await setAmbience('butchers_stall');
  expect(createAudioPlayer.mock.results.at(-1).value.volume).toBe(AMBIENCE_VOLUME);
  await view.unmount();
  expect(Speech.stop.mock.calls.length).toBe(stops + 2);
  resetAmbienceForTests();
});

test('"Hear the briefing" reads the companion\'s lines joined, apart from the narrations (critiques 1.6, 1.7)', async () => {
  const user = userEvent.setup();
  await render(<DialoguePanel language={{ code: 'it', name: 'Italian', tag: 'it-IT' }} isLoading={false} onHelp={() => {}} encounter={{
    id: 's', encounterId: 'market_entrance_tutorial', state: 'ongoing', character: { name: 'Portia' }, hints: { remaining: 2, limit: 2 }, hints_available: true, difficulty: 0.2,
    companionBriefing: ['Tap a word to translate it', 'Hints are limited.'],
    currentObjective: { id: 'greet', prompt: 'Greet Portia.' },
    transcript: [{ id: 'npc-1', role: 'npc', narrative: 'The arch clears its throat.', protected: true, dialogue: { speaker: 'Portia', native: 'Buongiorno.', translationAvailable: true, words: [] } }],
  }} />);
  await user.press(await screen.findByRole('button', { name: 'Hear the briefing' }));
  expect(Speech.speak).toHaveBeenLastCalledWith('Tap a word to translate it. Hints are limited.', expect.objectContaining({ language: 'en-GB' }));
  expect(screen.getAllByRole('button', { name: 'Hear the narrator' })).toHaveLength(1);
});
