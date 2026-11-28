// Round 114: the settings sheet edits the server URL and access token; the gear button in the top bar opens it.
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsSheet from '../SettingsSheet.jsx';
import { measureViewport } from '../../viewport.js';
import App from '../../App.jsx';
import { useGameStore } from '../../stores/useGameStore.js';
import { openMenu, toPlaces } from './menu.js';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('the sheet saves the URL and token it was edited to, and Close closes it', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={onSave} onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  await user.type(screen.getByLabelText('Server URL'), 'https://parallang.example.com');
  await user.type(screen.getByLabelText('Access token'), 'secret-token');
  expect(screen.getByLabelText('Access token').type).toBe('password');
  await user.click(screen.getByRole('button', { name: 'Save and connect' }));
  expect(onSave).toHaveBeenCalledWith({ serverUrl: 'https://parallang.example.com', token: 'secret-token' });
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledOnce();
});

test('the gear in the top bar opens the sheet over the dungeon screen', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  useGameStore.setState({ settingsOpen: false, error: null });
  render(<App />);
  await openMenu(user, 'Settings');
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
});

// Round 117: the opacity of the text panels over the level.
test('the opacity slider reports each move as a number and shows the percentage', () => {
  const onPanelOpacity = vi.fn();
  const view = render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={vi.fn()} onClose={vi.fn()} panelOpacity={0.7} onPanelOpacity={onPanelOpacity} />);
  const slider = screen.getByLabelText('Text panel opacity');
  expect(slider.type).toBe('range');
  expect([slider.min, slider.max, slider.step, slider.value]).toEqual(['0', '100', '5', '70']);
  expect(screen.getByText('70%')).toBeTruthy();
  fireEvent.change(slider, { target: { value: '35' } });
  expect(onPanelOpacity).toHaveBeenCalledWith(0.35);
  view.rerender(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={vi.fn()} onClose={vi.fn()} panelOpacity={0.35} onPanelOpacity={onPanelOpacity} />);
  expect(slider.value).toBe('35');
  expect(screen.getByText('35%')).toBeTruthy();
});

test('moving the slider on the dungeon screen sets the panels at once, hides the dock behind the sheet, and saves nothing else', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async () => new Promise(() => {}));
  vi.stubGlobal('fetch', fetchMock);
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7 } });
  const { container } = render(<App />);
  const shell = container.querySelector('.app-shell');
  expect(shell.style.getPropertyValue('--panel-alpha')).toBe('0.7');
  expect(shell.classList.contains('settings-open')).toBe(false);
  await openMenu(user, 'Settings');
  expect(shell.classList.contains('settings-open')).toBe(true);
  const requests = fetchMock.mock.calls.length;
  fireEvent.change(screen.getByLabelText('Text panel opacity'), { target: { value: '30' } });
  expect(shell.style.getPropertyValue('--panel-alpha')).toBe('0.3');
  expect(useGameStore.getState().display).toEqual({ panelOpacity: 0.3, tiltLook: false, voices: true, narrator: true, narratorVoice: 'Algenib', music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: true, strict: false, streamlined: true, follow: true, breathing: true, glitch: false, dev: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(JSON.parse(localStorage.getItem('parallang.display'))).toEqual({ panelOpacity: 0.3, tiltLook: false, voices: true, narrator: true, narratorVoice: 'Algenib', music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: true, strict: false, streamlined: true, follow: true, breathing: true, glitch: false, dev: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  expect(fetchMock.mock.calls.length).toBe(requests);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(shell.classList.contains('settings-open')).toBe(false);
  expect(shell.style.getPropertyValue('--panel-alpha')).toBe('0.3');
  localStorage.removeItem('parallang.display');
});

// Round 118: the build, the viewport's numbers and a reload from inside the page.
test('the sheet names the build and the viewport, reloads on request, and announces a newer build', async () => {
  const user = userEvent.setup();
  const view = { installed: true, window: [393, 787], layoutHeight: 787, unitHeight: 852, screen: [393, 852], gap: 65 };
  const site = { build: '0.1.0+old', latestBuild: vi.fn(async () => '0.1.0+new'), reload: vi.fn(), viewport: () => view };
  render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={vi.fn()} onClose={vi.fn()} site={site} />);
  expect(screen.getByText(/Build 0\.1\.0\+old · installed · window 393×787 · layout 787 · 100vh 852 · screen 393×852 · gap 65/)).toBeTruthy();
  expect((await screen.findByRole('status')).textContent).toContain('A newer build is on the site (0.1.0+new).');
  await user.click(screen.getByRole('button', { name: 'Reload the page' }));
  expect(site.reload).toHaveBeenCalledOnce();
});

test('the same build on the site is not announced, and an unreadable one neither', async () => {
  for (const latest of ['0.1.0+same', null]) {
    const site = { build: '0.1.0+same', latestBuild: vi.fn(async () => latest), reload: vi.fn(), viewport: () => ({ installed: false, window: [1440, 900], layoutHeight: 900, unitHeight: 900, screen: [1440, 900], gap: 0 }) };
    render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={vi.fn()} onClose={vi.fn()} site={site} />);
    await act(async () => { await vi.waitFor(() => expect(site.latestBuild).toHaveBeenCalledOnce()); });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText(/browser tab · window 1440×900/)).toBeTruthy();
    cleanup();
  }
});

