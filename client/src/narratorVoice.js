// Round 196: the narrator reads aloud. The narration is English with a few words of the language being learned in
// it; the narrator's storyteller voice reads the English (speech.js NARRATOR) and the language's plain voice says the
// words, so they are heard as they should sound. Two kinds of narration are read:
//
//   a passage    the narrator's written passage while the camera walks (Narration.jsx): its `truth` segments are in
//                the language (`lang`), the rest is English. Read once, when it is first shown.
//   a narrative  the italic line before a character's reply (NarrativeText.jsx): `narrativeWords` are the words in
//                the language. Read before the reply, in the same queue.
//
// Both follow "Character voices" and "Narrator reads aloud" in Settings.
import { useEffect } from 'react';
import { narrativePieces } from './components/NarrativeText.jsx';
import { browserSpeech } from './speech.js';

// Neighbouring parts in the same voice become one, so the narrator reads a sentence in one breath.
const joined = (parts) => {
  const out = [];
  for (const part of parts) {
    const last = out.at(-1);
    if (last && last.narrator === part.narrator && last.tag === part.tag) last.text += part.text;
    else out.push({ ...part });
  }
  return out;
};

/** The parts of a written passage ({ segments }), in the narrator's voice and the language's (`tag`). */
export const passageParts = (narration, tag) => joined((narration?.segments ?? []).map((segment) => (segment.kind === 'truth'
  ? { text: segment.text, narrator: false, tag: segment.lang ?? tag }
  : { text: segment.text, narrator: true, tag: null })));

/** The parts of a line's narrative, its listed words in the language (`tag`). */
export const narrativeParts = (narrative, words, tag) => joined(narrativePieces(narrative, words).map((piece) => (typeof piece === 'string'
  ? { text: piece, narrator: true, tag: null }
  : { text: piece.word, narrator: false, tag })));

/** Whether the narrator reads: "Character voices" on, and "Narrator reads aloud" not switched off. */
export const narratorOn = (display) => display?.voices !== false && display?.narrator !== false;

// The passage read last, so a caption shown again (the same walk, the road read again) is not read twice.
let lastPassage = null;

/**
 * Reads a passage once when it is shown. `key` says which showing it is (the site walked to), so the same passage on
 * another walk is read again.
 */
export function useReadPassage(narration, key, { on, tag, speaker = browserSpeech().speaker }) {
  const text = (narration?.segments ?? []).map((segment) => segment.text).join('');
  useEffect(() => {
    if (!on || !text || !speaker.supported) return;
    const id = `${key}|${text}`;
    if (id === lastPassage) return;
    lastPassage = id;
    speaker.narrate(passageParts(narration, tag));
  }, [on, key, text, tag]);
}
