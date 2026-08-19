import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/auth.store';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '@/src/services/api.service';
import { Badge } from '@/src/types/api.types';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { TabletWrapper } from '@/src/components/layout/TabletWrapper';

export default function BadgesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const isDark = useColorScheme() === 'dark';
  
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    async function loadBadges() {
      try {
        const data = await apiService.get<Badge[]>('/mobile/badges');
        setAllBadges(data);
      } catch (error) {
        console.error('Failed to load badges', error);
      } finally {
        setLoadingBadges(false);
      }
    }
    loadBadges();
  }, []);

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {/* ── En-tête ───────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }, isDark && styles.darkHeader]}>
        <TabletWrapper maxWidth={768} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#F8FAFC' : '#141B20'} />
          </Pressable>
          <Text style={[styles.title, isDark && styles.darkText]}>Badg'othèque</Text>
        </TabletWrapper>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <TabletWrapper maxWidth={768}>
          <View style={styles.badgesGrid}>
            {loadingBadges ? (
              <ActivityIndicator size="small" color="#0087CC" style={{ marginTop: 40, alignSelf: 'center' }} />
            ) : (
              allBadges.map((badge) => {
                const isUnlocked = user?.badges?.some((ub) => ub.badge.id === badge.id);
                const parcoursId = badge.parcours?.[0]?.id;
                
                return (
                  <Pressable 
                    key={badge.id} 
                    style={styles.badgeItem}
                    onPress={() => {
                      if (parcoursId) {
                        router.push(`/parcours/${parcoursId}`);
                      } else {
                        Alert.alert('Indisponible', 'Ce parcours n\'est plus disponible pour le moment.');
                      }
                    }}
                  >
                    <View style={[styles.badgeImageContainer, !isUnlocked && styles.badgeLocked]}>
                      <Image source={{ uri: badge.imageUrl }} style={styles.badgeImage} />
                    </View>
                    <Text style={[styles.badgeName, !isUnlocked && styles.badgeNameLocked]}>
                      {badge.name}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </TabletWrapper>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  darkContainer: {
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  darkHeader: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#141B20',
  },
  darkText: {
    color: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  badgeItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#EB601A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeLocked: {
    backgroundColor: '#F1F5F9',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
  badgeImage: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#141B20',
    textAlign: 'center',
    lineHeight: 16,
  },
  badgeNameLocked: {
    color: '#94A3B8',
  },
});
