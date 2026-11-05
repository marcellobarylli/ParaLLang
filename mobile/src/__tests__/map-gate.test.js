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

// Round 034 (critique 1.3): map nodes you cannot walk to are not faded; their labels are muted instead.
test('map labels stay at full opacity; unreachable ones are muted, the current one is ink', async () => {
  const { StyleSheet } = require('react-native');
  const { colors } = require('../components/ui.js');
  await render(<MapPanel world={worldWith({ sealed: true, required: 5, completed: 4 })} isLoading={false} onMove={jest.fn()} onEnterEncounter={jest.fn()} />);
  const sealed = screen.getByRole('button', { name: 'The Rift, sealed: 4 of 5 encounters complete' });
  const here = screen.getByRole('button', { name: /The Old Bookshop/ });
  for (const node of [sealed, here]) expect(StyleSheet.flatten(node.props.style).opacity).toBeUndefined();
  expect(StyleSheet.flatten(screen.getByText(/The Rift$/).props.style).color).toBe(colors.muted);
  expect(StyleSheet.flatten(screen.getAllByText('The Old Bookshop')[0].props.style).color).toBe(colors.ink);
});
