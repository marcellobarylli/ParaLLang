import { create } from 'zustand';
import { createLearningApi } from '../api/encounter.js';
import { loadSettings, saveSettings as persistSettings, settingsProblem, SAME_ORIGIN_API } from '../api/settings.js';
import { clampImmersion, clampVolume, immersionOf, loadDisplay, saveDisplay, volumesOf } from '../display.js';
import { chooseSlot, clearSlot, currentSlot, learnerOf, slotSummaries, slottedStorage } from '../slots.js';
import { unexploredSites } from '../dungeonModel.js';
import { createRoadSlice } from './roadSlice.js';

// Round 148: the share of target language the player chose (Settings), as the server takes it.
export { immersionOf } from '../display.js';

// Round 115: the web client plays a dungeon. Round 119: the dungeon is a map under a world map. The flow:
//
//   attract --enter--> world --enterPlace--> overview (the temple map; round 133: of the place entered)
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
// Round 120: the party. A saveable character whose site is cleared can be saved (recruit), and a member can be talked
// to from anywhere outside a conversation (talkTo): the phase `party` is that conversation, and leaveParty returns
// to where it was opened. An unfinished party conversation stays on the server until another conversation starts.
//
// Round 121: experience and levels. `progression` ({ xp, level, levelStartsAt, nextLevelAt }) comes with the map and
// with each dialogue and review reply; XP in the store never goes down for one learner. A reply that raises the
// level reads the map again, because a level seal may have opened.
//
// This module imports no YAML and no three.js: server/test/web-client.test.js loads it in plain Node.
const LEARNER_KEY = 'parallang.learnerId';
// Round 133: the place on the world map the player last entered. The server keeps a run per dungeon; which place
// the player is in is the browser's to remember.
export const PLACE_KEY = 'parallang.placeId';
// Shown when the server no longer knows the learner (its saves were wiped by a restart).
export const RUN_LOST = 'The server was restarted and lost your run with it. A new run has started.';
// Round 144: the whole save is copied to this browser after each finished conversation, review and walk on the road,
// and put back when the server has lost it (the free hosting plan wipes its files on every restart).
export const BACKUP_KEY = 'parallang.save';
export const RUN_RESTORED = 'The server had lost your run. It was put back from the copy this browser keeps.';
export const COPY_LOADED = 'The saved run was loaded.';
const emptySpellbook = { cards: [], dueCount: 0, contentVersion: null };
const attemptId = () => globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.random()}`;
const MOVING = new Set(['approach', 'walk']);
export const OLD_SERVER = 'The server is being updated. Try again in a few minutes.';

/** Each site's fog state and reachability, by id: the server's, or the unexplored map before it has answered. */
// Round 174: which conversation the player chose to keep chatting in, after it was complete (its id and first line).
export const chatKeyOf = (encounter) => (encounter ? `${encounter.id}:${encounter.transcript?.[0]?.id ?? ''}` : null);
export const siteStatesOf = (state) => state.progress?.sites ?? unexploredSites(state.dungeon);

function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

// The server's sites carry each character's name and whether the character can be saved to the party (both null
// while the fog hides the site); the bundled file does not.
function mergeDungeon(bundled, served) {
  if (!served) return bundled;
  const byId = new Map((served.sites ?? []).map((site) => [site.id, site]));
  return {
    ...bundled, name: served.name ?? bundled.name,
    sites: bundled.sites.map((site) => ({ ...site, characterName: byId.get(site.id)?.characterName ?? site.characterName, saveable: byId.get(site.id)?.saveable ?? site.saveable ?? null })),
  };
}

// The server URL and access token come from the settings sheet (stored with the learner id). With no api given,
// requests read them from this store, so a saved change applies to the next request (round 114).
// Round 133: `dungeons` is every dungeon a place on the world map may open (`dungeon`, the first one, is always among
// them). The store plays one at a time: `enterPlace` switches, and a reload opens the place last entered.
export function createGameStore({ api: givenApi, storage: baseStorage = browserStorage(), dungeon: firstDungeon, dungeons = null, atlas = null, sameOrigin = SAME_ORIGIN_API, reload = () => globalThis.location?.reload?.() } = {}) {
  // Round 178: the save slot this page plays; every per-learner key the store reads or writes is the slot's own.
  const slot = currentSlot(baseStorage);
  const storage = slottedStorage(baseStorage, slot);
  if (!firstDungeon) throw new Error('createGameStore needs the dungeon (src/dungeon.js)');
  const bundled = new Map([firstDungeon, ...(dungeons ?? [])].map((entry) => [entry.id, entry]));
  let dungeon = firstDungeon; // the bundled file of the dungeon the player is in
  try {
    const stored = atlas?.places.find((place) => place.id === storage?.getItem?.(PLACE_KEY));
    if (stored?.dungeonId && bundled.has(stored.dungeonId)) dungeon = bundled.get(stored.dungeonId);
  } catch { /* no storage: the first dungeon */ }
  const startIndex = (of) => Math.max(0, of.sites.findIndex((site) => site.id === of.start));
  // Round 175: a reload opens on the title. The place the player was last in resumes its run where it was the first
  // time it is entered from the world map (as a reload itself used to): at the site the player stands at, or on the
  // victory screen of a finished run.
  const openedWith = dungeon;
  let resumed = false;
  let initializationPromise = null;
  let requestEpoch = 0; // a new learner or server: older replies are dropped
  let siteRequest = 0; // the newest site start wins
  let progressRequest = 0; // the newest read of the run wins, and a reset outdates every read before it
  let partyRequest = 0; // the newest read or write of the party wins (round 120, critique 1.6)
  let runEpoch = 0; // a new run: a move's reply from the run before it is dropped (review 1 of round 119, R1.5)
  let spellbookVersion = 0; // counts the Spellbooks taken from replies, so a slower, older read is not applied over them

  return create((set, get) => {
    // The server lost this learner: on the free hosting plan every restart of the server (each deploy) wipes its
    // saves, and the page still holds the old learner's id. Any request then fails with "Unknown learner ID". The run
    // cannot be had back, so the page says what happened and starts a new one, instead of leaving a dead conversation
    // on the screen. (The code is for a server that sends one; today's sends only the message.)
    const isLostLearner = (error) => error?.code === 'UNKNOWN_LEARNER' || /unknown learner id/i.test(error?.message ?? '');
    const rawApi = givenApi ?? createLearningApi({ getSettings: () => get().settings });
    const api = new Proxy(rawApi, {
      get(target, key) {
        const call = target[key];
        if (typeof call !== 'function' || key === 'createLearner') return call;
        return async (...args) => {
          try { return await call.apply(target, args); }
          catch (error) {
            if (!isLostLearner(error)) throw error;
            get().recoverLostRun();
            throw Object.assign(new Error(RUN_LOST), { code: 'RUN_LOST' });
          }
        };
      },
    });
    // Round 144: this browser's copy of the save. Read and written past the proxy above: a lost learner is what the
    // copy is for, not a reason to start again.
    const readBackup = () => {
      try { const copy = JSON.parse(storage?.getItem?.(BACKUP_KEY) ?? 'null'); return typeof copy?.save?.learnerId === 'string' ? copy : null; }
      catch { return null; }
    };
    const backup = async (learnerId) => {
      if (!rawApi.exportSave || !learnerId) return;
      const epoch = requestEpoch;
      try {
        const copy = await rawApi.exportSave(learnerId);
        if (epoch !== requestEpoch || get().learnerId !== learnerId || copy?.save?.learnerId !== learnerId) return;
        try { storage?.setItem?.(BACKUP_KEY, JSON.stringify(copy)); } catch { return; } // no room, or private mode
        set({ savedAt: copy.exportedAt ?? null });
      } catch { /* the next one will do */ }
    };
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
    // Round 121 (critique 1.1): the newest experience is the highest, so an older reply cannot put older XP back.
    // Returns the new level when this reply raised it, null otherwise.
    const takeProgression = (incoming) => {
      if (!incoming || !Number.isInteger(incoming.xp) || !Number.isInteger(incoming.level)) return null;
      const current = get().progression;
      if (current && incoming.xp < current.xp) return null;
      set({ progression: incoming });
      return current && incoming.level > current.level ? incoming.level : null;
    };
    // Round 157: what a view says of the guidebook ({ count, unread }); a server before it says nothing.
    const takeGuide = (note) => { if (note && Array.isArray(note.unread)) set({ guideNote: note }); };
    // Round 133: what the world map shows of a dungeon's run.
    const runOf = (of, progress) => ({ cleared: of.sites.filter((site) => progress.sites[site.id]?.cleared).length, total: of.sites.length, complete: Boolean(progress.complete) });
    const takeView = (view) => {
      // Round 156: with the narrator's passage for the site the player stands at (null from a server before it).
      takeGuide(view.guidebook);
      set({ progress: view.progress, narration: view.narration ?? null, dungeon: mergeDungeon(dungeon, view.dungeon), runs: { ...get().runs, [dungeon.id]: runOf(dungeon, view.progress) } });
      takeProgression(view.progression);
    };
    // The runs of the dungeons the player is not in, for the world map's counts. Nothing waits for them.
    const readOtherRuns = (learnerId) => {
      const epoch = requestEpoch;
      for (const other of bundled.values()) {
        if (other.id === dungeon.id) continue;
        api.getDungeon(learnerId, other.id).then((view) => {
          // Not for the dungeon the player has entered meanwhile: its own read is the newer one.
          if (epoch !== requestEpoch || get().learnerId !== learnerId || !usable(view) || other.id === dungeon.id) return;
          set({ runs: { ...get().runs, [other.id]: runOf(other, view.progress) } });
          takeProgression(view.progression);
        }).catch(() => {});
      }
    };

    // A review's reply: its result with what it earned (round 121), and the map again if it raised the level.
    const tookReview = (result, learnerId) => {
      const levelUp = takeProgression(result.progression);
      set({
        reviewResult: { ...result.result, xpGained: Number.isInteger(result.xpGained) ? result.xpGained : 0, levelUp },
        spellbook: withSpellbook(result.spellbook), reviewChallenge: null, isLoading: false,
      });
      if (levelUp) refreshProgress(learnerId);
      backup(learnerId); // round 144
    };

    // Review 1 (R1.2): a read that a reset, new settings or a newer read has overtaken is dropped.
    const refreshProgress = async (learnerId) => {
      const request = ++progressRequest;
      const epoch = requestEpoch;
      const asked = dungeon;
      try {
        const view = await api.getDungeon(learnerId, asked.id);
        if (request !== progressRequest || epoch !== requestEpoch || asked !== dungeon || get().learnerId !== learnerId || !usable(view)) return null;
        takeView(view);
        return view.progress;
      } catch { return null; }
    };

    // Round 120: the party is read beside the map, when its panel opens and after a member's conversation resolves.
    // A reply that a newer read or a recruit has overtaken is dropped.
    const refreshParty = async (learnerId) => {
      const request = ++partyRequest;
      const epoch = requestEpoch;
      try {
        const data = await api.getParty(learnerId);
        if (request !== partyRequest || epoch !== requestEpoch || get().learnerId !== learnerId || !Array.isArray(data?.party)) return;
        set({ party: data.party });
      } catch { /* the party the store holds stays */ }
    };

    // Every Spellbook from a reply goes through here (review 1, R1.4).
    const withSpellbook = (spellbook) => { spellbookVersion += 1; return spellbook; };

    // Review 1 of round 120 (R1.1): a Talk the player walked away from is no longer starting.
    const quiet = { encounter: null, encounterLoading: false, partyStarting: null, siteError: null, assessment: null, xpGained: 0, levelUp: null, closedObjectives: 0, view: 'dialogue', draft: '', pendingInput: null };
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
    // Returns the start of the site's conversation, when there is one to wait for.
    const resumeOnce = (entered) => {
      if (resumed || entered !== openedWith) return undefined;
      resumed = true;
      const { progress } = get();
      if (!progress) return undefined;
      if (progress.complete) { showVictory(); return undefined; }
      if (progress.clearedSiteIds.length > 0 || progress.visitedSiteIds.length > 1) {
        if (setOff(indexOfSite(progress.at), null, progress)) return loadSite();
      }
      return undefined;
    };
    const loadSite = async ({ restart = false } = {}) => {
      const { learnerId } = get();
      if (!learnerId) return;
      const request = ++siteRequest;
      const epoch = requestEpoch;
      const stale = () => request !== siteRequest || epoch !== requestEpoch;
      set({ encounterLoading: true, siteError: null, error: null });
      const startSite = (again) => api.startEncounter(learnerId, { dungeonId: dungeon.id, restart: again, immersion: immersionOf(get()) });
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
        takeGuide(result.guidebook); // round 157: the first conversation in a dungeon may have entered an entry
        const patch = { encounter: result.encounter, spellbook: withSpellbook(result.spellbook), encounterLoading: false, assessment: null, closedObjectives: 0, draft: '', pendingInput: null };
        const index = siteIndexOf(result.encounter.encounterId);
        // Another tab moved the player: the camera goes to the site the server started.
        const elsewhere = index >= 0 && index !== get().siteIndex;
        if (elsewhere) Object.assign(patch, { siteIndex: index, phase: 'approach', walkFrom: null, cameraArrived: false, arrival: 'encounter' });
        set(patch);
        if (elsewhere) refreshProgress(learnerId); // the map this store holds is the other tab's past
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
      // Round 144: The Journey 2 (roadSlice.js).
      ...createRoadSlice({
        set, get, api, quiet, withSpellbook, takeProgression, backup, takeGuide, storage,
        guard: { epoch: () => requestEpoch, site: () => siteRequest, bumpSite: () => { siteRequest += 1; return siteRequest; } },
      }),
      savedAt: null, // when this browser's copy of the save was last written (the server's clock)
      saveStore: null, // round 146: where the server keeps its saves (its health check's `saves`), read when Settings opens
      settings: loadSettings(storage),
      display: loadDisplay(storage),
      settingsOpen: false,
      learnerId: null,
      language: null,
      dungeon,
      atlas,
      legacy: Object.fromEntries(bundled), // round 160: the bundled dungeons by id: the road's gates are played in them
      enterable: [...bundled.keys()], // round 133: the dungeons this client holds; a place opens only one of these
      runs: {}, // round 133: { [dungeonId]: { cleared, total, complete } }, as far as the server has been read
      progress: null,
      guideNote: null, // round 157: { count, unread }: the guidebook's size and the entries not yet read
      guidebook: null, // the guidebook as last read ({ entries, total }), while its panel is open
      narration: null, // round 156: the narrator's passage for the dungeon site the player stands at
      progression: null, // round 121: { xp, level, levelStartsAt, nextLevelAt }, or null with a server that sends none
      xpGained: 0, // what the last answer earned
      levelUp: null, // the level the last answer or review reached, if it raised it
      party: [], // round 120: the server's list of members
      partyReturn: null, // the phase a party conversation returns to
      partyStarting: null, // the conversation Talk has asked the server for
      recruiting: false,
      phase: 'attract',
      siteIndex: startIndex(dungeon),
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
      chatKey: null, // round 174: chatKeyOf the complete conversation the player keeps chatting in
      beat: null,
      draft: '',
      pendingInput: null,
      isLoading: false,
      error: null,

      // Round 178: save slots. Switching stores the choice and reloads the page into that slot; an empty slot starts a
      // new game there. A slot other than the one in use can be emptied.
      slot,
      slotsOpen: false,
      saveSlots: [],
      openSlots: () => set({ slotsOpen: true, saveSlots: slotSummaries(baseStorage) }),
      closeSlots: () => set({ slotsOpen: false }),
      switchSlot: (next) => {
        if (next === slot) { set({ slotsOpen: false }); return false; }
        if (!chooseSlot(baseStorage, next)) return false;
        reload();
        return true;
      },
      // Round 179: a slot deleted: its save is removed from the server, then from this browser. The slot in use is
      // started over: deleted the same way, and the page reloads into a new game in it. A server that cannot be
      // reached leaves its copy (unreachable from this browser); the slot is emptied all the same.
      deleteSlot: async (which) => {
        const id = learnerOf(baseStorage, which);
        let serverDeleted = !id;
        if (id && rawApi.deleteLearner) {
          try { await rawApi.deleteLearner(id); serverDeleted = true; } catch { serverDeleted = false; }
        }
        const done = clearSlot(baseStorage, which, { current: true });
        if (done && which === slot) { reload(); return { done, serverDeleted, reloading: true }; }
        set({ saveSlots: slotSummaries(baseStorage) });
        return { done, serverDeleted, reloading: false };
      },
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
            // Round 144: the server did not know this learner and has made an empty save for the id. If this browser
            // keeps a copy of that learner's save, it goes back in its place.
            const copy = readBackup();
            let restored = false;
            if (identity.recovered === false && storedId && copy?.save.learnerId === identity.learnerId && rawApi.restoreSave) {
              try { await rawApi.restoreSave({ ...copy, replace: true }); restored = true; } catch { /* the new, empty run stays */ }
              if (epoch !== requestEpoch) return;
            }
            set({ savedAt: copy?.save.learnerId === identity.learnerId ? (copy.exportedAt ?? null) : null, ...(restored ? { error: RUN_RESTORED } : {}) });
            const asked = dungeon;
            const view = await api.getDungeon(identity.learnerId, asked.id);
            if (epoch !== requestEpoch) return;
            if (!usable(view)) throw new Error(OLD_SERVER);
            set({ learnerId: identity.learnerId, language: identity.language ?? null, connection: 'ready' });
            if (bundled.size > 1) readOtherRuns(identity.learnerId);
            // Round 133: the player entered another place while the server was answering. Its run is read instead.
            if (asked !== dungeon) {
              if (api.getParty) refreshParty(identity.learnerId);
              await refreshProgress(identity.learnerId);
              return;
            }
            takeView(view);
            if (api.getParty) refreshParty(identity.learnerId); // beside the map; the title does not wait for it
            // Round 175: the title screen is The Journey 2's. While it is up the road is read (and, for a new player,
            // made on the landscape the title shows), so that the world is loaded by the time the player starts.
            // A dungeon's run resumes when its place is entered from the world map.
            if (get().phase === 'attract' && get().mode !== 'road') get().preloadRoad();
          } catch (error) {
            if (epoch === requestEpoch) set({ connection: 'offline', serverProblem: error.message });
            initializationPromise = null;
          }
        })();
        return initializationPromise;
      },

      enter: () => { if (get().phase === 'attract') set({ phase: 'world' }); },
      // The world map: only a place whose dungeon this client holds can be entered. Round 133: entering another
      // place than the one the player is in switches the dungeon. Replies still on their way belong to the place
      // left and are dropped, the new place's run is read, and the place is remembered for the next visit.
      enterPlace: (placeId) => {
        const s = get();
        if (s.phase !== 'world') return;
        if (!s.atlas) { set({ phase: 'overview' }); return resumeOnce(dungeon); }
        const place = s.atlas.places.find((candidate) => candidate.id === placeId);
        const next = place?.dungeonId ? bundled.get(place.dungeonId) : null;
        if (!next) return;
        if (next !== dungeon) {
          dungeon = next;
          siteRequest += 1;
          progressRequest += 1;
          runEpoch += 1;
          set({ ...quiet, dungeon, progress: null, narration: null, siteIndex: startIndex(dungeon), walkFrom: null, cameraArrived: false, arrival: 'encounter', travelling: false, starting: false, partyReturn: null, error: null });
          if (s.learnerId) refreshProgress(s.learnerId);
        }
        try { storage?.setItem?.(PLACE_KEY, place.id); } catch { /* private mode: the first dungeon next time */ }
        set({ phase: 'overview' });
        return resumeOnce(next);
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
          // Round 133: just after a change of place the run may not be read yet.
          if (!get().progress) await refreshProgress(get().learnerId);
          if (get().phase !== 'overview') return;
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
        // Not while a site start is with the server (Talk on the site card): its reply would find the player gone.
        if (!open || s.travelling || s.encounterLoading || !s.learnerId || target < 0 || !siteStatesOf(s)[siteId]?.reachable) return;
        const learnerId = s.learnerId;
        const epoch = requestEpoch;
        const from = indexOfSite(s.progress.at);
        const run = runEpoch;
        const current = () => epoch === requestEpoch && run === runEpoch && get().learnerId === learnerId;
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
        } finally { if (epoch === requestEpoch && get().learnerId === learnerId && get().travelling) set({ travelling: false }); }
      },

      // From a site (its card, a resolved conversation, a start that failed) up to the temple map.
      openMap: () => {
        const s = get();
        if (s.phase === 'site' || (s.phase === 'encounter' && s.encounter?.state === 'resolved') || (MOVING.has(s.phase) && Boolean(s.siteError))) {
          siteRequest += 1;
          set({ ...quiet, phase: 'overview', cameraArrived: false });
          // The map is read again: the read after the last answer may have failed, and the map would show its past.
          if (s.learnerId) refreshProgress(s.learnerId);
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

      // Round 120: a saveable character whose site is cleared joins the party. The reply holds the whole party.
      recruit: async (encounterId) => {
        const { learnerId, recruiting } = get();
        if (!learnerId || recruiting || typeof encounterId !== 'string') return;
        const epoch = requestEpoch;
        const sent = partyRequest;
        set({ recruiting: true, error: null });
        try {
          const result = await api.recruit(learnerId, encounterId);
          if (epoch !== requestEpoch || get().learnerId !== learnerId) return;
          set({ recruiting: false });
          // Review 1 of round 120 (R1.2): a read that started after this request was sent may be newer than its reply
          // (a conversation finished meanwhile), so the party is read again instead of taking the reply.
          if (sent !== partyRequest) { await refreshParty(learnerId); return; }
          partyRequest += 1; // a read sent before this reply shows the party without the new member
          set({ party: result.party });
        } catch (error) {
          if (epoch === requestEpoch && get().learnerId === learnerId) set({ error: error.message, recruiting: false });
        }
      },

      openParty: () => {
        set({ view: 'party', reviewChallenge: null, reviewResult: null, error: null });
        const { learnerId } = get();
        if (learnerId && api.getParty) refreshParty(learnerId);
      },

      // A conversation with a party member, from anywhere outside a conversation. The camera stays where it is.
      talkTo: async (member) => {
        const s = get();
        const resolvedSite = s.phase === 'encounter' && s.encounter?.state === 'resolved';
        const outside = ['attract', 'world', 'overview', 'site', 'victory'].includes(s.phase) || resolvedSite;
        // Not while the store holds a site conversation under way (the player left it for the site's card).
        if (!outside || !s.learnerId || !member?.conversationId || s.encounterLoading || s.travelling || s.encounter?.state === 'ongoing') return;
        const learnerId = s.learnerId;
        const atGoal = s.dungeon.sites[s.siteIndex]?.id === s.dungeon.goal;
        const partyReturn = resolvedSite ? (atGoal ? 'victory' : 'site') : s.phase;
        const request = ++siteRequest;
        const epoch = requestEpoch;
        const stale = () => request !== siteRequest || epoch !== requestEpoch || get().learnerId !== learnerId;
        set({ encounterLoading: true, partyStarting: member.conversationId, error: null });
        try {
          const result = await api.startEncounter(learnerId, { encounterId: member.conversationId, immersion: immersionOf(get()) });
          if (stale()) return;
          // Review 1 of round 120 (R1.3): the Party panel closes; a Spellbook or a review opened meanwhile stays open.
          const closing = get().view === 'party';
          set({
            ...quiet, phase: 'party', partyReturn, encounter: result.encounter, spellbook: withSpellbook(result.spellbook), error: null,
            ...(closing ? { reviewChallenge: null, reviewResult: null } : { view: get().view }),
          });
        } catch (error) {
          if (!stale()) set({ error: error.message, encounterLoading: false, partyStarting: null });
        }
      },

      // The party conversation again from its first line.
      restartParty: async () => {
        const s = get();
        if (s.phase !== 'party' || !s.encounter || s.encounterLoading || s.isLoading) return;
        const learnerId = s.learnerId;
        const request = ++siteRequest;
        const epoch = requestEpoch;
        set({ encounterLoading: true, error: null });
        try {
          const result = await api.startEncounter(learnerId, { encounterId: s.encounter.encounterId, restart: true, immersion: immersionOf(get()) });
          if (request !== siteRequest || epoch !== requestEpoch) return;
          set({ encounter: result.encounter, spellbook: withSpellbook(result.spellbook), encounterLoading: false, assessment: null, closedObjectives: 0, draft: '', pendingInput: null });
        } catch (error) {
          if (request === siteRequest && epoch === requestEpoch) set({ error: `The conversation could not start over: ${error.message}`, encounterLoading: false });
        }
      },

      // Back to where the party conversation was opened. The store drops its copy; an unfinished one stays on the
      // server until another conversation starts (critique 1.2).
      leaveParty: () => {
        const s = get();
        if (s.phase !== 'party' || s.isLoading) return;
        siteRequest += 1;
        const back = s.partyReturn ?? 'overview';
        set({ ...quiet, phase: back, partyReturn: null, ...(back === 'victory' ? { cameraArrived: false } : {}) });
      },

      // After the goal's encounter resolves: out to the victory screen.
      leaveTemple: () => {
        const s = get();
        if (s.phase === 'encounter' && s.encounter?.state === 'resolved' && s.dungeon.sites[s.siteIndex]?.id === s.dungeon.goal) showVictory();
      },
      // The victory screen's other way out: the finished run stays open (critique 1.3).
      stay: () => { if (get().phase === 'victory' && !get().isLoading) set({ phase: 'overview' }); }, // not while Play again is with the server

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
          runEpoch += 1; // nor a move made in it
          if (!usable(view)) throw new Error(OLD_SERVER);
          takeView(view);
          set({ ...quiet, phase: 'world', siteIndex: Math.max(0, indexOfSite(view.progress.at)), walkFrom: null, cameraArrived: false, isLoading: false });
        } catch (error) { if (current()) set({ error: error.message, isLoading: false }); }
      },

      openSettings: () => {
        set({ settingsOpen: true });
        get().readSaveStore();
      },
      // Round 146: where the server keeps its saves (its health check, which needs no token), for the guide beside
      // "Your save". A server that does not answer, or one from before round 145, leaves it unknown. Read when Settings
      // opens and again when new settings are saved; never without a server to ask.
      readSaveStore: () => {
        if (!rawApi.getHealth || settingsProblem(get().settings, { sameOrigin })) { set({ saveStore: null }); return; }
        const epoch = requestEpoch;
        rawApi.getHealth().then((health) => { if (epoch === requestEpoch) set({ saveStore: health?.saves ?? null }); }, () => { if (epoch === requestEpoch) set({ saveStore: null }); });
      },
      closeSettings: () => set({ settingsOpen: false }),
      // Round 117: a display preference. It makes no request and leaves the run and the conversation alone.
      setPanelOpacity: (value) => set({ display: saveDisplay({ ...get().display, panelOpacity: value }, storage) }),
      // Round 125: tilt to look, another display preference.
      // Round 126: whether the characters read their lines aloud.
      setVoices: (on) => set({ display: saveDisplay({ ...get().display, voices: on !== false }, storage) }),
      // Round 127: whether the ambient music plays.
      setMusic: (on) => set({ display: saveDisplay({ ...get().display, music: on !== false }, storage) }),
      // Round 172: one of the Audio volumes ('master', 'music', 'effects' or 'voice'), 0 to 1.
      setVolume: (channel, value) => set({ display: saveDisplay({ ...get().display, volume: { ...volumesOf(get().display?.volume), [channel]: clampVolume(value) } }, storage) }),
      // Round 148: how much of a character's lines is in the language being learned; sent with each start and answer.
      setImmersion: (value) => set({ display: saveDisplay({ ...get().display, immersion: clampImmersion(value), immersionAuto: false }, storage) }),
      // Round 177: whether the share follows the learner's level (the stage's share) instead of the slider.
      setImmersionAuto: (on) => set({ display: saveDisplay({ ...get().display, immersionAuto: on !== false }, storage) }),
      // Round 129: beginner mode, sent with each answer.
      setBeginner: (on) => set({ display: saveDisplay({ ...get().display, beginner: on !== false }, storage) }),
      // Round 162: whether the road's nearest trees are the pulled models.
      setTreeModels: (on) => set({ display: saveDisplay({ ...get().display, treeModels: on !== false }, storage) }),
      // Round 153: strict or light checking of answers, sent with each answer.
      setLight: (on) => set({ display: saveDisplay({ ...get().display, light: on === true }, storage) }),
      setTiltLook: (on) => set({ display: saveDisplay({ ...get().display, tiltLook: on === true }, storage) }),
      // New settings reconnect: the learner and the run are fetched again from that server.
      // The server no longer knows this learner (see `api` above): everything of the old run is dropped, the learner
      // is created again and the player stands at a new run's start, with a line saying why.
      recoverLostRun: () => {
        if (get().error === RUN_LOST && !get().learnerId) return; // already recovering
        get().saveSettings(get().settings, { notice: RUN_LOST });
      },
      saveSettings: async (values, { notice = null } = {}) => {
        const settings = persistSettings(values, storage);
        const wasRoad = get().mode === 'road';
        requestEpoch += 1;
        siteRequest += 1;
        progressRequest += 1;
        spellbookVersion += 1;
        partyRequest += 1;
        initializationPromise = null;
        const phase = ['attract', 'world'].includes(get().phase) ? get().phase : 'overview';
        set({
          settings, settingsOpen: notice ? get().settingsOpen : false, learnerId: null, language: null, progress: null, narration: null, guideNote: null, guidebook: null, runs: {}, connection: 'idle', serverProblem: null, dungeon,
          mode: 'dungeon', road: null, curriculum: null, journey: null, journeyShown: false, journeyLoading: false, journeyRemark: null, roadPhase: 'hub', roadPanel: null, roadError: null, roadResult: null, roadLoading: false, roadTravelling: false,
          party: [], partyReturn: null, partyStarting: null, recruiting: false,
          progression: null, xpGained: 0, levelUp: null,
          phase, siteIndex: startIndex(dungeon), walkFrom: null, cameraArrived: false, arrival: 'encounter', travelling: false, encounter: null, encounterLoading: false, siteError: null, starting: false,
          spellbook: emptySpellbook, view: 'dialogue', reviewChallenge: null, reviewResult: null, assessment: null, closedObjectives: 0, isLoading: false, error: notice,
          ...(notice ? { draft: '', pendingInput: null } : {}),
        });
        if (get().settingsOpen) get().readSaveStore();
        await get().initialize();
        // Round 144: a player who was on the road is put back on it.
        if (wasRoad && get().connection === 'ready') { set({ phase: 'world' }); await get().enterRoad(); }
      },

      // Round 173: streamlined mode: kept in this browser and told to the server's road.
      setStreamlined: (on) => { set({ display: saveDisplay({ ...get().display, streamlined: on !== false }, storage) }); return get().syncRoadMode(); },
      // Round 144: on The Journey 2, whether the way on is chosen for the player.
      setRails: (on) => set({ display: saveDisplay({ ...get().display, rails: on !== false }, storage) }),
      // Round 144: this browser's copy of the save as a file's text (a fresh copy when the server answers), and a
      // copy from a file put on the server in place of whatever it holds for that learner.
      exportCopy: async () => {
        const { learnerId } = get();
        if (learnerId) await backup(learnerId);
        try { return storage?.getItem?.(BACKUP_KEY) ?? null; } catch { return null; }
      },
      importCopy: async (text) => {
        let copy;
        try { copy = JSON.parse(text); } catch { copy = null; }
        if (typeof copy?.save?.learnerId !== 'string') { set({ error: 'That file is not a ParaLLang save.' }); return false; }
        if (!rawApi.restoreSave) return false;
        try {
          await rawApi.restoreSave({ ...copy, replace: true });
          try { storage?.setItem?.(LEARNER_KEY, copy.save.learnerId); storage?.setItem?.(BACKUP_KEY, JSON.stringify(copy)); } catch { /* private mode */ }
          await get().saveSettings(get().settings, { notice: COPY_LOADED });
          return true;
        } catch (error) { set({ error: `The save could not be loaded: ${error.message}` }); return false; }
      },

      // Round 174: after a conversation is complete, the player may go on talking; nothing more is counted.
      stopChatting: () => set({ chatKey: null }), // back to the end of the conversation and the way on
      keepChatting: () => { const { encounter } = get(); if (encounter?.state === 'resolved') set({ chatKey: chatKeyOf(encounter), assessment: null }); },

      sendMessage: async (providedText) => {
        const state = get();
        const text = String(providedText ?? state.draft).trim();
        const chat = state.encounter?.state === 'resolved' && state.chatKey === chatKeyOf(state.encounter);
        if (!text || !state.learnerId || !state.encounter || (state.encounter.state !== 'ongoing' && !chat) || state.isLoading) return;
        const learnerId = state.learnerId;
        const encounterId = state.encounter.id;
        const version = state.encounter.version;
        const epoch = requestEpoch;
        set({ isLoading: true, error: null, pendingInput: text, draft: text });
        try {
          // Round 129: beginner mode travels with the answer (the server grades strictly without it).
          // Round 153: so does light mode, in which the server checks nothing; it takes the place of beginner mode.
          const result = await api.sendDialogue(learnerId, { encounterId, version, attemptId: attemptId(), message: text, ...(chat ? { chat: true } : state.display?.light === true ? { light: true } : state.display?.beginner !== false ? { beginner: true } : {}), ...(immersionOf(state) !== null ? { immersion: immersionOf(state) } : {}) });
          if (epoch !== requestEpoch || get().learnerId !== learnerId || get().encounter?.version !== version) return;
          // A chat after the end: only the conversation grows.
          if (chat) { set({ encounter: result.encounter, spellbook: withSpellbook(result.spellbook), assessment: null, isLoading: false, pendingInput: null, draft: '' }); return; }
          // A held pass (said too early in an ordered encounter) closes nothing (round 051).
          const closed = (result.assessment?.objectiveResults ?? []).filter((entry) => entry.passed && !entry.held).length;
          const kind = result.encounter.state === 'resolved' ? 'resolved' : closed > 0 ? 'pass' : 'fail';
          const levelUp = takeProgression(result.progression);
          takeGuide(result.guidebook); // round 159: what a character uttered may have entered a guidebook entry
          set({
            encounter: result.encounter, spellbook: withSpellbook(result.spellbook), assessment: result.assessment, isLoading: false, pendingInput: null, draft: '',
            closedObjectives: get().closedObjectives + closed, beat: { id: (get().beat?.id ?? 0) + 1, kind },
            xpGained: Number.isInteger(result.xpGained) ? result.xpGained : 0, levelUp,
          });
          // A finished site conversation changes the map; a finished party conversation changes the party (critique 1.9).
          const resolved = result.encounter.state === 'resolved';
          // Round 144: a conversation of the road changes the road and the curriculum instead.
          if (result.encounter.road) {
            if (resolved) await get().roadFinished(result, learnerId);
            return;
          }
          if (resolved) backup(learnerId);
          const readsMap = resolved && !result.encounter.partyConversation;
          // Round 121 (critique 1.1): a new level may open a seal, so the map is read again whatever earned it.
          if (levelUp && !readsMap) refreshProgress(learnerId);
          if (resolved) await (result.encounter.partyConversation ? refreshParty(learnerId) : refreshProgress(learnerId));
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
      // Round 157: the guidebook. It shows what the store last read at once, then the server's, and opening it reads
      // every entry (the notes on the cards go).
      openGuidebook: () => {
        set({ view: 'guidebook', reviewChallenge: null, reviewResult: null, error: null });
        const { learnerId } = get();
        if (!learnerId || !api.getGuidebook) return;
        const epoch = requestEpoch;
        const current = () => epoch === requestEpoch && get().learnerId === learnerId;
        api.getGuidebook(learnerId).then((data) => {
          if (!current() || !data?.guidebook) return;
          set({ guidebook: data.guidebook });
          if (!data.guidebook.entries.some((entry) => entry.unread)) return;
          // The panel keeps its "New" marks for this visit; the notes elsewhere are done with.
          return api.readGuidebook(learnerId).then(() => { if (current()) set({ guideNote: { count: data.guidebook.entries.length, unread: [] } }); });
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
        const epoch = requestEpoch;
        const current = () => epoch === requestEpoch && get().learnerId === learnerId; // review R1.3 of round 121
        set({ isLoading: true, error: null });
        try {
          const result = await api.submitReview(learnerId, { challengeId: reviewChallenge.id, attemptId: attemptId(), action: 'answer', answer: String(answer).trim() });
          if (current()) tookReview(result, learnerId);
        } catch (error) { if (current()) set({ error: error.message, isLoading: false }); }
      },

      revealReviewAnswer: async () => {
        const { learnerId, reviewChallenge, isLoading } = get();
        if (!learnerId || !reviewChallenge || isLoading) return;
        const epoch = requestEpoch;
        const current = () => epoch === requestEpoch && get().learnerId === learnerId;
        set({ isLoading: true, error: null });
        try {
          const result = await api.submitReview(learnerId, { challengeId: reviewChallenge.id, attemptId: attemptId(), action: 'reveal', answer: '' });
          if (current()) tookReview(result, learnerId);
        } catch (error) { if (current()) set({ error: error.message, isLoading: false }); }
      },
    };
  });
}
