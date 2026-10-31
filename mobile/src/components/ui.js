import { Pressable, StyleSheet, Text } from 'react-native';

export const colors = {
  background: '#f6f1e7',
  surface: '#fffdf8',
  ink: '#2b2118',
  muted: '#6f6254',
  accent: '#8a3b12',
  accentInk: '#ffffff',
  border: '#ddd2c0',
  success: '#2f6b3a',
  danger: '#9b1c1c',
  dangerSurface: '#fbe9e7',
};

export function Button({ label, accessibleName, onPress, disabled = false, variant = 'secondary', style, children }) {
  return (
    <Pressable
      role="button"
      aria-label={accessibleName ?? label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.button, styles[variant], pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      {children ?? <Text style={[styles.label, variant === 'primary' && styles.primaryLabel, variant === 'text' && styles.textLabel]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  text: { paddingHorizontal: 6 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  primaryLabel: { color: colors.accentInk },
  textLabel: { color: colors.accent },
});
