import { StyleSheet, Text, View } from 'react-native';
import { Button, colors } from './ui.js';

export default function BilingualText({ message, onHelp, disabled = false }) {
  const { dialogue, protected: isProtected } = message;
  return (
    <View style={styles.block}>
      <Text style={styles.native}>{dialogue.native}</Text>
      <View style={styles.words} aria-label="Word translations">
        {dialogue.words.map((word) => (
          <View style={styles.word} key={word.vocabularyId}>
            <Button
              label={word.canonicalTarget}
              accessibleName={`Translate word: ${word.canonicalTarget}`}
              disabled={disabled || Boolean(word.meaning)}
              onPress={() => onHelp({ kind: 'word', messageId: message.id, vocabularyId: word.vocabularyId })}
              style={styles.chip}
            />
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
  native: { fontSize: 18, color: colors.ink, lineHeight: 25 },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  word: { alignItems: 'flex-start', gap: 2 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  meaning: { color: colors.success, fontSize: 14 },
  translation: { fontStyle: 'italic', color: colors.muted, fontSize: 15 },
  sentence: { alignSelf: 'flex-start' },
  small: { color: colors.muted, fontSize: 12 },
});
