import { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { Literata_700Bold } from '@expo-google-fonts/literata/700Bold';

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
  // Round 056 (backlog C6): word classes on chips, each at least 4.5:1 on surface, apart from danger and success.
  wordNoun: '#1f5a96',
  wordVerb: '#b3261e',
  wordAdjective: '#1d6e4e',
};

// Round 056: a chip's border and label colours for a word class (null: today's look with a 2-point border). Verbs
// are dashed, so red and green differ by more than hue (critique 1.3).
const WORD_CLASS_COLOUR = { noun: 'wordNoun', verb: 'wordVerb', adjective: 'wordAdjective' };
export function wordClassStyle(cls) {
  const colour = cls ? colors[WORD_CLASS_COLOUR[cls]] : null;
  return {
    chip: { borderWidth: 2, borderColor: colour ?? colors.border, borderStyle: cls === 'verb' ? 'dashed' : 'solid' },
    label: colour ? { color: colour } : null,
  };
}

// Round 034 (backlog C3a): the app's font sizes, in points, named after Apple's text styles. Sizes the app already
// used are kept where close (title1 is 24, not Apple's 28). Dynamic Type scales them (allowFontScaling is on).
export const type = Object.freeze({
  caption2: 11, caption1: 12, footnote: 13, subhead: 15, callout: 16, body: 17, title3: 20, title2: 22, title1: 24, largeTitle: 32,
});

// Round 035 (round 034 critique 1.7): line heights for reading text, by type size (about 1.4–1.5).
export const leading = Object.freeze({ subhead: 21, callout: 23, body: 25 });

// Round 042 (C3 remainder): titles in Literata Bold (SIL Open Font License 1.1, @expo-google-fonts/literata), body text
// in the system font. Only the 700 file is bundled. The font loads at runtime (Expo Go ignores config plugins) and
// the app never waits for it: until it is ready, or if it fails, titles keep the system font at their own weight.
export const fonts = Object.freeze({ display: 'Literata_700Bold' });

// Critique 1.4: readiness is React context set by App (no module state); outside a provider titles use the system font.
export const DisplayFont = createContext(false);

// Called once by App: loads the font; true once it has loaded, false while loading or after a failure.
export function useDisplayFont() {
  const [loaded] = useFonts({ [fonts.display]: Literata_700Bold });
  return Boolean(loaded);
}

// A heading (role "heading" unless given) in the display font once it is ready. `style` carries the size, colour
// and the system font's weight; with Literata the weight is dropped (one upright face; critique 1.1).
export function Title({ style, children, role = 'heading', ...props }) {
  const ready = useContext(DisplayFont);
  return <Text role={role} {...props} style={[style, ready && styles.display]}>{children}</Text>;
}

// Round 034 (critique 1.3): `dim` fades a disabled button; the map turns it off, since its node labels carry information.
// Round 056 (critique 1.1): `suffix` is a short second text after the label (a chip's word class), styled by
// `suffixStyle` on top of a caption size.
export function Button({ label, accessibleName, onPress, disabled = false, dim = true, variant = 'secondary', style, children, expanded, suffix, suffixStyle }) {
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
      {children ?? <Text style={[styles.label, variant === 'primary' && styles.primaryLabel, variant === 'text' && styles.textLabel]}>{label}{suffix ? <Text style={[styles.suffix, suffixStyle]}>{` ${suffix}`}</Text> : null}</Text>}
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
  suffix: { color: colors.muted, fontSize: type.caption1, fontWeight: '600' },
  display: { fontFamily: fonts.display, fontWeight: 'normal', fontStyle: 'normal' },
});
