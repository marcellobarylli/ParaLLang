// Round 119: the dungeon map's rules (server/src/dungeon.js) over the real Ta Prohm file: fog, seals, the pass rule,
// clearing, completion, a new run, and a save from before the map. Pure: no server and no port.
// Round 121: a site may ask for a level. HIGH is a level above every site's, for the tests that are not about levels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { cleared, freshRun, gateFor, isComplete, moveProblem, moved, neighboursOf, readRun, siteOf, siteStates } from '../src/dungeon.js';

const dungeon = loadGameContent({ language: 'it' }).dungeons.get('ta_prohm');
const HIGH = 9;
const states = (run) => Object.fromEntries(Object.entries(siteStates(dungeon, run, HIGH)).map(([id, site]) => [id, site.state]));
const reachable = (run, level = HIGH) => Object.entries(siteStates(dungeon, run, level)).filter(([, site]) => site.reachable).map(([id]) => id);
// Walks and clears in order, asserting each move is allowed.
function play(run, ids, level = HIGH) {
  let current = run;
  for (const id of ids) {
    assert.equal(moveProblem(dungeon, current, id, level), null, `move to ${id}`);
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
  assert.deepEqual(dungeon.sites.filter((site) => site.requires_level).map((site) => [site.id, site.requires_level]), [['library', 3], ['sanctuary', 5]]);
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

test('the pass rule: any site out of the fog is reachable from anywhere, a hidden one is not', () => {
  const run = freshRun(dungeon);
  // Round 143: no character has to let the player pass; the neighbours of the gate are out of the fog and open.
  assert.deepEqual(reachable(run).sort(), ['buttress_tree', 'root_court']);
  assert.equal(moveProblem(dungeon, run, 'root_court'), null);
  assert.equal(moveProblem(dungeon, run, 'library'), 'NOT_ADJACENT', 'hidden in the fog');
  assert.equal(moveProblem(dungeon, run, 'nowhere'), 'UNKNOWN_SITE');
  assert.equal(moveProblem(dungeon, run, undefined), 'UNKNOWN_SITE');
  assert.equal(moveProblem(dungeon, run, 'face_gate'), null, 'a move to the site the player stands at is allowed');
  assert.equal(moved(dungeon, run, 'face_gate'), run, 'and changes nothing');

  // At Mortimer's site, not yet answered, Gerald's court (known, not a neighbour of this site's) is still open.
  const atTree = moved(dungeon, run, 'buttress_tree');
  assert.equal(moveProblem(dungeon, atTree, 'root_court'), null);
  assert.equal(moveProblem(dungeon, atTree, 'face_gate'), null);
  // Visiting a site lifts the fog on the sites next to it: Gerald's court's neighbour opens from anywhere.
  const atCourt = moved(dungeon, atTree, 'root_court');
  assert.equal(moveProblem(dungeon, atCourt, 'sunlit_court'), null);
  assert.equal(moveProblem(dungeon, atCourt, 'buttress_tree'), null);
  assert.equal(moveProblem(dungeon, atTree, 'sunlit_court'), 'NOT_ADJACENT', 'still hidden before the court is visited');
  assert.equal(moveProblem(dungeon, moved(dungeon, atCourt, 'face_gate'), 'sunlit_court'), null, 'and open from any point after');
});

test('the seal: the sanctuary opens when the six other sites are cleared, and clearing it completes the run', () => {
  const five = play(freshRun(dungeon), ['face_gate', 'root_court', 'before_sanctuary']);
  assert.deepEqual(gateFor(siteOf(dungeon, 'sanctuary'), five, HIGH), { sealed: true, required: 6, completed: 3, level: { required: 5, current: HIGH } });
  assert.equal(gateFor(siteOf(dungeon, 'root_court'), five, HIGH), null);
  assert.equal(five.at, 'before_sanctuary');
  assert.equal(moveProblem(dungeon, five, 'sanctuary', HIGH), 'SEALED');
  assert.equal(siteStates(dungeon, five, HIGH).sanctuary.state, 'known');
  assert.deepEqual(siteStates(dungeon, five, HIGH).sanctuary.gate, { sealed: true, required: 6, completed: 3, level: { required: 5, current: HIGH } });

  const six = play(five, ['root_court', 'buttress_tree', 'root_court', 'sunlit_court', 'library', 'sunlit_court', 'before_sanctuary']);
  assert.equal(six.cleared.length, 6);
  assert.equal(isComplete(dungeon, six), false);
  assert.equal(moveProblem(dungeon, six, 'sanctuary', HIGH), null);
  const done = play(six, ['sanctuary']);
  assert.equal(isComplete(dungeon, done), true);
  assert.deepEqual(done.cleared, dungeon.sites.map((site) => site.id), 'in the file\'s site order');
  assert.deepEqual(done.visited, dungeon.sites.map((site) => site.id));
  // Clearing a cleared site again changes nothing, and an unknown site is ignored.
  assert.equal(cleared(dungeon, done, 'root_court'), done);
  assert.equal(cleared(dungeon, done, 'nowhere'), done);
});

// Round 121: levels open places.
test('a level seal: the Library opens at level 3 and the Sanctuary at level 5, whatever else is met', () => {
  const atCourt = play(freshRun(dungeon), ['face_gate', 'root_court', 'sunlit_court']);
  assert.deepEqual(gateFor(siteOf(dungeon, 'library'), atCourt, 2), { sealed: true, required: 0, completed: 0, level: { required: 3, current: 2 } });
  assert.equal(moveProblem(dungeon, atCourt, 'library', 2), 'SEALED');
  assert.deepEqual(reachable(atCourt, 2).sort(), ['before_sanctuary', 'buttress_tree', 'face_gate', 'root_court']); // every site out of the fog but the sealed one (round 143)
  assert.equal(gateFor(siteOf(dungeon, 'library'), atCourt, 3).sealed, false);
  assert.equal(moveProblem(dungeon, atCourt, 'library', 3), null);
  assert.equal(moveProblem(dungeon, atCourt, 'library'), 'SEALED', 'with no level given the player is level 1');
  // At level 2 the Library is SEALED, at level 3 it is open.
  const before = moved(dungeon, play(freshRun(dungeon), ['face_gate', 'root_court']), 'sunlit_court');
  assert.equal(moveProblem(dungeon, before, 'library', 2), 'SEALED');
  assert.equal(moveProblem(dungeon, before, 'library', 3), null);

  // The Sanctuary: the six sites and level 5.
  const six = play(freshRun(dungeon), ['face_gate', 'buttress_tree', 'root_court', 'sunlit_court', 'library', 'sunlit_court', 'before_sanctuary']);
  assert.deepEqual(gateFor(siteOf(dungeon, 'sanctuary'), six, 4), { sealed: true, required: 6, completed: 6, level: { required: 5, current: 4 } });
  assert.equal(moveProblem(dungeon, six, 'sanctuary', 4), 'SEALED');
  assert.equal(siteStates(dungeon, six, 4).sanctuary.reachable, false);
  assert.deepEqual(gateFor(siteOf(dungeon, 'sanctuary'), six, 5), { sealed: false, required: 6, completed: 6, level: { required: 5, current: 5 } });
  assert.equal(moveProblem(dungeon, six, 'sanctuary', 5), null);
  assert.equal(siteStates(dungeon, six, 5).sanctuary.reachable, true);
});

test('in a complete run no gate is sealed, on the map as for moves, also at level 1 (critique 1.2)', () => {
  // A finished run from before levels existed: every site cleared, no XP.
  const done = readRun(dungeon, { run: 1, at: 'sanctuary', cleared: dungeon.sites.map((site) => site.id), visited: dungeon.sites.map((site) => site.id) });
  const map = siteStates(dungeon, done, 1);
  assert.deepEqual(map.sanctuary.gate, { sealed: false, required: 6, completed: 6, level: { required: 5, current: 1 } });
  assert.deepEqual(map.library.gate, { sealed: false, required: 0, completed: 0, level: { required: 3, current: 1 } });
  assert.equal(map.before_sanctuary.reachable, true);
  assert.equal(moveProblem(dungeon, moved(dungeon, done, 'before_sanctuary'), 'sanctuary', 1), null);
  assert.equal(moveProblem(dungeon, readRun(dungeon, { ...done, at: 'sunlit_court' }), 'library', 1), null);
});

// Round 143: any two places out of the fog are joined, visited or not.
test('a site out of the fog can be reached from anywhere, a hidden one cannot', () => {
  const run = readRun(dungeon, { run: 1, at: 'library', cleared: ['face_gate', 'root_court', 'sunlit_court'], visited: ['face_gate', 'root_court', 'sunlit_court', 'library'] });
  assert.equal(moveProblem(dungeon, run, 'face_gate'), null, 'the gate is not next to the library, but the player has been there');
  assert.equal(moveProblem(dungeon, run, 'root_court'), null);
  assert.equal(moveProblem(dungeon, run, 'buttress_tree'), null, 'never visited, but next to the gate: out of the fog');
  assert.equal(moveProblem(dungeon, readRun(dungeon, { run: 1, at: 'library', cleared: [], visited: ['face_gate', 'library'] }), 'sanctuary'), 'NOT_ADJACENT');
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
