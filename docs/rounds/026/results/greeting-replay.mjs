// Round 026: paired greeting replays. For every encounter of the pack, renders the greeting prompt as startEncounter
// does, once with the HEAD language-mix rule (old) and once with the round 026 rule (new), and sends each to the
// provider `--reps` times, alternating variants. Records each greeting's share estimate.
//   TARGET_LANGUAGE=it node docs/rounds/026/results/greeting-replay.mjs --provider codex-cli [--reps 2] [--only id,id] --out <file>
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { CLI_PROVIDERS, loadRootEnv } from '../../../../server/src/config.js';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { createLLMAdapter, encounterResponseSchema } from '../../../../server/src/llm/index.js';
import { buildNarrationMessages } from '../../../../server/src/llm/prompt-builder.js';
import { languageShare } from '../../../../server/scripts/play-market.js';

const OLD_RULE = (pct, name) => `- Target approximately ${pct}% ${name} in dialogue.`;
export const NEW_RULE = (pct, name, per20) => `- Language mix: about ${pct}% of the words in each dialogue line are ${name}, the greeting included (in a 20-word line, about ${per20} words). Stay within about 10 points of it, under or over.\n- Reach it with short, whole ${name} phrases (questions, reactions, remarks) that the English around them explains, not a single ${name} formula inside a long English line.`;

// The greeting messages of an encounter, as startEncounter renders them (party conversations at the market's start).
export function greetingMessages(content, definition) {
  const locationId = definition.encounter.location ?? content.world.start;
  const ratio = definition.character.language_profile.base_target_ratio;
  const messages = buildNarrationMessages({
    language: content.language, character: definition.character, styleGuide: content.styleGuide,
    locationName: content.world.locationsById.get(locationId).name, objectives: definition.encounter.objectives,
    vocabularyById: content.vocabularyById, targetRatio: ratio, ambientEntries: definition.ambientEntries,
  });
  return { messages, ratio };
}

// Both variants of a rendered system prompt: the old rule and the new one, whichever the template holds now.
export function variants(messages, ratio, name) {
  const pct = Math.round(ratio * 100);
  const system = messages[0].content;
  const oldLine = OLD_RULE(pct, name);
  const newLines = NEW_RULE(pct, name, Math.round(ratio * 20));
  const old = system.includes(oldLine) ? system : system.replace(newLines, oldLine);
  const neu = old.replace(oldLine, newLines);
  if (!old.includes(oldLine) || !neu.includes(newLines)) throw new Error('language-mix rule not found in the system prompt');
  return { old: [{ ...messages[0], content: old }, ...messages.slice(1)], new: [{ ...messages[0], content: neu }, ...messages.slice(1)] };
}

async function main(args = process.argv.slice(2), env = process.env) {
  loadRootEnv({ env });
  const provider = args[args.indexOf('--provider') + 1];
  if (!CLI_PROVIDERS.has(provider)) throw new Error('--provider codex-cli or claude-cli');
  env.LLM_PROVIDER = provider;
  const reps = args.includes('--reps') ? Number(args[args.indexOf('--reps') + 1]) : 2;
  const out = args[args.indexOf('--out') + 1];
  const content = loadGameContent({ language: env.TARGET_LANGUAGE ?? 'it' });
  const adapter = createLLMAdapter({}, env);
  const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
  const results = [];
  for (const [id, definition] of content.encounters) {
    if (only && !only.has(id)) continue;
    const { messages, ratio } = greetingMessages(content, definition);
    const pair = variants(messages, ratio, content.language.name);
    for (let rep = 0; rep < reps; rep += 1) {
      for (const variant of rep % 2 ? ['new', 'old'] : ['old', 'new']) {
        const started = Date.now();
        try {
          const output = await adapter.structuredChat(pair[variant], encounterResponseSchema, { schemaName: 'encounter_narration', temperature: 0.2 });
          const share = languageShare(output.dialogue.native, output.dialogue.translation, definition.narrationEntries);
          results.push({ encounterId: id, variant, rep, ratio, share, native: output.dialogue.native, translation: output.dialogue.translation, narrative: output.narrative, ms: Date.now() - started });
          console.log(`${id} ${variant} ${rep} req=${ratio} share=${share.notInTranslation} | ${output.dialogue.native}`);
        } catch (error) {
          results.push({ encounterId: id, variant, rep, ratio, error: String(error.message ?? error) });
          console.log(`${id} ${variant} ${rep} ERROR ${error.message}`);
        }
        await writeFile(out, JSON.stringify({ language: content.language.code, provider, reps, results }, null, 2));
      }
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
