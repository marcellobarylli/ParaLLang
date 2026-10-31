import { StyleSheet, Text, View } from 'react-native';
import { Button, colors } from './ui.js';

export default function Header({ dueCount, isLoading, onSpellbook, onRestart }) {
  return (
    <View style={styles.header}>
      <View style={styles.titles}>
        <Text role="heading" style={styles.title}>ParaLLang</Text>
        <Text style={styles.subtitle}>The Crumbling Market — The Coffee Cart</Text>
      </View>
      <View style={styles.nav} aria-label="Learning navigation">
        <Button accessibleName={`Spellbook, ${dueCount} reviews due`} onPress={onSpellbook} style={styles.spellbook}>
          <Text style={styles.label}>Spellbook</Text>
          <Text style={styles.badge}>{dueCount}</Text>
        </Button>
        <Button label="Restart" accessibleName="Restart encounter" variant="text" onPress={onRestart} disabled={isLoading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  titles: { flexShrink: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 12, color: colors.muted },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  spellbook: { flexDirection: 'row', gap: 6, paddingVertical: 8, paddingHorizontal: 10 },
  label: { fontWeight: '600', color: colors.ink },
  badge: { backgroundColor: colors.accent, color: colors.accentInk, borderRadius: 9, minWidth: 18, textAlign: 'center', overflow: 'hidden', fontSize: 12, fontWeight: '700', paddingHorizontal: 5 },
});
