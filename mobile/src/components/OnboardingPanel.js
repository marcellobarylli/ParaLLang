import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, colors, type } from './ui.js';

// Round 027 (backlog C2): the game's philosophy statement, shown once before the map. The text is content
// (content/narration/onboarding.yaml), served by GET /api/onboarding.
export default function OnboardingPanel({ onboarding, onBegin }) {
  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.content}>
      <Text role="heading" style={styles.title}>{onboarding.title}</Text>
      <Text style={styles.statement}>{onboarding.statement}</Text>
      {onboarding.notes.map((note) => <Text key={note} style={styles.paragraph}>{note}</Text>)}
      <Button label={onboarding.beginLabel} accessibleName={`${onboarding.beginLabel}: open the map`} variant="primary" onPress={onBegin} style={styles.begin} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  content: { padding: 24, gap: 16 },
  title: { fontSize: type.title1, fontWeight: '800', color: colors.ink },
  statement: { fontSize: type.body, lineHeight: 25, color: colors.ink, fontStyle: 'italic' },
  paragraph: { fontSize: type.callout, lineHeight: 23, color: colors.ink },
  begin: { marginTop: 8 },
});