// Round 125: tilt to look. Ticking the box is the tap from which the page asks for the phone's orientation.
test('ticking "Tilt to look" asks the browser and reports the choice; unticking does not ask', async () => {
  const user = userEvent.setup();
  const onTiltLook = vi.fn();
  const site = { build: 'b', latestBuild: async () => 'b', reload: vi.fn(), viewport: measureViewport, requestTilt: vi.fn(async () => 'granted') };
  const props = { settings: { serverUrl: '', token: '' }, onSave: vi.fn(), onClose: vi.fn(), onTiltLook, site };
  const view = render(<SettingsSheet {...props} tiltLook={false} />);
  const box = screen.getByLabelText('Tilt to look');
  expect(box.type).toBe('checkbox');
  expect(box.checked).toBe(false);
  await user.click(box);
  expect(site.requestTilt).toHaveBeenCalledOnce();
  expect(onTiltLook).toHaveBeenLastCalledWith(true);
  view.rerender(<SettingsSheet {...props} tiltLook />);
  expect(screen.getByLabelText('Tilt to look').checked).toBe(true);
  expect(screen.queryByText(/refused|no motion sensor/)).toBeNull();
  await user.click(screen.getByLabelText('Tilt to look'));
  expect(onTiltLook).toHaveBeenLastCalledWith(false);
  expect(site.requestTilt).toHaveBeenCalledOnce();
});

test('a refusal, or a device with no sensor to ask, is said under the box', async () => {
  const user = userEvent.setup();
  for (const [answer, text] of [['denied', /refused access/], ['unsupported', /no motion sensor/]]) {
    const site = { build: 'b', latestBuild: async () => 'b', reload: vi.fn(), viewport: measureViewport, requestTilt: vi.fn(async () => answer) };
    const props = { settings: { serverUrl: '', token: '' }, onSave: vi.fn(), onClose: vi.fn(), onTiltLook: vi.fn(), site };
    const view = render(<SettingsSheet {...props} tiltLook={false} />);
    await user.click(screen.getByLabelText('Tilt to look'));
    view.rerender(<SettingsSheet {...props} tiltLook />);
    expect(await screen.findByText(text)).toBeTruthy();
    view.unmount();
  }
});

