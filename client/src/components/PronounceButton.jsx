import { useEffect, useMemo, useState } from 'react';

function spanishVoice(synthesis) {
  return synthesis?.getVoices?.().find((voice) => /^es(?:[-_]|$)/i.test(voice.lang));
}

export default function PronounceButton({ text }) {
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const supported = Boolean(synthesis && typeof window.SpeechSynthesisUtterance === 'function');
  const [voice, setVoice] = useState(() => supported ? spanishVoice(synthesis) : null);
  const label = useMemo(() => voice ? `Hear ${text} in Spanish` : 'Spanish pronunciation unavailable', [voice, text]);

  useEffect(() => {
    if (!supported) return undefined;
    const update = () => setVoice(spanishVoice(synthesis) ?? null);
    update();
    synthesis.addEventListener?.('voiceschanged', update);
    return () => synthesis.removeEventListener?.('voiceschanged', update);
  }, [supported, synthesis]);

  const speak = () => {
    if (!voice) return;
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang;
    utterance.voice = voice;
    synthesis.cancel?.();
    synthesis.speak(utterance);
  };

  return <button type="button" className="icon-button" onClick={speak} disabled={!voice} aria-label={label} title={label}>{voice ? '🔊' : '🔇'}</button>;
}
