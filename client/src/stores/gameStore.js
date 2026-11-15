import { create } from 'zustand';
import { createLearningApi } from '../api/encounter.js';
import { loadSettings, saveSettings as persistSettings, settingsProblem, SAME_ORIGIN_API } from '../api/settings.js';
import { loadDisplay, saveDisplay } from '../display.js';
import { unexploredSites } from '../dungeonModel.js';

// Round 115: the web client plays a dungeon. Round 119: the dungeon is a map under a world map. The flow:
//
//   attract --enter--> world --enterPlace--> overview (the temple map)
//   overview --start--> approach (to the site the player stands at) --> encounter (site not cleared) | site (cleared)
//   overview | site | encounter (resolved) --travel(siteId)--> walk --> encounter | site
//   encounter (ongoing) --leaveConversation--> site          site --talk--> encounter
//   encounter (goal resolved) --leaveTemple--> victory --playAgain--> world ; --stay--> overview
//
// The camera moves during approach and walk (src/scene/director.js). The dialogue opens when the camera has arrived
// (cameraArrived, set by the 3D view) and the site's encounter has loaded; at a cleared site the camera's arrival
// opens the site card. The server decides what a move may do (server/src/dungeon.js): `progress.sites` carries each
// site's fog state and whether it can be walked to now. The encounter, help, Spellbook and review actions are the
// old single-encounter client's (rounds 001-017).
//
// This module imports no YAML and no three.js: server/test/web-client.test.js loads it in plain Node.
const LEARNER_KEY = 'parallang.learnerId';
const emptySpellbook = { cards: [], dueCount: 0, contentVersion: null };
const attemptId = () => globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.random()}`;
const MOVING = new Set(['approach', 'walk']);
export const OLD_SERVER = 'The server is being updated. Try again in a few minutes.';

/** Each site's fog state and reachability, by id: the server's, or the unexplored map before it has answered. */
export const siteStatesOf = (state) => state.progress?.sites ?? unexploredSites(state.dungeon);

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

// The server's sites carry each character's name (null while the fog hides the site); the bundled file does not.
function mergeDungeon(bundled, served) {
  if (!served) return bundled;
  const names = new Map((served.sites ?? []).map((site) => [site.id, site.characterName ?? null]));
  return { ...bundled, name: served.name ?? bundled.name, sites: bundled.sites.map((site) => ({ ...site, characterName: names.get(site.id) ?? site.characterName })) };
}

// The server URL and access token come from the settings sheet (stored with the learner id). With no api given,
// requests read them from this store, so a saved change applies to the next request (round 114).
export function createGameStore({ api: givenApi, storage = browserStorage(), dungeon, atlas = null, sameOrigin = SAME_ORIGIN_API } = {}) {
  if (!dungeon) throw new Error('createGameStore needs the dungeon (src/dungeon.js)');
  let initializationPromise = null;
  let requestEpoch = 0; // a new learner or server: older replies are dropped
  let siteRequest = 0; // the newest site start wins
  let progressRequest = 0; // the newest read of the run wins, and a reset outdates every read before it
  let spellbookVersion = 0; // counts the Spellbooks taken from replies, so a slower, older read is not applied over them

  return create((set, get) => {
    const api = givenApi ?? createLearningApi({ getSettings: () => get().settings });
    const siteIndexOf = (encounterId) => get().dungeon.sites.findIndex((site) => site.encounterId === encounterId);
    const indexOfSite = (siteId) => get().dungeon.sites.findIndex((site) => site.id === siteId);
    const clearedAt = (index, progress = get().progress) => Boolean(progress?.sites?.[get().dungeon.sites[index]?.id]?.cleared);

    // The camera is there: the dialogue opens once the site's encounter is loaded, or the site card at once when no
    // conversation was asked for (a cleared site).
    const maybeOpen = () => {
      const s = get();
      if (!MOVING.has(s.phase) || !s.cameraArrived) return;
      const site = s.dungeon.sites[s.siteIndex];
      if (s.arrival === 'site') set({ phase: 'site' });
      else if (s.encounter && s.encounter.encounterId === site?.encounterId) set({ phase: 'encounter' });
    };

    // A server from before round 119 answers without the player's position.
    const usable = (view) => typeof view?.progress?.at === 'string' && Boolean(view.progress.sites);
    const takeView = (view) => set({ progress: view.progress, dungeon: mergeDungeon(dungeon, view.dungeon) });

    // Review 1 (R1.2): a read that a reset, new settings or a newer read has overtaken is dropped.
    const refreshProgress = async (learnerId) => {
      const request = ++progressRequest;
      const epoch = requestEpoch;
      try {
        const view = await api.getDungeon(learnerId, dungeon.id);
        if (request !== progressRequest || epoch !== requestEpoch || get().learnerId !== learnerId || !usable(view)) return null;
        takeView(view);
        return view.progress;
      } catch { return null; }
    };

    // Every Spellbook from a reply goes through here (review 1, R1.4).
    const withSpellbook = (spellbook) => { spellbookVersion += 1; return spellbook; };

    const quiet = { encounter: null, encounterLoading: false, siteError: null, assessment: null, closedObjectives: 0, view: 'dialogue', draft: '', pendingInput: null };
    const showVictory = () => set({ ...quiet, phase: 'victory', cameraArrived: false });

    // The camera sets off to site `index` (from site `walkFrom`, or down from wherever it is). A site that is not
    // cleared opens its conversation on arrival; a cleared one opens the site card.
    const setOff = (index, walkFrom, progress = get().progress) => {
      const talk = !clearedAt(index, progress);
      set({ ...quiet, phase: walkFrom === null ? 'approach' : 'walk', siteIndex: index, walkFrom, cameraArrived: false, arrival: talk ? 'encounter' : 'site', error: null });
      return talk;
    };

    // Starts the conversation of the site the player stands at (the server knows which) and takes the site from the
    // reply.
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
        const patch = { encounter: result.encounter, spellbook: withSpellbook(result.spellbook), encounterLoading: false, assessment: null, closedObjectives: 0, draft: '', pendingInput: null };
        const index = siteIndexOf(result.encounter.encounterId);
        // Another tab moved the player: the camera goes to the site the server started.
        if (index >= 0 && index !== get().siteIndex) Object.assign(patch, { siteIndex: index, phase: 'approach', walkFrom: null, cameraArrived: false, arrival: 'encounter' });
        set(patch);
        // "Talk" on the site card: the camera is already there.
        if (get().phase === 'site' && index === get().siteIndex) set({ phase: 'encounter' });
        else maybeOpen();
      } catch (error) {
        if (stale()) return;
        // A failed start on the way to a site shows in the travel caption, with a retry. A failed Start over or Talk
        // leaves the player where they are, and the banner says so (review 1, R1.5).
        if (get().phase === 'encounter') set({ error: `The conversation could not start over: ${error.message}`, encounterLoading: false });
        else if (get().phase === 'site') set({ error: `The conversation could not start: ${error.message}`, encounterLoading: false });
        else set({ siteError: error.message, encounterLoading: false });
      }
    };

    return {
      settings: loadSettings(storage),
      display: loadDisplay(storage),
      settingsOpen: false,
      learnerId: null,
      language: null,
      dungeon,
      atlas,
      progress: null,
      phase: 'attract',
      siteIndex: Math.max(0, dungeon.sites.findIndex((site) => site.id === dungeon.start)),
      walkFrom: null,
      cameraArrived: false,
      arrival: 'encounter', // what the camera's arrival opens: the conversation, or the site card ('site')
      travelling: false, // a move is with the server
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
      // Round 116: what the camera follows in a conversation. closedObjectives counts the objectives closed in it,
      // and beat numbers each verdict ({ id, kind }: 'pass', 'fail' or 'resolved').
      closedObjectives: 0,
      beat: null,
      draft: '',
      pendingInput: null,
      isLoading: false,
      error: null,

      setDraft: (draft) => set({ draft }),
      clearError: () => set({ error: null }),

      // Recovers the learner and the run. A run under way resumes at the site the player stands at and a finished one
      // on the victory screen. With no server, the title, the world map and the temple map still work and
      // serverProblem says why.
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
            if (!usable(view)) throw new Error(OLD_SERVER);
            set({ learnerId: identity.learnerId, language: identity.language ?? null, connection: 'ready' });
            takeView(view);
            // A reload resumes from the title. A player who has already gone on to the maps is left there.
            if (get().phase !== 'attract') return;
            const { progress } = view;
            if (progress.complete) showVictory();
            else if (progress.clearedSiteIds.length > 0 || progress.visitedSiteIds.length > 1) {
              if (setOff(indexOfSite(progress.at), null, progress)) await loadSite();
            }
          } catch (error) {
            if (epoch === requestEpoch) set({ connection: 'offline', serverProblem: error.message });
            initializationPromise = null;
          }
        })();
        return initializationPromise;
      },

      enter: () => { if (get().phase === 'attract') set({ phase: 'world' }); },
      // The world map: only a place whose dungeon this client holds can be entered.
      enterPlace: (placeId) => {
        const place = get().atlas?.places.find((candidate) => candidate.id === placeId);
        if (get().phase === 'world' && (!get().atlas || place?.dungeonId === dungeon.id)) set({ phase: 'overview' });
      },
      toWorld: () => { if (get().phase === 'overview') set({ phase: 'world' }); },

      // The temple map's main button: down to the site the player stands at.
      start: async () => {
        if (get().phase !== 'overview' || get().starting) return;
        set({ starting: true });
        let talk = false;
        try {
          if (get().connection !== 'ready') await get().initialize();
          if (get().connection !== 'ready' || get().phase !== 'overview') return;
          const { progress } = get();
          talk = setOff(Math.max(0, indexOfSite(progress?.at)), null);
        } finally { set({ starting: false }); }
        if (talk) await loadSite();
      },

      // A walk to a neighbouring site the server calls reachable. A conversation the store still holds is left
      // behind (critique 1.1); one the server alone holds (a reload) is left on its refusal.
      travel: async (siteId) => {
        const s = get();
        const open = s.phase === 'overview' || s.phase === 'site' || (s.phase === 'encounter' && s.encounter?.state === 'resolved') || (MOVING.has(s.phase) && Boolean(s.siteError));
        const target = indexOfSite(siteId);
        if (!open || s.travelling || !s.learnerId || target < 0 || !siteStatesOf(s)[siteId]?.reachable) return;
        const learnerId = s.learnerId;
        const epoch = requestEpoch;
        const from = indexOfSite(s.progress.at);
        const current = () => epoch === requestEpoch && get().learnerId === learnerId;
        const move = (leave) => api.moveDungeon(learnerId, dungeon.id, { siteId, ...(leave ? { leave: true } : {}) });
        set({ travelling: true, error: null });
        siteRequest += 1; // a site start still in flight belongs to the place the player is leaving
        progressRequest += 1;
        try {
          let view;
          try { view = await move(s.encounter?.state === 'ongoing'); }
          catch (error) {
            if (error.code !== 'CONVERSATION_UNDER_WAY' || !current()) throw error;
            view = await move(true);
          }
          if (!current()) return;
          if (!usable(view)) throw new Error(OLD_SERVER);
          progressRequest += 1;
          takeView(view);
          const talk = setOff(target, from < 0 || from === target ? null : from, view.progress);
          set({ travelling: false });
          if (talk) await loadSite();
        } catch (error) {
          if (!current()) return;
          set({ error: error.message, travelling: false });
          await refreshProgress(learnerId);
        } finally { if (current() && get().travelling) set({ travelling: false }); }
      },

      // From a site (its card, a resolved conversation, a start that failed) up to the temple map.
      openMap: () => {
        const s = get();
        if (s.phase === 'site' || (s.phase === 'encounter' && s.encounter?.state === 'resolved') || (MOVING.has(s.phase) && Boolean(s.siteError))) {
          siteRequest += 1;
          set({ ...quiet, phase: 'overview', cameraArrived: false });
        }
      },

      // Out of a conversation under way, to the site card. The store keeps the conversation for "Back to the conversation".
      leaveConversation: () => {
        const s = get();
        if (s.phase === 'encounter' && s.encounter?.state === 'ongoing' && !s.isLoading) set({ phase: 'site', assessment: null, error: null });
      },

      // The site card's Talk: back into the conversation the store holds, or a start (a cleared site's from its first line).
      talk: async () => {
        const s = get();
        if (s.phase !== 'site' || s.encounterLoading) return;
        const site = s.dungeon.sites[s.siteIndex];
        if (s.encounter?.state === 'ongoing' && s.encounter.encounterId === site?.encounterId) { set({ phase: 'encounter', error: null }); return; }
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

      // After the goal's encounter resolves: out to the victory screen.
      leaveTemple: () => {
        const s = get();
        if (s.phase === 'encounter' && s.encounter?.state === 'resolved' && s.dungeon.sites[s.siteIndex]?.id === s.dungeon.goal) showVictory();
      },
      // The victory screen's other way out: the finished run stays open (critique 1.3).
      stay: () => { if (get().phase === 'victory') set({ phase: 'overview' }); },

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
          if (!usable(view)) throw new Error(OLD_SERVER);
          takeView(view);
          set({ ...quiet, phase: 'world', siteIndex: Math.max(0, indexOfSite(view.progress.at)), walkFrom: null, cameraArrived: false, isLoading: false });
        } catch (error) { if (current()) set({ error: error.message, isLoading: false }); }
      },

      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      // Round 117: a display preference. It makes no request and leaves the run and the conversation alone.
      setPanelOpacity: (value) => set({ display: saveDisplay({ ...get().display, panelOpacity: value }, storage) }),
      // New settings reconnect: the learner and the run are fetched again from that server.
      saveSettings: async (values) => {
        const settings = persistSettings(values, storage);
        requestEpoch += 1;
        siteRequest += 1;
        progressRequest += 1;
        spellbookVersion += 1;
        initializationPromise = null;
        const phase = ['attract', 'world'].includes(get().phase) ? get().phase : 'overview';
        set({
          settings, settingsOpen: false, learnerId: null, language: null, progress: null, connection: 'idle', serverProblem: null, dungeon,
          phase, siteIndex: Math.max(0, dungeon.sites.findIndex((site) => site.id === dungeon.start)), walkFrom: null, cameraArrived: false, arrival: 'encounter', travelling: false, encounter: null, encounterLoading: false, siteError: null, starting: false,
          spellbook: emptySpellbook, view: 'dialogue', reviewChallenge: null, reviewResult: null, assessment: null, closedObjectives: 0, isLoading: false, error: null,
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
          // A held pass (said too early in an ordered encounter) closes nothing (round 051).
          const closed = (result.assessment?.objectiveResults ?? []).filter((entry) => entry.passed && !entry.held).length;
          const kind = result.encounter.state === 'resolved' ? 'resolved' : closed > 0 ? 'pass' : 'fail';
          set({
            encounter: result.encounter, spellbook: withSpellbook(result.spellbook), assessment: result.assessment, isLoading: false, pendingInput: null, draft: '',
            closedObjectives: get().closedObjectives + closed, beat: { id: (get().beat?.id ?? 0) + 1, kind },
          });
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
