import { create } from 'zustand';
import { createLearningApi } from '../api/encounter.js';
import { loadSettings, saveSettings as persistSettings, settingsProblem, SAME_ORIGIN_API } from '../api/settings.js';

// Round 115: the web client plays a dungeon. Its flow:
//
//   attract --enter--> overview --start--> approach --camera there, encounter loaded--> encounter
//   encounter --resolved, walkOn--> walk --camera there, encounter loaded--> encounter      (once per later site)
//   encounter (last site) --resolved, walkOn--> victory --playAgain--> overview
//
// The camera moves during approach and walk (src/scene/director.js). The dialogue opens when the camera has arrived
// (cameraArrived, set by the 3D view) and the site's encounter has loaded. The encounter, help, Spellbook and review
// actions are the old single-encounter client's (rounds 001-017).
//
// This module imports no YAML and no three.js: server/test/web-client.test.js loads it in plain Node.
const LEARNER_KEY = 'parallang.learnerId';
const emptySpellbook = { cards: [], dueCount: 0, contentVersion: null };
const attemptId = () => globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.random()}`;
const MOVING = new Set(['approach', 'walk']);

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

// The server's sites carry each character's name; the bundled file does not.
function mergeDungeon(bundled, served) {
  if (!served) return bundled;
  return {
    ...bundled,
    name: served.name ?? bundled.name,
    sites: bundled.sites.map((site, index) => ({ ...site, characterName: served.sites?.[index]?.characterName ?? site.characterName })),
  };
}

// The server URL and access token come from the settings sheet (stored with the learner id). With no api given,
// requests read them from this store, so a saved change applies to the next request (round 114).
export function createGameStore({ api: givenApi, storage = browserStorage(), dungeon, sameOrigin = SAME_ORIGIN_API } = {}) {
  if (!dungeon) throw new Error('createGameStore needs the dungeon (src/dungeon.js)');
  let initializationPromise = null;
  let requestEpoch = 0; // a new learner or server: older replies are dropped
  let siteRequest = 0; // the newest site start wins
  let progressRequest = 0; // the newest read of the run wins, and a reset outdates every read before it
  let spellbookVersion = 0; // counts the Spellbooks taken from replies, so a slower, older read is not applied over them

  return create((set, get) => {
    const api = givenApi ?? createLearningApi({ getSettings: () => get().settings });
    const siteIndexOf = (encounterId) => get().dungeon.sites.findIndex((site) => site.encounterId === encounterId);

    // The dialogue opens when the camera is there and the site's encounter is loaded.
    const maybeOpen = () => {
      const s = get();
      const site = s.dungeon.sites[s.siteIndex];
      if (MOVING.has(s.phase) && s.cameraArrived && s.encounter && s.encounter.encounterId === site?.encounterId) set({ phase: 'encounter' });
    };

    // Review 1 (R1.2): a read that a reset, new settings or a newer read has overtaken is dropped.
    const refreshProgress = async (learnerId) => {
      const request = ++progressRequest;
      const epoch = requestEpoch;
      try {
        const view = await api.getDungeon(learnerId, dungeon.id);
        if (request !== progressRequest || epoch !== requestEpoch || get().learnerId !== learnerId) return null;
        set({ progress: view.progress, dungeon: mergeDungeon(dungeon, view.dungeon) });
        return view.progress;
      } catch { return null; }
    };

    // Every Spellbook from a reply goes through here (review 1, R1.4).
    const withSpellbook = (spellbook) => { spellbookVersion += 1; return spellbook; };

    const showVictory = () => set({ phase: 'victory', encounter: null, encounterLoading: false, siteError: null, assessment: null, cameraArrived: false, view: 'dialogue', draft: '', pendingInput: null });

    // Starts the run's next site on the server (it decides which site that is) and takes the site from the reply.
    const loadSite = async ({ restart = false } = {}) => {
      const { learnerId } = get();
      if (!learnerId) return;
      const request = ++siteRequest;
      const epoch = requestEpoch;
      const stale = () => request !== siteRequest || epoch !== requestEpoch;
      set({ encounterLoading: true, siteError: null, error: null });
      const startSite = (again) => api.startEncounter(learnerId, { dungeonId: dungeon.id, restart: again });
      try {
        let result;
        try { result = await startSite(restart); }
        catch (error) {
          // A conversation from outside the dungeon (the old client's, the market's) is in the way. The dungeon is
          // this client's only screen, so it is replaced.
          if (restart || error.code !== 'CONVERSATION_UNDER_WAY' || stale()) throw error;
          result = await startSite(true);
        }
        if (stale()) return;
        const patch = { encounter: result.encounter, spellbook: withSpellbook(result.spellbook), encounterLoading: false, assessment: null, draft: '', pendingInput: null };
        const index = siteIndexOf(result.encounter.encounterId);
        // Another tab moved the run on: the camera goes to the site the server started.
        if (index >= 0 && index !== get().siteIndex) Object.assign(patch, { siteIndex: index, phase: 'approach', walkFrom: null, cameraArrived: false });
        set(patch);
        maybeOpen();
      } catch (error) {
        if (stale()) return;
        if (error.code === 'NOT_NEXT_SITE' && error.details?.nextEncounterId == null) {
          showVictory();
          await refreshProgress(learnerId);
          return;
        }
        // A failed start on the way to a site shows in the travel caption, with a retry. A failed Start over leaves the
        // player in the conversation, where the banner says so (review 1, R1.5).
        if (get().phase === 'encounter') set({ error: `The conversation could not start over: ${error.message}`, encounterLoading: false });
        else set({ siteError: error.message, encounterLoading: false });
      }
    };

    return {
      settings: loadSettings(storage),
      settingsOpen: false,
      learnerId: null,
      language: null,
      dungeon,
      progress: null,
      phase: 'attract',
      siteIndex: 0,
      walkFrom: null,
      cameraArrived: false,
      connection: 'idle', // idle | connecting | ready | offline
      serverProblem: null,
      starting: false,
      encounter: null,
      encounterLoading: false,
      siteError: null,
      spellbook: emptySpellbook,
      view: 'dialogue', // dialogue | spellbook | review
      reviewChallenge: null,
      reviewResult: null,
      assessment: null,
      draft: '',
      pendingInput: null,
      isLoading: false,
      error: null,

      setDraft: (draft) => set({ draft }),
      clearError: () => set({ error: null }),

      // Recovers the learner and the run. A run under way resumes at its next site and a finished one on the victory
      // screen. With no server, the attract and overview screens still work and serverProblem says why.
      initialize: () => {
        if (initializationPromise) return initializationPromise;
        const epoch = ++requestEpoch;
        initializationPromise = (async () => {
          const problem = settingsProblem(get().settings, { sameOrigin });
          if (problem) {
            set({ connection: 'offline', serverProblem: problem });
            initializationPromise = null;
            return;
          }
          set({ connection: 'connecting', serverProblem: null });
          try {
            const storedId = storage?.getItem?.(LEARNER_KEY) || null;
            const identity = await api.createLearner(storedId);
            if (epoch !== requestEpoch) return;
            try { storage?.setItem?.(LEARNER_KEY, identity.learnerId); } catch { /* private mode: a new learner next time */ }
            const view = await api.getDungeon(identity.learnerId, dungeon.id);
            if (epoch !== requestEpoch) return;
            set({ learnerId: identity.learnerId, language: identity.language ?? null, progress: view.progress, dungeon: mergeDungeon(dungeon, view.dungeon), connection: 'ready' });
            const { phase } = get();
            if (phase !== 'attract' && phase !== 'overview') return;
            if (view.progress.complete) showVictory();
            else if (view.progress.clearedEncounterIds.length > 0) {
              set({ phase: 'approach', siteIndex: view.progress.nextSiteIndex, walkFrom: null, cameraArrived: false, encounter: null });
              await loadSite();
            }
          } catch (error) {
            if (epoch === requestEpoch) set({ connection: 'offline', serverProblem: error.message });
            initializationPromise = null;
          }
        })();
        return initializationPromise;
      },

      enter: () => { if (get().phase === 'attract') set({ phase: 'overview' }); },

      start: async () => {
        if (get().phase !== 'overview' || get().starting) return;
        set({ starting: true });
        try {
          if (get().connection !== 'ready') await get().initialize();
          if (get().connection !== 'ready' || get().phase !== 'overview') return;
          const { progress } = get();
          if (progress?.complete) { showVictory(); return; }
          set({ phase: 'approach', siteIndex: progress?.nextSiteIndex ?? 0, walkFrom: null, cameraArrived: false, encounter: null, assessment: null, error: null, view: 'dialogue' });
        } finally { set({ starting: false }); }
        await loadSite();
      },

      // Called by the 3D view when the camera reaches the site (at once, with no WebGL).
      onCameraArrived: () => {
        if (!MOVING.has(get().phase) || get().cameraArrived) return;
        set({ cameraArrived: true });
        maybeOpen();
      },

      retrySite: () => loadSite(),
      // The site's conversation again from its first line.
      restartSite: async () => {
        if (get().phase !== 'encounter' || get().encounterLoading) return;
        await loadSite({ restart: true });
      },

      // After a site's encounter resolves: walk to the next site, or the victory screen after the last.
      walkOn: async () => {
        const s = get();
        if (s.phase !== 'encounter' || s.encounter?.state !== 'resolved') return;
        const knowsThisSite = (progress) => Boolean(progress?.clearedEncounterIds?.includes(s.encounter.encounterId));
        let progress = s.progress;
        if (!knowsThisSite(progress)) progress = (await refreshProgress(s.learnerId)) ?? progress;
        if (get().phase !== 'encounter' || get().encounter !== s.encounter) return;
        // Without an answer from the server the next site is the one after this; the server checks it on the start.
        const after = s.siteIndex + 1 < s.dungeon.sites.length ? s.siteIndex + 1 : null;
        const next = knowsThisSite(progress) ? progress.nextSiteIndex : after;
        if (next == null) { showVictory(); return; }
        set({ phase: 'walk', walkFrom: s.siteIndex, siteIndex: next, cameraArrived: false, encounter: null, assessment: null, view: 'dialogue', draft: '', pendingInput: null });
        await loadSite();
      },

      playAgain: async () => {
        const { learnerId, isLoading } = get();
        if (!learnerId || isLoading) return;
        const epoch = requestEpoch;
        const current = () => epoch === requestEpoch && get().learnerId === learnerId; // review 1 (R1.3): not after new settings
        set({ isLoading: true, error: null });
        try {
          const view = await api.resetDungeon(learnerId, dungeon.id);
          if (!current()) return;
          siteRequest += 1;
          progressRequest += 1; // a read of the finished run still in flight must not undo the reset (R1.2)
          set({ progress: view.progress, phase: 'overview', siteIndex: 0, walkFrom: null, cameraArrived: false, encounter: null, encounterLoading: false, siteError: null, assessment: null, isLoading: false, view: 'dialogue' });
        } catch (error) { if (current()) set({ error: error.message, isLoading: false }); }
      },

      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      // New settings reconnect: the learner and the run are fetched again from that server.
      saveSettings: async (values) => {
        const settings = persistSettings(values, storage);
        requestEpoch += 1;
        siteRequest += 1;
        progressRequest += 1;
        spellbookVersion += 1;
        initializationPromise = null;
        const phase = get().phase === 'attract' ? 'attract' : 'overview';
        set({
          settings, settingsOpen: false, learnerId: null, language: null, progress: null, connection: 'idle', serverProblem: null, dungeon,
          phase, siteIndex: 0, walkFrom: null, cameraArrived: false, encounter: null, encounterLoading: false, siteError: null, starting: false,
          spellbook: emptySpellbook, view: 'dialogue', reviewChallenge: null, reviewResult: null, assessment: null, isLoading: false, error: null,
        });
        await get().initialize();
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
          set({ encounter: result.encounter, spellbook: withSpellbook(result.spellbook), assessment: result.assessment, isLoading: false, pendingInput: null, draft: '' });
          if (result.encounter.state === 'resolved') await refreshProgress(learnerId);
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
          set({ encounter: result.encounter, spellbook: withSpellbook(result.spellbook), isLoading: false });
        } catch (error) { set({ error: error.message, isLoading: false }); }
      },

      // The Spellbook shows the last snapshot at once and the server's when it answers (cards fall due by the clock).
      openSpellbook: () => {
        set({ view: 'spellbook', reviewChallenge: null, reviewResult: null, error: null });
        const { learnerId } = get();
        if (!learnerId || !api.getSpellbook) return;
        const epoch = requestEpoch;
        const version = spellbookVersion;
        api.getSpellbook(learnerId).then((spellbook) => {
          // Not over a newer Spellbook: a read sent before a conversation opened would show its meanings (R1.4).
          const fresh = epoch === requestEpoch && version === spellbookVersion && get().learnerId === learnerId && get().view === 'spellbook';
          if (fresh && spellbook?.cards) set({ spellbook: withSpellbook(spellbook) });
        }).catch(() => {});
      },
      returnToDialogue: () => set({ view: 'dialogue', reviewChallenge: null, reviewResult: null, error: null }),

      startReview: async (vocabularyId) => {
        const { learnerId } = get();
        if (!learnerId) return;
        set({ isLoading: true, error: null, reviewResult: null });
        try {
          const result = await api.createReview(learnerId, vocabularyId);
          set({ reviewChallenge: result.challenge, spellbook: withSpellbook(result.spellbook), view: result.challenge ? 'review' : 'spellbook', isLoading: false });
        } catch (error) { set({ error: error.message, isLoading: false }); }
      },

      submitReview: async (answer) => {
        const { learnerId, reviewChallenge, isLoading } = get();
        if (!learnerId || !reviewChallenge || isLoading || !String(answer).trim()) return;
        set({ isLoading: true, error: null });
        try {
          const result = await api.submitReview(learnerId, { challengeId: reviewChallenge.id, attemptId: attemptId(), action: 'answer', answer: String(answer).trim() });
          set({ reviewResult: result.result, spellbook: withSpellbook(result.spellbook), reviewChallenge: null, isLoading: false });
        } catch (error) { set({ error: error.message, isLoading: false }); }
      },

      revealReviewAnswer: async () => {
        const { learnerId, reviewChallenge, isLoading } = get();
        if (!learnerId || !reviewChallenge || isLoading) return;
        set({ isLoading: true, error: null });
        try {
          const result = await api.submitReview(learnerId, { challengeId: reviewChallenge.id, attemptId: attemptId(), action: 'reveal', answer: '' });
          set({ reviewResult: result.result, spellbook: withSpellbook(result.spellbook), reviewChallenge: null, isLoading: false });
        } catch (error) { set({ error: error.message, isLoading: false }); }
      },
    };
  });
}
