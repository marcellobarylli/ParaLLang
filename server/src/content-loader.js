import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

const cache = new Map();
const CONTENT_DIR = resolve(import.meta.dirname, '..', '..', 'content');

function loadYaml(relativePath) {
  if (cache.has(relativePath)) return cache.get(relativePath);
  const fullPath = resolve(CONTENT_DIR, relativePath);
  const content = yaml.load(readFileSync(fullPath, 'utf-8'));
  cache.set(relativePath, content);
  return content;
}

export function loadCharacter(characterPath) {
  return loadYaml(characterPath);
}

export function loadEncounter(encounterPath) {
  return loadYaml(encounterPath);
}

export function loadStyleGuide() {
  return loadYaml('narration/style_guide.yaml');
}
