import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { learningApi } from '../api/learning.js';
import { MAX_SAVES, SLOTS_KEY, parseSlots, withActive } from './saveSlots.js';

const LEARNER_KEY = 'parallang.learnerId';
// Round 027: set once the player has entered the market from the philosophy statement (per device).
export const ONBOARDING_KEY = 'parallang.onboardingSeen';
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
    onboarding: null,
    party: [],
    notice: null,
    spellbook: emptySpellbook,
    saves: [], // Round 031: the device's save slots ({ learnerId, label, createdAt }), active one = learnerId
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
          // Round 027: the statement is fetched beside startup, never inside it: a failure only skips the screen.
          const seen = await Promise.resolve(storage?.getItem?.(ONBOARDING_KEY)).catch(() => null);
          const onboardingPromise = seen ? Promise.resolve(null)
            : Promise.resolve().then(() => api.getOnboarding()).then((data) => data?.onboarding ?? null, () => null);
          // Round 031: the active save slot's id; without a valid slot record, the legacy key's (round 004).
          const record = parseSlots(await Promise.resolve(storage?.getItem?.(SLOTS_KEY)).catch(() => null));
          const storedId = record?.activeId ?? ((await storage?.getItem?.(LEARNER_KEY)) || null);
          const identity = await api.createLearner(storedId);
          if (epoch !== requestEpoch) return;
          const slots = withActive(record, identity.learnerId);
          await storage?.setItem?.(LEARNER_KEY, identity.learnerId);
          await storage?.setItem?.(SLOTS_KEY, JSON.stringify(slots));
          const [{ world }, spellbook, { party }] = await Promise.all([
            api.getWorld(identity.learnerId), api.getSpellbook(identity.learnerId), api.getParty(identity.learnerId),
          ]);
          const onboarding = await onboardingPromise;
          if (epoch !== requestEpoch) return;
          snapshots.set(identity.learnerId, { encounter: null, spellbook });
          // Shown only over the map: a screen the player opened during startup is not replaced (the flag stays unset).
          const showOnboarding = Boolean(onboarding) && get().view === 'map';
          set({
            learnerId: identity.learnerId, language: identity.language ?? null, world, spellbook, party, isLoading: false,
            saves: slots.slots,
            ...(showOnboarding ? { onboarding, view: 'onboarding' } : {}),
          });
        } catch (error) {
          if (epoch === requestEpoch) set({ error: error.message, isLoading: false });
          initializationPromise = null;
        }
      })();
      return initializationPromise;
    },

    // Round 027: leaving the statement always lands on the map, never in a dialogue (returnView is left as 'map').
    // The view changes first, so a failed flag write cannot keep the player on the statement.
    finishOnboarding: async () => {
      set({ view: 'map', onboarding: null });
      try { await storage?.setItem?.(ONBOARDING_KEY, '1'); } catch { /* shown again next launch */ }
    },

    // Round 005: the app opens on the Crumbling Market map; encounters are entered from their location.
    moveTo: async (locationId) => {
      const { learnerId, isLoading } = get();
      if (!learnerId || isLoading) return;
      set({ isLoading: true, error: null });
      const epoch = requestEpoch;
      try {
        const { world } = await api.moveTo(learnerId, locationId);
        if (get().learnerId !== learnerId) return;
        set({ world, isLoading: false });
      } catch (error) { if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false }); }
    },

    // Enters the encounter at the current location. A different session than the one held starts clean.
    enterEncounter: () => {
      const { world } = get();
      return get()._startNamed(world?.locations.find((location) => location.id === world.currentLocationId)?.encounter?.id ?? null);
    },

    // Round 022: a party member's conversation starts from the Party screen, wherever the player is.
    talkTo: (encounterId) => (typeof encounterId === 'string' ? get()._startNamed(encounterId) : undefined),

    _startNamed: async (encounterId) => {
      const { learnerId, isLoading } = get();
      if (!learnerId || isLoading) return;
      const epoch = requestEpoch;
      set({ isLoading: true, error: null });
      try {
        const started = await api.startEncounter(learnerId, false, encounterId);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        snapshots.set(learnerId, { encounter: started.encounter, spellbook: started.spellbook });
        const fresh = started.encounter.id !== get().encounter?.id;
        set({
          encounter: started.encounter, spellbook: started.spellbook, isLoading: false, view: 'dialogue',
          ...(fresh ? { assessment: null, draft: '', pendingInput: null } : {}),
        });
      } catch (error) { if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false }); }
    },

    openMap: async () => {
      const { learnerId } = get();
      set({ view: 'map', reviewChallenge: null, reviewResult: null, error: null, notice: null });
      if (!learnerId) return;
      try {
        const { world } = await api.getWorld(learnerId);
        if (get().learnerId === learnerId) set({ world });
      } catch (error) { if (get().learnerId === learnerId) set({ error: error.message }); }
    },

    // Round 021: a defeated, saveable NPC joins the party (from the resolved encounter or the map). Leaving writes
    // nothing, so the invitation stays open on the map.
    recruit: async (encounterId) => {
      const { learnerId, isLoading } = get();
      if (!learnerId || isLoading || !encounterId) return;
      const epoch = requestEpoch;
      set({ isLoading: true, error: null, notice: null });
      try {
        const { party, joined } = await api.recruit(learnerId, encounterId);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        const member = party.find((candidate) => candidate.encounterId === encounterId);
        set({ party, isLoading: false, notice: joined && member ? `${member.name} joined your party.` : null });
      } catch (error) {
        if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false });
      }
    },

    openParty: () => set((state) => ({
      view: 'party', returnView: ['map', 'dialogue'].includes(state.view) ? state.view : state.returnView,
      reviewChallenge: null, reviewResult: null, error: null,
    })),

    restartEncounter: async () => {
      const { learnerId } = get();
      if (!learnerId) return;
      const epoch = requestEpoch;
      set({ isLoading: true, error: null, assessment: null });
      try {
        const result = await api.startEncounter(learnerId, true, get().encounter?.encounterId ?? null);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        snapshots.set(learnerId, result);
        set({ encounter: result.encounter, spellbook: result.spellbook, isLoading: false, draft: '', pendingInput: null, view: 'dialogue' });
      } catch (error) { if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false }); }
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
            // Round 022: a resolved party conversation raises the member's count, so the party is refreshed too.
            const [{ world }, { party }] = await Promise.all([api.getWorld(learnerId), api.getParty(learnerId)]);
            if (get().learnerId === learnerId) set({ world, party });
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
      const epoch = requestEpoch;
      try {
        const result = await api.revealHelp(learnerId, { encounterId: encounter.id, version, kind, messageId, vocabularyId });
        if (get().learnerId !== learnerId || get().encounter?.version !== version) return;
        snapshots.set(learnerId, { encounter: result.encounter, spellbook: result.spellbook });
        set({ encounter: result.encounter, spellbook: result.spellbook, isLoading: false });
      } catch (error) { if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false }); }
    },

    // The Spellbook and review return to the screen they were opened from (the map or the encounter).
    openSpellbook: () => set((state) => ({
      view: 'spellbook', returnView: ['map', 'dialogue'].includes(state.view) ? state.view : state.returnView,
      reviewChallenge: null, reviewResult: null, error: null,
    })),
    // Round 029: the Rift's drill starts from the map and returns to it; the encounter under way elsewhere is
    // reopened when it blocks the reviews.
    startDrill: (vocabularyId) => {
      set({ returnView: 'map' });
      return get().startReview(vocabularyId);
    },
    returnToEncounter: () => set((state) => (state.encounter ? { view: 'dialogue', error: null, notice: null } : {})),

    returnToDialogue: () => set((state) => ({
      view: state.returnView === 'dialogue' && state.encounter ? 'dialogue' : 'map', reviewChallenge: null, reviewResult: null, error: null,
    })),

    startReview: async (vocabularyId) => {
      const { learnerId } = get();
      if (!learnerId) return;
      set({ isLoading: true, error: null, reviewResult: null });
      const epoch = requestEpoch; // Round 031: a reply after a save switch is dropped (critique 1.1).
      try {
        const result = await api.createReview(learnerId, vocabularyId);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        set({ reviewChallenge: result.challenge, spellbook: result.spellbook, view: result.challenge ? 'review' : 'spellbook', isLoading: false });
      } catch (error) { if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false }); }
    },

    submitReview: async (answer) => {
      const { learnerId, reviewChallenge, isLoading } = get();
      if (!learnerId || !reviewChallenge || isLoading || !String(answer).trim()) return;
      set({ isLoading: true, error: null });
      const epoch = requestEpoch; // Round 031: a reply after a save switch is dropped (critique 1.1).
      try {
        const result = await api.submitReview(learnerId, { challengeId: reviewChallenge.id, attemptId: attemptId(), action: 'answer', answer: String(answer).trim() });
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        set({ reviewResult: result.result, spellbook: result.spellbook, reviewChallenge: null, isLoading: false });
      } catch (error) { if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false }); }
    },

    revealReviewAnswer: async () => {
      const { learnerId, reviewChallenge, isLoading } = get();
      if (!learnerId || !reviewChallenge || isLoading) return;
      set({ isLoading: true, error: null });
      const epoch = requestEpoch; // Round 031: a reply after a save switch is dropped (critique 1.1).
      try {
        const result = await api.submitReview(learnerId, { challengeId: reviewChallenge.id, attemptId: attemptId(), action: 'reveal', answer: '' });
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        set({ reviewResult: result.result, spellbook: result.spellbook, reviewChallenge: null, isLoading: false });
      } catch (error) { if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false }); }
    },

    // Round 031 (backlog A11): the Saves screen, a new save and switching between saves. A switch drops every response
    // still in flight for the old save (requestEpoch) and writes the device record only once the new save loaded.
    openSaves: () => set({ view: 'saves', returnView: 'map', reviewChallenge: null, reviewResult: null, error: null, notice: null }),
    newSave: async () => {
      const { saves, isLoading, learnerId } = get();
      if (!learnerId || isLoading || saves.length >= MAX_SAVES) return;
      const epoch = ++requestEpoch;
      set({ isLoading: true, error: null, notice: null });
      try {
        const identity = await api.createLearner(null);
        // Critique 1.8: the new slot is recorded (still inactive) before it loads, so a failure leaves no orphan.
        const record = withActive({ slots: get().saves }, identity.learnerId);
        const kept = { ...record, activeId: learnerId };
        await storage?.setItem?.(SLOTS_KEY, JSON.stringify(kept));
        if (epoch !== requestEpoch) return;
        set({ saves: kept.slots });
        await get()._loadSave(identity.learnerId, epoch);
      } catch (error) {
        if (epoch === requestEpoch) set({ error: error.message, isLoading: false });
      }
    },
    switchSave: (target) => {
      const { saves, isLoading, learnerId } = get();
      if (!learnerId || isLoading || target === learnerId || !saves.some((save) => save.learnerId === target)) return undefined;
      const epoch = ++requestEpoch;
      set({ isLoading: true, error: null, notice: null });
      return get()._loadSave(target, epoch);
    },
    // Loads a known slot from the server (createLearner recreates a save the server lost, critique 1.5; the encounter
    // and spellbook are the server's, not the in-app snapshot, critique 1.3) and resets every per-save field (1.4).
    _loadSave: async (target, epoch) => {
      try {
        const identity = await api.createLearner(target);
        const [{ world }, current, { party }] = await Promise.all([
          api.getWorld(identity.learnerId), api.currentEncounter(identity.learnerId), api.getParty(identity.learnerId),
        ]);
        if (epoch !== requestEpoch) return;
        const record = withActive({ slots: get().saves }, identity.learnerId);
        await storage?.setItem?.(SLOTS_KEY, JSON.stringify(record));
        await storage?.setItem?.(LEARNER_KEY, identity.learnerId);
        if (epoch !== requestEpoch) return;
        snapshots.set(identity.learnerId, { encounter: current.encounter ?? null, spellbook: current.spellbook });
        const label = record.slots.find((slot) => slot.learnerId === identity.learnerId).label;
        set({
          learnerId: identity.learnerId, language: identity.language ?? get().language, world, party, saves: record.slots,
          encounter: current.encounter ?? null, spellbook: current.spellbook,
          view: 'map', returnView: 'map', reviewChallenge: null, reviewResult: null, assessment: null, draft: '',
          pendingInput: null, error: null, onboarding: null, isLoading: false, notice: `Now playing ${label}.`,
        });
      } catch (error) {
        if (epoch === requestEpoch) set({ error: error.message, isLoading: false });
      }
    },

    switchLearnerForTest: (learnerId) => {
      requestEpoch += 1;
      initializationPromise = null;
      const snapshot = snapshots.get(learnerId) ?? { encounter: null, spellbook: emptySpellbook };
      set({ learnerId, ...snapshot, party: [], notice: null, draft: '', pendingInput: null, assessment: null, isLoading: false });
    },
  }));
}

export const useGameStore = createGameStore();
