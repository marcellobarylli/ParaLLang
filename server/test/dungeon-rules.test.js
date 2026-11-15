// Round 119: the dungeon map's rules (server/src/dungeon.js) over the real Ta Prohm file: fog, seals, the pass rule,
// clearing, completion, a new run, and a save from before the map. Pure: no server and no port.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { cleared, freshRun, gateFor, isComplete, moveProblem, moved, neighboursOf, readRun, siteOf, siteStates } from '../src/dungeon.js';

const dungeon = loadGameContent({ language: 'it' }).dungeons.get('ta_prohm');
const states = (run) => Object.fromEntries(Object.entries(siteStates(dungeon, run)).map(([id, site]) => [id, site.state]));
const reachable = (run) => Object.entries(siteStates(dungeon, run)).filter(([, site]) => site.reachable).map(([id]) => id);
// Walks and clears in order, asserting each move is allowed.
function play(run, ids) {
  let current = run;
  for (const id of ids) {
    assert.equal(moveProblem(dungeon, current, id), null, `move to ${id}`);
    current = cleared(dungeon, moved(dungeon, current, id), id);
  }
  return current;
}

test('the map: seven sites, eight paths, a start outside the wall and a sealed goal', () => {
  assert.deepEqual(dungeon.sites.map((site) => site.id), ['face_gate', 'buttress_tree', 'root_court', 'sunlit_court', 'library', 'before_sanctuary', 'sanctuary']);
  assert.equal(dungeon.paths.length, 8);
  assert.deepEqual([dungeon.start, dungeon.goal], ['face_gate', 'sanctuary']);
  assert.deepEqual(neighboursOf(dungeon, 'root_court').sort(), ['before_sanctuary', 'buttress_tree', 'face_gate', 'sunlit_court']);
  assert.deepEqual(neighboursOf(dungeon, 'library'), ['sunlit_court']);
  assert.deepEqual(siteOf(dungeon, 'sanctuary').requires, ['face_gate', 'buttress_tree', 'root_court', 'sunlit_court', 'library', 'before_sanctuary']);
  assert.equal(siteOf(dungeon, 'nowhere'), null);
});

test('fog: a new run shows the start and the sites a path leads to; the rest are hidden', () => {
  const run = freshRun(dungeon);
  assert.deepEqual(run, { run: 1, at: 'face_gate', cleared: [], visited: ['face_gate'] });
  assert.deepEqual(states(run), {
    face_gate: 'current', buttress_tree: 'known', root_court: 'known', sunlit_court: 'hidden', library: 'hidden', before_sanctuary: 'hidden', sanctuary: 'hidden',
  });
  const further = moved(dungeon, cleared(dungeon, run, 'face_gate'), 'root_court');
  assert.deepEqual(states(further), {
    face_gate: 'visited', buttress_tree: 'known', root_court: 'current', sunlit_court: 'known', library: 'hidden', before_sanctuary: 'known', sanctuary: 'hidden',
  });
});

test('the pass rule: a character lets the player pass once answered, and the way back stays open', () => {
  const run = freshRun(dungeon);
  // Portia has not been answered: no site is reachable, and the refusal is BLOCKED for a neighbour.
  assert.deepEqual(reachable(run), []);
  assert.equal(moveProblem(dungeon, run, 'root_court'), 'BLOCKED');
  assert.equal(moveProblem(dungeon, run, 'library'), 'NOT_ADJACENT');
  assert.equal(moveProblem(dungeon, run, 'nowhere'), 'UNKNOWN_SITE');
  assert.equal(moveProblem(dungeon, run, undefined), 'UNKNOWN_SITE');
  assert.equal(moveProblem(dungeon, run, 'face_gate'), null, 'a move to the site the player stands at is allowed');
  assert.equal(moved(dungeon, run, 'face_gate'), run, 'and changes nothing');

  const past = cleared(dungeon, run, 'face_gate');
  assert.deepEqual(reachable(past).sort(), ['buttress_tree', 'root_court']);
  // At Mortimer's site, not yet answered: the way on to Gerald is blocked, the way back to Portia is open.
  const atTree = moved(dungeon, past, 'buttress_tree');
  assert.equal(moveProblem(dungeon, atTree, 'root_court'), 'BLOCKED');
  assert.deepEqual(reachable(atTree), ['face_gate']);
  // Back at the gate, Gerald's court is reachable: it is the gate's character who lets the player pass.
  const back = moved(dungeon, atTree, 'face_gate');
  assert.deepEqual(reachable(back).sort(), ['buttress_tree', 'root_court']);
  // A visited, uncleared site can be walked to from an uncleared one.
  const atCourt = moved(dungeon, back, 'root_court');
  assert.equal(moveProblem(dungeon, atCourt, 'buttress_tree'), null);
  assert.equal(moveProblem(dungeon, atCourt, 'sunlit_court'), 'BLOCKED');
});

