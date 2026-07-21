import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/auth.store';
import { Leaf, LogOut, Trash2, ShieldAlert, Users, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '@/src/services/api.service';
import { Badge } from '@/src/types/api.types';
import { useColorScheme } from '@/src/hooks/use-color-scheme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const isGuest = useAuthStore((state) => state.isGuest);
  
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

  // Valeurs par défaut si user n'est pas chargé
  const level = user?.level || 1;
  const points = user?.totalPoints || 0;
  const nextLevelPoints = 1000; // Chaque niveau nécessite 1000 points
  const progressPercent = Math.min((points / nextLevelPoints) * 100, 100);
  
  const co2Saved = user?.co2Saved || 0; // en kg

  return (
    <ScrollView 
      style={[styles.container, isDark && styles.darkContainer]} 
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Settings Icon */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20 }}>
        <Pressable 
          onPress={() => router.push('/(tabs)/profile/settings')}
          style={[{ padding: 8, backgroundColor: '#FFFFFF', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }, isDark && styles.darkCard]}
        >
          <Settings size={24} color={isDark ? '#F8FAFC' : '#4B5563'} />
        </Pressable>
      </View>

      {/* Bannière Invité */}
      {isGuest && (
        <View style={[styles.guestBanner, isDark && styles.darkGuestBanner]}>
          <Text style={[styles.guestBannerText, isDark && styles.darkText]}>
            ⚠️ Mode invité : Vos progrès (badges, xp) peuvent être perdus si vous désinstallez l'application. Créez un compte pour les sauvegarder.
          </Text>
        </View>
      )}

      {/* En-tête / Jauge XP */}
      <View style={[styles.header, { marginTop: 12 }, isDark && styles.darkCard]}>
        <View style={[styles.avatarContainer, isDark && styles.darkCard]}>
          <Text style={[styles.avatarText, isDark && styles.darkText]}>
            {user?.pseudo ? user.pseudo.charAt(0).toUpperCase() : 'I'}
          </Text>
        </View>
        <Text style={[styles.pseudo, isDark && styles.darkText]}>{user?.pseudo || 'Invité'}</Text>
        
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Niveau {level}</Text>
        </View>

        <View style={styles.xpContainer}>
          <View style={styles.xpHeader}>
            <Text style={[styles.xpText, isDark && styles.darkText]}>XP Total: {points} pts</Text>
            <Text style={[styles.xpTextNext, isDark && styles.darkTextMuted]}>{nextLevelPoints} pts</Text>
          </View>
          <View style={styles.xpBarBackground}>
            <View style={[styles.xpBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>
      </View>

      {/* CO2 Économisé */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, isDark && styles.darkCard]}>
          <View style={styles.statIconContainer}>
            <Leaf size={28} color="#007E84" />
          </View>
          <Text style={[styles.statValue, isDark && styles.darkText]}>{co2Saved.toFixed(1)} kg</Text>
          <Text style={[styles.statLabel, isDark && styles.darkTextMuted]}>de CO2 économisé</Text>
          
          <Text style={[styles.statExplanation, isDark && styles.darkTextMuted]}>
            Le CO2 est un gaz responsable du réchauffement climatique. En choisissant de faire vos balades à pied plutôt qu'en voiture, vous avez évité de polluer l'air de cette quantité ! 🌍
          </Text>
        </View>
      </View>

      {/* Navigation Rapide (Réseau d'amis / Paramètres) */}
      <View style={styles.quickNavContainer}>
        <Pressable 
          style={[styles.navCard, isDark && styles.darkCard]}
          onPress={() => {
            if (isGuest) {
              Alert.alert('Mode Invité', 'Créez un compte pour vous faire des amis et lancer des défis !');
            } else {
              router.push('/(tabs)/profile/friends');
            }
          }}
        >
          <View style={[styles.navIcon, { backgroundColor: '#E0E7FF' }]}>
            <Users size={24} color="#0087CC" />
          </View>
          <View style={styles.navTextContainer}>
            <Text style={[styles.navTitle, isDark && styles.darkText]}>Réseau d'amis</Text>
            <Text style={[styles.navSubtitle, isDark && styles.darkTextMuted]}>Trouvez d'autres joueurs</Text>
          </View>
        </Pressable>

        <Pressable 
          style={[styles.navCard, isDark && styles.darkCard]}
          onPress={() => router.push('/(tabs)/profile/settings')}
        >
          <View style={[styles.navIcon, { backgroundColor: '#F3F4F6' }]}>
            <Settings size={24} color="#4B5563" />
          </View>
          <View style={styles.navTextContainer}>
            <Text style={[styles.navTitle, isDark && styles.darkText]}>Paramètres</Text>
            <Text style={[styles.navSubtitle, isDark && styles.darkTextMuted]}>Son, permissions, etc.</Text>
          </View>
        </Pressable>

        {/* Bouton Historique */}
        <Pressable 
          style={[styles.navCard, isDark && styles.darkCard]}
          onPress={() => router.push('/(tabs)/profile/history')}
        >
          <View style={[styles.navIcon, { backgroundColor: '#F0FDF4' }]}>
            <Leaf size={24} color="#16A34A" />
          </View>
          <View style={styles.navTextContainer}>
            <Text style={[styles.navTitle, isDark && styles.darkText]}>Historique de mes balades</Text>
            <Text style={[styles.navSubtitle, isDark && styles.darkTextMuted]}>Retrouver mes parcours terminés</Text>
          </View>
        </Pressable>

        <Pressable 
          style={[styles.navCard, isDark && styles.darkCard]}
          onPress={() => router.push('/(tabs)/profile/downloads')}
        >
          <View style={[styles.navIcon, { backgroundColor: '#E0F2FE' }]}>
            <ShieldAlert size={24} color="#0284C7" />
          </View>
          <View style={styles.navTextContainer}>
            <Text style={[styles.navTitle, isDark && styles.darkText]}>Gérer mes téléchargements</Text>
            <Text style={[styles.navSubtitle, isDark && styles.darkTextMuted]}>Libérer de l'espace ou mettre à jour</Text>
          </View>
        </Pressable>
      </View>

      {/* Herbier des Badges (Mock) */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Herbier des Badges</Text>
        <View style={styles.badgesGrid}>
          {loadingBadges ? (
            <ActivityIndicator size="small" color="#0087CC" />
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
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  guestBanner: {
    backgroundColor: '#FEF3C7', // amber-100
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A', // amber-200
  },
  darkGuestBanner: {
    backgroundColor: '#78350F', // amber-900
    borderColor: '#92400E', // amber-800
  },
  guestBannerText: {
    color: '#92400E', // amber-800
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0087CC',
  },
  pseudo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: '#0087CC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  levelText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  xpContainer: {
    width: '100%',
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0087CC',
  },
  xpTextNext: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  xpBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#0087CC',
    borderRadius: 6,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D8E8C5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0087CC',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    color: '#007E84',
    fontWeight: '600',
  },
  statExplanation: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  quickNavContainer: {
    marginBottom: 24,
    gap: 12,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  navIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  navTextContainer: {
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  navSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
    marginLeft: 4,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
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
    opacity: 0.5,
  },
  badgeImage: {
    width: 40,
    height: 40,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: '#94A3B8',
  },
  darkContainer: { backgroundColor: '#0F172A' },
  darkCard: { backgroundColor: '#1E293B', shadowColor: '#000', borderColor: '#334155' },
  darkText: { color: '#F8FAFC' },
  darkTextMuted: { color: '#94A3B8' },
});
