// Live playthrough of the Crumbling Market through a CLI provider, in-process (no port is opened).
//   node server/scripts/play-market.js --provider codex-cli [--location coffee_cart|market_entrance|butchers_stall|cracked_fountain|old_bookshop|the_rift] [--lines 'a|b|c'] [--out <file.json>]
//   node server/scripts/play-market.js --provider codex-cli --tour [--out <file.json>]
// --party (round 022) wins Gerald, recruits him, walks to the Market Entrance and plays his party conversation
// (gerald_coffee_break) there; the report's `party` part holds that conversation and the member's count.
// --tier N (round 047) sets the member's count to N first and plays the tier then offered (gerald_confidence at 3;
// round 048: mortimer_oath, flick_lotus, marginalia_folded_page at 3).
// --member <home location> (round 023) does the same for another member (butchers_stall, cracked_fountain,
// old_bookshop); the conversation is played at the start location, or at a neighbour if home is the start.
// --recruit (round 021) saves the defeated NPC to the party after a single-location run and reports the party;
// the exit code then also needs the recruit to succeed.
// --tour (round 014) plays every encounter in order and checks that The Rift is sealed before the Old Bookshop's
// encounter and open after it (round 015: then plays the Rift boss); exit code 0 only if every encounter resolved and the gate behaved.
// --lines 'a|b|c' replaces the scripted player lines (round 011: a surface-variant run). It uses a temporary learner
// save, removes it afterwards and prints a JSON report: each step, the LLM's raw outputs, grading verdicts, timings
// and an estimate of the target-language share of each NPC line.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLI_PROVIDERS, loadRootEnv, resolveTargetLanguage } from '../src/config.js';
import { loadGameContent } from '../src/content-loader.js';
import { CORRECTION_PREFIX, LearningService, NARRATION_RETRY_MS } from '../src/learning-service.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { createLLMAdapter } from '../src/llm/index.js';
import { matchCanonicalVocabulary } from '../src/language-engine.js';
import { providerArgument } from './check-provider.js';

// Scripted player lines per location and language (round 009 added the Market Entrance tutorial).
const scripts = {
  coffee_cart: {
    it: ['Vorrei un caffè, per favore.', 'Senza latte, per favore.'],
    es: ['Quiero un café, por favor.', 'Sin leche, por favor.'],
  },
  // Round 010: ham and a bare unit first (both should fail), then a passing meat and quantity.
  butchers_stall: {
    it: ['Vorrei del prosciutto, per favore.', 'Vorrei del salame, per favore.', 'Chilo.', 'Due etti, per favore.'],
    es: ['Quiero jamón, por favor.', 'Quiero chorizo, por favor.', 'Kilo.', 'Medio kilo, por favor.'],
  },
  // Round 011: a wrong command, an English direction and agreeing to later first (all should fail). Round 050: "now"
  // without a time first (should fail the time objective), then a singular hour.
  cracked_fountain: {
    it: ['Guarda!', 'Fermati!', 'Left.', 'A sinistra!', 'Adesso!', "È l'una, Flick.", 'Domani.', 'No, adesso!'],
    es: ['¡Mira!', '¡Quieto!', 'Left.', '¡A la izquierda!', '¡Ahora!', 'Es la una, Flick.', 'Mañana.', '¡No, ahora!'],
  },
  // Round 013: an off-topic answer, English and his real name first (all should fail).
  old_bookshop: {
    it: ['Un libro.', 'Home.', 'A casa!', 'Journathan.', 'Nessuno!'],
    es: ['Un libro.', 'Home.', '¡A casa!', 'Journathan.', '¡Nadie!'],
  },
  // Round 015: English, a coffee without a meat, "tomorrow" and the real name first (all should fail).
  the_rift: {
    it: ['A coffee, please.', 'Vorrei un caffè.', 'Vorrei un caffè e del salame.', 'Fermati domani.', 'Basta, adesso!', 'Mi chiamo Sam.', 'Mi chiamo Nessuno.'],
    es: ['A coffee, please.', 'Quiero un café.', 'Quiero un café y chorizo.', 'Quieto mañana.', '¡Basta, ahora!', 'Me llamo Sam.', 'Me llamo Nadie.'],
  },
  market_entrance: {
    it: ['Ciao!', 'Mi chiamo Sam.', 'E tu?'],
    es: ['¡Hola!', 'Me llamo Sam.', '¿Y tú?'],
  },
};

