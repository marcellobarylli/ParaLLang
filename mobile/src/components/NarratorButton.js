import PronounceButton from './PronounceButton.js';
import { NARRATOR } from '../speech.js';

// Round 062 (backlog C10b): the narrator's 🔊 for any English narrator text (round 061's voice). Nothing for blank text
// or without an English voice.
export default function NarratorButton({ text, label }) {
  if (typeof text !== 'string' || !text.trim()) return null;
  return <PronounceButton text={text} language={NARRATOR} label={label} hideWhenUnavailable />;
}

// Round 062 (critique 1.6): parts read as one utterance: trimmed, blanks dropped, each ending in punctuation.
export function speechText(parts) {
  return (parts ?? [])
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .map((part) => (/[.!?…"'”’»)]$/u.test(part) ? part : `${part}.`))
    .join(' ');
}
