import { StyleSheet, ScrollView } from 'react-native';

import { ScreenWrapper } from '@/src/components/screen-wrapper';
import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { Fonts } from '@/src/theme/theme';
import { Link } from 'expo-router';

export default function ProfileScreen() {
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText
            type="title"
            style={{
              fontFamily: Fonts.rounded,
            }}>
            PROFILE    
          </ThemedText>
        </ThemedView>
        
        <ThemedText>This app includes example code to help you get started.</ThemedText>
        
        <Link href="/(tabs)/profile/seetings">
          <ThemedText type="link" style={styles.linkText}>Go to settings (seetings)</ThemedText>
        </Link>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 32,
    paddingBottom: 110,
    gap: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  linkText: {
    marginTop: 20,
    fontSize: 16,
  }
});