// Round 022: party conversations, played by --party after recruiting. An English verdict first (should fail), then
// a variant form of the praise, then the thanks.
const partyScripts = {
  gerald_coffee_break: {
    it: ['Delicious!', 'È buonissimo!', 'Grazie mille!'],
    es: ['Delicious!', '¡Está buenísimo!', '¡Muchas gracias!'],
  },
  // Round 047: Gerald's confidence (--party --tier 3). An English line first, then a plural form, then the toast.
  gerald_confidence: {
    it: ['You are my friend.', 'Siamo amici, Gerald.', 'Cin cin!'],
    es: ['You are my friend.', 'Somos amigos, Gerald.', '¡Salud!'],
  },
  // Round 048 (--party --member X --tier 3): an English line, the first target in a variant form, a wrong line for
  // the second objective (should fail without advancing), then the second target.
  mortimer_oath: {
    it: ['Calm down, Mortimer.', 'Stai tranquillo, Mortimer.', 'Non prometto niente.', 'Te lo prometto: only the ordinary hams.'],
    es: ['Calm down, Mortimer.', 'Estate tranquilo, Mortimer.', 'No prometo nada.', 'Te lo prometo: only the ordinary hams.'],
  },
  flick_lotus: {
    it: ['Wake up, Flick!', 'Svegliati, Flick, not five more minutes!', 'Non hai coraggio.', 'Coraggio, Flick!'],
    es: ['Wake up, Flick!', '¡Despiertate, Flick, not five more minutes!', 'No tienes ánimo.', '¡Animo, Flick!'],
  },
  marginalia_folded_page: {
    it: ['Here I am!', 'Eccomi, Marginalia.', 'Sei sola.', 'Non sei sola, Marginalia.'],
    es: ['Here I am!', '¡Aqui estoy, Marginalia!', 'Estás sola.', 'No estás sola, Marginalia.'],
  },
  // Round 023.
  mortimer_tasting: {
    it: ['I like it.', 'Mi piace!', 'Ancora, per favore!'],
    es: ['I like it.', '¡Me gusta!', '¡Un poco más, por favor!'],
  },
  // Round 052: the minutes objective comes first (an English refusal fails, then a number).
  flick_slow_walk: {
    it: ['Five more minutes? No.', 'Due minuti!', 'Andiamo!', 'Insieme.'],
    es: ['Five more minutes? No.', '¡Dos minutos!', '¡Vamos!', 'Juntos.'],
  },
  marginalia_fragment: {
    it: ['It was wonderful.', 'La storia è meravigliosa!', 'Di nuovo, per favore!'],
    es: ['It was wonderful.', '¡La historia es preciosa!', '¡Otra vez, por favor!'],
  },
};

// Round 014: the tour plays every encounter in this order; The Rift (round 015: its boss) comes last.
export const tourOrder = ['market_entrance', 'coffee_cart', 'butchers_stall', 'cracked_fountain', 'old_bookshop', 'the_rift'];

// The shortest walk from one location to another over the map's paths (round 011: the fountain is two steps away).
export function route(world, from, to) {
  const previous = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const here = queue.shift();
    if (here === to) break;
    for (const next of world.neighbours.get(here) ?? []) if (!previous.has(next)) { previous.set(next, here); queue.push(next); }
  }
  if (!previous.has(to)) throw new Error(`No path from ${from} to ${to}.`);
  const path = [];
  for (let at = to; at !== from; at = previous.get(at)) path.unshift(at);
  return path;
}

