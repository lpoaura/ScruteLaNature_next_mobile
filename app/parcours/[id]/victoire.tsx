import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated, ScrollView, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Trophy, Clock, CheckCircle, Share2, Star, Leaf } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { ReviewModal } from '@/src/components/features/reviews/ReviewModal';
import { useSettingsStore } from '@/src/store/settings.store';
import { useAuthStore } from '@/src/store/auth.store';
import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { formatDuration } from '@/src/utils/format';

export default function VictoireScreen() {
  const systemColorScheme = useColorScheme();
  const settingsTheme = useSettingsStore((state: any) => state.theme);
  const isDark = (settingsTheme === 'system' ? systemColorScheme : settingsTheme) === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();
  const isGuest = useAuthStore((state: any) => state.isGuest);
  
  // Paramètres passés lors de la navigation
  const extractParam = (p: string | string[] | undefined): string => Array.isArray(p) ? p[0] : (p || '');
  
  const score = parseInt(extractParam(params.score) || '0', 10);
  const maxScore = parseInt(extractParam(params.maxScore) || '0', 10);
  const durationMin = extractParam(params.durationMin);
  const badgeImageUrl = extractParam(params.badgeImageUrl);
  const badgeName = extractParam(params.badgeName);

  const distanceKm = parseFloat(extractParam(params.distanceKm) || '0');
  const co2Gained = parseFloat((distanceKm * 0.15).toFixed(2)); // 150g per km

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const badgeScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const updateUser = useAuthStore((state: any) => state.updateUser);
  const user = useAuthStore((state: any) => state.user);

  useEffect(() => {
    // Enregistrement de l'historique
    const parcoursId = extractParam(params.id);
    if (parcoursId) {
      import('@/src/services/history.service').then(({ HistoryService }) => {
        HistoryService.recordCompletion(parcoursId, score, isGuest).catch(err => {
          console.error("Erreur lors de l'enregistrement de l'historique", err);
        });
      });
      
      // Mise à jour optimiste du joueur localement
      if (!isGuest && user) {
        updateUser({
          ...user,
          totalPoints: (user.totalPoints || 0) + score,
          co2Saved: (user.co2Saved || 0) + co2Gained
        });
      }
    }

    // Animation d'apparition du contenu et du badge
    Animated.sequence([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleShare = async () => {
    try {
      const message = `Je viens de terminer un super parcours nature avec l'appli Game of Nature LPO !\nJ'ai obtenu un score de ${score}/${maxScore} en ${formatDuration(durationMin)}.\nRejoins-moi sur l'app ! 🌿🦉`;
      
      await Share.share({
        message,
        title: 'Ma victoire LPO',
      });
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de partager pour le moment.');
    }
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Lottie Confetti */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LottieView
          source={require('@/assets/animations/confetti.json')}
          autoPlay
          loop={false}
          style={styles.lottie}
          resizeMode="cover"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          <View style={styles.header}>
            <Trophy size={64} color="#fbbf24" style={styles.trophyIcon} />
            <Text style={[styles.title, isDark && styles.darkText]}>Parcours terminé !</Text>
            <Text style={[styles.subtitle, isDark && styles.darkTextMuted]}>Félicitations, vous êtes arrivé au bout.</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={[styles.statBox, isDark && styles.darkCard]}>
              <CheckCircle size={24} color="#0087CC" />
              <Text style={[styles.statValue, isDark && styles.darkText]}>{score} / {maxScore}</Text>
              <Text style={[styles.statLabel, isDark && styles.darkTextMuted]}>Score final</Text>
            </View>
            <View style={[styles.statBox, isDark && styles.darkCard]}>
              <Clock size={24} color="#0087CC" />
              <Text style={[styles.statValue, isDark && styles.darkText]}>{formatDuration(durationMin)}</Text>
              <Text style={[styles.statLabel, isDark && styles.darkTextMuted]}>Temps estimé</Text>
            </View>
          </View>

          {badgeName !== '' && badgeImageUrl !== '' && (
            <Animated.View style={[styles.badgeContainer, { transform: [{ scale: badgeScale }] }]}>
              <Text style={styles.badgeTitle}>Nouveau Badge Débloqué !</Text>
              <Image source={{ uri: badgeImageUrl }} style={styles.badgeImage} />
              <Text style={styles.badgeName}>{badgeName}</Text>
            </Animated.View>
          )}

          <View style={[styles.ecoMessageContainer, isDark && styles.darkCard]}>
            <View style={styles.ecoMessageHeader}>
              <Leaf size={20} color="#10b981" />
              <Text style={[styles.ecoMessageTitle, isDark && styles.darkText]}>Un petit geste pour la planète</Text>
            </View>
            <Text style={[styles.ecoMessageText, isDark && styles.darkTextMuted]}>
              Pensez à supprimer le parcours (accès : Profil - Gérer mes téléchargements) ! Vous libérez de l'espace sur votre téléphone et il pourra durer plus longtemps.
            </Text>
            <Text style={[styles.ecoMessageText, { marginTop: 8, fontFamily: 'Nunito_700Bold' }, isDark && styles.darkText]}>
              Avec un compte, votre score et votre progression seront bien sauvegardés.
            </Text>
          </View>

          <View style={styles.actionsContainer}>
            {!reviewSubmitted ? (
              <Pressable
                style={styles.reviewButton}
                onPress={() => {
                  if (isGuest) {
                    Alert.alert('Mode Invité', 'Créez un compte pour laisser un avis sur ce parcours !');
                  } else {
                    setReviewModalVisible(true);
                  }
                }}
              >
                <Star size={20} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.reviewButtonText}>Laisser un avis</Text>
              </Pressable>
            ) : (
              <View style={styles.reviewSuccess}>
                <CheckCircle size={20} color="#007E84" />
                <Text style={styles.reviewSuccessText}>Merci pour votre avis !</Text>
              </View>
            )}

            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Share2 size={20} color="#0087CC" />
              <Text style={styles.shareButtonText}>Partager ma victoire</Text>
            </Pressable>

            <Pressable
              style={styles.homeButton}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      <ReviewModal
        visible={reviewModalVisible}
        parcoursId={extractParam(params.id)}
        onClose={() => setReviewModalVisible(false)}
        onSuccess={() => {
          setReviewModalVisible(false);
          setReviewSubmitted(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  lottie: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    zIndex: 2,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  trophyIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0A0E11',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A0E11',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  badgeContainer: {
    backgroundColor: '#fffbeb',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
    borderWidth: 2,
    borderColor: '#fef3c7',
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d97706',
    marginBottom: 20,
  },
  badgeImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#b45309',
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#fbbf24',
    paddingVertical: 16,
    borderRadius: 16,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#d97706',
  },
  reviewSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D8E8C5',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  reviewSuccessText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eef2ff',
    paddingVertical: 16,
    borderRadius: 16,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0087CC',
  },
  homeButton: {
    backgroundColor: '#0087CC',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  darkContainer: { backgroundColor: '#0A0E11' },
  darkCard: { backgroundColor: '#141B20', shadowColor: '#000', borderColor: '#202C35' },
  darkText: { color: '#F8FAFC' },
  darkTextMuted: { color: '#94A3B8' },
  darkInput: { backgroundColor: '#141B20', borderColor: '#202C35', color: '#F8FAFC' },
  ecoMessageContainer: {
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  ecoMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  ecoMessageTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
    color: '#047857',
  },
  ecoMessageText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#065f46',
    lineHeight: 20,
  },
});
