import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, colors } from './ui.js';
import { MAX_SAVES } from '../stores/saveSlots.js';

// Round 031 (backlog A11): the device's saves. Each is a learner on the server; the current one shows where it
// stands, the others can be continued, and a new one can be started while fewer than MAX_SAVES exist.
export default function SavesPanel({ saves, activeId, place, dueCount = 0, isLoading, onContinue, onNew, onReturn }) {
  const full = saves.length >= MAX_SAVES;
  return (
    <ScrollView aria-label="Saves" contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text role="heading" style={styles.title}>Saves</Text>
        <Button label="Return to the map" onPress={onReturn} />
      </View>
      {saves.map((save) => {
        const current = save.learnerId === activeId;
        return (
          <View key={save.learnerId} style={[styles.card, current && styles.current]} aria-selected={current} aria-label={current ? `${save.label}, current save` : save.label}>
            <Text role="heading" style={styles.cardTitle}>{save.label}</Text>
            {current
              ? <Text style={styles.body}>Current save{place ? ` · ${place}` : ''} · {dueCount} due for review</Text>
              : <Button label="Continue" accessibleName={`Continue ${save.label}`} variant="primary" disabled={isLoading} onPress={() => onContinue(save.learnerId)} style={styles.action} />}
            <Text style={styles.small}>Started {new Date(save.createdAt).toLocaleDateString()}</Text>
          </View>
        );
      })}
      {full
        ? <Text style={styles.muted}>Three saves is the most this device keeps.</Text>
        : <Button label="Start a new save" disabled={isLoading} onPress={onNew} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  current: { borderColor: colors.accent },
  cardTitle: { fontSize: 20, fontWeight: '600', color: colors.ink },
  action: { alignSelf: 'flex-start', marginTop: 4 },
  body: { color: colors.ink, fontSize: 15 },
  small: { color: colors.muted, fontSize: 13 },
  muted: { color: colors.muted },
});
