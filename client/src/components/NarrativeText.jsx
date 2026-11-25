import { useState } from 'react';

// Round 130: the narration, with its target-language words as buttons in the text. The server sends
// `narrativeWords` ({ word, meaning }) for the words the narrator dropped in; a tap shows the meaning after the word,
// another hides it. It is free: the narration is not graded. Without the list the narration is plain text.
// Round 184: with `onSay`, a tap that shows the meaning also says the word aloud (the browser's voice: no model call).
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The narration cut into plain strings and { word, meaning } pieces, in order. */
export function narrativePieces(narrative, words = []) {
  const text = String(narrative ?? '');
  const listed = (words ?? []).filter((entry) => entry?.word && entry?.meaning);
  if (!listed.length) return [text];
  const meanings = new Map(listed.map((entry) => [entry.word.toLowerCase(), entry.meaning]));
  // Longest first, so a phrase wins over a word inside it; whole words only.
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${listed.map((entry) => escape(entry.word)).sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const pieces = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) pieces.push(text.slice(last, match.index));
    pieces.push({ word: match[0], meaning: meanings.get(match[0].toLowerCase()) });
    last = match.index + match[0].length;
  }
  if (last < text.length) pieces.push(text.slice(last));
  return pieces;
}

export default function NarrativeText({ narrative, words, language, onSay = null }) {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (index) => setOpen((current) => { const next = new Set(current); if (!next.delete(index)) next.add(index); return next; });
  return (
    <p className="narrative">
      {narrativePieces(narrative, words).map((piece, index) => (typeof piece === 'string' ? piece : (
        // eslint-disable-next-line react/no-array-index-key
        <span key={index}>
          <button type="button" className="gloss" lang={language?.tag} aria-expanded={open.has(index)} onClick={() => { if (!open.has(index)) onSay?.(piece.word); toggle(index); }}
            aria-label={open.has(index) ? `${piece.word}: ${piece.meaning}` : `Translate ${piece.word}`}>{piece.word}</button>
          {open.has(index) && <span className="gloss-meaning" role="status"> ({piece.meaning})</span>}
        </span>
      )))}
    </p>
  );
}
