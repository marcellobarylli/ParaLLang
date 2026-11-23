// Round 173: the top bar's menu holds Settings, the Spellbook, the party, the guidebook and the ways out. A module,
// not a test file.
import { screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';

/** Opens the game menu and picks `item` (a name or a pattern) in it. */
export async function openMenu(user, item) {
  await user.click(screen.getByRole('button', { name: /^Menu/ }));
  await user.click(within(screen.getByRole('navigation', { name: 'Game menu' })).getByRole('button', { name: item }));
}
/** From the title screen to the world map of the other places (Ta Prohm, The Kiln). */
export const toPlaces = (user) => openMenu(user, /^Other places/);
/** Waits on the title screen until the server has answered (the learner and the language are in). */
export const titleReady = () => waitFor(() => expect(document.querySelector('.title-screen[data-connection="ready"]')).toBeTruthy());
