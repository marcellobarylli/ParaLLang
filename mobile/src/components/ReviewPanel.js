import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PronounceButton from './PronounceButton.js';
import { Button, colors, type, Title, wordClassStyle } from './ui.js';
import { wordClassText } from '../wordClass.js';
import { stopSpeech } from '../speech.js';

export default function ReviewPanel({ challenge, partOfSpeech = null, result, language, isLoading, error = null, onSubmit, onReveal, onContinue, onReturn, returnLabel = 'Return to the map' }) {
  const [answer, setAnswer] = useState('');
  // Round 063 (backlog C10c): the word stops when the review screen goes (also between challenges: App keys it).
  useEffect(() => () => { stopSpeech(); }, []);
  const name = language?.name ?? 'Target-language';
  if (result) return (
    <ScrollView aria-label="Review feedback" contentContainerStyle={styles.content}>
      <Title style={styles.title}>Review feedback</Title>
      <Text role="status" style={styles.body}>{result.feedback}</Text>
      <Text style={styles.body}>Answer: <Text style={styles.emphasis}>{result.canonicalAnswer}</Text></Text>
      <Text style={styles.small}>Quality {result.effectiveQuality}/5 · Next review: {new Date(result.nextReviewAt).toLocaleString()}</Text>
      <View style={styles.buttons}>
        <Button label="Continue reviews" variant="primary" onPress={onContinue} />
        <Button label={returnLabel} onPress={onReturn} />
      </View>
    </ScrollView>
  );
  // Round 065: between two reviews the screen says it is loading, or that the load failed; never that nothing is due.
  if (!challenge && isLoading) return (
    <View style={styles.content}><Text role="status" style={styles.body}>Finding the next review…</Text><Button label={returnLabel} onPress={onReturn} /></View>
  );
  if (!challenge && error) return (
    <View style={styles.content}>
      <Text role="status" style={styles.body}>The next review could not load.</Text>
      <View style={styles.buttons}>
        <Button label="Try again" variant="primary" onPress={onContinue} />
        <Button label={returnLabel} onPress={onReturn} />
      </View>
    </View>
  );
  if (!challenge) return (
    <View style={styles.content}><Text style={styles.body}>No due review is available.</Text><Button label={returnLabel} onPress={onReturn} /></View>
  );
  const classLabel = wordClassText(challenge.partOfSpeech ?? partOfSpeech);
  return (
    <ScrollView aria-label={`${name} vocabulary review`} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.muted}>{challenge.practice ? 'Optional practice (schedule will not change)' : `Due ${name}-to-English recall`}</Text>
      <View style={styles.prompt}><Text role="heading" style={styles.word} accessibilityLanguage={language?.tag}>{challenge.target}</Text><PronounceButton text={challenge.target} language={language} /></View>
      {/* Round 059 (backlog C8, decision 1): the word's class, read in English (no language tag; critique 1.5). */}
      {classLabel && <Text style={[styles.classTag, classLabel.cls ? wordClassStyle(classLabel.cls).label : null]}>{classLabel.text}</Text>}
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
        <Button label={returnLabel} variant="text" onPress={onReturn} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: type.title1, fontWeight: '700', color: colors.ink },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontSize: type.largeTitle, fontWeight: '700', color: colors.ink },
  classTag: { fontSize: type.subhead, fontWeight: '600', color: colors.muted },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: type.callout, color: colors.ink },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  body: { color: colors.ink, fontSize: type.callout },
  strong: { fontWeight: '700', color: colors.ink, fontSize: type.subhead },
  emphasis: { fontWeight: '700' },
  small: { color: colors.muted, fontSize: type.footnote },
  muted: { color: colors.muted, fontSize: type.subhead },
});
