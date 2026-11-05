import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, colors } from './ui.js';

// Round 021: the party, in join order. Round 022: a member with an authored conversation can be talked to anywhere.
// `ongoing` is the encounter under way, if any: Talk resumes it for its own member and is unavailable for the others.
export default function PartyPanel({ party, isLoading = false, ongoing = null, onTalk, onReturn, returnLabel }) {
  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.content}>
      <Text role="heading" style={styles.title}>Your party</Text>
      {party.length === 0
        ? <Text style={styles.muted}>No one has joined you yet. Win someone over who is worth keeping.</Text>
        : party.map((member) => (
          <View key={member.characterId} style={styles.member} aria-label={`${member.name}, met at ${member.locationName}`}>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.muted}>Met at {member.locationName} · Conversations: {member.conversations ?? 0}</Text>
            {member.conversationId && onTalk && <Button
              label={`Talk to ${member.name}`} variant="primary"
              disabled={isLoading || Boolean(ongoing && ongoing.encounterId !== member.conversationId)}
              onPress={() => onTalk(member.conversationId)}
            />}
            {member.conversationId && ongoing && ongoing.encounterId !== member.conversationId
              && <Text style={styles.muted}>Finish your conversation with {ongoing.character?.name ?? 'them'} first.</Text>}
          </View>
        ))}
      <Button label={returnLabel} onPress={onReturn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink },
  member: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  name: { fontSize: 16, fontWeight: '700', color: colors.ink },
  muted: { color: colors.muted },
});
