import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { learningApi } from '../api/learning.js';
import { MAX_SAVES, SLOTS_KEY, parseSlots, withActive, withoutSlot } from './saveSlots.js';
import { playCue } from '../sounds.js';
import { setAmbience } from '../ambience.js';

const LEARNER_KEY = 'parallang.learnerId';
// Round 027: set once the player has entered the market from the philosophy statement (per device).
export const ONBOARDING_KEY = 'parallang.onboardingSeen';
// Round 037: the sound switch (per device); anything but 'off' means on.
export const SOUNDS_KEY = 'parallang.soundsOn';
const emptySpellbook = { cards: [], dueCount: 0, contentVersion: null };
const attemptId = () => globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.random()}`;

// Ported from client/src/stores/gameStore.js (round 004). Storage is async (AsyncStorage) and the store keeps the
// server's target language; the request-epoch, snapshot and retained-draft behaviour is the web store's.
export function createGameStore({ api = learningApi, storage = AsyncStorage, cue = playCue, ambience = setAmbience } = {}) {
  let initializationPromise = null;
  let requestEpoch = 0;
  let reviewRequest = 0; // round 065 Amendment 1: the latest startReview
  let soundsTouched = false;
  const snapshots = new Map();

  const store = create((set, get) => ({
    learnerId: null,
    language: null,
    encounter: null,
    world: null,
    atmosphere: null, // Round 053: { locationId, text } for the current location, or null
    onboarding: null,
    party: [],
    notice: null,
    spellbook: emptySpellbook,
    savesFloor: undefined, // Round 038: the lowest number a new save may take (record.nextNumber)
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
    soundsOn: true,
    soundsKnown: false, // round 041 (critique 1.9): the stored switch has been read (or set)

    setDraft: (draft) => set({ draft }),
    // Round 037 (backlog C4a): UI cues and their switch.
    _cue: (name) => { if (get().soundsOn) Promise.resolve().then(() => cue(name)).catch(() => {}); },
    setSoundsOn: (on) => {
      soundsTouched = true;
      set({ soundsOn: Boolean(on), soundsKnown: true });
      Promise.resolve(storage?.setItem?.(SOUNDS_KEY, on ? 'on' : 'off')).catch(() => {});
    },
    clearError: () => set({ error: null }),

    initialize: () => {
      if (initializationPromise) return initializationPromise;
      const epoch = ++requestEpoch;
      initializationPromise = (async () => {
        set({ isLoading: true, error: null });
        try {
          // Round 027: the statement is fetched beside startup, never inside it: a failure only skips the screen.
          const seen = await Promise.resolve(storage?.getItem?.(ONBOARDING_KEY)).catch(() => null);
          // Round 037 (critique 1.7): only 'off' turns sounds off, and a switch made meanwhile wins.
          Promise.resolve(storage?.getItem?.(SOUNDS_KEY)).then((value) => { if (value === 'off' && !soundsTouched) set({ soundsOn: false }); }, () => {})
            .finally(() => { if (!get().soundsKnown) set({ soundsKnown: true }); });
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
            saves: slots.slots, savesFloor: slots.nextNumber,
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

    openParty: () => {
      set((state) => ({
        view: 'party', returnView: ['map', 'dialogue'].includes(state.view) ? state.view : state.returnView,
        reviewChallenge: null, reviewResult: null, error: null,
      }));
      // Round 043 (critique 1.2): refresh the party behind the screen, so counts and story hints are never stale
      // after a failed refresh. A late reply for another save is dropped.
      const { learnerId } = get();
      if (!learnerId || !api.getParty) return;
      Promise.resolve().then(() => api.getParty(learnerId)).then(({ party }) => {
        if (get().learnerId === learnerId && Array.isArray(party)) set({ party });
      }, () => {});
    },

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
        // Round 037: a cue for progress only: the encounter resolved, or the current objective was met (critique
        // 1.1: a later objective passing alone advances nothing). Nothing on a miss or a replayed attempt.
        if (!result.replayed) {
          if (result.encounter.state === 'resolved') get()._cue('resolve');
          else if (result.encounter.currentObjective?.id !== state.encounter.currentObjective?.id) get()._cue('pass');
        }
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
      const { learnerId, isLoading } = get();
      if (!learnerId || isLoading) return; // round 065 Amendment 1: no second request from a double tap
      set({ isLoading: true, error: null, reviewResult: null });
      const epoch = requestEpoch; // Round 031: a reply after a save switch is dropped (critique 1.1).
      const from = get().view; // Round 065 (critique 1.2): a reply after the player left the screen does not pull them back.
      const mine = ++reviewRequest; // Amendment 1: and an older reply never overtakes a newer request.
      try {
        const result = await api.createReview(learnerId, vocabularyId);
        if (epoch !== requestEpoch || get().learnerId !== learnerId || mine !== reviewRequest) return;
        if (get().view !== from) { set({ spellbook: result.spellbook, isLoading: false }); return; }
        set({ reviewChallenge: result.challenge, spellbook: result.spellbook, view: result.challenge ? 'review' : 'spellbook', isLoading: false });
      } catch (error) {
        if (epoch !== requestEpoch || get().learnerId !== learnerId || mine !== reviewRequest) return;
        set(get().view === from ? { error: error.message, isLoading: false } : { isLoading: false });
      }
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
        if (result.result?.correct) get()._cue('pass'); // Round 037 (critique 1.2)
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
        const record = withActive({ slots: get().saves, nextNumber: get().savesFloor }, identity.learnerId);
        const kept = { ...record, activeId: learnerId };
        await storage?.setItem?.(SLOTS_KEY, JSON.stringify(kept));
        if (epoch !== requestEpoch) return;
        set({ saves: kept.slots });
        await get()._loadSave(identity.learnerId, epoch);
      } catch (error) {
        if (epoch === requestEpoch) set({ error: error.message, isLoading: false });
      }
    },
    // Round 038 (A11b): the device forgets a save that is not the current one. It locks the store like a switch
    // (isLoading, a new epoch), so no switch or new save can run against the old list (critique 1.1). The list is
    // updated first and put back if the write fails. The record always keeps the current save, so it never becomes
    // empty. The server's file for that learner stays, unreachable from this app (critique 1.3).
    removeSave: async (target) => {
      const { saves, isLoading, learnerId, savesFloor } = get();
      if (!learnerId || isLoading || target === learnerId || !saves.some((save) => save.learnerId === target)) return false;
      ++requestEpoch;
      const record = withoutSlot({ activeId: learnerId, slots: saves, nextNumber: savesFloor }, target);
      const label = saves.find((save) => save.learnerId === target).label;
      set({ isLoading: true, error: null, notice: null, saves: record.slots, savesFloor: record.nextNumber });
      // Round 039: the server deletes the save first; if it cannot, the slot stays so the player can try again.
      try { await api.deleteLearner(target); }
      catch (error) {
        set({ saves, savesFloor, isLoading: false, error: `The server could not delete ${label}, so it is still here: ${error.message}` });
        return false;
      }
      try {
        await storage?.setItem?.(SLOTS_KEY, JSON.stringify(record));
        // Critique 1.2: the legacy key must not lead back to the removed save.
        const legacy = await Promise.resolve(storage?.getItem?.(LEARNER_KEY)).catch(() => null);
        if (legacy === target) await Promise.resolve(storage?.setItem?.(LEARNER_KEY, learnerId)).catch(() => {});
      } catch (error) {
        // The server's copy is gone, so the slot stays off the list; the next record write (a switch, a new save)
        // stores the list without it.
        snapshots.delete(target);
        set({ isLoading: false, error: `${label} was deleted, but this device could not record it yet: ${error.message}` });
        return true;
      }
      snapshots.delete(target);
      set({ isLoading: false, notice: `${label} was removed from this device.` });
      return true;
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
      // Round 038 (critique 1.1): a slot no longer on the list is not loaded (and so never added back).
      if (!get().saves.some((save) => save.learnerId === target)) { if (epoch === requestEpoch) set({ isLoading: false }); return; }
      try {
        const identity = await api.createLearner(target);
        const [{ world }, current, { party }] = await Promise.all([
          api.getWorld(identity.learnerId), api.currentEncounter(identity.learnerId), api.getParty(identity.learnerId),
        ]);
        if (epoch !== requestEpoch) return;
        if (!get().saves.some((save) => save.learnerId === identity.learnerId)) { set({ isLoading: false }); return; }
        const record = withActive({ slots: get().saves, nextNumber: get().savesFloor }, identity.learnerId);
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

  // Round 041 (backlog C4b): the current location's ambience, behind the same switch as the cues; silent on the
  // statement screen and before a learner and world are known.
  let heard = null; // nothing plays until a location is known
  const follow = (state) => {
    const want = state.soundsOn && state.soundsKnown && state.view !== 'onboarding' && state.learnerId ? state.world?.currentLocationId ?? null : null;
    if (want === heard) return;
    heard = want;
    try { Promise.resolve(ambience(want)).catch(() => {}); } catch { /* ignore */ }
  };
  store.subscribe(follow);
  follow(store.getState());

  // Round 053 (backlog A10): the current location's atmosphere line, asked for when the learner, the location, its
  // encounter's completion or the party changes; a reply is kept only if all of those still hold. Never blocks the map.
  let atmosphereKey = null;
  const keyOf = (state) => {
    const here = state.world?.locations.find((location) => location.id === state.world.currentLocationId);
    if (!state.learnerId || !here) return null;
    return JSON.stringify([state.learnerId, here.id, here.encounter?.completed ?? null, (state.party ?? []).map((member) => member.characterId).sort()]);
  };
  const followAtmosphere = (state) => {
    const key = keyOf(state);
    if (key === atmosphereKey) return;
    atmosphereKey = key;
    if (state.atmosphere) store.setState({ atmosphere: null }); // critique 1.7: never another state's line
    if (!key || typeof api.getAtmosphere !== 'function') return;
    const asked = state.learnerId;
    const ask = (retries) => Promise.resolve().then(() => api.getAtmosphere(asked)).then((data) => {
      if (atmosphereKey !== key) return;
      store.setState({ atmosphere: data?.atmosphere ?? null });
      // Round 053 review 1: the server was busy with an encounter call; ask once more later, same key only.
      if (!data?.atmosphere && retries > 0 && Number.isFinite(data?.retryAfterMs)) {
        setTimeout(() => { if (atmosphereKey === key) ask(retries - 1); }, Math.min(data.retryAfterMs, 60_000));
      }
    }, () => {});
    ask(1);
  };
  store.subscribe(followAtmosphere);
  followAtmosphere(store.getState());
  return store;
}

export const useGameStore = createGameStore();
