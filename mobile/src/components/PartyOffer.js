import { StyleSheet, Text, View } from 'react-native';
import { Button, colors } from './ui.js';

// Round 021: after a saveable NPC is defeated, the player may save them to the party or leave (prototype.md §8,
// "[SAVE / LEAVE choice]"). Leaving is not final: the map's location card keeps the invitation open.
export const inParty = (party, characterId) => (party ?? []).some((member) => member.characterId === characterId);

export default function PartyOffer({ name, joined, isLoading, onSave, onLeave }) {
  if (joined) {
    return <Text role="status" style={styles.joined}>{name} is in your party.</Text>;
  }
  return (
    <View style={styles.card} aria-label={`${name} could join your party`}>
      <Text style={styles.strong}>{name} could join your party.</Text>
      <View style={styles.actions}>
        <Button label={`Save ${name}`} accessibleName={`Save ${name} to your party`} variant="primary" onPress={onSave} disabled={isLoading} />
        {onLeave && <Button label="Leave" accessibleName={`Leave ${name} and return to the map`} onPress={onLeave} disabled={isLoading} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  actions: { flexDirection: 'row', gap: 8 },
  strong: { fontWeight: '700', color: colors.ink },
  joined: { color: colors.success, fontWeight: '600' },
});
