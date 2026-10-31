import { ScrollView, StyleSheet, Text, View } from 'react-native';
import PronounceButton from './PronounceButton.js';
import { Button, colors } from './ui.js';

export default function Spellbook({ spellbook, language, isLoading, onReview, onReturn }) {
  return (
    <ScrollView aria-label="Spellbook" contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View><Text role="heading" style={styles.title}>Spellbook</Text><Text style={styles.muted}>{spellbook.dueCount} due for review</Text></View>
        <Button label="Return to Gerald" onPress={onReturn} />
      </View>
      {spellbook.cards.length === 0 ? (
        <View style={styles.card}><Text style={styles.cardTitle}>No vocabulary yet</Text><Text style={styles.body}>Words and phrases appear here after you encounter them.</Text></View>
      ) : spellbook.cards.map((card) => (
        <View style={styles.card} key={card.vocabularyId}>
          <View style={styles.cardRow}><Text role="heading" style={styles.cardTitle} accessibilityLanguage={language?.tag}>{card.target}</Text><PronounceButton text={card.target} language={language} /></View>
          <Text style={styles.body}>{card.meanings.join(' · ')}</Text>
          <Text style={styles.small}>{card.partOfSpeech.replaceAll('_', ' ')} · Mastery: <Text style={styles.strong}>{card.mastery}</Text></Text>
          <Text style={styles.small}>{card.due ? 'Due now' : `Next review: ${new Date(card.nextReviewAt).toLocaleString()}`}</Text>
          {card.due && <Button label="Review" variant="primary" disabled={isLoading} onPress={() => onReview(card.vocabularyId)} style={styles.review} />}
        </View>
      ))}
      {spellbook.cards.length > 0 && spellbook.dueCount === 0 && <Text style={styles.muted}>Nothing is due. Your next review times are shown on each card.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },
  review: { alignSelf: 'flex-start', marginTop: 6 },
  body: { color: colors.ink, fontSize: 15 },
  strong: { fontWeight: '700' },
  small: { color: colors.muted, fontSize: 13 },
  muted: { color: colors.muted },
});
