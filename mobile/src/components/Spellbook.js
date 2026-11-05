import { ScrollView, StyleSheet, Text, View } from 'react-native';
import PronounceButton from './PronounceButton.js';
import { Button, colors } from './ui.js';

export default function Spellbook({ spellbook, language, isLoading, onReview, onReturn, returnLabel = 'Return to the map', now = Date.now() }) {
  const inEncounter = Boolean(spellbook.inEncounter);
  return (
    <ScrollView aria-label="Spellbook" contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View><Text role="heading" style={styles.title}>Spellbook</Text><Text style={styles.muted}>{spellbook.dueCount} due for review</Text></View>
        <Button label={returnLabel} onPress={onReturn} />
      </View>
      {inEncounter && spellbook.cards.length > 0 && <Text style={styles.hidden}>Meanings are hidden and reviews wait while an encounter is under way. Ask your companion for a hint instead.</Text>}
      {spellbook.cards.length === 0 ? (
        <View style={styles.card}><Text style={styles.cardTitle}>No vocabulary yet</Text><Text style={styles.body}>Words and phrases appear here after you encounter them.</Text></View>
      ) : spellbook.cards.map((card) => <Card key={card.vocabularyId} card={card} state={cardState(card, { inEncounter, now })} language={language} isLoading={isLoading} onReview={onReview} />)}
      {!inEncounter && spellbook.cards.length > 0 && spellbook.dueCount === 0 && <Text style={styles.muted}>Nothing is due. Your next review times are shown on each card.</Text>}
      {spellbook.containmentFiles?.length > 0 && <>
        <Text role="heading" style={styles.section}>Containment files</Text>
        {spellbook.containmentFiles.map((file) => <ContainmentFile key={file.designation} file={file} language={language} />)}
      </>}
    </ScrollView>
  );
}

// Round 017: a card never shows the answer the game is asking for. While an encounter is under way no card shows a
// meaning, note or translated example (any of them could answer the NPC's protected line) and reviews wait; a due
// card hides its meaning until its review. Due is checked against the clock, so a card that falls due while the
// snapshot is old is hidden too.
export function cardState(card, { inEncounter = false, now = Date.now() } = {}) {
  if (inEncounter) return 'inEncounter';
  return card.due || new Date(card.nextReviewAt).getTime() <= now ? 'due' : 'reference';
}

// Round 028 (backlog B4): the deadpan file for each infohazard met (LORE.md). No file holds an objective's answer
// (server test), so files show during encounters too.
const PROPERTIES = [['virulence', 'Virulence'], ['harm', 'Harm'], ['incubation', 'Incubation'], ['vector', 'Vector'], ['containment', 'Containment']];
function ContainmentFile({ file, language }) {
  return (
    <View style={styles.card} aria-label={`Containment file ${file.designation}`}>
      <Text role="heading" style={styles.cardTitle}>{file.designation}: <Text accessibilityLanguage={language?.tag}>{file.name}</Text></Text>
      <Text style={styles.small}>Class: {file.class} · Recovered at {file.locationName}</Text>
      {PROPERTIES.map(([key, label]) => <Text key={key} style={styles.body}><Text style={styles.strong}>{label}: </Text>{file.properties[key]}</Text>)}
      {file.notes.map((note) => <Text key={note} style={styles.small}>{note}</Text>)}
    </View>
  );
}

function Card({ card, state, language, isLoading, onReview }) {
  return (
    <View style={styles.card} aria-label={`Card ${card.target}`}>
      <View style={styles.cardRow}><Text role="heading" style={styles.cardTitle} accessibilityLanguage={language?.tag}>{card.target}</Text><PronounceButton text={card.target} language={language} /></View>
      {state === 'reference' && <Text style={styles.body}>{card.meanings.join(' · ')}</Text>}
      {state === 'due' && <Text style={styles.hidden}>Meaning hidden until you review it.</Text>}
      {state !== 'inEncounter' && card.example && (
        <Text style={styles.example} accessibilityLanguage={language?.tag}>{card.example.target}{state === 'reference' && <Text style={styles.small}>{` (${card.example.english})`}</Text>}</Text>
      )}
      {state === 'reference' && card.note && <Text style={styles.small}>{card.note}</Text>}
      <Text style={styles.small}>{card.partOfSpeech.replaceAll('_', ' ')} · Mastery: <Text style={styles.strong}>{card.mastery}</Text></Text>
      {state !== 'inEncounter' && <Text style={styles.small}>{state === 'due' ? 'Due now' : `Next review: ${new Date(card.nextReviewAt).toLocaleString()}`}</Text>}
      {state === 'due' && <Button label="Review" variant="primary" disabled={isLoading} onPress={() => onReview(card.vocabularyId)} style={styles.review} />}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  section: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 8 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },
  review: { alignSelf: 'flex-start', marginTop: 6 },
  body: { color: colors.ink, fontSize: 15 },
  hidden: { color: colors.muted, fontSize: 15, fontStyle: 'italic' },
  example: { color: colors.ink, fontSize: 14 },
  strong: { fontWeight: '700' },
  small: { color: colors.muted, fontSize: 13 },
  muted: { color: colors.muted },
});
