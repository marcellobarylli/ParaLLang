// Round 144: The Journey 2 in the web client's store (gameStore.js spreads this slice into its state). The
// road is a mode beside the dungeon: `mode` is 'dungeon' or 'road', and in road mode `roadPhase` says what the dock
// shows:
//
//   hub        the player stands at a site: who is here, what waits ahead, the map, the curriculum
//   travel     the camera glides to a site; the conversation there is being written meanwhile
//   encounter  the conversation (the dialogue sheet of the dungeon, with the road's way on under it)
//
//   world --enterRoad--> hub --roadTalk--> encounter --(resolved) roadContinue | roadTravel(id)--> travel --> encounter
//   encounter (ongoing) --leaveRoadConversation--> hub        hub --leaveRoad--> world
//
// Round 175: the title screen (the dungeon store's `attract` phase) is the road's: it shows the landscape of
// `titleSeed` from above the clouds, over `titleAt`, both remembered in this browser (TITLE_KEY) from the last road
// read, or a seed drawn here for a new player. While it is up the road is read (preloadRoad), and a new player's road
// is made on that same seed. startJourney goes from the title into the road; toTitle comes back. From the map a
// player in a conversation may walk on: the conversation is left unfinished (roadTravel).
//
// The server decides everything (server/src/road/service.js): where the player may walk, what waits at each site
// and what a finished conversation does to the curriculum. `road` and `curriculum` are its view, as sent. On rails
// (a display preference, on by default) the way on is the server's `road.rails`: the pacing's own choice.

import { clampImmersion } from '../display.js';

// Round 175: the landscape the title screen shows, kept in this browser: { seed, at }.
export const TITLE_KEY = 'parallang.title';
const SEED_MAX = 2 ** 31 - 1;
/** The title's landscape from `storage`, or a new seed (and no site: the landscape's start) when there is none. */
export function titleOf(storage, random = Math.random) {
  try {
    const kept = JSON.parse(storage?.getItem?.(TITLE_KEY) ?? 'null');
    if (Number.isInteger(kept?.seed) && kept.seed >= 1 && kept.seed <= SEED_MAX) return { seed: kept.seed, at: typeof kept.at === 'string' ? kept.at : null };
  } catch { /* unreadable: a new one */ }
  return { seed: 1 + Math.floor(random() * (SEED_MAX - 1)), at: null };
}

