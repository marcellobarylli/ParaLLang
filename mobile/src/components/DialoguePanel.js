import { useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import BilingualText from './BilingualText.js';
import { colors } from './ui.js';

export default function DialoguePanel({ encounter, language, isLoading, assessment, onHelp }) {
  const listRef = useRef(null);
  if (!encounter) return <View style={styles.panel}><Text style={styles.muted}>Preparing The Coffee Cart…</Text></View>;
  const resolved = encounter.state === 'resolved';

  const objective = (
    <View style={styles.objective} aria-live="polite">
      {encounter.currentObjective
        ? <><Text style={styles.strong}>Current objective</Text><Text style={styles.body}>{encounter.currentObjective.prompt}</Text></>
        : <Text style={styles.strong}>Order complete</Text>}
      <Text style={styles.small}>{language?.name ?? 'Target-language'} target: {Math.round(encounter.difficulty * 100)}% · Hints: {encounter.hints.remaining}/{encounter.hints.limit}</Text>
    </View>
  );
  const footer = (
    <View style={styles.footer}>
      {isLoading && <Text role="status" style={styles.thinking}>Gerald is considering the linguistic implications…</Text>}
      {assessment && <View style={styles.assessment} aria-live="polite">
        <Text style={styles.strong}>Assessment</Text><Text style={styles.body}>{assessment.overallFeedback}</Text>
        {assessment.objectiveResults.map((result) => <Text style={styles.body} key={result.objectiveId}>{result.passed ? '✓' : '→'} {result.feedback}</Text>)}
      </View>}
      {resolved && <Text role="status" style={styles.victory}>Gerald grudgingly approves. The coffee order is complete.</Text>}
    </View>
  );

  return (
    <FlatList
      ref={listRef}
      aria-label="Conversation with Gerald"
      style={styles.panel}
      contentContainerStyle={styles.content}
      data={encounter.transcript}
      keyExtractor={(message) => message.id}
      ListHeaderComponent={objective}
      ListFooterComponent={footer}
      onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: true })}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item: message }) => message.role === 'npc' ? (
        <View style={styles.npc}>
          <Text style={styles.narrative}>{message.narrative}</Text>
          <Text style={styles.speaker}>{message.dialogue.speaker}</Text>
          <BilingualText message={message} onHelp={onHelp} disabled={isLoading || (message.protected && !encounter.hints_available)} />
        </View>
      ) : (
        <Text style={styles.player}>{message.text}</Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  content: { padding: 16, gap: 12 },
  objective: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  npc: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 6 },
  narrative: { color: colors.muted, fontStyle: 'italic', fontSize: 14 },
  speaker: { color: colors.accent, fontWeight: '700' },
  player: { alignSelf: 'flex-end', backgroundColor: colors.accent, color: colors.accentInk, borderRadius: 12, padding: 10, maxWidth: '85%', overflow: 'hidden', fontSize: 16 },
  footer: { gap: 12, paddingBottom: 8 },
  thinking: { color: colors.muted, fontStyle: 'italic' },
  assessment: { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.accent, borderRadius: 8, padding: 12, gap: 4 },
  victory: { backgroundColor: '#e7f3e8', color: colors.success, borderRadius: 8, padding: 12, fontWeight: '600' },
  strong: { fontWeight: '700', color: colors.ink },
  body: { color: colors.ink, fontSize: 15 },
  small: { color: colors.muted, fontSize: 12 },
  muted: { color: colors.muted, padding: 16 },
});
