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
  successSurface: '#e7f3e8',
};

// Round 034 (backlog C3a): the app's font sizes, in points, named after Apple's text styles. Sizes the app already
// used are kept where close (title1 is 24, not Apple's 28). Dynamic Type scales them (allowFontScaling is on).
export const type = Object.freeze({
  caption2: 11, caption1: 12, footnote: 13, subhead: 15, callout: 16, body: 17, title3: 20, title2: 22, title1: 24, largeTitle: 32,
});

// Round 035 (round 034 critique 1.7): line heights for reading text, by type size (about 1.4–1.5).
export const leading = Object.freeze({ subhead: 21, callout: 23, body: 25 });

// Round 034 (critique 1.3): `dim` fades a disabled button; the map turns it off, since its node labels carry information.
export function Button({ label, accessibleName, onPress, disabled = false, dim = true, variant = 'secondary', style, children, expanded }) {
  return (
    <Pressable
      role="button"
      aria-label={accessibleName ?? label}
      aria-expanded={expanded}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [styles.button, styles[variant], pressed && styles.pressed, disabled && dim && styles.disabled, style]}
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
  label: { color: colors.ink, fontSize: type.subhead, fontWeight: '600' },
  primaryLabel: { color: colors.accentInk },
  textLabel: { color: colors.accent },
});
