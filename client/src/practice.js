// Round 129: beginner mode's practice. After a corrected answer the player may say or type the corrected sentence.
// The app compares the two itself: nothing is sent, so it costs no time and no heart, and cannot hold the player back.

/** A sentence as it is compared: no case, no accents, no punctuation, single spaces. */
export const foldSentence = (text) => String(text ?? '')
  .normalize('NFD').replace(/\p{M}+/gu, '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** True when `attempt` is the sentence `wanted`, whatever its case, accents and punctuation. */
export const sameSentence = (attempt, wanted) => foldSentence(attempt) !== '' && foldSentence(attempt) === foldSentence(wanted);

/** The words of `wanted` that `attempt` does not have at the same place, as the player should look at them. */
export function differingWords(attempt, wanted) {
  const got = foldSentence(attempt).split(' ');
  const shown = String(wanted ?? '').trim().split(/\s+/);
  return shown.filter((word, index) => foldSentence(word) !== '' && foldSentence(word) !== got[index]);
}
