import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { speak, voiceFor } from '../speech.js';
import { Button, type } from './ui.js';

// Round 030: `label` names a long text (a fragment) instead of reading it all again as the button's name.
// Round 055 (critique 1.4): `hideWhenUnavailable` renders nothing without a voice (rows of word chips).
export default function PronounceButton({ text, language, label: name_ = null, hideWhenUnavailable = false }) {
  const tag = language?.tag ?? null;
  const name = language?.name ?? 'Target-language';
  const [voice, setVoice] = useState(null);

  useEffect(() => {
    let active = true;
    setVoice(null);
    voiceFor(tag).then((found) => { if (active) setVoice(found); });
    return () => { active = false; };
  }, [tag]);

  if (!voice && hideWhenUnavailable) return null;
  const label = voice ? (name_ ?? `Hear ${text} in ${name}`) : `${name} pronunciation unavailable`;
  return (
    <Button accessibleName={label} variant="text" disabled={!voice} onPress={() => speak(text, { tag, voice })}>
      <Text style={{ fontSize: type.title3 }}>{voice ? '🔊' : '🔇'}</Text>
    </Button>
  );
}
