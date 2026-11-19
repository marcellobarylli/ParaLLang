import BilingualText from './BilingualText.jsx';

// Round 115: the conversation of the dungeon's current site. The character's name comes from the encounter (the
// old screen named Gerald), and the tutorial's companion briefing is shown above the first line. The sheet around
// it scrolls; the objective stays at the top of the sheet (index.css).
// Round 126: with `onSpeak`, each of the character's lines has a 🔊 that reads it aloud in the character's voice.
export default function DialoguePanel({ encounter, language, isLoading, onHelp, onSpeak = null }) {
  if (!encounter) return <main className="dialogue-panel"><p>Preparing the conversation…</p></main>;
  const name = encounter.character?.name ?? 'them';
  const briefing = encounter.companionBriefing ?? [];
  return (
    <main className="dialogue-panel" aria-label={`Conversation with ${name}`}>
      <section className="objective-card" aria-live="polite">
        {encounter.currentObjective ? <><strong>Current objective</strong><p>{encounter.currentObjective.prompt}</p></> : <strong>Conversation complete</strong>}
        <small>{language?.name ?? 'Target-language'} target: {Math.round(encounter.difficulty * 100)}% · Hints: {encounter.hints.remaining}/{encounter.hints.limit}</small>
      </section>
      {briefing.length > 0 && encounter.committedPlayerTurns === 0 && (
        <aside className="briefing-card" aria-label="Your companion's briefing">
          <strong>Your companion</strong>
          {briefing.map((line) => <p key={line}>{line}</p>)}
        </aside>
      )}
      {encounter.transcript.map((message) => message.role === 'npc' ? (
        <article className="npc-message" key={message.id}>
          <p className="narrative">{message.narrative}</p>
          <div className="speaker-row">
            <strong className="speaker">{message.dialogue.speaker}</strong>
            {onSpeak && <button type="button" className="icon-button speak-button" onClick={() => onSpeak(message)} aria-label={`Hear ${message.dialogue.speaker} say this line`} title="Hear this line">🔊</button>}
          </div>
          <BilingualText message={message} language={language} onHelp={onHelp} disabled={isLoading || (message.protected && !encounter.hints_available)} />
        </article>
      ) : (
        <p className="player-message" key={message.id}>{message.text}</p>
      ))}
      {isLoading && <p className="thinking" role="status">{name} is considering the linguistic implications…</p>}
    </main>
  );
}
