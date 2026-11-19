// Round 142: a line and its translation side by side, matched sentence by sentence and coloured alike.
// The colours are the Okabe-Ito set (made for colour-vision deficiency), lightened to read on the dark panels, and
// ordered so neighbours differ in hue and brightness. They cycle after the seventh sentence.
export const SENTENCE_COLOURS = ['#56b4e9', '#e69f00', '#e69ac4', '#f0e442', '#2fcb9c', '#7f9cff', '#ff8a50'];

// A sentence ends at . ! ? … (or the CJK stops) with any closing quotes, brackets or emphasis marks after it,
// followed by space. ¿ and ¡ open the next sentence, so nothing special is needed for them.
const BOUNDARY = /(?<=[.!?…。！？]['"”’»)\]*_]*)\s+/u;

/** The text cut into its sentences, in order, trimmed and without empty pieces. */
export function splitSentences(text) {
  return String(text ?? '').split(BOUNDARY).map((piece) => piece.trim()).filter(Boolean);
}

/**
 * The line and its translation as matched sentence lists, or null when they cannot be matched: either is missing, or
 * they hold a different number of sentences (a guess by position would colour unlike sentences alike).
 */
export function pairSentences(native, translation) {
  if (!native || !translation) return null;
  const a = splitSentences(native);
  const b = splitSentences(translation);
  return a.length && a.length === b.length ? { native: a, translation: b } : null;
}
