// Round 223: Japanese and Chinese are written in rōmaji and pinyin. The browser would write what it hears in those
// languages in kana, kanji or hanzi, so the microphone listens in English only, with no switch.
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InputBar from '../InputBar.jsx';

afterEach(cleanup);

const listener = () => {
  const heard = [];
  return { heard, supported: true, start: (options) => { heard.push(options); return true; }, stop: () => {} };
};

test('a language written in Latin letters is not listened for: English only, and no switch', async () => {
  const user = userEvent.setup();
  const mic = listener();
  render(<InputBar value="" onChange={() => {}} onSend={() => {}} listener={mic} language={{ code: 'ja', name: 'Japanese', tag: 'ja-JP', writing: 'rōmaji only' }} />);
  expect(screen.queryByRole('button', { name: /Switch to/ })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Speak your response in English' }));
  expect(mic.heard.map((options) => options.tag)).toEqual(['en-US']);
});

test('a language in its own script keeps its microphone and the switch', () => {
  render(<InputBar value="" onChange={() => {}} onSend={() => {}} listener={listener()} language={{ code: 'fr', name: 'French', tag: 'fr-FR' }} />);
  expect(screen.getByRole('button', { name: 'Listening in French. Switch to English' })).toBeTruthy();
});
