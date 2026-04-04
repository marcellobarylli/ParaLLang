import { useState } from 'react';

export default function InputBar({ onSend, disabled }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: 8,
        padding: '12px 24px',
        background: '#111122',
        borderTop: '1px solid #2a2a3e',
        maxWidth: 700,
        width: '100%',
        margin: '0 auto',
      }}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? 'Encounter resolved!' : 'Type your response...'}
        disabled={disabled}
        style={{
          flex: 1,
          background: '#1a1a2e',
          border: '1px solid #333',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#e0dcd0',
          fontSize: '1em',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        style={{
          background: disabled ? '#333' : '#c9a033',
          color: disabled ? '#666' : '#0d0d1a',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '1em',
          fontWeight: 700,
          cursor: disabled ? 'default' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Send
      </button>
    </form>
  );
}
