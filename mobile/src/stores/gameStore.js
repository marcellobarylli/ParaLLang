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
// Round 071: what the player reads when a resend found the conversation changed or closed.
export const STALE_RELOADED = 'This conversation had moved on, so it was reloaded. Your answer was not sent; it is still in the box.';
// No round (round 102 open item): a party conversation starts from the Party screen, not the map.
export const STALE_CLOSED = 'This conversation is no longer open. Start it again from the map or the Party screen.';
// Round 096 (review R1.5, R1.1, R1.9): what the player reads when help found the conversation changed, when a review
// card was already answered or expired, and when the server no longer had a save.
export const STALE_HELP = 'This conversation had moved on, so it was reloaded. Ask for help again.';
export const STALE_REVIEW = 'This card was already answered or has expired. Try again for the next one.';
export const SAVE_LOST = 'This save was not found on the server, so it starts again from the beginning.';
// Round 102: after a replayed answer, the server holds another conversation than the one replayed.
export const STALE_REPLAY_OTHER = 'Your answer was graded, but the server now holds another conversation, shown here.';
// Round 099 (review 2 R2.1): help after a send whose reply was lost keeps the conversation; the resend replays.
export const STALE_HELP_PENDING = 'Your last answer may have reached the server. Send it again to see its verdict.';
// Round 070 (backlog I1): the verdict poll while a turn's reply is written: every second, at most a minute.
export const PROGRESS_INTERVAL_MS = 1000;
export const PROGRESS_POLLS = 60;
// Round 084 (critique 1.1), shared in round 086: a Spellbook that does not know of the encounter the app holds
// (a restarted server forgets in-memory encounters) would show meanings during it, so it is not applied.
const leaksMeanings = (state, spellbook) => state.encounter?.state === 'ongoing' && spellbook.inEncounter !== true;
const attemptId = () => globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.random()}`;

// Ported from client/src/stores/gameStore.js (round 004). Storage is async (AsyncStorage) and the store keeps the
// server's target language; the request-epoch, snapshot and retained-draft behaviour is the web store's.
export function createGameStore({ api = learningApi, storage = AsyncStorage, cue = playCue, ambience = setAmbience } = {}) {
  let initializationPromise = null;
  let requestEpoch = 0;
  let reviewRequest = 0; // round 065 Amendment 1: the latest startReview
  let sendSeq = 0; // round 070: the latest send; a progress poll from an older one is ignored (critique 1.1)
  // Round 071: attempt ids of sends that did not succeed, by learner, encounter, version and text, so resending the
  // same answer replays a turn the server committed but whose response was lost (critique 1.5: A → B → A keeps A).
  const retryIds = new Map();
  let startSeq = 0; // round 073: the latest encounter start; an older start's late settle leaves `starting` alone
  const STALE_CODES = new Set(['STALE_VERSION', 'STALE_ENCOUNTER']);
  let soundsTouched = false;
  let refreshSeq = 0; // round 084: the latest Spellbook refresh; an older reply is dropped (critique 1.2)
  const snapshots = new Map();
  // Round 096 (review R1.1, critique 1.3): review attempt ids by learner, challenge, action and answer, so resending
  // after a lost reply replays the review the server committed. Cleared on a success.
  const reviewRetryIds = new Map();
  const reviewAttempt = (learnerId, challengeId, action, answer) => {
    const key = [learnerId, challengeId, action, answer].join('|');
    if (!reviewRetryIds.has(key)) reviewRetryIds.set(key, attemptId());
    return reviewRetryIds.get(key);
  };
  // Round 096 (review R1.4, critique 1.5): raised when a world or party write is applied; a read that began before
  // a write is dropped, so it never undoes a recruit or a move. Round 099 (review 2 R2.3): one counter each, so a
  // recruit never drops a world read, nor a move a party read.
  let worldWrites = 0;
  let partyWrites = 0;
  // Round 099 (review 2 R2.2): saves the server answered as lost (`recovered: false`) whose notice is not shown yet;
  // a later createLearner for them answers `recovered: true`, so a failed load must not forget it.
  const lostSaves = new Set();

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
    starting: null, // Round 073 (backlog I3): { encounterId, seq } while an encounter's greeting is generated
    // Round 075: true when the verdict on screen is the committed one of a send whose provisional verdict was shown.
    assessmentCounted: false,
    earlyAssessment: null, // Round 070 (backlog I1): the grader's verdict while the NPC's reply is written
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
      set({ starting: null }); // Round 073 (critique 1.2): a reset drops a start's indicator
      initializationPromise = (async () => {
        set({ isLoading: true, error: null });
        let deviceSlots = null;
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
          // Round 090 (review R1.3): if this save cannot be loaded, the Saves screen still lists the device's saves.
          deviceSlots = storedId ? withActive(record, storedId) : record;
          const identity = await api.createLearner(storedId);
          if (storedId && identity.recovered === false) lostSaves.add(identity.learnerId);
          if (epoch !== requestEpoch) return;
          const slots = withActive(record, identity.learnerId);
          await storage?.setItem?.(LEARNER_KEY, identity.learnerId);
          await storage?.setItem?.(SLOTS_KEY, JSON.stringify(slots));
          // Round 090 (review R1.1, critique 1.5): the server's encounter and its Spellbook from one snapshot, as a
          // switch loads them, so a relaunch knows a conversation still under way (the Rift's drill note).
          const current = typeof api.currentEncounter === 'function'
            ? await Promise.resolve().then(() => api.currentEncounter(identity.learnerId)).catch(() => null) : null;
          const [{ world }, spellbook, { party }] = await Promise.all([
            api.getWorld(identity.learnerId), current?.spellbook ?? api.getSpellbook(identity.learnerId), api.getParty(identity.learnerId),
          ]);
          const encounter = current?.encounter ?? null;
          const onboarding = await onboardingPromise;
          if (epoch !== requestEpoch) return;
          snapshots.set(identity.learnerId, { encounter, spellbook });
          // Shown only over the map: a screen the player opened during startup is not replaced (the flag stays unset).
          const showOnboarding = Boolean(onboarding) && get().view === 'map';
          worldWrites += 1; partyWrites += 1; // round 096, 099
          const lost = lostSaves.delete(identity.learnerId);
          set({
            learnerId: identity.learnerId, language: identity.language ?? null, world, spellbook, party, encounter, isLoading: false,
            saves: slots.slots, savesFloor: slots.nextNumber,
            ...(showOnboarding ? { onboarding, view: 'onboarding' } : {}),
            // Round 096 (review R1.9): the app asked for a save the server no longer had.
            ...(lost ? { notice: SAVE_LOST } : {}),
          });
        } catch (error) {
          if (epoch === requestEpoch) {
            set({ error: error.message, isLoading: false, ...(deviceSlots && !get().learnerId ? { saves: deviceSlots.slots, savesFloor: deviceSlots.nextNumber } : {}) });
          }
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
        // Round 082: the move carries the Spellbook (a new place's inscription, the Rift's drill); older servers do not.
        const { world, spellbook } = await api.moveTo(learnerId, locationId);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return; // round 082 Amendment 1 (review R1.3)
        // Round 086 (review 1): round 084's encounter guard; the world is applied either way.
        const fresh = spellbook && !leaksMeanings(get(), spellbook) ? spellbook : null;
        if (fresh) snapshots.set(learnerId, { ...(snapshots.get(learnerId) ?? { encounter: get().encounter }), spellbook: fresh });
        worldWrites += 1; // round 096
        set({ world, ...(fresh ? { spellbook: fresh } : {}), isLoading: false });
      } catch (error) { if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false }); }
    },

    // Enters the encounter at the current location. A different session than the one held starts clean.
    enterEncounter: () => {
      const { world } = get();
      return get()._startNamed(world?.locations.find((location) => location.id === world.currentLocationId)?.encounter?.id ?? null);
    },

    // Round 091 (decision 3): leaving the conversation under way for the encounter here (a restart start).
    leaveAndEnter: () => {
      const { world } = get();
      const here = world?.locations.find((location) => location.id === world.currentLocationId)?.encounter?.id ?? null;
      return here ? get()._startNamed(here, { restart: true }) : undefined;
    },

    // Round 022: a party member's conversation starts from the Party screen, wherever the player is.
    talkTo: (encounterId) => (typeof encounterId === 'string' ? get()._startNamed(encounterId) : undefined),

    _startNamed: async (encounterId, { restart = false } = {}) => {
      const { learnerId, isLoading } = get();
      if (!learnerId || isLoading) return;
      const epoch = requestEpoch;
      startSeq += 1;
      const seq = startSeq;
      const from = get().view; // Round 096 (review R1.2): a start never takes the player off a screen they opened
      set({ isLoading: true, error: null, starting: encounterId ? { encounterId, seq } : null });
      // Round 073 (critique 1.1): only this start's own settle clears its indicator.
      const mine = () => epoch === requestEpoch && get().learnerId === learnerId && get().starting?.seq === seq;
      try {
        const started = await api.startEncounter(learnerId, restart, encounterId);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        snapshots.set(learnerId, { encounter: started.encounter, spellbook: started.spellbook });
        const fresh = started.encounter.id !== get().encounter?.id;
        // Critique 1.2: the screen opened meanwhile returns to the conversation ("Return to X").
        const stay = get().view !== from;
        set({
          encounter: started.encounter, spellbook: started.spellbook, isLoading: false,
          ...(stay ? { returnView: 'dialogue' } : { view: 'dialogue' }),
          ...(mine() ? { starting: null } : {}),
          ...(fresh ? { assessment: null, assessmentCounted: false, earlyAssessment: null, draft: '', pendingInput: null } : {}),
        });
      } catch (error) {
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        set({ error: error.message, isLoading: false, ...(mine() ? { starting: null } : {}) });
        // Round 091 (decision 4): the server holds a conversation this app did not know; take it, so the map names it.
        if (error.code === 'CONVERSATION_UNDER_WAY' && typeof api.currentEncounter === 'function') {
          try {
            const current = await api.currentEncounter(learnerId);
            if (epoch !== requestEpoch || get().learnerId !== learnerId || get().isLoading || !current?.encounter || !current.spellbook) return;
            snapshots.set(learnerId, { encounter: current.encounter, spellbook: current.spellbook });
            const fresh = current.encounter.id !== get().encounter?.id;
            set({ encounter: current.encounter, spellbook: current.spellbook, ...(fresh ? { assessment: null, assessmentCounted: false, earlyAssessment: null, draft: '', pendingInput: null } : {}) });
          } catch { /* the banner already says what to do */ }
        }
      }
    },

    // Round 084: cards fall due by the clock (SM-2 days), so the Spellbook is fetched again behind the screen when
    // the Spellbook or the map opens and when the app returns from the background. Never loading, never an error.
    // A reply applies only if it is the latest refresh, for the same learner and epoch (load-bearing: a save switch
    // may restore an older Spellbook object, critique 1.4), no action wrote a Spellbook since (every write is a new
    // object), and it does not show meanings while the app holds an ongoing encounter (critique 1.1: a restarted
    // server forgets in-memory encounters).
    refreshSpellbook: () => {
      const { learnerId, spellbook: before } = get();
      if (!learnerId || typeof api.getSpellbook !== 'function') return undefined;
      const epoch = requestEpoch;
      refreshSeq += 1;
      const seq = refreshSeq;
      return Promise.resolve().then(() => api.getSpellbook(learnerId)).then((spellbook) => {
        const state = get();
        if (seq !== refreshSeq || epoch !== requestEpoch || state.learnerId !== learnerId || state.spellbook !== before) return;
        if (!spellbook || typeof spellbook !== 'object' || !Array.isArray(spellbook.cards)) return;
        if (leaksMeanings(state, spellbook)) return;
        set({ spellbook });
      }, () => {});
    },

    openMap: async () => {
      const { learnerId } = get();
      set({ view: 'map', reviewChallenge: null, reviewResult: null, error: null, notice: null });
      if (!learnerId) return;
      get().refreshSpellbook();
      const epoch = requestEpoch;
      const writes = worldWrites; // round 096 (review R1.4): a move applied meanwhile wins
      try {
        const { world } = await api.getWorld(learnerId);
        if (get().learnerId === learnerId && epoch === requestEpoch && writes === worldWrites) set({ world });
      } catch (error) { if (get().learnerId === learnerId && epoch === requestEpoch) set({ error: error.message }); }
    },

    // Round 021: a defeated, saveable NPC joins the party (from the resolved encounter or the map). Leaving writes
    // nothing, so the invitation stays open on the map.
    recruit: async (encounterId) => {
      const { learnerId, isLoading } = get();
      if (!learnerId || isLoading || !encounterId) return; // restored in round 073 Amendment 1
      const epoch = requestEpoch;
      set({ isLoading: true, error: null, notice: null });
      try {
        const { party, joined } = await api.recruit(learnerId, encounterId);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        const member = party.find((candidate) => candidate.encounterId === encounterId);
        partyWrites += 1; // round 096
        set({ party, isLoading: false, notice: joined && member ? `${member.name} joined your party.` : null });
      } catch (error) {
        if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false });
      }
    },

    // Round 111 (backlog B8): read a redacted annex anyway (the Spellbook asked first). The reply's Spellbook is a new
    // object, so a refresh that began before it is dropped (refreshSpellbook's rule). Never while the app holds an
    // ongoing encounter (the server refuses it too).
    readAnnex: async (annexId) => {
      const { learnerId, isLoading } = get();
      if (!learnerId || isLoading || !annexId || get().encounter?.state === 'ongoing') return;
      const epoch = requestEpoch;
      set({ isLoading: true, error: null, notice: null });
      try {
        const { spellbook } = await api.readAnnex(learnerId, annexId);
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        const fresh = spellbook && Array.isArray(spellbook.cards) && !leaksMeanings(get(), spellbook) ? spellbook : null;
        // Critique 1.4: the save's snapshot too, so a switch back does not restore the redacted Spellbook.
        if (fresh) snapshots.set(learnerId, { ...(snapshots.get(learnerId) ?? { encounter: get().encounter }), spellbook: fresh });
        set({ ...(fresh ? { spellbook: fresh } : {}), isLoading: false });
      } catch (error) {
        if (epoch === requestEpoch && get().learnerId === learnerId) {
          set({ error: error.message, isLoading: false });
          // Review R1.5: a conversation the app does not hold (another device, a lost session); the server's
          // Spellbook then says so and the read button goes.
          if (error.code === 'IN_ENCOUNTER') get().refreshSpellbook();
        }
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
      const epoch = requestEpoch;
      const writes = partyWrites; // round 096 (review R1.4): a recruit applied meanwhile wins
      Promise.resolve().then(() => api.getParty(learnerId)).then((data) => {
        const party = data?.party; // round 099 (review 2, not new): an empty reply throws nothing
        if (get().learnerId === learnerId && epoch === requestEpoch && writes === partyWrites && Array.isArray(party)) set({ party });
      }, () => {});
    },

    // Round 096 (review R1.3, critique 1.4): a restart start: the loading guard, `starting`, the screen guard, and the
    // verdict cleared only on success (a restart's encounter always has a new id).
    restartEncounter: () => {
      const { learnerId, encounter } = get();
      if (!learnerId) return undefined;
      return get()._startNamed(encounter?.encounterId ?? null, { restart: true });
    },

    // Round 096 (review R1.5, critique 1.7): the reload after a stale send or help reveal, under the caller's own
    // guard. Loading stays on until it settles; the conversation the server holds, or back to the map if it closed.
    _reloadStale: async ({ learnerId, owns, error, message, draft, clearRetries = false }) => {
      let latest = null;
      try { latest = await api.currentEncounter(learnerId); }
      catch {
        if (owns()) set({ error: error.message, isLoading: false, ...(draft !== undefined ? { pendingInput: draft, draft } : {}) });
        return;
      }
      if (!owns()) return;
      if (clearRetries) retryIds.clear();
      get()._applyLatest(learnerId, latest, { message, keep: draft !== undefined ? { draft } : {} });
    },

    // Round 102 (critique 1.4, 1.8): the conversation the server holds, or none (back to the map, STALE_CLOSED).
    // `leaveView` keeps a screen the player opened meanwhile; the map is taken only from the dialogue.
    _applyLatest: (learnerId, latest, { message, keep = {}, leaveView = false }) => {
      const spellbook = latest?.spellbook ?? get().spellbook;
      const encounter = latest?.encounter ?? null;
      snapshots.set(learnerId, { encounter, spellbook });
      const cleared = { encounter, spellbook, assessment: null, assessmentCounted: false, earlyAssessment: null, pendingInput: null, ...keep, isLoading: false };
      if (encounter) set({ ...cleared, error: message });
      else set({ ...cleared, ...(!leaveView || get().view === 'dialogue' ? { view: 'map' } : {}), error: STALE_CLOSED });
    },

    sendMessage: async (providedText) => {
      const state = get();
      const text = String(providedText ?? state.draft).trim();
      if (!text || !state.learnerId || !state.encounter || state.encounter.state !== 'ongoing' || state.isLoading) return;
      const learnerId = state.learnerId;
      const encounterId = state.encounter.id;
      const version = state.encounter.version;
      const epoch = requestEpoch;
      const retryKey = [learnerId, encounterId, version, text].join('|');
      const attempt = retryIds.get(retryKey) ?? attemptId();
      retryIds.set(retryKey, attempt);
      sendSeq += 1;
      const seq = sendSeq;
      const send = { settled: false };
      const owns = () => seq === sendSeq && epoch === requestEpoch && get().learnerId === learnerId
        && get().encounter?.id === encounterId && get().encounter?.version === version;
      set({ isLoading: true, error: null, pendingInput: text, draft: text, earlyAssessment: null, assessmentCounted: false });
      // Round 070: while the POST runs, one sequential poll loop asks for the verdict (critique 1.1: applied only while
      // this send is unsettled and still the latest). A poll error is ignored; the POST decides.
      const current = () => !send.settled && seq === sendSeq && epoch === requestEpoch && get().learnerId === learnerId;
      const poll = async () => {
        for (let count = 0; count < PROGRESS_POLLS && current(); count += 1) {
          await new Promise((resolve) => setTimeout(resolve, PROGRESS_INTERVAL_MS));
          if (!current()) return;
          try {
            const { progress } = await api.getTurnProgress(learnerId, attempt);
            if (current() && progress?.assessment) { set({ earlyAssessment: progress.assessment }); return; }
          } catch { /* the POST decides */ }
        }
      };
      if (typeof api.getTurnProgress === 'function') poll();
      try {
        const result = await api.sendDialogue(learnerId, { encounterId, version, attemptId: attempt, message: text });
        send.settled = true;
        // Round 071 (critique 1.2): also the same encounter and the latest send.
        if (!owns()) return;
        retryIds.clear();
        snapshots.set(learnerId, { encounter: result.encounter, spellbook: result.spellbook });
        // Round 075 (critiques 1.2, 1.3): counted only when this send's own provisional verdict was on screen; a
        // failed send never sets it, so an older verdict shown again is not marked counted.
        const counted = Boolean(get().earlyAssessment);
        set({ encounter: result.encounter, spellbook: result.spellbook, assessment: result.assessment, assessmentCounted: counted, earlyAssessment: null, isLoading: false, pendingInput: null, draft: '' });
        // Round 071 (critique 1.1): a replay is the turn as committed then; another client may have moved on since.
        if (result.replayed && typeof api.currentEncounter === 'function') {
          try {
            const latest = await api.currentEncounter(learnerId);
            const now = get().encounter;
            const live = seq === sendSeq && epoch === requestEpoch && get().learnerId === learnerId && !get().isLoading;
            if (live && latest?.encounter?.id === now?.id && latest.encounter.version > now.version) {
              snapshots.set(learnerId, { encounter: latest.encounter, spellbook: latest.spellbook });
              // Round 075: the replayed verdict belongs to an older turn than the one now shown.
              set({ encounter: latest.encounter, spellbook: latest.spellbook, assessment: null, assessmentCounted: false });
            } else if (live && result.encounter.state === 'ongoing' && now?.id === result.encounter.id
              && now?.version === result.encounter.version && latest && latest.encounter?.id !== result.encounter.id) {
              // Round 102 (round 099 critique 1.3; critique 1.1): the server no longer holds the replayed conversation
              // (a restart: encounters live in memory, receipts in the save) or holds another one. Only while the
              // store still shows the replay, so a start or help reload during the read wins. A resolved replay stands.
              get()._applyLatest(learnerId, latest, { message: STALE_REPLAY_OTHER, leaveView: true });
            }
          } catch { /* the replayed state stands */ }
        }
        // Round 037: a cue for progress only: the encounter resolved, or the current objective was met (critique
        // 1.1: a later objective passing alone advances nothing). Nothing on a miss or a replayed attempt.
        if (!result.replayed) {
          if (result.encounter.state === 'resolved') get()._cue('resolve');
          else if (result.encounter.currentObjective?.id !== state.encounter.currentObjective?.id) get()._cue('pass');
        }
        if (result.encounter.state === 'resolved') {
          // Round 096 (review R1.4, critique 1.5): the resolve is a write; a recruit applied before these reads come
          // back wins over them.
          worldWrites += 1;
          partyWrites += 1;
          const writes = { world: worldWrites, party: partyWrites };
          try {
            // Round 022: a resolved party conversation raises the member's count, so the party is refreshed too.
            // Round 099 (review 2 R2.3): each applied under its own counter.
            const [{ world }, { party }] = await Promise.all([api.getWorld(learnerId), api.getParty(learnerId)]);
            if (get().learnerId === learnerId && epoch === requestEpoch) {
              set({ ...(writes.world === worldWrites ? { world } : {}), ...(writes.party === partyWrites ? { party } : {}) });
            }
          } catch { /* the map refreshes again when it is opened */ }
        }
      } catch (error) {
        send.settled = true;
        if (seq === sendSeq) set({ earlyAssessment: null });
        // Round 071 (critiques 1.3, 1.4, 1.6, 1.7): a stale session is reloaded while loading stays on, under the
        // send's own guards; a closed one returns to the map. The answer stays in the box, unsent.
        if (STALE_CODES.has(error.code) && owns() && typeof api.currentEncounter === 'function') {
          await get()._reloadStale({ learnerId, owns, error, message: STALE_RELOADED, draft: text, clearRetries: true });
          return;
        }
        if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false, pendingInput: text, draft: text });
      }
    },

    revealHelp: async ({ kind, messageId, vocabularyId }) => {
      const { learnerId, encounter, isLoading } = get();
      if (!learnerId || !encounter || isLoading) return;
      const { id: encounterId, version } = encounter;
      set({ isLoading: true, error: null });
      const epoch = requestEpoch;
      // Round 096 (review R1.6): the same save, epoch and conversation at the same version.
      const owns = () => epoch === requestEpoch && get().learnerId === learnerId && get().encounter?.id === encounterId && get().encounter?.version === version;
      try {
        const result = await api.revealHelp(learnerId, { encounterId, version, kind, messageId, vocabularyId });
        if (!owns()) { if (epoch === requestEpoch && get().learnerId === learnerId) set({ isLoading: false }); return; }
        snapshots.set(learnerId, { encounter: result.encounter, spellbook: result.spellbook });
        set({ encounter: result.encounter, spellbook: result.spellbook, isLoading: false });
      } catch (error) {
        // Round 096 (review R1.5, critique 1.1): a stale conversation reloads (STALE_MESSAGE is an older line's chip
        // while the version is current: the server's text stands).
        // Round 099 (review 2 R2.1, critique 1.4): an answer sent at this very version whose reply was lost may have
        // been committed; a reload would move past its version and the next Send would grade it again. The
        // conversation stays as it is and the player sends again: the same version and attempt id replay the turn,
        // or a STALE answer runs the send's own reload.
        const pending = get().pendingInput;
        if (STALE_CODES.has(error.code) && owns() && pending && retryIds.has([learnerId, encounterId, version, pending].join('|'))) {
          set({ isLoading: false, error: STALE_HELP_PENDING });
          return;
        }
        if (STALE_CODES.has(error.code) && owns() && typeof api.currentEncounter === 'function') {
          await get()._reloadStale({ learnerId, owns, error, message: STALE_HELP });
          return;
        }
        if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, isLoading: false });
      }
    },

    // The Spellbook and review return to the screen they were opened from (the map or the encounter).
    openSpellbook: () => {
      set((state) => ({
        view: 'spellbook', returnView: ['map', 'dialogue'].includes(state.view) ? state.view : state.returnView,
        reviewChallenge: null, reviewResult: null, error: null,
      }));
      get().refreshSpellbook(); // round 084
    },
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

    // Round 086 (critique Optional): the review actions apply their Spellbooks unguarded. Reviews are closed by the
    // server during an encounter, and the Spellbook screen they start from is kept free of meanings by the guards.
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

    submitReview: (answer) => {
      const text = String(answer ?? '').trim();
      return text ? get()._sendReview('answer', text) : undefined;
    },

    revealReviewAnswer: () => get()._sendReview('reveal', ''),

    // Round 096 (review R1.1, critique 1.3): one path for both review actions. A resend after a lost reply reuses the
    // attempt id and shows the replayed verdict (no cue); a card already answered or expired leaves the review
    // screen's "Try again" to fetch the next one.
    _sendReview: async (action, answer) => {
      const { learnerId, reviewChallenge, isLoading } = get();
      if (!learnerId || !reviewChallenge || isLoading) return;
      set({ isLoading: true, error: null });
      const epoch = requestEpoch; // Round 031: a reply after a save switch is dropped (critique 1.1).
      const attempt = reviewAttempt(learnerId, reviewChallenge.id, action, answer);
      // Round 099 (review 2 R2.5, critique 1.7): every way off the review screen clears the challenge, and loading
      // blocks a way back meanwhile; a reply for a card no longer shown is applied silently.
      const onCard = () => get().reviewChallenge?.id === reviewChallenge.id;
      try {
        const result = await api.submitReview(learnerId, { challengeId: reviewChallenge.id, attemptId: attempt, action, answer });
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        reviewRetryIds.clear();
        if (!onCard()) { set({ spellbook: result.spellbook, isLoading: false }); return; }
        set({ reviewResult: result.result, spellbook: result.spellbook, reviewChallenge: null, isLoading: false });
        if (action === 'answer' && result.result?.correct && !result.replayed) get()._cue('pass'); // Round 037 (critique 1.2)
      } catch (error) {
        if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
        if (error.code === 'STALE_CHALLENGE') {
          for (const key of [...reviewRetryIds.keys()]) if (key.startsWith(`${learnerId}|${reviewChallenge.id}|`)) reviewRetryIds.delete(key);
          if (!onCard()) { set({ isLoading: false }); return; }
          set({ reviewChallenge: null, error: STALE_REVIEW, isLoading: false });
          get().refreshSpellbook();
          return;
        }
        set(onCard() ? { error: error.message, isLoading: false } : { isLoading: false });
      }
    },

    // Round 031 (backlog A11): the Saves screen, a new save and switching between saves. A switch drops every response
    // still in flight for the old save (requestEpoch) and writes the device record only once the new save loaded.
    // Round 085: the Saves screen shows the current save's due count, so it refreshes the Spellbook as round 084's
    // screens do; so do the ends of a remove and of a failed new save or switch (each raised the epoch, which drops
    // a refresh in flight).
    openSaves: () => {
      set({ view: 'saves', returnView: 'map', reviewChallenge: null, reviewResult: null, error: null, notice: null });
      get().refreshSpellbook();
    },
    newSave: async () => {
      const { saves, isLoading, learnerId } = get();
      // Round 090 (review R1.3): also after a failed start (no learner), to leave a save that cannot be loaded.
      if ((!learnerId && saves.length === 0) || isLoading || saves.length >= MAX_SAVES) return;
      const epoch = ++requestEpoch;
      set({ starting: null }); // Round 073 (critique 1.2): a reset drops a start's indicator
      set({ isLoading: true, error: null, notice: null });
      try {
        const identity = await api.createLearner(null);
        // Critique 1.8: the new slot is recorded (still inactive) before it loads, so a failure leaves no orphan.
        const record = withActive({ slots: get().saves, nextNumber: get().savesFloor }, identity.learnerId);
        const kept = { ...record, activeId: learnerId ?? identity.learnerId }; // critique 1.2: never a null active id
        await storage?.setItem?.(SLOTS_KEY, JSON.stringify(kept));
        if (epoch !== requestEpoch) return;
        set({ saves: kept.slots });
        await get()._loadSave(identity.learnerId, epoch);
      } catch (error) {
        if (epoch === requestEpoch) { set({ error: error.message, isLoading: false }); get().refreshSpellbook(); }
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
      set({ starting: null }); // Round 073 (critique 1.2)
      const record = withoutSlot({ activeId: learnerId, slots: saves, nextNumber: savesFloor }, target);
      const label = saves.find((save) => save.learnerId === target).label;
      set({ isLoading: true, error: null, notice: null, saves: record.slots, savesFloor: record.nextNumber });
      // Round 039: the server deletes the save first; if it cannot, the slot stays so the player can try again.
      try { await api.deleteLearner(target); }
      catch (error) {
        set({ saves, savesFloor, isLoading: false, error: `The server could not delete ${label}, so it is still here: ${error.message}` });
        get().refreshSpellbook();
        return false;
      }
      lostSaves.delete(target); // round 099 (critique Optional)
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
        get().refreshSpellbook();
        return true;
      }
      snapshots.delete(target);
      set({ isLoading: false, notice: `${label} was removed from this device.` });
      get().refreshSpellbook();
      return true;
    },
    switchSave: (target) => {
      const { saves, isLoading, learnerId } = get();
      if (isLoading || target === learnerId || !saves.some((save) => save.learnerId === target)) return undefined;
      const epoch = ++requestEpoch;
      set({ starting: null }); // Round 073 (critique 1.2): a reset drops a start's indicator
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
        if (identity.recovered === false) lostSaves.add(identity.learnerId);
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
        worldWrites += 1; partyWrites += 1; // round 096, 099
        // Round 096 (review R1.9, critique 1.8): a switch to a save the server no longer had says so on the same line.
        // Round 099 (review 2 R2.2): also after a load that failed after createLearner.
        const lost = lostSaves.delete(identity.learnerId) ? ` ${SAVE_LOST}` : '';
        set({
          learnerId: identity.learnerId, language: identity.language ?? get().language, world, party, saves: record.slots,
          encounter: current.encounter ?? null, spellbook: current.spellbook,
          view: 'map', returnView: 'map', reviewChallenge: null, reviewResult: null, assessment: null, assessmentCounted: false, earlyAssessment: null, draft: '',
          pendingInput: null, error: null, onboarding: null, isLoading: false, notice: `Now playing ${label}.${lost}`,
        });
      } catch (error) {
        if (epoch === requestEpoch) { set({ error: error.message, isLoading: false }); get().refreshSpellbook(); }
      }
    },

    switchLearnerForTest: (learnerId) => {
      requestEpoch += 1;
      sendSeq += 1;
      set({ starting: null }); // Round 073 (critique 1.2)
      initializationPromise = null;
      const snapshot = snapshots.get(learnerId) ?? { encounter: null, spellbook: emptySpellbook };
      set({ learnerId, ...snapshot, party: [], notice: null, draft: '', pendingInput: null, assessment: null, assessmentCounted: false, earlyAssessment: null, isLoading: false });
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
