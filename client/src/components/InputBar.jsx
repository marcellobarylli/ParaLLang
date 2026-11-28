import { useEffect, useRef, useState } from 'react';
import { LISTEN_PROBLEMS } from '../speech.js';

// Round 126: with a `listener` (speech.js) the bar has a microphone. A tap starts it, what it hears is written into
// the box after what was already there, and a second tap ends it (round 188: a pause no longer does). The player sends the text: a misheard
// word would otherwise be graded. `onListen` runs when listening starts (the screen stops the character's voice).
// Round 129 (amendment): the browser listens in one language at a time, so a small button beside the microphone
// switches between the target language and the player's own. Each stretch of speech is added to the box.
const OWN_LANGUAGE = Object.freeze({ code: 'en', name: 'English', tag: 'en-US' });

export default function InputBar({ value, onChange, onSend, disabled, loading, name = 'them', listener = null, language = null, ownLanguage = OWN_LANGUAGE, onListen = () => {} }) {
  const [own, setOwn] = useState(false); // listening in the player's own language
  const [listening, setListening] = useState(false); // the microphone is switched on
  const [problem, setProblem] = useState(null);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  // Round 188: the microphone stays on until it is tapped off. The browser ends each stretch of listening after a
  // silence, so a new one starts at once while it is on; the language switch ends the stretch and the next one is in
  // the other language. These refs are read when a stretch ends, after the render that set them.
  const onRef = useRef(false);
  const ownRef = useRef(own);
  ownRef.current = own;
  const valueRef = useRef(value);
  valueRef.current = value;
  const quickRef = useRef(0); // stretches in a row that ended at once with nothing heard
  useEffect(() => () => { onRef.current = false; listenerRef.current?.stop(); }, []);
  // The box is as tall as its text, up to twelve lines.
  const boxRef = useRef(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = 'auto';
    // Round 141: the whole text shows, up to twelve lines, then it scrolls inside. scrollHeight leaves out the border.
    const edge = box.offsetHeight - box.clientHeight;
    box.style.height = box.scrollHeight ? `${Math.min(box.scrollHeight + edge, 12 * 22 + edge)}px` : '';
  }, [value]);
  const canListen = Boolean(listener?.supported);
  const switchOff = () => {
    onRef.current = false;
    setListening(false);
    listener?.stop();
  };
  const submit = (event) => {
    event.preventDefault();
    if (disabled || !value.trim()) return;
    // Sending switches the microphone off: it would otherwise write the character's spoken answer into the box.
    switchOff();
    onSend(value);
  };
  // Round 223: a language the game writes in Latin letters (Japanese in rōmaji, Chinese in pinyin; the pack's
  // `writing`) is not listened for: the browser would write what it hears in kana, kanji or hanzi. The microphone
  // listens in the player's own language only.
  const romanized = Boolean(language?.writing);
  const languageOf = (isOwn) => (isOwn || romanized ? ownLanguage : (language ?? { name: 'the target language', code: '··' }));
  const heard = languageOf(own);
  const other = own ? (language ?? { name: 'the target language' }) : ownLanguage;
  const languageName = heard.name;
  const code = String(heard.code ?? heard.tag ?? '').slice(0, 2).toUpperCase();
  // One stretch of listening; what it hears goes after what the box held when it began.
  const listen = () => {
    const current = listenerRef.current;
    if (!current || !onRef.current) return;
    const before = valueRef.current.trim();
    const began = Date.now();
    let said = false;
    const started = current.start({
      tag: languageOf(ownRef.current).tag,
      onText: (text) => { said = true; onChange(before ? `${before} ${text}` : text); },
      onEnd: (reason) => {
        if (!onRef.current) return;
        quickRef.current = !said && Date.now() - began < 1000 ? quickRef.current + 1 : 0;
        // A refusal, or a browser that ends every stretch at once, switches it off.
        if (reason || quickRef.current >= 3) {
          onRef.current = false;
          setListening(false);
          setProblem(reason ?? 'failed');
          return;
        }
        listen();
      },
    });
    if (!started) { onRef.current = false; setListening(false); }
  };
  const toggle = () => {
    if (onRef.current) { switchOff(); return; }
    setProblem(null);
    onListen();
    onRef.current = true;
    quickRef.current = 0;
    setListening(true);
    listen();
  };
  // A bar that is switched off (the answer is on its way) switches the microphone off too.
  useEffect(() => { if (disabled && onRef.current) switchOff(); }, [disabled]); // eslint-disable-line react-hooks/exhaustive-deps
  const switchLanguage = () => {
    ownRef.current = !own;
    setOwn(!own);
    // While it is on, the stretch in the old language ends and the next one starts in the new.
    if (onRef.current) listenerRef.current?.stop();
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
        {canListen && !romanized && (
          <button type="button" className="icon-button listen-language" onClick={switchLanguage} disabled={disabled}
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