test('the box on the dungeon screen switches the preference and stores it', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7, tiltLook: false } });
  render(<App />);
  await openMenu(user, 'Settings');
  await user.click(screen.getByLabelText('Tilt to look'));
  expect(useGameStore.getState().display).toEqual({ panelOpacity: 0.7, tiltLook: true, voices: true, narrator: true, narratorVoice: 'Algenib', music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: true, strict: false, streamlined: true, follow: true, breathing: true, glitch: false, dev: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(JSON.parse(localStorage.getItem('parallang.display'))).toEqual({ panelOpacity: 0.7, tiltLook: true, voices: true, narrator: true, narratorVoice: 'Algenib', music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: true, strict: false, streamlined: true, follow: true, breathing: true, glitch: false, dev: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(screen.getByLabelText('Tilt to look').checked).toBe(true);
  await user.click(screen.getByLabelText('Tilt to look'));
  expect(useGameStore.getState().display.tiltLook).toBe(false);
});

// Round 126: character voices, and what this browser can do.
test('"Character voices" reports each switch, and the sheet says when the browser cannot speak or listen', async () => {
  const user = userEvent.setup();
  const onVoices = vi.fn();
  const props = { settings: { serverUrl: '', token: '' }, onSave: vi.fn(), onClose: vi.fn(), onVoices };
  const view = render(<SettingsSheet {...props} voices />);
  const box = screen.getByLabelText('Character voices');
  expect(box.checked).toBe(true);
  expect(screen.getByText(/reads its lines aloud/)).toBeTruthy();
  expect(screen.getByText(/writes what you say\. You send it/)).toBeTruthy();
  await user.click(box);
  expect(onVoices).toHaveBeenLastCalledWith(false);
  view.rerender(<SettingsSheet {...props} voices={false} speechSupport={{ speak: false, listen: false }} />);
  expect(screen.getByLabelText('Character voices').disabled).toBe(true);
  expect(screen.getByText('This browser cannot read aloud.')).toBeTruthy();
  expect(screen.getByText(/cannot listen\. The keyboard's own microphone key/)).toBeTruthy();
});

test('the voices box on the dungeon screen switches the preference and stores it', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  vi.stubGlobal('speechSynthesis', { getVoices: () => [], speak: vi.fn(), cancel: vi.fn() });
  vi.stubGlobal('SpeechSynthesisUtterance', function Utterance(text) { this.text = text; });
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7, tiltLook: false, voices: true } });
  const speech = { speaker: { supported: true, speak: vi.fn(), stop: vi.fn(), prime: vi.fn(), available: () => true }, listener: { supported: false, start: vi.fn(), stop: vi.fn() } };
  const { default: DungeonScreen } = await import('../DungeonScreen.jsx');
  render(<DungeonScreen useStore={useGameStore} speech={speech} />);
  await openMenu(user, 'Settings');
  expect(speech.speaker.prime).toHaveBeenCalledOnce(); // the first tap on the page
  await user.click(screen.getByLabelText('Character voices'));
  expect(useGameStore.getState().display).toEqual({ panelOpacity: 0.7, tiltLook: false, voices: false, narrator: true, narratorVoice: 'Algenib', music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: true, strict: false, streamlined: true, follow: true, breathing: true, glitch: false, dev: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(JSON.parse(localStorage.getItem('parallang.display')).voices).toBe(false);
  await user.click(screen.getByLabelText('Character voices'));
  expect(useGameStore.getState().display.voices).toBe(true);
});

// Round 127: the ambient music. It starts at the first tap, gives way to speech, and has a switch in Settings.
test('the music starts at the first tap and not before, follows speech, and the Settings box stops and starts it', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7, tiltLook: false, voices: true, narrator: true, narratorVoice: 'Algenib', music: true } });
  const speech = { speaker: { supported: true, speaking: false, speak: vi.fn(), stop: vi.fn(), prime: vi.fn(), available: () => true }, listener: { supported: true, listening: false, start: vi.fn(), stop: vi.fn() } };
  // Round 184: every touch or key reaches the ambience: the first starts it, later ones only wake it (resume).
  const ambience = { supported: true, running: false, start: vi.fn(() => { ambience.running = true; }), resume: vi.fn(), stop: vi.fn(() => { ambience.running = false; }), setLevel: vi.fn(), setVolumes: vi.fn() };
  const { default: DungeonScreen } = await import('../DungeonScreen.jsx');
  try {
    render(<DungeonScreen useStore={useGameStore} speech={speech} ambience={ambience} />);
    expect(ambience.start).not.toHaveBeenCalled(); // a page may not make sound on its own
    await openMenu(user, 'Settings');
    expect(ambience.start).toHaveBeenCalledOnce();
    expect(ambience.resume).toHaveBeenCalled(); // the same tap's later events (pointerup, then click)
    // Every 400 ms the music is told whether the browser is speaking or listening.
    act(() => { vi.advanceTimersByTime(450); });
    expect(ambience.setLevel).toHaveBeenLastCalledWith('full');
    speech.speaker.speaking = true;
    act(() => { vi.advanceTimersByTime(400); });
    expect(ambience.setLevel).toHaveBeenLastCalledWith('duck');
    speech.listener.listening = true;
    act(() => { vi.advanceTimersByTime(400); });
    expect(ambience.setLevel).toHaveBeenLastCalledWith('mute');
    // The box.
    const box = screen.getByLabelText('Ambient music');
    expect(box.checked).toBe(true);
    // Round 172: off silences the music's bus; the effects (the rain) go on, so the ambience keeps running.
    await user.click(box);
    expect(ambience.stop).not.toHaveBeenCalled();
    expect(ambience.setVolumes).toHaveBeenLastCalledWith({ master: 1, music: 0, effects: 1 }, expect.anything());
    expect(useGameStore.getState().display.music).toBe(false);
    expect(JSON.parse(localStorage.getItem('parallang.display')).music).toBe(false);
    await user.click(screen.getByLabelText('Ambient music'));
    expect(ambience.start).toHaveBeenCalledTimes(2); // the tick is the tap
    expect(ambience.setVolumes).toHaveBeenLastCalledWith({ master: 1, music: 1, effects: 1 }, expect.anything());
    expect(useGameStore.getState().display.music).toBe(true);
    // The Audio sliders: each is stored; Master and Effects at 0 with the music off leave nothing to hear.
    fireEvent.change(screen.getByLabelText('Effects volume'), { target: { value: '25' } });
    expect(useGameStore.getState().display.volume).toEqual({ master: 1, music: 1, effects: 0.25, voice: 1 });
    expect(ambience.setVolumes).toHaveBeenLastCalledWith({ master: 1, music: 1, effects: 0.25 }, expect.anything());
    fireEvent.change(screen.getByLabelText('Voice volume'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Master volume'), { target: { value: '80' } });
    expect(speech.speaker.volume).toBeCloseTo(0.4);
    expect(JSON.parse(localStorage.getItem('parallang.display')).volume).toEqual({ master: 0.8, music: 1, effects: 0.25, voice: 0.5 });
    fireEvent.change(screen.getByLabelText('Master volume'), { target: { value: '0' } });
    expect(ambience.stop).toHaveBeenCalledOnce();
    const calls = ambience.setLevel.mock.calls.length;
    act(() => { vi.advanceTimersByTime(1000); });
    expect(ambience.setLevel.mock.calls.length).toBe(calls); // silent: nobody is watching
  } finally { vi.useRealTimers(); }
});

