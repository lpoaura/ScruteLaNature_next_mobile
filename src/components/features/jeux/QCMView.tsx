import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import Animated, { 
  FadeIn, 
  SlideInRight, 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withTiming, 
  withSpring 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Jeu, DonneesQCM } from '@/src/types/api.types';
import { resolveMediaUrl } from '@/src/services/filesystem.service';

interface QCMViewProps {
  jeu: Jeu;
  onSuccess: () => void;
  onFail?: () => void;
  forceReveal?: boolean;
}

export function QCMView({ jeu, onSuccess, onFail, forceReveal }: QCMViewProps) {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (forceReveal) setIsRevealed(true);
  }, [forceReveal]);
  
  // Cast sécurisé des données
  const donnees = jeu.donneesJeu as unknown as DonneesQCM | undefined;
  const options = donnees?.options || [];
  const qcmType = donnees?.qcmType || 'text';
  
  const imageSource = jeu.imageLocalPath 
    ? { uri: jeu.imageLocalPath.startsWith('file://') ? jeu.imageLocalPath : `file://${jeu.imageLocalPath}` } 
    : jeu.imageUrl 
      ? { uri: resolveMediaUrl(jeu.imageUrl) } 
      : null;

  // Animation de tremblement (erreur)
  const shakeTranslateX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  // Comparaison robuste via index ou fallback texte
  const checkIsCorrect = (opt: string, index: number) => {
    if (donnees?.bonneReponseIndex !== undefined && donnees.bonneReponseIndex !== null) {
      return donnees.bonneReponseIndex === index;
    }
    if (!jeu.reponse) return false;
    return opt.trim().toLowerCase() === jeu.reponse.trim().toLowerCase();
  };

  const handleSelect = (option: string, index: number) => {
    if (isRevealed) return; // Empêcher le clic si déjà révélé

    setSelectedOptionIndex(index);
    const isCorrect = checkIsCorrect(option, index);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsRevealed(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onFail?.();
      // Animation Shake
      shakeTranslateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      // Clear any previous timeout to prevent race conditions
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      timeoutRef.current = setTimeout(() => {
        setSelectedOptionIndex(null);
        timeoutRef.current = null;
      }, 500); // reduced from 800ms to feel more responsive
    }
  };

  return (
    <Animated.View entering={SlideInRight.springify()} style={[styles.container, shakeStyle]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Question Nature</Text>
      
      {imageSource && (
        <Animated.Image 
          entering={FadeIn.delay(200)}
          source={imageSource} 
          style={styles.image} 
          resizeMode="contain"
        />
      )}

      <Text style={styles.questionText}>{jeu.question}</Text>

      <View style={[
        styles.optionsContainer,
        qcmType === 'image' && { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 0 }
      ]}>
        {options.map((option, index) => {
          const isSelected = selectedOptionIndex === index;
          const isCorrectAnswer = isRevealed && checkIsCorrect(option, index);
          
          let bgColor = 'white';
          let borderColor = '#D1D5DB';
          let textColor = '#4B5563';

          if (isSelected) {
            bgColor = isCorrectAnswer ? '#10B981' : '#EF4444';
            borderColor = isCorrectAnswer ? '#10B981' : '#EF4444';
            textColor = 'white';
          } else if (isCorrectAnswer) {
            // Si c'est la bonne réponse mais pas sélectionnée (impossible ici car on force)
            bgColor = '#10B981';
            borderColor = '#10B981';
            textColor = 'white';
          }

          return (
            <Pressable
              key={index}
              style={[
                styles.optionButton,
                { backgroundColor: bgColor, borderColor },
                qcmType === 'image' && { paddingVertical: 8, paddingHorizontal: 8, width: '48%', marginBottom: 16 }
              ]}
              onPress={() => handleSelect(option, index)}
            >
              {qcmType === 'image' ? (
                <View style={{ flex: 1, position: 'relative' }}>
                  <Image source={{ uri: resolveMediaUrl(option) }} style={{ width: '100%', height: 140, borderRadius: 8 }} resizeMode="cover" />
                  {isSelected && isCorrectAnswer && (
                    <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(16, 185, 129, 0.9)', borderRadius: 20 }}>
                      <Ionicons name="checkmark-circle" size={28} color="white" />
                    </View>
                  )}
                  {isSelected && !isCorrectAnswer && (
                    <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(239, 68, 68, 0.9)', borderRadius: 20 }}>
                      <Ionicons name="close-circle" size={28} color="white" />
                    </View>
                  )}
                </View>
              ) : qcmType === 'audio' ? (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="musical-notes" size={24} color={textColor} style={{ marginRight: 12 }} />
                  <Text style={[styles.optionText, { color: textColor }]} numberOfLines={1}>Extrait audio {index + 1}</Text>
                </View>
              ) : (
                <Text style={[styles.optionText, { color: textColor }]}>{option}</Text>
              )}
              
              {qcmType !== 'image' && isSelected && isCorrectAnswer && (
                <Ionicons name="checkmark-circle" size={24} color="white" style={styles.optionIcon} />
              )}
              {qcmType !== 'image' && isSelected && !isCorrectAnswer && (
                <Ionicons name="close-circle" size={24} color="white" style={styles.optionIcon} />
              )}
            </Pressable>
          );
        })}
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
    backgroundColor: '#F5F7F5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 24,
  },
  questionText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D6A4F',
    marginBottom: 32,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  optionIcon: {
    marginLeft: 12,
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
    backgroundColor: '#10B981',
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
