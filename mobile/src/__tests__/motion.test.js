// Round 035 (backlog C3b): fades respect Reduce Motion; lines already shown do not fade; text is there at once.
import { AccessibilityInfo, Animated, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { FADE_MS, FadeIn, resetReduceMotionForTests, useReduceMotion } from '../motion.js';
import DialoguePanel from '../components/DialoguePanel.js';

let changed;
let removed;
const setting = (value) => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => (value instanceof Error ? Promise.reject(value) : Promise.resolve(value)));
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((name, handler) => { changed = handler; return { remove: () => { removed = true; } }; });
};
const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => { resetReduceMotionForTests(); jest.restoreAllMocks(); changed = null; removed = false; });

function Probe() { return <Text>{useReduceMotion() ? 'reduced' : 'moving'}</Text>; }

test('the setting follows the system, and a failed read stays reduced', async () => {
  setting(false);
  await render(<Probe />);
  await settle();
  expect(screen.getByText('moving')).toBeOnTheScreen();
  await act(async () => changed(true));
  expect(screen.getByText('reduced')).toBeOnTheScreen();

  resetReduceMotionForTests();
  setting(new Error('no setting'));
  await screen.unmount();
  await render(<Probe />);
  await settle();
  expect(screen.getByText('reduced')).toBeOnTheScreen();
});

// Mounts a probe first, so the app-wide setting is known before FadeIn mounts (FadeIn decides once, at mount).
async function known(value, tree) {
  setting(value);
  await render(<Probe />);
  await settle();
  await screen.unmount();
  await render(<><Probe />{tree}</>);
}

test('FadeIn animates once motion is known to be allowed, and never under Reduce Motion', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  await known(true, <FadeIn><Text>Ciao</Text></FadeIn>);
  expect(screen.getByText('Ciao')).toBeOnTheScreen();
  expect(timing).not.toHaveBeenCalled();
  await screen.unmount();

  resetReduceMotionForTests();
  await known(false, <><FadeIn><Text>Ciao</Text></FadeIn><FadeIn animate={false}><Text>Salve</Text></FadeIn></>);
  expect(screen.getByText('Ciao')).toBeOnTheScreen();
  expect(screen.getByText('Salve')).toBeOnTheScreen();
  expect(timing).toHaveBeenCalledTimes(1);
  expect(timing.mock.calls[0][1]).toEqual({ toValue: 1, duration: FADE_MS, useNativeDriver: true });
  await screen.unmount();
  expect(removed).toBe(false); // the app-wide system listener stays; only the hook's own listener goes
});

test('before the setting is known nothing fades', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => new Promise(() => {}));
  await render(<FadeIn><Text>Ciao</Text></FadeIn>);
  expect(screen.getByText('Ciao')).toBeOnTheScreen();
  expect(timing).not.toHaveBeenCalled();
});

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const npc = (id, text) => ({ id, role: 'npc', narrative: 'Steam rises.', dialogue: { speaker: 'Gerald', native: text, translation: text, words: [] } });
const encounter = (id, transcript) => ({
  id, encounterId: 'imp_coffee_greeting', version: transcript.length, state: 'ongoing', character: { name: 'Gerald' }, transcript,
  hints: { remaining: 2, limit: 2 }, difficulty: 0.25, currentObjective: { id: 'order', prompt: 'Order a coffee.' },
});

test('the dialogue fades in new lines and a new assessment only, and resets for another session', async () => {
  const timing = jest.spyOn(Animated, 'timing');
  const panel = (value, assessment = null) => <DialoguePanel encounter={value} language={language} isLoading={false} assessment={assessment} />;
  await known(false, panel(encounter('s1', [npc('a', 'Buongiorno.')])));
  expect(screen.getAllByText('Buongiorno.').length).toBeGreaterThan(0);
  expect(timing).not.toHaveBeenCalled();
  const graded = (feedback) => ({ overallFeedback: feedback, objectiveResults: [{ objectiveId: 'order', passed: false, feedback }] });
  const two = encounter('s1', [npc('a', 'Buongiorno.'), { id: 'b', role: 'player', text: 'Un caffè.' }]);
  await screen.rerender(<><Probe />{panel(two, graded('Close.'))}</>);
  expect(screen.getByText('Un caffè.')).toBeOnTheScreen();
  expect(timing).toHaveBeenCalledTimes(2); // the new line and the assessment
  timing.mockClear();
  await screen.rerender(<><Probe />{panel(two, graded('Closer.'))}</>);
  expect(timing).toHaveBeenCalledTimes(1); // a changed assessment fades again; the line does not
  timing.mockClear();
  await screen.rerender(<><Probe />{panel(encounter('s2', [npc('c', 'Ancora tu?'), { id: 'd', role: 'player', text: 'Sì.' }]))}</>);
  expect(screen.getByText('Sì.')).toBeOnTheScreen();
  expect(timing).not.toHaveBeenCalled();
});
