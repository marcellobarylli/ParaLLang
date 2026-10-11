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

function targetData(objectives, vocabularyById) {
  return objectives.map((objective) => ({
    id: objective.id,
    intent: objective.intent,
    reference_meaning: objective.reference_meaning,
    targets: objective.target_vocabulary_ids.map((id) => {
      const entry = vocabularyById.get(id);
      return { id, spanish: entry.spanish, meanings: entry.accepted_translations };
    }),
    required_target_groups: objective.required_target_groups,
    grammar_constraints: objective.grammar_constraints,
    accepted_examples: objective.accepted_examples,
    negative_examples: objective.negative_examples,
  }));
}

export function buildNarrationMessages({
  character,
  objectives,
  vocabularyById,
  conversationHistory = [],
  playerInput = null,
  spanishRatio,
  decision = null,
}) {
  const system = fillTemplate(loadTemplate('system/base.txt'), {
    enemy: { name: character.name, species: character.species, tone: character.personality.tone, quirks: character.personality.quirks.join('; ') },
    language: { spanishRatio: Math.round(spanishRatio * 100), learningData: JSON.stringify(targetData(objectives, vocabularyById)) },
  });
  const turnData = playerInput === null
    ? { task: 'greeting', scene: 'The player approaches Gerald at The Coffee Cart in The Crumbling Market.' }
    : { task: 'react_to_player', player_answer: playerInput, authoritative_decision: decision };

  return [
    { role: 'system', content: system },
    ...conversationHistory,
    { role: 'user', content: fillTemplate(loadTemplate(playerInput === null ? 'encounter/greeting.txt' : 'encounter/dialogue_turn.txt'), { turnData: JSON.stringify(turnData) }) },
  ];
}

export function buildGradingMessages({ objectives, vocabularyById, conversationContext, playerInput }) {
  const rubric = targetData(objectives, vocabularyById);
  const system = fillTemplate(loadTemplate('language/grading.txt'), { rubric: JSON.stringify(rubric) });
  return [
    { role: 'system', content: system },
    { role: 'user', content: JSON.stringify({ conversation_context: conversationContext, player_answer: playerInput }) },
  ];
}

// Compatibility export with a fixed ratio; new code supplies the authoritative ratio explicitly above.
export function buildEncounterPrompt(character, encounterConfig, conversationHistory, playerInput) {
  const objectives = encounterConfig.objectives ?? [];
  const vocabularyById = new Map();
  for (const objective of objectives) {
    for (const id of objective.target_vocabulary_ids ?? []) {
      if (!vocabularyById.has(id)) vocabularyById.set(id, { spanish: id, accepted_translations: [] });
    }
  }
  return buildNarrationMessages({
    character, objectives, vocabularyById, conversationHistory, playerInput,
    spanishRatio: character.language_profile.base_spanish_ratio,
  });
}
