import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, Clock, CheckCircle, Share2, Star } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import { ReviewModal } from '@/src/components/features/reviews/ReviewModal';

export default function VictoireScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Paramètres passés lors de la navigation
  const parcoursId = params.id as string;
  const score = parseInt(params.score as string || '0', 10);
  const maxScore = parseInt(params.maxScore as string || '0', 10);
  const durationMin = params.durationMin as string;
  const badgeImageUrl = params.badgeImageUrl as string;
  const badgeName = params.badgeName as string;

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const badgeScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  const handleShare = () => {
    // Tâche future : API de partage native
    alert('Partage à venir !');
  };

  return (
    <View style={styles.container}>
      {/* Lottie Confetti */}
      <LottieView
        source={require('@/assets/animations/confetti.json')}
        autoPlay
        loop={false}
        style={styles.lottie}
        resizeMode="cover"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          <View style={styles.header}>
            <Trophy size={64} color="#fbbf24" style={styles.trophyIcon} />
            <Text style={styles.title}>Parcours terminé !</Text>
            <Text style={styles.subtitle}>Félicitations, vous êtes arrivé au bout.</Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <CheckCircle size={24} color="#4f46e5" />
              <Text style={styles.statValue}>{score} / {maxScore}</Text>
              <Text style={styles.statLabel}>Score final</Text>
            </View>
            <View style={styles.statBox}>
              <Clock size={24} color="#4f46e5" />
              <Text style={styles.statValue}>{durationMin || '-'} min</Text>
              <Text style={styles.statLabel}>Temps estimé</Text>
            </View>
          </View>

          {badgeName && badgeImageUrl && (
            <Animated.View style={[styles.badgeContainer, { transform: [{ scale: badgeScale }] }]}>
              <Text style={styles.badgeTitle}>Nouveau Badge Débloqué !</Text>
              <Image source={{ uri: badgeImageUrl }} style={styles.badgeImage} />
              <Text style={styles.badgeName}>{badgeName}</Text>
            </Animated.View>
          )}

          <View style={styles.actionsContainer}>
            {!reviewSubmitted ? (
              <Pressable
                style={styles.reviewButton}
                onPress={() => setReviewModalVisible(true)}
              >
                <Star size={20} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.reviewButtonText}>Laisser un avis</Text>
              </Pressable>
            ) : (
              <View style={styles.reviewSuccess}>
                <CheckCircle size={20} color="#10b981" />
                <Text style={styles.reviewSuccessText}>Merci pour votre avis !</Text>
              </View>
            )}

            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Share2 size={20} color="#4f46e5" />
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
        parcoursId={parcoursId}
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
    pointerEvents: 'none',
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
    color: '#0f172a',
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
    color: '#0f172a',
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
    backgroundColor: '#ecfdf5',
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
    color: '#4f46e5',
  },
  homeButton: {
    backgroundColor: '#4f46e5',
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
});
