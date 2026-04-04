import { useRef, useEffect } from 'react';
import BilingualText from './BilingualText.jsx';

function NpcMessage({ data }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Narrative */}
      <div style={{ color: '#9a94b8', fontStyle: 'italic', marginBottom: 8, lineHeight: 1.5 }}>
        {data.narrative}
      </div>

      {/* Speaker label */}
      <div style={{ color: '#c9a033', fontWeight: 700, fontSize: '0.9em', marginBottom: 2 }}>
        {data.dialogue.speaker}
      </div>

      {/* Bilingual dialogue */}
      <BilingualText dialogue={data.dialogue} />
    </div>
  );
}

function PlayerMessage({ text }) {
  return (
    <div style={{ marginBottom: 16, textAlign: 'right' }}>
      <span
        style={{
          display: 'inline-block',
          background: '#1e3a5f',
          padding: '8px 14px',
          borderRadius: 12,
          maxWidth: '75%',
          textAlign: 'left',
        }}
      >
        {text}
      </span>
    </div>
  );
}

export default function DialoguePanel({ messages, isLoading }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        maxWidth: 700,
        width: '100%',
        margin: '0 auto',
      }}
    >
      {messages.map((msg, i) =>
        msg.role === 'npc' ? (
          <NpcMessage key={i} data={msg.data} />
        ) : (
          <PlayerMessage key={i} text={msg.text} />
        )
      )}

      {isLoading && (
        <div style={{ color: '#666', fontStyle: 'italic' }}>
          Gerald is thinking...
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
