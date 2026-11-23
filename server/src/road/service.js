// Round 144: The Journey 2 on the server: the learner's place on the endless graph, what each site ahead offers,
// the conversation at the site they stand at, and what a finished conversation does to the curriculum. These are
// methods of LearningService (learning-service.js assigns them to its prototype); they live here so that the road
// can be read in one place.
//
// The save holds, under `road`:
//
//   seed      the landscape's seed (each learner has their own)
//   step      conversations finished on the road
//   at        the site the learner stands at ("i,j")
//   trail     the sites visited, oldest first, the last ROAD.trail of them; an older site falls out of the trail
//             and is wilderness again
//   cleared   the sites whose conversation was finished, the last ROAD.trail of them
//   current   the conversation waiting at `at`: { node, step, activity }, or null once it is finished
//   progress  the curriculum's marks (pacing.js)
//   log       the last ROAD.log conversations, newest first, for the journal
//   narration the id of the narrator's passage for the last arrival (round 156), or null
//   walk      every site walked to, in order, the start first (round 161): the whole journey, as node ids alone,
//             since the graph is the same graph every time it is read. The last ROAD.walk of them; `hops` counts
//             every walk made, also those that have fallen out of the list
//   dungeon   the id of the legacy dungeon the learner stands in (round 160: a unit's gate is in one), or null
//
// Rules: the learner may walk to any site next to a site of the recent trail that is not itself on the trail (the
// frontier; round 143's rule that everything out of the fog is reachable from anywhere). The pacing's recommended
// conversation waits at the "rails" site, the others at the rest of the frontier, so the map is a choice between
// kinds of conversation and "on rails" is the pacing's own order.

import { randomInt } from 'node:crypto';
import { AppError, conflictError, validationError } from '../errors.js';
import { isDue, levelFor } from '../language-engine.js';
import { assertLearnerId } from '../learning-storage.js';
import { BIOMES, hash, createTerrain } from './terrain.js';
import { graphFor, parseNodeId } from './graph.js';
import { placeName } from './characters.js';
import { ROAD_PLACE, buildRoadDefinition, describeActivity, legacyDungeonFor, objectivesOf } from './encounters.js';
import { entriesFor, selectPassage } from '../narration.js';
import { PACING, composeCheckpoint, composeReview, emptyProgress, overview, plan, position, record, scoreOf } from './pacing.js';

export const ROAD = Object.freeze({ ...ROAD_PLACE, trail: 300, frontierFrom: 40, log: 30, shownTrail: 80, definitions: 200, walk: 20000 });

const clone = (value) => structuredClone(value);
const graphOf = (seed) => graphFor(seed, createTerrain);
/** Round 175: a seed a client proposes for a new road, if it is one the server would have drawn itself (1 to 2^31 - 1). */
export const proposedSeed = (value) => {
  const seed = typeof value === 'string' && /^\d{1,10}$/.test(value) ? Number(value) : value;
  return Number.isInteger(seed) && seed >= 1 && seed <= 2 ** 31 - 1 ? seed : null;
};

/** A road that has not been walked: the learner stands at the start with the first lesson waiting. */
export function freshRoad(seed, curriculum) {
  const graph = graphOf(seed);
  const road = { seed, step: 0, at: graph.start, trail: [graph.start], cleared: [], current: null, progress: emptyProgress(), log: [], walk: [graph.start], hops: 0 };
  const [first] = plan(curriculum, road.progress, 0);
  road.current = first ? { node: graph.start, step: 0, activity: commit(curriculum, road.progress, 0, first, () => false) } : null;
  return road;
}

// An activity as it is fixed when the learner arrives: a review and a checkpoint get their objectives then.
function commit(curriculum, progress, step, activity, isDueObjective) {
  const { why, ...kept } = activity;
  if (activity.kind === 'review') return { ...kept, picks: composeReview(curriculum, progress, step, isDueObjective) };
  if (activity.kind === 'checkpoint') return { ...kept, picks: composeCheckpoint(curriculum, progress, activity.unitId) };
  return kept;
}

