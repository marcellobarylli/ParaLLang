import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PronounceButton from './PronounceButton.js';
import { Button, colors } from './ui.js';

export default function ReviewPanel({ challenge, result, language, isLoading, onSubmit, onReveal, onContinue, onReturn }) {
  const [answer, setAnswer] = useState('');
  const name = language?.name ?? 'Target-language';
  if (result) return (
    <ScrollView aria-label="Review feedback" contentContainerStyle={styles.content}>
      <Text role="heading" style={styles.title}>Review feedback</Text>
      <Text role="status" style={styles.body}>{result.feedback}</Text>
      <Text style={styles.body}>Answer: <Text style={styles.strong}>{result.canonicalAnswer}</Text></Text>
      <Text style={styles.small}>Quality {result.effectiveQuality}/5 · Next review: {new Date(result.nextReviewAt).toLocaleString()}</Text>
      <View style={styles.buttons}>
        <Button label="Continue reviews" variant="primary" onPress={onContinue} />
        <Button label="Return to Gerald" onPress={onReturn} />
      </View>
    </ScrollView>
  );
  if (!challenge) return (
    <View style={styles.content}><Text style={styles.body}>No due review is available.</Text><Button label="Return to Gerald" onPress={onReturn} /></View>
  );
  return (
    <ScrollView aria-label={`${name} vocabulary review`} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.muted}>{challenge.practice ? 'Optional practice (schedule will not change)' : `Due ${name}-to-English recall`}</Text>
      <View style={styles.prompt}><Text role="heading" style={styles.word} accessibilityLanguage={language?.tag}>{challenge.target}</Text><PronounceButton text={challenge.target} language={language} /></View>
      <Text style={styles.strong}>English meaning</Text>
      <TextInput
        aria-label="English meaning"
        style={styles.input}
        value={answer}
        onChangeText={setAnswer}
        onSubmitEditing={() => onSubmit(answer)}
        editable={!isLoading}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
      />
      <View style={styles.buttons}>
        <Button label="Check answer" variant="primary" disabled={isLoading || !answer.trim()} onPress={() => onSubmit(answer)} />
        <Button label="Show answer" disabled={isLoading} onPress={onReveal} />
        <Button label="Return to Gerald" variant="text" onPress={onReturn} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontSize: 32, fontWeight: '700', color: colors.ink },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.ink },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  body: { color: colors.ink, fontSize: 16 },
  strong: { fontWeight: '700', color: colors.ink },
  small: { color: colors.muted, fontSize: 13 },
  muted: { color: colors.muted },
});
