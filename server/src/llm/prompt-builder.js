import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const promptRoot = resolve(import.meta.dirname, '..', '..', '..', 'prompts');
const templateCache = new Map();

export function loadTemplate(relativePath) {
  if (!templateCache.has(relativePath)) templateCache.set(relativePath, readFileSync(resolve(promptRoot, relativePath), 'utf8'));
  return templateCache.get(relativePath);
}

export function fillTemplate(template, variables) {
  return template.replace(/\{\{([\w.]+)\}\}/g, (placeholder, path) => {
    const value = path.split('.').reduce((current, key) => current?.[key], variables);
    return value === undefined ? placeholder : String(value);
  });
}

// Round 010: the grading rubric also lists each target's authored surface forms (plurals, spellings), which the
// grader must find in the answer; the narration prompt keeps the canonical form only.
function targetData(objectives, vocabularyById, { forms = false } = {}) {
  return objectives.map((objective) => ({
    id: objective.id,
    intent: objective.intent,
    reference_meaning: objective.reference_meaning,
    targets: objective.target_vocabulary_ids.map((id) => {
      const entry = vocabularyById.get(id);
      return { id, target: entry.target, ...(forms ? { forms: entry.surface_variants } : {}), meanings: entry.accepted_translations };
    }),
    required_target_groups: objective.required_target_groups,
    grammar_constraints: objective.grammar_constraints,
    accepted_examples: objective.accepted_examples,
    negative_examples: objective.negative_examples,
  }));
}

// Round 019: an encounter's ambient vocabulary, as one extra line after the learning data; empty when it has none, so
// prompts without it stay byte-identical (Gerald's golden prompts).
function ambientLine(language, entries) {
  if (!entries.length) return '';
  const words = entries.map((entry) => ({
    target: entry.target, meanings: entry.accepted_translations, ...(entry.note ? { usage: entry.note } : {}),
  }));
  return `\nFREE VOCABULARY (authored ${language.name} you may use in any line, including the greeting; it is not the answer to any objective, and every rule above about open objectives still applies): ${JSON.stringify(words)}`;
}

export function buildNarrationMessages({
  language,
  character,
  styleGuide,
  locationName,
  objectives,
  vocabularyById,
  conversationHistory = [],
  playerInput = null,
  targetRatio,
  decision = null,
  ambientEntries = [],
}) {
  const system = fillTemplate(loadTemplate('system/base.txt'), {
    enemy: { name: character.name, species: character.species, tone: character.personality.tone, quirks: character.personality.quirks.join('; ') },
    style: { tone: styleGuide.tone, narratorVoice: styleGuide.narrator_voice, rules: styleGuide.rules.map((rule) => `- ${rule}`).join('\n') },
    language: {
      name: language.name,
      targetRatio: Math.round(targetRatio * 100),
      learningData: JSON.stringify(targetData(objectives, vocabularyById)),
      ambientVocabulary: ambientLine(language, ambientEntries),
    },
  });
  const turnData = playerInput === null
    ? { task: 'greeting', scene: `The player approaches ${character.name} at ${locationName} in The Crumbling Market.` }
    : { task: 'react_to_player', player_answer: playerInput, authoritative_decision: decision };

  return [
    { role: 'system', content: system },
    ...conversationHistory,
    { role: 'user', content: fillTemplate(loadTemplate(playerInput === null ? 'encounter/greeting.txt' : 'encounter/dialogue_turn.txt'), {
      language, enemy: { name: character.name }, location: { name: locationName }, turnData: JSON.stringify(turnData),
    }) },
  ];
}

export function buildGradingMessages({ language, objectives, vocabularyById, conversationContext, playerInput }) {
  const rubric = targetData(objectives, vocabularyById, { forms: true });
  const system = fillTemplate(loadTemplate('language/grading.txt'), { language, rubric: JSON.stringify(rubric) });
  return [
    { role: 'system', content: system },
    { role: 'user', content: JSON.stringify({ conversation_context: conversationContext, player_answer: playerInput }) },
  ];
}