/** The sites the learner may walk to, nearest first: [{ id, from }], `from` being the trail site each is joined to. */
export function frontierOf(graph, road) {
  const onTrail = new Set(road.trail);
  const seen = new Set();
  const out = [];
  const collect = (sites) => {
    for (const from of sites) {
      for (const id of graph.neighbours(from)) {
        if (onTrail.has(id) || seen.has(id)) continue;
        seen.add(id);
        out.push({ id, from });
      }
    }
  };
  collect([road.at, ...road.trail.slice(-ROAD.frontierFrom).reverse().filter((id) => id !== road.at)]);
  // A walk can box itself in: every site near the learner already visited. Then the whole trail is searched. It
  // always has a site ahead: the trail's site furthest north-east keeps a forced way further north or east.
  if (!out.length) collect([...road.trail].reverse());
  return out;
}

/**
 * What waits at each site of the frontier, and which site the rails take: { rails, offers: Map(id -> activity) }.
 * The rails site is a hashed pick among the sites next to the learner (a random walk that the seed fixes), or the
 * nearest frontier site when the learner stands at a dead end. It holds the pacing's first choice.
 */
export function offersFor(graph, road, curriculum) {
  const frontier = frontierOf(graph, road);
  const options = plan(curriculum, road.progress, road.step);
  if (!frontier.length || !options.length) return { frontier, rails: null, offers: new Map() };
  const [i, j] = parseNodeId(road.at);
  const next = frontier.filter((entry) => entry.from === road.at);
  const rails = (next.length ? next : frontier.slice(0, 1))
    .map((entry) => { const [ni, nj] = parseNodeId(entry.id); return { entry, order: hash(ni * 7 + i + road.step, nj * 11 - j - road.step, road.seed + 777) }; })
    .sort((a, b) => a.order - b.order)[0].entry.id;
  const offers = new Map([[rails, options[0]]]);
  // Round 160: a unit's gate stands in a legacy dungeon, and a dungeon is one place: the gate is offered at one site
  // (the rails', when it is the pacing's first choice; else the first other site), and the rest offer something else.
  const gate = options.find((option) => option.kind === 'checkpoint') ?? null;
  const rest = options.filter((option) => option !== gate);
  let gateOffered = options[0] === gate;
  let turn = 0;
  for (const { id } of frontier) {
    if (id === rails) continue;
    turn += 1;
    let option = options[turn % options.length];
    if (option === gate && (gateOffered || !rest.length)) option = rest.length ? rest[turn % rest.length] : gate;
    if (option === gate) gateOffered = true;
    offers.set(id, option);
  }
  return { frontier, rails, offers };
}

/**
 * Round 145: what a save says of its learner in a few lines, for the top of the file written to GitHub
 * (github-saves.js): the level, the Spellbook's size, the dungeons' runs and, above all, where the learner is in the
 * curriculum. `line` is the one-line form (it is the commit's message).
 */
export function saveSummary(content, envelope) {
  const xp = envelope.progression?.xp ?? 0;
  const cards = Object.keys(envelope.spellbook?.words ?? {}).length + Object.keys(envelope.spellbook?.phrases ?? {}).length;
  const base = {
    level: levelFor(xp), xp, spellbookCards: cards,
    dungeons: Object.fromEntries(Object.entries(envelope.dungeons ?? {}).map(([id, run]) => [id, { run: run.run, cleared: run.cleared.length }])),
  };
  const road = envelope.road;
  const curriculum = road ? content.curriculum : null;
  if (!curriculum) return { line: `level ${base.level}, ${cards} Spellbook cards`, ...base, curriculum: null };
  const view = overview(curriculum, road.progress);
  const units = view.stages.flatMap((stage) => stage.units.map((unit) => ({
    id: unit.id, title: unit.title, cefr: stage.cefr, state: unit.state,
    lessonsDone: unit.lessons.filter((lesson) => lesson.done > 0).length, lessons: unit.lessons.length, gate: unit.checkpoint.passed,
  })));
  const number = view.position ? units.findIndex((unit) => unit.id === view.position.unitId) + 1 : null;
  const line = view.complete
    ? `curriculum finished (${units.length} units), ${road.step} conversations`
    : `${view.position.cefr}, unit ${number} of ${units.length} (${view.position.unitTitle}), ${view.totals.lessonsDone} of ${view.totals.lessonsTotal} lessons, ${road.step} conversations`;
  return {
    line, ...base,
    curriculum: {
      complete: view.complete, conversations: road.step,
      position: view.position ? { ...view.position, unitNumber: number, unitsTotal: units.length } : null,
      totals: view.totals, successRate: view.successRate, units,
    },
  };
}

