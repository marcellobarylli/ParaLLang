import * as Speech from 'expo-speech';
import { render, screen, userEvent } from '@testing-library/react-native';
import PronounceButton from '../components/PronounceButton.js';
import { findVoice } from '../speech.js';

const italian = { code: 'it', name: 'Italian', tag: 'it-IT' };
const voices = {
  spanish: { identifier: 'com.apple.voice.compact.es-ES.Monica', language: 'es-ES', name: 'Mónica', quality: 'Default' },
  swissItalian: { identifier: 'com.apple.voice.compact.it-CH.Luca', language: 'it-CH', name: 'Luca', quality: 'Default' },
  italian: { identifier: 'com.apple.voice.compact.it-IT.Alice', language: 'it-IT', name: 'Alice', quality: 'Default' },
};

beforeEach(() => { jest.clearAllMocks(); });

test('picks an it-IT voice for it-IT, falls back to the primary subtag, and ignores es-ES', async () => {
  Speech.getAvailableVoicesAsync.mockResolvedValue([voices.spanish, voices.swissItalian, voices.italian]);
  expect(await findVoice('it-IT')).toBe(voices.italian);
  Speech.getAvailableVoicesAsync.mockResolvedValue([voices.spanish, voices.swissItalian]);
  expect(await findVoice('it-IT')).toBe(voices.swissItalian);
  Speech.getAvailableVoicesAsync.mockResolvedValue([voices.spanish]);
  expect(await findVoice('it-IT')).toBeNull();
});

test('speaks with the chosen voice identifier after stopping the previous utterance', async () => {
  const user = userEvent.setup();
  Speech.getAvailableVoicesAsync.mockResolvedValue([voices.spanish, voices.italian]);
  await render(<PronounceButton text="caffè" language={italian} />);
  await user.press(await screen.findByRole('button', { name: 'Hear caffè in Italian' }));
  expect(Speech.stop).toHaveBeenCalledTimes(1);
  expect(Speech.speak).toHaveBeenCalledWith('caffè', { language: 'it-IT', voice: 'com.apple.voice.compact.it-IT.Alice' });
  expect(Speech.stop.mock.invocationCallOrder[0]).toBeLessThan(Speech.speak.mock.invocationCallOrder[0]);
});

test('is disabled with the fallback label when no voice matches', async () => {
  Speech.getAvailableVoicesAsync.mockResolvedValue([voices.spanish]);
  await render(<PronounceButton text="caffè" language={italian} />);
  expect(await screen.findByRole('button', { name: 'Italian pronunciation unavailable' })).toBeDisabled();
  expect(Speech.speak).not.toHaveBeenCalled();
});
