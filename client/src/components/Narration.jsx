// Round 156 (issue #6): the narrator's written passages, in the same italic voice as the narration a model writes
// for each line of a conversation (NarrativeText.jsx). The server sends a passage as { id, segments }; a segment is
// { text } or { text, kind }, and one with a kind is set apart by its class (`narration-<kind>`). Round 156 has no
// kinds: they are where a later round's untranslatable spans go.
export default function Narration({ narration, className = '' }) {
  const segments = narration?.segments ?? [];
  if (!segments.length) return null;
  return (
    <p className={`narrative narration${className ? ` ${className}` : ''}`} data-passage={narration.id}>
      {segments.map((segment, index) => (segment.kind
        // eslint-disable-next-line react/no-array-index-key
        ? <span key={index} className={`narration-${segment.kind}`} lang={segment.lang}>{segment.text}</span>
        : segment.text))}
    </p>
  );
}
