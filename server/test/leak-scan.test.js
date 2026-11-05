// Round 044 (backlog G2): the leak scanner for live reports (server/scripts/leak-scan.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { fold, openObjectives, playerTurns, scanLine, scanReport, scenesOf, summarize, foreignFormsFor } from '../scripts/leak-scan.js';

const es = loadGameContent({ language: 'es' });
const it = loadGameContent({ language: 'it' });
const say = (message, verdicts, ok = true) => ({ name: `say "${message}"`, ok, ...(ok ? { verdicts } : { code: 'PROVIDER_FAILURE' }) });
const v = (objective, passed) => ({ objective, passed, evidence: [] });

test('a word inside an open multi-word form is a near hit; the whole form is exact and not counted twice', () => {
  const forms = [{ objective: 'ask_more', form: 'un poco más' }];
  assert.deepEqual(scanLine('¿Quieres más?', forms, 'es'), { exact: [], words: [{ objective: 'ask_more', form: 'un poco más', word: 'mas' }] });
  assert.deepEqual(scanLine('Aquí tienes un poco más.', forms, 'es'), { exact: [{ objective: 'ask_more', form: 'un poco más' }], words: [] });
  assert.deepEqual(scanLine('Una mascota de la casa.', forms, 'es').words, [], 'whole words only; function words never hit');
  // Real Italian forms with an apostrophe, straight or curly (critique 1.8, 1.10).
  const ancora = [{ objective: 'ask_more', form: "ancora un po'" }];
  assert.equal(scanLine('Ne vuoi ancora un po’?', ancora, 'it').exact.length, 1);
  assert.deepEqual(scanLine('Ancora?', ancora, 'it').words.map((w) => w.word), ['ancora']);
  assert.equal(fold("l'ho"), ' l ho ');
});

test('Errata\'s English words are not word hits in its lines (critique 1.6)', () => {
  const forms = [{ objective: 'x', form: 'come ti chiami' }];
  assert.deepEqual(scanLine('Cøntainment: come here.', forms, 'it', { english: true }).words, []);
  assert.deepEqual(scanLine('Come stai?', forms, 'it').words.map((w) => w.word), ['come']);
});

test('objectives close as the server advances: leading passes only, in order (critique 1.1)', () => {
  const objectives = [{ id: 'praise_coffee' }, { id: 'thank_gerald' }];
  const turns = [{ verdicts: [v('praise_coffee', false), v('thank_gerald', true)] }, { verdicts: [v('praise_coffee', true), v('thank_gerald', true)] }];
  assert.deepEqual(openObjectives(objectives, turns, 0).map((o) => o.id), ['praise_coffee', 'thank_gerald'], 'the greeting: all open');
  assert.deepEqual(openObjectives(objectives, turns, 1).map((o) => o.id), ['praise_coffee', 'thank_gerald'], 'a later pass alone advances nothing');
  assert.deepEqual(openObjectives(objectives, turns, 2).map((o) => o.id), []);
  // A turn's verdicts list only the objectives still open.
  assert.deepEqual(openObjectives(objectives, [{ verdicts: [v('praise_coffee', true), v('thank_gerald', false)] }, { verdicts: [v('thank_gerald', true)] }], 2), []);
});

test('only successful says count as turns, so a failed step does not shift the lines (critique 1.2)', () => {
  const report = { steps: [{ name: 'start Mortimer', ok: true }, say('a', [v('x', false)]), say('b', null, false), say('c', [v('x', true)])] };
  assert.deepEqual(playerTurns(report).map((t) => t.message), ['a', 'c']);
});

const tasting = (lines, steps) => ({ language: 'es', conversation: { encounterId: 'mortimer_tasting', lines: lines.map((native) => ({ native })), grading: [] }, steps });

