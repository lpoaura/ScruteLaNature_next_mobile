import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInRight, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import type { Jeu, Etape } from '@/src/types/api.types';
import { resolveMediaUrl } from '@/src/services/filesystem.service';
import { GameQuestion } from './GameQuestion';

interface ValidationLieuViewProps {
  jeu: Jeu;
  etape: Etape; // Passé par le manager pour avoir les coordonnées de la cible
  onSuccess: () => void;
  onFail?: () => void;
  forceReveal?: boolean;
}

export function ValidationLieuView({ jeu, etape, onSuccess, onFail, forceReveal }: ValidationLieuViewProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (forceReveal) setIsRevealed(true);
  }, [forceReveal]);

  const imageSource = jeu.imageLocalPath 
    ? { uri: jeu.imageLocalPath.startsWith('file://') ? jeu.imageLocalPath : `file://${jeu.imageLocalPath}` } 
    : jeu.imageUrl 
      ? { uri: resolveMediaUrl(jeu.imageUrl) } 
      : null;

  // Animation d'erreur
  const shakeTranslateX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  // Fonction pour calculer la distance (Haversine)
  const getDistanceFromLatLonInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Rayon de la terre en mètres
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeTranslateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const handleValidatePosition = async () => {
    if (isRevealed) return;

    try {
      setIsChecking(true);
      setErrorMsg(null);

      // Vérifier permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        triggerError("Permission GPS refusée. Activez la localisation pour valider l'étape.");
        setIsChecking(false);
        return;
      }

      // Récupérer position
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      
      const distance = getDistanceFromLatLonInMeters(
        location.coords.latitude, 
        location.coords.longitude,
        etape.latitude,
        etape.longitude
      );

      // Si l'utilisateur est à moins de 50 mètres
      if (distance <= 50) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsRevealed(true);
      } else {
        triggerError(`Vous êtes trop loin (${Math.round(distance)}m). Rapprochez-vous !`);
        onFail?.();
      }
    } catch (e) {
      triggerError("Impossible d'obtenir votre position. Vérifiez votre signal GPS.");
    } finally {
      setIsChecking(false);
    }
  };

  const handleBypass = () => {
    // Mode triche / déclaratif (pour faciliter le test)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRevealed(true);
  };

  return (
    <Animated.View entering={SlideInRight.springify()} style={[styles.container, shakeStyle]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerBadge}>
        <Ionicons name="location" size={24} color="#E11D48" />
        <Text style={styles.title}>{jeu.titre || 'Lieu Atteint ?'}</Text>
      </View>
      
      {imageSource && (
        <Animated.Image 
          entering={FadeIn.delay(200)}
          source={imageSource} 
          style={styles.image} 
          resizeMode="contain"
        />
      )}

      <View style={styles.contentCard}>
        <GameQuestion question={jeu.question || "Êtes-vous bien arrivé à destination ? Validez votre position GPS pour continuer."} />
        
        {errorMsg && (
          <Text style={styles.errorText}>{errorMsg}</Text>
        )}

        {!isRevealed ? (
          <View style={{ gap: 12 }}>
            <Pressable 
              style={styles.button} 
              onPress={handleValidatePosition}
              disabled={isChecking}
            >
              {isChecking ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="navigate" size={20} color="white" />
                  <Text style={styles.buttonText}>Vérifier ma position GPS</Text>
                </>
              )}
            </Pressable>

            {/* Fallback déclaratif si le GPS plante ou pour les tests */}
            <Pressable style={styles.bypassBtn} onPress={handleBypass}>
              <Text style={styles.bypassText}>Je certifie être sur place (Mode Facile)</Text>
            </Pressable>
          </View>
        ) : (
          <Animated.View entering={FadeIn}>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#007E84" />
              <Text style={styles.successText}>Position validée !</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {isRevealed && (
        <Animated.View entering={SlideInRight.springify()} style={styles.explicationContainer}>
          {jeu.explication && (
            <Text style={styles.explicationText}>{jeu.explication}</Text>
          )}
          <Pressable style={styles.continueButton} onPress={onSuccess}>
            <Text style={styles.continueButtonText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF1F2', // Rose très pâle
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFE4E6',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#BE123C',
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 24,
  },
  contentCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#BE123C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 32,
    borderTopWidth: 4,
    borderTopColor: '#E11D48',
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4C1D95',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bypassBtn: {
    paddingVertical: 12,
  },
  bypassText: {
    color: '#6B7280',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  successText: {
    color: '#007E84',
    fontWeight: 'bold',
    fontSize: 16,
  },
  explicationContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  explicationText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007E84',
    paddingVertical: 16,
    borderRadius: 100,
    gap: 8,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
