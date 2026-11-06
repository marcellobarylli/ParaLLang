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

// Round 097 (review R1.3, R1.9; critique 1.9): objectives close as `submitDialogue` closes them; echo needs one message.
test('the scan closes objectives as the server does: unordered, out of authored order, a held early pass', () => {
  const objectives = [{ id: 'a' }, { id: 'b' }];
  const early = [{ verdicts: [v('a', false), v('b', true)] }, { verdicts: [v('a', true)] }];
  assert.deepEqual(openObjectives(objectives, early, 1, { unordered: true }).map((o) => o.id), ['a'], 'unordered: b closed at once');
  assert.deepEqual(openObjectives(objectives, early, 2, { unordered: true }), []);
  assert.deepEqual(openObjectives(objectives, early, 1).map((o) => o.id), ['a', 'b'], 'ordered: b is held, still open');
  assert.deepEqual(openObjectives(objectives, early, 2).map((o) => o.id), ['b'], 'ordered: a closes, the held b does not');
  const reversed = [{ verdicts: [v('b', false), v('a', true)] }];
  assert.deepEqual(openObjectives(objectives, reversed, 1).map((o) => o.id), ['b'], 'the grader\'s order does not matter');
});

test('Mortimer\'s tasting (unordered) in a report: a passed ask_more is no longer open', () => {
  const content = loadGameContent({ language: 'es' });
  const report = {
    language: 'es',
    steps: [{ ok: true, name: 'say "Un poco más, por favor."', verdicts: [v('like_it', false), v('ask_more', true)] }],
    encounters: [{ encounterId: 'mortimer_tasting', grading: [], lines: [{ native: 'Prueba esto.' }, { native: 'Más jamón. ¿Quieres un poco más? ¿Te gusta?' }] }],
  };
  const [scene] = scanReport(report, content).scenes;
  const hits = scene.hits.flatMap((hit) => [...hit.exact, ...hit.words]).map((hit) => hit.objective);
  assert.ok(!hits.includes('ask_more'), JSON.stringify(scene.hits));
});

test('a form split over two earlier messages is not an echo', () => {
  const content = loadGameContent({ language: 'it' });
  const report = {
    language: 'it',
    steps: [
      { ok: true, name: 'say "Vorrei senza"', verdicts: [v('order_coffee', false), v('no_milk', false)] },
      { ok: true, name: 'say "latte macchiato"', verdicts: [v('order_coffee', false), v('no_milk', false)] },
    ],
    encounters: [{ encounterId: 'imp_coffee_greeting', grading: [], lines: [{ native: 'Ciao.' }, { native: 'Hmm.' }, { native: 'Allora, senza latte?' }] }],
  };
  const [scene] = scanReport(report, content).scenes;
  const exact = scene.hits.flatMap((hit) => hit.exact).filter((hit) => hit.form === 'senza latte');
  assert.equal(exact.length, 1, JSON.stringify(scene.hits));
  assert.equal(exact[0].echo, false);
});

// Round 100 (round 097 review R1.5; critique 1.1-1.7): narratives and grader feedback, counted apart.
const gerald = (steps, lines, grading = []) => ({ language: 'it', steps, encounters: [{ encounterId: 'imp_coffee_greeting', grading, lines }] });
const fb = (message, verdicts, feedback) => ({ ok: true, name: `say "${message}"`, verdicts, feedback });
const grade = (overall, ...parts) => ({ output: { overall_feedback: overall, objective_results: parts.map((feedback, i) => ({ objective_id: `o${i}`, feedback })) } });
const extrasOf = (report, content = it) => scanReport(report, content).scenes[0].extras;

test('a narrative naming an open form is fresh; a closed one\'s form is not; a replay greeting adds no narrative', () => {
  const report = gerald([fb('Vorrei un caffè.', [v('order_coffee', true), v('no_milk', false)], 'Good.')], [
    { native: 'Ciao.', narrative: 'Gerald mutters "senza latte" to the cups.' },
    { native: 'Bene.', narrative: 'He hums "vorrei", then frowns.' },
  ]);
  const extras = extrasOf(report);
  assert.equal(extras.narratives, 2);
  const narratives = extras.texts.filter((x) => x.field === 'narrative');
  assert.deepEqual(narratives.map((x) => [x.line, x.fresh]), [[0, true]], JSON.stringify(extras.texts));
  assert.equal(narratives[0].hits[0].objective, 'no_milk');
  const replay = scanReport({ language: 'it', results: [{ encounterId: 'imp_coffee_greeting', native: 'Ciao.' }] }, it).scenes[0].extras;
  assert.equal(replay.narratives, 0);
});