const tokens = (text) => text.toLocaleLowerCase().match(/[\p{L}']+/gu) ?? [];

// Two rough estimates of the share of target-language words in an NPC line: tokens absent from the English
// translation, and tokens covered by canonical vocabulary matches. Neither is exact; both are reported.
// Round 046: glitch folding for the second estimate. Marks stripped, Errata's glitch letters mapped, runs of one letter
// collapsed ("yoùù" → "you", "procedùre" → "procedure"), on both sides of the comparison.
const GLITCH = { 'ŧ': 't', 'ø': 'o', 'ł': 'l', 'đ': 'd', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ı': 'i' };
// Critique 1.1: runs collapse only in words of 4+ letters, so Spanish "al" never meets English "all" (round 046's
// collision scan). Accent stripping still merges a few cognates ("opinión" → "opinion"): a known small undercount.
export const glitchFold = (word) => {
  const plain = word.normalize('NFD').replace(/\p{M}/gu, '').replace(/[ŧøłđßæœı]/gu, (c) => GLITCH[c]);
  return plain.length >= 4 ? plain.replace(/(\p{L})\1+/gu, '$1') : plain;
};
// Round 046: a translation with fewer than 60% of the line's tokens is a gloss, not a translation.
export const GLOSS_RATIO = 0.6;

export function languageShare(native, translation, entries) {
  const words = tokens(native);
  if (!words.length) return { tokens: 0, notInTranslation: 0, folded: 0, translationShort: false, canonical: 0 };
  const translated = tokens(translation);
  const english = new Set(translated);
  // Critique 1.2: composed forms first, so a decomposed accent cannot split a word in the folded estimate.
  const nfc = (text) => tokens(String(text).normalize('NFC'));
  const foldedWords = nfc(native);
  const foldedEnglish = new Set(nfc(translation).map(glitchFold));
  // A length warning (critique 1.3): a translation this much shorter than the line is likely a gloss.
  const translationShort = translated.length < GLOSS_RATIO * words.length;
  const canonicalTokens = matchCanonicalVocabulary(native, entries).reduce((sum, match) => sum + tokens(match.excerpt || match.entry.target).length, 0);
  return {
    tokens: words.length,
    notInTranslation: +(words.filter((word) => !english.has(word)).length / words.length).toFixed(2),
    // Round 046: the same estimate on glitch-folded tokens; null when the translation is a gloss.
    folded: translationShort ? null : +(foldedWords.filter((word) => !foldedEnglish.has(glitchFold(word))).length / foldedWords.length).toFixed(2),
    translationShort,
    canonical: +(Math.min(canonicalTokens, words.length) / words.length).toFixed(2),
  };
}

// Round 029 (backlog C1): reviews the drill pending where the player stands (the Rift's forced repetition), answering
// each card with its first accepted meaning. No LLM calls. Returns the ids it reviewed, in order.
export async function clearDrill(service, learnerId) {
  const reviewed = [];
  for (let guard = 0; guard < 12; guard += 1) {
    const spellbook = await service.getSpellbook(learnerId);
    const id = spellbook.drill?.vocabularyIds[0];
    if (!id) return reviewed;
    const { challenge } = await service.createReviewChallenge(learnerId, id);
    const entry = service.content.vocabularyById.get(id);
    await service.submitReview(learnerId, { challengeId: challenge.id, attemptId: crypto.randomUUID(), action: 'answer', answer: entry.accepted_translations[0] });
    reviewed.push(id);
  }
  throw new Error('the drill did not clear after 12 reviews');
}

// Round 097 (review R1.1, critique 1.2, 1.4): every provider call in call order. An entry is pushed when the call
// starts and gets its output (or error) and duration when it ends; a narration call whose last message is the
// guard's correction is tagged `retry`.
export function recordCalls(provider, raw) {
  const structuredChat = provider.structuredChat.bind(provider);
  provider.structuredChat = async (messages, schema, options) => {
    const entry = { schema: options?.schemaName, retry: String(messages.at(-1)?.content ?? '').startsWith(CORRECTION_PREFIX) };
    raw.push(entry);
    const started = performance.now();
    try {
      const output = await structuredChat(messages, schema, options);
      entry.output = output;
      return output;
    } catch (error) {
      entry.error = error?.code ?? error?.category ?? 'error';
      throw error;
    } finally {
      entry.durationMs = Math.round(performance.now() - started);
    }
  };
  return provider;
}

// Round 097 (review R1.1, critique 1.2, 1.3, 1.6, 1.8): one line per NPC line the player saw. Narration calls come
// only from starts (the greeting) and says here (prefetch and atmosphere are off; recruit and the drill make none).
// Each narration call is grouped with the retry that follows it; groups are matched in order to the committed
// transcript's NPC natives. When both of a group's natives equal it, the service's rule decides (the retry is kept if
// it has an output, no error, came within the retry deadline and does not lack target language). A group with no
// committed line goes to `uncommitted`.
export function narrationLines(calls, committedNatives, { ratioFor, share, lacksTarget, retryMs = NARRATION_RETRY_MS }) {
  const groups = [];
  for (const call of calls.filter((item) => item.schema === 'encounter_narration')) {
    const open = call.retry ? [...groups].reverse().find((group) => !group.retry) : null;
    if (open) open.retry = call;
    else groups.push({ first: call, retry: null });
  }
  const nativeOf = (call) => (call?.output ? String(call.output.dialogue.native).trim() : null);
  const lines = [];
  const uncommitted = [];
  let next = 0;
  for (const group of groups) {
    const want = committedNatives[next] === undefined ? undefined : String(committedNatives[next]).trim();
    const firstMatches = want !== undefined && nativeOf(group.first) === want;
    const retryMatches = want !== undefined && nativeOf(group.retry) === want;
    if (!firstMatches && !retryMatches) { uncommitted.push(group); continue; }
    const retryKept = retryMatches && (!firstMatches
      || (!group.retry.error && group.retry.durationMs <= retryMs && !lacksTarget(group.retry.output)));
    const kept = retryKept ? group.retry : group.first;
    const other = retryKept ? group.first : group.retry;
    const turn = next;
    next += 1;
    lines.push({
      turn,
      requestedRatio: ratioFor(turn),
      native: kept.output.dialogue.native,
      translation: kept.output.dialogue.translation,
      narrative: kept.output.narrative,
      footnote: kept.output.footnote ?? null, // round 081: as written, before the server's filter
      share: share(kept.output.dialogue.native, kept.output.dialogue.translation),
      durationMs: (group.first.durationMs ?? 0) + (group.retry?.durationMs ?? 0),
      ...(group.retry ? {
        retried: { kept: retryKept ? 'retry' : 'first', rejectedNative: other?.output?.dialogue.native ?? null, durationMs: group.retry.durationMs ?? null, ...(group.retry.error ? { error: group.retry.error } : {}) },
      } : {}),
    });
  }
  return {
    lines,
    uncommitted: uncommitted.map((group) => ({ native: group.first.output?.dialogue.native ?? null, error: group.first.error ?? null, retried: Boolean(group.retry) })),
  };
}

export async function playMarket({ args = process.argv.slice(2), env = process.env } = {}) {
  loadRootEnv({ env });
  const providerName = providerArgument(args) ?? env.LLM_PROVIDER;
  if (!CLI_PROVIDERS.has(providerName)) throw new Error('play-market requires --provider codex-cli or --provider claude-cli.');
  env.LLM_PROVIDER = providerName;
  const tour = args.includes('--tour');
  const locationIndex = args.indexOf('--location');
  const locationId = locationIndex >= 0 ? args[locationIndex + 1] : 'coffee_cart';
  if (!tour && !scripts[locationId]) throw new Error(`play-market has no script for --location ${locationId}; use ${Object.keys(scripts).join(' or ')}.`);
  const provider = createLLMAdapter({}, env);
  const raw = [];
  recordCalls(provider, raw); // round 097
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-play-'));
  const steps = [];
  const step = async (name, run) => {
    try { const result = await run(); steps.push({ name, ok: true, ...result }); return result; }
    catch (error) { steps.push({ name, ok: false, code: error.code ?? null, message: error.message }); return null; }
  };
  try {
    const preflight = await provider.preflight();
    const content = loadGameContent({ language: resolveTargetLanguage(env) });
    const storage = new JsonLearningStorage({ saveDir });
    const service = new LearningService({ provider, storage, content });
    const { learnerId } = await service.createOrRecoverLearner();
    const summary = (world) => ({ current: world.currentLocationId, visible: world.locations.map((l) => `${l.id}:${l.state}`) });

    await step('world at start', async () => summary((await service.getWorld(learnerId)).world));
    await step('move to the_rift (expect NOT_ADJACENT)', async () => summary((await service.moveTo(learnerId, { locationId: 'the_rift' })).world));
    let at = content.world.start;
    const walkTo = async (target) => {
      for (const next of route(content.world, at, target)) {
        await step(`move to ${next}`, async () => summary((await service.moveTo(learnerId, { locationId: next })).world));
      }
      at = target;
    };

    // Plays the encounter at `target` with `playerLines` and returns its part of the report.
    const playAt = async (target, playerLines, conversationId = null) => {
      await walkTo(target);
      const firstCall = raw.length;
      const encounterId = conversationId ?? content.world.locationsById.get(target).encounter;
      const definition = content.encounters.get(encounterId);
      let encounter = (await step(`start ${definition.character.name}`, async () => ({ encounter: (await service.startEncounter(learnerId, { encounterId })).encounter })))?.encounter;
      const companionBriefing = encounter?.companionBriefing ?? null;
      for (const message of playerLines) {
        if (!encounter || encounter.state !== 'ongoing') break;
        const result = await step(`say "${message}"`, async () => {
          const response = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: crypto.randomUUID(), message });
          return {
            encounter: response.encounter,
            verdicts: response.assessment.objectiveResults.map((r) => ({ objective: r.objectiveId, passed: r.passed, evidence: r.vocabularyEvidence })),
            feedback: response.assessment.overallFeedback,
          };
        });
        encounter = result?.encounter ?? encounter;
      }
      const finalWorld = (await service.getWorld(learnerId)).world;
      await step('world after the encounter', async () => ({
        ...summary(finalWorld),
        locationEncounter: finalWorld.locations.find((l) => l.id === target)?.encounter ?? null,
      }));
      // Round 097: completed calls only for the counts (as before); every call, in order, for the lines.
      const allCalls = raw.slice(firstCall);
      const calls = allCalls.filter((item) => item.output);
      const committedNatives = (encounter?.transcript ?? []).filter((message) => message.role === 'npc').map((message) => message.dialogue.native);
      const { lines, uncommitted } = narrationLines(allCalls, committedNatives, {
        ratioFor: (turn) => service.ratioFor(turn, definition),
        share: (native, translation) => languageShare(native, translation, definition.narrationEntries),
        lacksTarget: (output) => service.lacksTarget(output, definition),
      });
      return {
        location: target,
        sceneLocation: encounter?.location ?? null,
        encounterId,
        companionBriefing,
        resolved: encounter?.state === 'resolved',
        completedOnMap: finalWorld.locations.find((l) => l.id === target)?.encounter?.completed === true,
        generationCalls: calls.length,
        lines,
        ...(uncommitted.length ? { uncommittedLines: uncommitted } : {}),
        grading: calls.filter((item) => item.schema === 'dialogue_assessment').map((item) => ({ durationMs: item.durationMs, output: item.output })),
      };
    };
    const tryRift = (label) => step(label, async () => {
      const { world } = await service.moveTo(learnerId, { locationId: 'the_rift' });
      at = 'the_rift';
      return { ...summary(world), gate: world.locations.find((l) => l.id === 'the_rift')?.gate ?? null };
    });
    const strip = () => { for (const s of steps) delete s.encounter; };

    if (tour) {
      // Round 014: The Rift is tried before the last encounter outside it (sealed) and entered after it.
      const encounters = [];
      let before = null;
      let after = null;
      let drillCards = null;
      for (const target of tourOrder) {
        if (target === tourOrder.at(-2)) {
          await walkTo(target);
          await tryRift('move to the_rift before the last encounter (expect SEALED)');
          before = steps.at(-1);
        }
        if (target === 'the_rift') after = await tryRift('move to the_rift after every other encounter (expect success)');
        if (target === 'the_rift') drillCards = (await step('review the drill before the Rift', async () => ({ drillCards: await clearDrill(service, learnerId) })))?.drillCards ?? null;
        encounters.push(await playAt(target, scripts[target][content.language.code]));
      }
      strip();
      return {
        provider: preflight,
        language: content.language.code,
        tour: true,
        riftSealedBefore: before?.ok === false && before.code === 'SEALED',
        riftOpenAfter: after?.current === 'the_rift' && after.gate?.sealed === false,
        // Round 029: the forced repetition before Errata (null if the step failed).
        drillCards,
        resolved: encounters.every((e) => e.resolved && e.completedOnMap),
        generationCalls: raw.filter((item) => item.output).length,
        narrationStats: { ...service.narrationStats }, // round 078: the no-target-language guard
        encounters,
        steps,
      };
    }

    if (args.includes('--party')) {
      const memberIndex = args.indexOf('--member');
      const homeLocation = memberIndex >= 0 ? args[memberIndex + 1] : 'coffee_cart';
      const homeEncounter = content.world.locationsById.get(homeLocation)?.encounter;
      // Round 047: --tier N sets the member's finished conversations to N after recruiting (a harness shortcut, reported
      // as tierCount) and plays the conversation Talk would then offer.
      const tierIndex = args.indexOf('--tier');
      const tierCount = tierIndex >= 0 ? Number(args[tierIndex + 1]) : 0;
      if (!Number.isInteger(tierCount) || tierCount < 0) throw new Error('--tier needs a whole number of conversations.');
      const conversationId = service.partyConversationFor(homeEncounter, tierCount)?.encounter.id;
      if (!conversationId || !partyScripts[conversationId]) throw new Error(`play-market has no party conversation script for --member ${homeLocation}.`);
      const home = await playAt(homeLocation, scripts[homeLocation][content.language.code]);
      const recruited = await step(`recruit ${homeEncounter}`, async () => service.recruit(learnerId, { encounterId: homeEncounter }));
      if (tierCount > 0) {
        const saved = await storage.load(learnerId);
        saved.party.find((member) => member.encounterId === homeEncounter).conversations = tierCount;
        await storage.save(saved);
      }
      const linesIndex = args.indexOf('--lines');
      const conversationLines = linesIndex >= 0 ? args[linesIndex + 1].split('|') : partyScripts[conversationId][content.language.code];
      const away = homeLocation === content.world.start ? content.world.neighbours.get(homeLocation)[0] : content.world.start;
      const conversation = await playAt(away, conversationLines, conversationId);
      const { party } = await service.getParty(learnerId);
      strip();
      return {
        provider: preflight, language: content.language.code, party: true, conversationId, tierCount,
        recruited: recruited?.joined === true,
        resolved: home.resolved && conversation.resolved,
        // The conversation must not mark anything on the map; the member's count goes up instead.
        completedOnMap: home.completedOnMap,
        conversationOffMap: !(await storage.load(learnerId)).world.completedEncounterIds.includes(conversationId),
        conversations: party.find((member) => member.encounterId === homeEncounter)?.conversations ?? null,
        generationCalls: raw.filter((item) => item.output).length,
        narrationStats: { ...service.narrationStats }, // round 078: the no-target-language guard
        home, conversation, steps,
      };
    }

    // Round 015: a gated location played alone (the Rift) gets its required encounters marked complete first.
    const required = content.world.locationsById.get(locationId).requires_completed;
    if (required.length) {
      await step(`seed ${required.length} completed encounters (test save only)`, async () => {
        const envelope = await storage.load(learnerId);
        envelope.world = { ...envelope.world, completedEncounterIds: [...required] };
        await storage.save(envelope);
        return { completed: required };
      });
    }
    const linesIndex = args.indexOf('--lines');
    const playerLines = linesIndex >= 0 ? args[linesIndex + 1].split('|') : scripts[locationId][content.language.code];
    const played = await playAt(locationId, playerLines);
    let party = null;
    if (args.includes('--recruit')) {
      const encounterId = content.world.locationsById.get(locationId).encounter;
      const recruited = await step(`recruit ${encounterId}`, async () => service.recruit(learnerId, { encounterId }));
      await step('party after recruiting', async () => service.getParty(learnerId));
      party = { joined: recruited?.joined === true, members: recruited?.party ?? [] };
    }
    strip();
    const { lines, grading, generationCalls, ...head } = played;
    return { provider: preflight, language: content.language.code, ...head, ...(party ? { party } : {}), generationCalls, narrationStats: { ...service.narrationStats }, steps, lines, grading };
  } finally {
    await provider.shutdown?.();
    await rm(saveDir, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outIndex = process.argv.indexOf('--out');
  playMarket().then(async (report) => {
    const text = `${JSON.stringify(report, null, 2)}\n`;
    if (outIndex > 0) await writeFile(process.argv[outIndex + 1], text);
    process.stdout.write(text);
    const ok = report.tour ? report.resolved && report.riftSealedBefore && report.riftOpenAfter && Array.isArray(report.drillCards)
      : report.party === true ? report.recruited && report.resolved && report.conversationOffMap && report.conversations === (report.tierCount ?? 0) + 1
      : report.resolved && report.completedOnMap && (!report.party || report.party.joined);
    process.exitCode = ok ? 0 : 1;
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