// Round 172: the sheet's categories, and the four Audio sliders.
test('the sheet is in categories, and Audio holds the Master, Music, Effects and Voice sliders', () => {
  const onVolume = vi.fn();
  const { container } = render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={vi.fn()} onClose={vi.fn()} music onMusic={vi.fn()} voices onVoices={vi.fn()}
    volume={{ master: 1, music: 0.5, effects: 0.3, voice: 1 }} onVolume={onVolume} panelOpacity={0.7} onPanelOpacity={vi.fn()} onBeginner={vi.fn()} />);
  expect([...container.querySelectorAll('.settings-group summary')].map((n) => n.textContent)).toEqual(['Audio', 'Language and learning', 'Display and controls', 'Connection', 'This build']);
  const audio = container.querySelector('.settings-group');
  expect(audio.open).toBe(true);
  expect([...audio.querySelectorAll('input[type=range]')].map((n) => n.id)).toEqual(['settings-volume-master', 'settings-volume-music', 'settings-volume-effects', 'settings-volume-voice']);
  expect(screen.getByLabelText('Effects volume').value).toBe('30');
  expect(screen.getByText(/Rain, thunder/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Music volume'), { target: { value: '15' } });
  expect(onVolume).toHaveBeenCalledWith('music', 0.15);
});

test('Settings says when the browser cannot play the music', () => {
  render(<SettingsSheet settings={{ serverUrl: '', token: '' }} onSave={vi.fn()} onClose={vi.fn()} music onMusic={vi.fn()} musicSupported={false} />);
  expect(screen.getByLabelText('Ambient music').disabled).toBe(true);
  expect(screen.getByText('This browser cannot play it.')).toBeTruthy();
});

// Round 129: beginner mode.
test('"Beginner mode" is ticked by default, says what it does, and the box on the screen stores the choice', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7, tiltLook: false, voices: true, narrator: true, narratorVoice: 'Algenib', music: false, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false } });
  render(<App />);
  await openMenu(user, 'Settings');
  const box = screen.getByLabelText('Beginner mode');
  expect(box.checked).toBe(true);
  expect(screen.getByText(/corrected for you and costs one heart; you move on/)).toBeTruthy();
  await user.click(box);
  expect(useGameStore.getState().display.beginner).toBe(false);
  expect(JSON.parse(localStorage.getItem('parallang.display')).beginner).toBe(false);
  await user.click(screen.getByLabelText('Beginner mode'));
  expect(useGameStore.getState().display.beginner).toBe(true);
});

