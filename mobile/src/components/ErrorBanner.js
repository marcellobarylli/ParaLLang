import { StyleSheet, Text, View } from 'react-native';
import { Button, colors } from './ui.js';

export default function ErrorBanner({ message, onDismiss }) {
  return (
    <View style={styles.banner}>
      <Text role="alert" style={styles.text}>{message}</Text>
      <Button label="×" accessibleName="Dismiss error" variant="text" onPress={onDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerSurface, paddingHorizontal: 16, paddingVertical: 8 },
  text: { flex: 1, color: colors.danger, fontSize: 14 },
});
