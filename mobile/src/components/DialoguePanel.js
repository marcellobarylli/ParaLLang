import { useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import BilingualText from './BilingualText.js';
import PartyOffer, { inParty } from './PartyOffer.js';
import { colors } from './ui.js';

export default function DialoguePanel({ encounter, language, isLoading, assessment, onHelp, party = [], onRecruit, onLeave, fragments = [] }) {
  const listRef = useRef(null);
  if (!encounter) return <View style={styles.panel}><Text style={styles.muted}>Preparing the encounter…</Text></View>;
  const resolved = encounter.state === 'resolved';
  const name = encounter.character?.name ?? 'Your opponent';

  const briefing = encounter.companionBriefing?.length ? (
    <View style={styles.companion} aria-label="Your companion">
      <Text style={styles.strong}>Your companion</Text>
      {encounter.companionBriefing.map((line) => <Text style={styles.body} key={line}>{line}</Text>)}
    </View>
  ) : null;
  const objective = (
    <>{briefing}<View style={styles.objective} aria-live="polite">
      {encounter.currentObjective
        ? <><Text style={styles.strong}>Current objective</Text><Text style={styles.body}>{encounter.currentObjective.prompt}</Text></>
        : <Text style={styles.strong}>Encounter complete</Text>}
      <Text style={styles.small}>{language?.name ?? 'Target-language'} target: {Math.round(encounter.difficulty * 100)}% · Hints: {encounter.hints.remaining}/{encounter.hints.limit}</Text>
    </View></>
  );
  const footer = (
    <View style={styles.footer}>
      {isLoading && <Text role="status" style={styles.thinking}>{name} is considering the linguistic implications…</Text>}
      {assessment && <View style={styles.assessment} aria-live="polite">
        <Text style={styles.strong}>Assessment</Text><Text style={styles.body}>{assessment.overallFeedback}</Text>
        {assessment.objectiveResults.map((result) => <Text style={styles.body} key={result.objectiveId}>{result.passed ? '✓' : '→'} {result.feedback}</Text>)}
      </View>}
      {resolved && <Text role="status" style={styles.victory}>{encounter.resolvedMessage ?? `${name} is satisfied. Encounter complete.`}{fragmentNote(fragments, encounter)}</Text>}
      {resolved && encounter.character?.saveable && !encounter.partyConversation && onRecruit && <PartyOffer
        name={name} joined={inParty(party, encounter.character.id)} isLoading={isLoading}
        onSave={() => onRecruit(encounter.encounterId)} onLeave={onLeave}
      />}
    </View>
  );

  return (
    <FlatList
      ref={listRef}
      aria-label={`Conversation with ${name}`}
      style={styles.panel}
      contentContainerStyle={styles.content}
      data={encounter.transcript}
      keyExtractor={(message) => message.id}
      ListHeaderComponent={objective}
      ListFooterComponent={footer}
      // Round 009: the first screen (briefing, objective, opening line) stays at the top; later turns scroll down.
      onContentSizeChange={() => { if (encounter.transcript.length > 1) listRef.current?.scrollToEnd?.({ animated: true }); }}
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

// Round 030 (backlog A9): a fragment of The Journey that this encounter's completion filed. Worded to stay true on
// replays (critique 1.6); part of the victory status so it is announced with it. Round 032: a fragment unlocked by
// party conversations is noted only on the resolution that reached its count, and named after the member.
export function fragmentNote(fragments, encounter) {
  const fragment = (fragments ?? []).find((f) => f.encounterId === encounter.encounterId
    && (f.unlockedAt === undefined || f.conversations === f.unlockedAt));
  if (!fragment) return '';
  const source = encounter.partyConversation ? `from ${encounter.character?.name ?? 'your companion'}` : 'from here';
  return ` A fragment of The Journey ${source} is in your Spellbook: ${fragment.title}.`;
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  content: { padding: 16, gap: 12 },
  companion: { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
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