test('the round 023 near-leak is found; a closed objective\'s words stop counting', () => {
  const report = tasting(
    ['¡Hola! ¿Qué te parece?', 'Bien. ¿Te gusta?', '¡Te gusta! ¿Quieres más?', '¡Claro! Un poco más de jamón.'],
    [say('I like it.', [v('like_it', false), v('ask_more', false)]), say('Me gusta.', [v('like_it', true), v('ask_more', false)]), say('Un poco más, por favor.', [v('ask_more', true)])],
  );
  const { scenes: [scene], skipped } = scanReport(report, es);
  assert.deepEqual(skipped, []);
  assert.deepEqual(scene.hits.map((h) => [h.line, h.kind, h.words.map((w) => w.word)]), [[1, 'near', ['gusta']], [2, 'near', ['mas']]]);
  assert.deepEqual([scene.leakLines, scene.nearLines, scene.echoLines], [0, 2, 0]);
});

test('an NPC repeating the player\'s failed answer is an echo; a passage quoted from the intent is quoted', () => {
  const butcher = { language: 'it', encounters: [{ encounterId: 'butchers_stall_charcutier', lines: ['Buongiorno!', 'Salame, certo. Quanto?', 'Chilo, sì! Ma quanto?'].map((native) => ({ native })), grading: [] }],
    steps: [say('Vorrei del salame.', [v('name_meat', true), v('quantity', false)]), say('Chilo.', [v('quantity', false)])] };
  const [scene] = scanReport(butcher, it).scenes;
  assert.deepEqual(scene.hits.map((h) => [h.line, h.kind]), [[2, 'echo']]);
  const shop = { language: 'it', encounters: [{ encounterId: 'old_bookshop_bookworm', lines: [{ native: 'Il suo viaggio verso casa dura vent\'anni.' }], grading: [] }], steps: [] };
  assert.deepEqual(scanReport(shop, it).scenes[0].hits.map((h) => h.kind), ['quoted']);
});

test('report shapes: a tour, a party run, a top-level scene of rounds 005–008, greeting replays; misaligned and unknown are counted', () => {
  assert.deepEqual(scenesOf({ encounters: [{ encounterId: 'a', lines: [], grading: [] }, { encounterId: 'b', lines: [], grading: [] }] }).map((s) => s.encounterId), ['a', 'b']);
  assert.deepEqual(scenesOf({ home: { encounterId: 'a', lines: [], grading: [] }, conversation: { encounterId: 'b', lines: [], grading: [] }, steps: [{ lines: [], grading: [] }] }).map((s) => s.encounterId), ['a', 'b']);
  const old = scanReport({ language: 'it', lines: [{ native: 'Buongiorno! Cosa desideri?' }], grading: [], steps: [] }, it);
  assert.deepEqual(old.scenes.map((s) => [s.encounterId, s.inferred]), [['imp_coffee_greeting', true]]);
  const replays = scanReport({ language: 'it', results: [{ encounterId: 'market_entrance_tutorial', native: 'Buongiorno! Sono Portia.' }, { error: 'x' }] }, it);
  assert.deepEqual(replays.scenes.map((s) => [s.replay, s.leakLines]), [[true, 1]]);
  assert.match(scanReport({ language: 'it', encounters: [{ encounterId: 'imp_coffee_greeting', lines: [{ native: 'a' }, { native: 'b' }], grading: [] }], steps: [] }, it).skipped[0].reason, /turns do not match/);
  assert.match(scanReport({ language: 'it', encounters: [{ encounterId: 'gone', lines: [{ native: 'a' }], grading: [] }], steps: [] }, it).skipped[0].reason, /unknown encounter gone/);
  const { files, total } = summarize([{ error: 'not JSON' }, { language: 'it', scenes: [], skipped: [] }, { language: 'it', ...replays }]);
  assert.deepEqual(files, { 'not JSON': 1, 'no scenes': 1, scanned: 1 });
  assert.equal(total.it.leakLines, 1);
});

// Round 049 (backlog G7): other-target exposure, counted apart from the four kinds.
const scene = (language, encounterId, lines, steps = []) => ({ language, conversation: { encounterId, lines: lines.map((native) => ({ native })), grading: [] }, steps });

