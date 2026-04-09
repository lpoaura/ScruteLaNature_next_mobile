import { StyleSheet } from 'react-native';
import { ScreenWrapper } from '@/src/components/screen-wrapper';
import { ThemedText } from '@/src/components/themed-text';

export default function SeetingsScreen() {
  return (
    <ScreenWrapper style={styles.container}>
      <ThemedText type="title">Settings Screen</ThemedText>
      <ThemedText>
        Cette page montre que même sans ScrollView, les bordures 
        et le mode sombre fonctionnent très bien avec le ScreenWrapper !
      </ThemedText>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    gap: 16,
  },
});
