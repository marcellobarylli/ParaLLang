// Round 156 (issue #6): the narrator's written passages, in the same italic voice as the narration a model writes
// for each line of a conversation (NarrativeText.jsx). The server sends a passage as { id, segments }; a segment is
// { text } or { text, kind }, and one with a kind is set apart by its class (`narration-<kind>`).
// Round 158 (issue #4): the kind `truth` is an untranslatable text: a sentence in the language being learned, in
// turmeric. It is text and nothing more: no button, no meaning to tap for, and the browser is asked not to
// translate it either.
// Round 166: `after` is a sentence of the game's own put at the passage's end, in the same voice (the travel
// caption's "Erasmus is getting ready to talk…"). It is not part of the passage and is set in its own span.
export default function Narration({ narration, className = '', after = '' }) {
  const segments = narration?.segments ?? [];
  if (!segments.length) return null;
  return (
    <p className={`narrative narration${className ? ` ${className}` : ''}`} data-passage={narration.id}>
      {segments.map((segment, index) => (segment.kind
        // eslint-disable-next-line react/no-array-index-key
        ? <span key={index} className={`narration-${segment.kind}`} lang={segment.lang} translate="no">{segment.text}</span>
        : segment.text))}
      {after ? <> <span className="narration-after">{after}</span></> : null}
    </p>
  );
}

/** Whether there is a passage to show. */
export const hasNarration = (narration) => Boolean(narration?.segments?.length);
