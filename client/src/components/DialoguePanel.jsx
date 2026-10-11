import { useEffect, useRef } from 'react';
import BilingualText from './BilingualText.jsx';

export default function DialoguePanel({ encounter, isLoading, onHelp }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth' }); }, [encounter?.transcript, isLoading]);
  if (!encounter) return <main className="dialogue-panel"><p>Preparing The Coffee Cart…</p></main>;
  return (
    <main className="dialogue-panel" aria-label="Conversation with Gerald">
      <section className="objective-card" aria-live="polite">
        {encounter.currentObjective ? <><strong>Current objective</strong><p>{encounter.currentObjective.prompt}</p></> : <strong>Order complete</strong>}
        <small>Spanish target: {Math.round(encounter.difficulty * 100)}% · Hints: {encounter.hints.remaining}/{encounter.hints.limit}</small>
      </section>
      {encounter.transcript.map((message) => message.role === 'npc' ? (
        <article className="npc-message" key={message.id}>
          <p className="narrative">{message.narrative}</p>
          <strong className="speaker">{message.dialogue.speaker}</strong>
          <BilingualText message={message} onHelp={onHelp} disabled={isLoading || (message.protected && !encounter.hints_available)} />
        </article>
      ) : (
        <p className="player-message" key={message.id}>{message.text}</p>
      ))}
      {isLoading && <p className="thinking" role="status">Gerald is considering the linguistic implications…</p>}
      <div ref={endRef} />
    </main>
  );
}
