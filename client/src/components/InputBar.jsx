import { useEffect, useRef, useState } from 'react';
import { LISTEN_PROBLEMS } from '../speech.js';

// Round 126: with a `listener` (speech.js) the bar has a microphone. A tap starts it, what it hears is written into
// the box after what was already there, and a second tap or a pause ends it. The player sends the text: a misheard
// word would otherwise be graded. `onListen` runs when listening starts (the screen stops the character's voice).
export default function InputBar({ value, onChange, onSend, disabled, loading, name = 'them', listener = null, language = null, onListen = () => {} }) {
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState(null);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useEffect(() => () => listenerRef.current?.stop(), []);
  const canListen = Boolean(listener?.supported);
  const submit = (event) => {
    event.preventDefault();
    if (disabled || !value.trim()) return;
    listener?.stop();
    onSend(value);
  };
  const toggle = () => {
    if (listening) { listener.stop(); return; }
    const before = value.trim();
    setProblem(null);
    onListen();
    const started = listener.start({
      tag: language?.tag,
      onText: (text) => onChange(before ? `${before} ${text}` : text),
      onEnd: (reason) => { setListening(false); setProblem(reason); },
    });
    if (started) setListening(true);
  };
  const languageName = language?.name ?? 'the target language';
  return (
    <>
      {problem && <p className="listen-note" role="status">{LISTEN_PROBLEMS[problem] ?? LISTEN_PROBLEMS.failed}</p>}
      <form className="input-bar" onSubmit={submit}>
        <label className="sr-only" htmlFor="player-response">Your response</label>
        <input
          id="player-response"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={loading ? 'Sending your response…' : listening ? `Listening for ${languageName}…` : `Reply to ${name}…`}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="send"
        />
        {canListen && (
          <button type="button" className={`icon-button mic-button${listening ? ' listening' : ''}`} onClick={toggle} disabled={disabled} aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : `Speak your response in ${languageName}`} title={listening ? 'Stop listening' : `Speak your response in ${languageName}`}>
            {listening ? '■' : '🎤'}
          </button>
        )}
        <button type="submit" className="primary-button" disabled={disabled || !value.trim()}>{loading ? 'Sending…' : 'Send'}</button>
      </form>
    </>
  );
}
