import { useEffect, useRef, useState } from 'react';
import { differingWords, sameSentence } from '../practice.js';

// Round 129: beginner mode. What the player meant, in correct target language, after an answer with a slip in it,
// and a box to say or type it once more. The conversation has already moved on (or, with no heart left, waits for
// the corrected sentence): the practice is checked here in the app, sends nothing and costs nothing.
export default function CorrectionCard({ correction, language, speaker = null, listener = null, onUse = null }) {
  const [attempt, setAttempt] = useState('');
  const [verdict, setVerdict] = useState(null); // null, 'right', or the words to look at
  const [listening, setListening] = useState(false);
  const boxRef = useRef(null);
  const verdictRef = useRef(null);
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useEffect(() => () => { if (listenerRef.current?.listening) listenerRef.current.stop(); }, []);
  // Round 137: the box grows with its text (it wraps), and the sheet keeps the box and the verdict in view.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = box.scrollHeight ? `${box.scrollHeight}px` : '';
    box.scrollIntoView?.({ block: 'nearest' });
  }, [attempt]);
  useEffect(() => { if (verdict) verdictRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [verdict]);
  const languageName = language?.name ?? 'the target language';
  const check = (text = attempt) => {
    if (!text.trim()) return;
    setVerdict(sameSentence(text, correction.text) ? 'right' : differingWords(text, correction.text));
  };
  const listen = () => {
    if (listening) { listener.stop(); return; }
    speaker?.stop();
    setVerdict(null);
    let heard = '';
    const started = listener.start({
      tag: language?.tag,
      onText: (text) => { heard = text; setAttempt(text); },
      onEnd: () => { setListening(false); if (heard) check(heard); },
    });
    if (started) setListening(true);
  };
  return (
    <section className="correction-card" aria-label="What you meant">
      <div className="speaker-row">
        <strong>What you meant</strong>
        {correction.heartLost && <span className="heart-lost" aria-label="One heart used">−1 ♥</span>}
      </div>
      <div className="speaker-row">
        <p className="correction-text" lang={language?.tag}>{correction.text}</p>
        {speaker?.supported && <button type="button" className="icon-button speak-button" onClick={() => speaker.speak({ text: correction.text, tag: language?.tag })} aria-label="Hear the corrected sentence" title="Hear it">🔊</button>}
      </div>
      {correction.translation && <p className="translation">{correction.translation}</p>}
      {!correction.heartLost && (
        <p className="correction-note">
          No hearts left, so this one has to be said right to move on.
          {onUse && <> <button type="button" className="text-button" onClick={() => onUse(correction.text)}>Put it in the reply box</button></>}
        </p>
      )}
      <form className="practice-row" onSubmit={(event) => { event.preventDefault(); check(); }}>
        <label className="sr-only" htmlFor="practice-box">Say it yourself</label>
        <textarea id="practice-box" ref={boxRef} rows={1} value={attempt} onChange={(event) => { setAttempt(event.target.value); setVerdict(null); }} lang={language?.tag}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) { event.preventDefault(); check(); } }}
          placeholder={listening ? `Listening for ${languageName}…` : 'Say it yourself (optional)'} autoComplete="off" autoCapitalize="sentences" />
        <div className="practice-buttons">
        {listener?.supported && (
          <button type="button" className={`icon-button mic-button${listening ? ' listening' : ''}`} onClick={listen} aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : `Say the corrected sentence in ${languageName}`}>{listening ? '■' : '🎤'}</button>
        )}
        <button type="submit" className="secondary-button" disabled={!attempt.trim()}>Check</button>
        </div>
      </form>
      {verdict === 'right' && <p ref={verdictRef} className="practice-verdict right" role="status">✓ That's it.</p>}
      {Array.isArray(verdict) && <p ref={verdictRef} className="practice-verdict" role="status">Not quite. Look again at: <span lang={language?.tag}>{verdict.join(' ') || correction.text}</span>. It costs nothing, and you have moved on either way.</p>}
    </section>
  );
}
