import { StyleSheet, Text, View } from 'react-native';
import { Button, colors, type, leading } from './ui.js';
import PronounceButton from './PronounceButton.js';

// Round 055 (backlog C5): each chip can be heard (its canonical form, the chip's label), free of hints and outside
// the chip, so a disabled chip never disables or dims it.
export default function BilingualText({ message, onHelp, disabled = false, language = null }) {
  const { dialogue, protected: isProtected } = message;
  return (
    <View style={styles.block}>
      <Text style={styles.native}>{dialogue.native}</Text>
      <View style={styles.words} aria-label="Words">
        {dialogue.words.map((word) => (
          <View style={styles.word} key={word.vocabularyId}>
            <View style={styles.chipRow}>
            <Button
              label={word.canonicalTarget}
              accessibleName={`Translate word: ${word.canonicalTarget}`}
              disabled={disabled || Boolean(word.meaning)}
              onPress={() => onHelp({ kind: 'word', messageId: message.id, vocabularyId: word.vocabularyId })}
              style={styles.chip}
            />
            <PronounceButton text={word.canonicalTarget} language={language} hideWhenUnavailable />
            </View>
            {word.meaning && <Text role="status" style={styles.meaning}>{word.meaning} <Text style={styles.small}>({word.partOfSpeech.replaceAll('_', ' ')})</Text></Text>}
          </View>
        ))}
      </View>
      {dialogue.translation ? (
        <Text role="status" style={styles.translation}>{dialogue.translation}</Text>
      ) : (
        <Button label="Translate sentence" disabled={disabled} onPress={() => onHelp({ kind: 'sentence', messageId: message.id })} style={styles.sentence} />
      )}
      {isProtected && <Text style={styles.small}>Active-message translations use your companion hint allowance.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  native: { fontSize: type.body, color: colors.ink, lineHeight: leading.body },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  word: { alignItems: 'flex-start', gap: 2 },
  chipRow: { flexDirection: 'row', alignItems: 'center' },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  meaning: { color: colors.success, fontSize: type.subhead },
  translation: { fontStyle: 'italic', color: colors.muted, fontSize: type.subhead },
  sentence: { alignSelf: 'flex-start' },
  small: { color: colors.muted, fontSize: type.caption1 },
});
