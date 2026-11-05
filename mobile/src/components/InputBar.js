import { StyleSheet, TextInput, View } from 'react-native';
import { Button, colors, type } from './ui.js';

export default function InputBar({ value, onChange, onSend, disabled, loading, resolved, speaker }) {
  const submit = () => { if (!disabled && value.trim()) onSend(value); };
  return (
    <View style={styles.bar}>
      <TextInput
        aria-label="Your response"
        style={[styles.input, disabled && styles.disabled]}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={submit}
        returnKeyType="send"
        placeholder={resolved ? 'Encounter complete. Restart to play again.' : loading ? 'Sending your response…' : `Reply to ${speaker ?? 'them'}…`}
        placeholderTextColor={colors.muted}
        editable={!disabled}
        autoCorrect={false}
      />
      <Button label={loading ? 'Sending…' : 'Send'} accessibleName="Send" variant="primary" disabled={disabled || !value.trim()} onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  input: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: type.callout, color: colors.ink },
  disabled: { opacity: 0.6 },
});
