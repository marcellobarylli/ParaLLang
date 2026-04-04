import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore.js';
import DialoguePanel from './components/DialoguePanel.jsx';
import InputBar from './components/InputBar.jsx';

export default function App() {
  const { messages, encounterState, isLoading, error, startEncounter, sendMessage } = useGameStore();

  useEffect(() => {
    startEncounter();
  }, [startEncounter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #2a2a3e',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.4em', color: '#c9a033', margin: 0, letterSpacing: 2 }}>
          ParaLLang
        </h1>
        <div style={{ fontSize: '0.8em', color: '#666', marginTop: 2 }}>
          The Crumbling Market — The Coffee Cart
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#5c1a1a', padding: '8px 24px', color: '#e06666', fontSize: '0.9em' }}>
          {error}
        </div>
      )}

      {/* Dialogue */}
      <DialoguePanel messages={messages} isLoading={isLoading} />

      {/* Victory banner */}
      {encounterState === 'resolved' && (
        <div
          style={{
            background: '#1a3a1a',
            padding: '12px 24px',
            textAlign: 'center',
            color: '#93c47d',
            fontWeight: 700,
          }}
        >
          Gerald is impressed. Encounter resolved!
        </div>
      )}

      {/* Input */}
      <InputBar onSend={sendMessage} disabled={isLoading || encounterState !== 'active'} />
    </div>
  );
}
