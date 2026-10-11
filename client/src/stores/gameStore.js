import { create } from 'zustand';
import { learningApi } from '../api/encounter.js';

const LEARNER_KEY = 'parallang.learnerId';
const emptySpellbook = { cards: [], dueCount: 0, contentVersion: null };
const attemptId = () => globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.random()}`;

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

export function createGameStore({ api = learningApi, storage = browserStorage() } = {}) {
  let initializationPromise = null;
  let requestEpoch = 0;
  const snapshots = new Map();

  return create((set, get) => ({
    learnerId: null,
    encounter: null,
    spellbook: emptySpellbook,
    snapshotsByLearner: snapshots,
    view: 'dialogue',
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
          const storedId = storage?.getItem?.(LEARNER_KEY) || null;
          const identity = await api.createLearner(storedId);
          if (epoch !== requestEpoch) return;
          storage?.setItem?.(LEARNER_KEY, identity.learnerId);
          const started = await api.startEncounter(identity.learnerId, false);
          if (epoch !== requestEpoch) return;
          snapshots.set(identity.learnerId, { encounter: started.encounter, spellbook: started.spellbook });
          set({ learnerId: identity.learnerId, encounter: started.encounter, spellbook: started.spellbook, isLoading: false });
        } catch (error) {
          if (epoch === requestEpoch) set({ error: error.message, isLoading: false });
          initializationPromise = null;
        }
      })();
      return initializationPromise;
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

    openSpellbook: () => set({ view: 'spellbook', reviewChallenge: null, reviewResult: null, error: null }),
    returnToDialogue: () => set({ view: 'dialogue', reviewChallenge: null, reviewResult: null, error: null }),

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