test('the seal: the sanctuary opens when the six other sites are cleared, and clearing it completes the run', () => {
  const five = play(freshRun(dungeon), ['face_gate', 'root_court', 'before_sanctuary']);
  assert.deepEqual(gateFor(siteOf(dungeon, 'sanctuary'), five), { sealed: true, required: 6, completed: 3 });
  assert.equal(gateFor(siteOf(dungeon, 'library'), five), null);
  assert.equal(five.at, 'before_sanctuary');
  assert.equal(moveProblem(dungeon, five, 'sanctuary'), 'SEALED');
  assert.equal(siteStates(dungeon, five).sanctuary.state, 'known');
  assert.deepEqual(siteStates(dungeon, five).sanctuary.gate, { sealed: true, required: 6, completed: 3 });

  const six = play(five, ['root_court', 'buttress_tree', 'root_court', 'sunlit_court', 'library', 'sunlit_court', 'before_sanctuary']);
  assert.equal(six.cleared.length, 6);
  assert.equal(isComplete(dungeon, six), false);
  assert.equal(moveProblem(dungeon, six, 'sanctuary'), null);
  const done = play(six, ['sanctuary']);
  assert.equal(isComplete(dungeon, done), true);
  assert.deepEqual(done.cleared, dungeon.sites.map((site) => site.id), 'in the file\'s site order');
  assert.deepEqual(done.visited, dungeon.sites.map((site) => site.id));
  // Clearing a cleared site again changes nothing, and an unknown site is ignored.
  assert.equal(cleared(dungeon, done, 'root_court'), done);
  assert.equal(cleared(dungeon, done, 'nowhere'), done);
});

test('a complete run is open everywhere a path leads', () => {
  // A run whose goal is cleared although other sites are not (content may change under a save).
  const run = readRun(dungeon, { run: 3, at: 'before_sanctuary', cleared: ['sanctuary'], visited: ['face_gate', 'before_sanctuary'] });
  assert.equal(isComplete(dungeon, run), true);
  assert.equal(moveProblem(dungeon, run, 'sunlit_court'), null, 'not blocked by the uncleared site the player stands at');
  assert.equal(moveProblem(dungeon, run, 'library'), 'NOT_ADJACENT');
});

test('a new run forgets the cleared and visited sites and starts at the gate', () => {
  assert.deepEqual(freshRun(dungeon, 4), { run: 4, at: 'face_gate', cleared: [], visited: ['face_gate'] });
});

test('a save from before the map keeps its cleared sites; unknown ids go and the invariants hold', () => {
  assert.deepEqual(readRun(dungeon, undefined), freshRun(dungeon));
  // Rounds 114 to 118: the cleared list held encounter ids, and there was no position.
  const old = readRun(dungeon, { run: 2, cleared: ['market_entrance_tutorial', 'imp_coffee_greeting'] });
  assert.deepEqual(old, { run: 2, at: 'face_gate', cleared: ['face_gate', 'root_court'], visited: ['face_gate', 'root_court'] });
  // Site ids, a stale id, an unknown position, and a visited list that lacks the cleared site.
  const mixed = readRun(dungeon, { run: 1, at: 'the_moon', cleared: ['library', 'dragon_lair'], visited: ['sunlit_court', 'dragon_lair'] });
  assert.deepEqual(mixed, { run: 1, at: 'face_gate', cleared: ['library'], visited: ['face_gate', 'sunlit_court', 'library'] });
  const placed = readRun(dungeon, { run: 1, at: 'root_court', cleared: [], visited: [] });
  assert.deepEqual(placed.visited, ['face_gate', 'root_court']);
});
