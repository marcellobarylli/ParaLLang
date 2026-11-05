// Round 051 (backlog H1): a held result (passed, but an earlier objective comes first) shows "…" and asks the player
// to say it again; passed and failed results keep ✓ and →.
import { render, screen } from '@testing-library/react-native';
import DialoguePanel, { HELD_SUFFIX, resultMark } from '../components/DialoguePanel.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const encounter = {
  encounterId: 'cracked_fountain_letharger', state: 'ongoing', character: { name: 'Flick', saveable: true },
  transcript: [], hints: { remaining: 2, limit: 2 }, difficulty: 0.5,
  currentObjective: { id: 'time', prompt: 'Tell Flick what time it is, in Italian.' },
};

test('marks: held …, passed ✓, failed →', () => {
  expect(resultMark({ passed: true, held: true })).toBe('…');
  expect(resultMark({ passed: true })).toBe('✓');
  expect(resultMark({ passed: false })).toBe('→');
});

test('the Assessment panel shows a held result as not done and asks to say it again', async () => {
  const assessment = {
    overallFeedback: 'Tell Flick the time first.',
    objectiveResults: [
      { objectiveId: 'time', passed: false, feedback: 'You still need to say what time it is.' },
      { objectiveId: 'now', passed: true, held: true, feedback: 'Say now again once the time is told.' },
    ],
  };
  await render(<DialoguePanel encounter={encounter} language={language} isLoading={false} assessment={assessment} onHelp={() => {}} />);
  expect(screen.getByText('→ You still need to say what time it is.')).toBeOnTheScreen();
  expect(screen.getByText(`… Say now again once the time is told.${HELD_SUFFIX}`)).toBeOnTheScreen();
  expect(screen.queryByText(/^✓/)).not.toBeOnTheScreen();
  expect(HELD_SUFFIX).toBe(' (say it again after the earlier objective)');
});
