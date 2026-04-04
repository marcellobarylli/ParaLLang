import { create } from 'zustand';
import { startEncounter as apiStart, sendDialogue as apiSend } from '../api/encounter.js';

export const useGameStore = create((set, get) => ({
  messages: [],
  encounterState: 'idle', // idle | active | resolved
  isLoading: false,
  error: null,

  startEncounter: async () => {
    set({ isLoading: true, error: null, messages: [], encounterState: 'active' });
    try {
      const response = await apiStart();
      set({
        messages: [{ role: 'npc', data: response }],
        isLoading: false,
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  sendMessage: async (text) => {
    const { messages, encounterState } = get();
    if (encounterState !== 'active') return;

    set({
      messages: [...messages, { role: 'player', text }],
      isLoading: true,
      error: null,
    });

    try {
      const response = await apiSend(text);
      set((state) => ({
        messages: [...state.messages, { role: 'npc', data: response }],
        isLoading: false,
        encounterState: response.encounter_state === 'resolved' ? 'resolved' : 'active',
      }));
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