export const roadMethods = {
  curriculum() {
    const { curriculum } = this.content;
    if (!curriculum) throw new AppError(`${ROAD.name} is not open in ${this.content.language.name} yet.`, { status: 404, code: 'NO_CURRICULUM' });
    return curriculum;
  },

  // The road of a save, made whole: a learner who never set foot on it gets a new one (not saved until they move or talk).
  roadOf(envelope) {
    const curriculum = this.curriculum();
    const stored = envelope.road;
    if (!stored) return freshRoad(this.roadSeed(), curriculum);
    const graph = graphOf(stored.seed);
    // Content may have changed under a save: a site that no longer exists, a lesson that was removed.
    const at = graph.node(stored.at) ? stored.at : graph.start;
    const road = { ...clone(stored), at, trail: stored.trail.includes(at) ? [...stored.trail] : [...stored.trail, at] };
    // Round 161: a road from before the walk was kept has its trail for one (the sites visited, each once, in order).
    if (!Array.isArray(road.walk)) road.walk = [...road.trail];
    if (road.walk.at(-1) !== at) road.walk = [...road.walk, at];
    if (!Number.isSafeInteger(road.hops)) road.hops = road.walk.length - 1;
    if (road.current && (road.current.node !== at || !objectivesOf(curriculum, road.current.activity).length)) road.current = null;
    return road;
  },

  isDueObjective(envelope) {
    const now = this.clock();
    return (objective) => objective.target_vocabulary_ids.some((id) => {
      const item = this.findItem(envelope, id);
      return Boolean(item) && this.isCurrent(item) && isDue(item.schedule, now);
    });
  },

  roadDefinition(session) {
    this.roadDefinitions ??= new Map();
    const key = JSON.stringify(session);
    let definition = this.roadDefinitions.get(key);
    if (!definition) {
      const curriculum = this.curriculum();
      definition = buildRoadDefinition({
        curriculum, language: this.content.language, seed: session.seed, node: graphOf(session.seed).node(session.node),
        step: session.step, activity: session.activity, currentUnitId: session.unitId,
        knowledge: this.content.knowledge, // round 155
        dungeons: this.content.dungeons, // round 160
      });
      this.roadDefinitions.set(key, definition);
      if (this.roadDefinitions.size > ROAD.definitions) this.roadDefinitions.delete(this.roadDefinitions.keys().next().value);
    }
    return definition;
  },

  // What a session of the conversation waiting at the learner's site holds (plain data: sessions are cloned).
  roadSession(road, curriculum) {
    return { seed: road.seed, node: road.current.node, step: road.current.step, activity: road.current.activity, unitId: position(curriculum, road.progress).unit?.id ?? null };
  },

  roadView(envelope, road = this.roadOf(envelope)) {
    const curriculum = this.curriculum();
    const graph = graphOf(road.seed);
    const currentUnitId = position(curriculum, road.progress).unit?.id ?? null;
    const site = (id) => { const node = graph.node(id); return { id, name: placeName(road.seed, node), cover: node.cover, biome: node.biome, biomeName: BIOMES[node.biome]?.name ?? null, at: [Math.round(node.x * 10) / 10, Math.round(node.z * 10) / 10] }; };
    const offer = (node, step, activity) => {
      const { unit, stage, title, character, dungeon } = describeActivity({ curriculum, seed: road.seed, node, step, activity, currentUnitId, dungeons: this.content.dungeons });
      return {
        kind: activity.kind, title, unitId: unit.id, unitTitle: unit.title, cefr: stage.cefr, why: activity.why ?? null,
        // Round 160: a gate stands in a legacy dungeon: walking to its site enters that dungeon.
        dungeon: dungeon ? { id: dungeon.id, name: dungeon.name, siteName: dungeon.site.name } : null,
        character: { name: character.name, role: character.species, description: character.appearance, hue: character.hue },
      };
    };
    const { frontier, rails, offers } = offersFor(graph, road, curriculum);
    return {
      road: {
        id: ROAD.id, name: ROAD.name, seed: road.seed, step: road.step, at: road.at,
        // Round 160: `here.dungeon` while the learner stands in a legacy dungeon (the site they walked to held a gate).
        here: { ...site(road.at), dungeon: this.standingIn(road) },
        // And how far the unit's gate is: the conversations it takes at least, and the dungeon it stands in.
        gate: this.gateAhead(curriculum, road),
        hops: road.hops, // round 161: how many walks the journey is; the walk itself is asked for apart (getRoadWalk)
        current: road.current ? offer(graph.node(road.current.node), road.current.step, road.current.activity) : null,
        trail: road.trail.slice(-ROAD.shownTrail), cleared: road.cleared.slice(-ROAD.shownTrail),
        narration: this.toldView(road.narration ?? null), // round 156: what the narrator said of the last arrival
        frontier: frontier.map(({ id, from }) => ({
          ...site(id), from, way: graph.edge(from, id).kind, recommended: id === rails,
          offer: offer(graph.node(id), road.step, offers.get(id)),
        })),
        rails,
        log: road.log,
      },
      curriculum: overview(curriculum, road.progress),
      progression: this.progression(envelope),
      guidebook: this.guidebookNote(envelope), // round 157
    };
  },

  // Round 175: `seed` is the landscape the title screen already shows a new player (it is drawn before the server
  // answers). It is taken only by the first look, which creates the road; a road that exists keeps its own.
  async getRoad(learnerId, { seed = null } = {}) {
    const envelope = await this.loadEnvelope(learnerId);
    if (envelope.road) return this.roadView(envelope);
    // The first look creates the road, so that the seed (and with it the landscape) is fixed from then on.
    return this.serialized(learnerId, async () => {
      const latest = await this.loadEnvelope(learnerId);
      if (latest.road) return this.roadView(latest);
      const staged = clone(latest);
      staged.road = this.setOut(staged, freshRoad(proposedSeed(seed) ?? this.roadSeed(), this.curriculum()));
      await this.storage.save(staged);
      return this.roadView(staged);
    });
  },

  // Round 160: the legacy dungeon the learner stands in ({ id, name, siteName }), or null.
  standingIn(road) {
    const dungeon = road.dungeon ? this.content.dungeons?.get(road.dungeon) : null;
    if (!dungeon) return null;
    const first = dungeon.sites.find((candidate) => candidate.id === dungeon.start) ?? dungeon.sites[0];
    return { id: dungeon.id, name: dungeon.name, siteName: first.name };
  },

  // Round 160: the gate of the unit the learner is in: { unitTitle, hops, dungeon }. `hops` is the fewest
  // conversations before the gate can be offered: the unit's lessons still to do and the pause before a gate
  // (pacing.js); reviews and repairs on the way add to it. Null once the curriculum is finished.
  gateAhead(curriculum, road) {
    const { unit, complete } = position(curriculum, road.progress);
    if (complete || !unit) return null;
    const pending = unit.lessons.filter((lesson) => !(road.progress.lessons?.[lesson.id]?.done > 0)).length;
    const dungeon = legacyDungeonFor(this.content.dungeons, curriculum, unit.id);
    return { unitId: unit.id, unitTitle: unit.title, hops: pending + (pending > 0 ? PACING.checkpointGap : 0), dungeon: dungeon ? { id: dungeon.id, name: dungeon.name } : null };
  },

  // Round 156: the narrator's passage for the first step on a new road (told once to a learner; null after that).
  setOut(envelope, road) {
    return { ...road, narration: this.tell(envelope, { event: 'road_enter' })?.id ?? null };
  },

  // Round 161 (issue #9): the whole journey: every site walked to, in order, as node ids. Asked for apart from the
  // road's view, which is sent after every answer and walk and would carry it each time.
  // Round 163 (issue #13): asking for it is the map's "Show Journey so far". Once the journey is a hundred walks
  // long the narrator remarks on it (a written passage, told each time it is shown), and the first time that
  // enters a guidebook entry; only then is anything written.
  async getRoadWalk(learnerId) {
    const envelope = await this.loadEnvelope(learnerId);
    const view = (from) => {
      const road = this.roadOf(from);
      const event = { event: 'journey_shown', hops: road.hops };
      const passage = selectPassage(this.content.passages ?? [], event, { told: from.told ?? {} });
      return { road, passage };
    };
    const answer = (from, { road, passage }) => ({
      walk: { seed: road.seed, nodes: road.walk, hops: road.hops, kept: road.walk.length },
      narration: passage ? this.toldView(passage.id) : null,
      guidebook: this.guidebookNote(from),
    });
    const first = view(envelope);
    const fresh = first.passage && (!Object.hasOwn(envelope.told ?? {}, first.passage.id) || entriesFor(this.content.guide ?? [], { event: 'journey_remarked' }, envelope.guidebook ?? {}).length > 0);
    if (!fresh) return answer(envelope, first);
    return this.serialized(learnerId, async () => {
      const staged = clone(await this.loadEnvelope(learnerId));
      const again = view(staged);
      if (again.passage) {
        this.tell(staged, { event: 'journey_shown', hops: again.road.hops });
        this.enterGuide(staged, { event: 'journey_remarked' });
        await this.storage.save(staged);
      }
      return answer(staged, again);
    });
  },

  // A walk to a site of the frontier. The conversation the pacing put there is fixed on arrival. While the road's own
  // conversation is under way the move is refused, unless `leave` is true, which drops that conversation.
  async moveOnRoad(learnerId, request) {
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const curriculum = this.curriculum();
      const road = this.roadOf(envelope);
      const graph = graphOf(road.seed);
      const nodeId = request?.nodeId;
      if (typeof nodeId !== 'string' || !graph.node(nodeId)) throw validationError('Unknown site.');
      if (nodeId === road.at) return this.roadView(envelope, road);
      const { frontier, offers } = offersFor(graph, road, curriculum);
      if (!frontier.some((entry) => entry.id === nodeId)) {
        throw conflictError(`You can't get to ${placeName(road.seed, graph.node(nodeId))} from here.`, 'NOT_ADJACENT');
      }
      const active = this.encounters.get(learnerId);
      const own = Boolean(active?.road);
      if (own && active.state === 'ongoing' && request?.leave !== true) {
        throw conflictError(`Finish your conversation with ${this.definition(active).character.name} first.`, 'CONVERSATION_UNDER_WAY');
      }
      const staged = clone(envelope);
      const activity = commit(curriculum, road.progress, road.step, offers.get(nodeId), this.isDueObjective(envelope));
      // Round 156: the narrator's passage for the arrival: by the kind of way taken and the country arrived in.
      const [ni, nj] = parseNodeId(nodeId);
      // Round 160: a gate's site is a legacy dungeon's node; the learner is in that dungeon until they walk on.
      const entered = activity.kind === 'checkpoint' ? legacyDungeonFor(this.content.dungeons, curriculum, activity.unitId) : null;
      const arrival = { event: 'road_arrive', ...(entered ? { dungeon: entered.id } : {}), way: graph.edge(frontier.find((entry) => entry.id === nodeId).from, nodeId).kind, cover: graph.node(nodeId).cover, biome: graph.node(nodeId).biome, kind: activity.kind, // `kind`: round 157
        // Round 158: the stage of the curriculum the learner is in, and the conversations finished: a passage with a
        // harder untranslatable text waits for its stage, and one may wait for a number of conversations.
        cefr: curriculum.stages.find((stage) => stage.id === position(curriculum, road.progress).unit?.stageId)?.cefr ?? curriculum.stages.at(-1).cefr, step: road.step };
      staged.road = {
        ...road, at: nodeId,
        trail: [...road.trail.filter((id) => id !== nodeId), nodeId].slice(-ROAD.trail),
        current: { node: nodeId, step: road.step, activity },
        walk: [...road.walk, nodeId].slice(-ROAD.walk), hops: road.hops + 1, // round 161: the whole journey
        dungeon: entered?.id ?? null,
        narration: this.tell(staged, arrival, hash(ni * 13 + road.step, nj * 17 - road.step, road.seed + 1212))?.id ?? null,
      };
      await this.storage.save(staged);
      if (own) this.encounters.delete(learnerId);
      return this.roadView(staged);
    });
  },

  // The conversation waiting at the site the learner stands at. The road's own conversation resumes (a reload);
  // another conversation under way is never replaced without `restart`.
  async _startRoad(learnerId, restart, immersion = null) {
    let envelope = await this.loadEnvelope(learnerId);
    const curriculum = this.curriculum();
    const road = this.roadOf(envelope);
    if (!envelope.road) {
      envelope = clone(envelope);
      envelope.road = this.setOut(envelope, road);
      await this.storage.save(envelope);
    }
    if (!road.current) throw conflictError('Nobody is waiting here any more. Walk on.', 'NOTHING_HERE');
    const session = this.roadSession(road, curriculum);
    const definition = this.roadDefinition(session);
    const active = this.encounters.get(learnerId);
    // The same conversation by what it is made from (a definition may have been built again meanwhile).
    const ownSession = Boolean(active?.road) && JSON.stringify(active.road) === JSON.stringify(session);
    if (!restart && ownSession && active.state === 'ongoing') {
      return { encounter: this.serializeEncounter(active), spellbook: this.spellbookSnapshot(envelope) };
    }
    if (!restart && !ownSession && active?.state === 'ongoing') {
      throw conflictError(`Finish your conversation with ${this.definition(active).character.name} first.`, 'CONVERSATION_UNDER_WAY');
    }
    return this.openSession(learnerId, envelope, definition, { road: session, immersion });
  },

  // A road conversation resolved: its score goes to the curriculum's marks, the step counts up, the site is cleared
  // and nobody waits there any more. Called inside the turn's own save, so a replayed attempt records nothing twice.
  finishRoad(envelope, session) {
    const stored = envelope.road;
    if (!stored?.current || stored.current.node !== session.road.node || stored.current.step !== session.road.step) return null;
    const curriculum = this.curriculum();
    const definition = this.roadDefinition(session.road);
    const total = definition.encounter.objectives.length;
    const corrected = new Set(session.correctedObjectiveIds ?? []);
    // Round 154: a light exchange may end with an objective never met; it is neither corrected nor hinted, it is missed.
    const passed = new Set(session.passedObjectiveIds ?? []);
    const missed = definition.encounter.objectives.filter((objective) => !passed.has(objective.id)).length;
    const hinted = definition.encounter.objectives.filter((objective) => passed.has(objective.id) && !corrected.has(objective.id) && (session.reveals?.[objective.id] ?? []).length > 0).length;
    const score = scoreOf({ total, corrected: corrected.size, hinted, missed });
    const { activity } = stored.current;
    const before = position(curriculum, stored.progress);
    const step = stored.step + 1;
    const progress = record(stored.progress, activity, score, step);
    const after = position(curriculum, progress);
    const result = {
      kind: activity.kind, title: definition.road.title, score: Math.round(score * 100) / 100,
      ...(activity.kind === 'checkpoint' ? { passed: score >= PACING.checkpointPass, needed: PACING.checkpointPass } : {}),
      ...(before.unit && after.unit?.id !== before.unit.id ? { opened: after.unit ? { unitId: after.unit.id, unitTitle: after.unit.title } : { complete: true } } : {}),
    };
    envelope.road = {
      ...stored, step, progress, current: null,
      cleared: [...stored.cleared.filter((id) => id !== session.road.node), session.road.node].slice(-ROAD.trail),
      log: [{
        step, node: session.road.node, place: definition.road.place, kind: activity.kind, title: definition.road.title,
        unitTitle: definition.road.unitTitle, character: definition.character.name, role: definition.character.species,
        score: result.score, at: new Date(this.clock()).toISOString(),
      }, ...stored.log].slice(0, ROAD.log),
    };
    return result;
  },

  // A new road: another landscape, and the walk starts again. The curriculum's marks are kept unless `forget` is true.
  async resetRoad(learnerId, request) {
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const curriculum = this.curriculum();
      const staged = clone(envelope);
      const fresh = freshRoad(this.roadSeed(), curriculum);
      if (request?.forget !== true && envelope.road) {
        fresh.progress = envelope.road.progress;
        fresh.step = envelope.road.step;
        fresh.log = envelope.road.log;
        const [first] = plan(curriculum, fresh.progress, fresh.step);
        fresh.current = first ? { node: fresh.at, step: fresh.step, activity: commit(curriculum, fresh.progress, fresh.step, first, this.isDueObjective(envelope)) } : null;
      }
      staged.road = this.setOut(staged, fresh);
      await this.storage.save(staged);
      if (this.encounters.get(learnerId)?.road) this.encounters.delete(learnerId);
      return this.roadView(staged);
    });
  },

  roadSeed() { return this.seedSource ? this.seedSource() : randomInt(1, 2 ** 31 - 1); },

  // The whole game state of a learner, for a copy outside the server (the hosted server loses its files on a
  // restart). Without the receipts of past answers: they only stop an answer from counting twice on this server.
  async exportSave(learnerId) {
    const envelope = await this.loadEnvelope(learnerId);
    const save = clone(envelope);
    save.spellbook.processedAssessments = {};
    return { save, language: this.content.language.code, exportedAt: new Date(this.clock()).toISOString() };
  },

  // Puts a copy back. Refused when the server holds a save for that learner, unless `replace` is true.
  async restoreSave(request) {
    const save = request?.save;
    if (!save || typeof save !== 'object' || Array.isArray(save)) throw validationError('A save is required.');
    if (request.language && request.language !== this.content.language.code) {
      throw conflictError(`That save is for another language (${request.language}); this server teaches ${this.content.language.name}.`, 'WRONG_LANGUAGE');
    }
    const learnerId = assertLearnerId(save.learnerId);
    return this.serialized(learnerId, async () => {
      let existing = null;
      try { existing = await this.storage.load(learnerId); } catch { existing = 'unreadable'; }
      if (existing && request.replace !== true) throw conflictError('The server already holds a save for this learner.', 'SAVE_EXISTS');
      const staged = clone(save);
      if (staged.spellbook && typeof staged.spellbook === 'object') staged.spellbook.processedAssessments = {};
      try { await this.storage.save(staged); }
      catch (error) {
        if (error.code === 'SAVE_UNREADABLE') throw validationError('That save cannot be read by this server.');
        throw error;
      }
      this.encounters.delete(learnerId);
      this.reviewChallenges.delete(learnerId);
      return { restored: true, learnerId, language: this.content.language };
    });
  },
};
