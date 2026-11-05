import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, colors, type } from './ui.js';
import { MAX_SAVES } from '../stores/saveSlots.js';

// Round 031 (backlog A11): the device's saves. Each is a learner on the server; the current one shows where it
// stands, the others can be continued, and a new one can be started while fewer than MAX_SAVES exist.
export default function SavesPanel({ saves, activeId, place, dueCount = 0, isLoading, onContinue, onNew, onReturn, soundsOn = true, onToggleSounds, onRemove }) {
  const full = saves.length >= MAX_SAVES;
  // Round 038 (critique 1.5): the question is the system's alert, which takes VoiceOver focus and has a destructive
  // button; the wording says only what is true (round 039: the server deletes the file too).
  const confirmRemove = (save) => Alert.alert(
    `Remove ${save.label}?`,
    `This deletes ${save.label} and its progress, on this device and on the server. It cannot be undone.`,
    [{ text: `Keep ${save.label}`, style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => onRemove(save.learnerId) }],
  );
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
              ? <><Text style={styles.body}>Current save{place ? ` · ${place}` : ''} · {dueCount} due for review</Text>
                {onRemove && saves.length > 1 && <Text style={styles.small}>To remove this save, continue another one first.</Text>}</>
              : <Button label="Continue" accessibleName={`Continue ${save.label}`} variant="primary" disabled={isLoading} onPress={() => onContinue(save.learnerId)} style={styles.action} />}
            <Text style={styles.small}>Started {new Date(save.createdAt).toLocaleDateString()}</Text>
            {!current && onRemove && <Button label="Remove" accessibleName={`Remove ${save.label}`} variant="text" disabled={isLoading} onPress={() => confirmRemove(save)} style={styles.remove} />}
          </View>
        );
      })}
      {full
        ? <Text style={styles.muted}>Three saves is the most this device keeps.</Text>
        : <Button label="Start a new save" disabled={isLoading} onPress={onNew} />}
      {/* Round 037: the device's sound switch (the ring/silent switch also mutes the cues). */}
      {onToggleSounds && <Pressable role="switch" aria-checked={soundsOn} aria-label="Sounds" onPress={() => onToggleSounds(!soundsOn)} style={styles.switch} hitSlop={6}>
        <Text style={styles.switchLabel}>Sounds</Text>
        <Text style={[styles.switchState, soundsOn && styles.switchOn]}>{soundsOn ? 'On' : 'Off'}</Text>
      </Pressable>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: type.title1, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  current: { borderColor: colors.accent },
  remove: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  switch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  switchLabel: { fontSize: type.callout, fontWeight: '600', color: colors.ink },
  switchState: { fontSize: type.callout, fontWeight: '700', color: colors.muted },
  switchOn: { color: colors.accent },
  cardTitle: { fontSize: type.title3, fontWeight: '600', color: colors.ink },
  action: { alignSelf: 'flex-start', marginTop: 4 },
  body: { color: colors.ink, fontSize: type.subhead },
  small: { color: colors.muted, fontSize: type.footnote },
  muted: { color: colors.muted, fontSize: type.subhead },
});
