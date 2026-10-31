import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { findVoice, speak } from '../speech.js';
import { Button } from './ui.js';

export default function PronounceButton({ text, language }) {
  const tag = language?.tag ?? null;
  const name = language?.name ?? 'Target-language';
  const [voice, setVoice] = useState(null);

  useEffect(() => {
    let active = true;
    setVoice(null);
    findVoice(tag).then((found) => { if (active) setVoice(found); });
    return () => { active = false; };
  }, [tag]);

  const label = voice ? `Hear ${text} in ${name}` : `${name} pronunciation unavailable`;
  return (
    <Button accessibleName={label} variant="text" disabled={!voice} onPress={() => speak(text, { tag, voice })}>
      <Text style={{ fontSize: 20 }}>{voice ? '🔊' : '🔇'}</Text>
    </Button>
  );
}