export function createRoadSlice({ set, get, api, quiet, withSpellbook, takeProgression, guard, backup, takeGuide = () => {}, storage = null }) {
  const usable = (view) => typeof view?.road?.at === 'string' && Array.isArray(view.road.frontier) && Boolean(view.curriculum);
  const title = titleOf(storage);
  const takeRoad = (view) => {
    set({ road: view.road, curriculum: view.curriculum, titleSeed: view.road.seed, titleAt: view.road.at });
    try { storage?.setItem?.(TITLE_KEY, JSON.stringify({ seed: view.road.seed, at: view.road.at })); } catch { /* private mode */ }
    takeProgression(view.progression);
    takeGuide(view.guidebook); // round 157
  };

  // The newest read of the road wins, and one from before a move or another learner is dropped.
  let roadRequest = 0;
  const refreshRoad = async (learnerId) => {
    const request = ++roadRequest;
    const epoch = guard.epoch();
    try {
      const view = await api.getRoad(learnerId);
      if (request !== roadRequest || epoch !== guard.epoch() || get().learnerId !== learnerId || !usable(view)) return null;
      takeRoad(view);
      return view;
    } catch { return null; }
  };

  // Round 173: the view of the road in this browser's streamlined mode: as it is, or as the server answers once told
  // (a server from before the mode answers views without `streamlined` and is left as it is).
  const modeFor = async (learnerId, view) => {
    const wanted = get().display?.streamlined !== false;
    if (!api.setRoadMode || (view.road.streamlined ?? wanted) === wanted) return view;
    try { const told = await api.setRoadMode(learnerId, wanted); return usable(told) ? told : view; } catch { return view; }
  };

  // The conversation is on the screen once the camera is there and the conversation of this site is loaded.
  const maybeOpen = () => {
    const s = get();
    if (s.mode !== 'road' || s.roadPhase !== 'travel' || !s.roadArrived) return;
    if (s.encounter?.road && s.encounter.road.node === s.road?.at) set({ roadPhase: 'encounter' });
    else if (!s.encounterLoading) set({ roadPhase: 'hub' }); // the start failed: the hub says why and offers it again
  };

  return {
    mode: 'dungeon',
    road: null, // the server's view of the road
    curriculum: null, // the curriculum with the learner's marks
    roadPhase: 'hub',
    roadFrom: null, // the site the camera comes from, while it travels
    roadArrival: 'arrive', // how the 3D view should get to `road.at`: 'arrive' (from the sky), 'travel', 'stand'
    roadArrived: false,
    roadShown: 0, // counts the camera moves asked for, so the view takes each once
    roadLoading: false,
    roadTravelling: false, // a move is with the server
    roadError: null,
    roadResult: null, // what the last finished conversation did: { kind, score, passed?, opened? }
    roadPanel: null, // 'map' | 'curriculum' | 'journal' | null
    // Round 161 (issue #9): the map's "Show Journey so far". `journey` is the whole walk as the server keeps it
    // ({ seed, nodes, hops, kept }), read when the switch is turned on and after each walk while it is on.
    journeyShown: false,
    journey: null,
    journeyLoading: false,
    journeyRemark: null, // round 163: the narrator's remark on the journey shown ({ id, segments }), or null
    titleSeed: title.seed, // round 175: the landscape of the title screen
    titleAt: title.at, // and the site it looks down on (null: the landscape's start)
    journeyStarting: false, // round 175: the title's button was pressed and the road is not here yet

    // Round 175: the road read while the title is up. The road it brings (and, for a new player, makes on the
    // title's seed) is kept, so the start finds the world loaded.
    preloadRoad: async () => {
      const s = get();
      if (!s.learnerId || s.mode === 'road' || s.road) return;
      const learnerId = s.learnerId;
      const request = ++roadRequest;
      const epoch = guard.epoch();
      try {
        const view = await api.getRoad(learnerId, { seed: get().titleSeed });
        if (request !== roadRequest || epoch !== guard.epoch() || get().learnerId !== learnerId || !usable(view)) return;
        takeRoad(view);
      } catch { /* the start reads it again and says what went wrong */ }
    },

    // Round 175: the title's one button: into the road. The camera zooms down once the road is here.
    startJourney: async () => {
      const s = get();
      if (!['attract', 'world'].includes(s.phase) || s.mode === 'road' || s.journeyStarting) return;
      set({ phase: 'world', journeyStarting: true });
      try { await get().enterRoad(); } finally { set({ journeyStarting: false }); }
    },

    // Round 175: back to the title screen, from the road or from a place of the world map. A conversation under way
    // stays on the server, as it does when the road is left.
    toTitle: () => {
      const s = get();
      if (s.isLoading) return;
      if (s.mode === 'road') get().leaveRoad();
      else if (!['attract', 'world', 'overview', 'site', 'victory'].includes(s.phase) && !(s.phase === 'encounter' && s.encounter?.state !== 'ongoing')) return;
      set({ ...quiet, phase: 'attract' });
    },

    // From the world map into the road. The first look creates the road on the server.
    enterRoad: async () => {
      const s = get();
      if (s.phase !== 'world' || s.roadLoading) return;
      guard.bumpSite();
      set({ ...quiet, mode: 'road', roadPhase: 'hub', roadError: null, roadResult: null, roadPanel: null, roadLoading: true, roadFrom: null, roadArrival: 'arrive', roadArrived: false, roadShown: s.roadShown + 1 }); // the banner stays: it may say the save was put back
      try {
        if (get().connection !== 'ready') await get().initialize();
        if (get().mode !== 'road') return;
        if (get().connection !== 'ready') throw new Error(get().serverProblem ?? 'The server is not connected yet.');
        const learnerId = get().learnerId;
        let view = await api.getRoad(learnerId, { seed: get().titleSeed });
        if (get().mode !== 'road' || get().learnerId !== learnerId) return;
        if (!usable(view)) throw new Error('The server is being updated. Try again in a few minutes.');
        // Round 173: the road takes this browser's streamlined setting before it is shown.
        view = await modeFor(learnerId, view);
        if (get().mode !== 'road' || get().learnerId !== learnerId) return;
        roadRequest += 1;
        takeRoad(view);
        set({ roadLoading: false });
      } catch (error) {
        // A server from before the road has no such route.
        const message = error.status === 404 ? 'This server does not know the road yet. It is being updated: try again in a few minutes.' : error.message;
        if (get().mode === 'road') set({ roadLoading: false, roadError: error.code === 'RUN_LOST' ? null : message });
      }
    },

    // Back to the world map. A conversation under way stays on the server until another one starts.
    leaveRoad: () => {
      const s = get();
      if (s.mode !== 'road' || s.isLoading) return;
      guard.bumpSite();
      roadRequest += 1;
      set({ ...quiet, mode: 'dungeon', phase: 'world', roadPhase: 'hub', roadPanel: null, roadError: null, roadResult: null, roadTravelling: false, roadLoading: false, cameraArrived: false });
    },

    // The conversation waiting at the site the player stands at: a new one, or the one the store or the server holds.
    roadTalk: async ({ restart = false } = {}) => {
      const s = get();
      if (s.mode !== 'road' || !s.learnerId || s.encounterLoading) return;
      const held = !restart && s.encounter?.state === 'ongoing' && s.encounter.road?.node === s.road?.at;
      if (held) { set({ roadPhase: 'encounter', roadError: null, error: null }); return; }
      const learnerId = s.learnerId;
      const request = guard.bumpSite();
      const epoch = guard.epoch();
      const stale = () => request !== guard.site() || epoch !== guard.epoch() || get().mode !== 'road';
      set({ encounterLoading: true, roadError: null, error: null });
      const start = (again) => api.startEncounter(learnerId, { road: true, restart: again, immersion: clampImmersion(get().display?.immersion) });
      try {
        let result;
        try { result = await start(restart); }
        catch (error) {
          // A conversation from elsewhere (a dungeon site, a party member) is in the way: the road replaces it.
          if (restart || error.code !== 'CONVERSATION_UNDER_WAY' || stale()) throw error;
          result = await start(true);
        }
        if (stale()) return;
        set({ encounter: result.encounter, spellbook: withSpellbook(result.spellbook), encounterLoading: false, assessment: null, closedObjectives: 0, draft: '', pendingInput: null, xpGained: 0, levelUp: null, roadResult: null });
        if (get().roadPhase === 'travel') maybeOpen();
        else set({ roadPhase: 'encounter' });
      } catch (error) {
        if (stale()) return;
        set({ encounterLoading: false, roadError: error.code === 'RUN_LOST' ? null : error.message });
        maybeOpen();
      }
    },

    // A walk to a site of the frontier. The conversation there starts being written at once, so it is ready, or
    // nearly, when the camera arrives.
    roadTravel: async (nodeId) => {
      const s = get();
      const resolved = s.roadPhase === 'encounter' && s.encounter?.state === 'resolved';
      if (s.mode !== 'road' || !s.road || !s.learnerId || s.roadTravelling || s.encounterLoading || s.isLoading) return;
      // Round 175: from the map, a conversation under way may be left unfinished to walk on.
      const leaving = s.roadPhase === 'encounter' && s.encounter?.state === 'ongoing';
      if (s.roadPhase !== 'hub' && !resolved && !leaving) return;
      if (!s.road.frontier.some((site) => site.id === nodeId)) return;
      const learnerId = s.learnerId;
      const epoch = guard.epoch();
      const from = s.road.at;
      const current = () => epoch === guard.epoch() && get().learnerId === learnerId && get().mode === 'road';
      const move = (leave) => api.moveRoad(learnerId, { nodeId, ...(leave ? { leave: true } : {}) });
      set({ roadTravelling: true, roadError: null, error: null, roadPanel: null });
      guard.bumpSite();
      roadRequest += 1;
      try {
        let view;
        try { view = await move(s.encounter?.state === 'ongoing'); }
        catch (error) {
          if (error.code !== 'CONVERSATION_UNDER_WAY' || !current()) throw error;
          view = await move(true);
        }
        if (!current()) return;
        if (!usable(view)) throw new Error('The server is being updated. Try again in a few minutes.');
        roadRequest += 1;
        takeRoad(view);
        set({ ...quiet, roadPhase: 'travel', roadFrom: from, roadArrival: 'travel', roadArrived: false, roadShown: get().roadShown + 1, roadTravelling: false, roadResult: null });
        backup(learnerId);
        await get().roadTalk();
      } catch (error) {
        if (!current()) return;
        set({ roadTravelling: false, roadError: error.code === 'RUN_LOST' ? null : error.message });
        await refreshRoad(learnerId);
      }
    },

    // Round 173: the server's road in the streamlined mode of this browser's setting, after the setting changed.
    // Only once the road is read; entering the road tells it too. A failed call is tried again on the next entry.
    syncRoadMode: async () => {
      const s = get();
      if (!s.road || !s.learnerId) return;
      const learnerId = s.learnerId;
      const epoch = guard.epoch();
      const view = await modeFor(learnerId, { road: s.road, curriculum: s.curriculum });
      if (view.road === s.road || epoch !== guard.epoch() || get().learnerId !== learnerId || get().mode !== 'road') return;
      roadRequest += 1;
      takeRoad(view);
    },

    // On rails: the pacing's own next site.
    roadContinue: () => { const rails = get().road?.rails; return rails ? get().roadTravel(rails) : undefined; },

    // Called by the 3D view when the camera is at the site (at once, with no WebGL).
    onRoadArrived: () => {
      if (get().mode !== 'road' || get().roadArrived) return;
      set({ roadArrived: true });
      maybeOpen();
    },

    leaveRoadConversation: () => {
      const s = get();
      if (s.mode === 'road' && s.roadPhase === 'encounter' && s.encounter?.state === 'ongoing' && !s.isLoading) set({ roadPhase: 'hub', assessment: null, error: null });
    },
    // After a finished conversation, to the site's card (the map and the choices are there).
    toRoadHub: () => {
      const s = get();
      if (s.mode === 'road' && s.roadPhase === 'encounter' && s.encounter?.state === 'resolved') set({ ...quiet, roadPhase: 'hub' });
    },
    restartRoadConversation: () => { if (get().roadPhase === 'encounter' && !get().isLoading) return get().roadTalk({ restart: true }); return undefined; },

    toggleJourney: async () => {
      const s = get();
      if (s.mode !== 'road' || !s.learnerId) return;
      if (s.journeyShown) { set({ journeyShown: false }); return; }
      set({ journeyShown: true });
      await get().readJourney();
    },
    readJourney: async () => {
      const { learnerId } = get();
      if (!learnerId || !api.getRoadWalk || get().journeyLoading) return;
      const epoch = guard.epoch();
      set({ journeyLoading: true });
      try {
        const data = await api.getRoadWalk(learnerId);
        if (epoch !== guard.epoch() || get().learnerId !== learnerId) return;
        // Round 163: with the narrator's remark on a long journey, when it has one, and what it did to the guidebook.
        if (Array.isArray(data?.walk?.nodes)) set({ journey: data.walk, journeyRemark: data.narration ?? null });
        takeGuide(data?.guidebook);
      } catch (error) {
        if (epoch === guard.epoch()) set({ journeyShown: false, roadError: error.code === 'RUN_LOST' ? null : `The journey could not be read: ${error.message}` });
      } finally { if (epoch === guard.epoch()) set({ journeyLoading: false }); }
    },

    openRoadPanel: (panel) => {
      set({ roadPanel: panel, error: null });
      const { learnerId } = get();
      if (learnerId && get().mode === 'road') refreshRoad(learnerId);
      // The journey shown is read again: the player may have walked since.
      if (panel === 'map' && get().journeyShown) get().readJourney();
    },
    closeRoadPanel: () => set({ roadPanel: null }),

    // Another landscape. The curriculum's marks are kept unless `forget` is true.
    newRoad: async ({ forget = false } = {}) => {
      const s = get();
      if (s.mode !== 'road' || !s.learnerId || s.roadLoading || s.encounter?.state === 'ongoing') return;
      const learnerId = s.learnerId;
      guard.bumpSite();
      roadRequest += 1;
      set({ roadLoading: true, roadError: null, roadPanel: null });
      try {
        const view = await api.resetRoad(learnerId, forget ? { forget: true } : {});
        if (get().learnerId !== learnerId || get().mode !== 'road') return;
        takeRoad(view);
        set({ ...quiet, roadPhase: 'hub', roadLoading: false, roadFrom: null, roadArrival: 'arrive', roadArrived: false, roadShown: get().roadShown + 1, roadResult: null });
        backup(learnerId);
      } catch (error) { if (get().mode === 'road') set({ roadLoading: false, roadError: error.message }); }
    },

    // What the store does when a road conversation resolves (gameStore's sendMessage calls it with the reply).
    roadFinished: async (result, learnerId) => {
      set({ roadResult: result.roadResult ?? null });
      await refreshRoad(learnerId);
      backup(learnerId);
    },
    refreshRoad: () => { const { learnerId } = get(); return learnerId ? refreshRoad(learnerId) : null; },
  };
}
