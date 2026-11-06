import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, colors, type, Title } from './ui.js';

// Round 021: the party, in join order. Round 022: a member with an authored conversation can be talked to anywhere.
// `ongoing` is the encounter under way, if any: Talk resumes it for its own member and is unavailable for the others.
// Round 043 (backlog G1): how many conversations until the member's next Journey fragment, without naming it.
// No line for a member without conversation fragments or from a server without the fields.
export function storyHint(member) {
  const count = member.conversations ?? 0;
  if (Number.isInteger(member.nextStoryAt) && member.nextStoryAt > count) {
    const left = member.nextStoryAt - count;
    return `${left} more finished ${left === 1 ? 'conversation' : 'conversations'} until ${member.name} tells you a story.`;
  }
  if (member.nextStoryAt === null && member.storiesTold > 0) {
    return member.storiesTold === 1 ? `${member.name} has told you a story. It is in your Spellbook.`
      : `${member.name} has told you ${member.storiesTold} stories. They are in your Spellbook.`;
  }
  return null;
}

// Round 047 (backlog G4): while Talk offers a deeper conversation (a tier above the first), the card says so. It
// stays as long as that tier is offered; servers without the field show nothing.
export function tierNote(member) {
  return Number.isInteger(member.conversationTier) && member.conversationTier > 0 && member.conversationId
    ? `${member.name} trusts you with a deeper conversation now.` : null;
}

export default function PartyPanel({ party, isLoading = false, ongoing = null, starting = null, onTalk, onReturn, returnLabel }) {
  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.content}>
      <Title style={styles.title}>Your party</Title>
      {party.length === 0
        ? <Text style={styles.muted}>No one has joined you yet. Win someone over who is worth keeping.</Text>
        : party.map((member) => { const hint = storyHint(member); const tier = tierNote(member); return (
          <View key={member.characterId} style={styles.member} aria-label={`${member.name}, met at ${member.locationName}`}>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.muted}>Met at {member.locationName} · Conversations: {member.conversations ?? 0}</Text>
            {hint && <Text style={styles.hint}>{hint}</Text>}
            {tier && <Text style={styles.hint}>{tier}</Text>}
            {member.conversationId && onTalk && <Button
              label={`Talk to ${member.name}`} variant="primary"
              disabled={isLoading || Boolean(ongoing && ongoing.encounterId !== member.conversationId)}
              onPress={() => onTalk(member.conversationId)}
            />}
            {member.conversationId && starting?.encounterId === member.conversationId
              && <Text role="status" style={styles.starting}>{member.name || 'Someone'} is getting ready to talk…</Text>}
            {member.conversationId && ongoing && ongoing.encounterId !== member.conversationId
              && <Text style={styles.muted}>Finish your conversation with {ongoing.character?.name ?? 'them'} first.</Text>}
          </View>
        ); })}
      <Button label={returnLabel} onPress={onReturn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: type.title3, fontWeight: '800', color: colors.ink },
  member: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  name: { fontSize: type.callout, fontWeight: '700', color: colors.ink },
  muted: { color: colors.muted, fontSize: type.subhead },
  starting: { color: colors.muted, fontStyle: 'italic', fontSize: type.subhead }, // round 073
  hint: { color: colors.ink, fontSize: type.subhead, fontStyle: 'italic' },
});