test('another conversation\'s target is a foreign hit, apart from the four kinds; own targets are not foreign', () => {
  const report = scene('it', 'flick_lotus', ['Eccomi, sono sveglio!', 'Coraggio, sì!'],
    [say('Svegliati!', [v('wake_up', true), v('courage', false)])]);
  const [s] = scanReport(report, it).scenes;
  assert.deepEqual(s.foreign.map((f) => [f.line, f.hits.map((h) => [h.owner, h.id, h.form])]), [[0, [['marginalia_folded_page', 'eccomi', 'eccomi']]]]);
  assert.deepEqual([s.leakLines, s.nearLines, s.quotedLines, s.echoLines, s.foreignLines, s.party], [1, 0, 0, 0, 1, true], 'coraggio is its own open target: a leak, not foreign');
  assert.deepEqual(s.hits.map((h) => [h.line, h.kind]), [[1, 'leak']], 'the foreign-only line 0 adds no kind (critique 1.8)');
  assert.ok(!foreignFormsFor(it, 'flick_lotus').some((f) => ['svegliati', 'coraggio'].includes(f.id)));
});

test('Spanish: a borrowed English form is marked, not counted; a surface variant counts; shared surfaces are the scene\'s own', () => {
  const [s] = scanReport(scene('es', 'flick_lotus', ['¡Muchas gracias, amigo!']), es).scenes;
  assert.deepEqual(s.foreign[0].hits.map((h) => [h.owner, h.form, h.english]), [['gerald_coffee_break', 'gracias', false], ['gerald_coffee_break', 'muchas gracias', false], ['gerald_confidence', 'amigo', true]]);
  assert.equal(s.foreignLines, 1, 'one line, however many owners');
  const [amigoOnly] = scanReport(scene('es', 'flick_lotus', ['Te oigo, amigo.']), es).scenes;
  assert.equal(amigoOnly.foreignLines, 0, 'amigo alone is an English look-alike (critique 1.2)');
  const [own] = scanReport(scene('it', 'gerald_coffee_break', ['Grazie!']), it).scenes;
  assert.deepEqual([own.foreign, own.foreignLines, own.party], [[], 0, true]);
  const [home] = scanReport(scene('it', 'imp_coffee_greeting', ['Grazie!']), it).scenes;
  assert.deepEqual([home.foreign[0].hits[0].owner, home.foreignLines, home.party], ['gerald_coffee_break', 1, false]);
});

test('a foreign echo needs one earlier message with the whole form (critique 1.7); a fresh hit beside an echo counts', () => {
  const lines = ['Ciao.', 'Ciao.', 'Grazie, amico mio. Insieme!'];
  const turns = [say('Sei mio', [v('wake_up', false)]), say('amico', [v('wake_up', false)])];
  const [echoed] = scanReport(scene('it', 'flick_lotus', lines.slice(0, 3), turns), it).scenes;
  const hits = echoed.foreign[0].hits.map((h) => [h.form, h.echo]).sort();
  assert.deepEqual(hits, [['amico', true], ['grazie', false], ['insieme', false]]);
  assert.equal(echoed.foreignLines, 1);
  const [split] = scanReport(scene('it', 'flick_lotus', ['Ciao.', 'Ciao.', 'Amico!'], [say('ami', [v('wake_up', false)]), say('co', [v('wake_up', false)])]), it).scenes;
  assert.deepEqual([split.foreign[0].hits[0].echo, split.foreignLines], [false, 1]);
});

test('summarize: foreign lines overall and in party conversations only (critique 1.1); zero-hit scenes add lines', () => {
  const party = scanReport(scene('it', 'flick_lotus', ['Eccomi!', 'Nothing here.'], [say('x', [v('wake_up', false)])]), it);
  const home = scanReport(scene('it', 'imp_coffee_greeting', ['Grazie!']), it);
  const { total } = summarize([{ language: 'it', ...party }, { language: 'it', ...home }]);
  assert.deepEqual([total.it.lines, total.it.foreignLines, total.it.partyLines, total.it.partyForeignLines, total.it.leakLines], [3, 2, 2, 1, 0]);
});
