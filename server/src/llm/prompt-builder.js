import { readFileSync } from 'fs';
import { resolve } from 'path';

const templateCache = new Map();
const ROOT = resolve(import.meta.dirname, '..', '..', '..');

/**
 * Load a prompt template file. Cached after first read.
 */
export function loadTemplate(templatePath) {
  if (templateCache.has(templatePath)) return templateCache.get(templatePath);
  const fullPath = resolve(ROOT, 'prompts', templatePath);
  const content = readFileSync(fullPath, 'utf-8');
  templateCache.set(templatePath, content);
  return content;
}

/**
 * Replace {{key.subkey}} placeholders with values from a nested object.
 */
export function fillTemplate(template, variables) {
  return template.replace(/\{\{([\w.]+)\}\}/g, (match, path) => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], variables);
    if (value === undefined) return match; // leave unresolved placeholders as-is
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  });
}

/**
 * Build the full messages array for an encounter turn.
 */
export function buildEncounterPrompt(character, encounterConfig, conversationHistory, playerInput) {
  const turn = conversationHistory.length;
  const spanishRatio = Math.min(
    1,
    character.language_profile.base_spanish_ratio +
      (encounterConfig.escalation?.spanish_ratio_increase_per_turn || 0) * Math.floor(turn / 2)
  );

  const vars = {
    enemy: {
      name: character.name,
      species: character.species,
      personality: {
        tone: character.personality.tone,
        quirks: character.personality.quirks,
      },
      appearance: character.appearance,
      combat_style: character.combat_style,
      defeat_condition: {
        description: character.defeat_condition?.description || encounterConfig.defeat_condition?.description || '',
      },
    },
    language: {
      spanishRatio: Math.round(spanishRatio * 100),
      vocabularyFocus: character.language_profile.vocabulary_focus,
      grammarFocus: character.language_profile.grammar_focus,
    },
    playerInput: playerInput || '',
  };

  // System prompt
  const systemTemplate = loadTemplate('system/base.txt');
  const systemPrompt = fillTemplate(systemTemplate, vars);

  // Turn-specific user prompt
  const isGreeting = turn === 0 && !playerInput;
  const turnTemplate = isGreeting
    ? loadTemplate('encounter/greeting.txt')
    : loadTemplate('encounter/dialogue_turn.txt');
  const turnPrompt = fillTemplate(turnTemplate, vars);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: turnPrompt },
  ];

  return messages;
}
