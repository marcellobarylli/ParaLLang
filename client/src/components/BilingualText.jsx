import { useState } from 'react';

const POS_COLORS = {
  noun: '#6fa8dc',
  verb: '#e06666',
  adjective: '#93c47d',
  adverb: '#f6b26b',
  pronoun: '#c27ba0',
  preposition: '#8e7cc3',
  conjunction: '#999',
  interjection: '#ffd966',
};

function HighlightedWord({ text, wordData }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = POS_COLORS[wordData.pos] || '#e0dcd0';

  return (
    <span
      style={{ color, cursor: 'pointer', position: 'relative', fontWeight: 500 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((v) => !v)}
    >
      {text}
      {showTooltip && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#2a2a3e',
            border: '1px solid #444',
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: '0.8em',
            whiteSpace: 'nowrap',
            zIndex: 10,
            color: '#e0dcd0',
          }}
        >
          <strong>{wordData.meaning}</strong>
          <span style={{ color: '#888', marginLeft: 6 }}>({wordData.pos})</span>
          {wordData.root && <span style={{ color: '#888', marginLeft: 6 }}>← {wordData.root}</span>}
        </span>
      )}
    </span>
  );
}

export default function BilingualText({ dialogue }) {
  const { native, translation, words } = dialogue;
  const [showTranslation, setShowTranslation] = useState(false);

  // Build a map of lowercase word -> wordData for lookup
  const wordMap = new Map();
  for (const w of words) {
    wordMap.set(w.word.toLowerCase(), w);
  }

  // Split native text into tokens, match against known Spanish words
  const tokens = native.split(/(\s+|[.,!?¿¡;:'"—–-]+)/);
  const rendered = tokens.map((token, i) => {
    const clean = token.replace(/[.,!?¿¡;:'"—–-]/g, '').toLowerCase();
    const wordData = wordMap.get(clean);
    if (wordData) {
      return <HighlightedWord key={i} text={token} wordData={wordData} />;
    }
    return <span key={i}>{token}</span>;
  });

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: '1.05em', lineHeight: 1.6 }}>{rendered}</div>
      <div
        style={{
          marginTop: 4,
          fontSize: '0.85em',
          color: showTranslation ? '#888' : 'transparent',
          cursor: 'pointer',
          userSelect: showTranslation ? 'auto' : 'none',
          transition: 'color 0.2s',
        }}
        onClick={() => setShowTranslation((v) => !v)}
        title={showTranslation ? '' : 'Click to reveal translation'}
      >
        {showTranslation ? translation : '[ click to reveal translation ]'}
      </div>
    </div>
  );
}