test('feedback: the objective passed in that turn is no hit, a later open one is fresh, a held pass the player wrote is echo', () => {
  const passed = gerald([fb('Vorrei un caffè.', [v('order_coffee', true), v('no_milk', false)], 'Vorrei works. Now say senza latte.')], [{ native: 'Ciao.' }, { native: 'Bene.' }]);
  const [text] = extrasOf(passed).texts;
  assert.deepEqual(text.hits.map((hit) => [hit.objective, hit.echo]), [['no_milk', false]]);
  assert.equal(text.fresh, true);
  // A held pass: no_milk passed early, order_coffee failed, so no_milk stays open; the grader quotes the player.
  const held = gerald([fb('Senza latte.', [v('order_coffee', false), v('no_milk', true)], 'You said senza latte; order first.')], [{ native: 'Ciao.' }, { native: 'Hmm.' }]);
  const [quote] = extrasOf(held).texts;
  assert.deepEqual(quote.hits.map((hit) => [hit.objective, hit.echo]), [['no_milk', true]]);
  assert.equal(quote.fresh, false);
});

test('feedback on the resolving turn names nothing open; an unordered encounter closes what passed', () => {
  const resolved = gerald([fb('Vorrei un caffè senza latte.', [v('order_coffee', true), v('no_milk', true)], 'Vorrei un caffè senza latte: perfect.')], [{ native: 'Ciao.' }, { native: 'Ecco.' }]);
  assert.deepEqual(extrasOf(resolved).texts, []);
  const tasting = {
    language: 'it',
    steps: [fb('Ancora!', [v('like_it', false), v('ask_more', true)], 'Ancora is right; now say mi piace.')],
    encounters: [{ encounterId: 'mortimer_tasting', grading: [], lines: [{ native: 'Assaggia.' }, { native: 'Bene.' }] }],
  };
  const [text] = extrasOf(tasting).texts;
  assert.deepEqual(text.hits.map((hit) => hit.objective), ['like_it']);
});

test('an English form is marked and counted apart, not fresh', () => {
  const report = gerald([], [{ native: 'Ciao.', narrative: 'Gerald pours an espresso nobody ordered.' }]);
  const [text] = extrasOf(report).texts;
  assert.deepEqual([text.fresh, text.englishOnly, text.hits[0].english], [false, true, true]);
  const { extras } = summarize([{ path: 'docs/rounds/100/results/x.json', language: 'it', ...scanReport(report, it) }]);
  assert.deepEqual(extras.it['from 051'], { narratives: 1, freshNarratives: 0, englishNarratives: 1, feedbackTurns: 0, freshFeedback: 0, englishFeedback: 0, feedbackUnmatched: 0 });
});

test('per-objective feedback comes from the first unused grading with the step\'s feedback; none is unmatched', () => {
  const steps = [
    fb('Ciao.', [v('order_coffee', false), v('no_milk', false)], 'Try again.'),
    fb('Ciao!', [v('order_coffee', false), v('no_milk', false)], 'Try again.'),
    fb('Hm.', [v('order_coffee', false), v('no_milk', false)], 'Something else.'),
  ];
  const lines = [{ native: 'Ciao.' }, { native: 'No.' }, { native: 'No.' }, { native: 'No.' }];
  // A failed attempt's grading first, then two with identical feedback: the first names a form, the second does not.
  const grading = [grade('Other.', 'say senza latte'), grade('Try again.', 'Ask with senza latte.'), grade('Try again.', 'Ask for coffee.')];
  const extras = extrasOf(gerald(steps, lines, grading));
  assert.equal(extras.feedbackTurns, 3);
  assert.equal(extras.feedbackUnmatched, 1);
  assert.deepEqual(extras.texts.map((x) => x.turn), [0], JSON.stringify(extras.texts));
});

test('eraOf: before 051, from 051, other', async () => {
  const { eraOf } = await import('../scripts/leak-scan.js');
  assert.deepEqual(['docs/rounds/007/results/a.json', 'docs/rounds/051/results/b.json', '/tmp/c.json'].map(eraOf), ['before 051', 'from 051', 'other']);
});

