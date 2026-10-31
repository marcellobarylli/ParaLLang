import { useEffect, useMemo, useState } from 'react';

function languageVoice(synthesis, language) {
  const primary = language?.tag?.split('-')[0];
  if (!primary) return undefined;
  return synthesis?.getVoices?.().find((voice) => new RegExp(`^${primary}(?:[-_]|$)`, 'i').test(voice.lang));
}

export default function PronounceButton({ text, language }) {
  const synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const supported = Boolean(synthesis && typeof window.SpeechSynthesisUtterance === 'function');
  const [voice, setVoice] = useState(() => supported ? languageVoice(synthesis, language) : null);
  const label = useMemo(() => voice ? `Hear ${text} in ${language.name}` : `${language?.name ?? 'Target-language'} pronunciation unavailable`, [voice, text, language]);

  useEffect(() => {
    if (!supported) return undefined;
    const update = () => setVoice(languageVoice(synthesis, language) ?? null);
    update();
    synthesis.addEventListener?.('voiceschanged', update);
    return () => synthesis.removeEventListener?.('voiceschanged', update);
  }, [supported, synthesis, language]);

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