// Round 153 (issue #1): strict or light checking.
test('"How answers are checked" is Strict unless Light is picked; the choice is stored and Beginner mode steps back', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7, tiltLook: false, voices: true, narrator: true, narratorVoice: 'Algenib', music: false, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false }, language: { code: 'it', name: 'Italian', tag: 'it-IT' } });
  render(<App />);
  await openMenu(user, 'Settings');
  expect(screen.getByRole('group', { name: 'How answers are checked' })).toBeTruthy();
  expect(screen.getByRole('radio', { name: 'Strict' }).checked).toBe(true);
  expect(screen.getByText(/Strict: each answer is marked against what the conversation asks for/)).toBeTruthy();
  await user.click(screen.getByRole('radio', { name: 'Light' }));
  expect(useGameStore.getState().display.light).toBe(true);
  expect(JSON.parse(localStorage.getItem('parallang.display')).light).toBe(true);
  expect(screen.getByText(/Light: nothing is marked\. The character works out what you meant, you are shown it in Italian/)).toBeTruthy();
  expect(screen.getByLabelText('Beginner mode').disabled).toBe(true);
  await user.click(screen.getByRole('radio', { name: 'Strict' }));
  expect(useGameStore.getState().display.light).toBe(false);
  expect(screen.getByLabelText('Beginner mode').disabled).toBe(false);
});

// Round 195: the tree models are always on; Settings has no switch for them, and an old stored choice is dropped.
test('Settings has no "Tree models" switch, and a stored treeModels is not kept', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn(async () => new Promise(() => {})));
  localStorage.setItem('parallang.display', JSON.stringify({ panelOpacity: 0.7, treeModels: false }));
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7 } });
  render(<App />);
  await openMenu(user, 'Settings');
  expect(screen.queryByLabelText('Tree models')).toBeNull();
  await user.click(screen.getByLabelText('Tilt to look'));
  expect(JSON.parse(localStorage.getItem('parallang.display'))).not.toHaveProperty('treeModels');
});

// Round 148: the slider for how much of the language the characters speak.
// Round 177: the share follows the learner's level by default; moving the slider chooses one and turns that off.
test('the language share follows my level by default; the slider chooses a share and stores it without reconnecting', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn(async () => new Promise(() => {}));
  vi.stubGlobal('fetch', fetchMock);
  useGameStore.setState({ settingsOpen: false, error: null, display: { panelOpacity: 0.7 }, language: { code: 'it', name: 'Italian', tag: 'it-IT' } });
  render(<App />);
  await openMenu(user, 'Settings');
  const auto = screen.getByLabelText('Follow my level');
  expect(auto.checked).toBe(true);
  expect(screen.getByText(/Following your level: a beginner hears mostly English with Italian woven in/)).toBeTruthy();
  const slider = screen.getByLabelText('How much Italian the characters speak');
  expect([slider.min, slider.max, slider.step]).toEqual(['10', '100', '10']);
  const requests = fetchMock.mock.calls.length;
  fireEvent.change(slider, { target: { value: '60' } });
  expect(useGameStore.getState().display.immersion).toBe(0.6);
  expect(useGameStore.getState().display.immersionAuto).toBe(false);
  expect(JSON.parse(localStorage.getItem('parallang.display')).immersion).toBe(0.6);
  expect(screen.getByText(/About 60% of each line is in Italian and the rest in English\./)).toBeTruthy();
  expect(slider.getAttribute('aria-valuetext')).toBe('60%');
  expect(fetchMock.mock.calls.length).toBe(requests);
  fireEvent.change(slider, { target: { value: '100' } });
  expect(screen.getByText(/Every line a character speaks is in Italian\. Its translation shows under it/)).toBeTruthy();
  await user.click(screen.getByLabelText('Follow my level'));
  expect(useGameStore.getState().display.immersionAuto).toBe(true);
});
