// Round 014: The Rift is sealed on the map until the other encounters are complete.
import { render, screen } from '@testing-library/react-native';
import MapPanel from '../components/MapPanel.js';

const bookshop = { id: 'old_bookshop', name: 'The Old Bookshop', state: 'current', adjacent: false, map: { x: 0.5, y: 0.3 }, description: 'Books.', vocabularyFocus: ['reading'], encounter: { id: 'old_bookshop_bookworm', completed: false, characterName: 'Marginalia' } };
const rift = (gate) => ({ id: 'the_rift', name: 'The Rift', state: 'known', adjacent: true, map: { x: 0.72, y: 0.08 }, gate });
const worldWith = (gate) => ({ currentLocationId: 'old_bookshop', locations: [bookshop, rift(gate)], paths: [['old_bookshop', 'the_rift']] });

test('a sealed Rift is disabled even when adjacent and shows its progress', async () => {
  await render(<MapPanel world={worldWith({ sealed: true, required: 5, completed: 4 })} isLoading={false} onMove={jest.fn()} onEnterEncounter={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'The Rift, sealed: 4 of 5 encounters complete' })).toBeDisabled();
  expect(screen.getByText('Sealed 4/5')).toBeOnTheScreen();
});

test('an open Rift can be walked to like any neighbour', async () => {
  await render(<MapPanel world={worldWith({ sealed: false, required: 5, completed: 5 })} isLoading={false} onMove={jest.fn()} onEnterEncounter={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Walk to The Rift, unexplored' })).toBeEnabled();
  expect(screen.queryByText(/Sealed/)).toBeNull();
});
