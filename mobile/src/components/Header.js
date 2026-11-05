import { StyleSheet, Text, View } from 'react-native';
import { Button, colors, type } from './ui.js';

// Round 027: hideNav hides every action (the onboarding statement has only its own button).
export default function Header({ hideNav = false, place, dueCount, partyCount = 0, isLoading, onSpellbook, onParty, onMap, onRestart, onSaves }) {
  return (
    <View style={styles.header}>
      <View style={styles.titles}>
        <Text role="heading" style={styles.title}>ParaLLang</Text>
        <Text style={styles.subtitle}>The Crumbling Market{place ? ` — ${place}` : ''}</Text>
      </View>
      {!hideNav && <View style={styles.nav} aria-label="Learning navigation">
        <Button accessibleName={`Spellbook, ${dueCount} reviews due`} onPress={onSpellbook} style={styles.spellbook}>
          <Text style={styles.label}>Spellbook</Text>
          <Text style={styles.badge} maxFontSizeMultiplier={1.5}>{dueCount}</Text>
        </Button>
        {onParty && <Button label={`Party ${partyCount}`} accessibleName={`Party, ${partyCount} ${partyCount === 1 ? 'member' : 'members'}`} variant="text" onPress={onParty} />}
        {onSaves && <Button label="Saves" accessibleName="Saves" variant="text" onPress={onSaves} disabled={isLoading} />}
        {onMap && <Button label="Map" accessibleName="Open the map" variant="text" onPress={onMap} disabled={isLoading} />}
        {onRestart && <Button label="Restart" accessibleName="Restart encounter" variant="text" onPress={onRestart} disabled={isLoading} />}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  titles: { flexShrink: 1 },
  title: { fontSize: type.title2, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: type.caption1, color: colors.muted },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spellbook: { flexDirection: 'row', gap: 6, paddingVertical: 8, paddingHorizontal: 10 },
  label: { fontWeight: '600', color: colors.ink, fontSize: type.subhead },
  badge: { backgroundColor: colors.accent, color: colors.accentInk, borderRadius: 9, minWidth: 18, textAlign: 'center', overflow: 'hidden', fontSize: type.caption1, fontWeight: '700', paddingHorizontal: 5 },
});
