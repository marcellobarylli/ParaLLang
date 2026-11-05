import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { learningApi } from '../api/learning.js';

const LEARNER_KEY = 'parallang.learnerId';
const emptySpellbook = { cards: [], dueCount: 0, contentVersion: null };
const attemptId = () => globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.random()}`;

// Ported from client/src/stores/gameStore.js (round 004). Storage is async (AsyncStorage) and the store keeps the
// server's target language; the request-epoch, snapshot and retained-draft behaviour is the web store's.
export function createGameStore({ api = learningApi, storage = AsyncStorage } = {}) {
  let initializationPromise = null;
  let requestEpoch = 0;
  const snapshots = new Map();

  return create((set, get) => ({
    learnerId: null,
    language: null,
    encounter: null,
    world: null,
    spellbook: emptySpellbook,
    snapshotsByLearner: snapshots,
    view: 'map',
    returnView: 'map',
    reviewChallenge: null,
    reviewResult: null,
    assessment: null,
    draft: '',
    pendingInput: null,
    isLoading: false,
    error: null,

    setDraft: (draft) => set({ draft }),
    clearError: () => set({ error: null }),

    initialize: () => {
      if (initializationPromise) return initializationPromise;
      const epoch = ++requestEpoch;
      initializationPromise = (async () => {
        set({ isLoading: true, error: null });
        try {
          const storedId = (await storage?.getItem?.(LEARNER_KEY)) || null;
          const identity = await api.createLearner(storedId);
          if (epoch !== requestEpoch) return;
          await storage?.setItem?.(LEARNER_KEY, identity.learnerId);
          const [{ world }, spellbook] = await Promise.all([api.getWorld(identity.learnerId), api.getSpellbook(identity.learnerId)]);
          if (epoch !== requestEpoch) return;
          snapshots.set(identity.learnerId, { encounter: null, spellbook });
          set({ learnerId: identity.learnerId, language: identity.language ?? null, world, spellbook, isLoading: false });
        } catch (error) {
          if (epoch === requestEpoch) set({ error: error.message, isLoading: false });
          initializationPromise = null;
        }
      })();
      return initializationPromise;
    },

    // Round 005: the app opens on the Crumbling Market map; encounters are entered from their location.
    moveTo: async (locationId) => {
      const { learnerId, isLoading } = get();
      if (!learnerId || isLoading) return;
      set({ isLoading: true, error: null });
      try {
        const { world } = await api.moveTo(learnerId, locationId);
        if (get().learnerId !== learnerId) return;
        set({ world, isLoading: false });
      } catch (error) { set({ error: error.message, isLoading: false }); }
    },

    enterEncounter: async () => {
      const { learnerId, isLoading } = get();
      if (!learnerId || isLoading) return;
      const epoch = requestEpoch;
      set({ isLoading: true, error: null });
      try {
        const started = await api.startEncounter(learnerId, false);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        snapshots.set(learnerId, { encounter: started.encounter, spellbook: started.spellbook });
        set({ encounter: started.encounter, spellbook: started.spellbook, isLoading: false, view: 'dialogue' });
      } catch (error) { set({ error: error.message, isLoading: false }); }
    },

    openMap: async () => {
      const { learnerId } = get();
      set({ view: 'map', reviewChallenge: null, reviewResult: null, error: null });
      if (!learnerId) return;
      try {
        const { world } = await api.getWorld(learnerId);
        if (get().learnerId === learnerId) set({ world });
      } catch (error) { set({ error: error.message }); }
    },

    restartEncounter: async () => {
      const { learnerId } = get();
      if (!learnerId) return;
      const epoch = requestEpoch;
      set({ isLoading: true, error: null, assessment: null });
      try {
        const result = await api.startEncounter(learnerId, true);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        snapshots.set(learnerId, result);
        set({ encounter: result.encounter, spellbook: result.spellbook, isLoading: false, draft: '', pendingInput: null, view: 'dialogue' });
      } catch (error) { set({ error: error.message, isLoading: false }); }
    },

    sendMessage: async (providedText) => {
      const state = get();
      const text = String(providedText ?? state.draft).trim();
      if (!text || !state.learnerId || !state.encounter || state.encounter.state !== 'ongoing' || state.isLoading) return;
      const learnerId = state.learnerId;
      const encounterId = state.encounter.id;
      const version = state.encounter.version;
      const epoch = requestEpoch;
      set({ isLoading: true, error: null, pendingInput: text, draft: text });
      try {
        const result = await api.sendDialogue(learnerId, { encounterId, version, attemptId: attemptId(), message: text });
        if (epoch !== requestEpoch || get().learnerId !== learnerId || get().encounter?.version !== version) return;
        snapshots.set(learnerId, { encounter: result.encounter, spellbook: result.spellbook });
        set({ encounter: result.encounter, spellbook: result.spellbook, assessment: result.assessment, isLoading: false, pendingInput: null, draft: '' });
        if (result.encounter.state === 'resolved') {
          try {
            const { world } = await api.getWorld(learnerId);
            if (get().learnerId === learnerId) set({ world });
          } catch { /* the map refreshes again when it is opened */ }
        }
      } catch (error) {
        if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false, pendingInput: text, draft: text });
      }
    },

    revealHelp: async ({ kind, messageId, vocabularyId }) => {
      const { learnerId, encounter, isLoading } = get();
      if (!learnerId || !encounter || isLoading) return;
      const version = encounter.version;
      set({ isLoading: true, error: null });
      try {
        const result = await api.revealHelp(learnerId, { encounterId: encounter.id, version, kind, messageId, vocabularyId });
        if (get().learnerId !== learnerId || get().encounter?.version !== version) return;
        snapshots.set(learnerId, { encounter: result.encounter, spellbook: result.spellbook });
        set({ encounter: result.encounter, spellbook: result.spellbook, isLoading: false });
      } catch (error) { set({ error: error.message, isLoading: false }); }
    },

    // The Spellbook and review return to the screen they were opened from (the map or the encounter).
    openSpellbook: () => set((state) => ({
      view: 'spellbook', returnView: ['map', 'dialogue'].includes(state.view) ? state.view : state.returnView,
      reviewChallenge: null, reviewResult: null, error: null,
    })),
    returnToDialogue: () => set((state) => ({
      view: state.returnView === 'dialogue' && state.encounter ? 'dialogue' : 'map', reviewChallenge: null, reviewResult: null, error: null,
    })),

    startReview: async (vocabularyId) => {
      const { learnerId } = get();
      if (!learnerId) return;
      set({ isLoading: true, error: null, reviewResult: null });
      try {
        const result = await api.createReview(learnerId, vocabularyId);
        set({ reviewChallenge: result.challenge, spellbook: result.spellbook, view: result.challenge ? 'review' : 'spellbook', isLoading: false });
      } catch (error) { set({ error: error.message, isLoading: false }); }
    },

    submitReview: async (answer) => {
      const { learnerId, reviewChallenge, isLoading } = get();
      if (!learnerId || !reviewChallenge || isLoading || !String(answer).trim()) return;
      set({ isLoading: true, error: null });
      try {
        const result = await api.submitReview(learnerId, { challengeId: reviewChallenge.id, attemptId: attemptId(), action: 'answer', answer: String(answer).trim() });
        set({ reviewResult: result.result, spellbook: result.spellbook, reviewChallenge: null, isLoading: false });
      } catch (error) { set({ error: error.message, isLoading: false }); }
    },

    revealReviewAnswer: async () => {
      const { learnerId, reviewChallenge, isLoading } = get();
      if (!learnerId || !reviewChallenge || isLoading) return;
      set({ isLoading: true, error: null });
      try {
        const result = await api.submitReview(learnerId, { challengeId: reviewChallenge.id, attemptId: attemptId(), action: 'reveal', answer: '' });
        set({ reviewResult: result.result, spellbook: result.spellbook, reviewChallenge: null, isLoading: false });
      } catch (error) { set({ error: error.message, isLoading: false }); }
    },

    switchLearnerForTest: (learnerId) => {
      requestEpoch += 1;
      initializationPromise = null;
      const snapshot = snapshots.get(learnerId) ?? { encounter: null, spellbook: emptySpellbook };
      set({ learnerId, ...snapshot, draft: '', pendingInput: null, assessment: null });
    },
  }));
}

export const useGameStore = createGameStore();
