import { useEffect, useRef, useState } from 'react';
import { LISTEN_PROBLEMS } from '../speech.js';

// Round 126: with a `listener` (speech.js) the bar has a microphone. A tap starts it, what it hears is written into
// the box after what was already there, and a second tap or a pause ends it. The player sends the text: a misheard
// word would otherwise be graded. `onListen` runs when listening starts (the screen stops the character's voice).
// Round 129 (amendment): the browser listens in one language at a time, so a small button beside the microphone
// switches between the target language and the player's own. Each stretch of speech is added to the box.
const OWN_LANGUAGE = Object.freeze({ code: 'en', name: 'English', tag: 'en-US' });

export default function InputBar({ value, onChange, onSend, disabled, loading, name = 'them', listener = null, language = null, ownLanguage = OWN_LANGUAGE, onListen = () => {} }) {
  const [own, setOwn] = useState(false); // listening in the player's own language
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState(null);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useEffect(() => () => listenerRef.current?.stop(), []);
  // The box is as tall as its text, up to about six lines.
  const boxRef = useRef(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${Math.min(box.scrollHeight || 0, 150) || ''}${box.scrollHeight ? 'px' : ''}`;
  }, [value]);
  const canListen = Boolean(listener?.supported);
  const submit = (event) => {
    event.preventDefault();
    if (disabled || !value.trim()) return;
    listener?.stop();
    onSend(value);
  };
  const heard = own ? ownLanguage : (language ?? { name: 'the target language', code: '··' });
  const other = own ? (language ?? { name: 'the target language' }) : ownLanguage;
  const languageName = heard.name;
  const code = String(heard.code ?? heard.tag ?? '').slice(0, 2).toUpperCase();
  const toggle = () => {
    if (listening) { listener.stop(); return; }
    const before = value.trim();
    setProblem(null);
    onListen();
    const started = listener.start({
      tag: heard.tag,
      onText: (text) => onChange(before ? `${before} ${text}` : text),
      onEnd: (reason) => { setListening(false); setProblem(reason); },
    });
    if (started) setListening(true);
  };
  return (
    <>
      {problem && <p className="listen-note" role="status">{LISTEN_PROBLEMS[problem] ?? LISTEN_PROBLEMS.failed}</p>}
      <form className="input-bar" onSubmit={submit}>
        <label className="sr-only" htmlFor="player-response">Your response</label>
        {/* Round 131: a box for a paragraph. It grows with the text; Enter sends and Shift+Enter makes a new line. */}
        <textarea
          id="player-response"
          ref={boxRef}
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) submit(event); }}
          placeholder={loading ? 'Sending your response…' : listening ? `Listening for ${languageName}…` : `Answer ${name} in a few sentences…`}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="send"
        />
        {canListen && (
          <button type="button" className="icon-button listen-language" onClick={() => setOwn(!own)} disabled={disabled || listening}
            aria-label={`Listening in ${heard.name}. Switch to ${other.name}`} title={`Listening in ${heard.name}. Switch to ${other.name}`}>{code}</button>
        )}
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