// Round 101 (round 044 open item 2; critique 1.1-1.6): optional frame words and *espresso* are `soft`, not `leak`.
// Without turns, each native is its own one-line scene (all objectives open); with turns, one scene.
const kindsOf = (language, encounterId, natives, steps = []) => {
  const scan = (lines, turns) => {
    const report = { language, steps: turns, encounters: [{ encounterId, grading: [], lines: lines.map((native) => ({ native })) }] };
    const [scene] = scanReport(report, language === 'it' ? it : es).scenes;
    return lines.map((_, k) => scene.hits.find((hit) => hit.line === k)?.kind ?? null);
  };
  return steps.length ? scan(natives, steps) : natives.flatMap((native) => scan([native], []));
};

test('Errata: a frame word alone is soft; the key answer beside it is a leak; a fresh word of a required form is near', () => {
  assert.deepEqual(kindsOf('es', 'the_rift_errata', ['Tu nombre, por favor.', 'Tu nombre: nadie.']), ['soft', 'leak']);
  // "chiamo" from the required "mi chiamo" beside the frame word "nome": the word hit is the stronger hint.
  assert.deepEqual(kindsOf('it', 'the_rift_errata', ['Il tuo nome? Come ti chiamano? Chiamo io.']), ['near']);
  assert.deepEqual(kindsOf('it', 'the_rift_errata', ['Non basta.']), ['leak'], 'basta is a required answer');
});

test('Gerald: espresso shots and vorrei are soft; caffè is a leak; Portia\'s Ciao and Mortimer\'s tre stay leaks', () => {
  assert.deepEqual(kindsOf('it', 'imp_coffee_greeting', ['This cart gets five espresso shots.', 'Vorrei? Dimmi.', 'Un caffè?']), ['soft', 'soft', 'leak']);
  assert.deepEqual(kindsOf('it', 'market_entrance_tutorial', ['Ciao! Benvenuto.']), ['leak']);
  // Mortimer's numbers are outside the required groups, but the quantity constraint needs one (critique 1.2).
  const step = { ok: true, name: 'say "Prosciutto."', verdicts: [v('name_meat', true), v('quantity', false)] };
  assert.deepEqual(kindsOf('it', 'butchers_stall_charcutier', ['Cosa vuoi?', 'Tre? Quanto?'], [step]), [null, 'leak']);
});

test('a soft form the player wrote earlier is echo; summarize counts soft lines', () => {
  const step = { ok: true, name: 'say "Vorrei."', verdicts: [v('order_coffee', false), v('no_milk', false)] };
  assert.deepEqual(kindsOf('it', 'imp_coffee_greeting', ['Ciao.', 'Vorrei cosa?'], [step]), [null, 'echo']);
  const report = { language: 'it', steps: [], encounters: [{ encounterId: 'imp_coffee_greeting', grading: [], lines: [{ native: 'Vorrei? Dimmi.' }] }] };
  const { total } = summarize([{ path: 'docs/rounds/101/results/x.json', language: 'it', ...scanReport(report, it) }]);
  assert.equal(total.it.softLines, 1);
  assert.equal(total.it.leakLines, 0);
  assert.deepEqual(total.it.byEra, { 'from 051': { leakLines: 0, softLines: 1 } });
});

test('content: every frame word is a target of its objective, outside its required groups, and shares no form with a required entry', async () => {
  const { FRAME_TARGETS } = await import('../scripts/leak-scan.js');
  for (const content of [it, es]) {
    for (const [encounterId, byObjective] of Object.entries(FRAME_TARGETS)) {
      const objectives = content.encounters.get(encounterId).encounter.objectives;
      for (const [objectiveId, ids] of Object.entries(byObjective)) {
        const objective = objectives.find((candidate) => candidate.id === objectiveId);
        assert.ok(objective, `${encounterId}.${objectiveId}`);
        const own = ids.filter((id) => objective.target_vocabulary_ids.includes(id));
        assert.equal(own.length, 1, `${content.language.code} ${encounterId}.${objectiveId}: one listed id per pack`);
        const required = new Set(objective.required_target_groups.flat());
        assert.ok(!required.has(own[0]), `${own[0]} is required`);
        const forms = (id) => { const entry = content.vocabularyById.get(id); return [entry.target, ...(entry.surface_variants ?? [])].map((form) => fold(form).trim()); };
        const requiredForms = new Set([...required].flatMap(forms));
        for (const form of forms(own[0])) assert.ok(!requiredForms.has(form), `${form} is also a required form`);
      }
    }
  }
});
